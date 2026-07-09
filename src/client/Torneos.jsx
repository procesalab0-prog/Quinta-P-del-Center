import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { timeAgo } from '../lib/util'
import { DateBadge } from './Inicio.jsx'
import Countdown from '../components/Countdown.jsx'
import EventoModal from './EventoModal.jsx'

export default function Torneos({ openEvent, onConsumeOpen }) {
  const { session } = useAuth()
  const [tab, setTab] = useState('torneos')
  const [tournaments, setTournaments] = useState([])
  const [avisos, setAvisos] = useState([])
  const [regs, setRegs] = useState({}) // tournament_id -> registration
  const [detail, setDetail] = useState(null) // { item, kind }
  const [signup, setSignup] = useState(null) // torneo abierto en el formulario
  const [partner, setPartner] = useState('')       // nombre libre
  const [partnerMode, setPartnerMode] = useState('cuenta') // 'cuenta' | 'libre'
  const [partnerMemberId, setPartnerMemberId] = useState('')
  const [partnerSearch, setPartnerSearch] = useState('')
  const [partnerResults, setPartnerResults] = useState([])
  const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false)

  const uid = session.user.id

  async function load() {
    const [t, a, r] = await Promise.all([
      supabase.from('tournaments').select('*').eq('is_published', true).order('starts_at'),
      supabase.from('announcements').select('*').eq('is_published', true)
        .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      // Mis inscripciones: como titular O como pareja ligada
      supabase.from('tournament_registrations').select('*').or(`member_id.eq.${uid},partner_member_id.eq.${uid}`),
    ])
    setTournaments(t.data ?? [])
    setAvisos(a.data ?? [])
    setRegs(Object.fromEntries((r.data ?? []).map(x => [x.tournament_id, x])))
    return { tournaments: t.data ?? [], avisos: a.data ?? [] }
  }
  useEffect(() => { load() }, [])

  // Búsqueda de socios para elegir pareja registrada
  useEffect(() => {
    if (partnerMode !== 'cuenta' || partnerSearch.trim().length < 2) { setPartnerResults([]); return }
    let cancel = false
    const id = setTimeout(async () => {
      const { data } = await supabase.rpc('search_members', { p_q: partnerSearch.trim() })
      if (!cancel) setPartnerResults(data ?? [])
    }, 250)
    return () => { cancel = true; clearTimeout(id) }
  }, [partnerSearch, partnerMode])

  // Abrir directo un torneo/aviso al llegar desde Inicio
  useEffect(() => {
    if (!openEvent) return
    load().then(({ tournaments, avisos }) => {
      const list = openEvent.kind === 'torneo' ? tournaments : avisos
      const found = list.find(x => x.id === openEvent.id)
      if (found) { setTab(openEvent.kind === 'torneo' ? 'torneos' : 'avisos'); setDetail({ item: found, kind: openEvent.kind }) }
      onConsumeOpen?.()
    })
  }, [openEvent])

  async function inscribir(e) {
    e.preventDefault()
    setBusy(true)
    const usaCuenta = partnerMode === 'cuenta' && partnerMemberId
    const { error } = await supabase.from('tournament_registrations').insert({
      tournament_id: signup.id, member_id: session.user.id,
      partner_member_id: usaCuenta ? partnerMemberId : null,
      partner_name: usaCuenta ? null : (partner.trim() || null),
      category: cat || null,
    })
    setBusy(false)
    if (!error) { closeSignup(); setDetail(null); load() }
    else alert('No se pudo inscribir: ' + error.message)
  }

  function startInscribir(t) {
    setSignup(t); setCat(t.categories?.[0] ?? '')
    setPartner(''); setPartnerMode('cuenta'); setPartnerMemberId(''); setPartnerSearch(''); setPartnerResults([])
  }
  function closeSignup() {
    setSignup(null); setPartner(''); setPartnerMemberId(''); setPartnerSearch(''); setPartnerResults([]); setCat('')
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
              <div key={t.id} className="card" style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 14, cursor: 'pointer' }}
                onClick={() => setDetail({ item: t, kind: 'torneo' })}>
                <div style={{ height: 150, position: 'relative', background: '#000' }}>
                  {t.poster_url
                    ? <img src={t.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <img src="/uploads/IMG_5194.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />}
                  <DateBadge iso={t.starts_at} />
                  <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
                    <Countdown target={t.starts_at} variant="evento" compact />
                  </div>
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
                        onClick={(e) => { e.stopPropagation(); startInscribir(t) }}>Inscribirme</button>
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
            <div key={a.id} className="card" style={{ padding: 14, marginBottom: 12, display: 'flex', gap: 12, cursor: 'pointer' }}
              onClick={() => setDetail({ item: a, kind: 'aviso' })}>
              {a.image_url
                ? <img src={a.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--surf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📣</div>}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.is_pinned ? '📌 ' : ''}{a.title}</div>
                {a.body && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.body}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--faint)' }}>{timeAgo(a.created_at)}</div>
                  {a.expires_at && new Date(a.expires_at) > new Date() && <Countdown target={a.expires_at} variant="promo" compact />}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {detail && (
        <EventoModal
          item={detail.item} kind={detail.kind}
          registration={detail.kind === 'torneo' ? regs[detail.item.id] : null}
          onClose={() => setDetail(null)}
          onRegister={(t) => startInscribir(t)}
        />
      )}

      {/* Formulario de inscripción */}
      {signup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 80 }} onClick={closeSignup}>
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
            <div className="field-label">Tu pareja</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button type="button" className={`tab-btn ${partnerMode === 'cuenta' ? 'active' : ''}`} style={{ padding: '8px' }}
                onClick={() => { setPartnerMode('cuenta'); setPartner('') }}>Tiene cuenta</button>
              <button type="button" className={`tab-btn ${partnerMode === 'libre' ? 'active' : ''}`} style={{ padding: '8px' }}
                onClick={() => { setPartnerMode('libre'); setPartnerMemberId(''); setPartnerSearch('') }}>Solo nombre</button>
            </div>

            {partnerMode === 'cuenta' ? (
              <div style={{ marginBottom: 18 }}>
                {partnerMemberId ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(215,242,60,0.1)', border: '1px solid rgba(215,242,60,0.4)', borderRadius: 8, padding: '10px 12px' }}>
                    <span style={{ fontSize: 13 }}>✓ {partnerResults.find(r => r.id === partnerMemberId)?.full_name || partnerSearch}</span>
                    <span style={{ color: 'var(--muted)', cursor: 'pointer' }} onClick={() => { setPartnerMemberId(''); setPartnerSearch('') }}>✕</span>
                  </div>
                ) : (
                  <>
                    <input className="input" value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)} placeholder="Busca a tu pareja por nombre…" />
                    {partnerResults.length > 0 && (
                      <div className="card" style={{ marginTop: 6, overflow: 'hidden' }}>
                        {partnerResults.map(r => (
                          <div key={r.id} onClick={() => setPartnerMemberId(r.id)}
                            style={{ padding: '10px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--line-soft)' }}>
                            {r.full_name}
                          </div>
                        ))}
                      </div>
                    )}
                    {partnerSearch.trim().length >= 2 && partnerResults.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>
                        Sin resultados. Si tu pareja no tiene cuenta, usa "Solo nombre".
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>
                      Al ligarla, los avisos del torneo también le llegarán a tu pareja.
                    </div>
                  </>
                )}
              </div>
            ) : (
              <input className="input" value={partner} onChange={e => setPartner(e.target.value)} placeholder="Ej. Ana López" style={{ marginBottom: 18 }} />
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-lime" disabled={busy} style={{ flex: 1 }}>{busy ? '…' : 'Confirmar'}</button>
              <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={closeSignup}>Cancelar</button>
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
