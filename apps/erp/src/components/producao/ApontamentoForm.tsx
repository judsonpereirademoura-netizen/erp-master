'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props { osId: string }

export default function ApontamentoForm({ osId }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({
    tipo:              'producao',
    quantidade_boa:    '',
    quantidade_refugo: '',
    metros_produzidos: '',
    velocidade_m_min:  '',
    inicio:            new Date().toISOString().slice(0, 16),
    fim:               '',
    motivo_parada:     '',
    observacoes:       '',
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

    const res = await fetch(`/api/producao/${osId}/apontamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo:              form.tipo,
        quantidade_boa:    parseFloat(form.quantidade_boa)    || 0,
        quantidade_refugo: parseFloat(form.quantidade_refugo) || 0,
        metros_produzidos: parseFloat(form.metros_produzidos) || 0,
        velocidade_m_min:  form.velocidade_m_min ? parseFloat(form.velocidade_m_min) : null,
        inicio:            form.inicio,
        fim:               form.fim || null,
        motivo_parada:     form.tipo === 'parada' ? form.motivo_parada || null : null,
        observacoes:       form.observacoes || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro ?? 'Erro ao registrar apontamento.')
      setCarregando(false)
      return
    }

    setAberto(false)
    setForm({ tipo: 'producao', quantidade_boa: '', quantidade_refugo: '', metros_produzidos: '', velocidade_m_min: '', inicio: new Date().toISOString().slice(0, 16), fim: '', motivo_parada: '', observacoes: '' })
    setCarregando(false)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 text-sm text-gray-500 hover:text-blue-600 rounded-lg transition-colors">
        + Registrar Apontamento
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Novo Apontamento</h3>
        <button type="button" onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {erro && <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{erro}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
            className={inputClass + ' bg-white'}>
            <option value="setup">Setup</option>
            <option value="producao">Produção</option>
            <option value="parada">Parada</option>
            <option value="manutencao">Manutenção</option>
            <option value="limpeza">Limpeza</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Início</label>
          <input type="datetime-local" value={form.inicio} onChange={e => set('inicio', e.target.value)}
            className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Fim (opcional)</label>
          <input type="datetime-local" value={form.fim} onChange={e => set('fim', e.target.value)}
            className={inputClass} />
        </div>
        {form.tipo === 'producao' && (
          <>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Qtd. Boa</label>
              <input type="number" min="0" step="0.001" value={form.quantidade_boa}
                onChange={e => set('quantidade_boa', e.target.value)}
                className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Qtd. Refugo</label>
              <input type="number" min="0" step="0.001" value={form.quantidade_refugo}
                onChange={e => set('quantidade_refugo', e.target.value)}
                className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Metros Produzidos</label>
              <input type="number" min="0" step="0.001" value={form.metros_produzidos}
                onChange={e => set('metros_produzidos', e.target.value)}
                className={inputClass} placeholder="0.000" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Velocidade (m/min)</label>
              <input type="number" min="0" step="0.1" value={form.velocidade_m_min}
                onChange={e => set('velocidade_m_min', e.target.value)}
                className={inputClass} placeholder="0.0" />
            </div>
          </>
        )}
        {form.tipo === 'parada' && (
          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Motivo da Parada</label>
            <input value={form.motivo_parada} onChange={e => set('motivo_parada', e.target.value)}
              className={inputClass} placeholder="Descreva o motivo..." />
          </div>
        )}
        <div className="col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Observações</label>
          <input value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
            className={inputClass} placeholder="Observações..." />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setAberto(false)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg">
          {carregando ? 'Salvando...' : 'Registrar'}
        </button>
      </div>
    </form>
  )
}
