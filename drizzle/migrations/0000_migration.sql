create type public.app_role as enum ('admin','support');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles(user_id, role) values (new.id,'support'),(new.id,'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users
for each row execute function public.handle_new_user_role();

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  computer_name text not null,
  ticket_type text not null check (ticket_type in ('instalacao','mascara_errada','usuario_sem_acesso','criacao_usuario')),
  requester_name text,
  description text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'aberto' check (status in ('aberto','em_andamento','resolvido','cancelado')),
  assignee text,
  support_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update, delete on public.tickets to authenticated;
grant all on public.tickets to service_role;
alter table public.tickets enable row level security;
create policy "support read" on public.tickets for select to authenticated using (public.has_role(auth.uid(),'support'));
create policy "support update" on public.tickets for update to authenticated using (public.has_role(auth.uid(),'support'));
create policy "support delete" on public.tickets for delete to authenticated using (public.has_role(auth.uid(),'support'));

create or replace function public.create_ticket(_computer_name text, _ticket_type text, _requester_name text, _description text, _details jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if coalesce(trim(_computer_name),'') = '' or length(_computer_name) > 64 then raise exception 'Computer name inválido'; end if;
  if length(coalesce(_description,'')) > 2000 then raise exception 'Descrição muito longa'; end if;
  insert into public.tickets(computer_name, ticket_type, requester_name, description, details)
  values (upper(trim(_computer_name)), _ticket_type, nullif(trim(_requester_name),''), nullif(trim(_description),''), coalesce(_details,'{}'::jsonb))
  returning number into n;
  return n;
end $$;
grant execute on function public.create_ticket(text,text,text,text,jsonb) to anon, authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger tickets_touch before update on public.tickets for each row execute function public.touch_updated_at();