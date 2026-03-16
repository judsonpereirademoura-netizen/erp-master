import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const TRANSICOES: Record<string, string[]> = {
  aberta:          ['em_analise', 'encerrada'],
  em_analise:      ['aguardando_capa', 'encerrada'],
  aguardando_capa: ['em_capa', 'encerrada'],
  em_capa:         ['verificando', 'encerrada'],
  verificando:     ['encerrada', 'em_capa'],
  encerrada:       [],
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const formData = await request.formData()
    const novoStatus = formData.get('status') as string

    const { data: nc } = await supabase.from('nao_conformidades').select('status').eq('id', id).single()
    if (!nc) return NextResponse.json({ erro: 'NC não encontrada' }, { status: 404 })

    if (!TRANSICOES[nc.status]?.includes(novoStatus)) {
      return NextResponse.json({ erro: `Transição inválida: ${nc.status} → ${novoStatus}` }, { status: 400 })
    }

    const update: Record<string, any> = { status: novoStatus, atualizado_em: new Date().toISOString() }
    if (novoStatus === 'encerrada') update.encerrada_em = new Date().toISOString()

    await createAdminClient().from('nao_conformidades').update(update).eq('id', id)

    return new Response(null, { status: 303, headers: { Location: `/qualidade/ncs/${id}` } })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
