import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@erp-master/database'
import crypto from 'crypto'

const ZAPCONNECT_WEBHOOK_SECRET = process.env.ZAPCONNECT_WEBHOOK_SECRET!
const META_WEBHOOK_SECRET = process.env.META_WEBHOOK_SECRET!

// ─── Valida assinatura HMAC dos webhooks internos (ERP → ZapConnect) ─────────
function validarHMAC(body: string, signature: string | null): boolean {
  if (!signature) return false
  const expected = crypto
    .createHmac('sha256', ZAPCONNECT_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  )
}

// ─── Valida assinatura da Meta (X-Hub-Signature-256) ─────────────────────────
function validarMeta(body: string, signature: string | null): boolean {
  if (!signature) return false
  const expected = crypto
    .createHmac('sha256', META_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  )
}

// ─── Envia mensagem via ZapConnect ────────────────────────────────────────────
export async function enviarWhatsApp(params: {
  telefone: string
  mensagem: string
  clienteId?: string
  representanteId?: string
  eventoErp?: string
  referenciaId?: string
}) {
  const supabase = createAdminClient()

  const body = JSON.stringify({
    phone: params.telefone,
    message: params.mensagem,
  })

  const assinatura = 'sha256=' + crypto
    .createHmac('sha256', ZAPCONNECT_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  const res = await fetch(`${process.env.ZAPCONNECT_API_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ZAPCONNECT_API_KEY}`,
      'X-ERP-Signature': assinatura,
    },
    body,
  })

  const data = await res.json() as Record<string, unknown>

  // Registra no log
  await supabase.from('zapconnect_mensagens').insert({
    cliente_id: params.clienteId,
    representante_id: params.representanteId,
    direcao: 'saida',
    conteudo_resumo: params.mensagem.slice(0, 200),
    evento_erp: params.eventoErp,
    referencia_id: params.referenciaId,
    status: res.ok ? 'enviada' : 'falha',
    wamid: (data.wamid ?? null) as string | null,
  })

  return data
}

// ─── Webhook: recebe eventos do ZapConnect/Meta ───────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Aceita de ZapConnect interno (HMAC) ou direto da Meta (Hub-Signature)
  const hmacHeader = request.headers.get('x-erp-signature')
  const metaHeader = request.headers.get('x-hub-signature-256')

  const valido = validarHMAC(rawBody, hmacHeader) || validarMeta(rawBody, metaHeader)
  if (!valido) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const evento = JSON.parse(rawBody)
  const supabase = createAdminClient()

  // Registra webhook recebido
  await supabase.from('zapconnect_webhooks_log' as 'zapconnect_mensagens').insert({
    // @ts-expect-error tabela webhooks_log
    payload_hash: crypto.createHash('sha256').update(rawBody).digest('hex'),
    evento: evento.type ?? 'desconhecido',
    processado: false,
  })

  // Processa por tipo de evento
  switch (evento.type) {

    // Cliente respondeu aprovação de arte via WhatsApp
    case 'arte_aprovada': {
      await supabase
        .from('aprovacoes_arte' as 'aprovacoes_pendentes')
        .update({ status: 'aprovado', aprovado_em: new Date().toISOString() })
        .eq('id', evento.referencia_id)
      break
    }

    // Cliente respondeu reprovação de arte
    case 'arte_reprovada': {
      await supabase
        .from('aprovacoes_arte' as 'aprovacoes_pendentes')
        .update({ status: 'reprovado', comentario: evento.comentario })
        .eq('id', evento.referencia_id)
      break
    }

    // NPS respondido pelo cliente
    case 'nps_resposta': {
      await supabase
        .from('ocorrencias' as 'aprovacoes_pendentes')
        .update({ nps_score: evento.score })
        .eq('id', evento.referencia_id)
      break
    }

    // Pix confirmado via webhook do banco
    case 'pix_confirmado': {
      await supabase
        .from('titulos' as 'aprovacoes_pendentes')
        .update({
          status: 'pago',
          pago_em: new Date().toISOString(),
          valor_pago: evento.valor,
        })
        .eq('id', evento.titulo_id)
      break
    }

    // Representante solicitou orçamento via WhatsApp
    case 'solicitacao_orcamento': {
      await supabase
        .from('portal_solicitacoes_pedido' as 'aprovacoes_pendentes')
        .insert({
          cliente_id: evento.cliente_id,
          descricao: evento.descricao,
          status: 'pendente',
        } as Record<string, unknown>)
      break
    }
  }

  return NextResponse.json({ ok: true })
}

// ─── GET: verificação do webhook (Meta challenge) ────────────────────────────
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === META_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ ok: false }, { status: 403 })
}
