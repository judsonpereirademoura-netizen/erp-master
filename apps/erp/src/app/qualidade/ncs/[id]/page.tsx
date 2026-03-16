import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CapaForm from '@/components/qualidade/CapaForm'
import ComentarioNC from '@/components/qualidade/ComentarioNC'

const STATUS_NC: Record<string, { label: string; className: string; next?: string; nextLabel?: string }> = {
  aberta:          { label: 'Aberta',          className: 'bg-red-100 text-red-700',      next: 'em_analise',      nextLabel: 'Iniciar Análise' },
  em_analise:      { label: 'Em Análise',       className: 'bg-blue-100 text-blue-700',    next: 'aguardando_capa', nextLabel: 'Solicitar CAPA' },
  aguardando_capa: { label: 'Aguard. CAPA',    className: 'bg-amber-100 text-amber-700',  next: 'em_capa',         nextLabel: 'Iniciar CAPA' },
  em_capa:         { label: 'Em CAPA',         className: 'bg-purple-100 text-purple-700', next: 'verificando',    nextLabel: 'Enviar p/ Verificação' },
  verificando:     { label: 'Verificando',      className: 'bg-indigo-100 text-indigo-700', next: 'encerrada',     nextLabel: 'Encerrar NC' },
  encerrada:       { label: 'Encerrada',        className: 'bg-green-100 text-green-700' },
}

const GRAVIDADE_COR: Record<string, string> = {
  menor:   'bg-gray-100 text-gray-600',
  maior:   'bg-amber-100 text-amber-700',
  critica: 'bg-red-100 text-red-700',
}

const STATUS_CAPA_COR: Record<string, string> = {
  pendente:    'bg-gray-100 text-gray-600',
  em_andamento:'bg-blue-100 text-blue-700',
  concluida:   'bg-green-100 text-green-700',
  verificada:  'bg-emerald-100 text-emerald-700',
  cancelada:   'bg-red-100 text-red-500',
}

const TIPO_CAPA_LABEL: Record<string, string> = {
  contencao:  'Contenção',
  causa_raiz: 'Causa Raiz',
  corretiva:  'Corretiva',
  preventiva: 'Preventiva',
  melhoria:   'Melhoria',
}

export default async function NCDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: nc } = await supabase
    .from('nao_conformidades')
    .select(`
      *,
      responsavel:responsavel_id ( nome ),
      criador:criado_por ( nome ),
      os:os_id ( numero, id ),
      pedidos ( numero, id ),
      clientes ( razao_social, nome_fantasia, id ),
      lotes_insumo ( codigo_lote )
    `)
    .eq('id', id)
    .single()

  if (!nc) notFound()

  const [{ data: acoes }, { data: comentarios }, { data: usuarios }, { data: session }] = await Promise.all([
    supabase.from('acoes_capa').select('*, responsavel:responsavel_id(nome), verificador:verificado_por(nome)').eq('nc_id', id).order('criado_em'),
    supabase.from('nc_comentarios').select('*, usuario:usuario_id(nome)').eq('nc_id', id).order('criado_em'),
    supabase.from('usuarios').select('id, nome').eq('status', 'ativo').in('perfil', ['analista_qualidade','supervisor_producao','gerente_comercial','admin','ceo']).order('nome'),
    supabase.auth.getUser(),
  ])

  // Se NC requer recall, busca lotes potencialmente afetados
  let lotesAfetados: any[] = []
  if (nc.requer_recall && nc.os_id) {
    const { data: mov } = await supabase
      .from('movimentacoes_estoque')
      .select('lote_id, lotes_insumo(codigo_lote, insumo_id, insumos(descricao))')
      .eq('os_id', nc.os_id)
      .eq('tipo', 'baixa_producao')
    lotesAfetados = mov ?? []
  }

  const s = STATUS_NC[nc.status] ?? { label: nc.status, className: 'bg-gray-100 text-gray-600' }
  const capasAbertas = (acoes ?? []).filter((a: any) => !['concluida','verificada','cancelada'].includes(a.status)).length
  const hoje = new Date()

  const usuarioNome = (session?.data?.user as any)?.email ?? 'Usuário'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/qualidade" className="hover:text-red-600">Qualidade</Link>
            <span className="mx-2">›</span>
            <span>NC-{String(nc.numero).padStart(4, '0')}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">
              NC-{String(nc.numero).padStart(4, '0')}
            </h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${GRAVIDADE_COR[nc.gravidade] ?? ''}`}>{nc.gravidade}</span>
            {nc.requer_recall && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                ⚠️ RECALL
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">{nc.titulo}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {s.next && !['encerrada'].includes(nc.status) && (
            <form action={`/api/qualidade/ncs/${nc.id}/status`} method="POST">
              <input type="hidden" name="status" value={s.next} />
              <button className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                {s.nextLabel} →
              </button>
            </form>
          )}
          {nc.status !== 'encerrada' && (
            <form action={`/api/qualidade/ncs/${nc.id}/status`} method="POST">
              <input type="hidden" name="status" value="encerrada" />
              <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                ✓ Encerrar
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descrição */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Descrição</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{nc.descricao}</p>
          </div>

          {/* Recall simulation */}
          {nc.requer_recall && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h2 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                ⚠️ Simulação de Recall
              </h2>
              {lotesAfetados.length === 0 ? (
                <p className="text-sm text-red-600">
                  {nc.os_id
                    ? 'Nenhuma movimentação de insumo encontrada para a OS relacionada.'
                    : 'Vincule esta NC a uma OS para simular os lotes potencialmente afetados.'}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-700 mb-3">Lotes de insumo consumidos na OS vinculada:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-red-600 border-b border-red-200">
                          <th className="pb-2 font-semibold">Lote</th>
                          <th className="pb-2 font-semibold">Insumo</th>
                          <th className="pb-2 font-semibold">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lotesAfetados.map((m: any) => (
                          <tr key={m.lote_id} className="border-b border-red-100">
                            <td className="py-2 font-mono text-xs">{(m.lotes_insumo as any)?.codigo_lote ?? m.lote_id?.slice(0,8)}</td>
                            <td className="py-2 text-xs">{(m.lotes_insumo as any)?.insumos?.descricao ?? '—'}</td>
                            <td className="py-2">
                              <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded">Bloquear</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-red-500 mt-2">
                    Em produção: disparar bloqueio via API e notificar clientes afetados.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CAPA */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Plano de Ação (CAPA)</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(acoes ?? []).length} ações — {capasAbertas} pendentes
                </p>
              </div>
            </div>

            {(acoes ?? []).length > 0 && (
              <div className="space-y-3 mb-4">
                {(acoes ?? []).map((a: any) => {
                  const vencida = new Date(a.prazo) < hoje && !['concluida','verificada','cancelada'].includes(a.status)
                  return (
                    <div key={a.id} className={`rounded-lg border p-4 ${vencida ? 'border-red-200 bg-red-50/20' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {TIPO_CAPA_LABEL[a.tipo] ?? a.tipo}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CAPA_COR[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {a.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-right">
                          <span className={vencida ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {vencida ? '⚠️ ' : ''}Prazo: {new Date(a.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{a.descricao}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>Resp: {(a.responsavel as any)?.nome ?? '—'}</span>
                        {a.concluida_em && (
                          <span>Concluída em {new Date(a.concluida_em).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                      {a.evidencia_url && (
                        <a href={a.evidencia_url} target="_blank" className="text-xs text-blue-600 hover:underline mt-1 block">
                          📎 Ver evidência
                        </a>
                      )}
                      {/* Botão de conclusão */}
                      {['pendente','em_andamento'].includes(a.status) && (
                        <div className="mt-3 flex gap-2">
                          <form action={`/api/qualidade/capa/${a.id}/status`} method="POST">
                            <input type="hidden" name="status" value="concluida" />
                            <button className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg">
                              ✓ Marcar Concluída
                            </button>
                          </form>
                          {a.status === 'pendente' && (
                            <form action={`/api/qualidade/capa/${a.id}/status`} method="POST">
                              <input type="hidden" name="status" value="em_andamento" />
                              <button className="px-3 py-1 text-xs bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg">
                                Iniciar
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {nc.status !== 'encerrada' && (
              <CapaForm ncId={nc.id} usuarios={(usuarios ?? []) as any} />
            )}
          </div>

          {/* Timeline de comentários */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Histórico e Comentários</h2>
            <div className="space-y-4 mb-4">
              {(comentarios ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">Nenhum comentário ainda.</p>
              )}
              {(comentarios ?? []).map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                    {((c.usuario as any)?.nome ?? '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">{(c.usuario as any)?.nome ?? 'Sistema'}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.texto}</p>
                  </div>
                </div>
              ))}
            </div>
            {nc.status !== 'encerrada' && (
              <ComentarioNC ncId={nc.id} usuarioNome={usuarioNome} />
            )}
          </div>
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Detalhes</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Origem</dt>
                <dd className="text-gray-900 capitalize">{nc.tipo_origem.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Categoria</dt>
                <dd className="text-gray-900 capitalize">{nc.categoria.replace(/_/g, ' ')}</dd>
              </div>
              {(nc.os as any)?.numero && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">OS vinculada</dt>
                  <dd>
                    <Link href={`/producao/${(nc.os as any).id}`} className="text-blue-600 hover:underline">
                      OS-{String((nc.os as any).numero).padStart(4, '0')}
                    </Link>
                  </dd>
                </div>
              )}
              {(nc.pedidos as any)?.numero && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Pedido vinculado</dt>
                  <dd>
                    <Link href={`/pedidos/${(nc.pedidos as any).id}`} className="text-blue-600 hover:underline">
                      #{(nc.pedidos as any).numero}
                    </Link>
                  </dd>
                </div>
              )}
              {(nc.clientes as any)?.razao_social && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Cliente</dt>
                  <dd>
                    <Link href={`/clientes/${(nc.clientes as any).id}`} className="text-blue-600 hover:underline">
                      {(nc.clientes as any).nome_fantasia ?? (nc.clientes as any).razao_social}
                    </Link>
                  </dd>
                </div>
              )}
              {(nc.lotes_insumo as any)?.codigo_lote && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Lote</dt>
                  <dd className="font-mono text-xs text-gray-900">{(nc.lotes_insumo as any).codigo_lote}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Responsável</dt>
                <dd className="text-gray-900">{(nc.responsavel as any)?.nome ?? <span className="text-gray-400">—</span>}</dd>
              </div>
              {nc.prazo_capa && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Prazo CAPA</dt>
                  <dd className={`font-medium ${new Date(nc.prazo_capa) < hoje && nc.status !== 'encerrada' ? 'text-red-600' : 'text-gray-900'}`}>
                    {new Date(nc.prazo_capa + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Aberta por</dt>
                <dd className="text-gray-900">{(nc.criador as any)?.nome ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Data de abertura</dt>
                <dd className="text-gray-900">{new Date(nc.criado_em).toLocaleDateString('pt-BR')}</dd>
              </div>
              {nc.encerrada_em && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Encerrada em</dt>
                  <dd className="text-gray-900">{new Date(nc.encerrada_em).toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Progresso CAPA */}
          {(acoes ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Progresso CAPA</h2>
              {(['contencao','causa_raiz','corretiva','preventiva'] as const).map(tipo => {
                const acao = (acoes ?? []).find((a: any) => a.tipo === tipo)
                return (
                  <div key={tipo} className="flex items-center gap-2 mb-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      !acao ? 'bg-gray-100 text-gray-400' :
                      ['concluida','verificada'].includes(acao.status) ? 'bg-green-500 text-white' :
                      acao.status === 'em_andamento' ? 'bg-blue-500 text-white' :
                      'bg-amber-400 text-white'
                    }`}>
                      {!acao ? '–' : ['concluida','verificada'].includes(acao.status) ? '✓' : '●'}
                    </div>
                    <span className="text-xs text-gray-700">{TIPO_CAPA_LABEL[tipo]}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ações rápidas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Ações</h2>
            <div className="space-y-1">
              {nc.os_id && (
                <Link href={`/producao/${nc.os_id}`}
                  className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  ⚙️ Ver OS vinculada
                </Link>
              )}
              <Link href={`/qualidade/ncs/novo`}
                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                🔴 Abrir nova NC
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
