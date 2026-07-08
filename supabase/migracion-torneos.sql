-- ============================================================
-- Torneos 2.0: rol de juego, resultados y mensajes del torneo
-- Pegar TODO en: SQL Editor → New query → Run (idempotente)
-- ============================================================

-- 1) Partidos del torneo (rol de juego)
create table if not exists public.tournament_matches (
  id            bigint generated always as identity primary key,
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  round         text not null default 'Grupos',        -- Grupos/Octavos/Cuartos/Semifinal/Final
  court_id      bigint references public.courts(id),
  starts_at     timestamptz,                            -- null = horario por definir
  pair1_reg_id  bigint references public.tournament_registrations(id) on delete set null,
  pair1_label   text,                                   -- nombre libre si la pareja no está inscrita
  pair2_reg_id  bigint references public.tournament_registrations(id) on delete set null,
  pair2_label   text,
  score         text,                                   -- ej. "6-3, 4-6, 7-5"
  winner        int check (winner in (1, 2)),           -- null = pendiente
  status        text not null default 'scheduled'
                check (status in ('scheduled','playing','done','cancelled')),
  created_at    timestamptz not null default now()
);

-- 2) Mensajes del torneo (avisos a los inscritos)
create table if not exists public.tournament_messages (
  id            bigint generated always as identity primary key,
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  body          text not null,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

-- 3) Seguridad
alter table public.tournament_matches  enable row level security;
alter table public.tournament_messages enable row level security;

drop policy if exists "ver partidos" on public.tournament_matches;
create policy "ver partidos" on public.tournament_matches
  for select using (auth.uid() is not null);
drop policy if exists "staff administra partidos" on public.tournament_matches;
create policy "staff administra partidos" on public.tournament_matches
  for all using (public.is_staff());

drop policy if exists "ver mensajes torneo" on public.tournament_messages;
create policy "ver mensajes torneo" on public.tournament_messages
  for select using (auth.uid() is not null);
drop policy if exists "staff administra mensajes torneo" on public.tournament_messages;
create policy "staff administra mensajes torneo" on public.tournament_messages
  for all using (public.is_staff());

-- 4) Tiempo real (resultados y mensajes en vivo en la app)
do $$ begin
  alter publication supabase_realtime add table public.tournament_matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.tournament_messages;
exception when duplicate_object then null; end $$;
