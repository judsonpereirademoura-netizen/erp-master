import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho:             { label: 'Rascunho',        className: 'bg-gray-100 text-gray-600' },
  aguardando_aprovacao: { label: 'Aguard. Aprova.', className: 'bg-yellow-100 text-yellow-700' },
  aprovado:             { label: 'Aprovado',         className: 'bg-blue-100 text-blue-700' },
  em_separacao:         { label: 'Em Separação',     className: 'bg-indigo-100 text-indigo-700' },
  em_producao:          { label: 'Em Produção',      className: 'bg-purple-100 text-purple-700' },
  expedido:             { label: 'Expedido',         className: 'bg-teal-100 text-teal-700' },
  entregue:             { label: 'Entregue',         className: 'bg-green-100 text-green-700' },
  cancelado:            { label: 'Cancelado',        className: 'bg-red-100 text-red-600' },
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; canal?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 20
  const offset = (pagina - 1) * porPagina

  let query = supabase
    .from('pedidos')
    .select(`
      id, numero, status, canal, valor_total, data_entrega_prev, criado_em,
      clientes ( razao_social, nome_fantasia )
    `, { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range(offset, offset + porPagina - 1)

  if (params.status) query = query.eq('status', params.status)
  if (params.canal)  query = query.eq('canal', params.canal)
  if (params.q)      query = query.ilike('numero::text', `%${params.q}%`)

  const { data: pedidos, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  // Contadores por status
  const { data: contadores } = await supabase
    .from('pedidos')
    .select('status')

  const porStatus = (contadores ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} pedido{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/pedidos/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          + Novo Pedido
        </Link>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <Link href="/pedidos"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            !params.status ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}>
          Todos ({(contadores ?? []).length})
        </Link>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Link key={key} href={`/pedidos?status=${key}${params.canal ? `&canal=${params.canal}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              params.status === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}>
            {cfg.label} {porStatus[key] ? `(${porStatus[key]})` : '(0)'}
          </Link>
        ))}
      </div>

      {/* Filtros */}
      <form method="GET" className="flex gap-3 flex-wrap">
        <input name="q" defaultValue={params.q} placeholder="Buscar por número..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="hidden" name="status" value={params.status ?? ''} />
        <select name="canal" defaultValue={params.canal ?? ''}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos os canais</option>
          <option value="interno">Interno</option>
          <option value="portal_cliente">Portal Cliente</option>
          <option value="ecommerce">E-commerce</option>
          <option value="representante">Representante</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <button type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          Buscar
        </button>
        {(params.q || params.canal) && (
          <a href={params.status ? `/pedidos?status=${params.status}` : '/pedidos'}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline self-center">
            Limpar
          </a>
        )}
      </form>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Nº</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Canal</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Entrega Prev.</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(pedidos ?? []).map((p: any) => {
                const s = STATUS_CONFIG[p.status] ?? { label: p.status, className: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/pedidos/${p.id}`} className="text-blue-600 hover:underline font-medium">
                        #{p.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(p.clientes as any)?.nome_fantasia ?? (p.clientes as any)?.razao_social ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 capitalize">{p.canal?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {p.data_entrega_prev
                        ? new Date(p.data_entrega_prev + 'T00:00:00').toLocaleDateString('pt-BR')
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatBRL(Number(p.valor_total ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/pedidos/${p.id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Ver pedido">
                        👁
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(pedidos ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Página {pagina} de {totalPaginas} — {total} registros</p>
            <div className="flex gap-2">
              {pagina > 1 && (
                <Link href={`/pedidos?pagina=${pagina - 1}${params.status ? `&status=${params.status}` : ''}${params.canal ? `&canal=${params.canal}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Anterior</Link>
              )}
              {pagina < totalPaginas && (
                <Link href={`/pedidos?pagina=${pagina + 1}${params.status ? `&status=${params.status}` : ''}${params.canal ? `&canal=${params.canal}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Próxima →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
