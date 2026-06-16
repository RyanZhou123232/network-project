-- Run after 002_core_tables.sql

-- Send a connection request (handles user_a < user_b ordering)
create or replace function public.send_connection_request(target_id uuid)
returns public.connections
language plpgsql security definer set search_path = public as $$
declare
  a uuid := least(auth.uid(), target_id);
  b uuid := greatest(auth.uid(), target_id);
  row public.connections;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if auth.uid() = target_id then
    raise exception 'Cannot connect to yourself';
  end if;

  insert into public.connections (user_a_id, user_b_id, requested_by, status)
  values (a, b, auth.uid(), 'pending')
  on conflict (user_a_id, user_b_id) do nothing
  returning * into row;

  if row.id is null then
    select * into row from public.connections
    where user_a_id = a and user_b_id = b;
  end if;

  return row;
end;
$$;

-- Accept or decline a pending connection
create or replace function public.respond_connection_request(
  connection_id uuid,
  new_status public.connection_status
)
returns public.connections
language plpgsql security definer set search_path = public as $$
declare
  row public.connections;
begin
  if new_status not in ('accepted', 'blocked') then
    raise exception 'Invalid status';
  end if;

  update public.connections
  set
    status = new_status,
    accepted_at = case when new_status = 'accepted' then now() else null end
  where id = connection_id
    and status = 'pending'
    and (user_a_id = auth.uid() or user_b_id = auth.uid())
    and requested_by <> auth.uid()
  returning * into row;

  if row.id is null then
    raise exception 'Connection not found or not allowed';
  end if;

  return row;
end;
$$;

-- Get my network: direct connections sorted by interaction score
create or replace function public.get_my_network(limit_count int default 50)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  connection_status public.connection_status,
  interaction_score numeric,
  last_interaction_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    case
      when c.user_a_id = auth.uid() then c.user_b_id
      else c.user_a_id
    end as user_id,
    p.display_name,
    p.avatar_url,
    c.status,
    coalesce(s.score, 0) as interaction_score,
    s.last_interaction_at
  from public.connections c
  join public.profiles p on p.id = case
    when c.user_a_id = auth.uid() then c.user_b_id
    else c.user_a_id
  end
  left join public.connection_interaction_stats s
    on s.user_a_id = c.user_a_id and s.user_b_id = c.user_b_id
  where (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    and c.status = 'accepted'
  order by coalesce(s.score, 0) desc, c.accepted_at desc nulls last
  limit limit_count;
$$;

grant execute on function public.send_connection_request(uuid) to authenticated;
grant execute on function public.respond_connection_request(uuid, public.connection_status) to authenticated;
grant execute on function public.get_my_network(int) to authenticated;
