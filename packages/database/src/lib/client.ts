import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// ─── Variáveis de ambiente obrigatórias ──────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ─── Client para o BROWSER (componentes client-side) ─────────────────────────
export function createBrowserClient() {
  return _createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}

// ─── Client para o SERVER (Server Components, API Routes) ────────────────────
export function createServerClient(
  cookieStore: {
    get(name: string): { value: string } | undefined
    set(name: string, value: string, options: CookieOptions): void
    delete(name: string): void
  }
) {
  return _createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, options)
        } catch {
          // Server Component — ignorar erro de set
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set(name, '', options)
        } catch {
          // Server Component — ignorar erro de remove
        }
      },
    },
  })
}

// ─── Client ADMIN com service role — APENAS server-side ──────────────────────
// Bypassa RLS — usar somente em operações administrativas confiáveis
export function createAdminClient() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
