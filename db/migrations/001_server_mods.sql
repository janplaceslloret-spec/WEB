-- Migración: Tabla server_mods para CloudCraft
-- Aplicar en: Supabase Dashboard > SQL Editor

-- ============================================================
-- 1. TABLA server_mods
-- ============================================================
CREATE TABLE IF NOT EXISTS public.server_mods (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id    UUID        NOT NULL REFERENCES public.mc_servers(id) ON DELETE CASCADE,
  mod_id       TEXT,                        -- ID en CurseForge/Modrinth
  mod_name     TEXT        NOT NULL,
  version      TEXT,                        -- versión del mod instalado
  file_name    TEXT,                        -- nombre del .jar en el servidor
  source       TEXT        NOT NULL DEFAULT 'modrinth',  -- 'curseforge' | 'modrinth' | 'manual'
  status       TEXT        NOT NULL DEFAULT 'installed', -- 'installing' | 'installed' | 'uninstalling' | 'error'
  error_msg    TEXT,                        -- mensaje de error si status='error'
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_server_mods_server_id ON public.server_mods(server_id);
CREATE INDEX IF NOT EXISTS idx_server_mods_status    ON public.server_mods(status);

-- ============================================================
-- 3. TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_server_mods_updated_at ON public.server_mods;
CREATE TRIGGER set_server_mods_updated_at
  BEFORE UPDATE ON public.server_mods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.server_mods ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven mods de sus propios servidores
CREATE POLICY "users_view_own_server_mods"
  ON public.server_mods FOR SELECT
  USING (
    server_id IN (
      SELECT id FROM public.mc_servers
      WHERE user_id = auth.uid()
    )
  );

-- Los usuarios pueden insertar mods en sus propios servidores
CREATE POLICY "users_insert_own_server_mods"
  ON public.server_mods FOR INSERT
  WITH CHECK (
    server_id IN (
      SELECT id FROM public.mc_servers
      WHERE user_id = auth.uid()
    )
  );

-- Los usuarios pueden actualizar mods de sus propios servidores
CREATE POLICY "users_update_own_server_mods"
  ON public.server_mods FOR UPDATE
  USING (
    server_id IN (
      SELECT id FROM public.mc_servers
      WHERE user_id = auth.uid()
    )
  );

-- Los usuarios pueden borrar mods de sus propios servidores
CREATE POLICY "users_delete_own_server_mods"
  ON public.server_mods FOR DELETE
  USING (
    server_id IN (
      SELECT id FROM public.mc_servers
      WHERE user_id = auth.uid()
    )
  );

-- El service role puede hacer todo (para n8n)
CREATE POLICY "service_role_all"
  ON public.server_mods FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. Habilitar Realtime para la tabla
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_mods;
