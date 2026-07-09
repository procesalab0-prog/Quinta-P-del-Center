import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { ymd, slotDates, dayRangeISO, buildSlots, slotConfig, DAY_SHORT } from '../lib/util'
import { waLink } from '../lib/torneo'

export default function ReservasAdmin() {
  const { settings } = useAuth()
  const { openHour, closeHour, slotMinutes } = slotConfig(settings)
  const defaultPrice = settings?.court_price ?? 0
  const HOURS = useMemo(() => buildSlots(openHour, closeHour, slotMinutes), [openHour, closeHour, slotMinutes])
  const [courts, setCourts] = useState([])
  const [day, setDay] = useState(ymd(new Date()))
  const [reservas, setReservas] = useState([])
  const [drawer, setDrawer] = useState(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [socios, setSocios] = useState([])
  const [resMsgs, setResMsgs] = useState([])   // avisos de la reserva en edición
  const [avisoText, setAvisoText] = useState('')
  const [waText, setWaText] = useState('')      // mensaje editable de confirmación
  const [waitlist, setWaitlist] = useState([])  // lista de espera del día

  // Corte de caja del día
  const caja = useMemo(() => {
    const activas = reservas.filter(r => r.status !== 'blocked')
    const cobrado = activas.filter(r => r.is_paid).reduce((s, r) => s + Number(r.price || 0), 0)
    const pendiente = activas.filter(r => !r.is_paid).reduce((s, r) => s + Number(r.price || 0), 0)
    return { cobrado, pendiente, total: cobrado + pendiente, count: activas.length }
  }, [reservas])

  const waitlistFuture = useMemo(() => waitlist.filter(w => new Date(w.ends_at) > new Date()), [waitlist])

  useEffect(() => {
    supabase.from('courts').select('*').eq('is_active', true).order('id').then(({ data }) => setCourts(data ?? []))
    supabase.from('profiles').select('id, full_name, phone').eq('is_active', true).order('full_name')
      .then(({ data }) => setSocios(data ?? []))
  }, [])

  async function load() {
    const [fromISO, toISO] = dayRangeISO(day)
    const { data, error } = await supabase.from('reservations')
      .select('*, profiles!reservations_member_id_fkey(full_name, phone)')
      .gte('starts_at', fromISO).lt('starts_at', toISO)
      .neq('status', 'cancelled')
      .order('starts_at')
    if (error) { setLoadError('No se pudieron cargar las reservas: ' + error.message); return }
    setLoadError('')
    setReservas(data ?? [])
    // Lista de espera del día
    const { data: wl } = await supabase.from('reservation_waitlist')
      .select('*, profiles(full_name, phone)')
      .gte('starts_at', fromISO).lt('starts_at', toISO).order('starts_at')
    setWaitlist(wl ?? [])
  }
  useEffect(() => { load() }, [day])

  useEffect(() => {
    const ch = supabase.channel('res-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [day])

  function cellReservation(courtId, hour) {
    const { start, end } = slotDates(day, hour, slotMinutes)
    return reservas.find(r => r.court_id === courtId && new Date(r.starts_at) < end && new Date(r.ends_at) > start)
  }
  function isPastSlot(hour) {
    return slotDates(day, hour, slotMinutes).start < new Date()
  }

  function openNew(courtId, hour) {
    if (hour && isPastSlot(hour)) return // no crear en el pasado
    setError(''); setResMsgs([]); setAvisoText('')
    const startTime = hour ?? firstFutureSlot(HOURS)
    setDrawer({
      mode: 'new', data: {
        court_id: courtId ?? courts[0]?.id, member_id: null, customer_name: '', customer_phone: '',
        startTime, endTime: addMinutes(startTime, slotMinutes),
        price: defaultPrice ? String(defaultPrice) : '', is_paid: false, status: 'confirmed', notes: '',
        repeatWeeks: 0,
      },
    })
  }
  async function openEdit(r) {
    setError(''); setAvisoText('')
    setDrawer({
      mode: 'edit', data: {
        ...r, member_id: r.member_id ?? null,
        startTime: hourOf(r.starts_at), endTime: hourOf(r.ends_at),
        price: r.price != null ? String(r.price) : '',
        customer_phone: r.customer_phone ?? '',
      },
    })
    const { data } = await supabase.from('reservation_messages').select('*').eq('reservation_id', r.id).order('created_at', { ascending: false })
    setResMsgs(data ?? [])
  }

  function buildRow(d) {
    const start = new Date(`${day}T${d.startTime}:00`)
    const end = new Date(`${day}T${d.endTime}:00`)
    return {
      row: {
        court_id: d.court_id,
        member_id: d.member_id || null,
        customer_name: d.member_id ? null : (d.customer_name?.trim() || 'Reserva'),
        customer_phone: d.member_id ? null : (d.customer_phone?.trim() || null),
        starts_at: start.toISOString(), ends_at: end.toISOString(),
        status: d.status, is_paid: d.is_paid,
        price: d.price !== '' ? Number(d.price) : null,
        notes: d.notes?.trim() || null,
        no_show: !!d.no_show,
      }, start, end,
    }
  }

  async function save() {
    setError('')
    const d = drawer.data
    const { row, start, end } = buildRow(d)
    if (end <= start) { setError('La hora de fin debe ser mayor que la de inicio.'); return }
    if (drawer.mode === 'new' && start < new Date()) { setError('No puedes crear una reserva en un horario que ya pasó.'); return }
    if (drawer.mode === 'new') {
      const weeks = Number(d.repeatWeeks) || 0
      if (weeks > 0) {
        // Reserva recurrente: una fila por semana (misma hora), ligadas por grupo
        const group = crypto.randomUUID()
        const rows = []
        for (let i = 0; i <= weeks; i++) {
          const s = new Date(start.getTime() + i * 7 * 86400000)
          const e = new Date(end.getTime() + i * 7 * 86400000)
          rows.push({ ...row, starts_at: s.toISOString(), ends_at: e.toISOString(), recurrence_group: group })
        }
        // Insertamos una por una para saltar las que choquen sin abortar todo
        let ok = 0, choques = 0
        for (const r of rows) {
          const { error } = await supabase.from('reservations').insert(r)
          if (error) choques++; else ok++
        }
        setDrawer(null); load()
        if (choques > 0) alert(`Se crearon ${ok} reservas. ${choques} semana(s) ya estaban ocupadas y se omitieron.`)
        return
      }
      const { error } = await supabase.from('reservations').insert(row)
      if (error) { setError(msgError(error)); return }
    } else {
      const { error } = await supabase.from('reservations').update(row).eq('id', d.id)
      if (error) { setError(msgError(error)); return }
    }
    setDrawer(null); load()
  }

  async function cancelar() {
    const r = drawer.data
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', r.id)
    setDrawer(null)
    await load()
    // ¿Alguien esperaba este horario? (cualquier cancha, solo futuros)
    const esperando = waitlist.filter(w =>
      new Date(w.ends_at) > new Date() &&
      new Date(w.starts_at) < new Date(r.ends_at) && new Date(w.ends_at) > new Date(r.starts_at))
    if (esperando.length > 0) {
      alert(`Se liberó este horario y hay ${esperando.length} en lista de espera. Revisa el panel "Lista de espera" para asignarlo con un toque.`)
    }
  }

  async function quitarEspera(id) {
    await supabase.from('reservation_waitlist').delete().eq('id', id)
    load()
  }

  // Asigna a un socio de la lista de espera: le crea la reserva en una cancha
  // libre a esa hora y le avisa por su app.
  async function asignarEspera(w) {
    const start = new Date(w.starts_at), end = new Date(w.ends_at)
    const { data: overlap } = await supabase.from('reservations')
      .select('court_id').lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()).neq('status', 'cancelled')
    const ocupadas = new Set((overlap ?? []).map(r => r.court_id))
    const court = !ocupadas.has(w.court_id) ? w.court_id : courts.find(c => !ocupadas.has(c.id))?.id
    if (!court) { alert('No hay ninguna cancha libre a esa hora.'); return }
    const { data: nueva, error } = await supabase.from('reservations').insert({
      court_id: court, member_id: w.member_id,
      starts_at: w.starts_at, ends_at: w.ends_at, status: 'confirmed', is_paid: false,
      price: defaultPrice || null,
    }).select().single()
    if (error) { alert('No se pudo asignar: ' + error.message); return }
    const cancha = courts.find(c => c.id === court)?.name
    await supabase.from('reservation_messages').insert({
      reservation_id: nueva.id,
      body: `¡Se liberó tu horario! 🎾 Tu reserva quedó confirmada en ${cancha}, ${hourOf(w.starts_at)}–${hourOf(w.ends_at)}. ¡Te esperamos!`,
    })
    await supabase.from('reservation_waitlist').delete().eq('id', w.id)
    load()
    alert(`Reserva creada para ${w.profiles?.full_name || 'el socio'} en ${cancha}. Le llegó el aviso a su app.`)
  }

  async function enviarAviso() {
    if (!avisoText.trim() || drawer.mode !== 'edit') return
    const { error } = await supabase.from('reservation_messages').insert({ reservation_id: drawer.data.id, body: avisoText.trim() })
    if (error) { setError('No se pudo enviar el aviso: ' + error.message); return }
    setAvisoText('')
    const { data } = await supabase.from('reservation_messages').select('*').eq('reservation_id', drawer.data.id).order('created_at', { ascending: false })
    setResMsgs(data ?? [])
  }

  // Datos de contacto/nombre según sea socio o cliente externo
  function reservaNombre(d) {
    if (d.member_id) return socios.find(s => s.id === d.member_id)?.full_name || 'Socio'
    return d.customer_name?.trim() || 'Cliente'
  }
  function reservaPhone(d) {
    if (d.member_id) return socios.find(s => s.id === d.member_id)?.phone || ''
    return d.customer_phone?.trim() || ''
  }
  function confirmMsg(d) {
    const nombre = reservaNombre(d).split(' ')[0]
    const cancha = courts.find(c => c.id === d.court_id)?.name || 'cancha'
    const fecha = new Date(`${day}T00:00:00`)
    const precio = d.price !== '' && Number(d.price) > 0 ? ` Costo: $${Number(d.price).toLocaleString()}.` : ''
    const pago = d.is_paid ? ' (pagado)' : ''
    return `Hola ${nombre}! 🎾 Te confirmamos tu reserva en Quinta Padel Center: ${cancha}, ${DAY_SHORT[fecha.getDay()]} ${fecha.getDate()} de ${d.startTime} a ${d.endTime}.${precio}${pago} ¡Te esperamos!`
  }
  function avisoWa(d) {
    const nombre = reservaNombre(d).split(' ')[0]
    return avisoText.trim()
      ? `Hola ${nombre}! 🎾 ${avisoText.trim()} — Quinta Padel Center`
      : `Hola ${nombre}! 🎾 Sobre tu reserva en Quinta Padel Center: `
  }

  const d = drawer?.data
  const phone = d ? reservaPhone(d) : ''

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

      {/* Corte de caja del día */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
        <CajaCard label="Reservas" value={caja.count} />
        <CajaCard label="Cobrado" value={`$${caja.cobrado.toLocaleString()}`} lime />
        <CajaCard label="Pendiente" value={`$${caja.pendiente.toLocaleString()}`} />
        <CajaCard label="Total del día" value={`$${caja.total.toLocaleString()}`} />
      </div>

      {/* Lista de espera del día (solo horarios que no han pasado) */}
      {waitlistFuture.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 14, borderColor: 'rgba(244,211,94,0.4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#F4D35E', marginBottom: 8 }}>⏳ Lista de espera ({waitlistFuture.length})</div>
          {waitlistFuture.map(w => (
            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
              <span>{w.profiles?.full_name} · pidió {courts.find(c => c.id === w.court_id)?.name} · {hourOf(w.starts_at)}–{hourOf(w.ends_at)}</span>
              <span style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                <button className="btn-lime" style={{ width: 'auto', padding: '5px 12px', borderRadius: 999, fontSize: 11, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0 }}
                  onClick={() => asignarEspera(w)}>✓ Asignar</button>
                {w.profiles?.phone && (
                  <a href={waLink(w.profiles.phone, `Hola ${(w.profiles.full_name || '').split(' ')[0]}! 🎾 Se liberó el horario que esperabas en Quinta Padel Center (${hourOf(w.starts_at)}). ¿Lo quieres?`)}
                    target="_blank" rel="noreferrer" style={{ color: '#25D366', textDecoration: 'none', fontWeight: 700 }}>WhatsApp</a>
                )}
                <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => quitarEspera(w.id)}>✕</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="cal-legend">
        <span><span className="dot" style={{ background: '#7CB518' }} />Pagada</span>
        <span><span className="dot" style={{ background: 'rgba(124,181,24,0.14)', border: '1.5px solid #7CB518' }} />Confirmada (falta pago)</span>
        <span><span className="dot" style={{ background: 'rgba(244,211,94,0.16)', border: '1.5px solid #F4D35E' }} />Por confirmar</span>
        <span><span className="dot" style={{ background: 'rgba(226,87,76,0.14)', border: '1.5px dashed #E2574C' }} />Bloqueo</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${courts.length}, minmax(110px, 1fr))`, gap: 6, minWidth: courts.length * 120 + 70 }}>
          <div />
          {courts.map(c => (
            <div key={c.id} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, padding: 8 }}>{c.name}</div>
          ))}
          {HOURS.map(h => (
            <FragmentRow key={h} hour={h} courts={courts} past={isPastSlot(h)} cellReservation={cellReservation} openNew={openNew} openEdit={openEdit} />
          ))}
        </div>
      </div>

      {drawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 55 }} onClick={() => setDrawer(null)} />
          <div className="drawer">
            <div className="h-section" style={{ marginBottom: 16 }}>{drawer.mode === 'new' ? 'Nueva reserva' : 'Editar reserva'}</div>

            <div className="field-label">Socio registrado</div>
            <select className="input" style={{ marginBottom: 14 }} value={d.member_id ?? ''}
              onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, member_id: e.target.value || null } }))}>
              <option value="">— Cliente externo (sin cuenta) —</option>
              {socios.map(s => (
                <option key={s.id} value={s.id}>{s.full_name || '(sin nombre)'}{s.phone ? ` · ${s.phone}` : ''}</option>
              ))}
            </select>

            {!d.member_id && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div className="field-label">Nombre del cliente</div>
                  <input className="input" placeholder="Juan Pérez" value={d.customer_name ?? ''}
                    onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, customer_name: e.target.value } }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="field-label">Teléfono (WhatsApp)</div>
                  <input className="input" type="tel" placeholder="10 dígitos" value={d.customer_phone ?? ''}
                    onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, customer_phone: e.target.value } }))} />
                </div>
              </div>
            )}

            <div className="field-label">Cancha</div>
            <select className="input" style={{ marginBottom: 14 }} value={d.court_id}
              onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, court_id: Number(e.target.value) } }))}>
              {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div className="field-label">Inicio</div>
                <input className="input" type="time" step="300" value={d.startTime}
                  onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, startTime: e.target.value } }))} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="field-label">Fin</div>
                <input className="input" type="time" step="300" value={d.endTime}
                  onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, endTime: e.target.value } }))} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="field-label">Precio ($)</div>
                <input className="input" type="number" min="0" placeholder="0" value={d.price}
                  onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, price: e.target.value } }))} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: -8, marginBottom: 14 }}>Fecha: {day} · puedes poner cualquier duración</div>

            {drawer.mode === 'new' && (
              <>
                <div className="field-label">Repetir cada semana</div>
                <select className="input" style={{ marginBottom: 14 }} value={d.repeatWeeks}
                  onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, repeatWeeks: Number(e.target.value) } }))}>
                  <option value={0}>No repetir</option>
                  {[4, 8, 12].map(w => <option key={w} value={w}>Sí, por {w} semanas</option>)}
                </select>
              </>
            )}

            <div className="field-label">Estado</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[['confirmed', 'Confirmada', '#7CB518'], ['pending', 'Pendiente', '#F4D35E'], ['blocked', 'Bloqueo', '#E2574C']].map(([v, l, color]) => (
                <Toggle key={v} active={d.status === v} label={l} color={color}
                  onClick={() => setDrawer(dr => ({ ...dr, data: { ...dr.data, status: v } }))} />
              ))}
            </div>

            <div className="field-label">Estado de pago</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <Toggle active={d.is_paid} label="Pagado" onClick={() => setDrawer(dr => ({ ...dr, data: { ...dr.data, is_paid: true } }))} />
              <Toggle active={!d.is_paid} label="Pendiente" onClick={() => setDrawer(dr => ({ ...dr, data: { ...dr.data, is_paid: false } }))} />
            </div>

            {drawer.mode === 'edit' && (
              <div style={{ marginBottom: 18 }}>
                <Toggle active={!!d.no_show} label={d.no_show ? '⚠ Marcado: no llegó' : 'Marcar: no llegó'}
                  onClick={() => setDrawer(dr => ({ ...dr, data: { ...dr.data, no_show: !dr.data.no_show } }))} />
              </div>
            )}

            {/* Confirmación por WhatsApp */}
            {phone && (
              <div style={{ background: 'var(--surf2)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <div className="field-label" style={{ marginBottom: 6 }}>Confirmación por WhatsApp a {reservaNombre(d).split(' ')[0]}</div>
                <textarea className="input" rows={3} style={{ resize: 'vertical', marginBottom: 8 }}
                  value={waText || confirmMsg(d)} onChange={e => setWaText(e.target.value)} />
                <a href={waLink(phone, waText || confirmMsg(d))} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}>
                  📲 Enviar confirmación
                </a>
              </div>
            )}

            {/* Avisos a la reserva (solo al editar) */}
            {drawer.mode === 'edit' && (
              <div style={{ marginBottom: 16 }}>
                <div className="field-label">Avisar al cliente</div>
                <textarea className="input" rows={2} style={{ resize: 'vertical', marginBottom: 8 }}
                  placeholder="Ej. Tu cancha se recorre a las 8:15 por mantenimiento"
                  value={avisoText} onChange={e => setAvisoText(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {d.member_id && (
                    <button type="button" className="btn-lime" style={{ width: 'auto', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0 }}
                      onClick={enviarAviso} disabled={!avisoText.trim()}>Enviar a su app</button>
                  )}
                  {phone && (
                    <a href={waLink(phone, avisoWa(d))} target="_blank" rel="noreferrer"
                      style={{ background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}>
                      📲 Por WhatsApp
                    </a>
                  )}
                </div>
                {resMsgs.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    {resMsgs.map(m => (
                      <div key={m.id} style={{ fontSize: 11, color: 'var(--muted)', borderLeft: '2px solid var(--lime)', paddingLeft: 8, marginBottom: 6 }}>📣 {m.body}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="field-label">Notas internas (solo admin)</div>
            <textarea className="input" rows={2} style={{ marginBottom: 18, resize: 'vertical' }}
              placeholder="Ej. pagó con transferencia, trae invitado…"
              value={d.notes ?? ''}
              onChange={e => setDrawer(dr => ({ ...dr, data: { ...dr.data, notes: e.target.value } }))} />

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

function FragmentRow({ hour, courts, past, cellReservation, openNew, openEdit }) {
  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--muted)', padding: '10px 4px', textAlign: 'right' }}>{hour}</div>
      {courts.map(c => {
        const r = cellReservation(c.id, hour)
        if (!r) return (
          <div key={c.id} className="cal-cell" onClick={() => openNew(c.id, hour)}
            style={past ? { opacity: 0.4, cursor: 'default', background: '#0d0f0b' } : undefined} />
        )
        const cls = r.status === 'blocked' ? 'blocked'
          : r.is_paid ? 'paid'
            : r.status === 'pending' ? 'pend-confirm'
              : 'confirm-unpaid'
        const name = r.customer_name || r.profiles?.full_name || 'Reserva'
        return (
          <div key={c.id} className={`cal-cell ${cls}`} onClick={() => openEdit(r)}
            title={name + (r.notes ? `\n📝 ${r.notes}` : '')} style={{ position: 'relative', opacity: r.no_show ? 0.5 : 1 }}>
            {r.notes && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 9 }}>📝</span>}
            {r.recurrence_group && <span style={{ position: 'absolute', top: 2, left: 4, fontSize: 9 }}>🔁</span>}
            {r.status === 'blocked' ? 'Bloqueado' : (r.no_show ? '❌ ' : '') + name.split(' ')[0]}
            <div style={{ fontSize: 9, opacity: 0.85 }}>{r.status === 'blocked' ? '' : r.status === 'pending' ? 'Por confirmar' : r.is_paid ? `Pagada${r.price ? ` $${Number(r.price).toLocaleString()}` : ''}` : 'Falta pago'}</div>
          </div>
        )
      })}
    </>
  )
}

function CajaCard({ label, value, lime }) {
  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div className="oswald" style={{ fontSize: 20, fontWeight: 700, color: lime ? 'var(--lime)' : 'var(--white)' }}>{value}</div>
    </div>
  )
}

function Toggle({ active, label, onClick, color }) {
  const c = color || '#D7F23C'
  return (
    <div onClick={onClick} style={{
      cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 8,
      background: active ? c : 'transparent',
      border: `1px solid ${active ? c : 'rgba(255,255,255,0.15)'}`,
      color: active ? '#101110' : 'var(--muted)',
    }}>{label}</div>
  )
}

function hourOf(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + mins
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
function firstFutureSlot(hours) {
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return hours.find(h => h > hhmm) || hours[0] || '08:00'
}
function msgError(error) {
  if (error.message.includes('no_overlap')) return 'Ya hay una reserva en esa cancha y horario.'
  return 'No se pudo guardar: ' + error.message
}
