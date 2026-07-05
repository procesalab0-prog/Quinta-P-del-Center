import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MONTH_SHORT, timeAgo } from '../lib/util'
import Countdown from '../components/Countdown.jsx'

export default function Inicio({ goTo, openDetail }) {
  const [featured, setFeatured] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [courtCount, setCourtCount] = useState(null)

  useEffect(() => {
    supabase.from('tournaments').select('*').eq('is_published', true)
      .gte('starts_at', new Date().toISOString()).order('starts_at').limit(1)
      .then(({ data }) => setFeatured(data?.[0] ?? null))
    supabase.from('announcements').select('*').eq('is_published', true)
      .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setAvisos(data ?? []))
    supabase.from('courts').select('id', { count: 'exact', head: true }).eq('is_active', true)
      .then(({ count }) => setCourtCount(count))
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
