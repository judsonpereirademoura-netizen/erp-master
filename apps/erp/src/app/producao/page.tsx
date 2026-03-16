import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho:     { label: 'Rascunho',      className: 'bg-gray-100 text-gray-600' },
  aguardando:   { label: 'Aguardando',    className: 'bg-yellow-100 text-yellow-700' },
  em_andamento: { label: 'Em Andamento',  className: 'bg-blue-100 text-blue-700' },
  pausada:      { label: 'Pausada',       className: 'bg-amber-100 text-amber-700' },
  concluida:    { label: 'Concluída',     className: 'bg-green-100 text-green-700' },
  cancelada:    { label: 'Cancelada',     className: 'bg-red-100 text-red-600' },
}

const PRIORIDADE_COR: Record<number, string> = {
  1: 'text-red-600', 2: 'text-red-500', 3: 'text-orange-500',
  4: 'text-amber-500', 5: 'text-gray-500', 6: 'text-gray-400',
  7: 'text-blue-400', 8: 'text-blue-500', 9: 'text-blue-600', 10: 'text-blue-700',
}

export default async function ProducaoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; maquina?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 20
  const offset = (pagina - 1) * porPagina

  const [ordens, maquinas, kpis] = await Promise.all([
    supabase
      .from('ordens_producao')
      .select(`
        id, numero, status, quantidade_prevista, quantidade_produzida,
        quantidade_aprovada, data_prev_inicio, data_prev_fim, prioridade,
        setup_min, criado_em,
        produtos ( codigo, descricao, unidade ),
        maquinas ( codigo, nome ),
        operador:operador_id ( nome )
      `, { count: 'exact' })
      .order('prioridade', { ascending: true })
      .order('data_prev_inicio', { ascending: true })
      .range(offset, offset + porPagina - 1)
      .eq(params.status ? 'status' : 'id', params.status ? params.status : undefined as any)
      .eq(params.maquina ? 'maquina_id' : 'id', params.maquina ? params.maquina : undefined as any),

    supabase.from('maquinas').select('id, codigo, nome').neq('status', 'inativa').order('codigo'),

    supabase.from('ordens_producao').select('status, quantidade_prevista, quantidade_produzida'),
  ])

  // Aplica filtros manualmente para evitar conflito com .eq encadeados
  let query = supabase
    .from('ordens_producao')
    .select(`
      id, numero, status, quantidade_prevista, quantidade_produzida,
      quantidade_aprovada, data_prev_inicio, data_prev_fim, prioridade,
      setup_min, criado_em,
      produtos ( codigo, descricao, unidade ),
      maquinas ( codigo, nome ),
      operador:operador_id ( nome )
    `, { count: 'exact' })
    .order('prioridade', { ascending: true })
    .order('data_prev_inicio', { ascending: true })
    .range(offset, offset + porPagina - 1)

  if (params.status)  query = query.eq('status', params.status)
  if (params.maquina) query = query.eq('maquina_id', params.maquina)

  const { data: os, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  const allKpis = kpis.data ?? []
  const emAndamento = allKpis.filter(o => o.status === 'em_andamento').length
  const aguardando  = allKpis.filter(o => o.status === 'aguardando').length
  const concluidas  = allKpis.filter(o => o.status === 'concluida').length
  const eficiencia  = allKpis.filter(o => o.status === 'concluida').reduce((s, o) => {
    const eff = Number(o.quantidade_prevista) > 0
      ? Number(o.quantidade_produzida) / Number(o.quantidade_prevista)
      : 0
    return s + eff
  }, 0) / Math.max(concluidas, 1)

  const hoje = new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Produção</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ordens de Serviço — Chão de Fábrica</p>
        </div>
        <Link href="/producao/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          + Nova OS
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Em Andamento', valor: String(emAndamento), icon: '⚙️', cor: emAndamento > 0 ? 'blue' : 'gray' },
          { titulo: 'Aguardando',   valor: String(aguardando),  icon: '⏳', cor: aguardando > 0 ? 'amber' : 'gray' },
          { titulo: 'Concluídas',   valor: String(concluidas),  icon: '✅', cor: 'green' },
          { titulo: 'Eficiência',   valor: `${(eficiencia * 100).toFixed(1)}%`, icon: '📊', cor: eficiencia >= 0.85 ? 'green' : eficiencia >= 0.7 ? 'amber' : 'red' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'blue'  ? 'bg-blue-50 border-blue-100' :
            k.cor === 'green' ? 'bg-green-50 border-green-100' :
            k.cor === 'amber' ? 'bg-amber-50 border-amber-100' :
            k.cor === 'red'   ? 'bg-red-50 border-red-100' :
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

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2">
        <Link href="/producao"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            !params.status ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}>
          Todas
        </Link>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Link key={key} href={`/producao?status=${key}${params.maquina ? `&maquina=${params.maquina}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              params.status === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}>
            {cfg.label}
          </Link>
        ))}
      </div>

      {/* Filtro por máquina */}
      <form method="GET" className="flex gap-3">
        <input type="hidden" name="status" value={params.status ?? ''} />
        <select name="maquina" defaultValue={params.maquina ?? ''}
          onChange={e => (e.target.form as HTMLFormElement).submit()}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todas as máquinas</option>
          {(maquinas.data ?? []).map((m: any) => (
            <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          Filtrar
        </button>
      </form>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium w-8">Pri.</th>
                <th className="px-4 py-3 font-medium">OS</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Máquina</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Previsto</th>
                <th className="px-4 py-3 font-medium text-right">Produzido</th>
                <th className="px-4 py-3 font-medium">Progresso</th>
                <th className="px-4 py-3 font-medium">Prazo</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(os ?? []).map((o: any) => {
                const s = STATUS_CONFIG[o.status] ?? { label: o.status, className: 'bg-gray-100 text-gray-600' }
                const pct = Number(o.quantidade_prevista) > 0
                  ? Math.min(100, (Number(o.quantidade_produzida) / Number(o.quantidade_prevista)) * 100)
                  : 0
                const atrasada = o.data_prev_fim && new Date(o.data_prev_fim) < hoje && !['concluida', 'cancelada'].includes(o.status)
                return (
                  <tr key={o.id} className={`hover:bg-gray-50 transition-colors ${atrasada ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${PRIORIDADE_COR[o.prioridade] ?? 'text-gray-500'}`}>
                        P{o.prioridade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/producao/${o.id}`} className="text-blue-600 hover:underline font-medium">
                        OS-{String(o.numero).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-900">{(o.produtos as any)?.codigo}</span>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{(o.produtos as any)?.descricao}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {(o.maquinas as any)?.codigo ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {Number(o.quantidade_prevista).toLocaleString('pt-BR')} {(o.produtos as any)?.unidade}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {Number(o.quantidade_produzida).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {o.data_prev_fim ? (
                        <span className={atrasada ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {atrasada ? '⚠️ ' : ''}{new Date(o.data_prev_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/producao/${o.id}`} className="text-gray-400 hover:text-blue-600 transition-colors">👁</Link>
                    </td>
                  </tr>
                )
              })}
              {(os ?? []).length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    Nenhuma ordem de produção encontrada.
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
                <Link href={`/producao?pagina=${pagina - 1}${params.status ? `&status=${params.status}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Anterior</Link>
              )}
              {pagina < totalPaginas && (
                <Link href={`/producao?pagina=${pagina + 1}${params.status ? `&status=${params.status}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Próxima →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
