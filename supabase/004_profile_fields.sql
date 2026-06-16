-- Run in Supabase SQL Editor (after 002 + 003)

-- 1. Extend profiles for partner frontend fields
alter table public.profiles
  add column if not exists school text,
  add column if not exists company text,
  add column if not exists industry_category text,
  add column if not exists industry_specialty text;

-- 2. Update get_my_network to return profile fields the UI needs
-- (Postgres requires DROP when return columns change)
drop function if exists public.get_my_network(int);

create or replace function public.get_my_network(limit_count int default 50)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  school text,
  company text,
  industry_category text,
  industry_specialty text,
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
    p.bio,
    p.school,
    p.company,
    p.industry_category,
    p.industry_specialty,
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

grant execute on function public.get_my_network(int) to authenticated;
