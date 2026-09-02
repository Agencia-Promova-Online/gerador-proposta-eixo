-- =======================================================
-- Storage: bucket público para logos das marcas
-- =======================================================

-- Cria bucket "marcas-logos" como público (só se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marcas-logos',
  'marcas-logos',
  true,
  1048576,  -- 1 MB por arquivo (só logo, não precisa de mais)
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Garante que o bucket está público
UPDATE storage.buckets SET public = true WHERE id = 'marcas-logos';

-- ===== Políticas storage (público para ler, só admin autenticado pode escrever/apagar) =====
DROP POLICY IF EXISTS "marcas_logos_select_public" ON storage.objects;
CREATE POLICY "marcas_logos_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'marcas-logos');

DROP POLICY IF EXISTS "marcas_logos_insert_admin" ON storage.objects;
CREATE POLICY "marcas_logos_insert_admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marcas-logos'
    AND public.is_admin()
    AND (storage.foldername(name))[1] IS NOT NULL
  );

DROP POLICY IF EXISTS "marcas_logos_update_admin" ON storage.objects;
CREATE POLICY "marcas_logos_update_admin" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'marcas-logos'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "marcas_logos_delete_admin" ON storage.objects;
CREATE POLICY "marcas_logos_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'marcas-logos'
    AND public.is_admin()
  );
