import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import OrdemProducaoForm from '@/components/producao/OrdemProducaoForm'

export default async function NovaOSPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const [{ data: produtos }, { data: maquinas }, { data: usuarios }] = await Promise.all([
    supabase.from('produtos').select('id, codigo, descricao, unidade').eq('status', 'ativo').order('codigo'),
    supabase.from('maquinas').select('id, codigo, nome').in('status', ['disponivel', 'em_producao']).order('codigo'),
    supabase.from('usuarios').select('id, nome, perfil').eq('status', 'ativo').order('nome'),
  ])

  const operadores   = (usuarios ?? []).filter((u: any) => ['operador_producao', 'supervisor_producao'].includes(u.perfil))
  const supervisores = (usuarios ?? []).filter((u: any) => u.perfil === 'supervisor_producao')

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/producao" className="hover:text-blue-600">Produção</Link>
          <span className="mx-2">›</span>
          <span>Nova OS</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Nova Ordem de Serviço</h1>
      </div>
      <OrdemProducaoForm
        produtos={(produtos ?? []) as any}
        maquinas={(maquinas ?? []) as any}
        operadores={(operadores) as any}
        supervisores={(supervisores) as any}
      />
    </div>
  )
}
