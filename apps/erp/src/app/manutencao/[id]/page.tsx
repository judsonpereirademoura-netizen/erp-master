import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const STATUS_CFG: Record<string, { label: string; className: string; next?: string; nextLabel?: string }> = {
  aberta:          { label: 'Aberta',          className: 'bg-red-100 text-red-700',   next: 'em_andamento', nextLabel: 'Iniciar' },
  em_andamento:    { label: 'Em Andamento',     className: 'bg-blue-100 text-blue-700', next: 'concluida',    nextLabel: 'Concluir' },
  aguardando_peca: { label: 'Aguard. Peça',    className: 'bg-amber-100 text-amber-700', next: 'em_andamento', nextLabel: 'Retomar' },
  concluida:       { label: 'Concluída',        className: 'bg-green-100 text-green-700' },
  cancelada:       { label: 'Cancelada',        className: 'bg-gray-100 text-gray-500' },
}

const TIPO_CFG: Record<string, { label: string; className: string }> = {
  preventiva: { label: 'Preventiva', className: 'bg-blue-50 text-blue-700' },
  corretiva:  { label: 'Corretiva',  className: 'bg-red-50 text-red-700' },
  preditiva:  { label: 'Preditiva',  className: 'bg-purple-50 text-purple-700' },
  melhoria:   { label: 'Melhoria',   className: 'bg-green-50 text-green-700' },
}

export default async function OMDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: om } = await supabase
    .from('ordens_manutencao')
    .select(`
      *, maquinas ( codigo, nome, tipo, fabricante, modelo, numero_serie ),
      tecnico:tecnico_id ( nome ),
      solicitante:solicitante_id ( nome )
    `)
    .eq('id', id)
    .single()

  if (!om) notFound()

  const s = STATUS_CFG[om.status] ?? { label: om.status, className: 'bg-gray-100 text-gray-600' }
  const t = TIPO_CFG[om.tipo] ?? { label: om.tipo, className: 'bg-gray-100 text-gray-600' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/manutencao" className="hover:text-blue-600">Manutenção</Link>
            <span className="mx-2">›</span>
            <span>OM-{String(om.numero).padStart(4, '0')}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">OM-{String(om.numero).padStart(4, '0')}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${t.className}`}>{t.label}</span>
          </div>
          <p className="text-gray-600 mt-1 text-lg">{om.titulo}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {s.next && (
            <form action={`/api/manutencao/${om.id}/status`} method="POST">
              <input type="hidden" name="status" value={s.next} />
              <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
                {s.nextLabel} →
              </button>
            </form>
          )}
          {om.status === 'em_andamento' && (
            <form action={`/api/manutencao/${om.id}/status`} method="POST">
              <input type="hidden" name="status" value="aguardando_peca" />
              <button className="inline-flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-amber-100">
                ⏸ Aguardando Peça
              </button>
            </form>
          )}
          {!['concluida','cancelada'].includes(om.status) && (
            <form action={`/api/manutencao/${om.id}/status`} method="POST">
              <input type="hidden" name="status" value="cancelada" />
              <button className="text-sm text-gray-400 hover:text-red-600 px-2 py-2.5">✕ Cancelar</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Descrição do Problema</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{om.descricao}</p>
          </div>

          {(om.causa_raiz || om.solucao_aplicada) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Diagnóstico e Solução</h2>
              {om.causa_raiz && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Causa Raiz</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{om.causa_raiz}</p>
                </div>
              )}
              {om.solucao_aplicada && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Solução Aplicada</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{om.solucao_aplicada}</p>
                </div>
              )}
            </div>
          )}

          {/* Custos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Custos</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-lg font-semibold text-gray-900">
                  R$ {Number(om.custo_pecas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Peças / Materiais</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-lg font-semibold text-gray-900">
                  R$ {Number(om.custo_mao_obra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Mão de Obra</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-lg font-semibold text-blue-700">
                  R$ {Number(om.custo_total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-500 mt-1">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Máquina</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Código / Nome</dt>
                <dd className="font-medium text-gray-900">
                  <Link href={`/manutencao?maquina=${om.maquina_id}`} className="text-blue-600 hover:underline">
                    {(om.maquinas as any)?.codigo}
                  </Link>
                  {' — '}{(om.maquinas as any)?.nome}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Tipo</dt>
                <dd className="text-gray-900 capitalize">{(om.maquinas as any)?.tipo?.replace(/_/g, ' ')}</dd>
              </div>
              {(om.maquinas as any)?.fabricante && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Fabricante / Modelo</dt>
                  <dd className="text-gray-900">{(om.maquinas as any).fabricante} {(om.maquinas as any)?.modelo}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Detalhes</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Prioridade</dt>
                <dd className="font-medium text-gray-900">P{om.prioridade}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Solicitante</dt>
                <dd className="text-gray-900">{(om.solicitante as any)?.nome ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Técnico</dt>
                <dd className="text-gray-900">{(om.tecnico as any)?.nome ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Data de Abertura</dt>
                <dd className="text-gray-900">{new Date(om.data_abertura + 'T00:00:00').toLocaleDateString('pt-BR')}</dd>
              </div>
              {om.data_prev_conclusao && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Previsão de Conclusão</dt>
                  <dd className="text-gray-900">{new Date(om.data_prev_conclusao + 'T00:00:00').toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
              {om.data_inicio && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Início Real</dt>
                  <dd className="text-gray-900">{new Date(om.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</dd>
                </div>
              )}
              {om.data_conclusao && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Conclusão</dt>
                  <dd className="text-green-700 font-medium">{new Date(om.data_conclusao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</dd>
                </div>
              )}
            </dl>
          </div>

          {om.observacoes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Observações</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{om.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
