import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: ncId } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    if (!body.descricao) return NextResponse.json({ erro: 'Descrição é obrigatória.' }, { status: 400 })
    if (!body.prazo)     return NextResponse.json({ erro: 'Prazo é obrigatório.' }, { status: 400 })

    const admin = createAdminClient()

    const { data, error } = await admin.from('acoes_capa').insert({
      nc_id:          ncId,
      tipo:           body.tipo           ?? 'corretiva',
      descricao:      body.descricao,
      responsavel_id: body.responsavel_id ?? null,
      prazo:          body.prazo,
      status:         'pendente',
    }).select('id').single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })

    // Avança NC para em_capa se ainda estava aguardando
    const { data: nc } = await supabase.from('nao_conformidades').select('status').eq('id', ncId).single()
    if (nc?.status === 'aguardando_capa') {
      await admin.from('nao_conformidades').update({ status: 'em_capa', atualizado_em: new Date().toISOString() }).eq('id', ncId)
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
