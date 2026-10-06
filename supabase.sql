create table if not exists public.helios_boards(id text primary key,tasks jsonb not null default '[]'::jsonb,updated_at timestamptz default now());
alter table public.helios_boards enable row level security;
create policy "read helios" on public.helios_boards for select to anon using(id='projeto-helios');
create policy "insert helios" on public.helios_boards for insert to anon with check(id='projeto-helios');
create policy "update helios" on public.helios_boards for update to anon using(id='projeto-helios') with check(id='projeto-helios');
alter publication supabase_realtime add table public.helios_boards;
