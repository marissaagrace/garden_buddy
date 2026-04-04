-- Bloom Kind: plants, events, watering rules with RLS

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  species text,
  planted_date date,
  location text,
  notes text,
  lifecycle_stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plants_user_id_idx on public.plants (user_id);

create table if not exists public.plant_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id uuid not null references public.plants (id) on delete cascade,
  type text not null,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists plant_events_plant_id_idx on public.plant_events (plant_id);
create index if not exists plant_events_user_id_idx on public.plant_events (user_id);
create index if not exists plant_events_occurred_at_idx on public.plant_events (occurred_at desc);

create table if not exists public.watering_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id uuid not null references public.plants (id) on delete cascade,
  cadence text,
  interval_days int,
  next_due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plant_id)
);

create index if not exists watering_rules_user_id_idx on public.watering_rules (user_id);

-- updated_at on plants
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists plants_updated_at on public.plants;
create trigger plants_updated_at
before update on public.plants
for each row execute function public.set_updated_at();

-- RLS
alter table public.plants enable row level security;
alter table public.plant_events enable row level security;
alter table public.watering_rules enable row level security;

create policy "plants_select_own"
  on public.plants for select
  using (auth.uid() = user_id);

create policy "plants_insert_own"
  on public.plants for insert
  with check (auth.uid() = user_id);

create policy "plants_update_own"
  on public.plants for update
  using (auth.uid() = user_id);

create policy "plants_delete_own"
  on public.plants for delete
  using (auth.uid() = user_id);

create policy "plant_events_select_own"
  on public.plant_events for select
  using (auth.uid() = user_id);

create policy "plant_events_insert_own"
  on public.plant_events for insert
  with check (auth.uid() = user_id);

create policy "plant_events_update_own"
  on public.plant_events for update
  using (auth.uid() = user_id);

create policy "plant_events_delete_own"
  on public.plant_events for delete
  using (auth.uid() = user_id);

create policy "watering_rules_select_own"
  on public.watering_rules for select
  using (auth.uid() = user_id);

create policy "watering_rules_insert_own"
  on public.watering_rules for insert
  with check (auth.uid() = user_id);

create policy "watering_rules_update_own"
  on public.watering_rules for update
  using (auth.uid() = user_id);

create policy "watering_rules_delete_own"
  on public.watering_rules for delete
  using (auth.uid() = user_id);
