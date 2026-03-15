import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/auth/login', process.env.AUTH_URL_ERP ?? 'http://localhost:3000'))
}
