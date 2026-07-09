import { DAY_SHORT } from './util'

export const ROUNDS = ['Grupos', 'Octavos', 'Cuartos', 'Semifinal', 'Final']

// Embed de PostgREST para traer los nombres de las parejas de cada partido.
// tournament_matches tiene dos FKs a tournament_registrations: hay que nombrarlas.
const REG_FIELDS = `id, partner_name,
 profiles(full_name, phone),
 partner:profiles!tournament_registrations_partner_member_id_fkey(full_name, phone)`

export const MATCH_EMBED = `*, courts(name),
 pair1:tournament_registrations!tournament_matches_pair1_reg_id_fkey(${REG_FIELDS}),
 pair2:tournament_registrations!tournament_matches_pair2_reg_id_fkey(${REG_FIELDS})`

export function pairName(reg, label) {
  if (label) return label
  if (!reg) return 'Por definir'
  const n = reg.profiles?.full_name || 'Socio'
  const partner = reg.partner_name || reg.partner?.full_name
  return partner ? `${n} / ${partner}` : n
}

// Personas de una inscripción a las que se les puede mandar WhatsApp:
// el titular y, si tiene cuenta ligada, su compañero.
export function pairRecipients(reg) {
  if (!reg) return []
  const out = []
  if (reg.profiles?.phone) out.push({ name: firstName(reg.profiles.full_name), phone: reg.profiles.phone })
  if (reg.partner?.phone) out.push({ name: firstName(reg.partner.full_name), phone: reg.partner.phone })
  return out
}

function firstName(n) { return (n || '').split(' ')[0] }

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

// Mensaje de confirmación de partido para una persona (recipientName) de la pareja `side`
export function matchWaMsg(torneoTitle, match, side, recipientName) {
  const rival = side === 1 ? pairName(match.pair2, match.pair2_label) : pairName(match.pair1, match.pair1_label)
  const cancha = match.courts?.name ? ` en ${match.courts.name}` : ''
  return `Hola ${recipientName}! 🎾 "${torneoTitle}" — te confirmamos tu partido (${match.round}): ${fmtMatchTime(match.starts_at)}${cancha} vs ${rival}. ¡Te esperamos en Quinta Padel Center!`
}

// Link de WhatsApp con mensaje prellenado (52 = México si son 10 dígitos)
export function waLink(phone, text) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = '52' + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
