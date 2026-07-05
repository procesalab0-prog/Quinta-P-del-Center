export const LEVEL_LABEL = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' }
export const LEVEL_BG = { bronce: '#B08A63', plata: '#C9CDC4', oro: '#D7F23C' }

// Horario del club: 08:00 a 23:00, bloques de 1 hora (último inicio 22:00)
export const OPEN_HOUR = 8
export const CLOSE_HOUR = 23
export const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => {
  const h = OPEN_HOUR + i
  return `${String(h).padStart(2, '0')}:00`
})

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

export function slotDates(day /* 'YYYY-MM-DD' */, hour /* 'HH:00' */) {
  const start = new Date(`${day}T${hour}:00`)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
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
