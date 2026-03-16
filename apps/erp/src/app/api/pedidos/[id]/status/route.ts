import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

const TRANSICOES_VALIDAS: Record<string, string[]> = {
  rascunho:             ['aguardando_aprovacao', 'cancelado'],
  aguardando_aprovacao: ['aprovado', 'rascunho', 'cancelado'],
  aprovado:             ['em_separacao', 'cancelado'],
  em_separacao:         ['em_producao', 'aprovado'],
  em_producao:          ['expedido'],
  expedido:             ['entregue'],
  entregue:             [],
  cancelado:            [],
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const formData = await request.formData()
    const novoStatus = formData.get('status') as string

    const { data: pedido } = await supabase
      .from('pedidos')
      .select('status')
      .eq('id', id)
      .single()

    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const transicoesPermitidas = TRANSICOES_VALIDAS[pedido.status] ?? []
    if (!transicoesPermitidas.includes(novoStatus)) {
      return NextResponse.json({
        erro: `Transição inválida: ${pedido.status} → ${novoStatus}`,
      }, { status: 400 })
    }

    const updateData: Record<string, any> = {
      status: novoStatus,
      atualizado_em: new Date().toISOString(),
    }

    if (novoStatus === 'aprovado') {
      updateData.aprovado_por = user.id
      updateData.aprovado_em  = new Date().toISOString()
    }

    await createAdminClient()
      .from('pedidos')
      .update(updateData)
      .eq('id', id)

    // Redirect back to the pedido page (form POST)
    return new Response(null, {
      status: 303,
      headers: { Location: `/pedidos/${id}` },
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
