import Anthropic from '@anthropic-ai/sdk'
import type { PerfilUsuario } from '@erp-master/auth'
import { temPermissao } from '@erp-master/auth'
import { createAdminClient } from '@erp-master/database'

// ─── Definição das Tools MCP ──────────────────────────────────────────────────
export const MCP_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_pedido',
    description: 'Busca detalhes de um pedido por ID ou número',
    input_schema: {
      type: 'object' as const,
      properties: {
        pedido_id: { type: 'string', description: 'UUID do pedido' },
        numero: { type: 'number', description: 'Número do pedido' },
      },
    },
  },
  {
    name: 'list_pedidos',
    description: 'Lista pedidos com filtros opcionais',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Status do pedido' },
        cliente_id: { type: 'string', description: 'UUID do cliente' },
        dias: { type: 'number', description: 'Últimos N dias', default: 30 },
        limit: { type: 'number', default: 20 },
      },
    },
  },
  {
    name: 'get_estoque',
    description: 'Consulta saldo de estoque de um insumo ou produto',
    input_schema: {
      type: 'object' as const,
      properties: {
        insumo_id: { type: 'string' },
        produto_id: { type: 'string' },
        codigo: { type: 'string', description: 'Código do insumo/produto' },
      },
    },
  },
  {
    name: 'get_oee_dashboard',
    description: 'Retorna OEE atual de todas as máquinas ou de uma específica',
    input_schema: {
      type: 'object' as const,
      properties: {
        maquina_id: { type: 'string', description: 'UUID da máquina (opcional — omitir para todas)' },
        data: { type: 'string', description: 'Data no formato YYYY-MM-DD (padrão: hoje)' },
      },
    },
  },
  {
    name: 'list_nao_conformidades',
    description: 'Lista não-conformidades abertas com filtros',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Status da NC' },
        dias_sem_capa: { type: 'number', description: 'NCs sem CAPA há mais de N dias' },
        limit: { type: 'number', default: 20 },
      },
    },
  },
  {
    name: 'get_comissoes_rep',
    description: 'Retorna extrato de comissões de um representante',
    input_schema: {
      type: 'object' as const,
      properties: {
        representante_id: { type: 'string' },
        mes: { type: 'string', description: 'YYYY-MM (padrão: mês atual)' },
      },
    },
  },
  {
    name: 'get_kpis_ceo',
    description: 'Retorna todos os KPIs executivos do dia — somente CEO',
    input_schema: {
      type: 'object' as const,
      properties: {
        data: { type: 'string', description: 'YYYY-MM-DD (padrão: hoje)' },
      },
    },
  },
  {
    name: 'get_manutencoes_pendentes',
    description: 'Lista manutenções preventivas vencidas ou próximas',
    input_schema: {
      type: 'object' as const,
      properties: {
        dias_antecedencia: { type: 'number', default: 7, description: 'Alertar com X dias de antecedência' },
      },
    },
  },
  {
    name: 'list_titulos_vencer',
    description: 'Lista títulos a vencer nos próximos N dias',
    input_schema: {
      type: 'object' as const,
      properties: {
        dias: { type: 'number', default: 7 },
        incluir_vencidos: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'get_cliente_historico',
    description: 'Histórico de compras, ocorrências e NPS de um cliente',
    input_schema: {
      type: 'object' as const,
      properties: {
        cliente_id: { type: 'string' },
        cnpj: { type: 'string' },
        nome: { type: 'string' },
        meses: { type: 'number', default: 12 },
      },
    },
  },
  {
    name: 'create_solicitacao_orcamento',
    description: 'Cria solicitação de orçamento — requer confirmação explícita',
    input_schema: {
      type: 'object' as const,
      required: ['cliente_id', 'descricao', 'confirmado'],
      properties: {
        cliente_id: { type: 'string' },
        descricao: { type: 'string' },
        confirmado: { type: 'boolean', description: 'Deve ser true — usuário confirmou a ação' },
      },
    },
  },
]

// ─── Permissões por tool ──────────────────────────────────────────────────────
const TOOL_PERMISSIONS: Record<string, PerfilUsuario[]> = {
  get_pedido:               ['ceo','admin','gerente_comercial','analista_fiscal','supervisor_producao','representante','comprador','portal_cliente','portal_representante'],
  list_pedidos:             ['ceo','admin','gerente_comercial','analista_fiscal','supervisor_producao','representante','comprador'],
  get_estoque:              ['ceo','admin','supervisor_producao','comprador','analista_qualidade'],
  get_oee_dashboard:        ['ceo','admin','supervisor_producao'],
  list_nao_conformidades:   ['ceo','admin','analista_qualidade','supervisor_producao'],
  get_comissoes_rep:        ['ceo','admin','gerente_comercial','representante','portal_representante'],
  get_kpis_ceo:             ['ceo'],
  get_manutencoes_pendentes:['ceo','admin','supervisor_producao','tecnico_manutencao'],
  list_titulos_vencer:      ['ceo','admin','analista_fiscal','gerente_comercial'],
  get_cliente_historico:    ['ceo','admin','gerente_comercial','representante'],
  create_solicitacao_orcamento: ['ceo','admin','gerente_comercial','representante','portal_cliente','portal_representante'],
}

// ─── Executor de tools ────────────────────────────────────────────────────────
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  usuarioId: string,
  perfil: PerfilUsuario
): Promise<string> {
  const inicio = Date.now()
  const supabase = createAdminClient()

  // 1. Verifica permissão
  const perfilPermitidos = TOOL_PERMISSIONS[toolName]
  if (!perfilPermitidos || !perfilPermitidos.includes(perfil)) {
    await logMcpCall(usuarioId, perfil, toolName, input, 'Acesso negado', 'bloqueado_rbac', Date.now() - inicio)
    throw new Error(`Perfil '${perfil}' não tem permissão para usar '${toolName}'`)
  }

  let resultado: string

  try {
    switch (toolName) {
      case 'get_pedido': {
        const { data } = await supabase
          .from('pedidos')
          .select(`
            numero, status, valor_total, data_entrega_prev, criado_em,
            clientes(razao_social),
            representantes(nome),
            itens_pedido(quantidade, preco_unitario, produtos(descricao))
          `)
          .or(input.pedido_id ? `id.eq.${input.pedido_id}` : `numero.eq.${input.numero}`)
          .single()
        resultado = data ? JSON.stringify(data, null, 2) : 'Pedido não encontrado'
        break
      }

      case 'list_pedidos': {
        let query = supabase
          .from('pedidos')
          .select(`numero, status, valor_total, criado_em, clientes(razao_social)`)
          .order('criado_em', { ascending: false })
          .limit(Number(input.limit ?? 20))
        if (input.status) query = query.eq('status', String(input.status))
        if (input.cliente_id) query = query.eq('cliente_id', String(input.cliente_id))
        if (input.dias) {
          const desde = new Date()
          desde.setDate(desde.getDate() - Number(input.dias))
          query = query.gte('criado_em', desde.toISOString())
        }
        // Representante só vê os próprios pedidos
        if (perfil === 'representante') {
          const { data: rep } = await supabase
            .from('representantes').select('id').eq('usuario_id', usuarioId).single()
          if (rep) query = query.eq('representante_id', rep.id)
        }
        const { data } = await query
        resultado = `${data?.length ?? 0} pedidos encontrados:\n${JSON.stringify(data, null, 2)}`
        break
      }

      case 'get_kpis_ceo': {
        if (perfil !== 'ceo') throw new Error('Somente CEO pode acessar KPIs executivos')
        const hoje = String(input.data ?? new Date().toISOString().split('T')[0])
        const [pedidos, alertas, aprovacoes] = await Promise.all([
          supabase.from('pedidos').select('valor_total, status').gte('criado_em', hoje),
          supabase.from('alertas_estoque').select('id').eq('resolvido', false),
          supabase.from('aprovacoes_pendentes').select('id, tipo').eq('status', 'pendente'),
        ])
        const faturamento = (pedidos.data ?? [])
          .filter(p => ['expedido','entregue'].includes(p.status))
          .reduce((s, p) => s + Number(p.valor_total ?? 0), 0)
        resultado = JSON.stringify({
          data: hoje,
          faturamento_dia: faturamento,
          pedidos_total: pedidos.data?.length ?? 0,
          alertas_estoque_abertos: alertas.data?.length ?? 0,
          aprovacoes_pendentes: aprovacoes.data?.length ?? 0,
          aprovacoes_detalhe: aprovacoes.data,
        }, null, 2)
        break
      }

      case 'get_manutencoes_pendentes': {
        const dias = Number(input.dias_antecedencia ?? 7)
        const limite = new Date()
        limite.setDate(limite.getDate() + dias)
        const { data } = await supabase
          .from('manutencoes')
          .select('*, maquinas(nome, codigo)')
          .lte('data_prevista', limite.toISOString().split('T')[0])
          .is('data_executada', null)
          .order('data_prevista')
        resultado = `${data?.length ?? 0} manutenções pendentes:\n${JSON.stringify(data, null, 2)}`
        break
      }

      default:
        resultado = `Tool '${toolName}' não implementada ainda`
    }

    await logMcpCall(usuarioId, perfil, toolName, input, resultado.slice(0, 500), 'sucesso', Date.now() - inicio)
    return resultado

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await logMcpCall(usuarioId, perfil, toolName, input, msg, 'erro', Date.now() - inicio)
    throw err
  }
}

// ─── Registra chamada no audit log ────────────────────────────────────────────
async function logMcpCall(
  usuarioId: string,
  perfil: PerfilUsuario,
  toolName: string,
  params: Record<string, unknown>,
  resultado: string,
  status: 'sucesso' | 'erro' | 'bloqueado_rbac' | 'rate_limited',
  duracaoMs: number
) {
  const supabase = createAdminClient()
  await supabase.from('mcp_audit_log').insert({
    usuario_id: usuarioId,
    perfil,
    tool_name: toolName,
    parametros: params,
    resultado_resumo: resultado,
    duracao_ms: duracaoMs,
    status,
  })
}
