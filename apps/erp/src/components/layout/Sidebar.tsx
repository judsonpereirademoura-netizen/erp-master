'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { PerfilUsuario } from '@erp-master/auth'
import { temPermissao } from '@erp-master/auth'

interface NavItem {
  href: string
  label: string
  icon: string
  modulo: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',     icon: '◼',  modulo: '*' },
  { href: '/pedidos',         label: 'Pedidos',        icon: '📋', modulo: 'vendas' },
  { href: '/clientes',        label: 'Clientes',       icon: '🏢', modulo: 'crm' },
  { href: '/producao',        label: 'Produção',       icon: '⚙️', modulo: 'producao' },
  { href: '/estoque',         label: 'Estoque',        icon: '📦', modulo: 'estoque' },
  { href: '/qualidade',       label: 'Qualidade',      icon: '✅', modulo: 'qualidade' },
  { href: '/fiscal',          label: 'Fiscal',         icon: '🧾', modulo: 'fiscal' },
  { href: '/representantes',  label: 'Representantes', icon: '🤝', modulo: 'comissoes' },
  { href: '/rh',              label: 'RH',             icon: '👥', modulo: 'rh' },
  { href: '/manutencao',      label: 'Manutenção',     icon: '🔧', modulo: 'manutencao' },
  { href: '/lgpd',            label: 'LGPD',           icon: '🔒', modulo: 'lgpd' },
]

export default function Sidebar({ perfil }: { perfil: string }) {
  const pathname = usePathname()
  const p = perfil as PerfilUsuario

  const itensVisiveis = NAV_ITEMS.filter(
    item => item.modulo === '*' || temPermissao(p, item.modulo)
  )

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-bold text-blue-700">ERP Master</p>
          <p className="text-xs text-gray-400">Master Rótulos</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {itensVisiveis.map(item => {
          const ativo = pathname.startsWith(item.href) && item.href !== '/dashboard'
            ? true
            : pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                ativo
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Portais externos */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <p className="text-xs text-gray-400 px-2 mb-2">Portais</p>
        {[
          { href: 'https://masteretiquetas.com', label: 'E-commerce', icon: '🛒' },
          { href: 'https://cliente.masteretiquetas.com', label: 'Portal Cliente', icon: '👤' },
          { href: 'https://representante.masteretiquetas.com', label: 'Representante', icon: '🤝' },
        ].map(p => (
          <a
            key={p.href}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
            <span className="ml-auto text-gray-300">↗</span>
          </a>
        ))}
      </div>

    </aside>
  )
}
