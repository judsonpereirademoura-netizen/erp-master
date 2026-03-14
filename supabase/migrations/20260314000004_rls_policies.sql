-- ============================================================
-- ERP MASTER v2.0 — Migration 004: RLS Policies
-- Row Level Security — cada perfil vê apenas o que deve ver
-- ============================================================

-- Habilita RLS em todas as tabelas
ALTER TABLE public.usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enderecos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representantes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabelas_preco       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_separacao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_separacao     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_insumo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_compra       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_oc            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_estoque     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprovacoes_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes           ENABLE ROW LEVEL SECURITY;

-- ─── FUNÇÃO AUXILIAR: retorna perfil do usuário atual ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_perfil()
RETURNS public.perfil_usuario
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil FROM public.usuarios WHERE id = auth.uid();
$$;

-- ─── FUNÇÃO AUXILIAR: verifica se é perfil interno (ERP) ─────────────────────
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil NOT IN ('portal_cliente','portal_representante','portal_fornecedor')
  FROM public.usuarios WHERE id = auth.uid();
$$;

-- ─── FUNÇÃO AUXILIAR: retorna cliente_id do portal cliente ───────────────────
CREATE OR REPLACE FUNCTION public.get_portal_cliente_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT puc.cliente_id
  FROM public.portal_usuarios_cliente puc
  WHERE puc.usuario_id = auth.uid()
  LIMIT 1;
$$;

-- ─── FUNÇÃO AUXILIAR: retorna representante_id do portal rep ─────────────────
CREATE OR REPLACE FUNCTION public.get_portal_rep_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id FROM public.representantes r
  WHERE r.usuario_id = auth.uid()
  LIMIT 1;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- POLICIES: USUÁRIOS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "usuarios_select_self" ON public.usuarios
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "usuarios_select_internal" ON public.usuarios
  FOR SELECT USING (public.is_internal_user());

CREATE POLICY "usuarios_update_self" ON public.usuarios
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "usuarios_admin_all" ON public.usuarios
  USING (public.get_user_perfil() IN ('ceo','admin'));

-- ──────────────────────────────────────────────────────────────────────────────
-- POLICIES: CLIENTES
-- ──────────────────────────────────────────────────────────────────────────────
-- Internos: todos os perfis de vendas/produção veem todos os clientes
CREATE POLICY "clientes_internal_select" ON public.clientes
  FOR SELECT USING (public.is_internal_user());

-- Portal cliente: vê apenas o próprio cliente
CREATE POLICY "clientes_portal_select" ON public.clientes
  FOR SELECT USING (id = public.get_portal_cliente_id());

-- Apenas CEO/admin/gerente podem criar/editar clientes
CREATE POLICY "clientes_write" ON public.clientes
  FOR ALL USING (public.get_user_perfil() IN ('ceo','admin','gerente_comercial'));

-- ──────────────────────────────────────────────────────────────────────────────
-- POLICIES: PEDIDOS
-- ──────────────────────────────────────────────────────────────────────────────
-- Internos: veem todos (CEO, admin, gerente, fiscal)
-- Representante: vê apenas pedidos da sua carteira
-- Portal cliente: vê apenas seus próprios pedidos
CREATE POLICY "pedidos_internal_full" ON public.pedidos
  FOR SELECT USING (
    public.get_user_perfil() IN ('ceo','admin','gerente_comercial','analista_fiscal','supervisor_producao','comprador')
  );

CREATE POLICY "pedidos_representante_select" ON public.pedidos
  FOR SELECT USING (
    public.get_user_perfil() = 'representante' AND
    representante_id = public.get_portal_rep_id()
  );

CREATE POLICY "pedidos_portal_cliente_select" ON public.pedidos
  FOR SELECT USING (
    public.get_user_perfil() = 'portal_cliente' AND
    cliente_id = public.get_portal_cliente_id()
  );

CREATE POLICY "pedidos_write" ON public.pedidos
  FOR INSERT WITH CHECK (
    public.get_user_perfil() IN ('ceo','admin','gerente_comercial','representante','portal_cliente','portal_representante')
  );

CREATE POLICY "pedidos_update" ON public.pedidos
  FOR UPDATE USING (
    public.get_user_perfil() IN ('ceo','admin','gerente_comercial','supervisor_producao')
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- POLICIES: PRODUTOS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "produtos_select_internal" ON public.produtos
  FOR SELECT USING (public.is_internal_user());

-- Portal e e-commerce: apenas produtos visíveis e do próprio cliente
CREATE POLICY "produtos_portal_select" ON public.produtos
  FOR SELECT USING (
    visivel_ecommerce = TRUE AND
    (cliente_id IS NULL OR cliente_id = public.get_portal_cliente_id())
  );

CREATE POLICY "produtos_write" ON public.produtos
  FOR ALL USING (public.get_user_perfil() IN ('ceo','admin','gerente_comercial'));

-- ──────────────────────────────────────────────────────────────────────────────
-- POLICIES: PRODUÇÃO E ESTOQUE (apenas internos)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "producao_internal_only" ON public.ordens_producao
  FOR ALL USING (public.is_internal_user());

CREATE POLICY "estoque_internal_only" ON public.lotes_insumo
  FOR ALL USING (public.is_internal_user());

CREATE POLICY "movimentacoes_internal_only" ON public.movimentacoes_estoque
  FOR ALL USING (public.is_internal_user());

CREATE POLICY "insumos_internal_only" ON public.insumos
  FOR ALL USING (public.is_internal_user());

CREATE POLICY "maquinas_internal_only" ON public.maquinas
  FOR ALL USING (public.is_internal_user());

-- ──────────────────────────────────────────────────────────────────────────────
-- POLICIES: COMISSÕES (representante vê apenas as suas)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "comissoes_rep_select" ON public.comissoes
  FOR SELECT USING (
    public.get_user_perfil() IN ('ceo','admin','gerente_comercial') OR
    representante_id = public.get_portal_rep_id()
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- POLICIES: APROVAÇÕES (CEO e admin apenas)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "aprovacoes_ceo_admin" ON public.aprovacoes_pendentes
  FOR ALL USING (public.get_user_perfil() IN ('ceo','admin','gerente_comercial','supervisor_producao'));

-- ──────────────────────────────────────────────────────────────────────────────
-- POLICIES: NF-e
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "nfe_internal_select" ON public.nfe
  FOR SELECT USING (public.is_internal_user());

CREATE POLICY "nfe_portal_cliente_select" ON public.nfe
  FOR SELECT USING (
    public.get_user_perfil() = 'portal_cliente' AND
    pedido_id IN (
      SELECT id FROM public.pedidos WHERE cliente_id = public.get_portal_cliente_id()
    )
  );

CREATE POLICY "nfe_fiscal_write" ON public.nfe
  FOR ALL USING (public.get_user_perfil() IN ('ceo','admin','analista_fiscal'));
