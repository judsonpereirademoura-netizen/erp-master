'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProdutoFormData {
  codigo: string
  descricao: string
  ncm: string
  cest: string
  unidade: string
  tipo: string
  politica_estoque: string
  estoque_minimo: string
  estoque_maximo: string
  ponto_reposicao: string
  lead_time_dias: string
  peso_kg: string
  largura_mm: string
  altura_mm: string
  comprimento_mm: string
  visivel_ecommerce: boolean
  destaque: boolean
  descricao_html: string
  aliquota_icms: string
  aliquota_ipi: string
  aliquota_pis: string
  aliquota_cofins: string
  ncm_origem: string
  observacoes: string
  status: string
}

interface Props {
  produtoId?: string
  inicial?: Partial<ProdutoFormData>
}

export default function ProdutoForm({ produtoId, inicial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<ProdutoFormData>({
    codigo:            inicial?.codigo ?? '',
    descricao:         inicial?.descricao ?? '',
    ncm:               inicial?.ncm ?? '',
    cest:              inicial?.cest ?? '',
    unidade:           inicial?.unidade ?? 'UN',
    tipo:              inicial?.tipo ?? 'fabricado',
    politica_estoque:  inicial?.politica_estoque ?? 'make_to_order',
    estoque_minimo:    inicial?.estoque_minimo ?? '',
    estoque_maximo:    inicial?.estoque_maximo ?? '',
    ponto_reposicao:   inicial?.ponto_reposicao ?? '',
    lead_time_dias:    inicial?.lead_time_dias ?? '3',
    peso_kg:           inicial?.peso_kg ?? '',
    largura_mm:        inicial?.largura_mm ?? '',
    altura_mm:         inicial?.altura_mm ?? '',
    comprimento_mm:    inicial?.comprimento_mm ?? '',
    visivel_ecommerce: inicial?.visivel_ecommerce ?? false,
    destaque:          inicial?.destaque ?? false,
    descricao_html:    inicial?.descricao_html ?? '',
    aliquota_icms:     inicial?.aliquota_icms ?? '',
    aliquota_ipi:      inicial?.aliquota_ipi ?? '',
    aliquota_pis:      inicial?.aliquota_pis ?? '',
    aliquota_cofins:   inicial?.aliquota_cofins ?? '',
    ncm_origem:        inicial?.ncm_origem ?? '0',
    observacoes:       inicial?.observacoes ?? '',
    status:            inicial?.status ?? 'ativo',
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function set(campo: keyof ProdutoFormData, valor: any) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const payload = {
      ...form,
      lead_time_dias:  parseInt(form.lead_time_dias) || 3,
      estoque_minimo:  form.estoque_minimo  ? parseFloat(form.estoque_minimo)  : null,
      estoque_maximo:  form.estoque_maximo  ? parseFloat(form.estoque_maximo)  : null,
      ponto_reposicao: form.ponto_reposicao ? parseFloat(form.ponto_reposicao) : null,
      peso_kg:         form.peso_kg     ? parseFloat(form.peso_kg)     : null,
      largura_mm:      form.largura_mm  ? parseFloat(form.largura_mm)  : null,
      altura_mm:       form.altura_mm   ? parseFloat(form.altura_mm)   : null,
      comprimento_mm:  form.comprimento_mm ? parseFloat(form.comprimento_mm) : null,
      aliquota_icms:   form.aliquota_icms   ? parseFloat(form.aliquota_icms)   : null,
      aliquota_ipi:    form.aliquota_ipi    ? parseFloat(form.aliquota_ipi)    : null,
      aliquota_pis:    form.aliquota_pis    ? parseFloat(form.aliquota_pis)    : null,
      aliquota_cofins: form.aliquota_cofins ? parseFloat(form.aliquota_cofins) : null,
      ncm:  form.ncm  || null,
      cest: form.cest || null,
      descricao_html: form.descricao_html || null,
      observacoes:    form.observacoes    || null,
      origem: form.ncm_origem,
    }

    const url    = produtoId ? `/api/produtos/${produtoId}` : '/api/produtos'
    const method = produtoId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro ?? 'Erro ao salvar produto.')
      setCarregando(false)
      return
    }

    router.push(`/produtos/${data.id}`)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const isMakeToOrder = form.politica_estoque === 'make_to_order'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>
      )}

      {/* Identificação */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Identificação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Código *</label>
            <input required value={form.codigo} onChange={e => set('codigo', e.target.value)}
              className={inputClass} placeholder="Ex: ROT-001" />
          </div>
          <div>
            <label className={labelClass}>Unidade *</label>
            <select value={form.unidade} onChange={e => set('unidade', e.target.value)}
              className={inputClass + ' bg-white'}>
              {['UN','KG','M','M2','M3','CX','PC','RL','L','G'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descrição *</label>
            <input required value={form.descricao} onChange={e => set('descricao', e.target.value)}
              className={inputClass} placeholder="Descrição completa do produto" />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="fabricado">Fabricado</option>
              <option value="comprado">Comprado</option>
              <option value="beneficiado">Beneficiado</option>
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
          <div>
            <label className={labelClass}>NCM</label>
            <input value={form.ncm} onChange={e => set('ncm', e.target.value)}
              className={inputClass} placeholder="0000.00.00" maxLength={10} />
          </div>
          <div>
            <label className={labelClass}>CEST</label>
            <input value={form.cest} onChange={e => set('cest', e.target.value)}
              className={inputClass} placeholder="00.000.00" maxLength={9} />
          </div>
        </div>
      </div>

      {/* Estoque */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Estoque & Produção</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Política de Estoque</label>
            <select value={form.politica_estoque} onChange={e => set('politica_estoque', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="make_to_order">Sob Pedido (Make to Order)</option>
              <option value="make_to_stock">Para Estoque (Make to Stock)</option>
              <option value="kanban">Kanban</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Lead Time (dias)</label>
            <input type="number" min="0" value={form.lead_time_dias}
              onChange={e => set('lead_time_dias', e.target.value)}
              className={inputClass} />
          </div>
          {!isMakeToOrder && (
            <>
              <div>
                <label className={labelClass}>Estoque Mínimo</label>
                <input type="number" min="0" step="0.001" value={form.estoque_minimo}
                  onChange={e => set('estoque_minimo', e.target.value)}
                  className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Estoque Máximo</label>
                <input type="number" min="0" step="0.001" value={form.estoque_maximo}
                  onChange={e => set('estoque_maximo', e.target.value)}
                  className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Ponto de Reposição</label>
                <input type="number" min="0" step="0.001" value={form.ponto_reposicao}
                  onChange={e => set('ponto_reposicao', e.target.value)}
                  className={inputClass} placeholder="0" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dimensões */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Dimensões & Peso</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Peso (kg)</label>
            <input type="number" min="0" step="0.0001" value={form.peso_kg}
              onChange={e => set('peso_kg', e.target.value)}
              className={inputClass} placeholder="0.0000" />
          </div>
          <div>
            <label className={labelClass}>Largura (mm)</label>
            <input type="number" min="0" step="0.01" value={form.largura_mm}
              onChange={e => set('largura_mm', e.target.value)}
              className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Altura (mm)</label>
            <input type="number" min="0" step="0.01" value={form.altura_mm}
              onChange={e => set('altura_mm', e.target.value)}
              className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Comprimento (mm)</label>
            <input type="number" min="0" step="0.01" value={form.comprimento_mm}
              onChange={e => set('comprimento_mm', e.target.value)}
              className={inputClass} placeholder="0.00" />
          </div>
        </div>
      </div>

      {/* Fiscal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Fiscal</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>ICMS (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={form.aliquota_icms}
              onChange={e => set('aliquota_icms', e.target.value)}
              className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>IPI (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={form.aliquota_ipi}
              onChange={e => set('aliquota_ipi', e.target.value)}
              className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>PIS (%)</label>
            <input type="number" min="0" max="100" step="0.0001" value={form.aliquota_pis}
              onChange={e => set('aliquota_pis', e.target.value)}
              className={inputClass} placeholder="0.0000" />
          </div>
          <div>
            <label className={labelClass}>COFINS (%)</label>
            <input type="number" min="0" max="100" step="0.0001" value={form.aliquota_cofins}
              onChange={e => set('aliquota_cofins', e.target.value)}
              className={inputClass} placeholder="0.0000" />
          </div>
          <div>
            <label className={labelClass}>Origem</label>
            <select value={form.ncm_origem} onChange={e => set('ncm_origem', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="0">0 — Nacional</option>
              <option value="1">1 — Estrangeira (importação direta)</option>
              <option value="2">2 — Estrangeira (adquirida no mercado interno)</option>
              <option value="3">3 — Nacional com mais de 40% de conteúdo estrangeiro</option>
            </select>
          </div>
        </div>
      </div>

      {/* E-commerce */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">E-commerce</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="visivel_ecommerce" checked={form.visivel_ecommerce}
              onChange={e => set('visivel_ecommerce', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            <label htmlFor="visivel_ecommerce" className="text-sm text-gray-700">Visível no e-commerce</label>
          </div>
          {form.visivel_ecommerce && (
            <>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="destaque" checked={form.destaque}
                  onChange={e => set('destaque', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <label htmlFor="destaque" className="text-sm text-gray-700">Produto em destaque</label>
              </div>
              <div>
                <label className={labelClass}>Descrição HTML (e-commerce)</label>
                <textarea value={form.descricao_html} onChange={e => set('descricao_html', e.target.value)}
                  rows={4} className={inputClass} placeholder="Descrição detalhada para o e-commerce (suporta HTML)..." />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Observações</h2>
        <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
          rows={3} className={inputClass} placeholder="Observações internas..." />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {carregando ? 'Salvando...' : produtoId ? 'Salvar Alterações' : 'Criar Produto'}
        </button>
      </div>
    </form>
  )
}
