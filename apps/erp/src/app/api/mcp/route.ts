import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { MCP_TOOLS, executeTool } from '@erp-master/mcp'
import type { PerfilUsuario } from '@erp-master/auth'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `Você é o assistente de IA do ERP Master da Master Rótulos e Etiquetas, 
empresa com 35 anos de atuação em rótulos flexográficos, certificada IFS Pack Secure e ISO 9001:2015.

Você tem acesso a ferramentas para consultar dados reais do sistema. Use-as sempre que o usuário 
pedir informações sobre pedidos, estoque, produção, comissões, KPIs ou qualquer dado operacional.

Regras:
- Responda sempre em português brasileiro
- Seja direto e objetivo — o usuário é um profissional ocupado
- Para ações destrutivas (criar, cancelar, aprovar), peça confirmação explícita antes
- Nunca invente dados — use sempre as ferramentas para buscar informações reais
- Se não tiver permissão para uma ação, explique claramente o motivo
- Formate valores monetários em R$ com separadores brasileiros
- Datas no formato DD/MM/AAAA`

export async function POST(request: NextRequest) {
  try {
    const usuarioId = request.headers.get('x-user-id')
    const perfil = request.headers.get('x-user-perfil') as PerfilUsuario

    if (!usuarioId || !perfil) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const { messages } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ erro: 'Mensagens inválidas' }, { status: 400 })
    }

    // Loop de agente — executa tools até obter resposta final
    let currentMessages = [...messages]
    let iteracoes = 0
    const MAX_ITERACOES = 5

    while (iteracoes < MAX_ITERACOES) {
      iteracoes++

      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: MCP_TOOLS,
        messages: currentMessages,
      })

      // Sem tool use → resposta final
      if (response.stop_reason === 'end_turn') {
        const texto = response.content
          .filter(b => b.type === 'text')
          .map(b => (b as Anthropic.TextBlock).text)
          .join('')
        return NextResponse.json({ resposta: texto })
      }

      // Executa tools solicitadas
      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')

        // Adiciona resposta do assistente (com tool_use)
        currentMessages.push({ role: 'assistant', content: response.content })

        // Executa cada tool e coleta resultados
        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const block of toolUseBlocks) {
          if (block.type !== 'tool_use') continue
          try {
            const resultado = await executeTool(
              block.name,
              block.input as Record<string, unknown>,
              usuarioId,
              perfil
            )
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: resultado,
            })
          } catch (err) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
              is_error: true,
            })
          }
        }

        // Adiciona resultados das tools
        currentMessages.push({ role: 'user', content: toolResults })
        continue
      }

      // Stop reason inesperado
      break
    }

    return NextResponse.json({ erro: 'Limite de iterações atingido' }, { status: 500 })

  } catch (err) {
    console.error('[MCP API]', err)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
