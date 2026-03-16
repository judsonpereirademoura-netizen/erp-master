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

    const { data, error } = await createAdminClient()
      .from('insumos')
      .insert({
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
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
