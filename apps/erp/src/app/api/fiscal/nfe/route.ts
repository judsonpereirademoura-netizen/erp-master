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

    if (!body.pedido_id) {
      return NextResponse.json({ erro: 'pedido_id é obrigatório.' }, { status: 400 })
    }

    const { data, error } = await createAdminClient()
      .from('nfe')
      .insert({
        pedido_id:    body.pedido_id,
        numero:       body.numero       ?? null,
        serie:        body.serie        ?? null,
        chave_acesso: body.chave_acesso ?? null,
        status:       'rascunho',
        valor_total:  body.valor_total  ?? null,
        valor_icms:   body.valor_icms   ?? null,
        valor_ipi:    body.valor_ipi    ?? null,
        valor_pis:    body.valor_pis    ?? null,
        valor_cofins: body.valor_cofins ?? null,
        xml_url:      body.xml_url      ?? null,
        danfe_url:    body.danfe_url    ?? null,
        protocolo:    body.protocolo    ?? null,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
