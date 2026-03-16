import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho:    { label: 'Rascunho',    className: 'bg-gray-100 text-gray-600' },
  enviada:     { label: 'Enviada',     className: 'bg-blue-100 text-blue-700' },
  autorizada:  { label: 'Autorizada',  className: 'bg-green-100 text-green-700' },
  cancelada:   { label: 'Cancelada',   className: 'bg-red-100 text-red-600' },
  denegada:    { label: 'Denegada',    className: 'bg-orange-100 text-orange-700' },
  inutilizada: { label: 'Inutilizada', className: 'bg-gray-100 text-gray-500' },
}

const STATUS_TABS = ['rascunho', 'enviada', 'autorizada', 'cancelada'] as const

export default async function FiscalPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const pagina = Number(params.pagina ?? 1)
  const porPagina = 20
  const offset = (pagina - 1) * porPagina

  // KPI data — fetch all nfe statuses + current month totals
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  const [kpisRes, listaRes] = await Promise.all([
    supabase
      .from('nfe')
      .select('status, valor_total, emitida_em'),

    (() => {
      let q = supabase
        .from('nfe')
        .select(`
          id, numero, serie, chave_acesso, status, valor_total, emitida_em,
          xml_url, danfe_url,
          pedidos ( id, numero )
        `, { count: 'exact' })
        .order('criado_em', { ascending: false })
        .range(offset, offset + porPagina - 1)

      if (params.status) q = q.eq('status', params.status)

      return q
    })(),
  ])

  const allNfe = kpisRes.data ?? []
  const totalEmitidas  = allNfe.filter(n => n.status === 'autorizada').length
  const totalPendentes = allNfe.filter(n => ['rascunho', 'enviada'].includes(n.status)).length
  const totalCanceladas = allNfe.filter(n => n.status === 'cancelada').length
  const valorMes = allNfe
    .filter(n => n.status === 'autorizada' && n.emitida_em && n.emitida_em >= inicioMes)
    .reduce((s, n) => s + Number(n.valor_total ?? 0), 0)

  const { data: nfes, count } = listaRes
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fiscal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Notas Fiscais Eletrônicas (NF-e)</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Autorizadas',   valor: String(totalEmitidas),   icon: '✅', cor: totalEmitidas > 0 ? 'green' : 'gray' },
          { titulo: 'Pendentes',     valor: String(totalPendentes),  icon: '⏳', cor: totalPendentes > 0 ? 'blue' : 'gray' },
          { titulo: 'Canceladas',    valor: String(totalCanceladas), icon: '🚫', cor: totalCanceladas > 0 ? 'red' : 'gray' },
          { titulo: 'Valor do Mês',  valor: formatBRL(valorMes),     icon: '💰', cor: 'green' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'blue'  ? 'bg-blue-50 border-blue-100' :
            k.cor === 'green' ? 'bg-green-50 border-green-100' :
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
        <Link
          href="/fiscal"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            !params.status
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          Todas
        </Link>
        {STATUS_TABS.map(key => (
          <Link
            key={key}
            href={`/fiscal?status=${key}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              params.status === key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {STATUS_CONFIG[key].label}
          </Link>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Numero / Serie</th>
                <th className="px-4 py-3 font-medium">Chave de Acesso</th>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Valor Total</th>
                <th className="px-4 py-3 font-medium">Emitida em</th>
                <th className="px-4 py-3 font-medium">Documentos</th>
                <th className="px-4 py-3 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(nfes ?? []).map((nfe: any) => {
                const s = STATUS_CONFIG[nfe.status] ?? { label: nfe.status, className: 'bg-gray-100 text-gray-600' }
                const chave = nfe.chave_acesso
                  ? `${String(nfe.chave_acesso).slice(0, 8)}...${String(nfe.chave_acesso).slice(-8)}`
                  : '—'
                const pedido = nfe.pedidos as any

                return (
                  <tr key={nfe.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/fiscal/${nfe.id}`} className="text-blue-600 hover:underline font-medium">
                        {String(nfe.numero ?? '—').padStart(6, '0')}
                        {nfe.serie ? <span className="text-gray-400 text-xs ml-1">/ {nfe.serie}</span> : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500" title={nfe.chave_acesso ?? undefined}>
                      {chave}
                    </td>
                    <td className="px-4 py-3">
                      {pedido?.id ? (
                        <Link href={`/pedidos/${pedido.id}`} className="text-blue-600 hover:underline text-xs">
                          #{pedido.numero}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {nfe.valor_total != null ? formatBRL(Number(nfe.valor_total)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {nfe.emitida_em
                        ? new Date(nfe.emitida_em).toLocaleDateString('pt-BR')
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {nfe.xml_url && (
                          <a href={nfe.xml_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline font-medium">XML</a>
                        )}
                        {nfe.danfe_url && (
                          <a href={nfe.danfe_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline font-medium">DANFE</a>
                        )}
                        {!nfe.xml_url && !nfe.danfe_url && (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/fiscal/${nfe.id}`} className="text-gray-400 hover:text-blue-600 transition-colors">›</Link>
                    </td>
                  </tr>
                )
              })}
              {(nfes ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Nenhuma NF-e encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {pagina} de {totalPaginas} — {total} registros
            </p>
            <div className="flex gap-2">
              {pagina > 1 && (
                <Link
                  href={`/fiscal?pagina=${pagina - 1}${params.status ? `&status=${params.status}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  &larr; Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link
                  href={`/fiscal?pagina=${pagina + 1}${params.status ? `&status=${params.status}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Proxima &rarr;
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
