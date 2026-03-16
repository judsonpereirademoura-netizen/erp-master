'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Produto   { id: string; codigo: string; descricao: string }
interface OS        { id: string; numero: number }
interface Pedido    { id: string; numero: number }
interface Cliente   { id: string; razao_social: string; nome_fantasia?: string }
interface Lote      { id: string; codigo_lote: string }
interface Usuario   { id: string; nome: string }

interface Props {
  produtos:  Produto[]
  ordens:    OS[]
  pedidos:   Pedido[]
  clientes:  Cliente[]
  lotes:     Lote[]
  usuarios:  Usuario[]
  ncId?:     string
  osPre?:    string
  pedidoPre?: string
  clientePre?: string
}

const ORIGENS = [
  ['inspecao_entrada',  'Inspeção de Entrada'],
  ['inspecao_processo', 'Inspeção em Processo'],
  ['inspecao_final',    'Inspeção Final'],
  ['reclamacao_cliente','Reclamação de Cliente'],
  ['auditoria',         'Auditoria'],
  ['desvio_processo',   'Desvio de Processo'],
  ['outro',             'Outro'],
]

const CATEGORIAS = [
  ['qualidade_produto',   'Qualidade do Produto'],
  ['seguranca_alimentar', 'Segurança Alimentar'],
  ['alergenio',           'Alérgeno'],
  ['processo',            'Processo'],
  ['equipamento',         'Equipamento'],
  ['fornecedor',          'Fornecedor'],
  ['documentacao',        'Documentação'],
  ['outro',               'Outro'],
]

export default function NCForm({ produtos, ordens, pedidos, clientes, lotes, usuarios, ncId, osPre, pedidoPre, clientePre }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    tipo_origem:        'inspecao_processo',
    os_id:              osPre      ?? '',
    pedido_id:          pedidoPre  ?? '',
    cliente_id:         clientePre ?? '',
    lote_id:            '',
    produto_id:         '',
    categoria:          'qualidade_produto',
    gravidade:          'menor',
    titulo:             '',
    descricao:          '',
    responsavel_id:     '',
    prazo_capa:         '',
    requer_recall:      false,
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function set(campo: string, valor: string | boolean) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const res = await fetch(ncId ? `/api/qualidade/ncs/${ncId}` : '/api/qualidade/ncs', {
      method: ncId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        os_id:          form.os_id         || null,
        pedido_id:      form.pedido_id     || null,
        cliente_id:     form.cliente_id    || null,
        lote_id:        form.lote_id       || null,
        produto_id:     form.produto_id    || null,
        responsavel_id: form.responsavel_id || null,
        prazo_capa:     form.prazo_capa    || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setErro(data.erro ?? 'Erro ao salvar NC.'); setCarregando(false); return }
    router.push(`/qualidade/ncs/${data.id}`)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

      {/* Classificação */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Classificação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Origem *</label>
            <select required value={form.tipo_origem} onChange={e => set('tipo_origem', e.target.value)}
              className={inputClass + ' bg-white'}>
              {ORIGENS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Categoria *</label>
            <select required value={form.categoria} onChange={e => set('categoria', e.target.value)}
              className={inputClass + ' bg-white'}>
              {CATEGORIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Gravidade *</label>
            <select required value={form.gravidade} onChange={e => set('gravidade', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="menor">Menor</option>
              <option value="maior">Maior</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>
      </div>

      {/* Descrição */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Descrição</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Título *</label>
            <input required value={form.titulo} onChange={e => set('titulo', e.target.value)}
              className={inputClass} placeholder="Descreva o problema resumidamente..." />
          </div>
          <div>
            <label className={labelClass}>Descrição Detalhada *</label>
            <textarea required rows={4} value={form.descricao} onChange={e => set('descricao', e.target.value)}
              className={inputClass} placeholder="Detalhe o não-conformidade: o que aconteceu, onde, quando, quais materiais envolvidos..." />
          </div>
        </div>
      </div>

      {/* Vínculo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Vínculo (opcional)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ordem de Produção</label>
            <select value={form.os_id} onChange={e => set('os_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Nenhuma</option>
              {ordens.map(o => <option key={o.id} value={o.id}>OS-{String(o.numero).padStart(4,'0')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Pedido</label>
            <select value={form.pedido_id} onChange={e => set('pedido_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Nenhum</option>
              {pedidos.map(p => <option key={p.id} value={p.id}>#{p.numero}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Cliente</label>
            <select value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Nenhum</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_fantasia ?? c.razao_social}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Lote de Insumo</label>
            <select value={form.lote_id} onChange={e => set('lote_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Nenhum</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.codigo_lote}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Responsável e prazo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Responsável e Prazo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Responsável pela Investigação</label>
            <select value={form.responsavel_id} onChange={e => set('responsavel_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione...</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Prazo para CAPA</label>
            <input type="date" value={form.prazo_capa} onChange={e => set('prazo_capa', e.target.value)}
              className={inputClass} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <input type="checkbox" id="recall" checked={form.requer_recall}
            onChange={e => set('requer_recall', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
          <label htmlFor="recall" className="text-sm font-medium text-gray-700">
            Esta NC pode requerer <span className="text-red-600 font-semibold">Recall</span> de produto
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {carregando ? 'Salvando...' : ncId ? 'Salvar Alterações' : 'Abrir NC'}
        </button>
      </div>
    </form>
  )
}
