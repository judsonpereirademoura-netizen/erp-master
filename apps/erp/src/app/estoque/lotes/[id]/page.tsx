import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const TIPO_MOV: Record<string, { label: string; cor: string; sinal: string }> = {
  entrada:        { label: 'Entrada',         cor: 'text-green-600',  sinal: '+' },
  saida_producao: { label: 'Saída Produção',  cor: 'text-red-600',    sinal: '-' },
  saida_venda:    { label: 'Saída Venda',     cor: 'text-red-600',    sinal: '-' },
  ajuste_positivo:{ label: 'Ajuste +',        cor: 'text-blue-600',   sinal: '+' },
  ajuste_negativo:{ label: 'Ajuste -',        cor: 'text-amber-600',  sinal: '-' },
  transferencia:  { label: 'Transferência',   cor: 'text-purple-600', sinal: '↕' },
  perda:          { label: 'Perda',           cor: 'text-red-700',    sinal: '-' },
  devolucao:      { label: 'Devolução',       cor: 'text-green-700',  sinal: '+' },
}

export default async function LoteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: lote } = await supabase
    .from('lotes_insumo')
    .select(`
      *,
      insumos ( codigo, descricao, tipo, unidade ),
      fornecedores ( razao_social, nome_fantasia, cnpj )
    `)
    .eq('id', id)
    .single()

  if (!lote) notFound()

  const { data: movimentacoes } = await supabase
    .from('movimentacoes_estoque')
    .select('*, usuarios(nome)')
    .eq('lote_id', id)
    .order('criado_em', { ascending: false })
    .limit(20)

  const hoje = new Date()
  const vencido = lote.data_validade && new Date(lote.data_validade) < hoje

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/estoque" className="hover:text-blue-600">Estoque</Link>
            <span className="mx-2">›</span>
            <span className="font-mono">{lote.codigo_lote}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900 font-mono">{lote.codigo_lote}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
              lote.bloqueado ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
            }`}>
              {lote.bloqueado ? 'Bloqueado' : 'Disponível'}
            </span>
            {!lote.laudo_aprovado && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                Laudo Pendente
              </span>
            )}
            {vencido && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                Vencido
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Movimentações */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Histórico de Movimentações</h2>
            {(movimentacoes ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Data</th>
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium text-right">Quantidade</th>
                      <th className="pb-2 font-medium text-right">Saldo Ant.</th>
                      <th className="pb-2 font-medium text-right">Saldo Pos.</th>
                      <th className="pb-2 font-medium">Usuário</th>
                      <th className="pb-2 font-medium">Documento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(movimentacoes ?? []).map((m: any) => {
                      const t = TIPO_MOV[m.tipo] ?? { label: m.tipo, cor: 'text-gray-600', sinal: '' }
                      return (
                        <tr key={m.id}>
                          <td className="py-2 text-xs text-gray-500">
                            {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2">
                            <span className={`text-xs font-medium ${t.cor}`}>{t.label}</span>
                          </td>
                          <td className={`py-2 text-right font-medium ${t.cor}`}>
                            {t.sinal}{Number(m.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                          </td>
                          <td className="py-2 text-right text-gray-500 text-xs">
                            {Number(m.saldo_anterior).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                          </td>
                          <td className="py-2 text-right text-gray-700 text-xs font-medium">
                            {Number(m.saldo_posterior).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                          </td>
                          <td className="py-2 text-xs text-gray-500">
                            {(m.usuarios as any)?.nome ?? '—'}
                          </td>
                          <td className="py-2 text-xs text-gray-400">{m.documento ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* QR Code info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">QR Code do Lote</h2>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 overflow-x-auto">{lote.qr_code}</pre>
            <p className="text-xs text-gray-400 mt-2">
              Use um scanner de QR Code para identificar este lote no chão de fábrica.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Saldos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Saldos</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Total do Lote</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {Number(lote.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {(lote.insumos as any)?.unidade}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Disponível</dt>
                <dd className={`text-lg font-semibold ${Number(lote.quantidade_disp) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(lote.quantidade_disp).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {(lote.insumos as any)?.unidade}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Reservado</dt>
                <dd className="text-sm font-medium text-amber-600">
                  {Number(lote.quantidade_res).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {(lote.insumos as any)?.unidade}
                </dd>
              </div>
              {lote.custo_unitario && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Custo Unitário</dt>
                  <dd className="text-sm text-gray-700">
                    {Number(lote.custo_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Detalhes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Detalhes</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Insumo</dt>
                <dd className="text-gray-900 font-medium">{(lote.insumos as any)?.codigo}</dd>
                <dd className="text-gray-500 text-xs">{(lote.insumos as any)?.descricao}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Fornecedor</dt>
                <dd className="text-gray-900">
                  {(lote.fornecedores as any)?.nome_fantasia ?? (lote.fornecedores as any)?.razao_social ?? <span className="text-gray-400">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Localização</dt>
                <dd className="text-gray-900 font-mono text-xs">{lote.localizacao ?? <span className="text-gray-400">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Data de Entrada</dt>
                <dd className="text-gray-900">{new Date(lote.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR')}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Data de Validade</dt>
                <dd className={`font-medium ${vencido ? 'text-red-600' : 'text-gray-900'}`}>
                  {lote.data_validade
                    ? new Date(lote.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')
                    : <span className="text-gray-400 font-normal">Sem validade</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">NF de Entrada</dt>
                <dd className="text-gray-900 font-mono text-xs">{lote.nota_fiscal_entrada ?? <span className="text-gray-400 font-normal">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Laudo de Qualidade</dt>
                <dd className={`font-medium ${lote.laudo_aprovado ? 'text-green-600' : 'text-amber-600'}`}>
                  {lote.laudo_aprovado ? '✓ Aprovado' : '⏳ Pendente'}
                </dd>
              </div>
              {lote.bloqueado && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Motivo do Bloqueio</dt>
                  <dd className="text-red-600 text-xs">{lote.motivo_bloqueio ?? 'Não informado'}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
