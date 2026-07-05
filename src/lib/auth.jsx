import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext({ session: undefined, profile: null, settings: null })

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [profile, setProfile] = useState(null)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id
    if (!uid) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data ?? null)
  }, [session?.user?.id])

  useEffect(() => { refreshProfile() }, [refreshProfile])

  useEffect(() => {
    if (!session?.user?.id) { setSettings(null); return }
    supabase.from('loyalty_settings').select('*').eq('id', 1).single()
      .then(({ data }) => setSettings(data ?? { stamps_per_reward: 10 }))
  }, [session?.user?.id])

  // El contador de sellos se actualiza en vivo cuando el staff escanea
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    const ch = supabase
      .channel('profile-live')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        (payload) => setProfile(payload.new))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session?.user?.id])

  return (
    <AuthCtx.Provider value={{ session, profile, settings, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
