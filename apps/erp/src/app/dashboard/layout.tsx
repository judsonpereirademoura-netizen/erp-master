import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@erp-master/database'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, perfil, avatar_url')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/auth/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar perfil={usuario.perfil} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header usuario={usuario} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
