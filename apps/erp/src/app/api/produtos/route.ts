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
      .from('produtos')
      .insert({
        codigo:            body.codigo,
        descricao:         body.descricao,
        ncm:               body.ncm,
        cest:              body.cest,
        unidade:           body.unidade,
        tipo:              body.tipo,
        politica_estoque:  body.politica_estoque,
        estoque_minimo:    body.estoque_minimo,
        estoque_maximo:    body.estoque_maximo,
        ponto_reposicao:   body.ponto_reposicao,
        lead_time_dias:    body.lead_time_dias,
        peso_kg:           body.peso_kg,
        largura_mm:        body.largura_mm,
        altura_mm:         body.altura_mm,
        comprimento_mm:    body.comprimento_mm,
        visivel_ecommerce: body.visivel_ecommerce,
        destaque:          body.destaque,
        descricao_html:    body.descricao_html,
        aliquota_icms:     body.aliquota_icms,
        aliquota_ipi:      body.aliquota_ipi,
        aliquota_pis:      body.aliquota_pis,
        aliquota_cofins:   body.aliquota_cofins,
        origem:            body.origem,
        observacoes:       body.observacoes,
        status:            body.status,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
