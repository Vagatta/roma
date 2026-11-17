-- Run in Supabase SQL Editor. Safe to rerun on the previous ROMA schema.
-- Enable Anonymous Sign-Ins in Authentication > Sign In / Providers before using rooms.

create extension if not exists pgcrypto with schema extensions;
do $$
declare extension_schema text;
begin
  select n.nspname into extension_schema
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';
  if extension_schema <> 'extensions' then
    alter extension pgcrypto set schema extensions;
  end if;
end;
$$;

create table if not exists public.rooms (
  code text primary key,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms add column if not exists invite_hash text;
alter table public.rooms add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.rooms add column if not exists guest_id uuid references auth.users(id) on delete cascade;
alter table public.rooms enable row level security;

create or replace function public.is_room_member(p_code text)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.rooms r
    where r.code = p_code and auth.uid() in (r.owner_id, r.guest_id)
  );
$$;
revoke all on function public.is_room_member(text) from public, anon;
grant execute on function public.is_room_member(text) to authenticated;

drop policy if exists "room by code" on public.rooms;
drop policy if exists "room members can read" on public.rooms;
create policy "room members can read" on public.rooms
  for select to authenticated using (public.is_room_member(code));

revoke all on public.rooms from anon, authenticated;
grant select (code, state, owner_id, guest_id, updated_at) on public.rooms to authenticated;

create or replace function public.create_room(p_code text, p_invite_hash text, p_state jsonb)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_code !~* '^[0-9a-f-]{36}$' or length(p_invite_hash) <> 64 then
    raise exception 'Invalid room credentials';
  end if;
  insert into public.rooms (code, state, invite_hash, owner_id)
  values (lower(p_code), p_state, p_invite_hash, auth.uid())
  on conflict (code) do nothing;
  if found then return true; end if;
  return exists (
    select 1 from public.rooms
    where code = lower(p_code) and owner_id = auth.uid() and invite_hash = p_invite_hash
  );
end;
$$;

create or replace function public.join_room(p_code text, p_invite_token text)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  room_state jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.rooms
  set guest_id = case when owner_id = auth.uid() then guest_id else auth.uid() end,
      updated_at = now()
  where code = lower(p_code)
    and invite_hash = encode(extensions.digest(convert_to(p_invite_token, 'UTF8'), 'sha256'), 'hex')
    and (owner_id = auth.uid() or guest_id is null or guest_id = auth.uid());
  if not found then raise exception 'Invitation is invalid or the room is full'; end if;
  select state into room_state from public.rooms where code = lower(p_code);
  return jsonb_build_object('state', room_state);
end;
$$;

-- Three-way merge: apply only the fields changed from the caller's base state.
-- This preserves simultaneous additions and edits to different fields.
create or replace function public.merge_room_array(p_base jsonb, p_next jsonb, p_current jsonb, p_key_field text)
returns jsonb
language plpgsql immutable
set search_path = pg_catalog, public, pg_temp
as $$
declare
  base_map jsonb := '{}'::jsonb;
  next_map jsonb := '{}'::jsonb;
  current_map jsonb := '{}'::jsonb;
  result jsonb := '[]'::jsonb;
  item jsonb;
  chosen jsonb;
  item_key text;
  key_name text;
begin
  foreach key_name in array array['base', 'next', 'current'] loop
    if key_name = 'base' then
      for item in select value from jsonb_array_elements(coalesce(p_base, '[]'::jsonb)) loop
        item_key := case when p_key_field = '__scalar' then item #>> '{}' else item ->> p_key_field end;
        if p_key_field = '__draw' then item_key := (item ->> 'cardId') || '|' || (item ->> 'date'); end if;
        if p_key_field = '__entry' then item_key := (item ->> 'kind') || '|' || (item ->> 'itemId'); end if;
        base_map := jsonb_set(base_map, array[item_key], item, true);
      end loop;
    elsif key_name = 'next' then
      for item in select value from jsonb_array_elements(coalesce(p_next, '[]'::jsonb)) loop
        item_key := case when p_key_field = '__scalar' then item #>> '{}' else item ->> p_key_field end;
        if p_key_field = '__draw' then item_key := (item ->> 'cardId') || '|' || (item ->> 'date'); end if;
        if p_key_field = '__entry' then item_key := (item ->> 'kind') || '|' || (item ->> 'itemId'); end if;
        next_map := jsonb_set(next_map, array[item_key], item, true);
      end loop;
    else
      for item in select value from jsonb_array_elements(coalesce(p_current, '[]'::jsonb)) loop
        item_key := case when p_key_field = '__scalar' then item #>> '{}' else item ->> p_key_field end;
        if p_key_field = '__draw' then item_key := (item ->> 'cardId') || '|' || (item ->> 'date'); end if;
        if p_key_field = '__entry' then item_key := (item ->> 'kind') || '|' || (item ->> 'itemId'); end if;
        current_map := jsonb_set(current_map, array[item_key], item, true);
      end loop;
    end if;
  end loop;

  for item_key in
    select key from (
      select jsonb_object_keys(base_map) as key
      union select jsonb_object_keys(next_map)
      union select jsonb_object_keys(current_map)
    ) all_keys order by key
  loop
    if next_map ? item_key then
      if base_map ? item_key and next_map -> item_key = base_map -> item_key then
        if current_map ? item_key then chosen := current_map -> item_key; else chosen := null; end if;
      else
        chosen := next_map -> item_key;
      end if;
    elsif base_map ? item_key then
      chosen := null;
    elsif current_map ? item_key then
      chosen := current_map -> item_key;
    else
      chosen := null;
    end if;
    if chosen is not null then result := result || jsonb_build_array(chosen); end if;
  end loop;
  if p_key_field in ('id', '__draw') then
    select coalesce(jsonb_agg(value order by value ->> 'date' desc nulls last, value ->> 'id'), '[]'::jsonb)
    into result from jsonb_array_elements(result);
  end if;
  return result;
end;
$$;

create or replace function public.merge_room_object(p_base jsonb, p_next jsonb, p_current jsonb)
returns jsonb
language plpgsql immutable
set search_path = pg_catalog, public, pg_temp
as $$
declare
  result jsonb := '{}'::jsonb;
  item_key text;
  chosen jsonb;
begin
  for item_key in
    select key from (
      select jsonb_object_keys(coalesce(p_base, '{}'::jsonb)) as key
      union select jsonb_object_keys(coalesce(p_next, '{}'::jsonb))
      union select jsonb_object_keys(coalesce(p_current, '{}'::jsonb))
    ) all_keys order by key
  loop
    if p_next ? item_key then
      if p_base ? item_key and p_next -> item_key = p_base -> item_key then
        if p_current ? item_key then chosen := p_current -> item_key; else chosen := null; end if;
      else
        chosen := p_next -> item_key;
      end if;
    elsif p_base ? item_key then
      chosen := null;
    elsif p_current ? item_key then
      chosen := p_current -> item_key;
    else
      chosen := null;
    end if;
    if chosen is not null then result := jsonb_set(result, array[item_key], chosen, true); end if;
  end loop;
  return result;
end;
$$;

create or replace function public.merge_room_state(p_code text, p_base jsonb, p_next jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  current_state jsonb;
  merged jsonb;
  field_name text;
  base_value jsonb;
  next_value jsonb;
  current_value jsonb;
  merged_value jsonb;
begin
  if not public.is_room_member(lower(p_code)) then raise exception 'Not a room member'; end if;
  select state into current_state from public.rooms where code = lower(p_code) for update;
  if current_state is null then raise exception 'Room not found'; end if;
  merged := current_state;

  for field_name in
    select key from (
      select jsonb_object_keys(coalesce(p_base, '{}'::jsonb)) as key
      union select jsonb_object_keys(coalesce(p_next, '{}'::jsonb))
      union select jsonb_object_keys(current_state)
    ) all_keys
  loop
    base_value := p_base -> field_name;
    next_value := p_next -> field_name;
    current_value := current_state -> field_name;
    if field_name = 'entries' then
      merged_value := public.merge_room_array(base_value, next_value, current_value, '__entry');
    elsif field_name = 'secrets' then
      merged_value := public.merge_room_array(base_value, next_value, current_value, 'id');
    elsif field_name = 'photoSubmissions' then
      merged_value := public.merge_room_array(base_value, next_value, current_value, 'id');
    elsif field_name = 'radarPicks' then
      merged_value := public.merge_room_array(base_value, next_value, current_value, 'id');
    elsif field_name = 'expeditions' then
      merged_value := public.merge_room_array(base_value, next_value, current_value, 'id');
    elsif field_name = 'expenses' then
      merged_value := public.merge_room_array(base_value, next_value, current_value, 'id');
    elsif field_name = 'draws' then
      merged_value := public.merge_room_array(base_value, next_value, current_value, '__draw');
    elsif field_name in ('favorites', 'visited', 'unlocked', 'favoritePhotos') then
      merged_value := public.merge_room_array(base_value, next_value, current_value, '__scalar');
    elsif field_name in ('photos', 'routeMoments', 'photoCaptions', 'visitDates', 'placeStories') then
      merged_value := public.merge_room_object(base_value, next_value, current_value);
    elsif next_value is distinct from base_value then
      merged_value := next_value;
    else
      merged_value := current_value;
    end if;
    if merged_value is null then merged := merged - field_name;
    else merged := jsonb_set(merged, array[field_name], merged_value, true); end if;
  end loop;

  update public.rooms set state = merged, updated_at = now() where code = lower(p_code);
  return merged;
end;
$$;

revoke all on function public.create_room(text, text, jsonb) from public, anon;
revoke all on function public.join_room(text, text) from public, anon;
revoke all on function public.merge_room_state(text, jsonb, jsonb) from public, anon;
revoke all on function public.merge_room_array(jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.merge_room_object(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_room(text, text, jsonb) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
grant execute on function public.merge_room_state(text, jsonb, jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;

drop policy if exists "photos by room" on storage.objects;
drop policy if exists "room members can access photos" on storage.objects;
create policy "room members can access photos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'photos'
    and public.is_room_member((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'photos'
    and public.is_room_member((storage.foldername(name))[1])
  );
