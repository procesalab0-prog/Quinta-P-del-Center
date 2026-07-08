import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/util'
import { ROUNDS, MATCH_EMBED, pairName, fmtMatchTime } from '../lib/torneo'

// Gestión del rol de juego y mensajes de un torneo (admin).
export default function RolTorneo({ torneo, onClose }) {
  const [tab, setTab] = useState('partidos')
  const [matches, setMatches] = useState([])
  const [regs, setRegs] = useState([])
  const [courts, setCourts] = useState([])
  const [messages, setMessages] = useState([])
  const [form, setForm] = useState(null) // null | datos del partido en edición
  const [msgText, setMsgText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [m, r, c, ms] = await Promise.all([
      supabase.from('tournament_matches').select(MATCH_EMBED).eq('tournament_id', torneo.id).order('starts_at', { nullsFirst: false }),
      supabase.from('tournament_registrations').select('id, partner_name, category, profiles(full_name, phone)').eq('tournament_id', torneo.id).order('created_at'),
      supabase.from('courts').select('*').eq('is_active', true).order('id'),
      supabase.from('tournament_messages').select('*').eq('tournament_id', torneo.id).order('created_at', { ascending: false }),
    ])
    setMatches(m.data ?? [])
    setRegs(r.data ?? [])
    setCourts(c.data ?? [])
    setMessages(ms.data ?? [])
    if (m.error) setError('Faltan las tablas de torneos: corre supabase/migracion-torneos.sql (' + m.error.message + ')')
  }
  useEffect(() => { load() }, [])

  function newMatch() {
    setError('')
    setForm({ round: 'Grupos', court_id: courts[0]?.id ?? '', starts_at: '', pair1_reg_id: '', pair1_label: '', pair2_reg_id: '', pair2_label: '', status: 'scheduled', score: '', winner: '' })
  }
  function editMatch(m) {
    setError('')
    setForm({
      id: m.id, round: m.round, court_id: m.court_id ?? '', starts_at: m.starts_at ? toLocalInput(m.starts_at) : '',
      pair1_reg_id: m.pair1_reg_id ?? '', pair1_label: m.pair1_label ?? '',
      pair2_reg_id: m.pair2_reg_id ?? '', pair2_label: m.pair2_label ?? '',
      status: m.status, score: m.score ?? '', winner: m.winner ?? '',
    })
  }

  async function saveMatch(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const row = {
      tournament_id: torneo.id,
      round: form.round,
      court_id: form.court_id ? Number(form.court_id) : null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      pair1_reg_id: form.pair1_reg_id ? Number(form.pair1_reg_id) : null,
      pair1_label: form.pair1_reg_id ? null : (form.pair1_label.trim() || null),
      pair2_reg_id: form.pair2_reg_id ? Number(form.pair2_reg_id) : null,
      pair2_label: form.pair2_reg_id ? null : (form.pair2_label.trim() || null),
      status: form.status,
      score: form.score.trim() || null,
      winner: form.winner ? Number(form.winner) : null,
    }
    const q = form.id
      ? supabase.from('tournament_matches').update(row).eq('id', form.id)
      : supabase.from('tournament_matches').insert(row)
    const { error } = await q
    setBusy(false)
    if (error) { setError('No se pudo guardar: ' + error.message); return }
    setForm(null); load()
  }

  async function borrarMatch(id) {
    if (!confirm('¿Eliminar este partido?')) return
    await supabase.from('tournament_matches').delete().eq('id', id)
    load()
  }

  async function enviarMensaje(e) {
    e.preventDefault()
    if (!msgText.trim()) return
    setBusy(true)
    const { error } = await supabase.from('tournament_messages').insert({ tournament_id: torneo.id, body: msgText.trim() })
    setBusy(false)
    if (error) { setError('No se pudo enviar: ' + error.message); return }
    setMsgText(''); load()
  }

  async function borrarMensaje(id) {
    await supabase.from('tournament_messages').delete().eq('id', id)
    load()
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '4dvh', left: '50%', transform: 'translateX(-50%)', width: 'min(720px, 94vw)', maxHeight: '92dvh',
        overflowY: 'auto', background: 'var(--bg0)', border: '1px solid rgba(215,242,60,0.3)', borderRadius: 18, zIndex: 61, padding: 22,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div className="h-section">Rol de juego</div>
          <div style={{ color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }} onClick={onClose}>✕</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{torneo.title}</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`tab-btn ${tab === 'partidos' ? 'active' : ''}`} style={{ flex: '0 0 auto', padding: '9px 20px' }} onClick={() => setTab('partidos')}>Partidos</button>
          <button className={`tab-btn ${tab === 'mensajes' ? 'active' : ''}`} style={{ flex: '0 0 auto', padding: '9px 20px' }} onClick={() => setTab('mensajes')}>Mensajes ({messages.length})</button>
        </div>

        {error && <div className="error-note" style={{ marginBottom: 12 }}>{error}</div>}

        {tab === 'partidos' && (
          <>
            {!form && (
              <button className="btn-lime" style={{ width: 'auto', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0, marginBottom: 14 }}
                onClick={newMatch}>+ Agregar partido</button>
            )}

            {form && (
              <form onSubmit={saveMatch} className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div className="field-label">Ronda</div>
                    <select className="input" value={form.round} onChange={e => setForm({ ...form, round: e.target.value })}>
                      {ROUNDS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="field-label">Cancha</div>
                    <select className="input" value={form.court_id} onChange={e => setForm({ ...form, court_id: e.target.value })}>
                      <option value="">Por definir</option>
                      {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field-label">Día y hora</div>
                <input className="input" type="datetime-local" style={{ marginBottom: 10 }} value={form.starts_at}
                  onChange={e => setForm({ ...form, starts_at: e.target.value })} />

                <PairPicker label="Pareja 1" regs={regs} regId={form.pair1_reg_id} free={form.pair1_label}
                  onReg={v => setForm({ ...form, pair1_reg_id: v })} onFree={v => setForm({ ...form, pair1_label: v })} />
                <PairPicker label="Pareja 2" regs={regs} regId={form.pair2_reg_id} free={form.pair2_label}
                  onReg={v => setForm({ ...form, pair2_reg_id: v })} onFree={v => setForm({ ...form, pair2_label: v })} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div className="field-label">Estado</div>
                    <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="scheduled">Programado</option>
                      <option value="playing">Jugándose</option>
                      <option value="done">Terminado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <div className="field-label">Marcador</div>
                    <input className="input" placeholder="6-3, 6-4" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
                  </div>
                  <div>
                    <div className="field-label">Ganador</div>
                    <select className="input" value={form.winner} onChange={e => setForm({ ...form, winner: e.target.value })}>
                      <option value="">—</option>
                      <option value="1">Pareja 1</option>
                      <option value="2">Pareja 2</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-lime" disabled={busy} style={{ flex: 1, borderRadius: 9, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0, fontWeight: 700 }}>
                    {busy ? 'Guardando…' : 'Guardar partido'}
                  </button>
                  <button type="button" className="btn-outline" style={{ flex: 1, borderRadius: 9, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}
                    onClick={() => setForm(null)}>Cancelar</button>
                </div>
              </form>
            )}

            {matches.length === 0 && !form && (
              <div style={{ color: 'var(--faint)', fontSize: 13, padding: '18px 0', textAlign: 'center' }}>
                Aún no hay partidos. Agrega el primero y a cada inscrito le aparecerá su horario en la app. 🎾
              </div>
            )}
            {matches.map(m => (
              <div key={m.id} className="card" style={{ padding: '12px 14px', marginBottom: 8, opacity: m.status === 'cancelled' ? 0.45 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="chip-cat">{m.round}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtMatchTime(m.starts_at)}{m.courts?.name ? ` · ${m.courts.name}` : ''}</span>
                      {m.status === 'playing' && <span style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 700 }}>● EN JUEGO</span>}
                      {m.status === 'cancelled' && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>CANCELADO</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      <span style={{ color: m.winner === 1 ? 'var(--lime)' : 'var(--white)' }}>{m.winner === 1 ? '🏆 ' : ''}{pairName(m.pair1, m.pair1_label)}</span>
                      <span style={{ color: 'var(--faint)', margin: '0 8px' }}>vs</span>
                      <span style={{ color: m.winner === 2 ? 'var(--lime)' : 'var(--white)' }}>{m.winner === 2 ? '🏆 ' : ''}{pairName(m.pair2, m.pair2_label)}</span>
                      {m.score && <span style={{ color: 'var(--muted)', fontWeight: 500, marginLeft: 10, fontSize: 13 }}>{m.score}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0, fontSize: 14, color: 'var(--muted)' }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => editMatch(m)}>✎</span>
                    <span style={{ cursor: 'pointer' }} onClick={() => borrarMatch(m.id)}>🗑</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'mensajes' && (
          <>
            <form onSubmit={enviarMensaje} style={{ marginBottom: 16 }}>
              <div className="field-label">Mensaje para todos los inscritos (les aparece en la app, dentro del torneo)</div>
              <textarea className="input" rows={2} style={{ resize: 'vertical', marginBottom: 8 }} placeholder="Ej. Se recorre todo 30 min por lluvia 🌧"
                value={msgText} onChange={e => setMsgText(e.target.value)} />
              <button className="btn-lime" disabled={busy || !msgText.trim()} style={{ width: 'auto', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0 }}>
                Enviar mensaje
              </button>
            </form>
            {messages.length === 0 && <div style={{ color: 'var(--faint)', fontSize: 13 }}>Sin mensajes todavía.</div>}
            {messages.map(ms => (
              <div key={ms.id} className="card" style={{ padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13 }}>📣 {ms.body}</div>
                  <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{timeAgo(ms.created_at)}</div>
                </div>
                <span style={{ cursor: 'pointer', color: 'var(--muted)', flexShrink: 0 }} onClick={() => borrarMensaje(ms.id)}>🗑</span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

function PairPicker({ label, regs, regId, free, onReg, onFree }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="field-label">{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: regId ? '1fr' : '1fr 1fr', gap: 8 }}>
        <select className="input" value={regId} onChange={e => onReg(e.target.value)}>
          <option value="">✏️ Escribir nombre libre…</option>
          {regs.map(r => <option key={r.id} value={r.id}>{pairName(r)}{r.category ? ` (${r.category})` : ''}</option>)}
        </select>
        {!regId && <input className="input" placeholder="Nombre de la pareja" value={free} onChange={e => onFree(e.target.value)} />}
      </div>
    </div>
  )
}

function toLocalInput(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
