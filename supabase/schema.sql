-- Ejecuta esto en el SQL Editor de tu proyecto Supabase (Dashboard → SQL Editor → New query)
-- Crea la tabla de salas, activa realtime y el bucket público para fotos.

create table if not exists public.rooms (
  code text primary key,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- Política permisiva: cualquiera con el código de sala puede leer/escribir.
-- El código aleatorio de 6 caracteres actúa como secreto compartido.
drop policy if exists "room by code" on public.rooms;
create policy "room by code" on public.rooms
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime para que ambos jugadores vean los cambios al instante
alter publication supabase_realtime add table public.rooms;

-- Bucket público para las fotos de los retos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos by room" on storage.objects;
create policy "photos by room" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');
