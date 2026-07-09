-- ============================================================
-- Reservas extra: recurrentes, no-show y lista de espera
-- Pegar en SQL Editor → Run (idempotente).
-- ============================================================

-- 1) No-show y agrupación de reservas recurrentes
alter table public.reservations
  add column if not exists no_show boolean not null default false,
  add column if not exists recurrence_group uuid;

-- 2) Lista de espera: "avísame si se libera este horario"
create table if not exists public.reservation_waitlist (
  id         bigint generated always as identity primary key,
  court_id   bigint not null references public.courts(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  notified   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (court_id, member_id, starts_at)
);

alter table public.reservation_waitlist enable row level security;

drop policy if exists "ver mi espera o staff" on public.reservation_waitlist;
create policy "ver mi espera o staff" on public.reservation_waitlist
  for select using (member_id = auth.uid() or public.is_staff());
drop policy if exists "anotarme en espera" on public.reservation_waitlist;
create policy "anotarme en espera" on public.reservation_waitlist
  for insert with check (member_id = auth.uid());
drop policy if exists "salir de espera o staff" on public.reservation_waitlist;
create policy "salir de espera o staff" on public.reservation_waitlist
  for delete using (member_id = auth.uid() or public.is_staff());
drop policy if exists "staff actualiza espera" on public.reservation_waitlist;
create policy "staff actualiza espera" on public.reservation_waitlist
  for update using (public.is_staff());
