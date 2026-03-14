import { createServerClient } from '@supabase/ssr'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@erp-master/database'

export type PerfilUsuario = Database['public']['Enums']['perfil_usuario']
export type TipoPortal = Database['public']['Enums']['tipo_portal']

// Permissões por perfil — centraliza regras de acesso
export const PERMISSOES: Record<PerfilUsuario, {
  modulos: string[]
  pode_aprovar: boolean
  pode_criar_pedido: boolean
  pode_ver_custos: boolean
  pode_ver_fiscal: boolean
  portal: TipoPortal
}> = {
  ceo: {
    modulos: ['*'],
    pode_aprovar: true,
    pode_criar_pedido: true,
    pode_ver_custos: true,
    pode_ver_fiscal: true,
    portal: 'erp',
  },
  admin: {
    modulos: ['*'],
    pode_aprovar: true,
    pode_criar_pedido: true,
    pode_ver_custos: true,
    pode_ver_fiscal: true,
    portal: 'erp',
  },
  gerente_comercial: {
    modulos: ['crm', 'vendas', 'comissoes', 'ecommerce', 'relatorios'],
    pode_aprovar: true,
    pode_criar_pedido: true,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'erp',
  },
  representante: {
    modulos: ['portal_representante'],
    pode_aprovar: false,
    pode_criar_pedido: true,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'representante',
  },
  supervisor_producao: {
    modulos: ['producao', 'estoque', 'separacao', 'manutencao', 'oee'],
    pode_aprovar: true,
    pode_criar_pedido: false,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'erp',
  },
  operador_producao: {
    modulos: ['producao_leitura', 'apontamentos'],
    pode_aprovar: false,
    pode_criar_pedido: false,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'erp',
  },
  analista_qualidade: {
    modulos: ['qualidade', 'ifs', 'recall', 'calibracoes', 'alergenios'],
    pode_aprovar: false,
    pode_criar_pedido: false,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'erp',
  },
  analista_fiscal: {
    modulos: ['fiscal', 'nfe', 'sped', 'relatorios_fiscal'],
    pode_aprovar: false,
    pode_criar_pedido: false,
    pode_ver_custos: true,
    pode_ver_fiscal: true,
    portal: 'erp',
  },
  analista_rh: {
    modulos: ['rh', 'esocial', 'folha', 'treinamentos'],
    pode_aprovar: false,
    pode_criar_pedido: false,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'erp',
  },
  dpo: {
    modulos: ['lgpd', 'audit_log', 'privacidade'],
    pode_aprovar: false,
    pode_criar_pedido: false,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'erp',
  },
  tecnico_manutencao: {
    modulos: ['manutencao', 'maquinas'],
    pode_aprovar: false,
    pode_criar_pedido: false,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'erp',
  },
  comprador: {
    modulos: ['estoque', 'ordens_compra', 'fornecedores', 'alertas_estoque'],
    pode_aprovar: false,
    pode_criar_pedido: false,
    pode_ver_custos: true,
    pode_ver_fiscal: false,
    portal: 'erp',
  },
  portal_cliente: {
    modulos: ['portal_cliente'],
    pode_aprovar: false,
    pode_criar_pedido: true,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'cliente',
  },
  portal_representante: {
    modulos: ['portal_representante'],
    pode_aprovar: false,
    pode_criar_pedido: true,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'representante',
  },
  portal_fornecedor: {
    modulos: ['portal_fornecedor'],
    pode_aprovar: false,
    pode_criar_pedido: false,
    pode_ver_custos: false,
    pode_ver_fiscal: false,
    portal: 'fornecedor',
  },
}

export function temPermissao(perfil: PerfilUsuario, modulo: string): boolean {
  const p = PERMISSOES[perfil]
  if (!p) return false
  return p.modulos.includes('*') || p.modulos.includes(modulo)
}
