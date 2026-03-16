import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ApontamentoForm from '@/components/producao/ApontamentoForm'

const STATUS_CONFIG: Record<string, { label: string; className: string; next?: string; nextLabel?: string }> = {
  rascunho:     { label: 'Rascunho',     className: 'bg-gray-100 text-gray-600',    next: 'aguardando',   nextLabel: 'Liberar para Produção' },
  aguardando:   { label: 'Aguardando',   className: 'bg-yellow-100 text-yellow-700', next: 'em_andamento', nextLabel: 'Iniciar Produção' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-700',    next: 'concluida',    nextLabel: 'Concluir OS' },
  pausada:      { label: 'Pausada',      className: 'bg-amber-100 text-amber-700',  next: 'em_andamento', nextLabel: 'Retomar' },
  concluida:    { label: 'Concluída',    className: 'bg-green-100 text-green-700' },
  cancelada:    { label: 'Cancelada',    className: 'bg-red-100 text-red-600' },
}

const TIPO_APONTAMENTO_LABEL: Record<string, string> = {
  setup:      'Setup',
  producao:   'Produção',
  parada:     'Parada',
  manutencao: 'Manutenção',
  limpeza:    'Limpeza',
}

export default async function OSDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: os } = await supabase
    .from('ordens_producao')
    .select(`
      *,
      produtos ( codigo, descricao, unidade ),
      maquinas ( codigo, nome, capacidade_m_min ),
      operador:operador_id ( nome ),
      supervisor:supervisor_id ( nome ),
      pedidos ( numero )
    `)
    .eq('id', id)
    .single()

  if (!os) notFound()

  const [{ data: apontamentos }, { data: medicoes }, { data: ncs }] = await Promise.all([
    supabase
      .from('apontamentos')
      .select('*, operador:operador_id(nome)')
      .eq('os_id', id)
      .order('inicio', { ascending: false })
      .limit(15),
    supabase
      .from('medicoes_cor')
      .select('*')
      .eq('os_id', id)
      .order('criado_em', { ascending: false })
      .limit(10),
    supabase
      .from('nao_conformidades')
      .select('id, numero, titulo, status, gravidade, criado_em')
      .eq('os_id', id)
      .order('criado_em', { ascending: false }),
  ])

  const s = STATUS_CONFIG[os.status] ?? { label: os.status, className: 'bg-gray-100 text-gray-600' }
  const pct = Number(os.quantidade_prevista) > 0
    ? Math.min(100, (Number(os.quantidade_produzida) / Number(os.quantidade_prevista)) * 100)
    : 0

  // Calcular OEE da OS
  const totalProduzido = Number(os.quantidade_produzida)
  const totalAprovado  = Number(os.quantidade_aprovada)
  const qualidadeOEE   = totalProduzido > 0 ? totalAprovado / totalProduzido : 0

  const tempoProducao = (apontamentos ?? [])
    .filter((a: any) => a.tipo === 'producao' && a.duracao_min)
    .reduce((s: number, a: any) => s + (a.duracao_min ?? 0), 0)

  const tempoTotal = (apontamentos ?? [])
    .filter((a: any) => a.duracao_min)
    .reduce((s: number, a: any) => s + (a.duracao_min ?? 0), 0)

  const disponibilidade = tempoTotal > 0 ? tempoProducao / tempoTotal : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/producao" className="hover:text-blue-600">Produção</Link>
            <span className="mx-2">›</span>
            <span>OS-{String(os.numero).padStart(4, '0')}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">OS-{String(os.numero).padStart(4, '0')}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
              {s.label}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              P{os.prioridade}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.next && (
            <form action={`/api/producao/${os.id}/status`} method="POST">
              <input type="hidden" name="status" value={s.next} />
              <button type="submit"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                {s.nextLabel} →
              </button>
            </form>
          )}
          {os.status === 'em_andamento' && (
            <form action={`/api/producao/${os.id}/status`} method="POST">
              <input type="hidden" name="status" value="pausada" />
              <button type="submit"
                className="inline-flex items-center gap-2 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                ⏸ Pausar
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progresso */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Progresso de Produção</h2>
              <span className="text-sm font-medium text-gray-700">{pct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className={`h-3 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {Number(os.quantidade_prevista).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-500">Previsto ({(os.produtos as any)?.unidade})</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-blue-600">
                  {Number(os.quantidade_produzida).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-500">Produzido</p>
              </div>
              <div>
                <p className={`text-2xl font-semibold ${Number(os.quantidade_aprovada) < Number(os.quantidade_produzida) ? 'text-amber-600' : 'text-green-600'}`}>
                  {Number(os.quantidade_aprovada).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-500">Aprovado (QC)</p>
              </div>
            </div>
          </div>

          {/* OEE Parcial */}
          {(apontamentos ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">OEE Parcial desta OS</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Disponibilidade', valor: disponibilidade, desc: `${tempoProducao}min prod / ${tempoTotal}min total` },
                  { label: 'Performance', valor: 0, desc: 'Aguardando dados IoT' },
                  { label: 'Qualidade', valor: qualidadeOEE, desc: `${Number(os.quantidade_aprovada).toLocaleString('pt-BR')} / ${Number(os.quantidade_produzida).toLocaleString('pt-BR')}` },
                ].map(k => (
                  <div key={k.label} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          stroke={k.valor >= 0.85 ? '#22c55e' : k.valor >= 0.65 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="3"
                          strokeDasharray={`${k.valor * 100} 100`}
                          strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
                        {(k.valor * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-700">{k.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{k.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apontamentos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Apontamentos de Produção</h2>
            </div>

            {['em_andamento', 'pausada'].includes(os.status) && (
              <div className="mb-4">
                <ApontamentoForm osId={os.id} />
              </div>
            )}

            {(apontamentos ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum apontamento registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium">Início</th>
                      <th className="pb-2 font-medium text-right">Produzido</th>
                      <th className="pb-2 font-medium text-right">Refugo</th>
                      <th className="pb-2 font-medium text-right">Duração</th>
                      <th className="pb-2 font-medium">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(apontamentos ?? []).map((a: any) => (
                      <tr key={a.id}>
                        <td className="py-2">
                          <span className={`text-xs font-medium ${
                            a.tipo === 'producao' ? 'text-blue-600' :
                            a.tipo === 'setup'    ? 'text-purple-600' :
                            a.tipo === 'parada'   ? 'text-red-500' : 'text-gray-500'
                          }`}>{TIPO_APONTAMENTO_LABEL[a.tipo] ?? a.tipo}</span>
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {new Date(a.inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2 text-right text-gray-700">
                          {Number(a.quantidade_boa) > 0 ? Number(a.quantidade_boa).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 text-right text-red-500">
                          {Number(a.quantidade_refugo) > 0 ? Number(a.quantidade_refugo).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 text-right text-gray-600 text-xs">
                          {a.duracao_min != null ? `${a.duracao_min}min` : '—'}
                        </td>
                        <td className="py-2 text-xs text-gray-500">{(a.operador as any)?.nome ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Não-Conformidades */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Não-Conformidades</h2>
              <Link href={`/qualidade/ncs/novo?os_id=${os.id}`}
                className="text-sm text-blue-600 hover:underline">+ Abrir NC</Link>
            </div>
            {(ncs ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Nenhuma NC registrada para esta OS.</p>
            ) : (
              <div className="space-y-2">
                {(ncs ?? []).map((nc: any) => (
                  <Link key={nc.id} href={`/qualidade/ncs/${nc.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                    <div>
                      <span className="text-sm font-medium text-gray-900">NC-{String(nc.numero).padStart(4, '0')}</span>
                      <p className="text-xs text-gray-500">{nc.titulo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        nc.gravidade === 'critica' ? 'bg-red-100 text-red-700' :
                        nc.gravidade === 'maior'   ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{nc.gravidade}</span>
                      <span className="text-xs text-gray-500">{nc.status.replace('_', ' ')}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Medições de Cor */}
          {(medicoes ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Medições de Cor (Delta-E)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Ponto</th>
                      <th className="pb-2 font-medium text-right">L*</th>
                      <th className="pb-2 font-medium text-right">a*</th>
                      <th className="pb-2 font-medium text-right">b*</th>
                      <th className="pb-2 font-medium text-right">ΔE</th>
                      <th className="pb-2 font-medium">Resultado</th>
                      <th className="pb-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(medicoes ?? []).map((m: any) => (
                      <tr key={m.id}>
                        <td className="py-2 text-xs text-gray-600 capitalize">{m.ponto_medicao ?? '—'}</td>
                        <td className="py-2 text-right font-mono text-xs">{Number(m.lido_l).toFixed(2)}</td>
                        <td className="py-2 text-right font-mono text-xs">{Number(m.lido_a).toFixed(2)}</td>
                        <td className="py-2 text-right font-mono text-xs">{Number(m.lido_b).toFixed(2)}</td>
                        <td className="py-2 text-right font-mono text-xs font-semibold">
                          {m.delta_e != null ? Number(m.delta_e).toFixed(2) : '—'}
                        </td>
                        <td className="py-2">
                          {m.aprovado === true  && <span className="text-xs font-medium text-green-600">✓ Aprovado</span>}
                          {m.aprovado === false && <span className="text-xs font-medium text-red-600">✗ Reprovado</span>}
                          {m.aprovado === null  && <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="py-2 text-xs text-gray-400">
                          {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Detalhes</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Produto</dt>
                <dd className="font-medium text-gray-900">{(os.produtos as any)?.codigo}</dd>
                <dd className="text-xs text-gray-500">{(os.produtos as any)?.descricao}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Máquina</dt>
                <dd className="text-gray-900">
                  {(os.maquinas as any)?.codigo
                    ? `${(os.maquinas as any).codigo} — ${(os.maquinas as any).nome}`
                    : <span className="text-gray-400">Não definida</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Operador</dt>
                <dd className="text-gray-900">{(os.operador as any)?.nome ?? <span className="text-gray-400">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Supervisor</dt>
                <dd className="text-gray-900">{(os.supervisor as any)?.nome ?? <span className="text-gray-400">—</span>}</dd>
              </div>
              {(os.pedidos as any)?.numero && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Pedido Origem</dt>
                  <dd>
                    <Link href={`/pedidos/${os.pedido_id}`} className="text-blue-600 hover:underline text-sm">
                      #{(os.pedidos as any).numero}
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Setup</dt>
                <dd className="text-gray-900">{os.setup_min} min</dd>
              </div>
              {os.data_inicio && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Início Real</dt>
                  <dd className="text-gray-900">{new Date(os.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</dd>
                </div>
              )}
              {os.data_prev_inicio && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Início Previsto</dt>
                  <dd className="text-gray-900">{new Date(os.data_prev_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
              {os.data_prev_fim && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Fim Previsto</dt>
                  <dd className="text-gray-900">{new Date(os.data_prev_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
            </dl>
          </div>

          {os.observacoes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Observações</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{os.observacoes}</p>
            </div>
          )}

          {/* Ações */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Ações</h2>
            <div className="space-y-2">
              <Link href={`/qualidade/ncs/novo?os_id=${os.id}`}
                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                🔴 Abrir Não-Conformidade
              </Link>
              <Link href={`/qualidade/medicoes/novo?os_id=${os.id}`}
                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                🎨 Registrar Medição de Cor
              </Link>
              {!['concluida', 'cancelada'].includes(os.status) && (
                <form action={`/api/producao/${os.id}/status`} method="POST">
                  <input type="hidden" name="status" value="cancelada" />
                  <button type="submit"
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    ✕ Cancelar OS
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
