-- =====================================================================
-- ADNA — Tabela `events` (CRUD de eventos do calendário)
-- Execute no SQL Editor do Supabase (projeto wptsamiwqyvgshrpobto)
-- Pré-requisito: FIX_ROLES.sql já executado (cria enum app_role,
-- tabela user_roles e função public.has_role).
-- 100% idempotente: pode rodar várias vezes sem erro.
-- =====================================================================

-- 1) TABELA -----------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null check (length(btrim(title)) between 1 and 160),
  description text        null     check (description is null or length(description) <= 4000),
  location    text        null     check (location is null or length(location) <= 240),
  event_date  timestamptz not null,
  color       text        not null default 'blue'
              check (color in ('blue','green','amber','red')),
  created_by  uuid        null     references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Adiciona colunas se a tabela já existia em versão anterior (idempotente)
alter table public.events
  add column if not exists updated_at timestamptz not null default now();
alter table public.events
  add column if not exists color text not null default 'blue';
alter table public.events
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- 2) ÍNDICES ----------------------------------------------------------
create index if not exists events_event_date_idx  on public.events (event_date);
create index if not exists events_created_by_idx  on public.events (created_by);
create index if not exists events_created_at_idx  on public.events (created_at desc);

-- 3) TRIGGER updated_at ----------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_events_set_updated_at on public.events;
create trigger trg_events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- 4) RLS --------------------------------------------------------------
alter table public.events enable row level security;

-- SELECT: qualquer usuário autenticado (admin, lider, membro) pode ler.
drop policy if exists "events_select_authenticated" on public.events;
create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (true);

-- INSERT: somente admin ou lider, e o created_by deve bater com o usuário logado.
drop policy if exists "events_insert_lider_admin" on public.events;
create policy "events_insert_lider_admin"
  on public.events for insert
  to authenticated
  with check (
    (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'lider'))
    and created_by = auth.uid()
  );

-- UPDATE: admin edita qualquer um; lider só edita o que ele criou.
drop policy if exists "events_update_admin_or_owner_lider" on public.events;
create policy "events_update_admin_or_owner_lider"
  on public.events for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or (public.has_role(auth.uid(), 'lider') and created_by = auth.uid())
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    or (public.has_role(auth.uid(), 'lider') and created_by = auth.uid())
  );

-- DELETE: somente admin.
drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin"
  on public.events for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- 5) REALTIME ---------------------------------------------------------
-- Habilita REPLICA IDENTITY FULL para que o canal postgres_changes
-- entregue payloads completos (necessário para o realtime no front).
alter table public.events replica identity full;

-- Adiciona à publicação supabase_realtime (idempotente).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    execute 'alter publication supabase_realtime add table public.events';
  end if;
end $$;

-- 6) GRANTS -----------------------------------------------------------
grant select, insert, update, delete on public.events to authenticated;
revoke all on public.events from anon;

-- =====================================================================
-- 7) SEED OPCIONAL (descomente o bloco abaixo se quiser dados de exemplo)
-- Cria 3 eventos atribuídos ao primeiro admin existente. Seguro de re-rodar.
-- =====================================================================
-- do $$
-- declare
--   admin_id uuid;
-- begin
--   select user_id into admin_id from public.user_roles where role = 'admin' limit 1;
--   if admin_id is null then
--     raise notice 'Nenhum admin encontrado — seed ignorado.';
--     return;
--   end if;
--
--   insert into public.events (title, description, location, event_date, color, created_by)
--   select * from (values
--     ('Culto de Domingo',     'Culto da família ADNA',          'Salão Principal', now() + interval '2 days',  'blue',  admin_id),
--     ('Reunião de Líderes',   'Planejamento mensal',            'Sala 2',          now() + interval '5 days',  'green', admin_id),
--     ('Encontro de Jovens',   'Louvor, palavra e comunhão',     'Auditório',       now() + interval '10 days', 'amber', admin_id)
--   ) as t(title, description, location, event_date, color, created_by)
--   where not exists (
--     select 1 from public.events e where e.title = t.title and date_trunc('day', e.event_date) = date_trunc('day', t.event_date)
--   );
-- end $$;

-- =====================================================================
-- FIM. Após rodar, recarregue a aba /eventos da app.
-- =====================================================================
