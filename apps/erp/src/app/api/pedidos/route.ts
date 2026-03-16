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

    if (!body.cliente_id) {
      return NextResponse.json({ erro: 'Cliente é obrigatório.' }, { status: 400 })
    }
    if (!body.itens || body.itens.length === 0) {
      return NextResponse.json({ erro: 'O pedido deve ter pelo menos um item.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Calcula valor_produtos
    const valorProdutos = body.itens.reduce((sum: number, item: any) => {
      return sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_pct ?? 0) / 100))
    }, 0)

    const descontoPct  = body.desconto_pct  ?? 0
    const valorFrete   = body.valor_frete   ?? 0
    const valorDesconto = valorProdutos * (descontoPct / 100)

    // Cria o pedido
    const { data: pedido, error: errPedido } = await admin
      .from('pedidos')
      .insert({
        cliente_id:           body.cliente_id,
        canal:                body.canal ?? 'interno',
        data_entrega_prev:    body.data_entrega_prev ?? null,
        desconto_pct:         descontoPct,
        valor_produtos:       Math.round(valorProdutos * 100) / 100,
        valor_frete:          valorFrete,
        valor_desconto:       Math.round(valorDesconto * 100) / 100,
        observacoes:          body.observacoes ?? null,
        observacoes_internas: body.observacoes_internas ?? null,
        criado_por:           user.id,
        status:               'rascunho',
      })
      .select('id')
      .single()

    if (errPedido) return NextResponse.json({ erro: errPedido.message }, { status: 400 })

    // Insere os itens
    const itens = body.itens.map((item: any) => ({
      pedido_id:      pedido.id,
      produto_id:     item.produto_id,
      quantidade:     item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_pct:   item.desconto_pct ?? 0,
    }))

    const { error: errItens } = await admin.from('itens_pedido').insert(itens)
    if (errItens) {
      // Rollback manual
      await admin.from('pedidos').delete().eq('id', pedido.id)
      return NextResponse.json({ erro: errItens.message }, { status: 400 })
    }

    return NextResponse.json(pedido)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
