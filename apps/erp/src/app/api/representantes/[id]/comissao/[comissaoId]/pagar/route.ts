import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// POST /api/representantes/[id]/comissao/[comissaoId]/pagar
// Marks a commission as paid (status_pagamento='pago', pago_em=today)
// Redirects to /representantes/[id] on success
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; comissaoId: string }> },
) {
  try {
    const { id, comissaoId } = await params

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    // Verify the commission belongs to this representante and is in a_receber state
    const { data: comissao } = await supabase
      .from('comissoes')
      .select('id, representante_id, status_pagamento')
      .eq('id', comissaoId)
      .eq('representante_id', id)
      .single()

    if (!comissao) {
      return NextResponse.json({ erro: 'Comissão não encontrada.' }, { status: 404 })
    }

    if (comissao.status_pagamento !== 'a_receber') {
      return NextResponse.json(
        { erro: `Comissão não pode ser marcada como paga (status atual: ${comissao.status_pagamento}).` },
        { status: 400 },
      )
    }

    const hoje = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const { error } = await createAdminClient()
      .from('comissoes')
      .update({
        status_pagamento: 'pago',
        pago_em: hoje,
      })
      .eq('id', comissaoId)

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })

    // Redirect back to the representante detail page
    return new Response(null, {
      status: 303,
      headers: { Location: `/representantes/${id}` },
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
