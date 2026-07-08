import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Countdown from '../components/Countdown.jsx'
import { MONTH_SHORT, timeAgo } from '../lib/util'
import { MATCH_EMBED, pairName, matchInvolves, opponentName, fmtMatchTime, nextMatchFor } from '../lib/torneo'

// Detalle de un torneo o aviso, abierto al tocar la tarjeta.
// La imagen se muestra COMPLETA (object-fit: contain) sin recortarse.
export default function EventoModal({ item, kind, registration, onClose, onRegister }) {
  const isTorneo = kind === 'torneo'
  const [matches, setMatches] = useState([])
  const [messages, setMessages] = useState([])

  async function loadTorneoExtra() {
    if (!isTorneo || !item) return
    const [m, ms] = await Promise.all([
      supabase.from('tournament_matches').select(MATCH_EMBED).eq('tournament_id', item.id).order('starts_at', { nullsFirst: false }),
      supabase.from('tournament_messages').select('*').eq('tournament_id', item.id).order('created_at', { ascending: false }).limit(10),
    ])
    setMatches(m.data ?? [])
    setMessages(ms.data ?? [])
  }
  useEffect(() => { loadTorneoExtra() }, [item?.id])

  // Resultados y mensajes en vivo mientras el detalle está abierto
  useEffect(() => {
    if (!isTorneo || !item) return
    const ch = supabase.channel(`torneo-${item.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${item.id}` }, loadTorneoExtra)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_messages', filter: `tournament_id=eq.${item.id}` }, loadTorneoExtra)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [item?.id])

  if (!item) return null
  const img = isTorneo ? item.poster_url : item.image_url
  const fecha = isTorneo ? item.starts_at : null
  const miProximo = registration ? nextMatchFor(matches, registration.id) : null

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 70,
        overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, margin: '8dvh auto 0', background: 'var(--bg0)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(215,242,60,0.3)' }}>

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

              {/* Mensajes del torneo */}
              {messages.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="h-section" style={{ fontSize: 14, marginBottom: 10 }}>Mensajes del club</div>
                  {messages.map(ms => (
                    <div key={ms.id} style={{ background: 'rgba(215,242,60,0.08)', border: '1px solid rgba(215,242,60,0.25)', borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ fontSize: 13 }}>📣 {ms.body}</div>
                      <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{timeAgo(ms.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mi próximo partido */}
              {miProximo && (
                <div style={{ marginTop: 20, background: 'linear-gradient(135deg, rgba(215,242,60,0.16), rgba(215,242,60,0.04))', border: '1px solid rgba(215,242,60,0.45)', borderRadius: 16, padding: 16 }}>
                  <div className="h-section" style={{ fontSize: 14, marginBottom: 10 }}>🎾 Tu próximo partido</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <span className="chip-cat">{miProximo.round}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtMatchTime(miProximo.starts_at)}{miProximo.courts?.name ? ` · ${miProximo.courts.name}` : ''}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>vs {opponentName(miProximo, registration.id)}</div>
                  <Countdown target={miProximo.starts_at} variant="evento" compact />
                </div>
              )}

              {/* Rol de juego completo */}
              {matches.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="h-section" style={{ fontSize: 14, marginBottom: 10 }}>Rol de juego</div>
                  {matches.filter(m => m.status !== 'cancelled').map(m => {
                    const mio = registration && matchInvolves(m, registration.id)
                    return (
                      <div key={m.id} style={{
                        background: mio ? 'rgba(215,242,60,0.1)' : 'var(--surf)',
                        border: mio ? '1px solid rgba(215,242,60,0.45)' : '1px solid var(--line)',
                        borderRadius: 12, padding: '10px 12px', marginBottom: 8,
                      }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                          <span className="chip-cat" style={{ fontSize: 10 }}>{m.round}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtMatchTime(m.starts_at)}{m.courts?.name ? ` · ${m.courts.name}` : ''}</span>
                          {m.status === 'playing' && <span style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 700 }}>● EN JUEGO</span>}
                          {mio && <span style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 700 }}>TU PARTIDO</span>}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          <span style={{ color: m.winner === 1 ? 'var(--lime)' : 'var(--white)' }}>{m.winner === 1 ? '🏆 ' : ''}{pairName(m.pair1, m.pair1_label)}</span>
                          <span style={{ color: 'var(--faint)', margin: '0 7px', fontWeight: 400 }}>vs</span>
                          <span style={{ color: m.winner === 2 ? 'var(--lime)' : 'var(--white)' }}>{m.winner === 2 ? '🏆 ' : ''}{pairName(m.pair2, m.pair2_label)}</span>
                          {m.score && <span style={{ color: 'var(--muted)', fontWeight: 500, marginLeft: 8, fontSize: 12 }}>{m.score}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
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
