/*
# Consortium Proposal System - RLS Policies

Adds all Row Level Security policies now that all tables exist.
Admin: full CRUD on all tables. Vendedor: scoped read + own proposals CRUD.
*/

-- ===== usuarios_perfil =====
DROP POLICY IF EXISTS "select_perfil" ON public.usuarios_perfil;
CREATE POLICY "select_perfil" ON public.usuarios_perfil FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_perfil" ON public.usuarios_perfil;
CREATE POLICY "insert_perfil" ON public.usuarios_perfil FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "update_perfil" ON public.usuarios_perfil;
CREATE POLICY "update_perfil" ON public.usuarios_perfil FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_perfil" ON public.usuarios_perfil;
CREATE POLICY "delete_perfil" ON public.usuarios_perfil FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===== marcas =====
DROP POLICY IF EXISTS "select_marcas" ON public.marcas;
CREATE POLICY "select_marcas" ON public.marcas FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.vendedor_marca vm
      WHERE vm.marca_id = marcas.id AND vm.vendedor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_marcas" ON public.marcas;
CREATE POLICY "insert_marcas" ON public.marcas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_marcas" ON public.marcas;
CREATE POLICY "update_marcas" ON public.marcas FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_marcas" ON public.marcas;
CREATE POLICY "delete_marcas" ON public.marcas FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===== segmentos =====
DROP POLICY IF EXISTS "select_segmentos" ON public.segmentos;
CREATE POLICY "select_segmentos" ON public.segmentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_segmentos" ON public.segmentos;
CREATE POLICY "insert_segmentos" ON public.segmentos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_segmentos" ON public.segmentos;
CREATE POLICY "update_segmentos" ON public.segmentos FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_segmentos" ON public.segmentos;
CREATE POLICY "delete_segmentos" ON public.segmentos FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===== tabela_taxas =====
DROP POLICY IF EXISTS "select_tabela_taxas" ON public.tabela_taxas;
CREATE POLICY "select_tabela_taxas" ON public.tabela_taxas FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.vendedor_marca vm
      WHERE vm.marca_id = tabela_taxas.marca_id AND vm.vendedor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_tabela_taxas" ON public.tabela_taxas;
CREATE POLICY "insert_tabela_taxas" ON public.tabela_taxas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_tabela_taxas" ON public.tabela_taxas;
CREATE POLICY "update_tabela_taxas" ON public.tabela_taxas FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_tabela_taxas" ON public.tabela_taxas;
CREATE POLICY "delete_tabela_taxas" ON public.tabela_taxas FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===== vendedor_marca =====
DROP POLICY IF EXISTS "select_vendedor_marca" ON public.vendedor_marca;
CREATE POLICY "select_vendedor_marca" ON public.vendedor_marca FOR SELECT TO authenticated
  USING (public.is_admin() OR vendedor_id = auth.uid());

DROP POLICY IF EXISTS "insert_vendedor_marca" ON public.vendedor_marca;
CREATE POLICY "insert_vendedor_marca" ON public.vendedor_marca FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_vendedor_marca" ON public.vendedor_marca;
CREATE POLICY "update_vendedor_marca" ON public.vendedor_marca FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_vendedor_marca" ON public.vendedor_marca;
CREATE POLICY "delete_vendedor_marca" ON public.vendedor_marca FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===== propostas =====
DROP POLICY IF EXISTS "select_propostas" ON public.propostas;
CREATE POLICY "select_propostas" ON public.propostas FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "insert_propostas" ON public.propostas;
CREATE POLICY "insert_propostas" ON public.propostas FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

DROP POLICY IF EXISTS "update_propostas" ON public.propostas;
CREATE POLICY "update_propostas" ON public.propostas FOR UPDATE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin())
  WITH CHECK (vendedor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "delete_propostas" ON public.propostas;
CREATE POLICY "delete_propostas" ON public.propostas FOR DELETE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin());