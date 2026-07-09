-- ============================================================
-- Pareja con cuenta: ligar al compañero de dobles a su cuenta
-- para que los avisos y el partido le lleguen a las dos personas.
-- Pegar en SQL Editor → Run (idempotente).
-- ============================================================

-- 1) Columna: cuenta del compañero (opcional; si no tiene cuenta, se usa partner_name)
alter table public.tournament_registrations
  add column if not exists partner_member_id uuid references public.profiles(id);

-- 2) El compañero también puede VER su inscripción (para que el partido
--    aparezca en su cuenta)
drop policy if exists "ver mi inscripcion o staff" on public.tournament_registrations;
create policy "ver mi inscripcion o staff" on public.tournament_registrations
  for select using (
    member_id = auth.uid()
    or partner_member_id = auth.uid()
    or public.is_staff()
  );

-- 3) Buscador de socios para elegir pareja al inscribirse
--    (devuelve SOLO id y nombre, nunca teléfono → privacidad)
create or replace function public.search_members(p_q text)
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name
  from profiles p
  where auth.uid() is not null
    and p.is_active
    and p.id <> auth.uid()
    and coalesce(p.full_name, '') <> ''
    and p.full_name ilike '%' || p_q || '%'
  order by p.full_name
  limit 8
$$;
