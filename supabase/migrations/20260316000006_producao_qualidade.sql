-- ============================================================
-- ERP MASTER v2.0 — Migration 006: Produção e Qualidade
-- ============================================================

-- ─── APONTAMENTOS DE PRODUÇÃO ─────────────────────────────────────────────────
CREATE TABLE public.apontamentos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id               UUID NOT NULL REFERENCES public.ordens_producao(id) ON DELETE CASCADE,
  operador_id         UUID REFERENCES public.usuarios(id),
  tipo                TEXT NOT NULL DEFAULT 'producao'
                        CHECK (tipo IN ('setup','producao','parada','manutencao','limpeza')),
  -- Produção
  quantidade_boa      NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantidade_refugo   NUMERIC(12,3) NOT NULL DEFAULT 0,
  metros_produzidos   NUMERIC(12,3) NOT NULL DEFAULT 0,
  -- Tempo
  inicio              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fim                 TIMESTAMPTZ,
  duracao_min         INTEGER GENERATED ALWAYS AS (
                        CASE WHEN fim IS NOT NULL
                          THEN EXTRACT(EPOCH FROM (fim - inicio))::INTEGER / 60
                          ELSE NULL
                        END
                      ) STORED,
  -- Contexto
  velocidade_m_min    NUMERIC(8,2),
  motivo_parada       TEXT,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_apontamentos_os ON public.apontamentos(os_id);
CREATE INDEX idx_apontamentos_operador ON public.apontamentos(operador_id);
CREATE INDEX idx_apontamentos_inicio ON public.apontamentos(inicio DESC);

-- ─── REGISTROS OEE POR TURNO ──────────────────────────────────────────────────
CREATE TABLE public.oee_registros (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id          UUID NOT NULL REFERENCES public.maquinas(id),
  os_id               UUID REFERENCES public.ordens_producao(id),
  data_turno          DATE NOT NULL DEFAULT CURRENT_DATE,
  turno               TEXT NOT NULL DEFAULT 'A' CHECK (turno IN ('A','B','C')),
  -- Tempos (em minutos)
  tempo_planejado_min INTEGER NOT NULL DEFAULT 480, -- 8h padrão
  tempo_produtivo_min INTEGER NOT NULL DEFAULT 0,
  tempo_setup_min     INTEGER NOT NULL DEFAULT 0,
  tempo_parada_min    INTEGER NOT NULL DEFAULT 0,
  -- Produção
  metros_planejados   NUMERIC(12,3) NOT NULL DEFAULT 0,
  metros_produzidos   NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidades_produzidas NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidades_aprovadas  NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidades_refugo     NUMERIC(12,3) NOT NULL DEFAULT 0,
  -- OEE calculado
  disponibilidade     NUMERIC(5,4),   -- 0 a 1
  performance         NUMERIC(5,4),   -- 0 a 1
  qualidade           NUMERIC(5,4),   -- 0 a 1
  oee                 NUMERIC(5,4),   -- 0 a 1
  -- Metadados
  calculado_em        TIMESTAMPTZ,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (maquina_id, data_turno, turno)
);
CREATE INDEX idx_oee_maquina ON public.oee_registros(maquina_id);
CREATE INDEX idx_oee_data ON public.oee_registros(data_turno DESC);

-- ─── NÃO CONFORMIDADES (NC) ───────────────────────────────────────────────────
CREATE TABLE public.nao_conformidades (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              SERIAL UNIQUE,
  -- Origem
  tipo_origem         TEXT NOT NULL CHECK (tipo_origem IN (
    'inspecao_entrada','inspecao_processo','inspecao_final',
    'reclamacao_cliente','auditoria','desvio_processo','outro'
  )),
  os_id               UUID REFERENCES public.ordens_producao(id),
  pedido_id           UUID REFERENCES public.pedidos(id),
  cliente_id          UUID REFERENCES public.clientes(id),
  lote_id             UUID REFERENCES public.lotes_insumo(id),
  -- Classificação
  categoria           TEXT NOT NULL CHECK (categoria IN (
    'qualidade_produto','seguranca_alimentar','alergenio','processo',
    'equipamento','fornecedor','documentacao','outro'
  )),
  gravidade           TEXT NOT NULL DEFAULT 'menor'
                        CHECK (gravidade IN ('menor','maior','critica')),
  -- Descrição
  titulo              TEXT NOT NULL,
  descricao           TEXT NOT NULL,
  evidencias_url      TEXT[],         -- links para fotos/documentos
  -- Workflow
  status              public.status_nc NOT NULL DEFAULT 'aberta',
  responsavel_id      UUID REFERENCES public.usuarios(id),
  prazo_capa          DATE,
  -- IFS
  requer_recall       BOOLEAN NOT NULL DEFAULT FALSE,
  notificado_cliente  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Timestamps
  encerrada_em        TIMESTAMPTZ,
  criado_por          UUID REFERENCES public.usuarios(id),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nc_status ON public.nao_conformidades(status);
CREATE INDEX idx_nc_os ON public.nao_conformidades(os_id);
CREATE INDEX idx_nc_cliente ON public.nao_conformidades(cliente_id);
CREATE INDEX idx_nc_prazo ON public.nao_conformidades(prazo_capa) WHERE status != 'encerrada';

-- ─── AÇÕES CORRETIVAS E PREVENTIVAS (CAPA) ────────────────────────────────────
CREATE TABLE public.acoes_capa (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nc_id               UUID NOT NULL REFERENCES public.nao_conformidades(id) ON DELETE CASCADE,
  tipo                TEXT NOT NULL CHECK (tipo IN (
    'contencao','causa_raiz','corretiva','preventiva','melhoria'
  )),
  descricao           TEXT NOT NULL,
  responsavel_id      UUID REFERENCES public.usuarios(id),
  prazo               DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','em_andamento','concluida','verificada','cancelada')),
  evidencia_url       TEXT,
  concluida_em        TIMESTAMPTZ,
  verificada_por      UUID REFERENCES public.usuarios(id),
  verificada_em       TIMESTAMPTZ,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_capa_nc ON public.acoes_capa(nc_id);
CREATE INDEX idx_capa_responsavel ON public.acoes_capa(responsavel_id);
CREATE INDEX idx_capa_prazo ON public.acoes_capa(prazo) WHERE status NOT IN ('concluida','cancelada');

-- ─── MEDIÇÕES DE COR (ESPECTROFOTÔMETRO — Delta-E) ────────────────────────────
CREATE TABLE public.medicoes_cor (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id               UUID REFERENCES public.ordens_producao(id),
  produto_id          UUID REFERENCES public.produtos(id),
  -- CIE Lab referência (aprovado pelo cliente)
  ref_l               NUMERIC(8,4),
  ref_a               NUMERIC(8,4),
  ref_b               NUMERIC(8,4),
  -- Leitura do espectrofotômetro
  lido_l              NUMERIC(8,4) NOT NULL,
  lido_a              NUMERIC(8,4) NOT NULL,
  lido_b              NUMERIC(8,4) NOT NULL,
  -- Delta-E calculado
  delta_e             NUMERIC(8,4),              -- calculado automaticamente
  tolerancia          NUMERIC(6,4) NOT NULL DEFAULT 2.0,
  aprovado            BOOLEAN,                   -- delta_e <= tolerancia
  -- Contexto
  ponto_medicao       TEXT CHECK (ponto_medicao IN ('entrada','setup','producao','final')),
  operador_id         UUID REFERENCES public.usuarios(id),
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_medicoes_cor_os ON public.medicoes_cor(os_id);
CREATE INDEX idx_medicoes_cor_produto ON public.medicoes_cor(produto_id);

-- Trigger para calcular delta-E automaticamente
CREATE OR REPLACE FUNCTION calc_delta_e()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_l IS NOT NULL THEN
    NEW.delta_e := SQRT(
      POWER(NEW.lido_l - NEW.ref_l, 2) +
      POWER(NEW.lido_a - NEW.ref_a, 2) +
      POWER(NEW.lido_b - NEW.ref_b, 2)
    );
    NEW.aprovado := NEW.delta_e <= NEW.tolerancia;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_delta_e
BEFORE INSERT OR UPDATE ON public.medicoes_cor
FOR EACH ROW EXECUTE FUNCTION calc_delta_e();

-- ─── CALIBRAÇÕES DE EQUIPAMENTOS ─────────────────────────────────────────────
CREATE TABLE public.calibracoes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id          UUID REFERENCES public.maquinas(id),
  equipamento_descricao TEXT,                   -- para instrumentos não cadastrados como máquina
  tipo_calibracao     TEXT NOT NULL CHECK (tipo_calibracao IN (
    'dimensional','cor','pressao','temperatura','velocidade','outro'
  )),
  data_calibracao     DATE NOT NULL,
  proximo_calibracao  DATE,
  resultado           TEXT NOT NULL CHECK (resultado IN ('aprovado','reprovado','condicional')),
  certificado_numero  TEXT,
  certificado_url     TEXT,
  laboratorio         TEXT,
  responsavel_id      UUID REFERENCES public.usuarios(id),
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_calibracoes_maquina ON public.calibracoes(maquina_id);
CREATE INDEX idx_calibracoes_proximo ON public.calibracoes(proximo_calibracao);

-- ─── INSPEÇÕES (plano de controle) ───────────────────────────────────────────
CREATE TABLE public.inspecoes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id               UUID REFERENCES public.ordens_producao(id),
  tipo                TEXT NOT NULL CHECK (tipo IN (
    'entrada_insumo','setup','em_processo','produto_final','expedicao'
  )),
  produto_id          UUID REFERENCES public.produtos(id),
  lote_id             UUID REFERENCES public.lotes_insumo(id),
  -- Resultado
  resultado           TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (resultado IN ('pendente','aprovado','aprovado_restricao','reprovado')),
  amostra_qtd         NUMERIC(10,3),
  defeitos_encontrados INTEGER NOT NULL DEFAULT 0,
  -- Checklist (JSONB flexível)
  checklist           JSONB NOT NULL DEFAULT '[]',
  observacoes         TEXT,
  -- Responsável
  inspetor_id         UUID REFERENCES public.usuarios(id),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inspecoes_os ON public.inspecoes(os_id);
CREATE INDEX idx_inspecoes_resultado ON public.inspecoes(resultado);

-- ─── COMENTÁRIOS EM NCs ───────────────────────────────────────────────────────
CREATE TABLE public.nc_comentarios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nc_id       UUID NOT NULL REFERENCES public.nao_conformidades(id) ON DELETE CASCADE,
  usuario_id  UUID REFERENCES public.usuarios(id),
  texto       TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nc_comentarios_nc ON public.nc_comentarios(nc_id);
