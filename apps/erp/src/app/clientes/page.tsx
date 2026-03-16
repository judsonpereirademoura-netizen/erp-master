import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_BADGE: Record<string, string> = {
  ativo:    'bg-green-100 text-green-700',
  inativo:  'bg-gray-100 text-gray-500',
  suspenso: 'bg-red-100 text-red-600',
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; pagina?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const pagina = Number(params.pagina ?? 1)
  const porPagina = 20
  const offset = (pagina - 1) * porPagina

  let query = supabase
    .from('clientes')
    .select(`
      id, cnpj, cpf, razao_social, nome_fantasia, segmento,
      limite_credito, saldo_credito, status,
      representantes:representante_id (
        usuarios:usuario_id ( nome )
      )
    `, { count: 'exact' })
    .order('razao_social')
    .range(offset, offset + porPagina - 1)

  if (params.q) {
    query = query.ilike('razao_social', `%${params.q}%`)
  }
  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data: clientes, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / porPagina)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} cliente{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/clientes/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          + Novo Cliente
        </Link>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex gap-3 flex-wrap">
        <input name="q" defaultValue={params.q} placeholder="Buscar por razão social..."
          className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select name="status" defaultValue={params.status ?? ''}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="suspenso">Suspensos</option>
        </select>
        <button type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          Buscar
        </button>
        {(params.q || params.status) && (
          <a href="/clientes" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline self-center">
            Limpar
          </a>
        )}
      </form>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">CNPJ/CPF</th>
                <th className="px-4 py-3 font-medium">Segmento</th>
                <th className="px-4 py-3 font-medium">Representante</th>
                <th className="px-4 py-3 font-medium text-right">Limite Crédito</th>
                <th className="px-4 py-3 font-medium text-right">Saldo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(clientes ?? []).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <Link href={`/clientes/${c.id}`}
                        className="font-medium text-blue-600 hover:underline">
                        {c.razao_social}
                      </Link>
                      {c.nome_fantasia && (
                        <p className="text-xs text-gray-400">{c.nome_fantasia}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {c.cnpj ?? c.cpf ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.segmento ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {(c.representantes as any)?.usuarios?.nome ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatBRL(Number(c.limite_credito))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={Number(c.saldo_credito) < 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                      {formatBRL(Number(c.saldo_credito))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/clientes/${c.id}`}
                        className="text-gray-400 hover:text-blue-600 transition-colors" title="Ver detalhes">
                        👁
                      </Link>
                      <Link href={`/clientes/${c.id}/editar`}
                        className="text-gray-400 hover:text-amber-600 transition-colors" title="Editar">
                        ✏️
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {(clientes ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    {params.q || params.status
                      ? 'Nenhum cliente encontrado para os filtros aplicados.'
                      : 'Nenhum cliente cadastrado ainda.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {pagina} de {totalPaginas} — {total} registros
            </p>
            <div className="flex gap-2">
              {pagina > 1 && (
                <Link href={`/clientes?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.status ? { status: params.status } : {}), pagina: String(pagina - 1) })}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  ← Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link href={`/clientes?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.status ? { status: params.status } : {}), pagina: String(pagina + 1) })}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
