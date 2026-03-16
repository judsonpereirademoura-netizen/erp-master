import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import ClienteForm from '@/components/clientes/ClienteForm'

export default async function NovoClientePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: reps } = await supabase
    .from('representantes')
    .select('id, usuarios:usuario_id ( nome )')
    .eq('ativo', true)
    .order('id')

  const representantes = (reps ?? []).map((r: any) => ({
    id: r.id,
    nome: r.usuarios?.nome ?? 'Sem nome',
  }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/clientes" className="hover:text-blue-600">Clientes</Link>
          <span>/</span>
          <span className="text-gray-700">Novo Cliente</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Cliente</h1>
      </div>
      <ClienteForm representantes={representantes} />
    </div>
  )
}
