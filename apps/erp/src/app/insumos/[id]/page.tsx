import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const TIPO_BADGE: Record<string, string> = {
  substrato: 'bg-blue-100 text-blue-700',
  tinta:     'bg-purple-100 text-purple-700',
  adesivo:   'bg-amber-100 text-amber-700',
  verniz:    'bg-teal-100 text-teal-700',
  solvente:  'bg-orange-100 text-orange-700',
  cilindro:  'bg-gray-100 text-gray-600',
  outro:     'bg-gray-100 text-gray-500',
}

function Campo({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{valor ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default async function InsumoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: insumo } = await supabase
    .from('insumos')
    .select('*')
    .eq('id', id)
    .single()

  if (!insumo) notFound()

  // Busca lotes ativos deste insumo
  const { data: lotes } = await supabase
    .from('lotes_insumo')
    .select('id, codigo_lote, quantidade_disp, data_validade, bloqueado, localizacao, laudo_aprovado')
    .eq('insumo_id', id)
    .gt('quantidade_disp', 0)
    .eq('bloqueado', false)
    .order('data_entrada', { ascending: true })
    .limit(10)

  const estoqueTotal = (lotes ?? []).reduce((s, l) => s + Number(l.quantidade_disp), 0)
  const abaixoMin = insumo.estoque_minimo != null && estoqueTotal < Number(insumo.estoque_minimo)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/insumos" className="hover:text-blue-600">Insumos</Link>
            <span className="mx-2">›</span>
            <span>{insumo.codigo}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{insumo.descricao}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[insumo.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
              {insumo.tipo}
            </span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${insumo.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {insumo.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/estoque/lotes/novo"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Entrada de Lote
          </Link>
          <Link href={`/insumos/${insumo.id}/editar`}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            ✏️ Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Lotes disponíveis */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Lotes Disponíveis (FIFO)</h2>
              <Link href="/estoque" className="text-sm text-blue-600 hover:underline">Ver estoque completo →</Link>
            </div>
            {(lotes ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum lote disponível no estoque.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Lote</th>
                      <th className="pb-2 font-medium text-right">Disponível</th>
                      <th className="pb-2 font-medium">Localização</th>
                      <th className="pb-2 font-medium">Validade</th>
                      <th className="pb-2 font-medium">Laudo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(lotes ?? []).map((l: any) => (
                      <tr key={l.id}>
                        <td className="py-2">
                          <Link href={`/estoque/lotes/${l.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                            {l.codigo_lote}
                          </Link>
                        </td>
                        <td className="py-2 text-right font-medium text-gray-900">
                          {Number(l.quantidade_disp).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {insumo.unidade}
                        </td>
                        <td className="py-2 text-gray-500 text-xs font-mono">{l.localizacao ?? '—'}</td>
                        <td className="py-2 text-xs text-gray-600">
                          {l.data_validade ? new Date(l.data_validade + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-2">
                          <span className={`text-xs font-medium ${l.laudo_aprovado ? 'text-green-600' : 'text-amber-600'}`}>
                            {l.laudo_aprovado ? '✓' : '⏳'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {insumo.observacoes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Observações</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{insumo.observacoes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Saldo atual */}
          <div className={`rounded-xl border p-5 ${abaixoMin ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-100'}`}>
            <h2 className="font-semibold text-gray-800 mb-3">Saldo em Estoque</h2>
            <p className={`text-3xl font-bold ${abaixoMin ? 'text-amber-700' : 'text-green-700'}`}>
              {estoqueTotal.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{insumo.unidade}</p>
            {abaixoMin && (
              <p className="text-xs text-amber-700 mt-2 font-medium">
                ⚠️ Abaixo do estoque mínimo ({Number(insumo.estoque_minimo).toLocaleString('pt-BR')} {insumo.unidade})
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Detalhes</h2>
            <dl className="grid grid-cols-1 gap-y-4">
              <Campo label="Código" valor={insumo.codigo} />
              <Campo label="Unidade" valor={insumo.unidade} />
              <Campo label="Lead Time" valor={insumo.lead_time_dias != null ? `${insumo.lead_time_dias} dias úteis` : null} />
              <Campo label="Estoque Mínimo" valor={insumo.estoque_minimo != null ? `${Number(insumo.estoque_minimo).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${insumo.unidade}` : null} />
              <Campo label="Estoque Máximo" valor={insumo.estoque_maximo != null ? `${Number(insumo.estoque_maximo).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${insumo.unidade}` : null} />
              <Campo label="Ponto de Reposição" valor={insumo.ponto_reposicao != null ? `${Number(insumo.ponto_reposicao).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${insumo.unidade}` : null} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
