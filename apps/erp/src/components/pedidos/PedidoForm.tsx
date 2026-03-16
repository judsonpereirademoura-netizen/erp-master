'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Produto {
  id: string
  codigo: string
  descricao: string
  unidade: string
}

interface ItemPedido {
  produto_id: string
  produto_codigo: string
  produto_descricao: string
  produto_unidade: string
  quantidade: string
  preco_unitario: string
  desconto_pct: string
}

interface Cliente {
  id: string
  razao_social: string
  nome_fantasia?: string | null
}

interface Props {
  clientes: Cliente[]
  produtos: Produto[]
  pedidoId?: string
  inicial?: {
    cliente_id?: string
    canal?: string
    data_entrega_prev?: string
    desconto_pct?: string
    valor_frete?: string
    observacoes?: string
    observacoes_internas?: string
    itens?: ItemPedido[]
  }
}

const CANAIS = [
  { value: 'interno',        label: 'Interno' },
  { value: 'portal_cliente', label: 'Portal Cliente' },
  { value: 'ecommerce',      label: 'E-commerce' },
  { value: 'representante',  label: 'Representante' },
  { value: 'whatsapp',       label: 'WhatsApp' },
]

const ITEM_VAZIO: ItemPedido = {
  produto_id: '',
  produto_codigo: '',
  produto_descricao: '',
  produto_unidade: '',
  quantidade: '1',
  preco_unitario: '0',
  desconto_pct: '0',
}

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PedidoForm({ clientes, produtos, pedidoId, inicial }: Props) {
  const router = useRouter()
  const [clienteId, setClienteId]   = useState(inicial?.cliente_id ?? '')
  const [canal, setCanal]           = useState(inicial?.canal ?? 'interno')
  const [dataEntrega, setDataEntrega] = useState(inicial?.data_entrega_prev ?? '')
  const [descontoPct, setDescontoPct] = useState(inicial?.desconto_pct ?? '0')
  const [frete, setFrete]           = useState(inicial?.valor_frete ?? '0')
  const [obs, setObs]               = useState(inicial?.observacoes ?? '')
  const [obsInt, setObsInt]         = useState(inicial?.observacoes_internas ?? '')
  const [itens, setItens]           = useState<ItemPedido[]>(inicial?.itens ?? [{ ...ITEM_VAZIO }])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro]             = useState('')

  function addItem() {
    setItens(i => [...i, { ...ITEM_VAZIO }])
  }

  function removeItem(idx: number) {
    setItens(i => i.filter((_, j) => j !== idx))
  }

  function updateItem(idx: number, campo: keyof ItemPedido, valor: string) {
    setItens(items => items.map((item, j) => {
      if (j !== idx) return item
      if (campo === 'produto_id') {
        const prod = produtos.find(p => p.id === valor)
        return prod
          ? { ...item, produto_id: prod.id, produto_codigo: prod.codigo, produto_descricao: prod.descricao, produto_unidade: prod.unidade }
          : { ...item, produto_id: '' }
      }
      return { ...item, [campo]: valor }
    }))
  }

  const valorProdutos = itens.reduce((sum, item) => {
    const qtd  = parseFloat(item.quantidade)  || 0
    const prec = parseFloat(item.preco_unitario) || 0
    const desc = parseFloat(item.desconto_pct) || 0
    return sum + qtd * prec * (1 - desc / 100)
  }, 0)

  const descGlobal  = (parseFloat(descontoPct) || 0) / 100
  const valorFrete  = parseFloat(frete) || 0
  const totalFinal  = valorProdutos * (1 - descGlobal) + valorFrete

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (itens.length === 0 || itens.every(i => !i.produto_id)) {
      setErro('Adicione pelo menos um item ao pedido.')
      return
    }
    setCarregando(true)
    setErro('')

    const payload = {
      cliente_id:          clienteId,
      canal,
      data_entrega_prev:   dataEntrega || null,
      desconto_pct:        parseFloat(descontoPct) || 0,
      valor_frete:         parseFloat(frete) || 0,
      observacoes:         obs || null,
      observacoes_internas: obsInt || null,
      itens: itens
        .filter(i => i.produto_id)
        .map(i => ({
          produto_id:     i.produto_id,
          quantidade:     parseFloat(i.quantidade) || 1,
          preco_unitario: parseFloat(i.preco_unitario) || 0,
          desconto_pct:   parseFloat(i.desconto_pct) || 0,
        })),
    }

    const url    = pedidoId ? `/api/pedidos/${pedidoId}` : '/api/pedidos'
    const method = pedidoId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro ?? 'Erro ao salvar pedido.')
      setCarregando(false)
      return
    }

    router.push(`/pedidos/${data.id}`)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>
      )}

      {/* Cabeçalho */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Dados do Pedido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Cliente *</label>
            <select required value={clienteId} onChange={e => setClienteId(e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome_fantasia ?? c.razao_social}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Canal de Venda</label>
            <select value={canal} onChange={e => setCanal(e.target.value)}
              className={inputClass + ' bg-white'}>
              {CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Data de Entrega Prevista</label>
            <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Desconto Global (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={descontoPct}
              onChange={e => setDescontoPct(e.target.value)}
              className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Frete (R$)</label>
            <input type="number" min="0" step="0.01" value={frete}
              onChange={e => setFrete(e.target.value)}
              className={inputClass} placeholder="0.00" />
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Itens do Pedido</h2>
          <button type="button" onClick={addItem}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            + Adicionar Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium pr-3">Produto</th>
                <th className="pb-2 font-medium pr-3 w-24">Qtd</th>
                <th className="pb-2 font-medium pr-3 w-32">Preço Unit.</th>
                <th className="pb-2 font-medium pr-3 w-20">Desc. %</th>
                <th className="pb-2 font-medium text-right w-28">Total</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itens.map((item, idx) => {
                const qtd  = parseFloat(item.quantidade)     || 0
                const prec = parseFloat(item.preco_unitario) || 0
                const desc = parseFloat(item.desconto_pct)   || 0
                const total = qtd * prec * (1 - desc / 100)
                return (
                  <tr key={idx}>
                    <td className="py-2 pr-3">
                      <select value={item.produto_id}
                        onChange={e => updateItem(idx, 'produto_id', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecione...</option>
                        {produtos.map(p => (
                          <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min="0.001" step="0.001" value={item.quantidade}
                        onChange={e => updateItem(idx, 'quantidade', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min="0" step="0.0001" value={item.preco_unitario}
                        onChange={e => updateItem(idx, 'preco_unitario', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min="0" max="100" step="0.01" value={item.desconto_pct}
                        onChange={e => updateItem(idx, 'desconto_pct', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 text-right font-medium text-gray-700">
                      {formatBRL(total)}
                    </td>
                    <td className="py-2 pl-2">
                      {itens.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <dl className="space-y-1 text-sm min-w-[240px]">
            <div className="flex justify-between text-gray-600">
              <dt>Subtotal produtos</dt>
              <dd className="font-medium">{formatBRL(valorProdutos)}</dd>
            </div>
            {parseFloat(descontoPct) > 0 && (
              <div className="flex justify-between text-red-600">
                <dt>Desconto ({descontoPct}%)</dt>
                <dd className="font-medium">— {formatBRL(valorProdutos * descGlobal)}</dd>
              </div>
            )}
            {parseFloat(frete) > 0 && (
              <div className="flex justify-between text-gray-600">
                <dt>Frete</dt>
                <dd className="font-medium">{formatBRL(valorFrete)}</dd>
              </div>
            )}
            <div className="flex justify-between text-gray-900 font-semibold text-base pt-1 border-t border-gray-200">
              <dt>Total</dt>
              <dd>{formatBRL(totalFinal)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Observações</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Observações (visível ao cliente)</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)}
              rows={2} className={inputClass} placeholder="Instruções de entrega, referências..." />
          </div>
          <div>
            <label className={labelClass}>Observações Internas</label>
            <textarea value={obsInt} onChange={e => setObsInt(e.target.value)}
              rows={2} className={inputClass} placeholder="Notas internas (não visível ao cliente)..." />
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
          {carregando ? 'Salvando...' : pedidoId ? 'Salvar Alterações' : 'Criar Pedido'}
        </button>
      </div>
    </form>
  )
}
