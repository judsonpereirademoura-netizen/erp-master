export type PerfilUsuario =
  | 'ceo' | 'admin' | 'gerente_comercial' | 'representante'
  | 'supervisor_producao' | 'operador_producao' | 'analista_qualidade'
  | 'analista_fiscal' | 'analista_rh' | 'dpo' | 'tecnico_manutencao'
  | 'comprador' | 'portal_cliente' | 'portal_representante' | 'portal_fornecedor'

export type TipoPortal = 'erp' | 'ecommerce' | 'cliente' | 'representante' | 'fornecedor'

const PERFIS_INTERNOS: PerfilUsuario[] = [
  'ceo', 'admin', 'gerente_comercial', 'supervisor_producao', 'operador_producao',
  'analista_qualidade', 'analista_fiscal', 'analista_rh', 'dpo', 'tecnico_manutencao',
  'comprador', 'representante'
]

export const PERMISSOES: Record<PerfilUsuario, { modulos: string[]; portal: TipoPortal }> = {
  ceo:                 { modulos: ['*'], portal: 'erp' },
  admin:               { modulos: ['*'], portal: 'erp' },
  gerente_comercial:   { modulos: ['crm','vendas','comissoes','ecommerce','relatorios'], portal: 'erp' },
  representante:       { modulos: ['crm','vendas','comissoes'], portal: 'erp' },
  supervisor_producao: { modulos: ['producao','estoque','separacao','manutencao','oee'], portal: 'erp' },
  operador_producao:   { modulos: ['producao','producao_leitura','apontamentos'], portal: 'erp' },
  analista_qualidade:  { modulos: ['qualidade','ifs','recall','calibracoes','alergenios'], portal: 'erp' },
  analista_fiscal:     { modulos: ['fiscal','nfe','sped','relatorios_fiscal'], portal: 'erp' },
  analista_rh:         { modulos: ['rh','esocial','folha','treinamentos'], portal: 'erp' },
  dpo:                 { modulos: ['lgpd','audit_log','privacidade'], portal: 'erp' },
  tecnico_manutencao:  { modulos: ['manutencao','maquinas'], portal: 'erp' },
  comprador:           { modulos: ['estoque','ordens_compra','fornecedores','alertas_estoque'], portal: 'erp' },
  portal_cliente:      { modulos: ['portal_cliente'], portal: 'cliente' },
  portal_representante:{ modulos: ['portal_representante'], portal: 'representante' },
  portal_fornecedor:   { modulos: ['portal_fornecedor'], portal: 'fornecedor' },
}

export function temPermissao(perfil: PerfilUsuario, modulo: string): boolean {
  const p = PERMISSOES[perfil]
  return p?.modulos.includes('*') || p?.modulos.includes(modulo) || false
}

export function isInternalUser(perfil: PerfilUsuario): boolean {
  return PERFIS_INTERNOS.includes(perfil)
}
