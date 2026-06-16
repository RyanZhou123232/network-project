-- Run this in Supabase Dashboard → SQL Editor

-- 1. Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Row Level Security
alter table public.profiles enable row level security;

create policy "Anyone can read profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. Table grants (RLS alone is not enough)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to anon, authenticated;
grant all on public.profiles to service_role;

-- Allow auth trigger to insert profiles on signup
grant usage on schema public to supabase_auth_admin;
grant insert on public.profiles to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
