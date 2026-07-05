import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Welcome() {
  const [view, setView] = useState('welcome') // welcome | login | signup
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { full_name: form.name.trim(), phone: form.phone.trim() } },
        })
        if (error) throw error
        if (!data.session) setNotice('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
        if (error) throw error
      }
    } catch (err) {
      setError(traducir(err.message))
    } finally {
      setBusy(false)
    }
  }

  const bgStyle = {
    flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '40px 28px',
    backgroundImage: "linear-gradient(180deg, rgba(10,11,9,0.55), rgba(10,11,9,0.94)), url('/assets/racket-texture.jpeg')",
    backgroundSize: 'cover', backgroundPosition: 'center',
  }

  return (
    <div className="phone">
      <div style={bgStyle}>
        <img src="/assets/logo-mark-black.jpeg" alt="Quinta Padel Center"
          style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(215,242,60,0.5)', marginBottom: 20 }} />
        <div className="oswald" style={{ fontWeight: 700, fontSize: 26, textAlign: 'center', lineHeight: 1.15 }}>
          Quinta<br />Padel Center
        </div>
        <div style={{ fontSize: 13, color: '#C9CDC4', marginTop: 8, marginBottom: 36 }}>Tu club de pádel · León, GTO.</div>

        {view === 'welcome' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn-lime" style={{ padding: 16, borderRadius: 12 }} onClick={() => setView('login')}>Iniciar sesión</button>
            <button className="btn-outline" style={{ padding: 16, borderRadius: 12 }} onClick={() => setView('signup')}>Crear cuenta</button>
          </div>
        )}

        {view !== 'welcome' && (
          <form onSubmit={submit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {view === 'signup' && (
              <>
                <input className="input" placeholder="Nombre completo" value={form.name} onChange={set('name')} required />
                <input className="input" placeholder="Celular (10 dígitos, con WhatsApp)" type="tel" value={form.phone} onChange={set('phone')}
                  required pattern="[0-9\s+\-]{10,15}" title="Escribe tu celular a 10 dígitos" inputMode="numeric" />
                <div style={{ fontSize: 11, color: '#C9CDC4', marginTop: -4 }}>
                  Lo usaremos para avisarte de tus reservas y torneos.
                </div>
              </>
            )}
            <input className="input" placeholder="Correo electrónico" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
            <input className="input" placeholder="Contraseña" type="password" value={form.password} onChange={set('password')} required minLength={6}
              autoComplete={view === 'signup' ? 'new-password' : 'current-password'} />
            {error && <div className="error-note">{error}</div>}
            {notice && <div className="ok-note">{notice}</div>}
            <button className="btn-lime" style={{ padding: 15, borderRadius: 12, marginTop: 4 }} disabled={busy}>
              {busy ? 'Un momento…' : view === 'signup' ? 'Crear mi cuenta' : 'Entrar'}
            </button>
            <button type="button" onClick={() => { setView(view === 'signup' ? 'login' : 'signup'); setError(''); setNotice('') }}
              style={{ background: 'none', border: 'none', color: '#C9CDC4', fontSize: 13, cursor: 'pointer', padding: 8 }}>
              {view === 'signup' ? '¿Ya tienes cuenta? Inicia sesión' : '¿Nuevo en el club? Crea tu cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function traducir(msg) {
  if (!msg) return 'Ocurrió un error. Intenta de nuevo.'
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('already registered')) return 'Ese correo ya tiene una cuenta. Inicia sesión.'
  if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de entrar (revisa tu bandeja).'
  if (msg.toLowerCase().includes('password')) return 'La contraseña debe tener al menos 6 caracteres.'
  return msg
}
