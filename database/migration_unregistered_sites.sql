-- 미등록 쇼핑몰 URL 수집 테이블
CREATE TABLE IF NOT EXISTS unregistered_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  full_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_count INTEGER DEFAULT 1,
  last_visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(domain, user_id)
);

-- 인덱스 생성
CREATE INDEX idx_unregistered_sites_domain ON unregistered_sites(domain);
CREATE INDEX idx_unregistered_sites_user_id ON unregistered_sites(user_id);
CREATE INDEX idx_unregistered_sites_visit_count ON unregistered_sites(visit_count DESC);

-- RLS 활성화
ALTER TABLE unregistered_sites ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 데이터만 삽입/수정 가능
CREATE POLICY "Users can insert their own unregistered sites"
  ON unregistered_sites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unregistered sites"
  ON unregistered_sites FOR UPDATE
  USING (auth.uid() = user_id);

-- 정책: 관리자는 모든 데이터 조회 가능
CREATE POLICY "Admins can view all unregistered sites"
  ON unregistered_sites FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email IN ('vinus@vinus.co.kr')
    )
  );

-- 집계 뷰 생성 (관리자용)
CREATE OR REPLACE VIEW unregistered_sites_stats AS
SELECT 
  domain,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(visit_count) as total_visits,
  MAX(last_visited_at) as last_visit,
  MIN(created_at) as first_discovered
FROM unregistered_sites
GROUP BY domain
ORDER BY unique_users DESC, total_visits DESC;

-- 뷰에 대한 RLS (관리자만)
ALTER VIEW unregistered_sites_stats OWNER TO postgres;
GRANT SELECT ON unregistered_sites_stats TO authenticated;
