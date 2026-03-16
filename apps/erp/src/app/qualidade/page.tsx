import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

const STATUS_NC: Record<string, { label: string; className: string }> = {
  aberta:           { label: 'Aberta',           className: 'bg-red-100 text-red-700' },
  em_analise:       { label: 'Em Análise',        className: 'bg-blue-100 text-blue-700' },
  aguardando_capa:  { label: 'Aguard. CAPA',     className: 'bg-amber-100 text-amber-700' },
  em_capa:          { label: 'Em CAPA',          className: 'bg-purple-100 text-purple-700' },
  verificando:      { label: 'Verificando',       className: 'bg-indigo-100 text-indigo-700' },
  encerrada:        { label: 'Encerrada',         className: 'bg-green-100 text-green-700' },
}

const GRAVIDADE_COR: Record<string, string> = {
  menor:   'bg-gray-100 text-gray-600',
  maior:   'bg-amber-100 text-amber-700',
  critica: 'bg-red-100 text-red-700',
}

export default async function QualidadePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; gravidade?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 20
  const offset = (pagina - 1) * porPagina

  let query = supabase
    .from('nao_conformidades')
    .select(`
      id, numero, titulo, tipo_origem, categoria, gravidade, status,
      prazo_capa, requer_recall, criado_em,
      responsavel:responsavel_id ( nome ),
      os:os_id ( numero ),
      clientes ( razao_social, nome_fantasia )
    `, { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range(offset, offset + porPagina - 1)

  if (params.status)    query = query.eq('status', params.status)
  if (params.gravidade) query = query.eq('gravidade', params.gravidade)

  const { data: ncs, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  // KPIs
  const { data: allNcs } = await supabase
    .from('nao_conformidades')
    .select('status, gravidade, prazo_capa')

  const hoje = new Date()
  const abertas   = (allNcs ?? []).filter(n => n.status !== 'encerrada').length
  const criticas  = (allNcs ?? []).filter(n => n.gravidade === 'critica' && n.status !== 'encerrada').length
  const vencidasSemCapa = (allNcs ?? []).filter(n =>
    n.prazo_capa && new Date(n.prazo_capa) < hoje &&
    !['encerrada', 'verificando'].includes(n.status)
  ).length
  const encerradas = (allNcs ?? []).filter(n => n.status === 'encerrada').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Qualidade</h1>
          <p className="text-sm text-gray-500 mt-0.5">Não-Conformidades — IFS Pack Secure / ISO 9001:2015</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/qualidade/medicoes"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            🎨 Medições de Cor
          </Link>
          <Link href="/qualidade/ncs/novo"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            + Abrir NC
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'NCs em Aberto',    valor: String(abertas),          cor: abertas > 0 ? 'amber' : 'green', icon: '🔴' },
          { titulo: 'Críticas',         valor: String(criticas),         cor: criticas > 0 ? 'red' : 'green',  icon: '⚠️' },
          { titulo: 'CAPA Vencida',     valor: String(vencidasSemCapa),  cor: vencidasSemCapa > 0 ? 'red' : 'green', icon: '⏰' },
          { titulo: 'Encerradas',       valor: String(encerradas),       cor: 'green', icon: '✅' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'red'   ? 'bg-red-50 border-red-100' :
            k.cor === 'amber' ? 'bg-amber-50 border-amber-100' :
            'bg-green-50 border-green-100'
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
        <Link href="/qualidade"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            !params.status ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}>
          Todas
        </Link>
        {Object.entries(STATUS_NC).filter(([k]) => k !== 'encerrada').map(([key, cfg]) => (
          <Link key={key} href={`/qualidade?status=${key}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              params.status === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}>
            {cfg.label}
          </Link>
        ))}
        <Link href="/qualidade?status=encerrada"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            params.status === 'encerrada' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}>
          Encerradas
        </Link>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">NC</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Gravidade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                <th className="px-4 py-3 font-medium">Prazo CAPA</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(ncs ?? []).map((nc: any) => {
                const s = STATUS_NC[nc.status] ?? { label: nc.status, className: 'bg-gray-100 text-gray-600' }
                const vencida = nc.prazo_capa && new Date(nc.prazo_capa) < hoje && nc.status !== 'encerrada'
                return (
                  <tr key={nc.id} className={`hover:bg-gray-50 transition-colors ${vencida ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <Link href={`/qualidade/ncs/${nc.id}`} className="text-blue-600 hover:underline font-medium font-mono">
                        NC-{String(nc.numero).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-gray-900">{nc.titulo}</span>
                        {nc.requer_recall && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">RECALL</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {nc.os?.numero ? `OS-${String(nc.os.numero).padStart(4, '0')}` :
                       nc.clientes   ? (nc.clientes.nome_fantasia ?? nc.clientes.razao_social) :
                       nc.tipo_origem.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${GRAVIDADE_COR[nc.gravidade] ?? 'bg-gray-100 text-gray-600'}`}>
                        {nc.gravidade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{(nc.responsavel as any)?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {nc.prazo_capa ? (
                        <span className={vencida ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {vencida ? '⚠️ ' : ''}{new Date(nc.prazo_capa + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/qualidade/ncs/${nc.id}`} className="text-gray-400 hover:text-blue-600 transition-colors">👁</Link>
                    </td>
                  </tr>
                )
              })}
              {(ncs ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Nenhuma não-conformidade encontrada.
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
                <Link href={`/qualidade?pagina=${pagina - 1}${params.status ? `&status=${params.status}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Anterior</Link>
              )}
              {pagina < totalPaginas && (
                <Link href={`/qualidade?pagina=${pagina + 1}${params.status ? `&status=${params.status}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Próxima →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
