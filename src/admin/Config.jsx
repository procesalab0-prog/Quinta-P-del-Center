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

  async function saveSettings(e) {
    e.preventDefault()
    const { error } = await supabase.from('loyalty_settings').update({
      stamps_per_reward: Number(settings.stamps_per_reward),
      duplicate_window_minutes: Number(settings.duplicate_window_minutes),
      silver_visits: Number(settings.silver_visits),
      gold_visits: Number(settings.gold_visits),
    }).eq('id', 1)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
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
        <Row label="Horario de atención"><div style={{ fontSize: 14 }}>Lunes a domingo · 08:00 – 23:00</div></Row>
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
