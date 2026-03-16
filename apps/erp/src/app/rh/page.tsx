import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

const STATUS_COR: Record<string, string> = {
  ativo:     'bg-green-100 text-green-700',
  afastado:  'bg-amber-100 text-amber-700',
  ferias:    'bg-blue-100 text-blue-700',
  demitido:  'bg-gray-100 text-gray-500',
}

const DEPTO_LABEL: Record<string, string> = {
  producao:   'Produção',    qualidade:  'Qualidade',
  comercial:  'Comercial',   financeiro: 'Financeiro',
  rh:         'RH',          ti:         'TI',
  logistica:  'Logística',   manutencao: 'Manutenção',
  gerencia:   'Gerência',
}

export default async function RHPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; departamento?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 25

  let query = supabase
    .from('funcionarios')
    .select(`
      id, matricula, nome, cargo, departamento, turno, tipo_contrato, status, data_admissao, salario_base
    `, { count: 'exact' })
    .order('nome')
    .range((pagina - 1) * porPagina, pagina * porPagina - 1)

  if (params.status)      query = query.eq('status', params.status)
  if (params.departamento) query = query.eq('departamento', params.departamento)

  const { data: funcionarios, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  const { data: allFuncs } = await supabase.from('funcionarios').select('status, departamento, turno')
  const ativos   = (allFuncs ?? []).filter(f => f.status === 'ativo').length
  const ferias   = (allFuncs ?? []).filter(f => f.status === 'ferias').length
  const afastados = (allFuncs ?? []).filter(f => f.status === 'afastado').length
  const headcount = (allFuncs ?? []).length

  const byDepto: Record<string, number> = {}
  for (const f of allFuncs ?? []) {
    if (f.status !== 'demitido') byDepto[f.departamento] = (byDepto[f.departamento] ?? 0) + 1
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Recursos Humanos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de colaboradores — eSocial</p>
        </div>
        <Link href="/rh/funcionarios/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          + Novo Funcionário
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Headcount',  valor: String(headcount), cor: 'gray',  icon: '👥' },
          { titulo: 'Ativos',     valor: String(ativos),    cor: 'green', icon: '✅' },
          { titulo: 'Em Férias',  valor: String(ferias),    cor: 'blue',  icon: '🏖️' },
          { titulo: 'Afastados',  valor: String(afastados), cor: afastados > 0 ? 'amber' : 'gray', icon: '🤒' },
        ].map(k => (
          <div key={k.titulo} className={`rounded-xl border p-5 ${
            k.cor === 'green' ? 'bg-green-50 border-green-100'  :
            k.cor === 'blue'  ? 'bg-blue-50 border-blue-100'    :
            k.cor === 'amber' ? 'bg-amber-50 border-amber-100'  :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">{k.titulo}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{k.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabela */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {[['', 'Todos os Status'], ['ativo','Ativos'], ['ferias','Férias'], ['afastado','Afastados'], ['demitido','Desligados']].map(([key, label]) => (
              <Link key={key} href={`/rh${key ? `?status=${key}` : ''}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  (params.status ?? '') === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}>{label}</Link>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Matrícula</th>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Cargo</th>
                    <th className="px-4 py-3 font-medium">Depto.</th>
                    <th className="px-4 py-3 font-medium">Turno</th>
                    <th className="px-4 py-3 font-medium">Contrato</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Admissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(funcionarios ?? []).map((f: any) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{f.matricula}</td>
                      <td className="px-4 py-3">
                        <Link href={`/rh/funcionarios/${f.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {f.nome}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{f.cargo}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{DEPTO_LABEL[f.departamento] ?? f.departamento}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700">{f.turno}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 uppercase">{f.tipo_contrato}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[f.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(f.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                  {(funcionarios ?? []).length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Nenhum funcionário encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex justify-between">
                <p className="text-sm text-gray-500">Página {pagina} de {totalPaginas} — {total} registros</p>
                <div className="flex gap-2">
                  {pagina > 1 && <Link href={`/rh?pagina=${pagina-1}`} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">← Anterior</Link>}
                  {pagina < totalPaginas && <Link href={`/rh?pagina=${pagina+1}`} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Próxima →</Link>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Headcount por departamento */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Por Departamento</h2>
            <div className="space-y-2">
              {Object.entries(byDepto).sort((a, b) => b[1] - a[1]).map(([depto, qtd]) => (
                <div key={depto} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700">{DEPTO_LABEL[depto] ?? depto}</span>
                      <span className="font-medium text-gray-900">{qtd}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (qtd / headcount) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
