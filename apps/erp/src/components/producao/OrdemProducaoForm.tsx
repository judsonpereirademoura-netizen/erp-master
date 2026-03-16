'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Produto { id: string; codigo: string; descricao: string; unidade: string }
interface Maquina { id: string; codigo: string; nome: string }
interface Usuario { id: string; nome: string }

interface Props {
  produtos: Produto[]
  maquinas: Maquina[]
  operadores: Usuario[]
  supervisores: Usuario[]
  osId?: string
  inicial?: Partial<{
    produto_id: string
    maquina_id: string
    operador_id: string
    supervisor_id: string
    pedido_id: string
    quantidade_prevista: string
    data_prev_inicio: string
    data_prev_fim: string
    setup_min: string
    prioridade: string
    observacoes: string
  }>
}

export default function OrdemProducaoForm({ produtos, maquinas, operadores, supervisores, osId, inicial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    produto_id:        inicial?.produto_id       ?? '',
    maquina_id:        inicial?.maquina_id       ?? '',
    operador_id:       inicial?.operador_id      ?? '',
    supervisor_id:     inicial?.supervisor_id    ?? '',
    quantidade_prevista: inicial?.quantidade_prevista ?? '',
    data_prev_inicio:  inicial?.data_prev_inicio ?? '',
    data_prev_fim:     inicial?.data_prev_fim    ?? '',
    setup_min:         inicial?.setup_min        ?? '0',
    prioridade:        inicial?.prioridade       ?? '5',
    observacoes:       inicial?.observacoes      ?? '',
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
      quantidade_prevista: parseFloat(form.quantidade_prevista) || 0,
      setup_min:           parseInt(form.setup_min) || 0,
      prioridade:          parseInt(form.prioridade) || 5,
      maquina_id:          form.maquina_id   || null,
      operador_id:         form.operador_id  || null,
      supervisor_id:       form.supervisor_id || null,
      data_prev_inicio:    form.data_prev_inicio || null,
      data_prev_fim:       form.data_prev_fim    || null,
      observacoes:         form.observacoes || null,
    }

    const url    = osId ? `/api/producao/${osId}` : '/api/producao'
    const method = osId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro ?? 'Erro ao salvar OS.')
      setCarregando(false)
      return
    }

    router.push(`/producao/${data.id}`)
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
        <h2 className="font-semibold text-gray-800 mb-4">Produto e Máquina</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Produto *</label>
            <select required value={form.produto_id} onChange={e => set('produto_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione o produto...</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Máquina</label>
            <select value={form.maquina_id} onChange={e => set('maquina_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione a máquina...</option>
              {maquinas.map(m => (
                <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quantidade Prevista *</label>
            <input required type="number" min="0.001" step="0.001" value={form.quantidade_prevista}
              onChange={e => set('quantidade_prevista', e.target.value)}
              className={inputClass} placeholder="0.000" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Planejamento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Data Prevista Início</label>
            <input type="date" value={form.data_prev_inicio} onChange={e => set('data_prev_inicio', e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Data Prevista Fim</label>
            <input type="date" value={form.data_prev_fim} onChange={e => set('data_prev_fim', e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tempo de Setup (min)</label>
            <input type="number" min="0" value={form.setup_min} onChange={e => set('setup_min', e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prioridade (1=Alta, 10=Baixa)</label>
            <input type="range" min="1" max="10" value={form.prioridade}
              onChange={e => set('prioridade', e.target.value)}
              className="w-full" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>🔴 Alta</span>
              <span className="font-medium text-gray-700">P{form.prioridade}</span>
              <span>Baixa 🔵</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Equipe</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Operador</label>
            <select value={form.operador_id} onChange={e => set('operador_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione o operador...</option>
              {operadores.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Supervisor</label>
            <select value={form.supervisor_id} onChange={e => set('supervisor_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione o supervisor...</option>
              {supervisores.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Observações</h2>
        <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
          rows={3} className={inputClass} placeholder="Especificações de produção, cores, acabamentos..." />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {carregando ? 'Salvando...' : osId ? 'Salvar Alterações' : 'Criar OS'}
        </button>
      </div>
    </form>
  )
}
