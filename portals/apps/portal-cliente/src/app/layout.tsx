import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Portal do Cliente — Master Rótulos e Etiquetas' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body style={{margin:0,fontFamily:'sans-serif',background:'#f8fafc'}}>{children}</body></html>
}
