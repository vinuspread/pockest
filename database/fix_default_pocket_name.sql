-- 기존 "기본폴더" 이름을 "기본포켓"으로 변경
UPDATE pockets 
SET name = '기본포켓' 
WHERE is_default = true AND name = '기본폴더';

-- 앞으로 생성될 기본 포켓 이름 변경 (트리거 수정)
-- 기존 트리거가 있다면 수정하거나, 없다면 새로 생성
CREATE OR REPLACE FUNCTION create_default_pocket()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pockets (user_id, name, is_default, is_public)
  VALUES (NEW.id, '기본포켓', true, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거가 없으면 생성
DROP TRIGGER IF EXISTS on_auth_user_created_pocket ON auth.users;
CREATE TRIGGER on_auth_user_created_pocket
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_pocket();
