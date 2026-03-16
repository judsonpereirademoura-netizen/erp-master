import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const formData = await request.formData()
    const novoStatus = formData.get('status') as string

    const update: Record<string, any> = { status: novoStatus }
    if (novoStatus === 'concluida')  update.concluida_em  = new Date().toISOString()
    if (novoStatus === 'verificada') { update.verificado_por = user.id; update.verificada_em = new Date().toISOString() }

    const { data: acao, error } = await createAdminClient()
      .from('acoes_capa')
      .update(update)
      .eq('id', id)
      .select('nc_id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })

    return new Response(null, { status: 303, headers: { Location: `/qualidade/ncs/${acao.nc_id}` } })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
