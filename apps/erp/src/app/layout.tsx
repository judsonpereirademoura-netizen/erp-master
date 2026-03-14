import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ERP Master — Master Rótulos e Etiquetas',
  description: 'Sistema de Gestão Empresarial',
  robots: 'noindex, nofollow', // ERP interno nunca indexado
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
