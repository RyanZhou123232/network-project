-- Run this if you already ran schema.sql before grants were added

grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to anon, authenticated;
grant all on public.profiles to service_role;

grant usage on schema public to supabase_auth_admin;
grant insert on public.profiles to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
