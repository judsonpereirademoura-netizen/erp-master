import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { data, error } = await supabase.from('insumos').select('*').eq('id', id).single()
    if (error || !data) return NextResponse.json({ erro: 'Insumo não encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const body = await request.json()

    const { data, error } = await createAdminClient()
      .from('insumos')
      .update({
        codigo:          body.codigo,
        descricao:       body.descricao,
        tipo:            body.tipo,
        unidade:         body.unidade,
        estoque_minimo:  body.estoque_minimo,
        estoque_maximo:  body.estoque_maximo,
        ponto_reposicao: body.ponto_reposicao,
        lead_time_dias:  body.lead_time_dias,
        observacoes:     body.observacoes,
        status:          body.status,
        atualizado_em:   new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
