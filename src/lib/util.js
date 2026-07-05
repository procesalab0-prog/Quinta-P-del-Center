export const LEVEL_LABEL = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' }
export const LEVEL_BG = { bronce: '#B08A63', plata: '#C9CDC4', oro: '#D7F23C' }

// Horario del club: 08:00 a 23:00, bloques de 1 hora y media.
// Genera: 08:00, 09:30, 11:00 … 21:30 (el último termina justo a las 23:00).
export const OPEN_HOUR = 8
export const CLOSE_HOUR = 23
export const SLOT_MINUTES = 90

function fmtMin(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const HOURS = (() => {
  const slots = []
  for (let m = OPEN_HOUR * 60; m + SLOT_MINUTES <= CLOSE_HOUR * 60; m += SLOT_MINUTES) {
    slots.push(fmtMin(m))
  }
  return slots
})()

// Hora de fin de un slot dado su inicio 'HH:MM' → 'HH:MM'
export function slotEnd(hour) {
  const [h, m] = hour.split(':').map(Number)
  return fmtMin(h * 60 + m + SLOT_MINUTES)
}

export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const MONTH_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

export function memberNumber(code) {
  return 'QPC-' + (code || '').replaceAll('-', '').slice(0, 5).toUpperCase()
}

export function initials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function ymd(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Rango completo de un día LOCAL expresado en ISO/UTC, para filtrar timestamptz
// sin perder las reservas de la tarde-noche (México va horas atrás de UTC).
export function dayRangeISO(day /* 'YYYY-MM-DD' */) {
  const start = new Date(`${day}T00:00:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return [start.toISOString(), end.toISOString()]
}

export function slotDates(day /* 'YYYY-MM-DD' */, hour /* 'HH:MM' */) {
  const start = new Date(`${day}T${hour}:00`)
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000)
  return { start, end }
}

export function fmtDateShort(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()].charAt(0) + MONTH_SHORT[d.getMonth()].slice(1).toLowerCase()}`
}

export function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `Hace ${Math.max(1, mins)} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Hace 1 día'
  if (d < 7) return `Hace ${d} días`
  const w = Math.floor(d / 7)
  return w === 1 ? 'Hace 1 semana' : `Hace ${w} semanas`
}
