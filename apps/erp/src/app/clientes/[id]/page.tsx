import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

const STATUS_PEDIDO: Record<string, { label: string; className: string }> = {
  rascunho:             { label: 'Rascunho',        className: 'bg-gray-100 text-gray-600' },
  aguardando_aprovacao: { label: 'Aguard. Aprova.', className: 'bg-yellow-100 text-yellow-700' },
  aprovado:             { label: 'Aprovado',         className: 'bg-blue-100 text-blue-700' },
  em_producao:          { label: 'Em Produção',      className: 'bg-purple-100 text-purple-700' },
  expedido:             { label: 'Expedido',         className: 'bg-teal-100 text-teal-700' },
  entregue:             { label: 'Entregue',         className: 'bg-green-100 text-green-700' },
  cancelado:            { label: 'Cancelado',        className: 'bg-red-100 text-red-700' },
}

export default async function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const [{ data: cliente }, { data: contatos }, { data: enderecos }, { data: pedidos }] = await Promise.all([
    supabase.from('clientes').select(`
      *, representantes:representante_id ( id, nome, usuarios:usuario_id ( nome ) )
    `).eq('id', id).single(),
    supabase.from('contatos').select('*').eq('entidade_tipo', 'cliente').eq('entidade_id', id).order('principal', { ascending: false }),
    supabase.from('enderecos').select('*').eq('entidade_tipo', 'cliente').eq('entidade_id', id).order('principal', { ascending: false }),
    supabase.from('pedidos').select('id, numero, status, valor_total, criado_em').eq('cliente_id', id).order('criado_em', { ascending: false }).limit(10),
  ])

  if (!cliente) notFound()

  const faturamentoTotal = (pedidos ?? [])
    .filter((p: any) => ['expedido', 'entregue'].includes(p.status))
    .reduce((s: number, p: any) => s + Number(p.valor_total ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/clientes" className="hover:text-blue-600">Clientes</Link>
          <span>/</span>
          <span className="text-gray-700">{cliente.razao_social}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{cliente.razao_social}</h1>
            {cliente.nome_fantasia && <p className="text-gray-500">{cliente.nome_fantasia}</p>}
          </div>
          <div className="flex gap-2">
            <Link href={`/clientes/${id}/editar`}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors">
              ✏️ Editar
            </Link>
            <Link href={`/pedidos/novo?cliente=${id}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              + Novo Pedido
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Dados cadastrais */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Dados Cadastrais</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'CNPJ', value: cliente.cnpj ?? '—' },
                { label: 'CPF', value: cliente.cpf ?? '—' },
                { label: 'IE', value: cliente.ie ?? '—' },
                { label: 'IM', value: cliente.im ?? '—' },
                { label: 'Regime Tributário', value: (cliente.regime_tributario ?? '').replace(/_/g, ' ') },
                { label: 'Segmento', value: cliente.segmento ?? '—' },
                { label: 'Status', value: cliente.status },
                { label: 'Permite Parcial', value: cliente.permite_parcial ? 'Sim' : 'Não' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-gray-800 font-medium mt-0.5 capitalize">{value}</p>
                </div>
              ))}
              {cliente.observacoes && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Observações</p>
                  <p className="text-gray-700 mt-0.5">{cliente.observacoes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contatos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Contatos</h2>
              <Link href={`/clientes/${id}/contatos/novo`}
                className="text-sm text-blue-600 hover:underline">+ Adicionar</Link>
            </div>
            {(contatos ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum contato cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {(contatos ?? []).map((c: any) => (
                  <div key={c.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 text-sm">{c.nome}</p>
                        {c.principal && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Principal</span>}
                        {c.recebe_nfe && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">NF-e</span>}
                      </div>
                      {c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {c.email && <span>📧 {c.email}</span>}
                        {c.telefone && <span>📞 {c.telefone}</span>}
                        {c.whatsapp && <span>💬 {c.whatsapp}</span>}
                      </div>
                    </div>
                    <Link href={`/clientes/${id}/contatos/${c.id}/editar`}
                      className="text-gray-400 hover:text-blue-600 text-xs">editar</Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Endereços */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Endereços</h2>
              <Link href={`/clientes/${id}/enderecos/novo`}
                className="text-sm text-blue-600 hover:underline">+ Adicionar</Link>
            </div>
            {(enderecos ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum endereço cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(enderecos ?? []).map((e: any) => (
                  <div key={e.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-700 capitalize">{e.tipo}</span>
                      {e.principal && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Principal</span>}
                    </div>
                    <p className="text-gray-600">{e.logradouro}, {e.numero}{e.complemento ? ` — ${e.complemento}` : ''}</p>
                    <p className="text-gray-600">{e.bairro} — {e.cidade}/{e.uf}</p>
                    <p className="text-gray-400 text-xs">CEP {e.cep}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pedidos recentes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Pedidos Recentes</h2>
              <Link href={`/pedidos?cliente=${id}`} className="text-sm text-blue-600 hover:underline">Ver todos →</Link>
            </div>
            {(pedidos ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum pedido para este cliente.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Nº</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Valor</th>
                    <th className="pb-2 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(pedidos ?? []).map((p: any) => {
                    const s = STATUS_PEDIDO[p.status] ?? { label: p.status, className: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={p.id}>
                        <td className="py-2">
                          <Link href={`/pedidos/${p.id}`} className="text-blue-600 hover:underline font-medium">#{p.numero}</Link>
                        </td>
                        <td className="py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>
                        </td>
                        <td className="py-2 text-right font-medium">{formatBRL(Number(p.valor_total))}</td>
                        <td className="py-2 text-gray-500">{formatDate(p.criado_em)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">
          {/* KPIs financeiros */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Financeiro</h2>
            {[
              { label: 'Limite de Crédito', value: formatBRL(Number(cliente.limite_credito)), cor: 'text-gray-800' },
              { label: 'Saldo de Crédito', value: formatBRL(Number(cliente.saldo_credito)), cor: Number(cliente.saldo_credito) < 0 ? 'text-red-600' : 'text-green-700' },
              { label: 'Faturamento Total', value: formatBRL(faturamentoTotal), cor: 'text-blue-700' },
              { label: 'Pedidos no período', value: String((pedidos ?? []).length), cor: 'text-gray-800' },
            ].map(({ label, value, cor }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-semibold ${cor}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Representante */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Representante</h2>
            {(cliente.representantes as any)?.usuarios?.nome ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  {(cliente.representantes as any).usuarios.nome[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{(cliente.representantes as any).usuarios.nome}</p>
                  <p className="text-xs text-gray-400">Representante</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sem representante vinculado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
