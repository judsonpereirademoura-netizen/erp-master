import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    if (!body.produto_id)         return NextResponse.json({ erro: 'Produto é obrigatório.' }, { status: 400 })
    if (!body.quantidade_prevista) return NextResponse.json({ erro: 'Quantidade prevista é obrigatória.' }, { status: 400 })

    const { data, error } = await createAdminClient()
      .from('ordens_producao')
      .insert({
        produto_id:          body.produto_id,
        maquina_id:          body.maquina_id     ?? null,
        operador_id:         body.operador_id    ?? null,
        supervisor_id:       body.supervisor_id  ?? null,
        pedido_id:           body.pedido_id      ?? null,
        quantidade_prevista: body.quantidade_prevista,
        data_prev_inicio:    body.data_prev_inicio ?? null,
        data_prev_fim:       body.data_prev_fim    ?? null,
        setup_min:           body.setup_min        ?? 0,
        prioridade:          body.prioridade       ?? 5,
        observacoes:         body.observacoes      ?? null,
        status:              'rascunho',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
