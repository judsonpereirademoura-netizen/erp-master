import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: osId } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const admin = createAdminClient()

    // Insere o apontamento
    const { data: apontamento, error } = await admin
      .from('apontamentos')
      .insert({
        os_id:             osId,
        operador_id:       user.id,
        tipo:              body.tipo              ?? 'producao',
        quantidade_boa:    body.quantidade_boa    ?? 0,
        quantidade_refugo: body.quantidade_refugo ?? 0,
        metros_produzidos: body.metros_produzidos ?? 0,
        velocidade_m_min:  body.velocidade_m_min  ?? null,
        inicio:            body.inicio            ?? new Date().toISOString(),
        fim:               body.fim               ?? null,
        motivo_parada:     body.motivo_parada     ?? null,
        observacoes:       body.observacoes       ?? null,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })

    // Atualiza quantidade_produzida e quantidade_aprovada da OS
    if (body.tipo === 'producao' && (body.quantidade_boa > 0 || body.quantidade_refugo > 0)) {
      const { data: os } = await supabase
        .from('ordens_producao')
        .select('quantidade_produzida, quantidade_aprovada')
        .eq('id', osId)
        .single()

      if (os) {
        const novaProduzida = Number(os.quantidade_produzida) + Number(body.quantidade_boa) + Number(body.quantidade_refugo)
        const novaAprovada  = Number(os.quantidade_aprovada)  + Number(body.quantidade_boa)

        await admin.from('ordens_producao').update({
          quantidade_produzida: novaProduzida,
          quantidade_aprovada:  novaAprovada,
          atualizado_em:        new Date().toISOString(),
        }).eq('id', osId)
      }
    }

    return NextResponse.json(apontamento)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
