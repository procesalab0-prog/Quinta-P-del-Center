import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { DAY_SHORT, ymd, slotDates, dayRangeISO, slotEnd, buildSlots, slotConfig } from '../lib/util'

export default function Reservas() {
  const { session, settings } = useAuth()
  const { openHour, closeHour, slotMinutes } = slotConfig(settings)
  const HOURS = useMemo(() => buildSlots(openHour, closeHour, slotMinutes), [openHour, closeHour, slotMinutes])
  const [courts, setCourts] = useState([])
  const [dayIdx, setDayIdx] = useState(0)
  const [courtId, setCourtId] = useState(null)
  const [occupied, setOccupied] = useState([]) // rangos ocupados del día (sin nombres)
  const [mine, setMine] = useState([])         // mis reservas del día
  const [slot, setSlot] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return d
  }), [])
  const day = days[dayIdx]
  const dayStr = ymd(day)

  useEffect(() => {
    supabase.from('courts').select('*').eq('is_active', true).order('id').then(({ data }) => {
      setCourts(data ?? [])
      if (data?.length) setCourtId(prev => prev ?? data[0].id)
    })
  }, [])

  async function loadDay() {
    const [fromISO, toISO] = dayRangeISO(dayStr)
    const [{ data: occ }, { data: my }] = await Promise.all([
      supabase.rpc('get_court_availability', { p_from: fromISO, p_to: toISO }),
      supabase.from('reservations').select('*').eq('member_id', session.user.id)
        .gte('starts_at', fromISO).lt('starts_at', toISO)
        .neq('status', 'cancelled'),
    ])
    setOccupied(occ ?? [])
    setMine(my ?? [])
  }
  useEffect(() => { loadDay(); setSlot(null); setConfirmed(false); setError('') }, [dayStr])

  function slotState(hour) {
    const { start, end } = slotDates(dayStr, hour, slotMinutes)
    const isMine = mine.some(r => r.court_id === courtId && new Date(r.starts_at) < end && new Date(r.ends_at) > start)
    if (isMine) return 'mine'
    const occ = occupied.some(o => o.court_id === courtId && new Date(o.starts_at) < end && new Date(o.ends_at) > start)
    if (occ) return 'occupied'
    if (start < new Date()) return 'occupied' // horas pasadas
    return 'free'
  }

  async function confirmar() {
    setError('')
    const { start, end } = slotDates(dayStr, slot, slotMinutes)
    const { error } = await supabase.from('reservations').insert({
      court_id: courtId, member_id: session.user.id,
      starts_at: start.toISOString(), ends_at: end.toISOString(), status: 'pending',
    })
    if (error) {
      setError(error.message.includes('no_overlap')
        ? 'Ese horario se acaba de ocupar. Elige otro.'
        : 'No se pudo crear la reserva. Intenta de nuevo.')
      loadDay()
      return
    }
    setConfirmed(true)
    loadDay()
  }

  const court = courts.find(c => c.id === courtId)

  return (
    <div style={{ animation: 'qpc-fadein 0.25s ease', paddingBottom: 110 }}>
      <div className="h-page" style={{ marginBottom: 14 }}>Reservar cancha</div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        {days.map((d, i) => (
          <div key={i} className={`day-pill ${dayIdx === i ? 'active' : ''}`} onClick={() => setDayIdx(i)}>
            <div className="lbl">{i === 0 ? 'Hoy' : DAY_SHORT[d.getDay()]}</div>
            <div className="num">{d.getDate()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {courts.map(c => (
          <div key={c.id} className={`court-chip ${courtId === c.id ? 'active' : ''}`}
            onClick={() => { setCourtId(c.id); setSlot(null); setConfirmed(false) }}>
            {c.name}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {HOURS.map(h => {
          const st = slotState(h)
          return (
            <div key={h} className={`slot ${st === 'occupied' ? 'occupied' : ''} ${st === 'mine' || (slot === h && st === 'free') ? 'mine' : ''}`}
              onClick={() => { if (st === 'free') { setSlot(h); setConfirmed(false) } }}>
              <div className="slot-h">{h}</div>
              <div className="slot-l">{st === 'mine' ? 'Tu reserva' : st === 'occupied' ? 'Ocupado' : slot === h ? 'Seleccionado' : 'Disponible'}</div>
            </div>
          )
        })}
      </div>

      {slot && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 40px)', maxWidth: 390,
          bottom: 98, background: 'var(--surf)', border: '1px solid rgba(215,242,60,0.4)', borderRadius: 14,
          padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 40,
        }}>
          {confirmed ? (
            <div style={{ color: 'var(--lime)', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
              ✓ Solicitud enviada — {court?.name} · {DAY_SHORT[day.getDay()]} {day.getDate()} · {slot}. El club la confirmará.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                {court?.name} · {DAY_SHORT[day.getDay()]} {day.getDate()} · {slot}–{slotEnd(slot, slotMinutes)}
              </div>
              {error && <div className="error-note" style={{ marginBottom: 8 }}>{error}</div>}
              <button className="btn-lime" style={{ padding: 11, borderRadius: 9 }} onClick={confirmar}>Confirmar reserva</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
