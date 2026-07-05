import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import Escaner from './Escaner.jsx'
import ReservasAdmin from './ReservasAdmin.jsx'
import Socios from './Socios.jsx'
import TorneosAdmin from './TorneosAdmin.jsx'
import Dashboard from './Dashboard.jsx'
import Config from './Config.jsx'
import { IconScan, IconCalendarSm, IconUsers, IconTrophy, IconChart, IconGear } from '../components/Icons.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'

const NAV = [
  { id: 'scanner', label: 'Escáner', Icon: IconScan },
  { id: 'reservas', label: 'Reservas', Icon: IconCalendarSm },
  { id: 'socios', label: 'Socios', Icon: IconUsers },
  { id: 'torneos', label: 'Torneos y avisos', Icon: () => <IconTrophy size={18} /> },
  { id: 'dashboard', label: 'Dashboard', Icon: IconChart },
  { id: 'config', label: 'Configuración', Icon: IconGear },
]

export default function AdminApp() {
  const { session, profile } = useAuth()
  const [screen, setScreen] = useState('scanner')
  const [collapsed, setCollapsed] = useState(false)

  if (session === undefined || (session && !profile)) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--faint)' }}>Cargando…</div>
  }

  if (!session) return <StaffLogin />

  const isStaff = profile && ['staff', 'admin'].includes(profile.role)
  if (!isStaff) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20, textAlign: 'center' }}>
        <img src="/assets/logo-mark-black.jpeg" alt="" style={{ width: 60, height: 60, borderRadius: '50%' }} />
        <div style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 320 }}>
          Tu cuenta no tiene acceso al panel de administración. Si eres parte del staff, pide al administrador que te dé acceso.
        </div>
        <button className="btn-outline" style={{ width: 'auto' }} onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-side ${collapsed ? 'collapsed' : ''}`}>
        <div onClick={() => setCollapsed(c => !c)} style={{
          height: 64, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
        }}>
          <img src="/assets/logo-mark-black.jpeg" alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div className="side-brand-label oswald" style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>Quinta</div>
        </div>
        <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} className={`side-item ${screen === id ? 'active' : ''}`} onClick={() => setScreen(id)}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </div>
        <div className="side-logout" onClick={() => supabase.auth.signOut()}
          style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
          Cerrar sesión
        </div>
      </aside>

      <main className="admin-main">
        <ErrorBoundary resetKey={screen}>
          {screen === 'scanner' && <Escaner />}
          {screen === 'reservas' && <ReservasAdmin />}
          {screen === 'socios' && <Socios />}
          {screen === 'torneos' && <TorneosAdmin />}
          {screen === 'dashboard' && <Dashboard />}
          {screen === 'config' && <Config isAdmin={profile.role === 'admin'} />}
        </ErrorBoundary>
      </main>
    </div>
  )
}

function StaffLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError('Credenciales incorrectas.')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg0)', padding: 20 }}>
      <img src="/assets/logo-mark-black.jpeg" alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(215,242,60,0.4)', marginBottom: 18 }} />
      <div className="oswald" style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Acceso de staff</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 28 }}>Quinta Padel Center · Panel de administración</div>
      <form onSubmit={submit} style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input className="input" placeholder="Correo" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" placeholder="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div className="error-note">{error}</div>}
        <button className="btn-lime" style={{ marginTop: 6, borderRadius: 9 }} disabled={busy}>{busy ? '…' : 'Ingresar'}</button>
      </form>
    </div>
  )
}
