'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Insumo {
  id: string
  codigo: string
  descricao: string
  unidade: string
}

interface Fornecedor {
  id: string
  razao_social: string
  nome_fantasia?: string | null
}

interface Props {
  insumos: Insumo[]
  fornecedores: Fornecedor[]
}

export default function LoteForm({ insumos, fornecedores }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    insumo_id:          '',
    fornecedor_id:      '',
    codigo_lote:        '',
    quantidade:         '',
    custo_unitario:     '',
    data_entrada:       new Date().toISOString().split('T')[0],
    data_validade:      '',
    nota_fiscal_entrada:'',
    laudo_aprovado:     false,
    localizacao:        '',
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function set(campo: string, valor: any) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.insumo_id || !form.quantidade) {
      setErro('Insumo e quantidade são obrigatórios.')
      return
    }
    setCarregando(true)
    setErro('')

    const payload = {
      insumo_id:           form.insumo_id,
      fornecedor_id:       form.fornecedor_id || null,
      codigo_lote:         form.codigo_lote || undefined, // será gerado pelo servidor se vazio
      quantidade:          parseFloat(form.quantidade),
      quantidade_disp:     parseFloat(form.quantidade),
      custo_unitario:      form.custo_unitario ? parseFloat(form.custo_unitario) : null,
      data_entrada:        form.data_entrada,
      data_validade:       form.data_validade || null,
      nota_fiscal_entrada: form.nota_fiscal_entrada || null,
      laudo_aprovado:      form.laudo_aprovado,
      localizacao:         form.localizacao || null,
    }

    const res = await fetch('/api/estoque/lotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro ?? 'Erro ao registrar lote.')
      setCarregando(false)
      return
    }

    router.push(`/estoque/lotes/${data.id}`)
    router.refresh()
  }

  const insumoSelecionado = insumos.find(i => i.id === form.insumo_id)
  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Dados do Lote</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Insumo *</label>
            <select required value={form.insumo_id} onChange={e => set('insumo_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione o insumo...</option>
              {insumos.map(i => (
                <option key={i.id} value={i.id}>{i.codigo} — {i.descricao}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fornecedor</label>
            <select value={form.fornecedor_id} onChange={e => set('fornecedor_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione o fornecedor...</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.nome_fantasia ?? f.razao_social}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Código do Lote</label>
            <input value={form.codigo_lote} onChange={e => set('codigo_lote', e.target.value)}
              className={inputClass} placeholder="Ex: LOT-2026-03-00001 (auto se vazio)" />
          </div>
          <div>
            <label className={labelClass}>
              Quantidade {insumoSelecionado ? `(${insumoSelecionado.unidade})` : ''} *
            </label>
            <input required type="number" min="0.001" step="0.001" value={form.quantidade}
              onChange={e => set('quantidade', e.target.value)}
              className={inputClass} placeholder="0.000" />
          </div>
          <div>
            <label className={labelClass}>Custo Unitário (R$)</label>
            <input type="number" min="0" step="0.0001" value={form.custo_unitario}
              onChange={e => set('custo_unitario', e.target.value)}
              className={inputClass} placeholder="0.0000" />
          </div>
          <div>
            <label className={labelClass}>Data de Entrada *</label>
            <input required type="date" value={form.data_entrada} onChange={e => set('data_entrada', e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Data de Validade</label>
            <input type="date" value={form.data_validade} onChange={e => set('data_validade', e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nota Fiscal de Entrada</label>
            <input value={form.nota_fiscal_entrada} onChange={e => set('nota_fiscal_entrada', e.target.value)}
              className={inputClass} placeholder="Número da NF-e" />
          </div>
          <div>
            <label className={labelClass}>Localização</label>
            <input value={form.localizacao} onChange={e => set('localizacao', e.target.value)}
              className={inputClass} placeholder="Ex: A-01-C-03 (Prédio-Corredor-Prat.-Pos.)" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <input type="checkbox" id="laudo_aprovado" checked={form.laudo_aprovado}
              onChange={e => set('laudo_aprovado', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            <label htmlFor="laudo_aprovado" className="text-sm text-gray-700">
              Laudo de qualidade aprovado (IFS Pack Secure)
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {carregando ? 'Registrando...' : 'Registrar Entrada'}
        </button>
      </div>
    </form>
  )
}
