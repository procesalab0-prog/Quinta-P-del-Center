import { useRef, useState } from 'react'
import { APP_VERSION, CREATOR } from '../lib/version'

// Hook: detecta N toques rápidos seguidos (easter egg).
export function useTapEgg(threshold = 6, windowMs = 1600) {
  const [open, setOpen] = useState(false)
  const taps = useRef(0)
  const timer = useRef(null)
  const onTap = () => {
    taps.current += 1
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { taps.current = 0 }, windowMs)
    if (taps.current >= threshold) { taps.current = 0; setOpen(true) }
  }
  return { onTap, open, close: () => setOpen(false) }
}

// Tarjeta que aparece con la versión y el crédito del creador.
export function EasterEggModal({ open, onClose }) {
  if (!open) return null
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 320, background: 'linear-gradient(160deg,#181A15,#0A0B09)', border: '1px solid rgba(215,242,60,0.4)', borderRadius: 22, padding: '30px 24px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', animation: 'qpc-pop 0.4s ease' }}>
        <img src="/assets/logo-mark-black.jpeg" alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(215,242,60,0.5)', marginBottom: 14 }} />
        <div className="oswald" style={{ fontWeight: 700, fontSize: 20, color: '#F5F6F1', lineHeight: 1.1 }}>Quinta Padel Center</div>
        <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(215,242,60,0.14)', color: '#D7F23C', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: 1, padding: '6px 16px', borderRadius: 999 }}>
          {APP_VERSION}
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: '#8C9086' }}>Creado por</div>
        <div className="oswald" style={{ fontWeight: 700, fontSize: 22, color: '#F5F6F1', letterSpacing: 0.5, marginTop: 2 }}>{CREATOR}</div>
        <div style={{ fontSize: 22, marginTop: 14, letterSpacing: 6 }}>🎾</div>
        <div onClick={onClose} style={{ marginTop: 18, fontSize: 12, color: '#676B60', cursor: 'pointer' }}>Toca para cerrar</div>
      </div>
    </div>
  )
}
