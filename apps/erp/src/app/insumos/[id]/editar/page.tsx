import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import InsumoForm from '@/components/estoque/InsumoForm'

export default async function EditarInsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: insumo } = await supabase.from('insumos').select('*').eq('id', id).single()
  if (!insumo) notFound()

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/insumos" className="hover:text-blue-600">Insumos</Link>
          <span className="mx-2">›</span>
          <Link href={`/insumos/${insumo.id}`} className="hover:text-blue-600">{insumo.codigo}</Link>
          <span className="mx-2">›</span>
          <span>Editar</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Editar Insumo</h1>
      </div>
      <InsumoForm
        insumoId={insumo.id}
        inicial={{
          codigo:          insumo.codigo,
          descricao:       insumo.descricao,
          tipo:            insumo.tipo,
          unidade:         insumo.unidade,
          estoque_minimo:  insumo.estoque_minimo  != null ? String(insumo.estoque_minimo)  : '',
          estoque_maximo:  insumo.estoque_maximo  != null ? String(insumo.estoque_maximo)  : '',
          ponto_reposicao: insumo.ponto_reposicao != null ? String(insumo.ponto_reposicao) : '',
          lead_time_dias:  String(insumo.lead_time_dias ?? 7),
          observacoes:     insumo.observacoes ?? '',
          status:          insumo.status,
        }}
      />
    </div>
  )
}
