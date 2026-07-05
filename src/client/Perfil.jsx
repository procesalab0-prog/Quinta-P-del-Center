import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { initials, LEVEL_LABEL, LEVEL_BG, fmtDateShort } from '../lib/util'

export default function Perfil() {
  const { session, profile, refreshProfile } = useAuth()
  const [view, setView] = useState('menu') // menu | historial | editar
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({ full_name: '', phone: '', play_category: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? '', phone: profile.phone ?? '', play_category: profile.play_category ?? '' })
  }, [profile])

  async function loadHistorial() {
    const [v, r] = await Promise.all([
      supabase.from('visits').select('created_at').eq('member_id', session.user.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('redemptions').select('created_at, rewards(name)').eq('member_id', session.user.id).order('created_at', { ascending: false }).limit(10),
    ])
    const items = [
      ...(v.data ?? []).map(x => ({ date: x.created_at, text: 'Visita registrada · +1 sello' })),
      ...(r.data ?? []).map(x => ({ date: x.created_at, text: `Premio canjeado · ${x.rewards?.name ?? ''}` })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
    setEvents(items)
  }

  async function guardar(e) {
    e.preventDefault()
    await supabase.from('profiles').update({
      full_name: form.full_name.trim(), phone: form.phone.trim(), play_category: form.play_category || null,
    }).eq('id', session.user.id)
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!profile) return null

  if (view === 'historial') {
    return (
      <div style={{ animation: 'qpc-fadein 0.25s ease' }}>
        <BackHead title="Historial" onBack={() => setView('menu')} />
        {events.length === 0 && <div style={{ color: 'var(--faint)', fontSize: 13, textAlign: 'center', padding: '26px 0' }}>Aún no tienes visitas — ¡ven a jugar! 🎾</div>}
        <div style={{ position: 'relative', paddingLeft: 18 }}>
          {events.length > 0 && <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'rgba(255,255,255,0.1)' }} />}
          {events.map((h, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: 22 }}>
              <div style={{ position: 'absolute', left: -18, top: 3, width: 12, height: 12, borderRadius: '50%', background: 'var(--lime)', border: '2px solid var(--bg0)' }} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3, letterSpacing: 0.5 }}>{fmtDateShort(h.date)}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{h.text}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'editar') {
    return (
      <div style={{ animation: 'qpc-fadein 0.25s ease' }}>
        <BackHead title="Editar datos" onBack={() => setView('menu')} />
        <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="field-label">Nombre completo</div>
            <input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <div className="field-label">Teléfono</div>
            <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <div className="field-label">Categoría de juego</div>
            <select className="input" value={form.play_category} onChange={e => setForm({ ...form, play_category: e.target.value })}>
              <option value="">Sin categoría</option>
              {['1ra', '2da', '3ra', '4ta', '5ta'].map(c => <option key={c} value={c}>{c} categoría</option>)}
            </select>
          </div>
          {saved && <div className="ok-note">✓ Datos guardados</div>}
          <button className="btn-lime">Guardar</button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ animation: 'qpc-fadein 0.25s ease' }}>
      <div className="h-page" style={{ marginBottom: 18 }}>Perfil</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
        <div className="avatar-circle" style={{ width: 76, height: 76, fontSize: 24, border: '2px solid var(--lime)', marginBottom: 10 }}>
          {initials(profile.full_name)}
        </div>
        <div style={{ fontWeight: 600, fontSize: 17 }}>{profile.full_name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          {profile.play_category ? `${profile.play_category} categoría · ` : ''}Socio desde {new Date(profile.created_at).getFullYear()}
        </div>
        <div className="level-badge" style={{ background: LEVEL_BG[profile.level], marginTop: 8 }}>Nivel {LEVEL_LABEL[profile.level]}</div>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <MenuRow label="Ver historial" onClick={() => { setView('historial'); loadHistorial() }} />
        <MenuRow label="Editar datos" onClick={() => setView('editar')} />
        <MenuRow label="Ayuda" onClick={() => alert('Para cualquier duda, pregunta en recepción del club 🎾')} last />
      </div>

      <button className="btn-danger-outline" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )
}

function MenuRow({ label, onClick, last }) {
  return (
    <div onClick={onClick} style={{
      padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--line-soft)',
      fontSize: 14, display: 'flex', justifyContent: 'space-between', cursor: 'pointer',
    }}>
      {label} <span style={{ color: 'var(--muted)' }}>›</span>
    </div>
  )
}

function BackHead({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div onClick={onBack} style={{
        width: 34, height: 34, borderRadius: '50%', background: 'var(--surf)', border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer',
      }}>←</div>
      <div className="h-page" style={{ fontSize: 20 }}>{title}</div>
    </div>
  )
}
