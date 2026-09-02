/*
# Migration: Nova arquitetura RLS — somente admin autenticado + leituras públicas

O sistema agora tem apenas um papel: admin (autenticado).
Vendedores geram propostas sem login (role anon).

Políticas:
- marcas: anon lê status='ativa'; admin tem CRUD completo
- segmentos: anon lê todos (ver ativo se existir); admin tem CRUD
- tabela_taxas: anon lê SOMENTE vigentes (vigencia_fim IS NULL OR >= current_date); admin CRUD
- usuarios_perfil: restrito ao próprio admin
*/

-- ===== Limpa políticas antigas de todas as tabelas =====
DROP POLICY IF EXISTS "select_perfil" ON public.usuarios_perfil;
DROP POLICY IF EXISTS "insert_perfil" ON public.usuarios_perfil;
DROP POLICY IF EXISTS "update_perfil" ON public.usuarios_perfil;
DROP POLICY IF EXISTS "delete_perfil" ON public.usuarios_perfil;

DROP POLICY IF EXISTS "select_marcas" ON public.marcas;
DROP POLICY IF EXISTS "insert_marcas" ON public.marcas;
DROP POLICY IF EXISTS "update_marcas" ON public.marcas;
DROP POLICY IF EXISTS "delete_marcas" ON public.marcas;

DROP POLICY IF EXISTS "select_segmentos" ON public.segmentos;
DROP POLICY IF EXISTS "insert_segmentos" ON public.segmentos;
DROP POLICY IF EXISTS "update_segmentos" ON public.segmentos;
DROP POLICY IF EXISTS "delete_segmentos" ON public.segmentos;

DROP POLICY IF EXISTS "select_tabela_taxas" ON public.tabela_taxas;
DROP POLICY IF EXISTS "insert_tabela_taxas" ON public.tabela_taxas;
DROP POLICY IF EXISTS "update_tabela_taxas" ON public.tabela_taxas;
DROP POLICY IF EXISTS "delete_tabela_taxas" ON public.tabela_taxas;

-- Limpa políticas obsoletas apenas se as tabelas ainda existirem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendedor_marca') THEN
    DROP POLICY IF EXISTS "select_vendedor_marca" ON public.vendedor_marca;
    DROP POLICY IF EXISTS "insert_vendedor_marca" ON public.vendedor_marca;
    DROP POLICY IF EXISTS "update_vendedor_marca" ON public.vendedor_marca;
    DROP POLICY IF EXISTS "delete_vendedor_marca" ON public.vendedor_marca;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'propostas') THEN
    DROP POLICY IF EXISTS "select_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "insert_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "update_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "delete_propostas" ON public.propostas;
  END IF;
END $$;

-- ===== Helper is_admin (mantida, continua funcionando) =====
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_perfil
    WHERE id = auth.uid() AND papel = 'admin'
  );
$$;

-- ===== usuarios_perfil =====
-- Somente o próprio admin vê/edita seu registro. Nenhum acesso público.
CREATE POLICY "select_perfil_self" ON public.usuarios_perfil FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "insert_perfil_self" ON public.usuarios_perfil FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "update_perfil_self" ON public.usuarios_perfil FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND papel = 'admin');

-- ===== marcas =====
-- Leitura pública APENAS para marcas ativas. CRUD só para admin autenticado.
CREATE POLICY "select_marcas_publicas" ON public.marcas FOR SELECT
  USING (
    -- anon (público) só vê ativas
    (auth.role() = 'anon' AND status = 'ativa')
    -- admin autenticado vê tudo
    OR public.is_admin()
  );

CREATE POLICY "insert_marcas_admin" ON public.marcas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "update_marcas_admin" ON public.marcas FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "delete_marcas_admin" ON public.marcas FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===== segmentos =====
-- Leitura pública para todas as linhas.
-- CRUD só para admin autenticado.
-- (Campo 'ativo' pode ser adicionado depois se necessário)
CREATE POLICY "select_segmentos_publicos" ON public.segmentos FOR SELECT
  USING (
    (auth.role() = 'anon')
    OR public.is_admin()
  );

CREATE POLICY "insert_segmentos_admin" ON public.segmentos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "update_segmentos_admin" ON public.segmentos FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "delete_segmentos_admin" ON public.segmentos FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===== tabela_taxas =====
-- Leitura pública APENAS para taxas VIGENTES:
--   (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
-- Nunca expor histórico ou taxas futuras para anon.
-- CRUD só para admin autenticado.
CREATE POLICY "select_tabela_taxas_vigentes" ON public.tabela_taxas FOR SELECT
  USING (
    (
      auth.role() = 'anon'
      AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
    )
    OR public.is_admin()
  );

CREATE POLICY "insert_tabela_taxas_admin" ON public.tabela_taxas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "update_tabela_taxas_admin" ON public.tabela_taxas FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "delete_tabela_taxas_admin" ON public.tabela_taxas FOR DELETE TO authenticated
  USING (public.is_admin());

-- =======================================================
-- RPC: helper público para obter taxa vigente (usado pelo front e validação server-side)
-- =======================================================
CREATE OR REPLACE FUNCTION public.get_taxa_vigente(p_marca_id uuid, p_segmento_id uuid)
RETURNS TABLE (
  id uuid,
  marca_id uuid,
  segmento_id uuid,
  taxa_administracao numeric(5,2),
  fundo_reserva numeric(5,2),
  seguro_prestamista numeric(5,2),
  vigencia_inicio date,
  vigencia_fim date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id, t.marca_id, t.segmento_id,
    t.taxa_administracao, t.fundo_reserva, t.seguro_prestamista,
    t.vigencia_inicio, t.vigencia_fim
  FROM public.tabela_taxas t
  INNER JOIN public.marcas m ON m.id = t.marca_id
  WHERE t.marca_id = p_marca_id
    AND t.segmento_id = p_segmento_id
    AND m.status = 'ativa'
    AND (t.vigencia_fim IS NULL OR t.vigencia_fim >= CURRENT_DATE)
  ORDER BY t.vigencia_inicio DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_taxa_vigente(uuid, uuid) TO anon, authenticated;

-- =======================================================
-- RPC: helper público para obter segmento (prazo_min/max)
-- =======================================================
CREATE OR REPLACE FUNCTION public.get_segmento(p_segmento_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  prazo_min integer,
  prazo_max integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.nome, s.prazo_min, s.prazo_max
  FROM public.segmentos s
  WHERE s.id = p_segmento_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_segmento(uuid) TO anon, authenticated;
