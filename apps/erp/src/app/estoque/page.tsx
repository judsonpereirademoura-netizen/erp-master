import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; bloqueado?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 25
  const offset = (pagina - 1) * porPagina

  let query = supabase
    .from('lotes_insumo')
    .select(`
      id, codigo_lote, qr_code, quantidade, quantidade_disp, quantidade_res,
      data_entrada, data_validade, laudo_aprovado, bloqueado, localizacao, criado_em,
      insumos ( codigo, descricao, tipo, unidade ),
      fornecedores ( razao_social, nome_fantasia )
    `, { count: 'exact' })
    .order('data_entrada', { ascending: false })
    .range(offset, offset + porPagina - 1)

  if (params.q)        query = query.or(`codigo_lote.ilike.%${params.q}%,insumos.descricao.ilike.%${params.q}%`)
  if (params.bloqueado === 'true')  query = query.eq('bloqueado', true)
  if (params.bloqueado === 'false') query = query.eq('bloqueado', false)

  const { data: lotes, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  // KPIs
  const { data: kpis } = await supabase
    .from('lotes_insumo')
    .select('quantidade_disp, bloqueado, data_validade')

  const hoje = new Date()
  const em30dias = new Date(hoje)
  em30dias.setDate(em30dias.getDate() + 30)

  const totalDisponivel = (kpis ?? []).filter(l => !l.bloqueado).reduce((s, l) => s + Number(l.quantidade_disp), 0)
  const lotesVencendo   = (kpis ?? []).filter(l => l.data_validade && new Date(l.data_validade) <= em30dias && new Date(l.data_validade) >= hoje).length
  const lotesBloqueados = (kpis ?? []).filter(l => l.bloqueado).length
  const lotesSemLaudo   = (kpis ?? []).filter(l => !l.laudo_aprovado).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle de lotes de insumos</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/insumos"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Insumos
          </Link>
          <Link href="/estoque/lotes/novo"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            + Entrada de Lote
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Total Disponível',   valor: totalDisponivel.toLocaleString('pt-BR', { maximumFractionDigits: 2 }), cor: 'blue', icon: '📦' },
          { titulo: 'Lotes a Vencer',     valor: String(lotesVencendo),  cor: lotesVencendo > 0 ? 'amber' : 'green', icon: '⏰' },
          { titulo: 'Lotes Bloqueados',   valor: String(lotesBloqueados), cor: lotesBloqueados > 0 ? 'red' : 'green', icon: '🔒' },
          { titulo: 'Aguard. Laudo',      valor: String(lotesSemLaudo),  cor: lotesSemLaudo > 0 ? 'amber' : 'green', icon: '📋' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'blue'  ? 'bg-blue-50 border-blue-100' :
            k.cor === 'green' ? 'bg-green-50 border-green-100' :
            k.cor === 'amber' ? 'bg-amber-50 border-amber-100' :
            'bg-red-50 border-red-100'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">{k.titulo}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <form method="GET" className="flex gap-3 flex-wrap">
        <input name="q" defaultValue={params.q} placeholder="Buscar por lote ou insumo..."
          className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select name="bloqueado" defaultValue={params.bloqueado ?? ''}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos os lotes</option>
          <option value="false">Disponíveis</option>
          <option value="true">Bloqueados</option>
        </select>
        <button type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          Buscar
        </button>
        {(params.q || params.bloqueado) && (
          <a href="/estoque" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline self-center">Limpar</a>
        )}
      </form>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Lote</th>
                <th className="px-4 py-3 font-medium">Insumo</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Localização</th>
                <th className="px-4 py-3 font-medium text-right">Disponível</th>
                <th className="px-4 py-3 font-medium text-right">Reservado</th>
                <th className="px-4 py-3 font-medium">Validade</th>
                <th className="px-4 py-3 font-medium">Laudo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(lotes ?? []).map((l: any) => {
                const vencido  = l.data_validade && new Date(l.data_validade) < hoje
                const vencendo = l.data_validade && new Date(l.data_validade) <= em30dias && !vencido
                return (
                  <tr key={l.id} className={`hover:bg-gray-50 transition-colors ${l.bloqueado ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <Link href={`/estoque/lotes/${l.id}`} className="text-blue-600 hover:underline font-mono text-xs font-medium">
                        {l.codigo_lote}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-900">{(l.insumos as any)?.codigo}</span>
                        <p className="text-xs text-gray-500">{(l.insumos as any)?.descricao}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {(l.fornecedores as any)?.nome_fantasia ?? (l.fornecedores as any)?.razao_social ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{l.localizacao ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {Number(l.quantidade_disp).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {(l.insumos as any)?.unidade}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {Number(l.quantidade_res) > 0 ? Number(l.quantidade_res).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {l.data_validade ? (
                        <span className={`text-xs font-medium ${vencido ? 'text-red-600' : vencendo ? 'text-amber-600' : 'text-gray-600'}`}>
                          {vencido ? '⚠️ ' : vencendo ? '⏰ ' : ''}
                          {new Date(l.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${l.laudo_aprovado ? 'text-green-600' : 'text-amber-600'}`}>
                        {l.laudo_aprovado ? '✓ Aprovado' : '⏳ Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        l.bloqueado ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                      }`}>
                        {l.bloqueado ? 'Bloqueado' : 'Disponível'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/estoque/lotes/${l.id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Ver lote">👁</Link>
                    </td>
                  </tr>
                )
              })}
              {(lotes ?? []).length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    Nenhum lote encontrado.
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
                <Link href={`/estoque?pagina=${pagina - 1}${params.q ? `&q=${params.q}` : ''}${params.bloqueado ? `&bloqueado=${params.bloqueado}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Anterior</Link>
              )}
              {pagina < totalPaginas && (
                <Link href={`/estoque?pagina=${pagina + 1}${params.q ? `&q=${params.q}` : ''}${params.bloqueado ? `&bloqueado=${params.bloqueado}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Próxima →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
