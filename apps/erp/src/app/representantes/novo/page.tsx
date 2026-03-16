import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import NovoRepresentanteForm from './NovoRepresentanteForm'

export default async function NovoRepresentantePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: reps } = await supabase
    .from('representantes')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  const supervisores = (reps ?? []) as { id: string; nome: string }[]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/representantes" className="hover:text-blue-600">Representantes</Link>
          <span>/</span>
          <span className="text-gray-700">Novo Representante</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Representante</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cadastre um novo representante de vendas</p>
      </div>
      <NovoRepresentanteForm supervisores={supervisores} />
    </div>
  )
}
