import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { initials, LEVEL_LABEL, LEVEL_BG, timeAgo, memberNumber } from '../lib/util'

export default function Socios() {
  const [socios, setSocios] = useState([])
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState(null)
  const [historial, setHistorial] = useState([])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setSocios(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function openFicha(so) {
    setSel(so)
    const { data } = await supabase.from('visits').select('created_at')
      .eq('member_id', so.id).order('created_at', { ascending: false }).limit(5)
    setHistorial(data ?? [])
  }

  async function ajustar(delta) {
    const next = Math.max(0, sel.stamps + delta)
    const { error } = await supabase.from('profiles').update({ stamps: next }).eq('id', sel.id)
    if (!error) {
      setSel(s => ({ ...s, stamps: next }))
      setSocios(list => list.map(x => x.id === sel.id ? { ...x, stamps: next } : x))
    }
  }

  async function cambiarRol(role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', sel.id)
    if (!error) {
      setSel(s => ({ ...s, role }))
      setSocios(list => list.map(x => x.id === sel.id ? { ...x, role } : x))
    }
  }

  async function toggleActivo() {
    const next = !sel.is_active
    const { error } = await supabase.from('profiles').update({ is_active: next }).eq('id', sel.id)
    if (!error) {
      setSel(s => ({ ...s, is_active: next }))
      setSocios(list => list.map(x => x.id === sel.id ? { ...x, is_active: next } : x))
    }
  }

  const filtered = socios.filter(s => (s.full_name || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="h-page" style={{ fontSize: 22, marginBottom: 16 }}>Socios</div>
      <input className="input" style={{ width: 280, maxWidth: '100%', marginBottom: 16 }}
        placeholder="🔍 Buscar socio…" value={search} onChange={e => setSearch(e.target.value)} />

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 90px' }}>
          <div>Socio</div><div>Nivel</div><div>Visitas</div><div>Sellos</div><div />
        </div>
        {filtered.map(so => (
          <div key={so.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 90px', opacity: so.is_active ? 1 : 0.45 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div className="avatar-circle" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(so.full_name)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {so.full_name || '(sin nombre)'}
                  {so.role !== 'member' && <span style={{ color: 'var(--lime)', fontSize: 10, marginLeft: 6 }}>{so.role.toUpperCase()}</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--faint)' }}>{memberNumber(so.member_code)}</div>
              </div>
            </div>
            <div><span className="level-badge" style={{ background: LEVEL_BG[so.level] }}>{LEVEL_LABEL[so.level]}</span></div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{so.total_visits}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{so.stamps}</div>
            <button className="link-lime" onClick={() => openFicha(so)}>Ver ficha</button>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 22, textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>No hay socios que coincidan.</div>}
      </div>

      {sel && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 55 }} onClick={() => setSel(null)} />
          <div className="drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div className="h-section">Ficha del socio</div>
              <div style={{ color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setSel(null)}>✕</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{sel.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              {LEVEL_LABEL[sel.level]} · {sel.stamps} sellos · {sel.total_visits} visitas
            </div>
            {sel.phone && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>📞 {sel.phone}</div>}
            <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 18 }}>{memberNumber(sel.member_code)}</div>

            <div className="field-label">Ajuste manual de sellos</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <BtnSq onClick={() => ajustar(-1)}>−</BtnSq>
              <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{sel.stamps}</div>
              <BtnSq onClick={() => ajustar(1)}>+</BtnSq>
            </div>

            <div className="field-label">Rol</div>
            <select className="input" style={{ marginBottom: 16 }} value={sel.role} onChange={e => cambiarRol(e.target.value)}>
              <option value="member">Socio</option>
              <option value="staff">Staff</option>
              <option value="admin">Administrador</option>
            </select>

            <div className="field-label">Historial reciente</div>
            <div style={{ fontSize: 12, lineHeight: 2, marginBottom: 18, color: 'var(--white)' }}>
              {historial.length === 0 && <span style={{ color: 'var(--faint)' }}>Sin visitas registradas.</span>}
              {historial.map((v, i) => <div key={i}>Visita registrada · {timeAgo(v.created_at)}</div>)}
            </div>

            <button className="btn-danger-outline" onClick={toggleActivo}>
              {sel.is_active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function BtnSq({ children, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 38, height: 38, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, userSelect: 'none',
    }}>{children}</div>
  )
}
