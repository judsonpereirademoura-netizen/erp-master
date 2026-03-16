import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho:    { label: 'Rascunho',    className: 'bg-gray-100 text-gray-600' },
  enviada:     { label: 'Enviada',     className: 'bg-blue-100 text-blue-700' },
  autorizada:  { label: 'Autorizada',  className: 'bg-green-100 text-green-700' },
  cancelada:   { label: 'Cancelada',   className: 'bg-red-100 text-red-600' },
  denegada:    { label: 'Denegada',    className: 'bg-orange-100 text-orange-700' },
  inutilizada: { label: 'Inutilizada', className: 'bg-gray-100 text-gray-500' },
}

export default async function NFeDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: nfe } = await supabase
    .from('nfe')
    .select(`
      *,
      pedidos ( id, numero, status, valor_total,
        clientes ( razao_social, nome_fantasia, cnpj )
      )
    `)
    .eq('id', id)
    .single()

  if (!nfe) notFound()

  const s = STATUS_CONFIG[nfe.status] ?? { label: nfe.status, className: 'bg-gray-100 text-gray-600' }
  const pedido = nfe.pedidos as any
  const cliente = pedido?.clientes as any

  // Determine available status transitions
  const podeEnviar       = nfe.status === 'rascunho'
  const podeAutorizar    = nfe.status === 'enviada'
  const podeCancelarDeEnviada = nfe.status === 'enviada'
  const podeCancelarDeAutorizada = nfe.status === 'autorizada'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/fiscal" className="hover:text-blue-600">Fiscal</Link>
            <span className="mx-2">›</span>
            <span>NF-e {nfe.numero ? String(nfe.numero).padStart(6, '0') : id.slice(0, 8)}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">
              NF-e {nfe.numero ? String(nfe.numero).padStart(6, '0') : '—'}
              {nfe.serie ? <span className="text-gray-400 font-normal text-lg ml-2">Serie {nfe.serie}</span> : null}
            </h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
              {s.label}
            </span>
          </div>
        </div>

        {/* Primary action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {podeEnviar && (
            <form action={`/api/fiscal/nfe/${nfe.id}/status`} method="POST">
              <input type="hidden" name="status" value="enviada" />
              <button type="submit"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                Enviar &rarr;
              </button>
            </form>
          )}
          {podeAutorizar && (
            <form action={`/api/fiscal/nfe/${nfe.id}/status`} method="POST">
              <input type="hidden" name="status" value="autorizada" />
              <button type="submit"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                Marcar Autorizada &rarr;
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chave de Acesso */}
          {nfe.chave_acesso && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Chave de Acesso</h2>
              <p className="font-mono text-sm text-gray-700 break-all bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                {nfe.chave_acesso}
              </p>
              {nfe.protocolo && (
                <p className="text-xs text-gray-500 mt-2">
                  Protocolo: <span className="font-mono text-gray-700">{nfe.protocolo}</span>
                </p>
              )}
            </div>
          )}

          {/* Valores fiscais */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Valores</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <dt className="text-xs text-gray-500 mb-1">Valor Total</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {nfe.valor_total != null ? formatBRL(Number(nfe.valor_total)) : '—'}
                </dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <dt className="text-xs text-gray-500 mb-1">ICMS</dt>
                <dd className="text-base font-medium text-gray-800">
                  {nfe.valor_icms != null ? formatBRL(Number(nfe.valor_icms)) : '—'}
                </dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <dt className="text-xs text-gray-500 mb-1">IPI</dt>
                <dd className="text-base font-medium text-gray-800">
                  {nfe.valor_ipi != null ? formatBRL(Number(nfe.valor_ipi)) : '—'}
                </dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <dt className="text-xs text-gray-500 mb-1">PIS</dt>
                <dd className="text-base font-medium text-gray-800">
                  {nfe.valor_pis != null ? formatBRL(Number(nfe.valor_pis)) : '—'}
                </dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <dt className="text-xs text-gray-500 mb-1">COFINS</dt>
                <dd className="text-base font-medium text-gray-800">
                  {nfe.valor_cofins != null ? formatBRL(Number(nfe.valor_cofins)) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Cancelamento — motivo */}
          {nfe.status === 'cancelada' && nfe.motivo_cancel && (
            <div className="bg-red-50 rounded-xl border border-red-100 p-5">
              <h2 className="font-semibold text-red-800 mb-2">Motivo do Cancelamento</h2>
              <p className="text-sm text-red-700 whitespace-pre-wrap">{nfe.motivo_cancel}</p>
              {nfe.cancelada_em && (
                <p className="text-xs text-red-500 mt-2">
                  Cancelada em: {new Date(nfe.cancelada_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              )}
            </div>
          )}

          {/* Ação de cancelamento com motivo — enviada */}
          {podeCancelarDeEnviada && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Cancelar NF-e</h2>
              <form action={`/api/fiscal/nfe/${nfe.id}/status`} method="POST" className="space-y-3">
                <input type="hidden" name="status" value="cancelada" />
                <div>
                  <label htmlFor="motivo_cancel_enviada" className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo do cancelamento <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="motivo_cancel_enviada"
                    name="motivo_cancel"
                    rows={3}
                    required
                    placeholder="Informe o motivo do cancelamento..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>
                <button type="submit"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  Cancelar NF-e
                </button>
              </form>
            </div>
          )}

          {/* Ação de cancelamento com motivo — autorizada */}
          {podeCancelarDeAutorizada && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Cancelar NF-e Autorizada</h2>
              <form action={`/api/fiscal/nfe/${nfe.id}/status`} method="POST" className="space-y-3">
                <input type="hidden" name="status" value="cancelada" />
                <div>
                  <label htmlFor="motivo_cancel_autorizada" className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo do cancelamento <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="motivo_cancel_autorizada"
                    name="motivo_cancel"
                    rows={3}
                    required
                    placeholder="Informe o motivo do cancelamento da NF-e autorizada..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>
                <button type="submit"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  Cancelar NF-e
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          {/* Detalhes da NF-e */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Detalhes</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Numero</dt>
                <dd className="font-medium text-gray-900">
                  {nfe.numero ? String(nfe.numero).padStart(6, '0') : <span className="text-gray-400">—</span>}
                </dd>
              </div>
              {nfe.serie && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Serie</dt>
                  <dd className="text-gray-900">{nfe.serie}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Status</dt>
                <dd>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
                    {s.label}
                  </span>
                </dd>
              </div>
              {nfe.emitida_em && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Emitida em</dt>
                  <dd className="text-gray-900">
                    {new Date(nfe.emitida_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </dd>
                </div>
              )}
              {nfe.cancelada_em && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Cancelada em</dt>
                  <dd className="text-red-600">
                    {new Date(nfe.cancelada_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </dd>
                </div>
              )}
              {nfe.criado_em && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Criado em</dt>
                  <dd className="text-gray-900">
                    {new Date(nfe.criado_em).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Pedido vinculado */}
          {pedido && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Pedido Vinculado</h2>
              <Link href={`/pedidos/${pedido.id}`}
                className="font-medium text-blue-600 hover:underline block text-sm">
                Pedido #{pedido.numero}
              </Link>
              {pedido.valor_total != null && (
                <p className="text-xs text-gray-500 mt-1">
                  Valor: {formatBRL(Number(pedido.valor_total))}
                </p>
              )}
              {cliente && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Cliente</p>
                  <p className="text-sm font-medium text-gray-900">
                    {cliente.nome_fantasia ?? cliente.razao_social}
                  </p>
                  {cliente.nome_fantasia && (
                    <p className="text-xs text-gray-500">{cliente.razao_social}</p>
                  )}
                  {cliente.cnpj && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{cliente.cnpj}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Documentos */}
          {(nfe.xml_url || nfe.danfe_url) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Documentos</h2>
              <div className="space-y-2">
                {nfe.xml_url && (
                  <a
                    href={nfe.xml_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                  >
                    <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded">XML</span>
                    Arquivo XML da NF-e
                  </a>
                )}
                {nfe.danfe_url && (
                  <a
                    href={nfe.danfe_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                  >
                    <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded">PDF</span>
                    DANFE
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
