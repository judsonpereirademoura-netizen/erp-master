import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_CONFIG: Record<string, { label: string; className: string; next?: string; nextLabel?: string }> = {
  rascunho:             { label: 'Rascunho',        className: 'bg-gray-100 text-gray-600',    next: 'aguardando_aprovacao', nextLabel: 'Enviar para Aprovação' },
  aguardando_aprovacao: { label: 'Aguard. Aprova.', className: 'bg-yellow-100 text-yellow-700', next: 'aprovado',             nextLabel: 'Aprovar Pedido' },
  aprovado:             { label: 'Aprovado',         className: 'bg-blue-100 text-blue-700',    next: 'em_separacao',         nextLabel: 'Iniciar Separação' },
  em_separacao:         { label: 'Em Separação',     className: 'bg-indigo-100 text-indigo-700', next: 'em_producao',          nextLabel: 'Enviar para Produção' },
  em_producao:          { label: 'Em Produção',      className: 'bg-purple-100 text-purple-700', next: 'expedido',             nextLabel: 'Confirmar Expedição' },
  expedido:             { label: 'Expedido',         className: 'bg-teal-100 text-teal-700',    next: 'entregue',             nextLabel: 'Confirmar Entrega' },
  entregue:             { label: 'Entregue',         className: 'bg-green-100 text-green-700' },
  cancelado:            { label: 'Cancelado',        className: 'bg-red-100 text-red-600' },
}

const CANAL_LABEL: Record<string, string> = {
  interno:        'Interno',
  portal_cliente: 'Portal do Cliente',
  ecommerce:      'E-commerce',
  representante:  'Representante',
  whatsapp:       'WhatsApp',
}

export default async function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: pedido } = await supabase
    .from('pedidos')
    .select(`
      *,
      clientes ( id, razao_social, nome_fantasia, cnpj ),
      aprovado_por:usuarios!pedidos_aprovado_por_fkey ( nome ),
      itens_pedido (
        id, quantidade, preco_unitario, desconto_pct, valor_total, observacoes,
        produtos ( codigo, descricao, unidade )
      )
    `)
    .eq('id', id)
    .single()

  if (!pedido) notFound()

  const s = STATUS_CONFIG[pedido.status] ?? { label: pedido.status, className: 'bg-gray-100 text-gray-600' }
  const itens = (pedido.itens_pedido ?? []) as any[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/pedidos" className="hover:text-blue-600">Pedidos</Link>
            <span className="mx-2">›</span>
            <span>#{pedido.numero}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">Pedido #{pedido.numero}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
              {s.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {CANAL_LABEL[pedido.canal] ?? pedido.canal} •{' '}
            {new Date(pedido.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {s.next && (
            <form action={`/api/pedidos/${pedido.id}/status`} method="POST">
              <input type="hidden" name="status" value={s.next} />
              <button type="submit"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                {s.nextLabel} →
              </button>
            </form>
          )}
          {['rascunho', 'aguardando_aprovacao', 'aprovado'].includes(pedido.status) && (
            <Link href={`/pedidos/${pedido.id}/editar`}
              className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              ✏️ Editar
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Itens */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Itens do Pedido</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium text-right">Qtd</th>
                    <th className="pb-2 font-medium text-right">Preço Unit.</th>
                    <th className="pb-2 font-medium text-right">Desc.</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {itens.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-3">
                        <div>
                          <span className="font-medium text-gray-900">{item.produtos?.codigo}</span>
                          <p className="text-xs text-gray-500">{item.produtos?.descricao}</p>
                        </div>
                      </td>
                      <td className="py-3 text-right text-gray-700">
                        {Number(item.quantidade).toLocaleString('pt-BR')} {item.produtos?.unidade}
                      </td>
                      <td className="py-3 text-right text-gray-700">{formatBRL(Number(item.preco_unitario))}</td>
                      <td className="py-3 text-right text-gray-500">{Number(item.desconto_pct).toFixed(1)}%</td>
                      <td className="py-3 text-right font-medium text-gray-900">{formatBRL(Number(item.valor_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totais */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <dl className="space-y-1 text-sm min-w-[240px]">
                <div className="flex justify-between text-gray-600">
                  <dt>Subtotal produtos</dt>
                  <dd className="font-medium">{formatBRL(Number(pedido.valor_produtos))}</dd>
                </div>
                {Number(pedido.desconto_pct) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <dt>Desconto global ({pedido.desconto_pct}%)</dt>
                    <dd className="font-medium">— {formatBRL(Number(pedido.valor_desconto))}</dd>
                  </div>
                )}
                {Number(pedido.valor_frete) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <dt>Frete</dt>
                    <dd className="font-medium">{formatBRL(Number(pedido.valor_frete))}</dd>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 font-semibold text-base pt-1 border-t border-gray-200">
                  <dt>Total</dt>
                  <dd>{formatBRL(Number(pedido.valor_total))}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Observações */}
          {(pedido.observacoes || pedido.observacoes_internas) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Observações</h2>
              {pedido.observacoes && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Para o cliente</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.observacoes}</p>
                </div>
              )}
              {pedido.observacoes_internas && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Internas</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50 p-3 rounded-lg">{pedido.observacoes_internas}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Cliente</h2>
            <div className="space-y-2">
              <Link href={`/clientes/${(pedido.clientes as any)?.id}`}
                className="font-medium text-blue-600 hover:underline block">
                {(pedido.clientes as any)?.nome_fantasia ?? (pedido.clientes as any)?.razao_social}
              </Link>
              {(pedido.clientes as any)?.nome_fantasia && (
                <p className="text-sm text-gray-500">{(pedido.clientes as any)?.razao_social}</p>
              )}
              {(pedido.clientes as any)?.cnpj && (
                <p className="text-xs text-gray-400 font-mono">{(pedido.clientes as any)?.cnpj}</p>
              )}
            </div>
          </div>

          {/* Detalhes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Detalhes</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Canal</dt>
                <dd className="text-gray-900">{CANAL_LABEL[pedido.canal] ?? pedido.canal}</dd>
              </div>
              {pedido.data_entrega_prev && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Entrega Prevista</dt>
                  <dd className="text-gray-900">
                    {new Date(pedido.data_entrega_prev + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              )}
              {pedido.aprovado_em && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Aprovado em</dt>
                  <dd className="text-gray-900">{new Date(pedido.aprovado_em).toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Criado em</dt>
                <dd className="text-gray-900">{new Date(pedido.criado_em).toLocaleDateString('pt-BR')}</dd>
              </div>
            </dl>
          </div>

          {/* Ações rápidas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Ações</h2>
            <div className="space-y-2">
              {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
                <form action={`/api/pedidos/${pedido.id}/status`} method="POST">
                  <input type="hidden" name="status" value="cancelado" />
                  <button type="submit"
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    ✕ Cancelar Pedido
                  </button>
                </form>
              )}
              <Link href={`/pedidos?q=${pedido.numero}`}
                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                🔗 Ver histórico
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
