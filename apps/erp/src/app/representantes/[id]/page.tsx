import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const TIPO_CONFIG: Record<string, { label: string; className: string }> = {
  interno: { label: 'Interno', className: 'bg-blue-100 text-blue-700' },
  externo: { label: 'Externo', className: 'bg-gray-100 text-gray-600' },
  agencia: { label: 'Agência', className: 'bg-purple-100 text-purple-700' },
}

const STATUS_PAGAMENTO_CONFIG: Record<string, { label: string; className: string }> = {
  a_receber: { label: 'A Receber', className: 'bg-amber-100 text-amber-700' },
  pago:      { label: 'Pago',      className: 'bg-green-100 text-green-700' },
  retido:    { label: 'Retido',    className: 'bg-red-100 text-red-600' },
  estornado: { label: 'Estornado', className: 'bg-gray-100 text-gray-500' },
}

const NIVEL_LABEL: Record<number, string> = {
  1: 'Direto',
  2: 'Supervisor',
  3: 'Gerente',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const POR_PAGINA = 20

export default async function RepresentanteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pagina?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const pagina = Math.max(1, Number(sp.pagina ?? 1))
  const offset = (pagina - 1) * POR_PAGINA

  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const [{ data: rep }, { data: comissoes, count }, { data: kpiData }] = await Promise.all([
    supabase
      .from('representantes')
      .select(`
        id, nome, cpf, tipo, comissao_pct, regiao, ativo,
        supervisor:supervisor_id ( id, nome )
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('comissoes')
      .select(`
        id, nivel, base_calculo, percentual, valor, status_pagamento, motivo_retencao, pago_em, criado_em,
        pedidos ( id, numero )
      `, { count: 'exact' })
      .eq('representante_id', id)
      .order('criado_em', { ascending: false })
      .range(offset, offset + POR_PAGINA - 1),

    supabase
      .from('comissoes')
      .select('valor, status_pagamento')
      .eq('representante_id', id),
  ])

  if (!rep) notFound()

  const total = count ?? 0
  const totalPaginas = Math.ceil(total / POR_PAGINA)

  const allKpi = kpiData ?? []
  const kpiAReceber = allKpi
    .filter((c: any) => c.status_pagamento === 'a_receber')
    .reduce((s: number, c: any) => s + Number(c.valor ?? 0), 0)
  const kpiPago = allKpi
    .filter((c: any) => c.status_pagamento === 'pago')
    .reduce((s: number, c: any) => s + Number(c.valor ?? 0), 0)
  const kpiRetido = allKpi
    .filter((c: any) => c.status_pagamento === 'retido')
    .reduce((s: number, c: any) => s + Number(c.valor ?? 0), 0)

  const tipo = TIPO_CONFIG[rep.tipo] ?? { label: rep.tipo, className: 'bg-gray-100 text-gray-600' }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/representantes" className="hover:text-blue-600">Representantes</Link>
          <span>/</span>
          <span className="text-gray-700">{rep.nome}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{rep.nome}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Detalhes e comissões</p>
          </div>
          <div className="flex items-center gap-2">
            {rep.ativo ? (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Ativo
              </span>
            ) : (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                Inativo
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Dados do Representante */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Dados Cadastrais</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Nome', value: rep.nome },
                { label: 'CPF', value: rep.cpf ?? '—' },
                { label: 'Região', value: rep.regiao ?? '—' },
                { label: 'Comissão', value: `${Number(rep.comissao_pct ?? 0).toFixed(2)}%` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-gray-800 font-medium mt-0.5">{value}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Tipo</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${tipo.className}`}>
                  {tipo.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Supervisor</p>
                {(rep.supervisor as any)?.nome ? (
                  <Link
                    href={`/representantes/${(rep.supervisor as any).id}`}
                    className="text-blue-600 hover:underline text-sm font-medium mt-0.5 block"
                  >
                    {(rep.supervisor as any).nome}
                  </Link>
                ) : (
                  <p className="text-gray-400 mt-0.5">—</p>
                )}
              </div>
            </div>
          </div>

          {/* Comissões Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Comissões</h2>
              <span className="text-xs text-gray-400">{total} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 font-medium">Nível</th>
                    <th className="px-4 py-3 font-medium text-right">Base Cálculo</th>
                    <th className="px-4 py-3 font-medium text-right">%</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Pago em</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(comissoes ?? []).map((c: any) => {
                    const sp = STATUS_PAGAMENTO_CONFIG[c.status_pagamento] ?? { label: c.status_pagamento, className: 'bg-gray-100 text-gray-600' }
                    const pedido = c.pedidos as any
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          {pedido?.numero ? (
                            <Link href={`/pedidos/${pedido.id}`} className="text-blue-600 hover:underline font-medium">
                              #{pedido.numero}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {NIVEL_LABEL[Number(c.nivel)] ?? `Nível ${c.nivel}`}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatBRL(Number(c.base_calculo ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {Number(c.percentual ?? 0).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatBRL(Number(c.valor ?? 0))}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sp.className}`}>
                              {sp.label}
                            </span>
                            {c.motivo_retencao && (
                              <p className="text-xs text-gray-400 mt-0.5 max-w-[140px] truncate" title={c.motivo_retencao}>
                                {c.motivo_retencao}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {formatDate(c.pago_em)}
                        </td>
                        <td className="px-4 py-3">
                          {c.status_pagamento === 'a_receber' && (
                            <form action={`/api/representantes/${id}/comissao/${c.id}/pagar`} method="POST">
                              <button
                                type="submit"
                                className="text-xs px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
                              >
                                Marcar pago
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {(comissoes ?? []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        Nenhuma comissão encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPaginas > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Página {pagina} de {totalPaginas} — {total} comissões
                </p>
                <div className="flex gap-2">
                  {pagina > 1 && (
                    <Link
                      href={`/representantes/${id}?pagina=${pagina - 1}`}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      ← Anterior
                    </Link>
                  )}
                  {pagina < totalPaginas && (
                    <Link
                      href={`/representantes/${id}?pagina=${pagina + 1}`}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Próxima →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar KPIs */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Resumo de Comissões</h2>
            {[
              { label: 'A Receber', value: formatBRL(kpiAReceber), cor: kpiAReceber > 0 ? 'text-amber-700' : 'text-gray-600' },
              { label: 'Total Pago', value: formatBRL(kpiPago), cor: 'text-green-700' },
              { label: 'Total Retido', value: formatBRL(kpiRetido), cor: kpiRetido > 0 ? 'text-red-600' : 'text-gray-600' },
            ].map(({ label, value, cor }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-semibold ${cor}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Informações</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipo.className}`}>
                  {tipo.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comissão base</span>
                <span className="font-medium text-gray-800">{Number(rep.comissao_pct ?? 0).toFixed(2)}%</span>
              </div>
              {rep.regiao && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Região</span>
                  <span className="font-medium text-gray-800">{rep.regiao}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
