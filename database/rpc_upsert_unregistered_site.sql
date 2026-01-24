-- RPC 함수: 미등록 쇼핑몰 Upsert (중복 방지)
CREATE OR REPLACE FUNCTION upsert_unregistered_site(
  p_domain TEXT,
  p_full_url TEXT,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO unregistered_sites (domain, full_url, user_id, visit_count, last_visited_at)
  VALUES (p_domain, p_full_url, p_user_id, 1, NOW())
  ON CONFLICT (domain, user_id)
  DO UPDATE SET
    visit_count = unregistered_sites.visit_count + 1,
    last_visited_at = NOW(),
    full_url = EXCLUDED.full_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
