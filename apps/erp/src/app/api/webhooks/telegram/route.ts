import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@erp-master/database'
import crypto from 'crypto'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_CEO_CHAT_ID = process.env.TELEGRAM_CEO_CHAT_ID!
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!

// ─── Valida assinatura do webhook Telegram ────────────────────────────────────
function validarAssinatura(body: string, secretHeader: string | null): boolean {
  if (!secretHeader) return false
  const secret = crypto.createHmac('sha256', 'WebAppData').update(WEBHOOK_SECRET).digest()
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return hash === secretHeader
}

// ─── Envia mensagem via Telegram ──────────────────────────────────────────────
export async function enviarMensagemTelegram(
  chatId: string,
  texto: string,
  replyMarkup?: object
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: texto,
    parse_mode: 'HTML',
  }
  if (replyMarkup) body.reply_markup = replyMarkup

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ─── Notifica CEO de aprovação pendente ───────────────────────────────────────
export async function notificarCEOAprovacao(aprovacaoId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('aprovacoes_pendentes')
    .select('*, pedidos(numero, valor_total, clientes(razao_social))')
    .eq('id', aprovacaoId)
    .single()

  if (!data) return

  const pedido = (data as Record<string, unknown>).pedidos as Record<string, unknown> | null
  const cliente = pedido?.clientes as Record<string, unknown> | null

  const texto = [
    `🔔 <b>Aprovação Pendente</b>`,
    ``,
    `Tipo: ${data.tipo}`,
    `Pedido: #${pedido?.numero ?? '-'}`,
    `Cliente: ${cliente?.razao_social ?? '-'}`,
    `Valor: R$ ${Number(pedido?.valor_total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    ``,
    `Expira em 4 horas ⏰`,
  ].join('\n')

  const markup = {
    inline_keyboard: [[
      { text: '✅ Aprovar', callback_data: `aprovar:${aprovacaoId}` },
      { text: '❌ Reprovar', callback_data: `reprovar:${aprovacaoId}` },
    ]],
  }

  const resultado = await enviarMensagemTelegram(TELEGRAM_CEO_CHAT_ID, texto, markup)

  // Salva ID da mensagem para atualizar depois
  if (resultado.ok) {
    await supabase
      .from('aprovacoes_pendentes')
      .update({ telegram_msg_id: resultado.result.message_id })
      .eq('id', aprovacaoId)
  }
}

// ─── Handler do webhook ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token')

  // Valida autenticidade
  if (!validarAssinatura(rawBody, secretHeader)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update = JSON.parse(rawBody)
  const supabase = createAdminClient()

  // Processa callback_query (botões inline)
  if (update.callback_query) {
    const { id: queryId, from, data: callbackData, message } = update.callback_query

    // Valida que é o CEO
    if (String(from.id) !== TELEGRAM_CEO_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: queryId, text: '⛔ Acesso negado' }),
      })
      return NextResponse.json({ ok: true })
    }

    const [acao, aprovacaoId] = String(callbackData).split(':')

    // Atualiza aprovação
    const novoStatus = acao === 'aprovar' ? 'aprovado' : 'reprovado'
    const { data: aprovacao } = await supabase
      .from('aprovacoes_pendentes')
      .update({ status: novoStatus, respondido_em: new Date().toISOString() })
      .eq('id', aprovacaoId)
      .eq('status', 'pendente')  // só atualiza se ainda pendente
      .select()
      .single()

    if (!aprovacao) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: queryId, text: '⚠️ Aprovação não encontrada ou já processada' }),
      })
      return NextResponse.json({ ok: true })
    }

    // Confirma ao CEO
    const emoji = acao === 'aprovar' ? '✅' : '❌'
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: queryId,
        text: `${emoji} ${acao === 'aprovar' ? 'Aprovado' : 'Reprovado'} com sucesso!`,
      }),
    })

    // Edita mensagem original com status final
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: `${emoji} <b>${novoStatus.toUpperCase()}</b>\n\n${message.text}`,
        parse_mode: 'HTML',
      }),
    })

    // Se aprovação de pedido → atualiza pedido
    if (aprovacao.tipo === 'desconto_pedido' && acao === 'aprovar') {
      await supabase
        .from('pedidos')
        .update({
          desconto_aprovado: true,
          aprovado_por: aprovacao.aprovador_id,
          aprovado_em: new Date().toISOString(),
          status: 'aprovado',
        })
        .eq('id', aprovacao.referencia_id)
    }
  }

  return NextResponse.json({ ok: true })
}
