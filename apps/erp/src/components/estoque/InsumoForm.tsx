'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  insumoId?: string
  inicial?: Partial<{
    codigo: string
    descricao: string
    tipo: string
    unidade: string
    estoque_minimo: string
    estoque_maximo: string
    ponto_reposicao: string
    lead_time_dias: string
    observacoes: string
    status: string
  }>
}

export default function InsumoForm({ insumoId, inicial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    codigo:          inicial?.codigo          ?? '',
    descricao:       inicial?.descricao       ?? '',
    tipo:            inicial?.tipo            ?? 'substrato',
    unidade:         inicial?.unidade         ?? 'KG',
    estoque_minimo:  inicial?.estoque_minimo  ?? '',
    estoque_maximo:  inicial?.estoque_maximo  ?? '',
    ponto_reposicao: inicial?.ponto_reposicao ?? '',
    lead_time_dias:  inicial?.lead_time_dias  ?? '7',
    observacoes:     inicial?.observacoes     ?? '',
    status:          inicial?.status          ?? 'ativo',
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function set(campo: string, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const payload = {
      ...form,
      lead_time_dias:  parseInt(form.lead_time_dias) || 7,
      estoque_minimo:  form.estoque_minimo  ? parseFloat(form.estoque_minimo)  : null,
      estoque_maximo:  form.estoque_maximo  ? parseFloat(form.estoque_maximo)  : null,
      ponto_reposicao: form.ponto_reposicao ? parseFloat(form.ponto_reposicao) : null,
      observacoes:     form.observacoes || null,
    }

    const url    = insumoId ? `/api/insumos/${insumoId}` : '/api/insumos'
    const method = insumoId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro ?? 'Erro ao salvar insumo.')
      setCarregando(false)
      return
    }

    router.push(`/insumos/${data.id}`)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Identificação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Código *</label>
            <input required value={form.codigo} onChange={e => set('codigo', e.target.value)}
              className={inputClass} placeholder="Ex: TIN-CYAN-001" />
          </div>
          <div>
            <label className={labelClass}>Tipo *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="substrato">Substrato</option>
              <option value="tinta">Tinta</option>
              <option value="adesivo">Adesivo</option>
              <option value="verniz">Verniz</option>
              <option value="solvente">Solvente</option>
              <option value="cilindro">Cilindro</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descrição *</label>
            <input required value={form.descricao} onChange={e => set('descricao', e.target.value)}
              className={inputClass} placeholder="Descrição completa do insumo" />
          </div>
          <div>
            <label className={labelClass}>Unidade *</label>
            <select value={form.unidade} onChange={e => set('unidade', e.target.value)}
              className={inputClass + ' bg-white'}>
              {['KG', 'G', 'L', 'ML', 'M', 'M2', 'UN', 'CX', 'RL'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Controle de Estoque</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Estoque Mínimo</label>
            <input type="number" min="0" step="0.001" value={form.estoque_minimo}
              onChange={e => set('estoque_minimo', e.target.value)}
              className={inputClass} placeholder="0.000" />
          </div>
          <div>
            <label className={labelClass}>Estoque Máximo</label>
            <input type="number" min="0" step="0.001" value={form.estoque_maximo}
              onChange={e => set('estoque_maximo', e.target.value)}
              className={inputClass} placeholder="0.000" />
          </div>
          <div>
            <label className={labelClass}>Ponto de Reposição</label>
            <input type="number" min="0" step="0.001" value={form.ponto_reposicao}
              onChange={e => set('ponto_reposicao', e.target.value)}
              className={inputClass} placeholder="0.000" />
          </div>
          <div>
            <label className={labelClass}>Lead Time (dias úteis)</label>
            <input type="number" min="1" value={form.lead_time_dias}
              onChange={e => set('lead_time_dias', e.target.value)}
              className={inputClass} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Observações</h2>
        <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
          rows={3} className={inputClass} placeholder="Especificações técnicas, notas de armazenamento..." />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {carregando ? 'Salvando...' : insumoId ? 'Salvar Alterações' : 'Criar Insumo'}
        </button>
      </div>
    </form>
  )
}
