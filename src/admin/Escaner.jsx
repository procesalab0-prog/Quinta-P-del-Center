import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabase'
import { initials, LEVEL_LABEL, LEVEL_BG } from '../lib/util'

const READER_ID = 'qpc-qr-reader'

export default function Escaner() {
  const [member, setMember] = useState(null)      // ficha del socio escaneado
  const [code, setCode] = useState(null)          // member_code escaneado
  const [status, setStatus] = useState('')        // '', 'success', 'redeemed'
  const [error, setError] = useState('')
  const [rewards, setRewards] = useState([])
  const [manual, setManual] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [retry, setRetry] = useState(0)
  const [perReward, setPerReward] = useState(10)
  const scannerRef = useRef(null)
  const busyRef = useRef(false)

  useEffect(() => {
    supabase.from('rewards').select('*').eq('is_active', true).order('stamps_required').then(({ data }) => setRewards(data ?? []))
    supabase.from('loyalty_settings').select('stamps_per_reward').eq('id', 1).single().then(({ data }) => {
      if (data) setPerReward(data.stamps_per_reward)
    })
  }, [])

  // Cámara: se enciende cuando no hay socio en pantalla.
  // Ojo: si la cámara nunca arrancó (permiso negado), stop() lanza un error
  // síncrono que tiraba toda la app al cambiar de pantalla — por eso el flag.
  useEffect(() => {
    if (member) return
    let cancelled = false
    let running = false
    const scanner = new Html5Qrcode(READER_ID)
    scannerRef.current = scanner
    scanner.start(
      { facingMode: 'environment' },
      { fps: 8, qrbox: { width: 230, height: 230 } },
      (text) => { if (!cancelled) lookup(text) },
      () => {}
    ).then(() => {
      running = true
      if (cancelled) { try { scanner.stop().catch(() => {}) } catch { /* ya detenido */ } }
    }).catch(() => {
      if (!cancelled) setCameraError('No se pudo abrir la cámara. Revisa los permisos del navegador o usa el código manual.')
    })
    return () => {
      cancelled = true
      try {
        if (running) scanner.stop().then(() => scanner.clear()).catch(() => {})
        else scanner.clear()
      } catch { /* nunca arrancó: no hay nada que detener */ }
    }
  }, [member, retry])

  async function lookup(scanned) {
    if (busyRef.current) return
    busyRef.current = true
    setError('')
    const clean = scanned.trim()
    const { data, error } = await supabase.rpc('get_member_by_code', { p_code: clean })
    busyRef.current = false
    if (error) { setError(limpiarError(error.message)); return }
    setMember(data)
    setCode(clean)
    setStatus('')
  }

  async function registrarVisita() {
    setError('')
    const { data, error } = await supabase.rpc('register_visit', { p_code: code })
    if (error) { setError(limpiarError(error.message)); return }
    setMember(m => ({ ...m, stamps: data.stamps, total_visits: data.total_visits, level: data.level }))
    setStatus('success')
    setTimeout(() => { setMember(null); setCode(null); setStatus('') }, 2200)
  }

  async function canjear() {
    setError('')
    const reward = rewards.find(r => member.stamps >= r.stamps_required)
    if (!reward) return
    const { data, error } = await supabase.rpc('redeem_reward', { p_code: code, p_reward_id: reward.id })
    if (error) { setError(limpiarError(error.message)); return }
    setMember(m => ({ ...m, stamps: data.stamps }))
    setStatus('redeemed')
    setTimeout(() => { setMember(null); setCode(null); setStatus('') }, 2600)
  }

  const canRedeem = member && rewards.some(r => member.stamps >= r.stamps_required)

  return (
    <div>
      <div className="h-page" style={{ fontSize: 22, marginBottom: 18 }}>Escáner QR</div>
      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Visor de cámara */}
        <div style={{
          width: 360, maxWidth: '100%', borderRadius: 20, background: 'var(--bg0)',
          backgroundImage: "url('/assets/ball-pattern-texture.jpeg')", backgroundSize: 500, position: 'relative', overflow: 'hidden',
        }}>
          <Corner top left /><Corner top right={false} r /><Corner b left /><Corner b r />
          <div id={READER_ID} style={{ width: '100%', minHeight: 360 }} />
          {member && <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,11,9,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>Socio identificado ✓</div>}
          {!member && cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '0 50px' }}>
              {cameraError}
              <button className="btn-outline" style={{ width: 'auto', padding: '9px 16px', fontSize: 11 }}
                onClick={() => { setCameraError(''); setRetry(r => r + 1) }}>Reintentar cámara</button>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', color: 'var(--muted)', fontSize: 12, pointerEvents: 'none' }}>
            Apunta al código QR del socio
          </div>
        </div>

        {/* Ficha del socio */}
        {member ? (
          <div className="card" style={{ borderRadius: 18, padding: 22, width: 320, maxWidth: '100%', animation: 'qpc-pop 0.35s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div className="avatar-circle" style={{ width: 56, height: 56, fontSize: 19, border: '2px solid var(--lime)' }}>
                {initials(member.full_name)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{member.full_name}</div>
                <div className="level-badge" style={{ background: LEVEL_BG[member.level], marginTop: 4 }}>Nivel {LEVEL_LABEL[member.level]}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Sellos actuales: {member.stamps}/{perReward}</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${perReward}, 1fr)`, gap: 4, marginBottom: 20 }}>
              {Array.from({ length: perReward }, (_, i) => <div key={i} className={`sello-mini ${i < member.stamps ? 'filled' : ''}`} />)}
            </div>

            {status === 'success' && <div className="ok-note">✓ Visita registrada correctamente</div>}
            {status === 'redeemed' && <div className="ok-note">★ Premio canjeado — entrégalo al socio</div>}
            {!status && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {error && <div className="error-note">{error}</div>}
                <button className="btn-lime" style={{ padding: 14, borderRadius: 10, fontSize: 14 }} onClick={registrarVisita}>✓ Registrar visita</button>
                <button onClick={canjear} disabled={!canRedeem} style={{
                  textAlign: 'center', fontFamily: 'Oswald, sans-serif', fontWeight: 700, padding: 14, borderRadius: 10, fontSize: 14, cursor: canRedeem ? 'pointer' : 'not-allowed',
                  background: canRedeem ? '#C9CDC4' : 'transparent', color: canRedeem ? '#101110' : 'var(--faint)',
                  border: canRedeem ? 'none' : '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase',
                }}>★ Canjear premio</button>
                <button onClick={() => { setMember(null); setCode(null); setError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 12, paddingTop: 6, cursor: 'pointer' }}>Cancelar</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ width: 320, maxWidth: '100%' }}>
            {error && <div className="error-note" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="field-label">¿Sin cámara? Pega el código del socio:</div>
            <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) lookup(manual) }} style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={manual} onChange={e => setManual(e.target.value)} placeholder="Código del QR" />
              <button className="btn-lime" style={{ width: 'auto', padding: '11px 16px', borderRadius: 9 }}>Buscar</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function Corner({ top, b, left, r }) {
  const pos = { position: 'absolute', width: 36, height: 36, zIndex: 5, pointerEvents: 'none' }
  if (top) { pos.top = 24; pos.borderTop = '3px solid var(--lime)' } else { pos.bottom = 24; pos.borderBottom = '3px solid var(--lime)' }
  if (left) { pos.left = 24; pos.borderLeft = '3px solid var(--lime)' } else { pos.right = 24; pos.borderRight = '3px solid var(--lime)' }
  const tl = top && left, tr = top && !left, bl = !top && left
  pos.borderRadius = tl ? '8px 0 0 0' : tr ? '0 8px 0 0' : bl ? '0 0 0 8px' : '0 0 8px 0'
  return <div style={pos} />
}

function limpiarError(msg) {
  // Los errores de las funciones RPC ya vienen en español desde la base de datos
  if (!msg) return 'Error desconocido'
  if (msg.includes('invalid input syntax for type uuid')) return 'Código QR no válido.'
  return msg
}
