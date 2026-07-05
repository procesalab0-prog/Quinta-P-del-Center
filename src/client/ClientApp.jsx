import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import Welcome from './Welcome.jsx'
import Inicio from './Inicio.jsx'
import Tarjeta from './Tarjeta.jsx'
import Torneos from './Torneos.jsx'
import Reservas from './Reservas.jsx'
import Perfil from './Perfil.jsx'
import { IconHome, IconCard, IconCalendar, IconTrophy, IconUser } from '../components/Icons.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'

const TABS = [
  { id: 'inicio', label: 'Inicio', Icon: IconHome },
  { id: 'tarjeta', label: 'Tarjeta', Icon: IconCard },
  { id: 'reservas', label: 'Reservas', Icon: IconCalendar },
  { id: 'torneos', label: 'Torneos', Icon: IconTrophy },
  { id: 'perfil', label: 'Perfil', Icon: IconUser },
]

export default function ClientApp() {
  const { session } = useAuth()
  const [screen, setScreen] = useState('inicio')
  const [openEvent, setOpenEvent] = useState(null) // {kind, id} para abrir detalle desde Inicio

  // Desde Inicio: ir a Torneos y abrir directo el torneo/aviso tocado
  const openDetail = (kind, id) => { setOpenEvent({ kind, id }); setScreen('torneos') }

  if (session === undefined) {
    return <div className="phone" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <img src="/assets/logo-mark-black.jpeg" alt="" style={{ width: 72, height: 72, borderRadius: '50%', opacity: 0.6 }} />
    </div>
  }

  if (!session) return <Welcome />

  return (
    <div className="phone">
      <div className="phone-scroll">
        <ErrorBoundary resetKey={screen}>
          {screen === 'inicio' && <Inicio goTo={setScreen} openDetail={openDetail} />}
          {screen === 'tarjeta' && <Tarjeta />}
          {screen === 'reservas' && <Reservas />}
          {screen === 'torneos' && <Torneos openEvent={openEvent} onConsumeOpen={() => setOpenEvent(null)} />}
          {screen === 'perfil' && <Perfil />}
        </ErrorBoundary>
      </div>
      <nav className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`tab-item ${screen === id ? 'active' : ''}`} onClick={() => setScreen(id)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
