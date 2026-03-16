'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const PONTOS = ['entrada', 'setup', 'producao', 'final']

function NovaMedicaoForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const osPre = sp.get('os_id') ?? ''

  const [form, setForm] = useState({
    os_id:         osPre,
    produto_id:    '',
    ref_l:  '', ref_a:  '', ref_b:  '',
    lido_l: '', lido_a: '', lido_b: '',
    tolerancia:    '2.0',
    ponto_medicao: 'producao',
    observacoes:   '',
  })
  const [deltaE, setDeltaE] = useState<number | null>(null)
  const [aprovado, setAprovado] = useState<boolean | null>(null)
  const [ordens, setOrdens] = useState<{ id: string; numero: number }[]>([])
  const [produtos, setProdutos] = useState<{ id: string; codigo: string; descricao: string }[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/producao?status=em_andamento&_fields=id,numero').then(r => r.ok ? r.json() : []),
      fetch('/api/produtos?_fields=id,codigo,descricao').then(r => r.ok ? r.json() : []),
    ]).then(([os, prods]) => {
      if (Array.isArray(os)) setOrdens(os)
      if (Array.isArray(prods)) setProdutos(prods)
    }).catch(() => {})
  }, [])

  function set(campo: string, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  // Calcular Delta-E em tempo real
  useEffect(() => {
    const { ref_l, ref_a, ref_b, lido_l, lido_a, lido_b, tolerancia } = form
    if (ref_l && ref_a && ref_b && lido_l && lido_a && lido_b) {
      const dE = Math.sqrt(
        Math.pow(parseFloat(lido_l) - parseFloat(ref_l), 2) +
        Math.pow(parseFloat(lido_a) - parseFloat(ref_a), 2) +
        Math.pow(parseFloat(lido_b) - parseFloat(ref_b), 2)
      )
      setDeltaE(dE)
      setAprovado(dE <= parseFloat(tolerancia))
    } else {
      setDeltaE(null)
      setAprovado(null)
    }
  }, [form.ref_l, form.ref_a, form.ref_b, form.lido_l, form.lido_a, form.lido_b, form.tolerancia])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.lido_l || !form.lido_a || !form.lido_b) { setErro('Informe os valores L*, a*, b* medidos.'); return }
    setCarregando(true)
    setErro('')

    const res = await fetch('/api/qualidade/medicoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        os_id:        form.os_id        || null,
        produto_id:   form.produto_id   || null,
        ref_l:        form.ref_l        ? parseFloat(form.ref_l)  : null,
        ref_a:        form.ref_a        ? parseFloat(form.ref_a)  : null,
        ref_b:        form.ref_b        ? parseFloat(form.ref_b)  : null,
        lido_l:       parseFloat(form.lido_l),
        lido_a:       parseFloat(form.lido_a),
        lido_b:       parseFloat(form.lido_b),
        tolerancia:   parseFloat(form.tolerancia),
        ponto_medicao: form.ponto_medicao || null,
        observacoes:  form.observacoes  || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setErro(data.erro ?? 'Erro ao salvar.'); setCarregando(false); return }

    if (form.os_id) router.push(`/producao/${form.os_id}`)
    else router.push('/qualidade/medicoes')
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

      {/* Vínculo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Vínculo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de Produção</label>
            <select value={form.os_id} onChange={e => set('os_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione...</option>
              {ordens.map(o => <option key={o.id} value={o.id}>OS-{String(o.numero).padStart(4,'0')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
            <select value={form.produto_id} onChange={e => set('produto_id', e.target.value)}
              className={inputClass + ' bg-white'}>
              <option value="">Selecione...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ponto de Medição</label>
            <select value={form.ponto_medicao} onChange={e => set('ponto_medicao', e.target.value)}
              className={inputClass + ' bg-white'}>
              {PONTOS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Valores CIE Lab */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Valores CIE Lab</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Referência */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-200 border border-blue-400 inline-block"></span>
              Referência (aprovado pelo cliente)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {['l','a','b'].map(c => (
                <div key={c}>
                  <label className="block text-xs text-gray-500 mb-1 font-mono">{c.toUpperCase()}* ref</label>
                  <input type="number" step="0.01" value={(form as any)[`ref_${c}`]}
                    onChange={e => set(`ref_${c}`, e.target.value)}
                    className={inputClass + ' font-mono'} placeholder="0.00" />
                </div>
              ))}
            </div>
          </div>

          {/* Lido */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-200 border border-orange-400 inline-block"></span>
              Leitura do Espectrofotômetro *
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {['l','a','b'].map(c => (
                <div key={c}>
                  <label className="block text-xs text-gray-500 mb-1 font-mono">{c.toUpperCase()}* lido</label>
                  <input required type="number" step="0.01" value={(form as any)[`lido_${c}`]}
                    onChange={e => set(`lido_${c}`, e.target.value)}
                    className={inputClass + ' font-mono'} placeholder="0.00" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tolerância ΔE</label>
          <div className="flex items-center gap-3">
            <input type="range" min="0.5" max="5" step="0.5" value={form.tolerancia}
              onChange={e => set('tolerancia', e.target.value)} className="w-40" />
            <span className="text-sm font-semibold text-gray-700 font-mono">{form.tolerancia}</span>
            <span className="text-xs text-gray-400">(IFS: ≤2.0 recomendado)</span>
          </div>
        </div>
      </div>

      {/* Preview Delta-E */}
      {deltaE !== null && (
        <div className={`rounded-xl border p-5 ${aprovado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Pré-visualização Delta-E</p>
              <p className="text-xs text-gray-500 mt-0.5">Calculado com base nos valores inseridos</p>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-bold font-mono ${aprovado ? 'text-green-700' : 'text-red-700'}`}>
                {deltaE.toFixed(2)}
              </p>
              <p className={`text-sm font-semibold mt-1 ${aprovado ? 'text-green-700' : 'text-red-700'}`}>
                {aprovado ? '✓ Dentro da tolerância' : '✗ Fora da tolerância'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
          className={inputClass} placeholder="Condições de medição, instrumento utilizado..." />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={carregando}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {carregando ? 'Salvando...' : 'Registrar Medição'}
        </button>
      </div>
    </form>
  )
}

export default function NovaMedicaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/qualidade" className="hover:text-red-600">Qualidade</Link>
          <span className="mx-2">›</span>
          <Link href="/qualidade/medicoes" className="hover:text-blue-600">Medições de Cor</Link>
          <span className="mx-2">›</span>
          <span>Nova Medição</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Nova Medição de Cor</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registro espectrofotométrico — CIE Lab / Delta-E</p>
      </div>

      <Suspense fallback={<div className="text-sm text-gray-500">Carregando...</div>}>
        <NovaMedicaoForm />
      </Suspense>
    </div>
  )
}
