import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const body = await request.json()

    const { data, error } = await createAdminClient()
      .from('clientes')
      .update({
        cnpj:              body.cnpj,
        cpf:               body.cpf,
        razao_social:      body.razao_social,
        nome_fantasia:     body.nome_fantasia,
        ie:                body.ie,
        im:                body.im,
        regime_tributario: body.regime_tributario,
        segmento:          body.segmento,
        limite_credito:    body.limite_credito,
        permite_parcial:   body.permite_parcial,
        requer_aprovacao:  body.requer_aprovacao,
        representante_id:  body.representante_id,
        observacoes:       body.observacoes,
        status:            body.status,
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
