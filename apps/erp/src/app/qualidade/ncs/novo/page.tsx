import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import NCForm from '@/components/qualidade/NCForm'

export default async function NovaNcPage({
  searchParams,
}: {
  searchParams: Promise<{ os_id?: string; pedido_id?: string; cliente_id?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const [{ data: produtos }, { data: ordens }, { data: pedidos }, { data: clientes }, { data: lotes }, { data: usuarios }] =
    await Promise.all([
      supabase.from('produtos').select('id, codigo, descricao').eq('status', 'ativo').order('codigo').limit(200),
      supabase.from('ordens_producao').select('id, numero').not('status', 'in', '("cancelada")').order('numero', { ascending: false }).limit(100),
      supabase.from('pedidos').select('id, numero').not('status', 'in', '("cancelado","devolvido")').order('numero', { ascending: false }).limit(100),
      supabase.from('clientes').select('id, razao_social, nome_fantasia').eq('status', 'ativo').order('razao_social').limit(200),
      supabase.from('lotes_insumo').select('id, codigo_lote').eq('bloqueado', false).order('criado_em', { ascending: false }).limit(100),
      supabase.from('usuarios').select('id, nome').eq('status', 'ativo').in('perfil', ['analista_qualidade','supervisor_producao','gerente_comercial','admin']).order('nome'),
    ])

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/qualidade" className="hover:text-red-600">Qualidade</Link>
          <span className="mx-2">›</span>
          <span>Abrir NC</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Nova Não-Conformidade</h1>
      </div>
      <NCForm
        produtos={(produtos ?? []) as any}
        ordens={(ordens ?? []) as any}
        pedidos={(pedidos ?? []) as any}
        clientes={(clientes ?? []) as any}
        lotes={(lotes ?? []) as any}
        usuarios={(usuarios ?? []) as any}
        osPre={params.os_id}
        pedidoPre={params.pedido_id}
        clientePre={params.cliente_id}
      />
    </div>
  )
}
