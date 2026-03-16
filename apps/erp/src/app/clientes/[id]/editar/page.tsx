import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ClienteForm from '@/components/clientes/ClienteForm'

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const [{ data: cliente }, { data: reps }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('representantes').select('id, usuarios:usuario_id ( nome )').eq('ativo', true),
  ])

  if (!cliente) notFound()

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
          <Link href={`/clientes/${id}`} className="hover:text-blue-600">{cliente.razao_social}</Link>
          <span>/</span>
          <span className="text-gray-700">Editar</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Editar Cliente</h1>
      </div>
      <ClienteForm
        clienteId={id}
        representantes={representantes}
        inicial={{
          cnpj:              cliente.cnpj ?? '',
          cpf:               cliente.cpf ?? '',
          razao_social:      cliente.razao_social,
          nome_fantasia:     cliente.nome_fantasia ?? '',
          ie:                cliente.ie ?? '',
          im:                cliente.im ?? '',
          regime_tributario: cliente.regime_tributario,
          segmento:          cliente.segmento ?? '',
          limite_credito:    String(cliente.limite_credito),
          permite_parcial:   cliente.permite_parcial,
          requer_aprovacao:  cliente.requer_aprovacao,
          representante_id:  cliente.representante_id ?? '',
          observacoes:       cliente.observacoes ?? '',
          status:            cliente.status,
        }}
      />
    </div>
  )
}
