import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  rascunho:             { label: 'Rascunho',        className: 'bg-gray-100 text-gray-600' },
  aguardando_aprovacao: { label: 'Aguard. Aprova.', className: 'bg-yellow-100 text-yellow-700' },
  aprovado:             { label: 'Aprovado',         className: 'bg-blue-100 text-blue-700' },
  em_separacao:         { label: 'Em Separação',     className: 'bg-indigo-100 text-indigo-700' },
  em_producao:          { label: 'Em Produção',      className: 'bg-purple-100 text-purple-700' },
  expedido:             { label: 'Expedido',         className: 'bg-teal-100 text-teal-700' },
  entregue:             { label: 'Entregue',         className: 'bg-green-100 text-green-700' },
  cancelado:            { label: 'Cancelado',        className: 'bg-red-100 text-red-700' },
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: pedidos }, { data: alertas }, { data: aprovacoes }] = await Promise.all([
    supabase.from('pedidos').select('id, numero, status, valor_total, criado_em, clientes(razao_social)')
      .gte('criado_em', inicioMes).order('criado_em', { ascending: false }).limit(10),
    supabase.from('alertas_estoque').select('id').eq('resolvido', false),
    supabase.from('aprovacoes_pendentes').select('id, tipo, expira_em').eq('status', 'pendente'),
  ])

  const faturamento = (pedidos ?? [])
    .filter(p => ['expedido','entregue'].includes(p.status))
    .reduce((s, p) => s + Number(p.valor_total ?? 0), 0)

  const pedidosAbertos = (pedidos ?? []).filter(p => !['entregue','cancelado'].includes(p.status)).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Faturamento do Mês', valor: formatBRL(faturamento), icon: '💰', cor: 'blue' },
          { titulo: 'Pedidos em Aberto',  valor: String(pedidosAbertos),  icon: '📦', cor: pedidosAbertos > 20 ? 'amber' : 'green' },
          { titulo: 'Alertas de Estoque', valor: String(alertas?.length ?? 0), icon: '⚠️', cor: (alertas?.length ?? 0) > 0 ? 'red' : 'green' },
          { titulo: 'Aprovações Pend.',   valor: String(aprovacoes?.length ?? 0), icon: '🔔', cor: (aprovacoes?.length ?? 0) > 0 ? 'amber' : 'green' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'blue'  ? 'bg-blue-50 border-blue-100' :
            k.cor === 'green' ? 'bg-green-50 border-green-100' :
            k.cor === 'amber' ? 'bg-amber-50 border-amber-100' :
            'bg-red-50 border-red-100'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">{k.titulo}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{k.valor}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
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
              {(pedidos ?? []).map(p => {
                const s = STATUS_LABELS[p.status] ?? { label: p.status, className: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2.5">
                      <a href={`/pedidos/${p.id}`} className="text-blue-600 hover:underline font-medium">#{p.numero}</a>
                    </td>
                    <td className="py-2.5 text-gray-700">
                      {(p.clientes as {razao_social:string}|null)?.razao_social ?? '-'}
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>
                    </td>
                    <td className="py-2.5 text-right font-medium">{formatBRL(Number(p.valor_total))}</td>
                    <td className="py-2.5 text-gray-500">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</td>
                  </tr>
                )
              })}
              {(pedidos ?? []).length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Nenhum pedido ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
