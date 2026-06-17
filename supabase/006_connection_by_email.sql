-- Run after 003_rpc.sql
-- Add friend by signup email (looks up auth.users, then reuses send_connection_request)

create or replace function public.send_connection_request_by_email(target_email text)
returns public.connections
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if target_email is null or trim(target_email) = '' then
    raise exception 'Email is required';
  end if;

  select u.id
  into target_id
  from auth.users u
  where lower(u.email) = lower(trim(target_email));

  if target_id is null then
    raise exception 'No user found with that email';
  end if;

  return public.send_connection_request(target_id);
end;
$$;

grant execute on function public.send_connection_request_by_email(text) to authenticated;
