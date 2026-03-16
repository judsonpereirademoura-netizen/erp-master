'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TIPO_OPTIONS = [
  { value: 'interno', label: 'Interno' },
  { value: 'externo', label: 'Externo' },
  { value: 'agencia', label: 'Agência' },
]

interface Props {
  supervisores: { id: string; nome: string }[]
}

export default function NovoRepresentanteForm({ supervisores }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const supervisor_id = fd.get('supervisor_id') as string

    const body: Record<string, unknown> = {
      nome:         fd.get('nome') as string,
      cpf:          (fd.get('cpf') as string) || null,
      tipo:         fd.get('tipo') as string,
      comissao_pct: parseFloat(fd.get('comissao_pct') as string) || 0,
      regiao:       (fd.get('regiao') as string) || null,
      supervisor_id: supervisor_id || null,
    }

    try {
      const res = await fetch('/api/representantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.erro ?? 'Erro ao criar representante.')
        setLoading(false)
        return
      }
      router.push(`/representantes/${json.id}`)
    } catch (err: any) {
      setErro(err?.message ?? 'Erro inesperado.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {erro && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Nome */}
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          placeholder="Nome completo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* CPF */}
      <div>
        <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
          CPF
        </label>
        <input
          id="cpf"
          name="cpf"
          type="text"
          placeholder="000.000.000-00"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tipo */}
      <div>
        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo <span className="text-red-500">*</span>
        </label>
        <select
          id="tipo"
          name="tipo"
          required
          defaultValue="externo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {TIPO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Comissão % */}
      <div>
        <label htmlFor="comissao_pct" className="block text-sm font-medium text-gray-700 mb-1">
          Comissão (%)
        </label>
        <input
          id="comissao_pct"
          name="comissao_pct"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Região */}
      <div>
        <label htmlFor="regiao" className="block text-sm font-medium text-gray-700 mb-1">
          Região
        </label>
        <input
          id="regiao"
          name="regiao"
          type="text"
          placeholder="Ex: Sul, Nordeste, SP Capital..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Supervisor */}
      <div>
        <label htmlFor="supervisor_id" className="block text-sm font-medium text-gray-700 mb-1">
          Supervisor
        </label>
        <select
          id="supervisor_id"
          name="supervisor_id"
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Sem supervisor</option>
          {supervisores.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <Link
          href="/representantes"
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {loading ? 'Salvando...' : 'Criar Representante'}
        </button>
      </div>
    </form>
  )
}
