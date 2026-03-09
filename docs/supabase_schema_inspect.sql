-- ============================================================
-- Lanista — Supabase Schema Inspector
-- Tüm tablolar, kolonlar, ilişkiler, index'ler ve RLS policy'leri
-- Supabase SQL Editor'da çalıştır
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. TÜM TABLOLAR (satır sayısı dahil)
-- ────────────────────────────────────────────────────────────
SELECT
  t.table_name,
  t.table_type,
  obj_description(pc.oid, 'pg_class') AS description,
  pg_size_pretty(pg_total_relation_size(pc.oid)) AS total_size,
  pc.reltuples::bigint AS estimated_rows
FROM information_schema.tables t
JOIN pg_class pc ON pc.relname = t.table_name
JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type IN ('BASE TABLE', 'VIEW')
ORDER BY t.table_type, t.table_name;


-- ────────────────────────────────────────────────────────────
-- 2. TÜM KOLONLAR (tablo + kolon + tip + nullable + default)
-- ────────────────────────────────────────────────────────────
SELECT
  c.table_name,
  c.ordinal_position AS pos,
  c.column_name,
  c.data_type,
  CASE
    WHEN c.character_maximum_length IS NOT NULL
      THEN c.data_type || '(' || c.character_maximum_length || ')'
    WHEN c.numeric_precision IS NOT NULL AND c.data_type NOT IN ('integer','bigint','smallint')
      THEN c.data_type || '(' || c.numeric_precision || ',' || COALESCE(c.numeric_scale,0) || ')'
    ELSE c.data_type
  END AS full_type,
  c.is_nullable,
  c.column_default,
  c.is_identity,
  c.identity_generation
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;


-- ────────────────────────────────────────────────────────────
-- 3. PRIMARY KEY'LER
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;


-- ────────────────────────────────────────────────────────────
-- 4. FOREIGN KEY'LER (ilişki haritası)
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name           AS from_table,
  kcu.column_name         AS from_column,
  ccu.table_name          AS to_table,
  ccu.column_name         AS to_column,
  rc.update_rule,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
  AND rc.unique_constraint_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY from_table, from_column;


-- ────────────────────────────────────────────────────────────
-- 5. UNIQUE CONSTRAINT'LER
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;


-- ────────────────────────────────────────────────────────────
-- 6. INDEX'LER
-- ────────────────────────────────────────────────────────────
SELECT
  t.relname   AS table_name,
  i.relname   AS index_name,
  ix.indisunique  AS is_unique,
  ix.indisprimary AS is_primary,
  array_to_string(
    array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)),
    ', '
  ) AS columns,
  am.amname   AS index_type
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i  ON i.oid = ix.indexrelid
JOIN pg_am am    ON am.oid = i.relam
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relkind = 'r'
GROUP BY t.relname, i.relname, ix.indisunique, ix.indisprimary, am.amname
ORDER BY t.relname, i.relname;


-- ────────────────────────────────────────────────────────────
-- 7. CHECK CONSTRAINT'LER
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
  AND tc.table_schema = cc.constraint_schema
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;


-- ────────────────────────────────────────────────────────────
-- 8. RLS (Row Level Security) DURUMU
-- ────────────────────────────────────────────────────────────
SELECT
  relname AS table_name,
  relrowsecurity    AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY relname;


-- ────────────────────────────────────────────────────────────
-- 9. RLS POLICY'LERİ (detaylı)
-- ────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd         AS operation,
  qual        AS using_expr,
  with_check  AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ────────────────────────────────────────────────────────────
-- 10. TRIGGER'LAR
-- ────────────────────────────────────────────────────────────
SELECT
  trigger_name,
  event_object_table AS table_name,
  event_manipulation AS event,
  action_timing,
  action_orientation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;


-- ────────────────────────────────────────────────────────────
-- 11. RPC FONKSİYONLARI (public schema)
-- ────────────────────────────────────────────────────────────
SELECT
  p.proname   AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  t.typname   AS return_type,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility,   -- i=immutable, s=stable, v=volatile
  obj_description(p.oid, 'pg_proc') AS description
FROM pg_proc p
JOIN pg_type t ON t.oid = p.prorettype
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;


-- ────────────────────────────────────────────────────────────
-- 12. ENUM TİPLERİ
-- ────────────────────────────────────────────────────────────
SELECT
  t.typname AS enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;


-- ────────────────────────────────────────────────────────────
-- 13. STORAGE BUCKET'LAR (Supabase Storage)
-- ────────────────────────────────────────────────────────────
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;
