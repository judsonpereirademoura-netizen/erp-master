import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

const TIPO_BADGE: Record<string, string> = {
  fabricado:  'bg-blue-100 text-blue-700',
  comprado:   'bg-purple-100 text-purple-700',
  beneficiado:'bg-amber-100 text-amber-700',
}

const POLITICA_LABEL: Record<string, string> = {
  make_to_order: 'Sob Pedido',
  make_to_stock: 'Para Estoque',
  kanban:        'Kanban',
}

const STATUS_BADGE: Record<string, string> = {
  ativo:   'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-500',
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; status?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 25
  const offset = (pagina - 1) * porPagina

  let query = supabase
    .from('produtos')
    .select('id, codigo, descricao, unidade, tipo, politica_estoque, estoque_minimo, visivel_ecommerce, status', { count: 'exact' })
    .order('codigo')
    .range(offset, offset + porPagina - 1)

  if (params.q)     query = query.or(`codigo.ilike.%${params.q}%,descricao.ilike.%${params.q}%`)
  if (params.tipo)  query = query.eq('tipo', params.tipo)
  if (params.status) query = query.eq('status', params.status)

  const { data: produtos, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} produto{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/produtos/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          + Novo Produto
        </Link>
      </div>

      <form method="GET" className="flex gap-3 flex-wrap">
        <input name="q" defaultValue={params.q} placeholder="Buscar por código ou descrição..."
          className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select name="tipo" defaultValue={params.tipo ?? ''}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos os tipos</option>
          <option value="fabricado">Fabricado</option>
          <option value="comprado">Comprado</option>
          <option value="beneficiado">Beneficiado</option>
        </select>
        <select name="status" defaultValue={params.status ?? ''}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <button type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          Buscar
        </button>
        {(params.q || params.tipo || params.status) && (
          <a href="/produtos" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline self-center">Limpar</a>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Política</th>
                <th className="px-4 py-3 font-medium">Un.</th>
                <th className="px-4 py-3 font-medium">E-commerce</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(produtos ?? []).map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{p.codigo}</td>
                  <td className="px-4 py-3">
                    <Link href={`/produtos/${p.id}`} className="text-blue-600 hover:underline font-medium">
                      {p.descricao}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[p.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{POLITICA_LABEL[p.politica_estoque] ?? p.politica_estoque}</td>
                  <td className="px-4 py-3 text-gray-600">{p.unidade}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${p.visivel_ecommerce ? 'text-green-600' : 'text-gray-400'}`}>
                      {p.visivel_ecommerce ? '✓ Sim' : '— Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/produtos/${p.id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Ver">👁</Link>
                      <Link href={`/produtos/${p.id}/editar`} className="text-gray-400 hover:text-amber-600 transition-colors" title="Editar">✏️</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {(produtos ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    {params.q || params.tipo || params.status
                      ? 'Nenhum produto encontrado para os filtros aplicados.'
                      : 'Nenhum produto cadastrado ainda.'}
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
                <Link href={`/produtos?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.tipo ? { tipo: params.tipo } : {}), ...(params.status ? { status: params.status } : {}), pagina: String(pagina - 1) })}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Anterior</Link>
              )}
              {pagina < totalPaginas && (
                <Link href={`/produtos?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.tipo ? { tipo: params.tipo } : {}), ...(params.status ? { status: params.status } : {}), pagina: String(pagina + 1) })}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Próxima →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
