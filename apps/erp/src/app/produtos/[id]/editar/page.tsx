import { createServerClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProdutoForm from '@/components/produtos/ProdutoForm'

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
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
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/produtos" className="hover:text-blue-600">Produtos</Link>
          <span className="mx-2">›</span>
          <Link href={`/produtos/${produto.id}`} className="hover:text-blue-600">{produto.codigo}</Link>
          <span className="mx-2">›</span>
          <span>Editar</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Editar Produto</h1>
      </div>
      <ProdutoForm
        produtoId={produto.id}
        inicial={{
          codigo:            produto.codigo,
          descricao:         produto.descricao,
          ncm:               produto.ncm ?? '',
          cest:              produto.cest ?? '',
          unidade:           produto.unidade,
          tipo:              produto.tipo,
          politica_estoque:  produto.politica_estoque,
          estoque_minimo:    produto.estoque_minimo != null ? String(produto.estoque_minimo) : '',
          estoque_maximo:    produto.estoque_maximo != null ? String(produto.estoque_maximo) : '',
          ponto_reposicao:   produto.ponto_reposicao != null ? String(produto.ponto_reposicao) : '',
          lead_time_dias:    String(produto.lead_time_dias),
          peso_kg:           produto.peso_kg != null ? String(produto.peso_kg) : '',
          largura_mm:        produto.largura_mm != null ? String(produto.largura_mm) : '',
          altura_mm:         produto.altura_mm != null ? String(produto.altura_mm) : '',
          comprimento_mm:    produto.comprimento_mm != null ? String(produto.comprimento_mm) : '',
          visivel_ecommerce: produto.visivel_ecommerce,
          destaque:          produto.destaque,
          descricao_html:    produto.descricao_html ?? '',
          aliquota_icms:     produto.aliquota_icms != null ? String(produto.aliquota_icms) : '',
          aliquota_ipi:      produto.aliquota_ipi  != null ? String(produto.aliquota_ipi)  : '',
          aliquota_pis:      produto.aliquota_pis  != null ? String(produto.aliquota_pis)  : '',
          aliquota_cofins:   produto.aliquota_cofins != null ? String(produto.aliquota_cofins) : '',
          ncm_origem:        produto.origem ?? '0',
          observacoes:       produto.observacoes ?? '',
          status:            produto.status,
        }}
      />
    </div>
  )
}
