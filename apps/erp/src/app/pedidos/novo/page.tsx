import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import PedidoForm from '@/components/pedidos/PedidoForm'

export default async function NovoPedidoPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const [{ data: clientes }, { data: produtos }] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, razao_social, nome_fantasia')
      .eq('status', 'ativo')
      .order('razao_social'),
    supabase
      .from('produtos')
      .select('id, codigo, descricao, unidade')
      .eq('status', 'ativo')
      .order('codigo'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/pedidos" className="hover:text-blue-600">Pedidos</Link>
          <span className="mx-2">›</span>
          <span>Novo Pedido</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Pedido</h1>
      </div>
      <PedidoForm
        clientes={(clientes ?? []) as any}
        produtos={(produtos ?? []) as any}
      />
    </div>
  )
}
