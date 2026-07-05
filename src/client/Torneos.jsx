import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { timeAgo } from '../lib/util'
import { DateBadge } from './Inicio.jsx'

export default function Torneos() {
  const { session } = useAuth()
  const [tab, setTab] = useState('torneos')
  const [tournaments, setTournaments] = useState([])
  const [avisos, setAvisos] = useState([])
  const [regs, setRegs] = useState({}) // tournament_id -> registration
  const [signup, setSignup] = useState(null) // torneo abierto en el formulario
  const [partner, setPartner] = useState('')
  const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [t, a, r] = await Promise.all([
      supabase.from('tournaments').select('*').eq('is_published', true).order('starts_at'),
      supabase.from('announcements').select('*').eq('is_published', true)
        .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('tournament_registrations').select('*').eq('member_id', session.user.id),
    ])
    setTournaments(t.data ?? [])
    setAvisos(a.data ?? [])
    setRegs(Object.fromEntries((r.data ?? []).map(x => [x.tournament_id, x])))
  }
  useEffect(() => { load() }, [])

  async function inscribir(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('tournament_registrations').insert({
      tournament_id: signup.id, member_id: session.user.id,
      partner_name: partner.trim() || null, category: cat || null,
    })
    setBusy(false)
    if (!error) { setSignup(null); setPartner(''); setCat(''); load() }
    else alert('No se pudo inscribir: ' + error.message)
  }

  return (
    <div style={{ animation: 'qpc-fadein 0.25s ease' }}>
      <div className="h-page" style={{ marginBottom: 14 }}>Torneos y avisos</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`tab-btn ${tab === 'torneos' ? 'active' : ''}`} onClick={() => setTab('torneos')}>Torneos</button>
        <button className={`tab-btn ${tab === 'avisos' ? 'active' : ''}`} onClick={() => setTab('avisos')}>Avisos</button>
      </div>

      {tab === 'torneos' && (
        <>
          {tournaments.length === 0 && <Empty text="Aún no hay torneos publicados — pronto habrá novedades 🏆" />}
          {tournaments.map(t => {
            const reg = regs[t.id]
            return (
              <div key={t.id} className="card" style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: 96, position: 'relative', background: 'var(--surf2)' }}>
                  {t.poster_url
                    ? <img src={t.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src="/uploads/IMG_5194.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />}
                  <DateBadge iso={t.starts_at} />
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{t.title}</div>
                  {t.categories?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      {t.categories.map(c => <div key={c} className="chip-cat">{c}</div>)}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {t.fee > 0 ? `$${Number(t.fee).toLocaleString()} por pareja` : 'Entrada libre'}
                      {t.capacity ? ` · cupo ${t.capacity}` : ''}
                    </div>
                    {reg ? (
                      <div className="chip-cat" style={{ padding: '8px 14px' }}>✓ Inscrito{reg.is_paid ? ' · pagado' : ''}</div>
                    ) : t.registration_open ? (
                      <button className="btn-lime" style={{ width: 'auto', padding: '8px 16px', fontSize: 12, borderRadius: 8, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0 }}
                        onClick={() => { setSignup(t); setCat(t.categories?.[0] ?? '') }}>Inscribirme</button>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--faint)' }}>Inscripciones cerradas</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {tab === 'avisos' && (
        <>
          {avisos.length === 0 && <Empty text="Sin avisos por ahora." />}
          {avisos.map(a => (
            <div key={a.id} className="card" style={{ padding: 14, marginBottom: 12, display: 'flex', gap: 12 }}>
              {a.image_url
                ? <img src={a.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📣</div>}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.title}</div>
                {a.body && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 6 }}>{a.body}</div>}
                <div style={{ fontSize: 10, color: 'var(--faint)' }}>{timeAgo(a.created_at)}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Formulario de inscripción */}
      {signup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={() => setSignup(null)}>
          <form onSubmit={inscribir} onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 430, background: 'var(--surf)', borderRadius: '20px 20px 0 0', padding: 22, borderTop: '1px solid rgba(215,242,60,0.3)' }}>
            <div className="h-section" style={{ marginBottom: 4 }}>Inscripción</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{signup.title}</div>
            {signup.categories?.length > 0 && (
              <>
                <div className="field-label">Categoría</div>
                <select className="input" value={cat} onChange={e => setCat(e.target.value)} style={{ marginBottom: 12 }}>
                  {signup.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </>
            )}
            <div className="field-label">Nombre de tu pareja (opcional)</div>
            <input className="input" value={partner} onChange={e => setPartner(e.target.value)} placeholder="Ej. Ana López" style={{ marginBottom: 18 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-lime" disabled={busy} style={{ flex: 1 }}>{busy ? '…' : 'Confirmar'}</button>
              <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setSignup(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ color: 'var(--faint)', fontSize: 13, textAlign: 'center', padding: '26px 0' }}>{text}</div>
}
