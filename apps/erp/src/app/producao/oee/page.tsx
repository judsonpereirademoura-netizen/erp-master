import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

function GaugeRing({ valor, cor }: { valor: number; cor: string }) {
  const pct = Math.min(100, valor * 100)
  const strokeColor =
    valor >= 0.85 ? '#22c55e' :
    valor >= 0.65 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={`${pct} 100`}
          strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-gray-800">
        {(pct).toFixed(0)}%
      </span>
    </div>
  )
}

export default async function OEEDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; maquina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const dataRef = params.data ?? new Date().toISOString().slice(0, 10)

  // Últimos 7 dias
  const dataInicio = new Date(dataRef)
  dataInicio.setDate(dataInicio.getDate() - 6)

  let query = supabase
    .from('oee_registros')
    .select(`
      id, data_turno, turno, maquina_id, tempo_produtivo_min, tempo_planejado_min,
      metros_produzidos, metros_planejados, unidades_aprovadas, unidades_produzidas,
      disponibilidade, performance, qualidade, oee,
      maquinas ( codigo, nome )
    `)
    .gte('data_turno', dataInicio.toISOString().slice(0, 10))
    .lte('data_turno', dataRef)
    .order('data_turno', { ascending: false })
    .order('turno')

  if (params.maquina) query = query.eq('maquina_id', params.maquina)

  const { data: registros } = await query

  const { data: maquinas } = await supabase
    .from('maquinas')
    .select('id, codigo, nome')
    .neq('status', 'inativa')
    .order('codigo')

  // Médias globais
  const comOEE = (registros ?? []).filter(r => r.oee != null)
  const oeeMedia         = comOEE.length ? comOEE.reduce((s, r) => s + Number(r.oee ?? 0), 0) / comOEE.length : 0
  const dispMedia        = comOEE.length ? comOEE.reduce((s, r) => s + Number(r.disponibilidade ?? 0), 0) / comOEE.length : 0
  const perfMedia        = comOEE.length ? comOEE.reduce((s, r) => s + Number(r.performance ?? 0), 0) / comOEE.length : 0
  const qualMedia        = comOEE.length ? comOEE.reduce((s, r) => s + Number(r.qualidade ?? 0), 0) / comOEE.length : 0

  // Agrupado por máquina
  const byMaquina: Record<string, { codigo: string; nome: string; registros: any[]; oeeMedia: number }> = {}
  for (const r of registros ?? []) {
    if (!byMaquina[r.maquina_id]) {
      byMaquina[r.maquina_id] = {
        codigo: (r.maquinas as any)?.codigo ?? r.maquina_id,
        nome:   (r.maquinas as any)?.nome   ?? '',
        registros: [],
        oeeMedia: 0,
      }
    }
    byMaquina[r.maquina_id].registros.push(r)
  }
  for (const [, m] of Object.entries(byMaquina)) {
    const c = m.registros.filter(r => r.oee != null)
    m.oeeMedia = c.length ? c.reduce((s, r) => s + Number(r.oee), 0) / c.length : 0
  }

  // OEE por dia (para mini-gráfico de texto)
  const byDia: Record<string, number[]> = {}
  for (const r of registros ?? []) {
    if (r.oee != null) {
      if (!byDia[r.data_turno]) byDia[r.data_turno] = []
      byDia[r.data_turno].push(Number(r.oee))
    }
  }
  const diasOrdenados = Object.keys(byDia).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/producao" className="hover:text-blue-600">Produção</Link>
            <span className="mx-2">›</span>
            <span>Dashboard OEE</span>
          </nav>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard OEE</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Overall Equipment Effectiveness — últimos 7 dias até {new Date(dataRef + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={params.maquina ?? ''} onChange={() => {}}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
            <option value="">Todas as máquinas</option>
            {(maquinas ?? []).map((m: any) => (
              <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>
            ))}
          </select>
          <input type="date" defaultValue={dataRef}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
        </div>
      </div>

      {/* OEE Global */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-6 text-center">OEE Global do Período</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'OEE',            valor: oeeMedia,  desc: 'Meta: ≥ 85%' },
            { label: 'Disponibilidade',valor: dispMedia, desc: 'Tempo produtivo / planejado' },
            { label: 'Performance',    valor: perfMedia, desc: 'Velocidade real / nominal' },
            { label: 'Qualidade',      valor: qualMedia, desc: 'Aprovado / produzido' },
          ].map(k => (
            <div key={k.label} className="text-center">
              <GaugeRing valor={k.valor} cor="" />
              <p className="text-sm font-semibold text-gray-800 mt-2">{k.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.desc}</p>
            </div>
          ))}
        </div>
        {comOEE.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-4">
            Nenhum registro OEE encontrado. Os registros são gerados automaticamente a partir dos apontamentos.
          </p>
        )}
      </div>

      {/* OEE por máquina */}
      {Object.keys(byMaquina).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">OEE por Máquina</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Máquina</th>
                  <th className="px-4 py-3 font-medium text-center">OEE Médio</th>
                  <th className="px-4 py-3 font-medium">Barra</th>
                  <th className="px-4 py-3 font-medium text-right">Registros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.values(byMaquina).sort((a, b) => b.oeeMedia - a.oeeMedia).map(m => (
                  <tr key={m.codigo} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.codigo}</p>
                      <p className="text-xs text-gray-500">{m.nome}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-base font-bold ${
                        m.oeeMedia >= 0.85 ? 'text-green-600' :
                        m.oeeMedia >= 0.65 ? 'text-amber-600' : 'text-red-600'
                      }`}>{(m.oeeMedia * 100).toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-40 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${
                          m.oeeMedia >= 0.85 ? 'bg-green-500' :
                          m.oeeMedia >= 0.65 ? 'bg-amber-400' : 'bg-red-400'
                        }`} style={{ width: `${m.oeeMedia * 100}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{m.registros.length} turnos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Histórico por dia */}
      {diasOrdenados.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Histórico Diário</h2>
          <div className="space-y-2">
            {diasOrdenados.reverse().map(dia => {
              const vals = byDia[dia]
              const media = vals.reduce((s, v) => s + v, 0) / vals.length
              return (
                <div key={dia} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 shrink-0">
                    {new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                    <div className={`h-5 rounded-full ${
                      media >= 0.85 ? 'bg-green-500' :
                      media >= 0.65 ? 'bg-amber-400' : 'bg-red-400'
                    }`} style={{ width: `${media * 100}%` }} />
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-gray-700">
                      {(media * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{vals.length} turn.</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Link para registrar manualmente */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <p className="text-sm text-blue-700 font-medium">Registros OEE automáticos</p>
        <p className="text-xs text-blue-600 mt-1">
          Os registros OEE são consolidados via job (pg_cron) ao final de cada turno com base nos apontamentos.
          Os dados IoT (velocidade, contadores) enriquecem o cálculo de Performance quando disponíveis.
        </p>
      </div>
    </div>
  )
}
