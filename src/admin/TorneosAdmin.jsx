import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtDateShort, timeAgo } from '../lib/util'
import { MATCH_EMBED, nextMatchFor, opponentName, fmtMatchTime, waLink, pairRecipients, pairName } from '../lib/torneo'
import RolTorneo from './RolTorneo.jsx'

export default function TorneosAdmin() {
  const [tab, setTab] = useState('torneos')
  const [tournaments, setTournaments] = useState([])
  const [avisos, setAvisos] = useState([])
  const [drawer, setDrawer] = useState(null) // {type:'torneo'|'aviso', data:{}}
  const [inscritos, setInscritos] = useState(null) // {torneo, list, matches}
  const [rol, setRol] = useState(null) // torneo cuyo rol de juego está abierto
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [t, a] = await Promise.all([
      supabase.from('tournaments').select('*').order('starts_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    ])
    setTournaments(t.data ?? [])
    setAvisos(a.data ?? [])
  }
  useEffect(() => { load() }, [])

  function newTorneo() {
    setError('')
    setDrawer({ type: 'torneo', data: { title: '', starts_at: '', categories: '', capacity: '', fee: '', registration_open: true, is_published: true } })
  }
  function newAviso() {
    setError('')
    setDrawer({ type: 'aviso', data: { title: '', body: '', is_pinned: false, is_published: true, expires_at: '' } })
  }
  function edit(type, row) {
    setError('')
    setDrawer({
      type, data: {
        ...row,
        categories: type === 'torneo' ? (row.categories ?? []).join(', ') : undefined,
        starts_at: type === 'torneo' ? toLocalInput(row.starts_at) : undefined,
        expires_at: type === 'aviso' && row.expires_at ? toLocalInput(row.expires_at) : '',
      }
    })
  }

  async function uploadImage(file) {
    const path = `${Date.now()}-${file.name.replaceAll(/[^a-zA-Z0-9.\-_]/g, '')}`
    const { error } = await supabase.storage.from('public-assets').upload(path, file)
    if (error) {
      if ((error.message || '').toLowerCase().includes('bucket not found')) {
        throw new Error('Falta crear el bucket "public-assets" en Supabase (Storage → New bucket, público). ' +
          'Mientras tanto, se guardó sin imagen.')
      }
      throw error
    }
    return supabase.storage.from('public-assets').getPublicUrl(path).data.publicUrl
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const d = drawer.data
    let bucketWarning = ''
    try {
      let image_url = d.poster_url ?? d.image_url ?? null
      if (d._file) {
        try {
          image_url = await uploadImage(d._file)
        } catch (upErr) {
          // Si falta el bucket, no bloqueamos: guardamos sin imagen y avisamos.
          if ((upErr.message || '').includes('public-assets')) bucketWarning = upErr.message
          else throw upErr
        }
      }

      if (drawer.type === 'torneo') {
        const row = {
          title: d.title.trim(),
          starts_at: new Date(d.starts_at).toISOString(),
          categories: d.categories.split(',').map(s => s.trim()).filter(Boolean),
          capacity: d.capacity ? Number(d.capacity) : null,
          fee: d.fee ? Number(d.fee) : 0,
          registration_open: d.registration_open,
          is_published: d.is_published,
          poster_url: image_url,
        }
        const q = d.id
          ? supabase.from('tournaments').update(row).eq('id', d.id)
          : supabase.from('tournaments').insert(row)
        const { error } = await q
        if (error) throw error
      } else {
        const row = {
          title: d.title.trim(), body: d.body?.trim() || null,
          is_pinned: d.is_pinned, is_published: d.is_published, image_url,
          expires_at: d.expires_at ? new Date(d.expires_at).toISOString() : null,
        }
        const q = d.id
          ? supabase.from('announcements').update(row).eq('id', d.id)
          : supabase.from('announcements').insert(row)
        const { error } = await q
        if (error) throw error
      }
      load()
      if (bucketWarning) { setError('⚠️ ' + bucketWarning); setDrawer(dr => ({ ...dr, data: { ...dr.data, _file: null } })) }
      else setDrawer(null)
    } catch (err) {
      setError('No se pudo guardar: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function borrar(type, id) {
    if (!confirm('¿Eliminar definitivamente?')) return
    const table = type === 'torneo' ? 'tournaments' : 'announcements'
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  async function verInscritos(t) {
    const [{ data }, { data: matches }] = await Promise.all([
      supabase.from('tournament_registrations')
        .select('*, profiles(full_name, phone), partner:profiles!tournament_registrations_partner_member_id_fkey(full_name, phone)')
        .eq('tournament_id', t.id).order('created_at'),
      supabase.from('tournament_matches').select(MATCH_EMBED).eq('tournament_id', t.id),
    ])
    setInscritos({ torneo: t, list: data ?? [], matches: matches ?? [] })
  }

  // Mensaje de WhatsApp con el horario del partido, dirigido a una persona
  function waMensaje(reg, nombre) {
    const m = nextMatchFor(inscritos.matches, reg.id)
    if (!m) return `Hola ${nombre}! 🎾 Te confirmamos tu inscripción a "${inscritos.torneo.title}" en Quinta Padel Center. En cuanto esté el rol de juego te avisamos por aquí. ¡Nos vemos en la cancha!`
    const cancha = m.courts?.name ? ` en ${m.courts.name}` : ''
    return `Hola ${nombre}! 🎾 "${inscritos.torneo.title}" — tu partido (${m.round}) es ${fmtMatchTime(m.starts_at)}${cancha} vs ${opponentName(m, reg.id)}. ¡Te esperamos en Quinta Padel Center!`
  }

  async function togglePago(reg) {
    await supabase.from('tournament_registrations').update({ is_paid: !reg.is_paid }).eq('id', reg.id)
    verInscritos(inscritos.torneo)
  }

  const d = drawer?.data

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div className="h-page" style={{ fontSize: 22 }}>Torneos y avisos</div>
        <button className="btn-lime" style={{ width: 'auto', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0 }}
          onClick={() => tab === 'torneos' ? newTorneo() : newAviso()}>
          + {tab === 'torneos' ? 'Nuevo torneo' : 'Nuevo aviso'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`tab-btn ${tab === 'torneos' ? 'active' : ''}`} style={{ flex: '0 0 auto', padding: '10px 22px' }} onClick={() => setTab('torneos')}>Torneos</button>
        <button className={`tab-btn ${tab === 'avisos' ? 'active' : ''}`} style={{ flex: '0 0 auto', padding: '10px 22px' }} onClick={() => setTab('avisos')}>Avisos</button>
      </div>

      {tab === 'torneos' && tournaments.map(t => (
        <div key={t.id} className="card" style={{ padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {t.poster_url
              ? <img src={t.poster_url} alt="" style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 54, height: 54, borderRadius: 8, background: 'var(--surf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🏆</div>}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {t.title}
                {!t.is_published && <span style={{ color: 'var(--faint)', fontSize: 10, marginLeft: 8 }}>BORRADOR</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                {fmtDateShort(t.starts_at)} · {(t.categories ?? []).join(', ') || 'sin categorías'}
                {t.registration_open ? ' · inscripciones abiertas' : ' · cerrado'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 13, flexShrink: 0, alignItems: 'center' }}>
            <button className="link-lime" onClick={() => setRol(t)}>Rol de juego</button>
            <button className="link-lime" onClick={() => verInscritos(t)}>Inscritos</button>
            <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => edit('torneo', t)}>✎</span>
            <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => borrar('torneo', t.id)}>🗑</span>
          </div>
        </div>
      ))}
      {tab === 'torneos' && tournaments.length === 0 && <Empty text="Aún no hay torneos. Crea el primero." />}

      {tab === 'avisos' && avisos.map(a => (
        <div key={a.id} className="card" style={{ padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {a.image_url
              ? <img src={a.image_url} alt="" style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 54, height: 54, borderRadius: 8, background: 'var(--surf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📣</div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {a.is_pinned && '📌 '}{a.title}
                {!a.is_published && <span style={{ color: 'var(--faint)', fontSize: 10, marginLeft: 8 }}>OCULTO</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{timeAgo(a.created_at)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 14, flexShrink: 0 }}>
            <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => edit('aviso', a)}>✎</span>
            <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => borrar('aviso', a.id)}>🗑</span>
          </div>
        </div>
      ))}
      {tab === 'avisos' && avisos.length === 0 && <Empty text="Sin avisos. Publica el primero." />}

      {/* Drawer crear/editar */}
      {drawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 55 }} onClick={() => setDrawer(null)} />
          <form className="drawer" onSubmit={save}>
            <div className="h-section" style={{ marginBottom: 16 }}>
              {d.id ? 'Editar' : 'Nuevo'} {drawer.type === 'torneo' ? 'torneo' : 'aviso'}
            </div>

            <div className="field-label">Título</div>
            <input className="input" style={{ marginBottom: 12 }} required value={d.title}
              onChange={e => upd(setDrawer, { title: e.target.value })} />

            {drawer.type === 'torneo' ? (
              <>
                <div className="field-label">Fecha y hora</div>
                <input className="input" type="datetime-local" style={{ marginBottom: 12 }} required value={d.starts_at}
                  onChange={e => upd(setDrawer, { starts_at: e.target.value })} />
                <div className="field-label">Categorías (separadas por coma)</div>
                <input className="input" style={{ marginBottom: 12 }} placeholder="4ta, Mixto" value={d.categories}
                  onChange={e => upd(setDrawer, { categories: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div className="field-label">Cupo (parejas)</div>
                    <input className="input" type="number" min="0" style={{ marginBottom: 12 }} value={d.capacity ?? ''}
                      onChange={e => upd(setDrawer, { capacity: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="field-label">Costo ($)</div>
                    <input className="input" type="number" min="0" style={{ marginBottom: 12 }} value={d.fee ?? ''}
                      onChange={e => upd(setDrawer, { fee: e.target.value })} />
                  </div>
                </div>
                <Check label="Inscripciones abiertas" checked={d.registration_open} onChange={v => upd(setDrawer, { registration_open: v })} />
              </>
            ) : (
              <>
                <div className="field-label">Texto del aviso</div>
                <textarea className="input" rows={3} style={{ marginBottom: 12, resize: 'vertical' }} value={d.body ?? ''}
                  onChange={e => upd(setDrawer, { body: e.target.value })} />
                <div className="field-label">Fin de la promo (opcional · muestra cuenta regresiva)</div>
                <input className="input" type="datetime-local" style={{ marginBottom: 12 }} value={d.expires_at ?? ''}
                  onChange={e => upd(setDrawer, { expires_at: e.target.value })} />
                <Check label="Fijar arriba (destacado)" checked={d.is_pinned} onChange={v => upd(setDrawer, { is_pinned: v })} />
              </>
            )}

            <Check label="Publicado (visible para socios)" checked={d.is_published} onChange={v => upd(setDrawer, { is_published: v })} />

            <div className="field-label" style={{ marginTop: 8 }}>Imagen / cartel (opcional)</div>
            <input type="file" accept="image/*" style={{ marginBottom: 16, color: 'var(--muted)', fontSize: 12 }}
              onChange={e => upd(setDrawer, { _file: e.target.files?.[0] })} />

            {error && <div className="error-note" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-lime" disabled={busy} style={{ flex: 1, borderRadius: 9, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0, fontWeight: 700 }}>
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" className="btn-outline" style={{ flex: 1, borderRadius: 9, fontFamily: 'Inter', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}
                onClick={() => setDrawer(null)}>Cancelar</button>
            </div>
          </form>
        </>
      )}

      {/* Drawer inscritos */}
      {inscritos && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 55 }} onClick={() => setInscritos(null)} />
          <div className="drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div className="h-section">Inscritos</div>
              <div style={{ color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setInscritos(null)}>✕</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              {inscritos.torneo.title} · {inscritos.list.length} inscrito{inscritos.list.length !== 1 ? 's' : ''}
            </div>
            {inscritos.list.length === 0 && <div style={{ color: 'var(--faint)', fontSize: 13 }}>Nadie inscrito todavía.</div>}
            {inscritos.list.map(reg => (
              <div key={reg.id} style={{ borderBottom: '1px solid var(--line-soft)', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{pairName(reg)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {reg.partner_member_id ? 'Pareja con cuenta ✓' : reg.partner_name ? 'Pareja sin cuenta' : 'Sin pareja'}{reg.category ? ` · ${reg.category}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {pairRecipients(reg).map((p, i) => (
                      <a key={i} href={waLink(p.phone, waMensaje(reg, p.name))} target="_blank" rel="noreferrer"
                        style={{ background: '#25D366', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, textDecoration: 'none' }}>
                        📲 {p.name}
                      </a>
                    ))}
                  </div>
                </div>
                <div onClick={() => togglePago(reg)} style={{
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999, flexShrink: 0,
                  background: reg.is_paid ? 'var(--lime)' : 'transparent',
                  color: reg.is_paid ? '#101110' : 'var(--lime)',
                  border: reg.is_paid ? 'none' : '1px solid var(--lime)',
                }}>{reg.is_paid ? 'PAGADO' : 'PENDIENTE'}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {rol && <RolTorneo torneo={rol} onClose={() => setRol(null)} />}
    </div>
  )
}

function upd(setDrawer, patch) {
  setDrawer(dr => ({ ...dr, data: { ...dr.data, ...patch } }))
}

function Check({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--white)', marginBottom: 10, cursor: 'pointer' }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: '#D7F23C' }} />
      {label}
    </label>
  )
}

function Empty({ text }) {
  return <div style={{ color: 'var(--faint)', fontSize: 13, textAlign: 'center', padding: '26px 0' }}>{text}</div>
}

function toLocalInput(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
