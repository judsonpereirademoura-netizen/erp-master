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
    if (!body.titulo)     return NextResponse.json({ erro: 'Título é obrigatório.' }, { status: 400 })
    if (!body.descricao)  return NextResponse.json({ erro: 'Descrição é obrigatória.' }, { status: 400 })
    if (!body.tipo_origem) return NextResponse.json({ erro: 'Origem é obrigatória.' }, { status: 400 })

    const { data, error } = await createAdminClient()
      .from('nao_conformidades')
      .insert({
        tipo_origem:     body.tipo_origem,
        os_id:           body.os_id           ?? null,
        pedido_id:       body.pedido_id        ?? null,
        cliente_id:      body.cliente_id       ?? null,
        lote_id:         body.lote_id          ?? null,
        categoria:       body.categoria        ?? 'qualidade_produto',
        gravidade:       body.gravidade        ?? 'menor',
        titulo:          body.titulo,
        descricao:       body.descricao,
        responsavel_id:  body.responsavel_id   ?? null,
        prazo_capa:      body.prazo_capa       ?? null,
        requer_recall:   body.requer_recall     ?? false,
        criado_por:      user.id,
        status:          'aberta',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
