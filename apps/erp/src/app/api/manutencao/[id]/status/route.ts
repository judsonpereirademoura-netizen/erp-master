import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const TRANSICOES: Record<string, string[]> = {
  aberta:          ['em_andamento', 'cancelada'],
  em_andamento:    ['aguardando_peca', 'concluida', 'cancelada'],
  aguardando_peca: ['em_andamento', 'cancelada'],
  concluida:       [],
  cancelada:       [],
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

    const { data: om } = await supabase.from('ordens_manutencao').select('status').eq('id', id).single()
    if (!om) return NextResponse.json({ erro: 'OM não encontrada' }, { status: 404 })

    if (!TRANSICOES[om.status]?.includes(novoStatus)) {
      return NextResponse.json({ erro: `Transição inválida: ${om.status} → ${novoStatus}` }, { status: 400 })
    }

    const update: Record<string, any> = { status: novoStatus, atualizado_em: new Date().toISOString() }
    if (novoStatus === 'em_andamento' && om.status === 'aberta') update.data_inicio = new Date().toISOString()
    if (novoStatus === 'concluida') update.data_conclusao = new Date().toISOString()

    await createAdminClient().from('ordens_manutencao').update(update).eq('id', id)

    return new Response(null, { status: 303, headers: { Location: `/manutencao/${id}` } })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
