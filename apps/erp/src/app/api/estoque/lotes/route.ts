import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function gerarCodigoLote(): string {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
  return `LOT-${ano}-${mes}-${seq}`
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const body = await request.json()

    if (!body.insumo_id) return NextResponse.json({ erro: 'Insumo é obrigatório.' }, { status: 400 })
    if (!body.quantidade || body.quantidade <= 0) {
      return NextResponse.json({ erro: 'Quantidade deve ser maior que zero.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Gera QR Code payload
    const codigoLote = body.codigo_lote || gerarCodigoLote()
    const qrPayload = JSON.stringify({
      lote:     codigoLote,
      insumo:   body.insumo_id,
      entrada:  body.data_entrada,
      validade: body.data_validade ?? null,
    })

    const { data: lote, error } = await admin
      .from('lotes_insumo')
      .insert({
        insumo_id:           body.insumo_id,
        fornecedor_id:       body.fornecedor_id ?? null,
        codigo_lote:         codigoLote,
        qr_code:             qrPayload,
        quantidade:          body.quantidade,
        quantidade_disp:     body.quantidade,
        quantidade_res:      0,
        custo_unitario:      body.custo_unitario ?? null,
        data_entrada:        body.data_entrada,
        data_validade:       body.data_validade ?? null,
        nota_fiscal_entrada: body.nota_fiscal_entrada ?? null,
        laudo_aprovado:      body.laudo_aprovado ?? false,
        localizacao:         body.localizacao ?? null,
        bloqueado:           false,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })

    // Registra movimentação de entrada
    await admin.from('movimentacoes_estoque').insert({
      lote_id:         lote.id,
      tipo:            'entrada',
      quantidade:      body.quantidade,
      saldo_anterior:  0,
      saldo_posterior: body.quantidade,
      documento:       body.nota_fiscal_entrada ?? null,
      usuario_id:      user.id,
      observacao:      'Entrada de lote via ERP',
    })

    return NextResponse.json(lote)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
