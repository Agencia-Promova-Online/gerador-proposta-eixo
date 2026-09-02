/*
# Consortium Proposal System - Schema (tables only, no policies yet)

Step 1: Create all tables so cross-references in policies will work in step 2.
*/

-- usuarios_perfil
CREATE TABLE IF NOT EXISTS public.usuarios_perfil (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  papel text NOT NULL DEFAULT 'vendedor' CHECK (papel IN ('admin', 'vendedor')),
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- marcas
CREATE TABLE IF NOT EXISTS public.marcas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  logo_url text,
  cor_destaque text DEFAULT '#B8963F',
  cnpj text,
  endereco text,
  representante text,
  telefone text,
  site text,
  instagram text,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- segmentos
CREATE TABLE IF NOT EXISTS public.segmentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  prazo_min integer NOT NULL DEFAULT 1,
  prazo_max integer NOT NULL DEFAULT 12,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- tabela_taxas
CREATE TABLE IF NOT EXISTS public.tabela_taxas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  segmento_id uuid NOT NULL REFERENCES public.segmentos(id) ON DELETE CASCADE,
  taxa_administracao numeric(5,2) NOT NULL,
  fundo_reserva numeric(5,2) NOT NULL DEFAULT 0,
  seguro_prestamista numeric(5,2) NOT NULL DEFAULT 0,
  vigencia_inicio date NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim date,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- vendedor_marca
CREATE TABLE IF NOT EXISTS public.vendedor_marca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marca_id uuid NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendedor_id, marca_id)
);

-- propostas
CREATE TABLE IF NOT EXISTS public.propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_sequencial integer NOT NULL DEFAULT 1,
  vendedor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  marca_id uuid NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  segmento_id uuid NOT NULL REFERENCES public.segmentos(id) ON DELETE CASCADE,
  tabela_taxa_id uuid REFERENCES public.tabela_taxas(id) ON DELETE SET NULL,
  nome_cliente text NOT NULL,
  valor_bem numeric(14,2) NOT NULL,
  valor_adesao numeric(14,2) NOT NULL DEFAULT 0,
  parcela_mensal numeric(14,2) NOT NULL DEFAULT 0,
  prazo integer NOT NULL,
  status text NOT NULL DEFAULT 'gerada' CHECK (status IN ('gerada', 'enviada', 'visualizada')),
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.usuarios_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_taxas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendedor_marca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tabela_taxas_marca_segmento ON public.tabela_taxas(marca_id, segmento_id);
CREATE INDEX IF NOT EXISTS idx_propostas_vendedor ON public.propostas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_propostas_marca ON public.propostas(marca_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_marca_vendedor ON public.vendedor_marca(vendedor_id);

-- Helper function: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_perfil
    WHERE id = auth.uid() AND papel = 'admin'
  );
$$;

-- Trigger: auto sequential number per brand
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1
  INTO NEW.numero_sequencial
  FROM public.propostas
  WHERE marca_id = NEW.marca_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_proposal_number ON public.propostas;
CREATE TRIGGER trigger_generate_proposal_number
  BEFORE INSERT ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.generate_proposal_number();