import Countdown from '../components/Countdown.jsx'
import { MONTH_SHORT, timeAgo } from '../lib/util'

// Detalle de un torneo o aviso, abierto al tocar la tarjeta.
// La imagen se muestra COMPLETA (object-fit: contain) sin recortarse.
export default function EventoModal({ item, kind, registration, onClose, onRegister }) {
  if (!item) return null
  const isTorneo = kind === 'torneo'
  const img = isTorneo ? item.poster_url : item.image_url
  const fecha = isTorneo ? item.starts_at : null

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 70 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, maxHeight: '92dvh', overflowY: 'auto', background: 'var(--bg0)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(215,242,60,0.3)' }}>

        {/* Barra superior */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--bg0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line-soft)', zIndex: 2 }}>
          <div className="h-section" style={{ fontSize: 15 }}>{isTorneo ? 'Torneo' : 'Aviso'}</div>
          <div onClick={onClose} style={{ color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</div>
        </div>

        <div style={{ padding: 18 }}>
          {/* Imagen completa, sin recorte */}
          {img && (
            <div style={{ width: '100%', background: '#000', borderRadius: 14, overflow: 'hidden', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <img src={img} alt={item.title} style={{ width: '100%', maxHeight: '52dvh', objectFit: 'contain', display: 'block' }} />
            </div>
          )}

          <div className="oswald" style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.1, marginBottom: 10 }}>{item.title}</div>

          {/* Cuenta regresiva */}
          {isTorneo && (
            <div style={{ marginBottom: 16 }}>
              <Countdown target={fecha} variant="evento" />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                {fechaLarga(item.starts_at)}
              </div>
            </div>
          )}
          {!isTorneo && item.expires_at && (
            <div style={{ marginBottom: 16 }}>
              <Countdown target={item.expires_at} variant="promo" />
            </div>
          )}

          {/* Cuerpo */}
          {isTorneo ? (
            <>
              {item.categories?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {item.categories.map(c => <div key={c} className="chip-cat">{c}</div>)}
                </div>
              )}
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>
                {item.fee > 0 ? `Inscripción: $${Number(item.fee).toLocaleString()} por pareja` : 'Entrada libre'}
                {item.capacity ? ` · Cupo: ${item.capacity} parejas` : ''}
              </div>
              {registration ? (
                <div className="ok-note">✓ Ya estás inscrito{registration.is_paid ? ' · pago confirmado' : ' · pago pendiente'}</div>
              ) : item.registration_open ? (
                <button className="btn-lime" onClick={() => onRegister(item)}>Inscribirme</button>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center' }}>Inscripciones cerradas</div>
              )}
            </>
          ) : (
            <>
              {item.body && <div style={{ fontSize: 14, color: 'var(--white)', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{item.body}</div>}
              <div style={{ fontSize: 11, color: 'var(--faint)' }}>{timeAgo(item.created_at)}</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function fechaLarga(iso) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} de ${MONTH_SHORT[d.getMonth()].charAt(0) + MONTH_SHORT[d.getMonth()].slice(1).toLowerCase()} · ${hh}:${mm} h`
}
