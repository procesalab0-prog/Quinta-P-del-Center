import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { MONTH_SHORT, timeAgo, DAY_SHORT } from '../lib/util'
import { MATCH_EMBED, opponentName, fmtMatchTime } from '../lib/torneo'
import Countdown from '../components/Countdown.jsx'

export default function Inicio({ goTo, openDetail }) {
  const { session } = useAuth()
  const [featured, setFeatured] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [courtCount, setCourtCount] = useState(null)
  const [miPartido, setMiPartido] = useState(null) // {match, regId}
  const [miReserva, setMiReserva] = useState(null) // próxima reserva

  useEffect(() => {
    supabase.from('tournaments').select('*').eq('is_published', true)
      .gte('starts_at', new Date().toISOString()).order('starts_at').limit(1)
      .then(({ data }) => setFeatured(data?.[0] ?? null))
    supabase.from('announcements').select('*').eq('is_published', true)
      .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setAvisos(data ?? []))
    supabase.from('courts').select('id', { count: 'exact', head: true }).eq('is_active', true)
      .then(({ count }) => setCourtCount(count))

    // Mi próximo partido de torneo (si estoy inscrito y ya hay rol de juego)
    async function loadMiPartido() {
      const { data: regs } = await supabase.from('tournament_registrations')
        .select('id').or(`member_id.eq.${session.user.id},partner_member_id.eq.${session.user.id}`)
      if (!regs?.length) return
      const ids = regs.map(r => r.id).join(',')
      const { data: m } = await supabase.from('tournament_matches')
        .select(`${MATCH_EMBED}, tournaments(id, title)`)
        .or(`pair1_reg_id.in.(${ids}),pair2_reg_id.in.(${ids})`)
        .in('status', ['scheduled', 'playing'])
        .gte('starts_at', new Date(Date.now() - 2 * 3600000).toISOString())
        .order('starts_at').limit(1)
      if (m?.[0]) {
        const regId = regs.find(r => r.id === m[0].pair1_reg_id || r.id === m[0].pair2_reg_id)?.id
        setMiPartido({ match: m[0], regId })
      }
    }
    loadMiPartido()

    // Mi próxima reserva (con sus avisos)
    supabase.from('reservations')
      .select('*, courts(name), reservation_messages(id, body, created_at)')
      .eq('member_id', session.user.id)
      .gte('ends_at', new Date().toISOString())
      .neq('status', 'cancelled')
      .order('starts_at').limit(1)
      .then(({ data }) => setMiReserva(data?.[0] ?? null))
  }, [])

  return (
    <div style={{ animation: 'qpc-fadein 0.25s ease' }}>
      <div style={{ position: 'relative', width: '100%', height: 200, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
        <img src="/uploads/IMG_5192.jpeg" alt="Quinta Padel Center" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,11,9,0.05) 40%, rgba(10,11,9,0.92))' }} />
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
          <div className="oswald" style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.1 }}>Quinta Padel Center</div>
          <div style={{ fontSize: 12, color: '#C9CDC4', marginTop: 4 }}>León, GTO. · Tu club de pádel</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 22 }}>
        <InfoChip emoji="🕒" label="Horario" value="8–23 h" />
        <InfoChip emoji="🎾" label="Canchas" value={courtCount ? `${courtCount} techadas` : '—'} />
        <InfoChip emoji="📍" label="Ubicación" value="León, GTO." />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="btn-lime" style={{ flex: 1, fontSize: 12.5, padding: '13px 6px' }} onClick={() => goTo('tarjeta')}>Ver mi tarjeta</button>
        <button className="btn-outline" style={{ flex: 1, fontSize: 12.5, padding: '13px 6px' }} onClick={() => goTo('reservas')}>Reservar cancha</button>
      </div>

      {/* Tu próxima reserva */}
      {miReserva && (() => {
        const s = new Date(miReserva.starts_at), e = new Date(miReserva.ends_at)
        const hhmm = (x) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
        const horas = (s - Date.now()) / 3600000
        const pronto = horas > 0 && horas <= 24
        const avisos = (miReserva.reservation_messages ?? [])
        return (
          <div onClick={() => goTo('reservas')}
            style={{ background: 'var(--surf)', border: `1px solid ${pronto ? 'rgba(244,211,94,0.5)' : 'var(--line)'}`, borderRadius: 16, padding: 16, marginBottom: 24, cursor: 'pointer' }}>
            <div className="h-section" style={{ fontSize: 14, marginBottom: 8 }}>📅 Tu próxima reserva</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{miReserva.courts?.name ?? 'Cancha'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              {DAY_SHORT[s.getDay()]} {s.getDate()} · {hhmm(s)}–{hhmm(e)}
              {miReserva.price ? ` · $${Number(miReserva.price).toLocaleString()}` : ''}
              {miReserva.is_paid ? ' · pagada' : ''}
            </div>
            {pronto && <div style={{ marginTop: 8, display: 'inline-block', background: 'rgba(244,211,94,0.14)', color: '#F4D35E', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>⏰ ¡Es pronto! {horas < 1 ? 'En menos de 1 h' : `En ~${Math.round(horas)} h`}</div>}
            {avisos.map(a => (
              <div key={a.id} style={{ marginTop: 8, background: 'rgba(215,242,60,0.08)', border: '1px solid rgba(215,242,60,0.25)', borderRadius: 10, padding: '8px 10px', fontSize: 12.5 }}>📣 {a.body}</div>
            ))}
          </div>
        )
      })()}

      {/* Tu próximo partido de torneo */}
      {miPartido && (
        <div onClick={() => openDetail('torneo', miPartido.match.tournaments?.id)}
          style={{ background: 'linear-gradient(135deg, rgba(215,242,60,0.16), rgba(215,242,60,0.04))', border: '1px solid rgba(215,242,60,0.45)', borderRadius: 16, padding: 16, marginBottom: 24, cursor: 'pointer', animation: 'qpc-fadein 0.3s ease' }}>
          <div className="h-section" style={{ fontSize: 14, marginBottom: 8 }}>🎾 Tu próximo partido</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            {miPartido.match.tournaments?.title} · {miPartido.match.round}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>vs {opponentName(miPartido.match, miPartido.regId)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            {fmtMatchTime(miPartido.match.starts_at)}{miPartido.match.courts?.name ? ` · ${miPartido.match.courts.name}` : ''}
          </div>
          <Countdown target={miPartido.match.starts_at} variant="evento" compact />
        </div>
      )}

      {featured && (
        <>
          <SectionHead title="Torneo destacado" onMore={() => goTo('torneos')} />
          <div className="card" style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24, cursor: 'pointer' }}
            onClick={() => openDetail('torneo', featured.id)}>
            <div style={{ height: 150, position: 'relative', background: '#000' }}>
              {featured.poster_url
                ? <img src={featured.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <img src="/uploads/IMG_5193.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />}
              <DateBadge iso={featured.starts_at} />
              <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
                <Countdown target={featured.starts_at} variant="evento" compact />
              </div>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{featured.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {featured.capacity ? `Cupo: ${featured.capacity} parejas` : 'Inscripciones abiertas'} · toca para ver
              </div>
            </div>
          </div>
        </>
      )}

      <SectionHead title="Avisos" onMore={() => goTo('torneos')} />
      {avisos.length === 0 && <div style={{ color: 'var(--faint)', fontSize: 13, textAlign: 'center', padding: '18px 0' }}>Sin avisos por ahora — ¡nos vemos en la cancha! 🎾</div>}
      {avisos.map(av => (
        <div key={av.id} className="card" style={{ padding: 14, marginBottom: 12, display: 'flex', gap: 12, cursor: 'pointer' }}
          onClick={() => openDetail('aviso', av.id)}>
          {av.image_url
            ? <img src={av.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📣</div>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{av.is_pinned ? '📌 ' : ''}{av.title}</div>
            {av.body && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{av.body}</div>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--faint)' }}>{timeAgo(av.created_at)}</div>
              {av.expires_at && new Date(av.expires_at) > new Date() && <Countdown target={av.expires_at} variant="promo" compact />}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoChip({ emoji, label, value }) {
  return (
    <div className="card" style={{ borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 15 }}>{emoji}</div>
      <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1 }}>{value}</div>
    </div>
  )
}

function SectionHead({ title, onMore }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <div className="h-section">{title}</div>
      <button className="link-lime" onClick={onMore}>Ver todos</button>
    </div>
  )
}

export function DateBadge({ iso }) {
  const d = new Date(iso)
  return (
    <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--white)', borderRadius: 8, padding: '4px 8px', textAlign: 'center', lineHeight: 1.1 }}>
      <div className="oswald" style={{ fontWeight: 700, fontSize: 16, color: '#101110' }}>{d.getDate()}</div>
      <div style={{ fontSize: 8, color: '#101110', letterSpacing: 0.5 }}>{MONTH_SHORT[d.getMonth()]}</div>
    </div>
  )
}
