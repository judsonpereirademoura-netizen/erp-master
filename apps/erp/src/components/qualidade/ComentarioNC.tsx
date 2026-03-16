'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props { ncId: string; usuarioNome: string }

export default function ComentarioNC({ ncId, usuarioNome }: Props) {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setCarregando(true)

    await fetch(`/api/qualidade/ncs/${ncId}/comentario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    })

    setTexto('')
    setCarregando(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0 mt-1">
        {usuarioNome.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1">
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          placeholder="Adicione um comentário..." />
        <div className="flex justify-end mt-1">
          <button type="submit" disabled={!texto.trim() || carregando}
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-900 disabled:opacity-40 text-white rounded-lg transition-colors">
            {carregando ? '...' : 'Comentar'}
          </button>
        </div>
      </div>
    </form>
  )
}
