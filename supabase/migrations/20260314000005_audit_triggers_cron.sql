-- ============================================================
-- ERP MASTER v2.0 — Migration 005: Audit Log, Triggers e pg_cron
-- ============================================================

-- ─── AUDIT LOG IMUTÁVEL ───────────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      UUID REFERENCES public.usuarios(id),
  acao            TEXT NOT NULL,                  -- INSERT, UPDATE, DELETE, LOGIN, etc.
  tabela          TEXT,
  registro_id     UUID,
  dados_antes     JSONB,
  dados_depois    JSONB,
  ip_origem       INET,
  user_agent      TEXT,
  hash_anterior   TEXT,                           -- hash do registro anterior (chain)
  hash            TEXT NOT NULL,                  -- SHA256 deste registro
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Somente INSERT permitido — nunca UPDATE ou DELETE
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_insert_only" ON public.audit_log FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "audit_log_select_admin" ON public.audit_log FOR SELECT
  USING (public.get_user_perfil() IN ('ceo','admin','dpo'));

-- ─── MCP AUDIT LOG ────────────────────────────────────────────────────────────
CREATE TABLE public.mcp_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      UUID REFERENCES public.usuarios(id),
  perfil          public.perfil_usuario,
  tool_name       TEXT NOT NULL,
  parametros      JSONB NOT NULL DEFAULT '{}',
  resultado_resumo TEXT,
  ip_origem       INET,
  duracao_ms      INTEGER,
  status          TEXT NOT NULL DEFAULT 'sucesso'
                    CHECK (status IN ('sucesso','erro','bloqueado_rbac','rate_limited')),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mcp_audit_insert" ON public.mcp_audit_log FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "mcp_audit_select" ON public.mcp_audit_log FOR SELECT
  USING (public.get_user_perfil() IN ('ceo','admin'));

-- ─── ZAPCONNECT LOGS ──────────────────────────────────────────────────────────
CREATE TABLE public.zapconnect_mensagens (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id        UUID REFERENCES public.clientes(id),
  representante_id  UUID REFERENCES public.representantes(id),
  direcao           public.direcao_mensagem NOT NULL,
  canal             TEXT NOT NULL DEFAULT 'whatsapp',
  conteudo_resumo   TEXT,
  evento_erp        TEXT,                        -- tipo do evento que gerou
  referencia_id     UUID,                        -- ID do pedido/NC/etc.
  status            TEXT NOT NULL DEFAULT 'enviada'
                      CHECK (status IN ('enviada','entregue','lida','falha')),
  wamid             TEXT UNIQUE,                 -- ID da mensagem no WhatsApp
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.zapconnect_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zapconnect_internal" ON public.zapconnect_mensagens
  FOR ALL USING (public.is_internal_user());

-- ─── FUNÇÃO: updated_at automático ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Aplica trigger updated_at em todas as tabelas com essa coluna
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'atualizado_em'
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at_%s
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', t, t);
  END LOOP;
END;
$$;

-- ─── TRIGGER: alerta estoque mínimo após movimentação ─────────────────────────
CREATE OR REPLACE FUNCTION public.check_estoque_minimo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_insumo public.insumos%ROWTYPE;
  v_saldo_total NUMERIC;
BEGIN
  -- Calcula saldo total disponível do insumo
  SELECT i.*, SUM(l.quantidade_disp) INTO v_insumo, v_saldo_total
  FROM public.insumos i
  LEFT JOIN public.lotes_insumo l ON l.insumo_id = i.id AND NOT l.bloqueado
  WHERE i.id = NEW.insumo_id
  GROUP BY i.id;

  -- Se abaixo do mínimo, cria alerta
  IF v_insumo.estoque_minimo IS NOT NULL AND v_saldo_total <= v_insumo.estoque_minimo THEN
    INSERT INTO public.alertas_estoque (insumo_id, tipo_acao, qtd_faltante)
    VALUES (v_insumo.id, 'gerar_oc', v_insumo.estoque_minimo - v_saldo_total)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_estoque_minimo_trigger
AFTER UPDATE ON public.lotes_insumo
FOR EACH ROW WHEN (NEW.quantidade_disp < OLD.quantidade_disp)
EXECUTE FUNCTION public.check_estoque_minimo();

-- ─── TRIGGER: bloqueia lotes vencidos automaticamente ─────────────────────────
CREATE OR REPLACE FUNCTION public.bloquear_lotes_vencidos()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.lotes_insumo
  SET bloqueado = TRUE,
      motivo_bloqueio = 'Vencimento automático — ' || data_validade::TEXT
  WHERE data_validade < CURRENT_DATE
    AND bloqueado = FALSE
    AND data_validade IS NOT NULL;
END;
$$;

-- ─── TRIGGER: expirar aprovações pendentes ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expirar_aprovacoes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.aprovacoes_pendentes
  SET status = 'expirado'
  WHERE status = 'pendente' AND expira_em < NOW();
END;
$$;

-- ─── TRIGGER: atualizar valor do pedido ao inserir/atualizar item ─────────────
CREATE OR REPLACE FUNCTION public.recalcular_valor_pedido()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.pedidos SET
    valor_produtos = (
      SELECT COALESCE(SUM(valor_total), 0)
      FROM public.itens_pedido
      WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
    ),
    atualizado_em = NOW()
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalcular_pedido_insert
AFTER INSERT ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalcular_valor_pedido();

CREATE TRIGGER recalcular_pedido_update
AFTER UPDATE ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalcular_valor_pedido();

CREATE TRIGGER recalcular_pedido_delete
AFTER DELETE ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalcular_valor_pedido();

-- ─── pg_cron JOBS ─────────────────────────────────────────────────────────────
-- Requer extensão pg_cron habilitada no Supabase (Dashboard > Database > Extensions)

SELECT cron.schedule(
  'bloquear-lotes-vencidos',
  '0 1 * * *',   -- todo dia às 01:00
  $$ SELECT public.bloquear_lotes_vencidos(); $$
);

SELECT cron.schedule(
  'expirar-aprovacoes-pendentes',
  '*/15 * * * *', -- a cada 15 minutos
  $$ SELECT public.expirar_aprovacoes(); $$
);

-- KPIs OEE consolidado (calculado por turno — 06h, 14h, 22h)
SELECT cron.schedule(
  'consolidar-oee-turno',
  '5 6,14,22 * * *',
  $$ SELECT public.consolidar_oee_turno(); $$  -- função criada na migration de IoT
);
