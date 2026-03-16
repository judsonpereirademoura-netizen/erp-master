import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import LoteForm from '@/components/estoque/LoteForm'

export default async function NovoLotePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const [{ data: insumos }, { data: fornecedores }] = await Promise.all([
    supabase.from('insumos').select('id, codigo, descricao, unidade').eq('status', 'ativo').order('codigo'),
    supabase.from('fornecedores').select('id, razao_social, nome_fantasia').eq('status', 'ativo').order('razao_social'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/estoque" className="hover:text-blue-600">Estoque</Link>
          <span className="mx-2">›</span>
          <span>Entrada de Lote</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Nova Entrada de Lote</h1>
      </div>
      <LoteForm insumos={(insumos ?? []) as any} fornecedores={(fornecedores ?? []) as any} />
    </div>
  )
}
