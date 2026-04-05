-- Fertilizing rules: cadence tracking per plant (mirrors watering_rules)

create table if not exists public.fertilizing_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id uuid not null references public.plants (id) on delete cascade,
  interval_days int,
  next_due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plant_id)
);

create index if not exists fertilizing_rules_user_id_idx on public.fertilizing_rules (user_id);

alter table public.fertilizing_rules enable row level security;

create policy "fertilizing_rules_select_own"
  on public.fertilizing_rules for select
  using (auth.uid() = user_id);

create policy "fertilizing_rules_insert_own"
  on public.fertilizing_rules for insert
  with check (auth.uid() = user_id);

create policy "fertilizing_rules_update_own"
  on public.fertilizing_rules for update
  using (auth.uid() = user_id);

create policy "fertilizing_rules_delete_own"
  on public.fertilizing_rules for delete
  using (auth.uid() = user_id);
