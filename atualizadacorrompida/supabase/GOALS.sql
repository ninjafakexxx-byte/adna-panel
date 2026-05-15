-- =====================================================================
-- ADNA — Módulo Metas (goals) — CRUD completo + RLS por roles
-- Execute no SQL Editor do Supabase (projeto wptsamiwqyvgshrpobto).
-- Idempotente. Depende de FIX_ROLES.sql (enum app_role + has_role).
-- =====================================================================

-- 1) Tabela goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'geral',
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  due_date timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_created_by_idx on public.goals (created_by);
create index if not exists goals_status_idx on public.goals (status);
create index if not exists goals_due_date_idx on public.goals (due_date);

-- 2) updated_at trigger
create or replace function public.goals_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.goals_set_updated_at();

-- 3) RLS
alter table public.goals enable row level security;

-- admin: tudo
drop policy if exists "goals_admin_all" on public.goals;
create policy "goals_admin_all"
  on public.goals for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- lider: CRUD das próprias metas
drop policy if exists "goals_lider_select_own" on public.goals;
create policy "goals_lider_select_own"
  on public.goals for select to authenticated
  using (public.has_role(auth.uid(), 'lider') and created_by = auth.uid());

drop policy if exists "goals_lider_insert_own" on public.goals;
create policy "goals_lider_insert_own"
  on public.goals for insert to authenticated
  with check (public.has_role(auth.uid(), 'lider') and created_by = auth.uid());

drop policy if exists "goals_lider_update_own" on public.goals;
create policy "goals_lider_update_own"
  on public.goals for update to authenticated
  using (public.has_role(auth.uid(), 'lider') and created_by = auth.uid())
  with check (public.has_role(auth.uid(), 'lider') and created_by = auth.uid());

drop policy if exists "goals_lider_delete_own" on public.goals;
create policy "goals_lider_delete_own"
  on public.goals for delete to authenticated
  using (public.has_role(auth.uid(), 'lider') and created_by = auth.uid());

-- membro: leitura das próprias metas
drop policy if exists "goals_membro_select_own" on public.goals;
create policy "goals_membro_select_own"
  on public.goals for select to authenticated
  using (public.has_role(auth.uid(), 'membro') and created_by = auth.uid());

-- 4) Realtime
do $$ begin
  begin alter publication supabase_realtime add table public.goals; exception when others then null; end;
end $$;