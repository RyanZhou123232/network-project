-- Run in Supabase SQL Editor (after schema.sql)
-- Safe to run once on an existing project that already has profiles.

-- ============================================================
-- 0. Extend profiles
-- ============================================================
alter table public.profiles
  add column if not exists bio text,
  add column if not exists default_moment_visibility text not null default 'connections'
    check (default_moment_visibility in ('connections', 'everyone', 'private'));

-- ============================================================
-- 1. Enums
-- ============================================================
do $$ begin
  create type public.connection_status as enum ('pending', 'accepted', 'blocked');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.interaction_type as enum (
    'profile_view', 'message', 'moment_view', 'moment_reaction', 'referral_click'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.moment_visibility as enum (
    'connections', 'everyone', 'participants_only', 'private'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.referral_status as enum ('pending', 'accepted', 'declined', 'expired');
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 2. connections — mutual friend graph
-- ============================================================
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  status public.connection_status not null default 'pending',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint connections_ordered check (user_a_id < user_b_id),
  constraint connections_distinct check (user_a_id <> user_b_id),
  unique (user_a_id, user_b_id)
);

create index if not exists idx_connections_user_a on public.connections(user_a_id);
create index if not exists idx_connections_user_b on public.connections(user_b_id);
create index if not exists idx_connections_status on public.connections(status);

-- Helper: normalize two user ids into ordered pair
create or replace function public.normalize_user_pair(u1 uuid, u2 uuid)
returns table(user_a_id uuid, user_b_id uuid)
language sql immutable as $$
  select least(u1, u2), greatest(u1, u2);
$$;

-- Helper: are two users connected (accepted)?
create or replace function public.are_connected(u1 uuid, u2 uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.connections c
    where c.user_a_id = least(u1, u2)
      and c.user_b_id = greatest(u1, u2)
      and c.status = 'accepted'
  );
$$;

-- ============================================================
-- 3. interaction_events + stats — "sorted by interaction frequency"
-- ============================================================
create table if not exists public.interaction_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  interaction_type public.interaction_type not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint interaction_not_self check (actor_id <> target_id)
);

create index if not exists idx_interaction_events_pair
  on public.interaction_events(actor_id, target_id, created_at desc);

create table if not exists public.connection_interaction_stats (
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  score numeric not null default 0,
  event_count int not null default 0,
  last_interaction_at timestamptz,
  primary key (user_a_id, user_b_id),
  constraint stats_ordered check (user_a_id < user_b_id)
);

-- Weight map for interaction types
create or replace function public.interaction_weight(t public.interaction_type)
returns numeric language sql immutable as $$
  select case t
    when 'message' then 3
    when 'moment_reaction' then 2
    when 'moment_view' then 1
    when 'profile_view' then 0.5
    when 'referral_click' then 1
    else 0
  end;
$$;

-- Auto-update stats when a new event is logged
create or replace function public.handle_interaction_event()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a uuid := least(new.actor_id, new.target_id);
  b uuid := greatest(new.actor_id, new.target_id);
  w numeric := public.interaction_weight(new.interaction_type);
begin
  insert into public.connection_interaction_stats (user_a_id, user_b_id, score, event_count, last_interaction_at)
  values (a, b, w, 1, new.created_at)
  on conflict (user_a_id, user_b_id) do update set
    score = connection_interaction_stats.score + w,
    event_count = connection_interaction_stats.event_count + 1,
    last_interaction_at = new.created_at;
  return new;
end;
$$;

drop trigger if exists on_interaction_event_created on public.interaction_events;
create trigger on_interaction_event_created
  after insert on public.interaction_events
  for each row execute function public.handle_interaction_event();

-- ============================================================
-- 4. moments — photos / events on the network map
-- ============================================================
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  visibility public.moment_visibility not null default 'connections',
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_moments_author on public.moments(author_id, created_at desc);
create index if not exists idx_moments_visibility on public.moments(visibility);

create table if not exists public.moment_participants (
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'participant'
    check (role in ('author', 'participant', 'tagged')),
  primary key (moment_id, user_id)
);

create index if not exists idx_moment_participants_user
  on public.moment_participants(user_id);

create table if not exists public.moment_media (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  width int,
  height int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_moment_media_moment
  on public.moment_media(moment_id, sort_order);

-- ============================================================
-- 5. referral_requests — ask a mutual friend for intro
-- ============================================================
create table if not exists public.referral_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  connector_id uuid not null references public.profiles(id) on delete cascade,
  source_moment_id uuid references public.moments(id) on delete set null,
  message text,
  status public.referral_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint referral_distinct check (
    requester_id <> target_id
    and requester_id <> connector_id
    and target_id <> connector_id
  )
);

create index if not exists idx_referral_connector
  on public.referral_requests(connector_id, status);

-- Validate: connector must be connected to both requester and target
create or replace function public.validate_referral_request()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.are_connected(new.requester_id, new.target_id) then
    raise exception 'Requester and target are already connected';
  end if;
  if not public.are_connected(new.requester_id, new.connector_id) then
    raise exception 'Connector must be connected to requester';
  end if;
  if not public.are_connected(new.target_id, new.connector_id) then
    raise exception 'Connector must be connected to target';
  end if;
  return new;
end;
$$;

drop trigger if exists on_referral_request_insert on public.referral_requests;
create trigger on_referral_request_insert
  before insert on public.referral_requests
  for each row execute function public.validate_referral_request();

-- ============================================================
-- 6. Row Level Security
-- ============================================================

-- connections
alter table public.connections enable row level security;

create policy "Users see own connections"
  on public.connections for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "Users can request connection"
  on public.connections for insert
  with check (
    auth.uid() = requested_by
    and (auth.uid() = user_a_id or auth.uid() = user_b_id)
    and status = 'pending'
  );

create policy "Recipient can respond to connection"
  on public.connections for update
  using (auth.uid() = user_a_id or auth.uid() = user_b_id)
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- interaction_events
alter table public.interaction_events enable row level security;

create policy "Users can log interactions"
  on public.interaction_events for insert
  with check (auth.uid() = actor_id);

create policy "Users see own interaction events"
  on public.interaction_events for select
  using (auth.uid() = actor_id or auth.uid() = target_id);

-- connection_interaction_stats
alter table public.connection_interaction_stats enable row level security;

create policy "Users see own interaction stats"
  on public.connection_interaction_stats for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- moments
alter table public.moments enable row level security;

create policy "Author manages own moments"
  on public.moments for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Read moments by visibility"
  on public.moments for select
  using (
    auth.uid() = author_id
    or visibility = 'everyone'
    or (
      visibility = 'connections'
      and public.are_connected(auth.uid(), author_id)
    )
    or (
      visibility = 'participants_only'
      and exists (
        select 1 from public.moment_participants mp
        where mp.moment_id = moments.id and mp.user_id = auth.uid()
      )
    )
  );

-- moment_participants
alter table public.moment_participants enable row level security;

create policy "Read participants of visible moments"
  on public.moment_participants for select
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_participants.moment_id
        and (
          m.author_id = auth.uid()
          or m.visibility = 'everyone'
          or (m.visibility = 'connections' and public.are_connected(auth.uid(), m.author_id))
          or (m.visibility = 'participants_only' and moment_participants.user_id = auth.uid())
        )
    )
  );

create policy "Author manages moment participants"
  on public.moment_participants for all
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_participants.moment_id and m.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.moments m
      where m.id = moment_participants.moment_id and m.author_id = auth.uid()
    )
  );

-- moment_media
alter table public.moment_media enable row level security;

create policy "Read media of visible moments"
  on public.moment_media for select
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_media.moment_id
        and (
          m.author_id = auth.uid()
          or m.visibility = 'everyone'
          or (m.visibility = 'connections' and public.are_connected(auth.uid(), m.author_id))
          or (
            m.visibility = 'participants_only'
            and exists (
              select 1 from public.moment_participants mp
              where mp.moment_id = m.id and mp.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "Author manages moment media"
  on public.moment_media for all
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_media.moment_id and m.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.moments m
      where m.id = moment_media.moment_id and m.author_id = auth.uid()
    )
  );

-- referral_requests
alter table public.referral_requests enable row level security;

create policy "Involved users see referrals"
  on public.referral_requests for select
  using (
    auth.uid() in (requester_id, target_id, connector_id)
  );

create policy "Requester creates referral"
  on public.referral_requests for insert
  with check (auth.uid() = requester_id);

create policy "Connector responds to referral"
  on public.referral_requests for update
  using (auth.uid() = connector_id)
  with check (auth.uid() = connector_id);

-- ============================================================
-- 7. Table grants
-- ============================================================
grant select, insert, update on public.connections to authenticated;
grant select, insert on public.interaction_events to authenticated;
grant select on public.connection_interaction_stats to authenticated;
grant select, insert, update, delete on public.moments to authenticated;
grant select, insert, update, delete on public.moment_participants to authenticated;
grant select, insert, update, delete on public.moment_media to authenticated;
grant select, insert, update on public.referral_requests to authenticated;

grant all on all tables in schema public to service_role;

-- ============================================================
-- 8. Storage bucket for moment photos (optional)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('moment-media', 'moment-media', false)
on conflict (id) do nothing;

create policy "Authenticated users upload own moment media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'moment-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Read moment media if moment is visible"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'moment-media'
    and exists (
      select 1
      from public.moment_media mm
      join public.moments m on m.id = mm.moment_id
      where mm.storage_path = name
        and (
          m.author_id = auth.uid()
          or m.visibility = 'everyone'
          or (m.visibility = 'connections' and public.are_connected(auth.uid(), m.author_id))
          or (
            m.visibility = 'participants_only'
            and exists (
              select 1 from public.moment_participants mp
              where mp.moment_id = m.id and mp.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "Author deletes own moment media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'moment-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
