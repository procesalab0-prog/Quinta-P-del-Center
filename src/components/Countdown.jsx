import { useEffect, useState } from 'react'

// Cuenta regresiva en vivo hacia una fecha objetivo (ISO).
// variant: 'evento' (torneo) o 'promo' (aviso). Muestra un texto de cierre distinto.
export default function Countdown({ target, variant = 'evento', compact = false }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!target) return null
  const diff = new Date(target).getTime() - now

  if (diff <= 0) {
    const txt = variant === 'promo' ? 'Promo finalizada' : 'Evento en curso o finalizado'
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999 }}>
        {txt}
      </div>
    )
  }

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  const label = variant === 'promo' ? 'Termina en' : 'Faltan'

  if (compact) {
    const short = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(215,242,60,0.14)', color: 'var(--lime)', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999 }}>
        ⏳ {label} {short}
      </div>
    )
  }

  const cells = [
    { v: d, l: 'días' },
    { v: h, l: 'hrs' },
    { v: m, l: 'min' },
    { v: s, l: 'seg' },
  ]
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {cells.map(c => (
          <div key={c.l} style={{ background: 'var(--surf2)', border: '1px solid rgba(215,242,60,0.25)', borderRadius: 10, padding: '8px 0', minWidth: 52, textAlign: 'center' }}>
            <div className="oswald" style={{ fontSize: 22, fontWeight: 700, color: 'var(--lime)', lineHeight: 1 }}>{String(c.v).padStart(2, '0')}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>{c.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
