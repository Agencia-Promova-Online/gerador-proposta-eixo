/*
# Migration: Remove vendedor_marca, propostas e ajusta arquitetura

Alterações:
1. Faz backup dos dados de propostas em uma tabela temporária (se existirem)
2. Remove tabela vendedor_marca (não há mais vínculo vendedor-marca)
3. Remove tabela propostas (nenhuma proposta será persistida)
4. Remove trigger e function de numeração sequencial de propostas
5. Ajusta usuarios_perfil: simplifica check de papel (agora só admin)
6. Ajusta trigger handle_new_user: padrão passa a ser 'admin'
7. Remove índices obsoletos
*/

-- 1. Backup: copia propostas existentes para tabela de backup antes de remover
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'propostas'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.propostas_backup_20260901 AS
    TABLE public.propostas;

    CREATE TABLE IF NOT EXISTS public.vendedor_marca_backup_20260901 AS
    TABLE public.vendedor_marca;
  END IF;
END $$;

-- 2. Remove triggers e functions dependentes
DROP TRIGGER IF EXISTS trigger_generate_proposal_number ON public.propostas;
DROP FUNCTION IF EXISTS public.generate_proposal_number();

-- 3. Remove tabelas
DROP TABLE IF EXISTS public.propostas CASCADE;
DROP TABLE IF EXISTS public.vendedor_marca CASCADE;

-- 4. Remove índices que dependiam de tabelas removidas (caso ainda existam)
DROP INDEX IF EXISTS public.idx_propostas_vendedor;
DROP INDEX IF EXISTS public.idx_propostas_marca;
DROP INDEX IF EXISTS public.idx_vendedor_marca_vendedor;

-- 5. Ajusta usuarios_perfil: simplifica CHECK para aceitar apenas 'admin'
-- (mantém a coluna 'papel' por compatibilidade, mas restringe os valores)
ALTER TABLE public.usuarios_perfil
  DROP CONSTRAINT IF EXISTS usuarios_perfil_papel_check;

ALTER TABLE public.usuarios_perfil
  ADD CONSTRAINT usuarios_perfil_papel_check
  CHECK (papel IN ('admin'));

-- 6. Atualiza trigger handle_new_user: novo padrão é 'admin' (não há mais cadastro de vendedor)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios_perfil (id, nome, papel)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    'admin'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. (Opcional) Sugestão: adiciona campo 'ativo' em segmentos para ocultar sem apagar
-- Descomente as linhas abaixo se quiser usar essa feature:
-- ALTER TABLE public.segmentos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
