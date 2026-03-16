import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const TIPO_BADGE: Record<string, string> = {
  fabricado:   'bg-blue-100 text-blue-700',
  comprado:    'bg-purple-100 text-purple-700',
  beneficiado: 'bg-amber-100 text-amber-700',
}

const POLITICA_LABEL: Record<string, string> = {
  make_to_order: 'Sob Pedido (Make to Order)',
  make_to_stock: 'Para Estoque (Make to Stock)',
  kanban:        'Kanban',
}

function Campo({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{valor ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default async function ProdutoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: produto } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single()

  if (!produto) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/produtos" className="hover:text-blue-600">Produtos</Link>
            <span className="mx-2">›</span>
            <span>{produto.codigo}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{produto.descricao}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[produto.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
              {produto.tipo}
            </span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${produto.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {produto.status}
            </span>
          </div>
        </div>
        <Link href={`/produtos/${produto.id}/editar`}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          ✏️ Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identificação */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Identificação</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Campo label="Código" valor={produto.codigo} />
              <Campo label="Unidade" valor={produto.unidade} />
              <Campo label="NCM" valor={produto.ncm} />
              <Campo label="CEST" valor={produto.cest} />
              <Campo label="Origem" valor={produto.origem} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Estoque & Produção</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Campo label="Política" valor={POLITICA_LABEL[produto.politica_estoque]} />
              <Campo label="Lead Time" valor={produto.lead_time_dias != null ? `${produto.lead_time_dias} dias` : null} />
              <Campo label="Estoque Mínimo" valor={produto.estoque_minimo != null ? String(produto.estoque_minimo) : null} />
              <Campo label="Estoque Máximo" valor={produto.estoque_maximo != null ? String(produto.estoque_maximo) : null} />
              <Campo label="Ponto de Reposição" valor={produto.ponto_reposicao != null ? String(produto.ponto_reposicao) : null} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Fiscal</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Campo label="ICMS" valor={produto.aliquota_icms != null ? `${produto.aliquota_icms}%` : null} />
              <Campo label="IPI"  valor={produto.aliquota_ipi  != null ? `${produto.aliquota_ipi}%`  : null} />
              <Campo label="PIS"  valor={produto.aliquota_pis  != null ? `${produto.aliquota_pis}%`  : null} />
              <Campo label="COFINS" valor={produto.aliquota_cofins != null ? `${produto.aliquota_cofins}%` : null} />
            </dl>
          </div>

          {produto.observacoes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Observações</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{produto.observacoes}</p>
            </div>
          )}
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Dimensões & Peso</h2>
            <dl className="space-y-3">
              <Campo label="Peso" valor={produto.peso_kg != null ? `${produto.peso_kg} kg` : null} />
              <Campo label="Largura" valor={produto.largura_mm != null ? `${produto.largura_mm} mm` : null} />
              <Campo label="Altura" valor={produto.altura_mm != null ? `${produto.altura_mm} mm` : null} />
              <Campo label="Comprimento" valor={produto.comprimento_mm != null ? `${produto.comprimento_mm} mm` : null} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">E-commerce</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Visível</dt>
                <dd className={`text-sm font-medium ${produto.visivel_ecommerce ? 'text-green-600' : 'text-gray-400'}`}>
                  {produto.visivel_ecommerce ? '✓ Sim' : '— Não'}
                </dd>
              </div>
              {produto.visivel_ecommerce && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Destaque</dt>
                  <dd className={`text-sm font-medium ${produto.destaque ? 'text-amber-600' : 'text-gray-400'}`}>
                    {produto.destaque ? '★ Sim' : '— Não'}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Datas</h2>
            <dl className="space-y-3">
              <Campo label="Cadastrado em" valor={new Date(produto.criado_em).toLocaleDateString('pt-BR')} />
              <Campo label="Atualizado em" valor={new Date(produto.atualizado_em).toLocaleDateString('pt-BR')} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
