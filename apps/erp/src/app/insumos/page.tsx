import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

const TIPO_BADGE: Record<string, string> = {
  substrato: 'bg-blue-100 text-blue-700',
  tinta:     'bg-purple-100 text-purple-700',
  adesivo:   'bg-amber-100 text-amber-700',
  verniz:    'bg-teal-100 text-teal-700',
  solvente:  'bg-orange-100 text-orange-700',
  cilindro:  'bg-gray-100 text-gray-600',
  outro:     'bg-gray-100 text-gray-500',
}

export default async function InsumosPage({
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
    .from('insumos')
    .select('id, codigo, descricao, tipo, unidade, estoque_minimo, estoque_atual, status', { count: 'exact' })
    .order('codigo')
    .range(offset, offset + porPagina - 1)

  if (params.q)    query = query.or(`codigo.ilike.%${params.q}%,descricao.ilike.%${params.q}%`)
  if (params.tipo) query = query.eq('tipo', params.tipo)
  if (params.status) query = query.eq('status', params.status)

  const { data: insumos, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Insumos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} insumo{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/estoque" className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            📦 Estoque
          </Link>
          <Link href="/insumos/novo"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            + Novo Insumo
          </Link>
        </div>
      </div>

      <form method="GET" className="flex gap-3 flex-wrap">
        <input name="q" defaultValue={params.q} placeholder="Buscar por código ou descrição..."
          className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select name="tipo" defaultValue={params.tipo ?? ''}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos os tipos</option>
          <option value="substrato">Substrato</option>
          <option value="tinta">Tinta</option>
          <option value="adesivo">Adesivo</option>
          <option value="verniz">Verniz</option>
          <option value="solvente">Solvente</option>
          <option value="cilindro">Cilindro</option>
          <option value="outro">Outro</option>
        </select>
        <select name="status" defaultValue={params.status ?? ''}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <button type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          Buscar
        </button>
        {(params.q || params.tipo || params.status) && (
          <a href="/insumos" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline self-center">Limpar</a>
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
                <th className="px-4 py-3 font-medium">Un.</th>
                <th className="px-4 py-3 font-medium text-right">Estoque Atual</th>
                <th className="px-4 py-3 font-medium text-right">Estoque Mín.</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(insumos ?? []).map((i: any) => {
                const abaixoMin = i.estoque_minimo != null && Number(i.estoque_atual ?? 0) < Number(i.estoque_minimo)
                return (
                  <tr key={i.id} className={`hover:bg-gray-50 transition-colors ${abaixoMin ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{i.codigo}</td>
                    <td className="px-4 py-3">
                      <Link href={`/insumos/${i.id}`} className="text-blue-600 hover:underline font-medium">
                        {i.descricao}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[i.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {i.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{i.unidade}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${abaixoMin ? 'text-amber-600' : 'text-gray-900'}`}>
                        {abaixoMin ? '⚠️ ' : ''}
                        {Number(i.estoque_atual ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {i.estoque_minimo != null ? Number(i.estoque_minimo).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        i.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/insumos/${i.id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Ver">👁</Link>
                        <Link href={`/insumos/${i.id}/editar`} className="text-gray-400 hover:text-amber-600 transition-colors" title="Editar">✏️</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(insumos ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Nenhum insumo encontrado.
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
                <Link href={`/insumos?pagina=${pagina - 1}${params.q ? `&q=${params.q}` : ''}${params.tipo ? `&tipo=${params.tipo}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Anterior</Link>
              )}
              {pagina < totalPaginas && (
                <Link href={`/insumos?pagina=${pagina + 1}${params.q ? `&q=${params.q}` : ''}${params.tipo ? `&tipo=${params.tipo}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Próxima →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
