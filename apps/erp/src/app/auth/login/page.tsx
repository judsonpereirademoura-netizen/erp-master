'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@erp-master/database'

const ERROS: Record<string, string> = {
  conta_inativa: 'Conta inativa. Entre em contato com o administrador.',
  acesso_negado: 'Seu perfil não tem acesso ao ERP. Use o portal correto.',
  credenciais: 'E-mail ou senha incorretos.',
}

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const nextUrl = params.get('next') ?? '/dashboard'
  const erroParam = params.get('erro')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(erroParam ? ERROS[erroParam] ?? erroParam : '')

  const supabase = createBrowserClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro(ERROS.credenciais)
      setCarregando(false)
      return
    }

    router.push(nextUrl)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ERP Master</h1>
          <p className="text-sm text-gray-500 mt-1">Master Rótulos e Etiquetas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Acesso ao sistema</h2>

          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/auth/reset-password" className="text-sm text-blue-600 hover:underline">
              Esqueceu a senha?
            </a>
          </div>
        </div>

        {/* Portais externos */}
        <div className="mt-6 text-center text-xs text-gray-400 space-y-1">
          <p>Não é funcionário?</p>
          <div className="flex justify-center gap-4">
            <a href="https://cliente.masteretiquetas.com" className="text-blue-500 hover:underline">
              Portal do Cliente
            </a>
            <a href="https://representante.masteretiquetas.com" className="text-blue-500 hover:underline">
              Portal do Representante
            </a>
            <a href="https://fornecedor.masteretiquetas.com" className="text-blue-500 hover:underline">
              Portal do Fornecedor
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
