-- ============================================================
-- Quinta P del Center — Esquema completo para Supabase
-- Pegar este archivo entero en: SQL Editor → New query → Run
-- ============================================================

create extension if not exists btree_gist; -- para evitar reservas encimadas

-- ------------------------------------------------------------
-- 1. PERFILES (se crea uno por cada cuenta de Auth, vía trigger)
-- ------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  phone        text,
  avatar_url   text,
  play_category text,                                   -- ej. "4ta fuerza"
  role         text not null default 'member' check (role in ('member','staff','admin')),
  member_code  uuid not null unique default gen_random_uuid(), -- lo que encodea el QR
  stamps       int  not null default 0,                 -- sellos actuales (se reinician al canjear)
  total_visits int  not null default 0,                 -- histórico, define el nivel
  level        text not null default 'bronce' check (level in ('bronce','plata','oro')),
  is_active    boolean not null default true,
  birthdate    date,
  created_at   timestamptz not null default now()
);

-- Funciones auxiliares de rol
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('staff','admin') and is_active)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active)
$$;

-- Crear el perfil automáticamente al registrarse
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          new.raw_user_meta_data->>'phone');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un socio no puede cambiarse a sí mismo rol, sellos, nivel ni código.
-- auth.uid() es null cuando se ejecuta desde el dashboard/servidor: se permite
-- (necesario para crear al primer admin; RLS ya bloquea a los anónimos vía API).
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

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ------------------------------------------------------------
-- 2. LEALTAD: configuración, visitas, premios, canjes
-- ------------------------------------------------------------
create table public.loyalty_settings (
  id int primary key default 1 check (id = 1),          -- una sola fila
  stamps_per_reward        int not null default 10,
  duplicate_window_minutes int not null default 120,    -- anti doble sello
  silver_visits            int not null default 20,
  gold_visits              int not null default 50
);
insert into public.loyalty_settings (id) values (1);

create table public.visits (
  id         bigint generated always as identity primary key,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  staff_id   uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.rewards (
  id              bigint generated always as identity primary key,
  name            text not null,                        -- ej. "1 hora de cancha gratis"
  description     text,
  stamps_required int not null default 10,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.redemptions (
  id         bigint generated always as identity primary key,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  reward_id  bigint not null references public.rewards(id),
  staff_id   uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. AVISOS Y TORNEOS
-- ------------------------------------------------------------
create table public.announcements (
  id           bigint generated always as identity primary key,
  title        text not null,
  body         text,
  image_url    text,
  is_pinned    boolean not null default false,
  is_published boolean not null default true,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create table public.tournaments (
  id                bigint generated always as identity primary key,
  title             text not null,
  poster_url        text,
  starts_at         timestamptz not null,
  categories        text[] not null default '{}',       -- ej. {'2da','3ra','4ta'}
  fee               numeric(10,2) not null default 0,
  capacity          int,
  registration_open boolean not null default true,
  is_published      boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.tournament_registrations (
  id            bigint generated always as identity primary key,
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  member_id     uuid not null references public.profiles(id) on delete cascade,
  partner_name  text,
  category      text,
  is_paid       boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (tournament_id, member_id)
);

-- ------------------------------------------------------------
-- 4. CANCHAS Y RESERVAS
-- ------------------------------------------------------------
create table public.courts (
  id        bigint generated always as identity primary key,
  name      text not null,                               -- ej. "Cancha 1"
  is_active boolean not null default true
);

create table public.reservations (
  id            bigint generated always as identity primary key,
  court_id      bigint not null references public.courts(id),
  member_id     uuid references public.profiles(id),     -- null si es cliente de mostrador
  customer_name text,                                    -- para reservas hechas por el admin
  starts_at     timestamptz not null,
  ends_at       timestamptz not null check (ends_at > starts_at),
  status        text not null default 'pending'
                check (status in ('pending','confirmed','cancelled','blocked')),
  is_paid       boolean not null default false,
  notes         text,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  -- ninguna cancha puede tener dos reservas activas encimadas:
  constraint no_overlap exclude using gist (
    court_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled')
);

-- Disponibilidad para el cliente SIN exponer nombres de otros socios.
-- Recibe el rango exacto (inicio/fin del día LOCAL) para no perder reservas
-- nocturnas por diferencia de zona horaria con UTC.
create or replace function public.get_court_availability(p_from timestamptz, p_to timestamptz)
returns table (court_id bigint, court_name text, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.court_id, c.name, r.starts_at, r.ends_at
  from reservations r join courts c on c.id = r.court_id
  where r.status in ('pending','confirmed','blocked')
    and r.starts_at < p_to and r.ends_at > p_from
$$;

-- ------------------------------------------------------------
-- 5. RPCs DEL ESCÁNER (única vía para modificar sellos)
-- ------------------------------------------------------------
create or replace function public.get_member_by_code(p_code uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare m record;
begin
  if not public.is_staff() then raise exception 'Solo el staff puede escanear'; end if;
  select id, full_name, avatar_url, level, stamps, total_visits, is_active
    into m from profiles where member_code = p_code;
  if not found then raise exception 'Código QR no reconocido'; end if;
  return row_to_json(m);
end $$;

create or replace function public.register_visit(p_code uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  m profiles%rowtype;
  cfg loyalty_settings%rowtype;
begin
  if not public.is_staff() then raise exception 'Solo el staff puede registrar visitas'; end if;
  select * into cfg from loyalty_settings where id = 1;
  select * into m from profiles where member_code = p_code for update;
  if not found then raise exception 'Código QR no reconocido'; end if;
  if not m.is_active then raise exception 'Cuenta desactivada'; end if;
  if exists (
    select 1 from visits
    where member_id = m.id
      and created_at > now() - make_interval(mins => cfg.duplicate_window_minutes)
  ) then
    raise exception 'Este socio ya registró una visita hace menos de % minutos', cfg.duplicate_window_minutes;
  end if;

  insert into visits (member_id, staff_id) values (m.id, auth.uid());
  update profiles set
    stamps       = stamps + 1,
    total_visits = total_visits + 1,
    level = case
      when total_visits + 1 >= cfg.gold_visits   then 'oro'
      when total_visits + 1 >= cfg.silver_visits then 'plata'
      else 'bronce' end
  where id = m.id
  returning * into m;

  return json_build_object('full_name', m.full_name, 'stamps', m.stamps,
                           'total_visits', m.total_visits, 'level', m.level,
                           'reward_ready', m.stamps >= cfg.stamps_per_reward);
end $$;

create or replace function public.redeem_reward(p_code uuid, p_reward_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare
  m profiles%rowtype;
  r rewards%rowtype;
begin
  if not public.is_staff() then raise exception 'Solo el staff puede canjear premios'; end if;
  select * into m from profiles where member_code = p_code for update;
  if not found then raise exception 'Código QR no reconocido'; end if;
  select * into r from rewards where id = p_reward_id and is_active;
  if not found then raise exception 'Premio no disponible'; end if;
  if m.stamps < r.stamps_required then
    raise exception 'Sellos insuficientes: tiene % y se requieren %', m.stamps, r.stamps_required;
  end if;

  insert into redemptions (member_id, reward_id, staff_id) values (m.id, r.id, auth.uid());
  update profiles set stamps = stamps - r.stamps_required where id = m.id returning * into m;

  return json_build_object('full_name', m.full_name, 'reward', r.name, 'stamps', m.stamps);
end $$;

-- ------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.loyalty_settings         enable row level security;
alter table public.visits                   enable row level security;
alter table public.rewards                  enable row level security;
alter table public.redemptions              enable row level security;
alter table public.announcements            enable row level security;
alter table public.tournaments              enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.courts                   enable row level security;
alter table public.reservations             enable row level security;

-- profiles
create policy "ver mi perfil o staff ve todos" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "editar mi perfil o staff edita" on public.profiles
  for update using (id = auth.uid() or public.is_staff());

-- loyalty_settings: todos leen (la app cliente pinta la tarjeta), solo admin edita
create policy "leer configuracion" on public.loyalty_settings
  for select using (auth.uid() is not null);
create policy "admin edita configuracion" on public.loyalty_settings
  for update using (public.is_admin());

-- visits / redemptions: el socio ve las suyas, staff todas (se insertan solo vía RPC)
create policy "ver mis visitas o staff" on public.visits
  for select using (member_id = auth.uid() or public.is_staff());
create policy "ver mis canjes o staff" on public.redemptions
  for select using (member_id = auth.uid() or public.is_staff());

-- rewards: socios ven activos, admin administra
create policy "ver premios activos" on public.rewards
  for select using (is_active or public.is_staff());
create policy "admin administra premios" on public.rewards
  for all using (public.is_admin());

-- announcements
create policy "ver avisos publicados" on public.announcements
  for select using (is_published or public.is_staff());
create policy "admin administra avisos" on public.announcements
  for all using (public.is_admin());

-- tournaments
create policy "ver torneos publicados" on public.tournaments
  for select using (is_published or public.is_staff());
create policy "admin administra torneos" on public.tournaments
  for all using (public.is_admin());

-- tournament_registrations
create policy "ver mi inscripcion o staff" on public.tournament_registrations
  for select using (member_id = auth.uid() or public.is_staff());
create policy "inscribirme yo mismo" on public.tournament_registrations
  for insert with check (
    member_id = auth.uid()
    and exists (select 1 from tournaments t
                where t.id = tournament_id and t.registration_open and t.is_published)
  );
create policy "cancelar mi inscripcion o staff" on public.tournament_registrations
  for delete using (member_id = auth.uid() or public.is_staff());
create policy "staff marca pagos" on public.tournament_registrations
  for update using (public.is_staff());

-- courts
create policy "ver canchas" on public.courts
  for select using (auth.uid() is not null);
create policy "admin administra canchas" on public.courts
  for all using (public.is_admin());

-- reservations: el socio ve/crea las suyas (la disponibilidad general
-- se consulta con get_court_availability, sin nombres); staff todo
create policy "ver mis reservas o staff" on public.reservations
  for select using (member_id = auth.uid() or public.is_staff());
create policy "solicitar mi reserva" on public.reservations
  for insert with check (member_id = auth.uid() and status = 'pending');
create policy "staff administra reservas" on public.reservations
  for update using (public.is_staff());
create policy "staff elimina reservas" on public.reservations
  for delete using (public.is_staff());

-- ------------------------------------------------------------
-- 7. STORAGE (ejecutar DESPUÉS de crear los buckets en el dashboard:
--    "public-assets" y "avatars", ambos públicos)
-- ------------------------------------------------------------
create policy "lectura publica de assets" on storage.objects
  for select using (bucket_id in ('public-assets','avatars'));
create policy "admin sube assets" on storage.objects
  for insert with check (bucket_id = 'public-assets' and public.is_admin());
create policy "cada quien sube su avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "cada quien actualiza su avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 8. DATOS INICIALES DE EJEMPLO
-- ------------------------------------------------------------
insert into public.courts (name) values ('Cancha 1'), ('Cancha 2'), ('Cancha 3');
insert into public.rewards (name, description, stamps_required) values
  ('1 hora de cancha gratis', 'Al completar tu tarjeta de 10 visitas', 10);
