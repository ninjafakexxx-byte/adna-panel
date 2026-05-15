-- =====================================================================
-- ADNA — Fix definitivo para sistema de cargos (roles) + bloqueio
-- Execute este SQL no SQL Editor do Supabase (projeto wptsamiwqyvgshrpobto)
-- Idempotente: pode rodar várias vezes sem erro.
-- =====================================================================

-- 1) Enum app_role
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'lider', 'membro');
  end if;
end $$;

-- 2) Tabela user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Mantém apenas 1 cargo principal por usuário antes de criar a trava definitiva.
with ranked_roles as (
  select
    id,
    row_number() over (
      partition by user_id
      order by case role when 'admin' then 1 when 'lider' then 2 when 'membro' then 3 else 99 end,
               created_at desc,
               id
    ) as rn
  from public.user_roles
)
delete from public.user_roles ur
using ranked_roles rr
where ur.id = rr.id
  and rr.rn > 1;

create unique index if not exists user_roles_one_role_per_user_idx
  on public.user_roles (user_id);

-- 3) has_role
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- 4) get_my_roles (usuário logado)
create or replace function public.get_my_roles()
returns text[]
language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(role::text), array[]::text[])
  from public.user_roles
  where user_id = auth.uid();
$$;

revoke all on function public.has_role(uuid, public.app_role) from anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.get_my_roles() to anon, authenticated;

-- 5) Policies user_roles
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_roles_select_admin" on public.user_roles;
create policy "user_roles_select_admin"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_write"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 6) Realtime user_roles + profiles
do $$ begin
  begin alter publication supabase_realtime add table public.user_roles; exception when others then null; end;
end $$;

-- 7) Tabela profiles + is_blocked
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

do $$ begin
  begin alter publication supabase_realtime add table public.profiles; exception when others then null; end;
end $$;

-- 8) Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9) admin_list_users — sem duplicidade
drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (
  id uuid, display_name text, avatar_url text, email text,
  role text, is_blocked boolean, created_at timestamptz, roles text[]
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden: admin only';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.avatar_url,
    au.email::text as email,
    ur_main.role::text as role,
    coalesce(p.is_blocked, false) as is_blocked,
    p.created_at,
    coalesce(
      (select array_agg(ur.role::text order by case ur.role when 'admin' then 1 when 'lider' then 2 when 'membro' then 3 else 99 end)
       from public.user_roles ur
       where ur.user_id = p.id),
      array[]::text[]
    ) as roles
  from public.profiles p
  join auth.users au on au.id = p.id
  left join lateral (
    select ur.role
    from public.user_roles ur
    where ur.user_id = p.id
    order by case ur.role when 'admin' then 1 when 'lider' then 2 when 'membro' then 3 else 99 end
    limit 1
  ) ur_main on true
  order by p.created_at desc nulls last, p.id;
end;
$$;
grant execute on function public.admin_list_users() to authenticated;

-- 10) set_user_role — atômico (delete + insert) num único RPC
create or replace function public.set_user_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden: admin only';
  end if;
  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, _role)
    on conflict (user_id) do update set role = excluded.role;
end;
$$;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

-- 11) admin_set_blocked — toggle is_blocked
create or replace function public.admin_set_blocked(_user_id uuid, _blocked boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden: admin only';
  end if;
  update public.profiles set is_blocked = _blocked where id = _user_id;
end;
$$;
grant execute on function public.admin_set_blocked(uuid, boolean) to authenticated;
