-- ============================================================
-- ERP MASTER v2.0 — Migration 001: Extensions e Schemas base
-- Master Rotulos e Etiquetas
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- busca textual eficiente
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- busca sem acento
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector para IA/RAG
CREATE EXTENSION IF NOT EXISTS "pg_cron";        -- jobs agendados
CREATE EXTENSION IF NOT EXISTS "pg_net";         -- HTTP requests do banco (webhooks)

-- Schema para funções internas do MCP
CREATE SCHEMA IF NOT EXISTS mcp;

-- Tipos ENUM reutilizados em todo o sistema
CREATE TYPE public.status_ativo AS ENUM ('ativo', 'inativo', 'suspenso');
CREATE TYPE public.politica_estoque AS ENUM ('make_to_stock', 'make_to_order', 'zero_tolerado');
CREATE TYPE public.tipo_produto AS ENUM ('fabricado', 'comprado', 'revendido');
CREATE TYPE public.status_pedido AS ENUM (
  'rascunho', 'aguardando_aprovacao', 'aprovado', 'em_separacao',
  'em_producao', 'em_expedicao', 'expedido', 'entregue', 'cancelado', 'devolvido'
);
CREATE TYPE public.status_os AS ENUM (
  'rascunho', 'aguardando', 'em_andamento', 'pausada', 'concluida', 'cancelada'
);
CREATE TYPE public.status_oc AS ENUM (
  'rascunho', 'enviada', 'confirmada', 'parcialmente_recebida', 'recebida', 'cancelada'
);
CREATE TYPE public.status_nfe AS ENUM (
  'rascunho', 'enviada', 'autorizada', 'cancelada', 'denegada', 'inutilizada'
);
CREATE TYPE public.tipo_movimentacao AS ENUM (
  'entrada', 'saida', 'transferencia', 'ajuste_positivo', 'ajuste_negativo',
  'reserva', 'liberacao_reserva', 'baixa_producao'
);
CREATE TYPE public.perfil_usuario AS ENUM (
  'ceo', 'admin', 'gerente_comercial', 'representante',
  'supervisor_producao', 'operador_producao', 'analista_qualidade',
  'analista_fiscal', 'analista_rh', 'dpo', 'tecnico_manutencao',
  'comprador', 'portal_cliente', 'portal_representante', 'portal_fornecedor'
);
CREATE TYPE public.tipo_portal AS ENUM ('erp', 'ecommerce', 'cliente', 'representante', 'fornecedor');
CREATE TYPE public.direcao_mensagem AS ENUM ('entrada', 'saida');
CREATE TYPE public.status_nc AS ENUM ('aberta', 'em_analise', 'aguardando_capa', 'em_capa', 'verificando', 'encerrada');
CREATE TYPE public.status_aprovacao AS ENUM ('pendente', 'aprovado', 'reprovado', 'expirado');
CREATE TYPE public.nivel_alerta AS ENUM ('info', 'aviso', 'critico');
