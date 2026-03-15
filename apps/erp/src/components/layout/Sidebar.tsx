'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { temPermissao, type PerfilUsuario } from '@/lib/auth/permissions'

const NAV_ITEMS = [
  { href: '/dashboard',      label: 'Dashboard',     icon: '◼',  modulo: '*' },
  { href: '/pedidos',        label: 'Pedidos',        icon: '📋', modulo: 'vendas' },
  { href: '/clientes',       label: 'Clientes',       icon: '🏢', modulo: 'crm' },
  { href: '/producao',       label: 'Produção',       icon: '⚙️', modulo: 'producao' },
  { href: '/estoque',        label: 'Estoque',        icon: '📦', modulo: 'estoque' },
  { href: '/qualidade',      label: 'Qualidade',      icon: '✅', modulo: 'qualidade' },
  { href: '/fiscal',         label: 'Fiscal',         icon: '🧾', modulo: 'fiscal' },
  { href: '/representantes', label: 'Representantes', icon: '🤝', modulo: 'comissoes' },
  { href: '/rh',             label: 'RH',             icon: '👥', modulo: 'rh' },
  { href: '/manutencao',     label: 'Manutenção',     icon: '🔧', modulo: 'manutencao' },
  { href: '/lgpd',           label: 'LGPD',           icon: '🔒', modulo: 'lgpd' },
]

export default function Sidebar({ perfil }: { perfil: string }) {
  const pathname = usePathname()
  const p = perfil as PerfilUsuario
  const itens = NAV_ITEMS.filter(i => i.modulo === '*' || temPermissao(p, i.modulo))

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-bold text-blue-700">ERP Master</p>
          <p className="text-xs text-gray-400">Master Rótulos</p>
        </div>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {itens.map(item => {
          const ativo = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                ativo ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
