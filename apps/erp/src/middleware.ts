import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rotas públicas (não requerem auth)
const PUBLIC_ROUTES = ['/auth/login', '/auth/callback', '/auth/reset-password']

// Perfis que podem acessar o ERP interno
const ERP_PROFILES = [
  'ceo', 'admin', 'gerente_comercial', 'representante',
  'supervisor_producao', 'operador_producao', 'analista_qualidade',
  'analista_fiscal', 'analista_rh', 'dpo', 'tecnico_manutencao', 'comprador'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  // Ignora arquivos estáticos
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return response
  }

  // Rotas públicas — passa direto
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return response
  }

  // Cria cliente Supabase com cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) { response.cookies.set({ name, value, ...options }) },
        remove(name, options) { response.cookies.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Não autenticado → login
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Busca perfil do usuário
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil, status')
    .eq('id', user.id)
    .single()

  // Usuário inativo
  if (!usuario || usuario.status !== 'ativo') {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/auth/login?erro=conta_inativa', request.url))
  }

  // Perfil não autorizado para ERP
  if (!ERP_PROFILES.includes(usuario.perfil)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/auth/login?erro=acesso_negado', request.url))
  }

  // Injeta perfil no header para uso nos Server Components
  response.headers.set('x-user-id', user.id)
  response.headers.set('x-user-perfil', usuario.perfil)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
