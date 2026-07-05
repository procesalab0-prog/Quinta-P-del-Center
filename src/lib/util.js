export const LEVEL_LABEL = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' }
export const LEVEL_BG = { bronce: '#B08A63', plata: '#C9CDC4', oro: '#D7F23C' }

// Valores por defecto del horario del club (se pueden cambiar en Configuración).
export const OPEN_HOUR = 8
export const CLOSE_HOUR = 23
export const SLOT_MINUTES = 90

function fmtMin(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Genera los horarios de reserva a partir de la configuración del club.
// Ej. (8, 23, 90) → 08:00, 09:30, 11:00 … 21:30 (el último termina a las 23:00).
export function buildSlots(openHour = OPEN_HOUR, closeHour = CLOSE_HOUR, slotMinutes = SLOT_MINUTES) {
  const step = Math.max(15, Number(slotMinutes) || SLOT_MINUTES)
  const slots = []
  for (let m = openHour * 60; m + step <= closeHour * 60; m += step) {
    slots.push(fmtMin(m))
  }
  return slots
}

// Horarios con los valores por defecto (fallback cuando aún no cargó la config).
export const HOURS = buildSlots()

// Lee la config de reservas del objeto settings, con valores por defecto seguros.
export function slotConfig(settings) {
  return {
    openHour: settings?.open_hour ?? OPEN_HOUR,
    closeHour: settings?.close_hour ?? CLOSE_HOUR,
    slotMinutes: settings?.reservation_slot_minutes ?? SLOT_MINUTES,
  }
}

// Hora de fin de un slot dado su inicio 'HH:MM' → 'HH:MM'
export function slotEnd(hour, slotMinutes = SLOT_MINUTES) {
  const [h, m] = hour.split(':').map(Number)
  return fmtMin(h * 60 + m + (Number(slotMinutes) || SLOT_MINUTES))
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

export function slotDates(day /* 'YYYY-MM-DD' */, hour /* 'HH:MM' */, slotMinutes = SLOT_MINUTES) {
  const start = new Date(`${day}T${hour}:00`)
  const end = new Date(start.getTime() + (Number(slotMinutes) || SLOT_MINUTES) * 60 * 1000)
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
