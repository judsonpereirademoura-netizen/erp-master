import { createServerClient } from '@erp-master/database'
import { cookies } from 'next/headers'

async function getDashboardData() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const hoje = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [pedidos, alertasEstoque, aprovacoes, ncs] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, numero, status, valor_total, clientes(razao_social), criado_em')
      .gte('criado_em', inicioMes)
      .order('criado_em', { ascending: false })
      .limit(10),

    supabase
      .from('alertas_estoque')
      .select('id, tipo_acao, insumos(descricao), produtos(descricao), criado_em')
      .eq('resolvido', false)
      .order('criado_em', { ascending: false })
      .limit(5),

    supabase
      .from('aprovacoes_pendentes')
      .select('id, tipo, dados_contexto, expira_em')
      .eq('status', 'pendente')
      .order('criado_em', { ascending: false }),

    supabase
      .from('nao_conformidades' as 'pedidos')
      .select('id')
      .eq('status', 'aberta' as 'rascunho')
      .limit(1),
  ])

  // Faturamento do mês
  const faturamentoMes = (pedidos.data ?? [])
    .filter(p => ['expedido', 'entregue'].includes(p.status))
    .reduce((acc, p) => acc + Number(p.valor_total ?? 0), 0)

  // Pedidos em aberto
  const pedidosAbertos = (pedidos.data ?? [])
    .filter(p => !['entregue', 'cancelado', 'devolvido'].includes(p.status))
    .length

  return {
    faturamentoMes,
    pedidosAbertos,
    alertasEstoque: alertasEstoque.data ?? [],
    aprovacoesPendentes: aprovacoes.data ?? [],
    pedidosRecentes: pedidos.data ?? [],
  }
}

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function DashboardPage() {
  const dados = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Faturamento do Mês"
          valor={formatBRL(dados.faturamentoMes)}
          icone="💰"
          cor="blue"
        />
        <KpiCard
          titulo="Pedidos em Aberto"
          valor={String(dados.pedidosAbertos)}
          icone="📦"
          cor={dados.pedidosAbertos > 20 ? 'amber' : 'green'}
        />
        <KpiCard
          titulo="Alertas de Estoque"
          valor={String(dados.alertasEstoque.length)}
          icone="⚠️"
          cor={dados.alertasEstoque.length > 0 ? 'red' : 'green'}
        />
        <KpiCard
          titulo="Aprovações Pendentes"
          valor={String(dados.aprovacoesPendentes.length)}
          icone="🔔"
          cor={dados.aprovacoesPendentes.length > 0 ? 'amber' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Aprovações pendentes */}
        {dados.aprovacoesPendentes.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              🔔 Aprovações Pendentes
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                {dados.aprovacoesPendentes.length}
              </span>
            </h2>
            <div className="space-y-2">
              {dados.aprovacoesPendentes.map(ap => (
                <div key={ap.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{ap.tipo.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">
                      Expira: {new Date(ap.expira_em).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <a
                    href={`/aprovacoes/${ap.id}`}
                    className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700"
                  >
                    Analisar
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alertas de estoque */}
        {dados.alertasEstoque.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              ⚠️ Estoque Crítico
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                {dados.alertasEstoque.length}
              </span>
            </h2>
            <div className="space-y-2">
              {dados.alertasEstoque.map(al => {
                const item = (al.insumos as Record<string,string> | null)?.descricao
                  ?? (al.produtos as Record<string,string> | null)?.descricao
                  ?? 'Item desconhecido'
                return (
                  <div key={al.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-800">{item}</p>
                    <span className="text-xs text-red-600 font-medium">{al.tipo_acao.replace(/_/g, ' ')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pedidos recentes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Pedidos Recentes</h2>
            <a href="/pedidos" className="text-sm text-blue-600 hover:underline">Ver todos →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Nº</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                  <th className="pb-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dados.pedidosRecentes.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5">
                      <a href={`/pedidos/${p.id}`} className="text-blue-600 hover:underline font-medium">
                        #{p.numero}
                      </a>
                    </td>
                    <td className="py-2.5 text-gray-700">
                      {(p.clientes as Record<string,string> | null)?.razao_social ?? '-'}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatBRL(Number(p.valor_total))}
                    </td>
                    <td className="py-2.5 text-gray-500">
                      {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

function KpiCard({ titulo, valor, icone, cor }: {
  titulo: string; valor: string; icone: string
  cor: 'blue' | 'green' | 'amber' | 'red'
}) {
  const cores = {
    blue:  'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    amber: 'bg-amber-50 border-amber-100',
    red:   'bg-red-50 border-red-100',
  }
  return (
    <div className={`rounded-xl border p-5 ${cores[cor]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{titulo}</span>
        <span className="text-xl">{icone}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{valor}</p>
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  rascunho:             { label: 'Rascunho',       className: 'bg-gray-100 text-gray-600' },
  aguardando_aprovacao: { label: 'Aguard. Aprova.', className: 'bg-yellow-100 text-yellow-700' },
  aprovado:             { label: 'Aprovado',        className: 'bg-blue-100 text-blue-700' },
  em_separacao:         { label: 'Em Separação',    className: 'bg-indigo-100 text-indigo-700' },
  em_producao:          { label: 'Em Produção',     className: 'bg-purple-100 text-purple-700' },
  em_expedicao:         { label: 'Em Expedição',    className: 'bg-orange-100 text-orange-700' },
  expedido:             { label: 'Expedido',        className: 'bg-teal-100 text-teal-700' },
  entregue:             { label: 'Entregue',        className: 'bg-green-100 text-green-700' },
  cancelado:            { label: 'Cancelado',       className: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}
