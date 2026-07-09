import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Config({ isAdmin }) {
  const [settings, setSettings] = useState(null)
  const [rewards, setRewards] = useState([])
  const [saved, setSaved] = useState(false)
  const [newReward, setNewReward] = useState({ name: '', stamps_required: 10 })

  async function load() {
    const [s, r] = await Promise.all([
      supabase.from('loyalty_settings').select('*').eq('id', 1).single(),
      supabase.from('rewards').select('*').order('stamps_required'),
    ])
    setSettings(s.data)
    setRewards(r.data ?? [])
  }
  useEffect(() => { load() }, [])

  const [saveError, setSaveError] = useState('')

  async function saveSettings(e) {
    e.preventDefault()
    setSaveError('')
    const open = Number(settings.open_hour)
    const close = Number(settings.close_hour)
    const slot = Number(settings.reservation_slot_minutes)
    if (close <= open) { setSaveError('La hora de cierre debe ser mayor que la de apertura.'); return }
    if (slot < 15 || slot > 240) { setSaveError('La duración debe estar entre 15 y 240 minutos.'); return }
    const { error } = await supabase.from('loyalty_settings').update({
      stamps_per_reward: Number(settings.stamps_per_reward),
      duplicate_window_minutes: Number(settings.duplicate_window_minutes),
      silver_visits: Number(settings.silver_visits),
      gold_visits: Number(settings.gold_visits),
      open_hour: open,
      close_hour: close,
      reservation_slot_minutes: slot,
      court_price: settings.court_price !== '' && settings.court_price != null ? Number(settings.court_price) : 0,
    }).eq('id', 1)
    if (error) { setSaveError('No se pudo guardar: ' + error.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function addReward(e) {
    e.preventDefault()
    if (!newReward.name.trim()) return
    await supabase.from('rewards').insert({ name: newReward.name.trim(), stamps_required: Number(newReward.stamps_required) })
    setNewReward({ name: '', stamps_required: settings?.stamps_per_reward ?? 10 })
    load()
  }

  async function toggleReward(r) {
    await supabase.from('rewards').update({ is_active: !r.is_active }).eq('id', r.id)
    load()
  }

  if (!settings) return <div style={{ color: 'var(--faint)' }}>Cargando…</div>

  return (
    <div>
      <div className="h-page" style={{ fontSize: 22, marginBottom: 18 }}>Configuración</div>

      {!isAdmin && <div className="error-note" style={{ marginBottom: 16 }}>Solo el administrador puede modificar la configuración.</div>}

      <form onSubmit={saveSettings} className="card" style={{ maxWidth: 460, overflow: 'hidden', marginBottom: 22 }}>
        <Row label="Nombre del club"><div style={{ fontSize: 14 }}>Quinta Padel Center</div></Row>
        <Row label="Hora de apertura (0–23)">
          <input className="input" type="number" min="0" max="23" style={{ width: 90 }} disabled={!isAdmin}
            value={settings.open_hour ?? 8}
            onChange={e => setSettings({ ...settings, open_hour: e.target.value })} />
        </Row>
        <Row label="Hora de cierre (1–24)">
          <input className="input" type="number" min="1" max="24" style={{ width: 90 }} disabled={!isAdmin}
            value={settings.close_hour ?? 23}
            onChange={e => setSettings({ ...settings, close_hour: e.target.value })} />
        </Row>
        <Row label="Duración de cada reserva (minutos)">
          <input className="input" type="number" min="15" max="240" step="15" style={{ width: 90 }} disabled={!isAdmin}
            value={settings.reservation_slot_minutes ?? 90}
            onChange={e => setSettings({ ...settings, reservation_slot_minutes: e.target.value })} />
        </Row>
        <Row label="Precio de cancha por defecto ($)">
          <input className="input" type="number" min="0" style={{ width: 90 }} disabled={!isAdmin}
            value={settings.court_price ?? 0}
            onChange={e => setSettings({ ...settings, court_price: e.target.value })} />
        </Row>
        <Row label="Sellos para completar la tarjeta">
          <input className="input" type="number" min="1" style={{ width: 90 }} disabled={!isAdmin}
            value={settings.stamps_per_reward}
            onChange={e => setSettings({ ...settings, stamps_per_reward: e.target.value })} />
        </Row>
        <Row label="Minutos mínimos entre sellos (anti-duplicado)">
          <input className="input" type="number" min="0" style={{ width: 90 }} disabled={!isAdmin}
            value={settings.duplicate_window_minutes}
            onChange={e => setSettings({ ...settings, duplicate_window_minutes: e.target.value })} />
        </Row>
        <Row label="Visitas para nivel Plata">
          <input className="input" type="number" min="1" style={{ width: 90 }} disabled={!isAdmin}
            value={settings.silver_visits}
            onChange={e => setSettings({ ...settings, silver_visits: e.target.value })} />
        </Row>
        <Row label="Visitas para nivel Oro" last>
          <input className="input" type="number" min="1" style={{ width: 90 }} disabled={!isAdmin}
            value={settings.gold_visits}
            onChange={e => setSettings({ ...settings, gold_visits: e.target.value })} />
        </Row>
        {isAdmin && (
          <div style={{ padding: 16 }}>
            {saved && <div className="ok-note" style={{ marginBottom: 10 }}>✓ Configuración guardada</div>}
            {saveError && <div className="error-note" style={{ marginBottom: 10 }}>{saveError}</div>}
            <button className="btn-lime" style={{ borderRadius: 9 }}>Guardar cambios</button>
          </div>
        )}
      </form>

      <div className="h-section" style={{ marginBottom: 12 }}>Premios del programa</div>
      <div className="card" style={{ maxWidth: 460, overflow: 'hidden', marginBottom: 14 }}>
        {rewards.map((r, i) => (
          <div key={r.id} style={{ padding: '13px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, opacity: r.is_active ? 1 : 0.45 }}>
            <div>
              <div style={{ fontSize: 14 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.stamps_required} sellos</div>
            </div>
            {isAdmin && (
              <button className="link-lime" onClick={() => toggleReward(r)}>{r.is_active ? 'Desactivar' : 'Activar'}</button>
            )}
          </div>
        ))}
        {rewards.length === 0 && <div style={{ padding: 16, color: 'var(--faint)', fontSize: 13 }}>No hay premios registrados.</div>}
      </div>

      {isAdmin && (
        <form onSubmit={addReward} style={{ maxWidth: 460, display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Nuevo premio (ej. 1 hora gratis)" value={newReward.name}
            onChange={e => setNewReward({ ...newReward, name: e.target.value })} />
          <input className="input" type="number" min="1" style={{ width: 80 }} title="Sellos requeridos" value={newReward.stamps_required}
            onChange={e => setNewReward({ ...newReward, stamps_required: e.target.value })} />
          <button className="btn-lime" style={{ width: 'auto', padding: '11px 16px', borderRadius: 9 }}>+</button>
        </form>
      )}
    </div>
  )
}

function Row({ label, children, last }) {
  return (
    <div style={{ padding: 16, borderBottom: last ? 'none' : '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      {children}
    </div>
  )
}
