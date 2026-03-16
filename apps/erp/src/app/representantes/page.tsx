import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

const TIPO_CONFIG: Record<string, { label: string; className: string }> = {
  interno: { label: 'Interno', className: 'bg-blue-100 text-blue-700' },
  externo: { label: 'Externo', className: 'bg-gray-100 text-gray-600' },
  agencia: { label: 'Agência', className: 'bg-purple-100 text-purple-700' },
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function RepresentantesPage({
  searchParams,
}: {
  searchParams: Promise<{ ativo?: string; tipo?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59).toISOString()

  // Build representantes query with optional filters
  let query = supabase
    .from('representantes')
    .select(`
      id, nome, cpf, tipo, comissao_pct, regiao, ativo,
      supervisor:supervisor_id ( nome )
    `)
    .order('nome')

  if (params.ativo === 'true') query = query.eq('ativo', true)
  else if (params.ativo === 'false') query = query.eq('ativo', false)

  if (params.tipo) query = query.eq('tipo', params.tipo)

  const [{ data: representantes }, { data: kpiComissoes }, { data: kpiMes }] = await Promise.all([
    query,

    // All commissions for KPI totals
    supabase
      .from('comissoes')
      .select('valor, status_pagamento'),

    // Commissions paid this month + reps with sales this month
    supabase
      .from('comissoes')
      .select('representante_id, valor, status_pagamento, pago_em')
      .gte('pago_em', inicioMes)
      .lte('pago_em', fimMes),
  ])

  const allComissoes = kpiComissoes ?? []
  const totalAtivos = (representantes ?? []).filter((r: any) => r.ativo).length
  const aReceber = allComissoes
    .filter((c: any) => c.status_pagamento === 'a_receber')
    .reduce((s: number, c: any) => s + Number(c.valor ?? 0), 0)

  const pagasMes = (kpiMes ?? [])
    .filter((c: any) => c.status_pagamento === 'pago')
    .reduce((s: number, c: any) => s + Number(c.valor ?? 0), 0)

  const repsComVendasMes = new Set(
    (kpiMes ?? []).map((c: any) => c.representante_id)
  ).size

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Representantes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Equipe de vendas e comissões</p>
        </div>
        <Link
          href="/representantes/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          + Novo Representante
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            titulo: 'Representantes Ativos',
            valor: String(totalAtivos),
            cor: totalAtivos > 0 ? 'blue' : 'gray',
          },
          {
            titulo: 'Comissões a Receber',
            valor: formatBRL(aReceber),
            cor: aReceber > 0 ? 'amber' : 'gray',
          },
          {
            titulo: 'Pagas no Mês',
            valor: formatBRL(pagasMes),
            cor: pagasMes > 0 ? 'green' : 'gray',
          },
          {
            titulo: 'Reps c/ Vendas no Mês',
            valor: String(repsComVendasMes),
            cor: repsComVendasMes > 0 ? 'blue' : 'gray',
          },
        ].map((k) => (
          <div
            key={k.titulo}
            className={`rounded-xl border p-5 ${
              k.cor === 'blue'  ? 'bg-blue-50 border-blue-100' :
              k.cor === 'green' ? 'bg-green-50 border-green-100' :
              k.cor === 'amber' ? 'bg-amber-50 border-amber-100' :
              'bg-gray-50 border-gray-200'
            }`}
          >
            <p className="text-xs text-gray-600 mb-2">{k.titulo}</p>
            <p className="text-2xl font-semibold text-gray-900">{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Ativo filter */}
        <div className="flex gap-1.5">
          {[
            { label: 'Todos', value: '' },
            { label: 'Ativos', value: 'true' },
            { label: 'Inativos', value: 'false' },
          ].map((opt) => (
            <Link
              key={opt.value}
              href={`/representantes?${new URLSearchParams({
                ...(opt.value ? { ativo: opt.value } : {}),
                ...(params.tipo ? { tipo: params.tipo } : {}),
              }).toString()}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                (params.ativo ?? '') === opt.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        {/* Tipo filter */}
        <div className="flex gap-1.5">
          <Link
            href={`/representantes?${new URLSearchParams({
              ...(params.ativo ? { ativo: params.ativo } : {}),
            }).toString()}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              !params.tipo
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            Todos os tipos
          </Link>
          {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
            <Link
              key={key}
              href={`/representantes?${new URLSearchParams({
                ...(params.ativo ? { ativo: params.ativo } : {}),
                tipo: key,
              }).toString()}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                params.tipo === key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {cfg.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Região</th>
                <th className="px-4 py-3 font-medium text-right">Comissão %</th>
                <th className="px-4 py-3 font-medium">Supervisor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(representantes ?? []).map((r: any) => {
                const tipo = TIPO_CONFIG[r.tipo] ?? { label: r.tipo, className: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/representantes/${r.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {r.nome}
                      </Link>
                      {r.cpf && <p className="text-xs text-gray-400">{r.cpf}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tipo.className}`}>
                        {tipo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.regiao ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {Number(r.comissao_pct ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {(r.supervisor as any)?.nome ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.ativo ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/representantes/${r.id}`} className="text-gray-400 hover:text-blue-600 transition-colors text-xs">
                        Ver detalhes →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(representantes ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Nenhum representante encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
