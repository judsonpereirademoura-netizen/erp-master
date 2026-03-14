-- ============================================================
-- ERP MASTER v2.0 — Migration 003: Tabelas Operacionais
-- ============================================================

-- ─── PEDIDOS ──────────────────────────────────────────────────────────────────
CREATE TABLE public.pedidos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              SERIAL UNIQUE,
  cliente_id          UUID NOT NULL REFERENCES public.clientes(id),
  representante_id    UUID REFERENCES public.representantes(id),
  canal               TEXT NOT NULL DEFAULT 'interno'
                        CHECK (canal IN ('interno','portal_cliente','ecommerce','representante','whatsapp')),
  status              public.status_pedido NOT NULL DEFAULT 'rascunho',
  valor_produtos      NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_frete         NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_desconto      NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total         NUMERIC(12,2) GENERATED ALWAYS AS (valor_produtos + valor_frete - valor_desconto) STORED,
  desconto_pct        NUMERIC(5,2) NOT NULL DEFAULT 0,
  desconto_aprovado   BOOLEAN NOT NULL DEFAULT FALSE,
  aprovado_por        UUID REFERENCES public.usuarios(id),
  aprovado_em         TIMESTAMPTZ,
  data_entrega_prev   DATE,
  observacoes         TEXT,
  observacoes_internas TEXT,
  criado_por          UUID REFERENCES public.usuarios(id),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_representante ON public.pedidos(representante_id);
CREATE INDEX idx_pedidos_criado_em ON public.pedidos(criado_em DESC);

-- ─── ITENS DO PEDIDO ──────────────────────────────────────────────────────────
CREATE TABLE public.itens_pedido (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id             UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id            UUID NOT NULL REFERENCES public.produtos(id),
  quantidade            NUMERIC(12,3) NOT NULL,
  preco_unitario        NUMERIC(12,4) NOT NULL,
  desconto_pct          NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_total           NUMERIC(12,2) GENERATED ALWAYS AS (
                          quantidade * preco_unitario * (1 - desconto_pct/100)
                        ) STORED,
  comissao_calculada    NUMERIC(10,2),
  data_entrega_prev     DATE,
  observacoes           TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_itens_pedido_pedido ON public.itens_pedido(pedido_id);

-- ─── ORDENS DE SEPARAÇÃO ──────────────────────────────────────────────────────
CREATE TABLE public.ordens_separacao (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id       UUID NOT NULL REFERENCES public.pedidos(id),
  status          TEXT NOT NULL DEFAULT 'aguardando'
                    CHECK (status IN ('aguardando','em_separacao','aguardando_abastecimento','parcialmente_separado','concluido','cancelado')),
  operador_id     UUID REFERENCES public.usuarios(id),
  iniciado_em     TIMESTAMPTZ,
  concluido_em    TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.itens_separacao (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_sep_id       UUID NOT NULL REFERENCES public.ordens_separacao(id) ON DELETE CASCADE,
  item_pedido_id  UUID NOT NULL REFERENCES public.itens_pedido(id),
  produto_id      UUID NOT NULL REFERENCES public.produtos(id),
  qtd_pedida      NUMERIC(12,3) NOT NULL,
  qtd_separada    NUMERIC(12,3) NOT NULL DEFAULT 0,
  qtd_pendente    NUMERIC(12,3) GENERATED ALWAYS AS (qtd_pedida - qtd_separada) STORED,
  lote_id         UUID,                            -- referência ao lote usado
  status          TEXT NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente','em_separacao','separado','aguardando_abastecimento')),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LOTES DE INSUMOS ─────────────────────────────────────────────────────────
CREATE TABLE public.lotes_insumo (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insumo_id       UUID NOT NULL REFERENCES public.insumos(id),
  fornecedor_id   UUID REFERENCES public.fornecedores(id),
  codigo_lote     TEXT NOT NULL UNIQUE,            -- ex: LOT-2026-03-00891
  qr_code         TEXT UNIQUE,                     -- payload do QR Code
  quantidade      NUMERIC(12,3) NOT NULL,
  quantidade_disp NUMERIC(12,3) NOT NULL,          -- saldo disponível real
  quantidade_res  NUMERIC(12,3) NOT NULL DEFAULT 0, -- reservado
  custo_unitario  NUMERIC(12,4),
  data_entrada    DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade   DATE,
  nota_fiscal_entrada TEXT,
  laudo_aprovado  BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueado       BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_bloqueio TEXT,
  localizacao     TEXT,                            -- prédio/corredor/prateleira/posição
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qtd_disponivel_valida CHECK (quantidade_disp >= 0),
  CONSTRAINT qtd_reservada_valida CHECK (quantidade_res >= 0)
);
CREATE INDEX idx_lotes_insumo ON public.lotes_insumo(insumo_id);
CREATE INDEX idx_lotes_validade ON public.lotes_insumo(data_validade) WHERE data_validade IS NOT NULL;
CREATE INDEX idx_lotes_bloqueado ON public.lotes_insumo(bloqueado) WHERE bloqueado = TRUE;

-- ─── MOVIMENTAÇÕES DE ESTOQUE ─────────────────────────────────────────────────
CREATE TABLE public.movimentacoes_estoque (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lote_id         UUID NOT NULL REFERENCES public.lotes_insumo(id),
  tipo            public.tipo_movimentacao NOT NULL,
  quantidade      NUMERIC(12,3) NOT NULL,
  saldo_anterior  NUMERIC(12,3) NOT NULL,
  saldo_posterior NUMERIC(12,3) NOT NULL,
  os_id           UUID,                           -- referência à OS de produção
  os_sep_id       UUID,                           -- referência à OS de separação
  oc_id           UUID,                           -- referência à OC
  documento       TEXT,                           -- NF, boleto, etc.
  usuario_id      UUID REFERENCES public.usuarios(id),
  observacao      TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mov_estoque_lote ON public.movimentacoes_estoque(lote_id);
CREATE INDEX idx_mov_estoque_tipo ON public.movimentacoes_estoque(tipo);
CREATE INDEX idx_mov_estoque_criado ON public.movimentacoes_estoque(criado_em DESC);

-- ─── ORDENS DE PRODUÇÃO ───────────────────────────────────────────────────────
CREATE TABLE public.ordens_producao (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              SERIAL UNIQUE,
  pedido_id           UUID REFERENCES public.pedidos(id),
  os_sep_id           UUID REFERENCES public.ordens_separacao(id),
  produto_id          UUID NOT NULL REFERENCES public.produtos(id),
  maquina_id          UUID REFERENCES public.maquinas(id),
  status              public.status_os NOT NULL DEFAULT 'rascunho',
  quantidade_prevista NUMERIC(12,3) NOT NULL,
  quantidade_produzida NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantidade_aprovada  NUMERIC(12,3) NOT NULL DEFAULT 0,
  data_prev_inicio    DATE,
  data_prev_fim       DATE,
  data_inicio         TIMESTAMPTZ,
  data_fim            TIMESTAMPTZ,
  setup_min           INTEGER NOT NULL DEFAULT 0,
  prioridade          INTEGER NOT NULL DEFAULT 5 CHECK (prioridade BETWEEN 1 AND 10),
  operador_id         UUID REFERENCES public.usuarios(id),
  supervisor_id       UUID REFERENCES public.usuarios(id),
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_op_status ON public.ordens_producao(status);
CREATE INDEX idx_op_maquina ON public.ordens_producao(maquina_id);
CREATE INDEX idx_op_data_prev ON public.ordens_producao(data_prev_inicio);

-- ─── ORDENS DE COMPRA ─────────────────────────────────────────────────────────
CREATE TABLE public.ordens_compra (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              SERIAL UNIQUE,
  os_sep_id           UUID REFERENCES public.ordens_separacao(id),
  fornecedor_id       UUID NOT NULL REFERENCES public.fornecedores(id),
  status              public.status_oc NOT NULL DEFAULT 'rascunho',
  valor_total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_prevista       DATE,
  data_recebimento    DATE,
  observacoes         TEXT,
  criado_por          UUID REFERENCES public.usuarios(id),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.itens_oc (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oc_id             UUID NOT NULL REFERENCES public.ordens_compra(id) ON DELETE CASCADE,
  insumo_id         UUID REFERENCES public.insumos(id),
  produto_id        UUID REFERENCES public.produtos(id),
  quantidade        NUMERIC(12,3) NOT NULL,
  qtd_recebida      NUMERIC(12,3) NOT NULL DEFAULT 0,
  preco_unitario    NUMERIC(12,4),
  valor_total       NUMERIC(12,2),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT item_oc_insumo_ou_produto CHECK (
    (insumo_id IS NOT NULL AND produto_id IS NULL) OR
    (insumo_id IS NULL AND produto_id IS NOT NULL)
  )
);

-- ─── NF-e ─────────────────────────────────────────────────────────────────────
CREATE TABLE public.nfe (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id       UUID REFERENCES public.pedidos(id),
  numero          TEXT,
  serie           TEXT NOT NULL DEFAULT '1',
  chave_acesso    TEXT UNIQUE,
  status          public.status_nfe NOT NULL DEFAULT 'rascunho',
  valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_icms      NUMERIC(10,2),
  valor_ipi       NUMERIC(10,2),
  valor_pis       NUMERIC(10,2),
  valor_cofins    NUMERIC(10,2),
  xml_url         TEXT,
  danfe_url       TEXT,
  protocolo       TEXT,
  emitida_em      TIMESTAMPTZ,
  cancelada_em    TIMESTAMPTZ,
  motivo_cancel   TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nfe_pedido ON public.nfe(pedido_id);
CREATE INDEX idx_nfe_chave ON public.nfe(chave_acesso);

-- ─── ALERTAS DE ESTOQUE ───────────────────────────────────────────────────────
CREATE TABLE public.alertas_estoque (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id       UUID REFERENCES public.pedidos(id),
  insumo_id       UUID REFERENCES public.insumos(id),
  produto_id      UUID REFERENCES public.produtos(id),
  tipo_acao       TEXT NOT NULL CHECK (tipo_acao IN ('gerar_os','gerar_oc','notificar_apenas')),
  qtd_faltante    NUMERIC(12,3),
  notificados     JSONB NOT NULL DEFAULT '[]',    -- array de usuário IDs notificados
  resolvido       BOOLEAN NOT NULL DEFAULT FALSE,
  resolvido_em    TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── APROVAÇÕES PENDENTES (fila CEO/supervisor) ───────────────────────────────
CREATE TABLE public.aprovacoes_pendentes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo              TEXT NOT NULL CHECK (tipo IN (
    'desconto_pedido','expedicao_parcial','mudanca_representante',
    'cancelamento_pedido','liberacao_credito'
  )),
  referencia_id     UUID NOT NULL,               -- ID do pedido/cliente etc.
  referencia_tipo   TEXT NOT NULL,
  solicitante_id    UUID REFERENCES public.usuarios(id),
  aprovador_id      UUID REFERENCES public.usuarios(id),
  status            public.status_aprovacao NOT NULL DEFAULT 'pendente',
  dados_contexto    JSONB NOT NULL DEFAULT '{}', -- dados para exibir no Telegram
  expira_em         TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4 hours'),
  respondido_em     TIMESTAMPTZ,
  telegram_msg_id   BIGINT,                      -- ID da mensagem no Telegram
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_aprovacoes_status ON public.aprovacoes_pendentes(status) WHERE status = 'pendente';
CREATE INDEX idx_aprovacoes_expira ON public.aprovacoes_pendentes(expira_em) WHERE status = 'pendente';

-- ─── COMISSÕES ────────────────────────────────────────────────────────────────
CREATE TABLE public.comissoes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  representante_id    UUID NOT NULL REFERENCES public.representantes(id),
  pedido_id           UUID NOT NULL REFERENCES public.pedidos(id),
  nivel               INTEGER NOT NULL CHECK (nivel IN (1,2,3)),
  base_calculo        NUMERIC(12,2) NOT NULL,
  percentual          NUMERIC(5,2) NOT NULL,
  valor               NUMERIC(10,2) NOT NULL,
  status_pagamento    TEXT NOT NULL DEFAULT 'a_receber'
                        CHECK (status_pagamento IN ('a_receber','pago','retido','estornado')),
  motivo_retencao     TEXT,
  pago_em             DATE,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comissoes_rep ON public.comissoes(representante_id);
CREATE INDEX idx_comissoes_status ON public.comissoes(status_pagamento);
