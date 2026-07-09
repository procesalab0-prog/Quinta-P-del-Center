-- ============================================================
-- Reservas 2.0: precio, teléfono de cliente externo y avisos a la reserva
-- Pegar en SQL Editor → Run (idempotente).
-- ============================================================

-- 1) Precio por reserva y teléfono para clientes externos (sin cuenta)
alter table public.reservations
  add column if not exists price numeric(10,2),
  add column if not exists customer_phone text;

-- 2) Precio de cancha por defecto (para prellenar nuevas reservas)
alter table public.loyalty_settings
  add column if not exists court_price numeric(10,2) not null default 0;

-- 3) Avisos que el club manda a una reserva (aparecen en la app del socio)
create table if not exists public.reservation_messages (
  id             bigint generated always as identity primary key,
  reservation_id bigint not null references public.reservations(id) on delete cascade,
  body           text not null,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);

alter table public.reservation_messages enable row level security;

drop policy if exists "ver avisos de mi reserva o staff" on public.reservation_messages;
create policy "ver avisos de mi reserva o staff" on public.reservation_messages
  for select using (
    public.is_staff()
    or exists (select 1 from reservations r where r.id = reservation_id and r.member_id = auth.uid())
  );
drop policy if exists "staff administra avisos reserva" on public.reservation_messages;
create policy "staff administra avisos reserva" on public.reservation_messages
  for all using (public.is_staff());

-- 4) Tiempo real
do $$ begin
  alter publication supabase_realtime add table public.reservation_messages;
exception when duplicate_object then null; end $$;
