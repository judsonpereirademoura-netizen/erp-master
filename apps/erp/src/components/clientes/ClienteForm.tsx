'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClienteFormData {
  cnpj: string
  cpf: string
  razao_social: string
  nome_fantasia: string
  ie: string
  im: string
  regime_tributario: string
  segmento: string
  limite_credito: string
  permite_parcial: boolean
  requer_aprovacao: boolean
  representante_id: string
  observacoes: string
  status: string
}

interface Props {
  clienteId?: string
  inicial?: Partial<ClienteFormData>
  representantes: { id: string; nome: string }[]
}

const REGIMES = [
  { value: 'simples_nacional', label: 'Simples Nacional' },
  { value: 'lucro_presumido',  label: 'Lucro Presumido' },
  { value: 'lucro_real',       label: 'Lucro Real' },
  { value: 'mei',              label: 'MEI' },
  { value: 'isento',           label: 'Isento' },
]

export default function ClienteForm({ clienteId, inicial, representantes }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<ClienteFormData>({
    cnpj:              inicial?.cnpj ?? '',
    cpf:               inicial?.cpf ?? '',
    razao_social:      inicial?.razao_social ?? '',
    nome_fantasia:     inicial?.nome_fantasia ?? '',
    ie:                inicial?.ie ?? '',
    im:                inicial?.im ?? '',
    regime_tributario: inicial?.regime_tributario ?? 'simples_nacional',
    segmento:          inicial?.segmento ?? '',
    limite_credito:    inicial?.limite_credito ?? '0',
    permite_parcial:   inicial?.permite_parcial ?? true,
    requer_aprovacao:  inicial?.requer_aprovacao ?? false,
    representante_id:  inicial?.representante_id ?? '',
    observacoes:       inicial?.observacoes ?? '',
    status:            inicial?.status ?? 'ativo',
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function set(campo: keyof ClienteFormData, valor: any) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const payload = {
      ...form,
      limite_credito: parseFloat(form.limite_credito) || 0,
      representante_id: form.representante_id || null,
      cnpj: form.cnpj || null,
      cpf: form.cpf || null,
      ie: form.ie || null,
      im: form.im || null,
      nome_fantasia: form.nome_fantasia || null,
      segmento: form.segmento || null,
      observacoes: form.observacoes || null,
    }

    const url = clienteId ? `/api/clientes/${clienteId}` : '/api/clientes'
    const method = clienteId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro ?? 'Erro ao salvar cliente.')
      setCarregando(false)
      return
    }

    router.push(`/clientes/${data.id}`)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>
      )}

      {/* Identificação */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Identificação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Razão Social *</label>
            <input required value={form.razao_social} onChange={e => set('razao_social', e.target.value)}
              className={inputClass} placeholder="Razão social completa" />
          </div>
          <div>
            <label className={labelClass}>Nome Fantasia</label>
            <input value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value)}
              className={inputClass} placeholder="Nome fantasia" />
          </div>
          <div>
            <label className={labelClass}>Segmento</label>
            <input value={form.segmento} onChange={e => set('segmento', e.target.value)}
              className={inputClass} placeholder="Ex: Alimentos, Farmacêutico..." />
          </div>
          <div>
            <label className={labelClass}>CNPJ</label>
            <input value={form.cnpj} onChange={e => set('cnpj', e.target.value)}
              className={inputClass} placeholder="00.000.000/0000-00" maxLength={18} />
          </div>
          <div>
            <label className={labelClass}>CPF (Pessoa Física)</label>
            <input value={form.cpf} onChange={e => set('cpf', e.target.value)}
              className={inputClass} placeholder="000.000.000-00" maxLength={14} />
          </div>
          <div>
            <label className={labelClass}>IE (Inscrição Estadual)</label>
            <input value={form.ie} onChange={e => set('ie', e.target.value)}
              className={inputClass} placeholder="Inscrição estadual" />
          </div>
          <div>
            <label className={labelClass}>IM (Inscrição Municipal)</label>
            <input value={form.im} onChange={e => set('im', e.target.value)}
              className={inputClass} placeholder="Inscrição municipal" />
          </div>
          <div>
            <label className={labelClass}>Regime Tributário</label>
            <select value={form.regime_tributario} onChange={e => set('regime_tributario', e.target.value)}
              className={inputClass + ' bg-white'}>
              {REGIMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="suspenso">Suspenso</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comercial */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Comercial</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Limite de Crédito (R$)</label>
            <input type="number" min="0" step="0.01" value={form.limite_credito}
              onChange={e => set('limite_credito', e.target.value)}
              className={inputClass} placeholder="0,00" />
          </div>
          <div>
            <label className={labelClass}>Representante</label>
            <select value={form.representante_id} onChange={e => set('representante_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Sem representante</option>
              {representantes.map(r => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="permite_parcial" checked={form.permite_parcial}
              onChange={e => set('permite_parcial', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            <label htmlFor="permite_parcial" className="text-sm text-gray-700">Permite entrega parcial</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="requer_aprovacao" checked={form.requer_aprovacao}
              onChange={e => set('requer_aprovacao', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            <label htmlFor="requer_aprovacao" className="text-sm text-gray-700">Requer aprovação de pedidos</label>
          </div>
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Observações</h2>
        <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
          rows={3} className={inputClass} placeholder="Observações internas sobre o cliente..." />
      </div>

      {/* Botões */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {carregando ? 'Salvando...' : clienteId ? 'Salvar Alterações' : 'Criar Cliente'}
        </button>
      </div>
    </form>
  )
}
