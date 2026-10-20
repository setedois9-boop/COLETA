-- ==========================================================
-- ESQUEMA SUPABASE POSTGRESQL: PONTOS DE COLETA
-- Compatível com Row Level Security (RLS) e Supabase Storage
-- ==========================================================

-- 1. Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Solicitações de Cadastro
CREATE TABLE IF NOT EXISTS public.solicitacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocolo TEXT UNIQUE NOT NULL,
    cnpj VARCHAR(18) NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT NOT NULL,
    tipo_comercio TEXT NOT NULL,
    tipo_comercio_outro TEXT,
    cep VARCHAR(9) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cidade TEXT NOT NULL,
    bairro TEXT NOT NULL,
    rua TEXT NOT NULL,
    numero TEXT NOT NULL,
    complemento TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    dias_funcionamento JSONB NOT NULL,
    horarios_funcionamento JSONB NOT NULL,
    fecha_almoco BOOLEAN NOT NULL DEFAULT FALSE,
    horario_almoco_inicio VARCHAR(5),
    horario_almoco_fim VARCHAR(5),
    estacionamento TEXT NOT NULL,
    quantidade_colaboradores TEXT NOT NULL,
    experiencia_logistica TEXT NOT NULL,
    servicos_desejados JSONB NOT NULL,
    nome_responsavel TEXT NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    banco_1 TEXT,
    agencia_1 TEXT,
    conta_1 TEXT,
    tipo_conta_1 TEXT,
    pix_1 TEXT,
    banco_2 TEXT,
    agencia_2 TEXT,
    conta_2 TEXT,
    tipo_conta_2 TEXT,
    pix_2 TEXT,
    origem_cadastro TEXT NOT NULL,
    origem_outro TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Recebido',
    observacoes_internas TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices essenciais para consultas do admin
CREATE INDEX IF NOT EXISTS idx_solicitacoes_protocolo ON public.solicitacoes(protocolo);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_cnpj ON public.solicitacoes(cnpj);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_cidade ON public.solicitacoes(cidade);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_estado ON public.solicitacoes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_criado_em ON public.solicitacoes(criado_em DESC);

-- 3. Tabela de Arquivos/Fotos da Solicitação
CREATE TABLE IF NOT EXISTS public.arquivos_solicitacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    tipo_imagem VARCHAR(20) NOT NULL CHECK (tipo_imagem IN ('fachada', 'interior')),
    caminho_arquivo TEXT NOT NULL,
    nome_original TEXT,
    tamanho_bytes BIGINT,
    mime_type VARCHAR(100),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arquivos_solicitacao_id ON public.arquivos_solicitacao(solicitacao_id);

-- 4. Tabela de Histórico de Mudanças de Status (Auditoria)
CREATE TABLE IF NOT EXISTS public.historico_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50) NOT NULL,
    administrador_id TEXT,
    observacao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historico_solicitacao_id ON public.historico_status(solicitacao_id);

-- 5. Tabela de Configurações Dinâmicas do Site
CREATE TABLE IF NOT EXISTS public.configuracoes_site (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
    configuracao JSONB NOT NULL DEFAULT '{}'::jsonb,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Trigger para atualizar 'atualizado_em' automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_solicitacoes_updated_at ON public.solicitacoes;
CREATE TRIGGER trigger_update_solicitacoes_updated_at
BEFORE UPDATE ON public.solicitacoes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ==========================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos_solicitacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_site ENABLE ROW LEVEL SECURITY;

-- 1. Inserção pública permitida (qualquer visitante pode enviar nova candidatura)
CREATE POLICY "Permitir envio publico de solicitacao"
ON public.solicitacoes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Leitura e edição de solicitações apenas para administradores autenticados
CREATE POLICY "Apenas administradores leem solicitacoes"
ON public.solicitacoes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas administradores atualizam solicitacoes"
ON public.solicitacoes
FOR UPDATE
TO authenticated
USING (true);

-- 3. Arquivos: inserção permitida na submissão, leitura apenas para admins
CREATE POLICY "Permitir anexo de arquivos no envio"
ON public.arquivos_solicitacao
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Apenas admins leem arquivos"
ON public.arquivos_solicitacao
FOR SELECT
TO authenticated
USING (true);

-- 4. Histórico de status: apenas administradores
CREATE POLICY "Apenas admins acessam historico"
ON public.historico_status
FOR ALL
TO authenticated
USING (true);

-- 5. Configurações: leitura pública de configs institucionais, alteração só admin
CREATE POLICY "Leitura publica de configuracoes"
ON public.configuracoes_site
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Apenas admins alteram configuracoes"
ON public.configuracoes_site
FOR ALL
TO authenticated
USING (true);
