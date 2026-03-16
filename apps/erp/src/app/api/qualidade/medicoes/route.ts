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
    if (body.lido_l == null || body.lido_a == null || body.lido_b == null) {
      return NextResponse.json({ erro: 'Valores L*, a*, b* são obrigatórios.' }, { status: 400 })
    }

    const { data, error } = await createAdminClient()
      .from('medicoes_cor')
      .insert({
        os_id:          body.os_id          ?? null,
        produto_id:     body.produto_id     ?? null,
        ref_l:          body.ref_l          ?? null,
        ref_a:          body.ref_a          ?? null,
        ref_b:          body.ref_b          ?? null,
        lido_l:         body.lido_l,
        lido_a:         body.lido_a,
        lido_b:         body.lido_b,
        tolerancia:     body.tolerancia     ?? 2.0,
        ponto_medicao:  body.ponto_medicao  ?? null,
        operador_id:    user.id,
        observacoes:    body.observacoes    ?? null,
      })
      .select('id, delta_e, aprovado')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
