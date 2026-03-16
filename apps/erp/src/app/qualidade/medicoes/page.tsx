import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function MedicoesPage({
  searchParams,
}: {
  searchParams: Promise<{ os_id?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 30
  const offset = (pagina - 1) * porPagina

  let query = supabase
    .from('medicoes_cor')
    .select(`
      id, lido_l, lido_a, lido_b, ref_l, ref_a, ref_b,
      delta_e, tolerancia, aprovado, ponto_medicao, criado_em,
      ordens:os_id ( numero ),
      produtos ( codigo, descricao ),
      operador:operador_id ( nome )
    `, { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range(offset, offset + porPagina - 1)

  if (params.os_id) query = query.eq('os_id', params.os_id)

  const { data: medicoes, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  // KPIs
  const { data: all } = await supabase.from('medicoes_cor').select('aprovado, delta_e').not('delta_e', 'is', null)
  const totalMed   = (all ?? []).length
  const aprovadas  = (all ?? []).filter((m: any) => m.aprovado === true).length
  const reprovadas = (all ?? []).filter((m: any) => m.aprovado === false).length
  const deltaEMedio = totalMed > 0
    ? (all ?? []).reduce((s: number, m: any) => s + Number(m.delta_e), 0) / totalMed
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/qualidade" className="hover:text-red-600">Qualidade</Link>
            <span className="mx-2">›</span>
            <span>Medições de Cor</span>
          </nav>
          <h1 className="text-2xl font-semibold text-gray-900">Medições de Cor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Espectrofotômetro — CIE Lab / Delta-E</p>
        </div>
        <Link href="/qualidade/medicoes/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          + Nova Medição
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Total de Medições', valor: String(totalMed), cor: 'gray' },
          { titulo: 'Aprovadas',         valor: String(aprovadas),  cor: 'green' },
          { titulo: 'Reprovadas',        valor: String(reprovadas), cor: reprovadas > 0 ? 'red' : 'green' },
          { titulo: 'ΔE Médio',          valor: deltaEMedio.toFixed(2), cor: deltaEMedio <= 2 ? 'green' : deltaEMedio <= 3.5 ? 'amber' : 'red' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'red'   ? 'bg-red-50 border-red-100' :
            k.cor === 'amber' ? 'bg-amber-50 border-amber-100' :
            k.cor === 'green' ? 'bg-green-50 border-green-100' :
            'bg-gray-50 border-gray-200'
          }`}>
            <p className="text-xs text-gray-600 mb-1">{k.titulo}</p>
            <p className="text-2xl font-semibold text-gray-900">{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Produto / OS</th>
                <th className="px-4 py-3 font-medium">Ponto</th>
                <th className="px-4 py-3 font-medium text-right">L*</th>
                <th className="px-4 py-3 font-medium text-right">a*</th>
                <th className="px-4 py-3 font-medium text-right">b*</th>
                <th className="px-4 py-3 font-medium text-right">ΔE</th>
                <th className="px-4 py-3 font-medium text-right">Tol.</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
                <th className="px-4 py-3 font-medium">Operador</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(medicoes ?? []).map((m: any) => (
                <tr key={m.id} className={`hover:bg-gray-50 ${m.aprovado === false ? 'bg-red-50/20' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-800">{(m.produtos as any)?.codigo ?? '—'}</span>
                      {(m.ordens as any)?.numero && (
                        <span className="ml-2 text-xs text-gray-400">
                          OS-{String((m.ordens as any).numero).padStart(4,'0')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize">{m.ponto_medicao ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{Number(m.lido_l).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{Number(m.lido_a).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{Number(m.lido_b).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    {m.delta_e != null ? (
                      <span className={`font-mono text-xs font-semibold ${
                        Number(m.delta_e) <= Number(m.tolerancia) ? 'text-green-700' :
                        Number(m.delta_e) <= Number(m.tolerancia) * 1.5 ? 'text-amber-600' : 'text-red-600'
                      }`}>{Number(m.delta_e).toFixed(2)}</span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">{Number(m.tolerancia).toFixed(1)}</td>
                  <td className="px-4 py-3">
                    {m.aprovado === true  && <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">✓ Aprovado</span>}
                    {m.aprovado === false && <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">✗ Reprovado</span>}
                    {m.aprovado === null  && <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(m.operador as any)?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(m.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
              {(medicoes ?? []).length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    Nenhuma medição registrada.
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
                <Link href={`/qualidade/medicoes?pagina=${pagina - 1}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Anterior</Link>
              )}
              {pagina < totalPaginas && (
                <Link href={`/qualidade/medicoes?pagina=${pagina + 1}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Próxima →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
