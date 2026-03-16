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
    if (!body.maquina_id) return NextResponse.json({ erro: 'Máquina é obrigatória.' }, { status: 400 })
    if (!body.titulo)     return NextResponse.json({ erro: 'Título é obrigatório.' }, { status: 400 })
    if (!body.descricao)  return NextResponse.json({ erro: 'Descrição é obrigatória.' }, { status: 400 })

    const { data, error } = await createAdminClient()
      .from('ordens_manutencao')
      .insert({
        maquina_id:         body.maquina_id,
        tipo:               body.tipo               ?? 'corretiva',
        titulo:             body.titulo,
        descricao:          body.descricao,
        prioridade:         body.prioridade          ?? 5,
        solicitante_id:     user.id,
        tecnico_id:         body.tecnico_id          ?? null,
        data_abertura:      body.data_abertura        ?? new Date().toISOString().slice(0, 10),
        data_prev_conclusao:body.data_prev_conclusao  ?? null,
        custo_pecas:        body.custo_pecas          ?? 0,
        custo_mao_obra:     body.custo_mao_obra       ?? 0,
        observacoes:        body.observacoes          ?? null,
        status:             'aberta',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
