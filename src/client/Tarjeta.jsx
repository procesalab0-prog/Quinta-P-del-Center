import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../lib/auth.jsx'
import { memberNumber, LEVEL_LABEL, LEVEL_BG } from '../lib/util'

export default function Tarjeta() {
  const { profile, settings } = useAuth()
  const [qr, setQr] = useState(null)
  const [flipped, setFlipped] = useState(false)
  const [copied, setCopied] = useState(false)

  const perReward = settings?.stamps_per_reward ?? 10
  const stamps = profile?.stamps ?? 0
  const rewardReady = stamps >= perReward

  useEffect(() => {
    if (!profile?.member_code) return
    QRCode.toDataURL(profile.member_code, { width: 480, margin: 1, color: { dark: '#101110', light: '#F5F6F1' } })
      .then(setQr)
  }, [profile?.member_code])

  if (!profile) return null
  const socio = memberNumber(profile.member_code)

  // Copia el código del socio al portapapeles
  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(profile.member_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copia tu código de socio:', profile.member_code)
    }
  }

  // Genera una imagen (PNG) del QR con nombre y número de socio, y la descarga
  async function guardarQR() {
    const W = 720, H = 900
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0A0B09'; ctx.fillRect(0, 0, W, H)

    // Título
    ctx.fillStyle = '#D7F23C'
    ctx.font = 'bold 46px Oswald, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('QUINTA PADEL CENTER', W / 2, 90)

    // QR en un recuadro claro
    const qrData = await QRCode.toDataURL(profile.member_code, { width: 560, margin: 1, color: { dark: '#101110', light: '#F5F6F1' } })
    const img = new Image()
    await new Promise(res => { img.onload = res; img.src = qrData })
    const qrSize = 500, qx = (W - qrSize) / 2, qy = 160
    ctx.fillStyle = '#F5F6F1'
    ctx.fillRect(qx - 20, qy - 20, qrSize + 40, qrSize + 40)
    ctx.drawImage(img, qx, qy, qrSize, qrSize)

    // Nombre y número
    ctx.fillStyle = '#F5F6F1'
    ctx.font = 'bold 40px Inter, Arial, sans-serif'
    ctx.fillText(profile.full_name || 'Socio', W / 2, qy + qrSize + 90)
    ctx.fillStyle = '#8C9086'
    ctx.font = '28px Inter, Arial, sans-serif'
    ctx.fillText(`SOCIO N.º ${socio}`, W / 2, qy + qrSize + 140)
    ctx.font = '22px Inter, Arial, sans-serif'
    ctx.fillText('Presenta este código en recepción', W / 2, qy + qrSize + 185)

    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `QR-${socio}.png`
    a.click()
  }

  return (
    <div style={{ animation: 'qpc-fadein 0.25s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Hola,</div>
          <div className="oswald" style={{ fontWeight: 600, fontSize: 21 }}>{profile.full_name || 'Socio'}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surf)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔔</div>
      </div>

      {/* Tarjeta de lealtad */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          position: 'relative', width: '100%', aspectRatio: '1.6 / 1', borderRadius: 22,
          backgroundImage: "linear-gradient(135deg, rgba(24,26,21,0.9), rgba(10,11,9,0.95)), url('/assets/ball-pattern-texture.jpeg')",
          backgroundSize: 'cover, 420px', backgroundBlendMode: 'normal, overlay',
          border: '1px solid rgba(215,242,60,0.35)',
          boxShadow: '0 0 0 1px rgba(215,242,60,0.06), 0 18px 40px rgba(0,0,0,0.5)',
          padding: '18px 20px', cursor: 'pointer',
        }}
      >
        {flipped ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '100%', height: 34, background: 'repeating-linear-gradient(90deg, #F5F6F1 0 2px, transparent 2px 5px)', marginBottom: 14, borderRadius: 3 }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Socio N.º {socio} · Válida mientras la membresía esté activa.<br />Presenta este código en recepción.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/assets/logo-mark-black.jpeg" alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                <div className="oswald" style={{ fontWeight: 700, fontSize: 13 }}>Quinta</div>
              </div>
              <div className="level-badge" style={{ background: LEVEL_BG[profile.level] }}>{LEVEL_LABEL[profile.level]}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {qr && (
                <div style={{ background: 'var(--white)', borderRadius: 10, padding: 6, width: 124, height: 124 }}>
                  <img src={qr} alt="Código QR del socio" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.full_name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5 }}>SOCIO N.º {socio}</div>
              </div>
              <div style={{ fontSize: 9, color: 'var(--faint)' }}>Toca para voltear</div>
            </div>
          </div>
        )}
      </div>

      {/* Guardar / compartir QR */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn-outline" style={{ flex: 1, padding: '11px 6px', fontSize: 12 }} onClick={guardarQR}>⬇ Guardar QR</button>
        <button className="btn-outline" style={{ flex: 1, padding: '11px 6px', fontSize: 12 }} onClick={copiarCodigo}>
          {copied ? '✓ Copiado' : '⧉ Copiar código'}
        </button>
      </div>

      {/* Sellos */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div className="h-section" style={{ fontSize: 15 }}>
            {rewardReady ? '¡Tarjeta completa!' : `${stamps} de ${perReward} sellos`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {rewardReady ? '' : `Te faltan ${perReward - stamps} visitas para tu premio`}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {Array.from({ length: perReward }, (_, i) => (
            <div key={i} className={`sello ${i < stamps ? 'filled' : ''}`} />
          ))}
        </div>

        {rewardReady && (
          <div style={{ marginTop: 16, background: 'rgba(215,242,60,0.1)', border: '1px solid rgba(215,242,60,0.4)', borderRadius: 14, padding: 14, textAlign: 'center', animation: 'qpc-fadein 0.3s ease' }}>
            <div style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 600, marginBottom: 4 }}>🎉 ¡Completaste tu tarjeta!</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Muestra tu QR en recepción para canjear tu premio.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
