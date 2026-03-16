import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const TRANSICOES: Record<string, string[]> = {
  rascunho:    ['enviada'],
  enviada:     ['autorizada', 'cancelada'],
  autorizada:  ['cancelada'],
  cancelada:   [],
  denegada:    [],
  inutilizada: [],
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

    const { data: nfe } = await supabase
      .from('nfe')
      .select('status')
      .eq('id', id)
      .single()

    if (!nfe) return NextResponse.json({ erro: 'NF-e não encontrada' }, { status: 404 })

    if (!TRANSICOES[nfe.status]?.includes(novoStatus)) {
      return NextResponse.json(
        { erro: `Transição inválida: ${nfe.status} → ${novoStatus}` },
        { status: 400 },
      )
    }

    const update: Record<string, any> = { status: novoStatus }

    if (novoStatus === 'autorizada') {
      update.emitida_em = new Date().toISOString()
      const protocolo = formData.get('protocolo')
      if (protocolo) update.protocolo = String(protocolo)
    }

    if (novoStatus === 'cancelada') {
      const motivo = formData.get('motivo_cancel')
      if (!motivo || !String(motivo).trim()) {
        return NextResponse.json({ erro: 'motivo_cancel é obrigatório para cancelamento.' }, { status: 400 })
      }
      update.cancelada_em = new Date().toISOString()
      update.motivo_cancel = String(motivo).trim()
    }

    const { error } = await createAdminClient()
      .from('nfe')
      .update(update)
      .eq('id', id)

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })

    return new Response(null, { status: 303, headers: { Location: `/fiscal/${id}` } })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
