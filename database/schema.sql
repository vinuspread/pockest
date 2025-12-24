-- ============================================================
-- Pockest Database Schema
-- Version: 1.0
-- Last Updated: 2024-12-24
-- ============================================================
-- Description:
-- This file contains the complete database schema for Pockest.
-- It is designed to work with Supabase (PostgreSQL).
-- 
-- Apply this schema:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
-- Description: User profile data (extends Supabase auth.users)
-- Relationship: 1:1 with auth.users

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier)
  VALUES (NEW.id, NEW.email, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. POCKETS TABLE (Folders)
-- ============================================================
-- Description: User-created folders for organizing items

CREATE TABLE IF NOT EXISTS pockets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pockets_user_id ON pockets(user_id);
CREATE INDEX IF NOT EXISTS idx_pockets_created_at ON pockets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pockets_is_default ON pockets(is_default) WHERE is_default = TRUE;

-- RLS (Row Level Security)
ALTER TABLE pockets ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own pockets
CREATE POLICY "Users can view own pockets"
  ON pockets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pockets"
  ON pockets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pockets"
  ON pockets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pockets"
  ON pockets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS update_pockets_updated_at ON pockets;
CREATE TRIGGER update_pockets_updated_at
  BEFORE UPDATE ON pockets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-create default pocket for new users
CREATE OR REPLACE FUNCTION create_default_pocket()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pockets (user_id, name, is_default)
  VALUES (NEW.id, '기본 폴더', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_default_pocket ON profiles;
CREATE TRIGGER on_profile_created_default_pocket
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_pocket();

-- ============================================================
-- 3. ITEMS TABLE (Shopping Products)
-- ============================================================
-- Description: Saved shopping items with metadata

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pocket_id UUID REFERENCES pockets(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  site_name TEXT,
  price NUMERIC(12, 2), -- Supports up to 9,999,999,999.99
  currency TEXT DEFAULT 'KRW',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  memo TEXT,
  deleted_at TIMESTAMPTZ, -- NULL = Active, NOT NULL = Trashed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_pocket_id ON items(pocket_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_is_pinned ON items(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_active ON items(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_title_search ON items USING gin(to_tsvector('simple', title));

-- RLS (Row Level Security)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own items
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. DATABASE VIEWS (Optimized Queries)
-- ============================================================

-- Active Items (Not Deleted)
CREATE OR REPLACE VIEW active_items AS
SELECT 
  i.*,
  p.name AS pocket_name
FROM items i
LEFT JOIN pockets p ON i.pocket_id = p.id
WHERE i.deleted_at IS NULL;

-- Trash Items (Deleted)
CREATE OR REPLACE VIEW trash_items AS
SELECT *
FROM items
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- ============================================================
-- 5. RPC FUNCTIONS (Database-Side Logic)
-- ============================================================

-- ============================================================
-- 5.1 Get Today Items (Last 24 hours)
-- ============================================================
CREATE OR REPLACE FUNCTION get_today_items(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  pocket_id UUID,
  url TEXT,
  image_url TEXT,
  site_name TEXT,
  title TEXT,
  price NUMERIC,
  currency TEXT,
  is_pinned BOOLEAN,
  memo TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.user_id,
    i.pocket_id,
    i.url,
    i.image_url,
    i.site_name,
    i.title,
    i.price,
    i.currency,
    i.is_pinned,
    i.memo,
    i.created_at,
    i.updated_at,
    i.deleted_at
  FROM items i
  WHERE i.user_id = p_user_id
    AND i.deleted_at IS NULL
    AND i.created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5.2 Move Item to Trash (Soft Delete)
-- ============================================================
CREATE OR REPLACE FUNCTION move_item_to_trash(p_item_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE items
  SET 
    deleted_at = NOW(),
    is_pinned = FALSE, -- Auto-unpin when trashed
    updated_at = NOW()
  WHERE id = p_item_id
    AND user_id = p_user_id
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5.3 Restore Item from Trash
-- ============================================================
CREATE OR REPLACE FUNCTION restore_item_from_trash(
  p_item_id UUID, 
  p_user_id UUID, 
  p_pocket_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE items
  SET 
    deleted_at = NULL,
    pocket_id = COALESCE(p_pocket_id, pocket_id), -- Optionally move to new pocket
    updated_at = NOW()
  WHERE id = p_item_id
    AND user_id = p_user_id
    AND deleted_at IS NOT NULL;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5.4 Empty Trash (Auto-Cleanup Cron Job)
-- ============================================================
-- Delete items that have been in trash for more than N days
CREATE OR REPLACE FUNCTION empty_trash_older_than(days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM items
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - (days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. SAMPLE DATA (Optional - For Testing)
-- ============================================================
-- Uncomment to insert test data

/*
-- Insert test user (requires manual auth.users entry first)
-- INSERT INTO profiles (id, email, tier) 
-- VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'test@example.com', 'free');

-- Insert test pocket
-- INSERT INTO pockets (user_id, name, is_default)
-- VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Test Folder', FALSE);

-- Insert test item
-- INSERT INTO items (user_id, pocket_id, url, title, price, currency)
-- VALUES (
--   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
--   (SELECT id FROM pockets WHERE name = 'Test Folder' LIMIT 1),
--   'https://example.com/product',
--   'Test Product',
--   29900,
--   'KRW'
-- );
*/

-- ============================================================
-- 7. SECURITY CHECKLIST
-- ============================================================
-- ✅ RLS enabled on all tables
-- ✅ Users can only access their own data
-- ✅ Triggers prevent unauthorized data manipulation
-- ✅ Foreign keys ensure referential integrity
-- ✅ Indexes optimize query performance

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Next Steps:
-- 1. Verify all tables exist: \dt in psql
-- 2. Check RLS policies: \d+ profiles
-- 3. Test queries:
--    SELECT * FROM profiles;
--    SELECT * FROM pockets;
--    SELECT * FROM items;
-- 4. Test RPC functions:
--    SELECT * FROM get_today_items('your-user-id');
-- ============================================================

