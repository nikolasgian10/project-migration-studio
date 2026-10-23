create or replace function public.admin_set_password(_user_id uuid, _password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  update auth.users set encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')), updated_at = now() where id = _user_id;
end $$;
revoke all on function public.admin_set_password(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_password(uuid, text) to service_role;