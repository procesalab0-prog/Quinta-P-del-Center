import { DAY_SHORT } from './util'

export const ROUNDS = ['Grupos', 'Octavos', 'Cuartos', 'Semifinal', 'Final']

// Embed de PostgREST para traer los nombres de las parejas de cada partido.
// tournament_matches tiene dos FKs a tournament_registrations: hay que nombrarlas.
export const MATCH_EMBED = `*, courts(name),
 pair1:tournament_registrations!tournament_matches_pair1_reg_id_fkey(id, partner_name, profiles(full_name)),
 pair2:tournament_registrations!tournament_matches_pair2_reg_id_fkey(id, partner_name, profiles(full_name))`

export function pairName(reg, label) {
  if (label) return label
  if (!reg) return 'Por definir'
  const n = reg.profiles?.full_name || 'Socio'
  return reg.partner_name ? `${n} / ${reg.partner_name}` : n
}

export function matchInvolves(match, regId) {
  if (!regId) return false
  return match.pair1_reg_id === regId || match.pair2_reg_id === regId
}

export function opponentName(match, regId) {
  if (match.pair1_reg_id === regId) return pairName(match.pair2, match.pair2_label)
  return pairName(match.pair1, match.pair1_label)
}

export function fmtMatchTime(iso) {
  if (!iso) return 'Horario por definir'
  const d = new Date(iso)
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} h`
}

// Próximo partido (agendado o jugándose) de una inscripción
export function nextMatchFor(matches, regId) {
  if (!regId) return null
  return (matches ?? [])
    .filter(m => matchInvolves(m, regId) && ['scheduled', 'playing'].includes(m.status) && m.starts_at && new Date(m.starts_at) > new Date(Date.now() - 2 * 3600000))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] ?? null
}

// Link de WhatsApp con mensaje prellenado (52 = México si son 10 dígitos)
export function waLink(phone, text) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = '52' + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
