import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { HOURS, ymd, slotDates, dayRangeISO } from '../lib/util'

export default function ReservasAdmin() {
  const [courts, setCourts] = useState([])
  const [day, setDay] = useState(ymd(new Date()))
  const [reservas, setReservas] = useState([])
  const [drawer, setDrawer] = useState(null) // {mode:'new'|'edit', data:{...}}
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    supabase.from('courts').select('*').eq('is_active', true).order('id').then(({ data }) => setCourts(data ?? []))
  }, [])

  async function load() {
    const [fromISO, toISO] = dayRangeISO(day)
    // reservations tiene dos FKs hacia profiles (member_id y created_by):
    // hay que nombrar la relación o PostgREST rechaza la consulta entera.
    const { data, error } = await supabase.from('reservations')
      .select('*, profiles!reservations_member_id_fkey(full_name)')
      .gte('starts_at', fromISO).lt('starts_at', toISO)
      .neq('status', 'cancelled')
      .order('starts_at')
    if (error) { setLoadError('No se pudieron cargar las reservas: ' + error.message); return }
    setLoadError('')
    setReservas(data ?? [])
  }
  useEffect(() => { load() }, [day])

  // Actualización en vivo del calendario
  useEffect(() => {
    const ch = supabase.channel('res-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [day])

  function cellReservation(courtId, hour) {
    const { start, end } = slotDates(day, hour)
    return reservas.find(r => r.court_id === courtId && new Date(r.starts_at) < end && new Date(r.ends_at) > start)
  }

  function openNew(courtId, hour) {
    setError('')
    setDrawer({ mode: 'new', data: { court_id: courtId ?? courts[0]?.id, hour: hour ?? HOURS[0], customer_name: '', is_paid: false, status: 'confirmed' } })
  }
  function openEdit(r) {
    setError('')
    setDrawer({ mode: 'edit', data: { ...r, hour: hourOf(r.starts_at) } })
  }

  async function save() {
    setError('')
    const d = drawer.data
    const { start, end } = slotDates(day, d.hour)
    if (drawer.mode === 'new') {
      const { error } = await supabase.from('reservations').insert({
        court_id: d.court_id, customer_name: d.customer_name.trim() || 'Reserva',
        starts_at: start.toISOString(), ends_at: end.toISOString(),
        status: d.status, is_paid: d.is_paid,
      })
      if (error) { setError(msgError(error)); return }
    } else {
      const { error } = await supabase.from('reservations').update({
        court_id: d.court_id, customer_name: d.customer_name,
        starts_at: start.toISOString(), ends_at: end.toISOString(),
        status: d.status, is_paid: d.is_paid,
      }).eq('id', d.id)
      if (error) { setError(msgError(error)); return }
    }
    setDrawer(null); load()
  }

  async function cancelar() {
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', drawer.data.id)
    setDrawer(null); load()
  }

  const d = drawer?.data

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="h-page" style={{ fontSize: 22 }}>Reservas</div>
          <input type="date" className="input" style={{ width: 160 }} value={day} onChange={e => setDay(e.target.value)} />
        </div>
        <button className="btn-lime" style={{ width: 'auto', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0 }}
          onClick={() => openNew()}>+ Nueva reserva</button>
      </div>

      {loadError && <div className="error-note" style={{ marginBottom: 12 }}>{loadError}</div>}

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${courts.length}, minmax(110px, 1fr))`, gap: 6, minWidth: courts.length * 120 + 70 }}>
          <div />
          {courts.map(c => (
            <div key={c.id} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, padding: 8 }}>{c.name}</div>
          ))}
          {HOURS.map(h => (
            <FragmentRow key={h} hour={h} courts={courts} cellReservation={cellReservation} openNew={openNew} openEdit={openEdit} />
          ))}
        </div>
      </div>

      {drawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 55 }} onClick={() => setDrawer(null)} />
          <div className="drawer">
            <div className="h-section" style={{ marginBottom: 16 }}>{drawer.mode === 'new' ? 'Nueva reserva' : 'Editar reserva'}</div>

            <div className="field-label">Cliente</div>
            <input className="input" style={{ marginBottom: 14 }} placeholder="Nombre del socio o cliente"
              value={d.customer_name ?? d.profiles?.full_name ?? ''}
              onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, customer_name: e.target.value } }))} />

            <div className="field-label">Cancha</div>
            <select className="input" style={{ marginBottom: 14 }} value={d.court_id}
              onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, court_id: Number(e.target.value) } }))}>
              {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="field-label">Horario ({day})</div>
            <select className="input" style={{ marginBottom: 14 }} value={d.hour}
              onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, hour: e.target.value } }))}>
              {HOURS.map(h => <option key={h} value={h}>{h} — {endHour(h)}</option>)}
            </select>

            <div className="field-label">Estado</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[['confirmed', 'Confirmada'], ['pending', 'Pendiente'], ['blocked', 'Bloqueo']].map(([v, l]) => (
                <Toggle key={v} active={d.status === v} label={l}
                  onClick={() => setDrawer(dr => ({ ...dr, data: { ...dr.data, status: v } }))} />
              ))}
            </div>

            <div className="field-label">Estado de pago</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
              <Toggle active={d.is_paid} label="Pagado" onClick={() => setDrawer(dr => ({ ...dr, data: { ...dr.data, is_paid: true } }))} />
              <Toggle active={!d.is_paid} label="Pendiente" onClick={() => setDrawer(dr => ({ ...dr, data: { ...dr.data, is_paid: false } }))} />
            </div>

            {error && <div className="error-note" style={{ marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-lime" style={{ flex: 1, borderRadius: 9, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0, fontWeight: 700 }} onClick={save}>Guardar</button>
              <button className="btn-outline" style={{ flex: 1, borderRadius: 9, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }} onClick={() => setDrawer(null)}>Cerrar</button>
            </div>
            {drawer.mode === 'edit' && (
              <button className="btn-danger-outline" style={{ marginTop: 12 }} onClick={cancelar}>Cancelar esta reserva</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function FragmentRow({ hour, courts, cellReservation, openNew, openEdit }) {
  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--muted)', padding: '10px 4px', textAlign: 'right' }}>{hour}</div>
      {courts.map(c => {
        const r = cellReservation(c.id, hour)
        if (!r) return <div key={c.id} className="cal-cell" onClick={() => openNew(c.id, hour)} />
        const cls = r.status === 'blocked' ? 'blocked' : r.is_paid ? 'paid' : 'pending'
        const name = r.customer_name || r.profiles?.full_name || 'Reserva'
        return (
          <div key={c.id} className={`cal-cell ${cls}`} onClick={() => openEdit(r)} title={name}>
            {r.status === 'blocked' ? 'Bloqueado' : name.split(' ')[0]}
            <div style={{ fontSize: 9, opacity: 0.75 }}>{r.status === 'blocked' ? '' : r.is_paid ? 'Pagado' : r.status === 'pending' ? 'Por confirmar' : 'Pendiente pago'}</div>
          </div>
        )
      })}
    </>
  )
}

function Toggle({ active, label, onClick }) {
  return (
    <div onClick={onClick} style={{
      cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 8,
      background: active ? 'rgba(215,242,60,0.14)' : 'transparent',
      border: active ? '1px solid var(--lime)' : '1px solid rgba(255,255,255,0.15)',
      color: active ? 'var(--lime)' : 'var(--muted)',
    }}>{label}</div>
  )
}

function endHour(h) {
  const n = Number(h.slice(0, 2)) + 1
  return `${String(n).padStart(2, '0')}:00`
}
function hourOf(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:00`
}
function msgError(error) {
  if (error.message.includes('no_overlap')) return 'Ya hay una reserva en esa cancha y horario.'
  return 'No se pudo guardar: ' + error.message
}
