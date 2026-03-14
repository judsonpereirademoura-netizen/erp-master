-- ============================================================
-- ERP MASTER v2.0 — Migration 002: Tabelas Mestres
-- ============================================================

-- ─── USUÁRIOS (integrado ao Supabase Auth) ────────────────────────────────────
CREATE TABLE public.usuarios (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  perfil          public.perfil_usuario NOT NULL DEFAULT 'operador_producao',
  portal_acesso   public.tipo_portal NOT NULL DEFAULT 'erp',
  mfa_ativo       BOOLEAN NOT NULL DEFAULT FALSE,
  telefone        TEXT,
  telegram_id     BIGINT UNIQUE,                    -- para chatbot CEO
  avatar_url      TEXT,
  ultimo_acesso   TIMESTAMPTZ,
  status          public.status_ativo NOT NULL DEFAULT 'ativo',
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.usuarios IS 'Usuários do sistema — internos (ERP) e externos (portais)';

-- ─── CLIENTES ─────────────────────────────────────────────────────────────────
CREATE TABLE public.clientes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cnpj                TEXT UNIQUE,                  -- null para pessoa física
  cpf                 TEXT UNIQUE,                  -- null para pessoa jurídica
  razao_social        TEXT NOT NULL,
  nome_fantasia       TEXT,
  ie                  TEXT,                         -- Inscrição Estadual
  im                  TEXT,                         -- Inscrição Municipal
  regime_tributario   TEXT NOT NULL DEFAULT 'simples_nacional'
                        CHECK (regime_tributario IN ('simples_nacional','lucro_presumido','lucro_real','mei','isento')),
  limite_credito      NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_credito       NUMERIC(12,2) NOT NULL DEFAULT 0,
  permite_parcial     BOOLEAN NOT NULL DEFAULT TRUE,   -- expedição parcial
  requer_aprovacao    BOOLEAN NOT NULL DEFAULT FALSE,  -- aprovação supervisor
  representante_id    UUID REFERENCES public.usuarios(id),
  segmento            TEXT,
  observacoes         TEXT,
  status              public.status_ativo NOT NULL DEFAULT 'ativo',
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_clientes_cnpj ON public.clientes(cnpj);
CREATE INDEX idx_clientes_razao_social ON public.clientes USING gin(razao_social gin_trgm_ops);
CREATE INDEX idx_clientes_representante ON public.clientes(representante_id);

-- ─── ENDEREÇOS (polimórfico: cliente ou fornecedor) ───────────────────────────
CREATE TABLE public.enderecos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entidade_tipo   TEXT NOT NULL CHECK (entidade_tipo IN ('cliente','fornecedor')),
  entidade_id     UUID NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'principal'
                    CHECK (tipo IN ('principal','entrega','cobrança','outro')),
  cep             TEXT NOT NULL,
  logradouro      TEXT NOT NULL,
  numero          TEXT NOT NULL,
  complemento     TEXT,
  bairro          TEXT NOT NULL,
  cidade          TEXT NOT NULL,
  uf              CHAR(2) NOT NULL,
  ibge            TEXT,
  principal       BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_enderecos_entidade ON public.enderecos(entidade_tipo, entidade_id);

-- ─── CONTATOS ─────────────────────────────────────────────────────────────────
CREATE TABLE public.contatos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entidade_tipo   TEXT NOT NULL CHECK (entidade_tipo IN ('cliente','fornecedor')),
  entidade_id     UUID NOT NULL,
  nome            TEXT NOT NULL,
  cargo           TEXT,
  email           TEXT,
  telefone        TEXT,
  whatsapp        TEXT,
  principal       BOOLEAN NOT NULL DEFAULT FALSE,
  recebe_nfe      BOOLEAN NOT NULL DEFAULT FALSE,
  recebe_cobranca BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contatos_entidade ON public.contatos(entidade_tipo, entidade_id);

-- ─── FORNECEDORES ─────────────────────────────────────────────────────────────
CREATE TABLE public.fornecedores (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cnpj              TEXT UNIQUE,
  razao_social      TEXT NOT NULL,
  nome_fantasia     TEXT,
  ie                TEXT,
  qualificacao_score NUMERIC(3,1) NOT NULL DEFAULT 5.0
                      CHECK (qualificacao_score BETWEEN 0 AND 10),
  categoria         TEXT,                           -- materia-prima, embalagem, servico
  lead_time_padrao  INTEGER NOT NULL DEFAULT 7,     -- dias úteis
  observacoes       TEXT,
  status            public.status_ativo NOT NULL DEFAULT 'ativo',
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fornecedores_cnpj ON public.fornecedores(cnpj);

-- ─── PRODUTOS (acabados — rótulos/etiquetas) ──────────────────────────────────
CREATE TABLE public.produtos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                TEXT NOT NULL UNIQUE,
  descricao             TEXT NOT NULL,
  ncm                   TEXT,                       -- Nomenclatura Comum do Mercosul
  cest                  TEXT,                       -- código CEST
  unidade               TEXT NOT NULL DEFAULT 'UN',
  tipo                  public.tipo_produto NOT NULL DEFAULT 'fabricado',
  politica_estoque      public.politica_estoque NOT NULL DEFAULT 'make_to_order',
  estoque_minimo        NUMERIC(12,3),              -- NULL para make_to_order
  estoque_maximo        NUMERIC(12,3),
  ponto_reposicao       NUMERIC(12,3),
  lead_time_dias        INTEGER NOT NULL DEFAULT 3,
  fornecedor_padrao_id  UUID REFERENCES public.fornecedores(id),
  cliente_id            UUID REFERENCES public.clientes(id), -- produto exclusivo de cliente
  peso_kg               NUMERIC(10,4),
  largura_mm            NUMERIC(8,2),
  altura_mm             NUMERIC(8,2),
  comprimento_mm        NUMERIC(8,2),
  -- E-commerce
  visivel_ecommerce     BOOLEAN NOT NULL DEFAULT FALSE,
  foto_url              TEXT,
  descricao_html        TEXT,
  destaque              BOOLEAN NOT NULL DEFAULT FALSE,
  -- Fiscal
  aliquota_icms         NUMERIC(5,2),
  aliquota_ipi          NUMERIC(5,2),
  aliquota_pis          NUMERIC(5,4),
  aliquota_cofins       NUMERIC(5,4),
  origem                CHAR(1) DEFAULT '0',       -- 0=nacional, 1=estrangeira...
  observacoes           TEXT,
  status                public.status_ativo NOT NULL DEFAULT 'ativo',
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX idx_produtos_descricao ON public.produtos USING gin(descricao gin_trgm_ops);
CREATE INDEX idx_produtos_cliente ON public.produtos(cliente_id);

-- ─── INSUMOS (matérias-primas) ────────────────────────────────────────────────
CREATE TABLE public.insumos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                TEXT NOT NULL UNIQUE,
  descricao             TEXT NOT NULL,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('substrato','tinta','adesivo','verniz','solvente','cilindro','outro')),
  unidade               TEXT NOT NULL DEFAULT 'KG',
  estoque_minimo        NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_maximo        NUMERIC(12,3),
  ponto_reposicao       NUMERIC(12,3),
  lead_time_dias        INTEGER NOT NULL DEFAULT 7,
  fornecedor_padrao_id  UUID REFERENCES public.fornecedores(id),
  tem_alergenico        BOOLEAN NOT NULL DEFAULT FALSE,
  requer_laudo          BOOLEAN NOT NULL DEFAULT TRUE,
  validade_dias         INTEGER,                   -- NULL = não vence
  observacoes           TEXT,
  status                public.status_ativo NOT NULL DEFAULT 'ativo',
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_insumos_tipo ON public.insumos(tipo);

-- ─── MÁQUINAS ─────────────────────────────────────────────────────────────────
CREATE TABLE public.maquinas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo                TEXT NOT NULL UNIQUE,
  nome                  TEXT NOT NULL,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('impressora_flexo','laminadora','cortadeira','rebobinadeira','outro')),
  fabricante            TEXT,
  modelo                TEXT,
  numero_serie          TEXT,
  ano_fabricacao        INTEGER,
  capacidade_m_min      NUMERIC(8,2),             -- metros por minuto
  largura_max_mm        NUMERIC(8,2),
  numero_cores          INTEGER,
  mqtt_topic            TEXT UNIQUE,              -- tópico MQTT desta máquina
  status                TEXT NOT NULL DEFAULT 'disponivel'
                          CHECK (status IN ('disponivel','em_producao','em_manutencao','parada','inativa')),
  localizacao           TEXT,
  observacoes           TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REPRESENTANTES ───────────────────────────────────────────────────────────
CREATE TABLE public.representantes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id        UUID UNIQUE REFERENCES public.usuarios(id),
  nome              TEXT NOT NULL,
  cpf               TEXT UNIQUE,
  tipo              TEXT NOT NULL DEFAULT 'externo'
                      CHECK (tipo IN ('interno','externo','agencia')),
  comissao_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
  supervisor_id     UUID REFERENCES public.representantes(id),
  regiao            TEXT,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABELAS DE PREÇO ─────────────────────────────────────────────────────────
CREATE TABLE public.tabelas_preco (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_id      UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  preco           NUMERIC(12,4) NOT NULL,
  desconto_max    NUMERIC(5,2) NOT NULL DEFAULT 0,  -- % máximo sem aprovação
  validade_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  validade_fim    DATE,
  criado_por      UUID REFERENCES public.usuarios(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cliente_id, produto_id, validade_inicio)
);
CREATE INDEX idx_tabelas_preco_cliente_produto ON public.tabelas_preco(cliente_id, produto_id);
