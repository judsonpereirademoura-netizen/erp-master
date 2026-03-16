import ProdutoForm from '@/components/produtos/ProdutoForm'
import Link from 'next/link'

export default function NovoProdutoPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/produtos" className="hover:text-blue-600">Produtos</Link>
          <span className="mx-2">›</span>
          <span>Novo Produto</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Produto</h1>
      </div>
      <ProdutoForm />
    </div>
  )
}
