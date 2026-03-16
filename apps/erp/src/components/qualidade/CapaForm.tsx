'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Usuario { id: string; nome: string }
interface Props { ncId: string; usuarios: Usuario[] }

const TIPOS_CAPA = [
  ['contencao',   'Contenção'],
  ['causa_raiz',  'Análise de Causa Raiz'],
  ['corretiva',   'Ação Corretiva'],
  ['preventiva',  'Ação Preventiva'],
  ['melhoria',    'Melhoria'],
]

export default function CapaForm({ ncId, usuarios }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({
    tipo:           'contencao',
    descricao:      '',
    responsavel_id: '',
    prazo:          '',
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

    const res = await fetch(`/api/qualidade/ncs/${ncId}/capa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo:           form.tipo,
        descricao:      form.descricao,
        responsavel_id: form.responsavel_id || null,
        prazo:          form.prazo,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setErro(data.erro ?? 'Erro ao criar ação.'); setCarregando(false); return }

    setAberto(false)
    setForm({ tipo: 'contencao', descricao: '', responsavel_id: '', prazo: '' })
    setCarregando(false)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-purple-400 text-sm text-gray-500 hover:text-purple-600 rounded-lg transition-colors">
        + Adicionar Ação CAPA
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Nova Ação CAPA</h3>
        <button type="button" onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      {erro && <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{erro}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
            className={inputClass + ' bg-white'}>
            {TIPOS_CAPA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <textarea required rows={3} value={form.descricao} onChange={e => set('descricao', e.target.value)}
            className={inputClass} placeholder="Descreva a ação a ser realizada..." />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Responsável</label>
          <select value={form.responsavel_id} onChange={e => set('responsavel_id', e.target.value)}
            className={inputClass + ' bg-white'}>
            <option value="">Selecione...</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Prazo *</label>
          <input required type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)}
            className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setAberto(false)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg">
          {carregando ? 'Salvando...' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
