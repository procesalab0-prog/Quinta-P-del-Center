import { createClient } from '@supabase/supabase-js'

// La publishable key es pública por diseño; la seguridad real la da RLS en Supabase.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://jrssqqnodzumapbqlpxq.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_JVy3sROB9kyrzL7T-vqbVw_4EnWWFMn'

export const supabase = createClient(url, key)
