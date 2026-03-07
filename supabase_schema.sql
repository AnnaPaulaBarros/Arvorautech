-- ============================================================
-- ArvouraTech - Schema SQL para Supabase
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Tabela de usuários (complementa auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'agronomist')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de árvores
CREATE TABLE IF NOT EXISTS public.trees (
  tree_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  height FLOAT,
  diameter FLOAT,
  latitude FLOAT,
  longitude FLOAT,
  planting_date TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de fotos das árvores
CREATE TABLE IF NOT EXISTS public.tree_photos (
  photo_id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL REFERENCES public.trees(tree_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de registros de manutenção
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  maintenance_id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL REFERENCES public.trees(tree_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('poda', 'irrigacao', 'adubacao', 'controle_biologico')),
  date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_trees_user_id ON public.trees(user_id);
CREATE INDEX IF NOT EXISTS idx_trees_created_at ON public.trees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_user_id ON public.maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tree_id ON public.maintenance_records(tree_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON public.maintenance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_tree_photos_tree_id ON public.tree_photos(tree_id);

-- Desabilitar RLS (o backend usa service_role key que ignora RLS de qualquer forma)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE: Execute no dashboard do Supabase > Storage
-- Crie um bucket chamado "tree-photos" com acesso PÚBLICO
-- ============================================================
