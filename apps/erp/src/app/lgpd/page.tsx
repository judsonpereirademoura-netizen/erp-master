import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

const STATUS_SOL: Record<string, { label: string; className: string }> = {
  pendente:    { label: 'Pendente',    className: 'bg-amber-100 text-amber-700' },
  em_analise:  { label: 'Em Análise', className: 'bg-blue-100 text-blue-700' },
  respondida:  { label: 'Respondida', className: 'bg-indigo-100 text-indigo-700' },
  concluida:   { label: 'Concluída',  className: 'bg-green-100 text-green-700' },
  rejeitada:   { label: 'Rejeitada',  className: 'bg-red-100 text-red-600' },
}

const STATUS_INC: Record<string, { label: string; className: string }> = {
  aberto:            { label: 'Aberto',          className: 'bg-red-100 text-red-700' },
  em_investigacao:   { label: 'Investigando',    className: 'bg-blue-100 text-blue-700' },
  contido:           { label: 'Contido',         className: 'bg-amber-100 text-amber-700' },
  encerrado:         { label: 'Encerrado',       className: 'bg-green-100 text-green-700' },
}

const TIPO_SOL_LABEL: Record<string, string> = {
  acesso:                 'Acesso',
  portabilidade:          'Portabilidade',
  retificacao:            'Retificação',
  exclusao:               'Exclusão',
  revogacao_consentimento:'Revogação Consent.',
  oposicao:               'Oposição',
  informacoes:            'Informações',
}

export default async function LGPDPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>
}) {
  const params = await searchParams
  const aba = params.aba ?? 'solicitacoes'
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const hoje = new Date()

  const [{ data: solicitacoes }, { data: incidentes }, { data: bases }] = await Promise.all([
    supabase
      .from('solicitacoes_lgpd')
      .select('*, titular:titular_id(nome, tipo_titular), responsavel:responsavel_id(nome)')
      .order('criado_em', { ascending: false })
      .limit(20),
    supabase
      .from('incidentes_lgpd')
      .select('*, responsavel:responsavel_id(nome)')
      .order('data_ocorrencia', { ascending: false })
      .limit(20),
    supabase
      .from('bases_legais')
      .select('*')
      .eq('ativo', true)
      .order('atividade'),
  ])

  const pendentes    = (solicitacoes ?? []).filter(s => s.status === 'pendente').length
  const vencidas     = (solicitacoes ?? []).filter(s =>
    s.prazo && new Date(s.prazo) < hoje && !['concluida','rejeitada'].includes(s.status)
  ).length
  const incAbertos   = (incidentes ?? []).filter(i => i.status !== 'encerrado').length
  const naoNotifANPD = (incidentes ?? []).filter(i => !i.notificado_anpd && i.status !== 'encerrado').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">LGPD</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lei Geral de Proteção de Dados — ANPD</p>
        </div>
        <Link href="/lgpd/solicitacoes/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
          + Nova Solicitação
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Sol. Pendentes',    valor: String(pendentes),    cor: pendentes > 0 ? 'amber' : 'green',   icon: '📨' },
          { titulo: 'Prazo Vencido',     valor: String(vencidas),     cor: vencidas > 0 ? 'red' : 'green',      icon: '⏰' },
          { titulo: 'Incidentes Abertos',valor: String(incAbertos),   cor: incAbertos > 0 ? 'red' : 'green',    icon: '🔴' },
          { titulo: 'ANPD Não Notif.',   valor: String(naoNotifANPD), cor: naoNotifANPD > 0 ? 'red' : 'green',  icon: '🏛️' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'red'   ? 'bg-red-50 border-red-100'    :
            k.cor === 'amber' ? 'bg-amber-50 border-amber-100':
            'bg-green-50 border-green-100'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">{k.titulo}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-gray-200">
        {[['solicitacoes','Solicitações de Titulares'], ['incidentes','Incidentes'], ['bases','Bases Legais']].map(([key, label]) => (
          <Link key={key} href={`/lgpd?aba=${key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}>{label}</Link>
        ))}
      </div>

      {/* Solicitações */}
      {aba === 'solicitacoes' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Titular</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3 font-medium">Prazo</th>
                  <th className="px-4 py-3 font-medium">Abertura</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(solicitacoes ?? []).map((s: any) => {
                  const cfg = STATUS_SOL[s.status] ?? { label: s.status, className: 'bg-gray-100 text-gray-600' }
                  const vencida = s.prazo && new Date(s.prazo) < hoje && !['concluida','rejeitada'].includes(s.status)
                  return (
                    <tr key={s.id} className={`hover:bg-gray-50 ${vencida ? 'bg-red-50/20' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{(s.titular as any)?.nome}</p>
                        <p className="text-xs text-gray-500 capitalize">{(s.titular as any)?.tipo_titular}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{TIPO_SOL_LABEL[s.tipo] ?? s.tipo}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{(s.responsavel as any)?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {s.prazo ? (
                          <span className={vencida ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {vencida ? '⚠️ ' : ''}{new Date(s.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/lgpd/solicitacoes/${s.id}`} className="text-gray-400 hover:text-blue-600">👁</Link>
                      </td>
                    </tr>
                  )
                })}
                {(solicitacoes ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhuma solicitação registrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incidentes */}
      {aba === 'incidentes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link href="/lgpd/incidentes/novo"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              + Registrar Incidente
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Incidente</th>
                    <th className="px-4 py-3 font-medium">Gravidade</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Titulares</th>
                    <th className="px-4 py-3 font-medium text-center">ANPD</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(incidentes ?? []).map((i: any) => {
                    const cfg = STATUS_INC[i.status] ?? { label: i.status, className: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{i.titulo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            i.gravidade === 'critica' ? 'bg-red-100 text-red-700' :
                            i.gravidade === 'alta'    ? 'bg-orange-100 text-orange-700' :
                            i.gravidade === 'media'   ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{i.gravidade}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                          {i.qtd_titulares_afetados ?? '?'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {i.notificado_anpd
                            ? <span className="text-xs text-green-700 font-medium">✓ Notificada</span>
                            : <span className="text-xs text-red-500">Pendente</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(i.data_ocorrencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/lgpd/incidentes/${i.id}`} className="text-gray-400 hover:text-blue-600">👁</Link>
                        </td>
                      </tr>
                    )
                  })}
                  {(incidentes ?? []).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhum incidente registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bases Legais */}
      {aba === 'bases' && (
        <div className="space-y-3">
          {(bases ?? []).map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{b.atividade}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{b.finalidade}</p>
                  {(b.dados_tratados ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(b.dados_tratados as string[]).map((d, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                    {b.base_legal.replace(/_/g, ' ')}
                  </span>
                  {b.prazo_retencao_dias && (
                    <p className="text-xs text-gray-500 mt-1">Retenção: {b.prazo_retencao_dias} dias</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(bases ?? []).length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Nenhuma base legal mapeada.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
