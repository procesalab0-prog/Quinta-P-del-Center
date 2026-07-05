-- ============================================================
-- Quinta Padel Center — Migración de cambios pendientes
-- Pegar TODO en: SQL Editor → New query → Run
-- Es idempotente: puedes correrlo aunque parte ya esté aplicado.
-- ============================================================

-- 1) Permitir que el staff CREE reservas desde el panel admin
drop policy if exists "staff crea reservas" on public.reservations;
create policy "staff crea reservas" on public.reservations
  for insert with check (public.is_staff());

-- 2) Horario y duración de reservas configurables desde la app
alter table public.loyalty_settings
  add column if not exists open_hour int not null default 8,
  add column if not exists close_hour int not null default 23,
  add column if not exists reservation_slot_minutes int not null default 90;

-- 3) Disponibilidad de canchas por rango exacto (arregla reservas
--    "perdidas" de la tarde/noche por diferencia de zona horaria)
drop function if exists public.get_court_availability(date);
create or replace function public.get_court_availability(p_from timestamptz, p_to timestamptz)
returns table (court_id bigint, court_name text, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.court_id, c.name, r.starts_at, r.ends_at
  from reservations r join courts c on c.id = r.court_id
  where r.status in ('pending','confirmed','blocked')
    and r.starts_at < p_to and r.ends_at > p_from
$$;

-- 4) Permitir crear al primer admin desde el dashboard
--    (auth.uid() es null cuando se ejecuta desde el SQL Editor)
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.role         := old.role;
    new.stamps       := old.stamps;
    new.total_visits := old.total_visits;
    new.level        := old.level;
    new.member_code  := old.member_code;
    new.is_active    := old.is_active;
  end if;
  return new;
end $$;

-- 5) Políticas de Storage para imágenes (avisos, torneos, avatares)
--    Requiere haber creado antes los buckets "public-assets" y "avatars"
--    (Storage → New bucket → marcar Public bucket).
drop policy if exists "lectura publica de assets" on storage.objects;
drop policy if exists "admin sube assets" on storage.objects;
drop policy if exists "cada quien sube su avatar" on storage.objects;
drop policy if exists "cada quien actualiza su avatar" on storage.objects;

create policy "lectura publica de assets" on storage.objects
  for select using (bucket_id in ('public-assets','avatars'));
create policy "admin sube assets" on storage.objects
  for insert with check (bucket_id = 'public-assets' and public.is_admin());
create policy "cada quien sube su avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cada quien actualiza su avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Listo. Si el paso 5 marca error de bucket, crea primero los buckets
-- en Storage y vuelve a correr solo el paso 5.
