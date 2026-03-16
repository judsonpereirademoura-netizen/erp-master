import Link from 'next/link'
import InsumoForm from '@/components/estoque/InsumoForm'

export default function NovoInsumoPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/insumos" className="hover:text-blue-600">Insumos</Link>
          <span className="mx-2">›</span>
          <span>Novo Insumo</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Insumo</h1>
      </div>
      <InsumoForm />
    </div>
  )
}
