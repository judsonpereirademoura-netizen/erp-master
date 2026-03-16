import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  aberta:            { label: 'Aberta',            className: 'bg-red-100 text-red-700' },
  em_andamento:      { label: 'Em Andamento',       className: 'bg-blue-100 text-blue-700' },
  aguardando_peca:   { label: 'Aguard. Peça',      className: 'bg-amber-100 text-amber-700' },
  concluida:         { label: 'Concluída',          className: 'bg-green-100 text-green-700' },
  cancelada:         { label: 'Cancelada',          className: 'bg-gray-100 text-gray-500' },
}

const TIPO_CFG: Record<string, { label: string; className: string }> = {
  preventiva: { label: 'Preventiva', className: 'bg-blue-50 text-blue-700' },
  corretiva:  { label: 'Corretiva',  className: 'bg-red-50 text-red-700' },
  preditiva:  { label: 'Preditiva',  className: 'bg-purple-50 text-purple-700' },
  melhoria:   { label: 'Melhoria',   className: 'bg-green-50 text-green-700' },
}

export default async function ManutencaoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tipo?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 20

  let query = supabase
    .from('ordens_manutencao')
    .select(`
      id, numero, titulo, tipo, status, prioridade, custo_total,
      data_abertura, data_prev_conclusao, data_conclusao,
      maquinas ( codigo, nome ),
      tecnico:tecnico_id ( nome )
    `, { count: 'exact' })
    .order('prioridade', { ascending: true })
    .order('data_abertura', { ascending: false })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1)

  if (params.status) query = query.eq('status', params.status)
  if (params.tipo)   query = query.eq('tipo', params.tipo)

  const { data: ordens, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  const { data: allOm } = await supabase.from('ordens_manutencao').select('status, tipo, custo_total')
  const hoje = new Date()
  const abertas       = (allOm ?? []).filter(o => o.status === 'aberta').length
  const emAndamento   = (allOm ?? []).filter(o => o.status === 'em_andamento').length
  const preventivas   = (allOm ?? []).filter(o => o.tipo === 'preventiva').length
  const custoTotal    = (allOm ?? []).reduce((s, o) => s + Number(o.custo_total ?? 0), 0)

  const { data: planos } = await supabase
    .from('planos_manutencao')
    .select('id, titulo, proxima_execucao, maquinas(codigo, nome)')
    .eq('ativo', true)
    .order('proxima_execucao')
    .limit(5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manutenção</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ordens de manutenção e planos preventivos</p>
        </div>
        <Link href="/manutencao/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          + Nova OM
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Abertas',      valor: String(abertas),     cor: abertas > 0 ? 'red' : 'green',  icon: '🔴' },
          { titulo: 'Em Andamento', valor: String(emAndamento), cor: emAndamento > 0 ? 'blue' : 'gray', icon: '⚙️' },
          { titulo: 'Preventivas',  valor: String(preventivas), cor: 'blue',  icon: '📅' },
          { titulo: 'Custo Total',  valor: `R$ ${custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cor: 'gray', icon: '💰' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'red'  ? 'bg-red-50 border-red-100'    :
            k.cor === 'blue' ? 'bg-blue-50 border-blue-100'  :
            k.cor === 'green'? 'bg-green-50 border-green-100':
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">{k.titulo}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{k.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ordens */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {[['', 'Todas'], ...Object.entries(STATUS_CFG).map(([k, v]) => [k, v.label])].map(([key, label]) => (
              <Link key={key} href={`/manutencao${key ? `?status=${key}` : ''}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  (params.status ?? '') === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}>{label}</Link>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">OM</th>
                    <th className="px-4 py-3 font-medium">Máquina</th>
                    <th className="px-4 py-3 font-medium">Título</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Técnico</th>
                    <th className="px-4 py-3 font-medium text-right">Custo</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(ordens ?? []).map((o: any) => {
                    const s = STATUS_CFG[o.status] ?? { label: o.status, className: 'bg-gray-100 text-gray-600' }
                    const t = TIPO_CFG[o.tipo] ?? { label: o.tipo, className: 'bg-gray-100 text-gray-600' }
                    const atrasada = o.data_prev_conclusao && new Date(o.data_prev_conclusao) < hoje && !['concluida','cancelada'].includes(o.status)
                    return (
                      <tr key={o.id} className={`hover:bg-gray-50 ${atrasada ? 'bg-red-50/20' : ''}`}>
                        <td className="px-4 py-3">
                          <Link href={`/manutencao/${o.id}`} className="text-blue-600 hover:underline font-medium">
                            OM-{String(o.numero).padStart(4, '0')}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-700">{(o.maquinas as any)?.codigo ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-900">
                          <span className="line-clamp-1">{o.titulo}</span>
                          {atrasada && <span className="text-xs text-red-500 block">⚠️ Prazo vencido</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.className}`}>{t.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{(o.tecnico as any)?.nome ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-gray-700">
                          {Number(o.custo_total ?? 0) > 0
                            ? `R$ ${Number(o.custo_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/manutencao/${o.id}`} className="text-gray-400 hover:text-blue-600">👁</Link>
                        </td>
                      </tr>
                    )
                  })}
                  {(ordens ?? []).length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Nenhuma ordem encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex justify-between">
                <p className="text-sm text-gray-500">Página {pagina} de {totalPaginas}</p>
                <div className="flex gap-2">
                  {pagina > 1 && <Link href={`/manutencao?pagina=${pagina-1}`} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">← Anterior</Link>}
                  {pagina < totalPaginas && <Link href={`/manutencao?pagina=${pagina+1}`} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Próxima →</Link>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Próximas preventivas */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Próximas Preventivas</h2>
            {(planos ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum plano cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {(planos ?? []).map((p: any) => {
                  const vencida = p.proxima_execucao && new Date(p.proxima_execucao) < hoje
                  const dias = p.proxima_execucao
                    ? Math.ceil((new Date(p.proxima_execucao + 'T00:00:00').getTime() - hoje.getTime()) / 86400000)
                    : null
                  return (
                    <div key={p.id} className={`rounded-lg p-3 border ${vencida ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                      <p className="text-sm font-medium text-gray-800">{p.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{(p.maquinas as any)?.codigo} — {(p.maquinas as any)?.nome}</p>
                      {dias !== null && (
                        <p className={`text-xs font-medium mt-1 ${vencida ? 'text-red-600' : dias <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {vencida ? `⚠️ Vencida há ${Math.abs(dias)} dias` : dias === 0 ? 'Hoje' : `Em ${dias} dias`}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
