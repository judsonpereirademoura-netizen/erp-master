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

    const { data, error } = await supabase
      .from('pedidos')
      .select(`*, clientes(razao_social), itens_pedido(*, produtos(codigo, descricao, unidade))`)
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })
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
    const admin = createAdminClient()

    const valorProdutos = (body.itens ?? []).reduce((sum: number, item: any) => {
      return sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_pct ?? 0) / 100))
    }, 0)

    const descontoPct   = body.desconto_pct  ?? 0
    const valorFrete    = body.valor_frete   ?? 0
    const valorDesconto = valorProdutos * (descontoPct / 100)

    const { data: pedido, error: errPedido } = await admin
      .from('pedidos')
      .update({
        cliente_id:           body.cliente_id,
        canal:                body.canal,
        data_entrega_prev:    body.data_entrega_prev ?? null,
        desconto_pct:         descontoPct,
        valor_produtos:       Math.round(valorProdutos * 100) / 100,
        valor_frete:          valorFrete,
        valor_desconto:       Math.round(valorDesconto * 100) / 100,
        observacoes:          body.observacoes ?? null,
        observacoes_internas: body.observacoes_internas ?? null,
        atualizado_em:        new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .single()

    if (errPedido) return NextResponse.json({ erro: errPedido.message }, { status: 400 })

    // Substituição de itens
    if (body.itens) {
      await admin.from('itens_pedido').delete().eq('pedido_id', id)
      const novosItens = body.itens.map((item: any) => ({
        pedido_id:      id,
        produto_id:     item.produto_id,
        quantidade:     item.quantidade,
        preco_unitario: item.preco_unitario,
        desconto_pct:   item.desconto_pct ?? 0,
      }))
      if (novosItens.length > 0) {
        await admin.from('itens_pedido').insert(novosItens)
      }
    }

    return NextResponse.json(pedido)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
