-- ============================================================
-- ERP MASTER v2.0 — Migration 007: Manutenção, RH e LGPD
-- ============================================================

-- ─── ORDENS DE MANUTENÇÃO ─────────────────────────────────────────────────────
CREATE TYPE public.status_manutencao AS ENUM (
  'aberta', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada'
);
CREATE TYPE public.tipo_manutencao AS ENUM (
  'preventiva', 'corretiva', 'preditiva', 'melhoria'
);

CREATE TABLE public.ordens_manutencao (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              SERIAL UNIQUE,
  maquina_id          UUID NOT NULL REFERENCES public.maquinas(id),
  tipo                public.tipo_manutencao NOT NULL DEFAULT 'corretiva',
  status              public.status_manutencao NOT NULL DEFAULT 'aberta',
  titulo              TEXT NOT NULL,
  descricao           TEXT NOT NULL,
  prioridade          INTEGER NOT NULL DEFAULT 5 CHECK (prioridade BETWEEN 1 AND 10),
  -- Responsável
  solicitante_id      UUID REFERENCES public.usuarios(id),
  tecnico_id          UUID REFERENCES public.usuarios(id),
  -- Datas
  data_abertura       DATE NOT NULL DEFAULT CURRENT_DATE,
  data_prev_conclusao DATE,
  data_inicio         TIMESTAMPTZ,
  data_conclusao      TIMESTAMPTZ,
  -- Custo
  custo_pecas         NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_mao_obra      NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_total         NUMERIC(10,2) GENERATED ALWAYS AS (custo_pecas + custo_mao_obra) STORED,
  -- Resultado
  causa_raiz          TEXT,
  solucao_aplicada    TEXT,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_om_maquina ON public.ordens_manutencao(maquina_id);
CREATE INDEX idx_om_status  ON public.ordens_manutencao(status);
CREATE INDEX idx_om_tipo    ON public.ordens_manutencao(tipo);

-- ─── PLANO DE MANUTENÇÃO PREVENTIVA ───────────────────────────────────────────
CREATE TABLE public.planos_manutencao (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id          UUID NOT NULL REFERENCES public.maquinas(id),
  titulo              TEXT NOT NULL,
  descricao           TEXT,
  periodicidade_dias  INTEGER NOT NULL,         -- ex: 30 = mensal
  ultima_execucao     DATE,
  proxima_execucao    DATE,
  ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_planos_maquina ON public.planos_manutencao(maquina_id);
CREATE INDEX idx_planos_proxima ON public.planos_manutencao(proxima_execucao) WHERE ativo = TRUE;

-- ─── RH — FUNCIONÁRIOS ────────────────────────────────────────────────────────
CREATE TABLE public.funcionarios (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id          UUID UNIQUE REFERENCES public.usuarios(id),
  matricula           TEXT NOT NULL UNIQUE,
  nome                TEXT NOT NULL,
  cpf                 TEXT NOT NULL UNIQUE,
  rg                  TEXT,
  data_nascimento     DATE,
  data_admissao       DATE NOT NULL,
  data_demissao       DATE,
  cargo               TEXT NOT NULL,
  departamento        TEXT NOT NULL CHECK (departamento IN (
    'producao','qualidade','comercial','financeiro','rh','ti','logistica','manutencao','gerencia'
  )),
  turno               TEXT NOT NULL DEFAULT 'A' CHECK (turno IN ('A','B','C','administrativo')),
  salario_base        NUMERIC(10,2),
  tipo_contrato       TEXT NOT NULL DEFAULT 'clt' CHECK (tipo_contrato IN ('clt','pj','temporario','estagio')),
  status              TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','afastado','ferias','demitido')),
  -- Contato
  email               TEXT,
  telefone            TEXT,
  endereco_id         UUID REFERENCES public.enderecos(id),
  -- ESocial
  pis                 TEXT,
  ctps_numero         TEXT,
  ctps_serie          TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_funcionarios_depto ON public.funcionarios(departamento);
CREATE INDEX idx_funcionarios_status ON public.funcionarios(status);
CREATE INDEX idx_funcionarios_turno ON public.funcionarios(turno);

-- ─── PONTO (Registro de jornada) ─────────────────────────────────────────────
CREATE TABLE public.registros_ponto (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id      UUID NOT NULL REFERENCES public.funcionarios(id),
  data_ref            DATE NOT NULL,
  entrada             TIMESTAMPTZ,
  intervalo_saida     TIMESTAMPTZ,
  intervalo_retorno   TIMESTAMPTZ,
  saida               TIMESTAMPTZ,
  horas_trabalhadas   NUMERIC(5,2),
  horas_extras        NUMERIC(5,2) NOT NULL DEFAULT 0,
  horas_falta         NUMERIC(5,2) NOT NULL DEFAULT 0,
  justificativa       TEXT,
  ajustado_por        UUID REFERENCES public.usuarios(id),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (funcionario_id, data_ref)
);
CREATE INDEX idx_ponto_funcionario ON public.registros_ponto(funcionario_id);
CREATE INDEX idx_ponto_data ON public.registros_ponto(data_ref DESC);

-- ─── FÉRIAS ───────────────────────────────────────────────────────────────────
CREATE TABLE public.ferias (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id      UUID NOT NULL REFERENCES public.funcionarios(id),
  periodo_inicio_ref  DATE NOT NULL,             -- início do período aquisitivo
  periodo_fim_ref     DATE NOT NULL,             -- fim do período aquisitivo
  inicio_gozo         DATE,
  fim_gozo            DATE,
  dias_direito        INTEGER NOT NULL DEFAULT 30,
  dias_vendidos       INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'programada'
                        CHECK (status IN ('programada','em_gozo','concluida','vencida')),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ferias_funcionario ON public.ferias(funcionario_id);

-- ─── LGPD — TITULARES DE DADOS ────────────────────────────────────────────────
CREATE TABLE public.titulares_lgpd (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                TEXT NOT NULL,
  email               TEXT,
  cpf                 TEXT,
  tipo_titular        TEXT NOT NULL CHECK (tipo_titular IN (
    'cliente','funcionario','representante','fornecedor','visitante','candidato','outro'
  )),
  referencia_id       UUID,             -- id do cliente/funcionário etc.
  referencia_tipo     TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LGPD — SOLICITAÇÕES DOS TITULARES ───────────────────────────────────────
CREATE TABLE public.solicitacoes_lgpd (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titular_id          UUID NOT NULL REFERENCES public.titulares_lgpd(id),
  tipo                TEXT NOT NULL CHECK (tipo IN (
    'acesso','portabilidade','retificacao','exclusao',
    'revogacao_consentimento','oposicao','informacoes'
  )),
  descricao           TEXT,
  status              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','em_analise','respondida','concluida','rejeitada')),
  responsavel_id      UUID REFERENCES public.usuarios(id),
  prazo               DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
  resposta            TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respondida_em       TIMESTAMPTZ
);
CREATE INDEX idx_lgpd_sol_status ON public.solicitacoes_lgpd(status);
CREATE INDEX idx_lgpd_sol_prazo  ON public.solicitacoes_lgpd(prazo) WHERE status NOT IN ('concluida','rejeitada');

-- ─── LGPD — INCIDENTES DE SEGURANÇA ───────────────────────────────────────────
CREATE TABLE public.incidentes_lgpd (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo              TEXT NOT NULL,
  descricao           TEXT NOT NULL,
  data_ocorrencia     DATE NOT NULL DEFAULT CURRENT_DATE,
  data_descoberta     DATE NOT NULL DEFAULT CURRENT_DATE,
  gravidade           TEXT NOT NULL CHECK (gravidade IN ('baixa','media','alta','critica')),
  tipo_dados          TEXT[],           -- ex: ['nome','cpf','email']
  qtd_titulares_afetados INTEGER,
  notificado_anpd     BOOLEAN NOT NULL DEFAULT FALSE,
  notificado_anpd_em  TIMESTAMPTZ,
  notificados_titulares BOOLEAN NOT NULL DEFAULT FALSE,
  status              TEXT NOT NULL DEFAULT 'aberto'
                        CHECK (status IN ('aberto','em_investigacao','contido','encerrado')),
  medidas_tomadas     TEXT,
  responsavel_id      UUID REFERENCES public.usuarios(id),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_incidentes_status ON public.incidentes_lgpd(status);
CREATE INDEX idx_incidentes_grave  ON public.incidentes_lgpd(gravidade);

-- ─── LGPD — BASE LEGAL / MAPEAMENTO ──────────────────────────────────────────
CREATE TABLE public.bases_legais (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atividade           TEXT NOT NULL,         -- "Processamento de pedidos"
  finalidade          TEXT NOT NULL,         -- "Execução de contrato"
  base_legal          TEXT NOT NULL CHECK (base_legal IN (
    'consentimento','contrato','obrigacao_legal','interesse_legitimo',
    'protecao_vida','tutela_saude','interesse_publico','exercicio_direito'
  )),
  dados_tratados      TEXT[],
  prazo_retencao_dias INTEGER,
  destinatarios       TEXT[],                -- terceiros que recebem os dados
  ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
