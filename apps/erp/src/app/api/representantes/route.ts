import { createServerClient, createAdminClient } from '@/lib/database/client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET /api/representantes?lista=true — returns id+nome for all active reps (used by forms)
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { data, error } = await supabase
      .from('representantes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

// POST /api/representantes — cria representante
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const body = await request.json()

    if (!body.nome || typeof body.nome !== 'string' || body.nome.trim() === '') {
      return NextResponse.json({ erro: 'Nome é obrigatório.' }, { status: 400 })
    }

    const tiposValidos = ['interno', 'externo', 'agencia']
    if (!tiposValidos.includes(body.tipo)) {
      return NextResponse.json({ erro: 'Tipo inválido. Use: interno, externo ou agencia.' }, { status: 400 })
    }

    const { data, error } = await createAdminClient()
      .from('representantes')
      .insert({
        nome:         body.nome.trim(),
        cpf:          body.cpf ?? null,
        tipo:         body.tipo,
        comissao_pct: body.comissao_pct ?? 0,
        regiao:       body.regiao ?? null,
        supervisor_id: body.supervisor_id ?? null,
        ativo:        true,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
