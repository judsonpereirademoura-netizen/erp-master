import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const TRANSICOES: Record<string, string[]> = {
  rascunho:     ['aguardando', 'cancelada'],
  aguardando:   ['em_andamento', 'cancelada'],
  em_andamento: ['pausada', 'concluida', 'cancelada'],
  pausada:      ['em_andamento', 'cancelada'],
  concluida:    [],
  cancelada:    [],
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

    const { data: os } = await supabase.from('ordens_producao').select('status').eq('id', id).single()
    if (!os) return NextResponse.json({ erro: 'OS não encontrada' }, { status: 404 })

    if (!TRANSICOES[os.status]?.includes(novoStatus)) {
      return NextResponse.json({ erro: `Transição inválida: ${os.status} → ${novoStatus}` }, { status: 400 })
    }

    const update: Record<string, any> = {
      status: novoStatus,
      atualizado_em: new Date().toISOString(),
    }
    if (novoStatus === 'em_andamento' && os.status !== 'pausada') {
      update.data_inicio = new Date().toISOString()
    }
    if (novoStatus === 'concluida') {
      update.data_fim = new Date().toISOString()
    }

    await createAdminClient().from('ordens_producao').update(update).eq('id', id)

    return new Response(null, { status: 303, headers: { Location: `/producao/${id}` } })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
