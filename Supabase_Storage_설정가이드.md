# Supabase Storage 설정 가이드

**우선순위: 🔴 매우 높음**

이미지 저장 실패의 가장 큰 원인은 Supabase Storage 설정 누락입니다.

---

## 1. Supabase 대시보드 접속

1. https://supabase.com 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **Storage** 클릭

---

## 2. 버킷 확인 및 생성

### 2.1 "pockest" 버킷 존재 여부 확인

**확인할 것:**
- [ ] `pockest` 이름의 버킷이 존재하는가?

### 2.2 버킷이 없다면 생성

**생성 단계:**
1. **"New bucket"** 버튼 클릭
2. **Bucket name:** `pockest` 입력
3. **Public bucket:** ✅ 체크 (중요!)
4. **File size limit:** `5242880` (5MB) 입력
5. **Allowed MIME types:** `image/*` 입력
6. **Create bucket** 클릭

---

## 3. RLS (Row Level Security) 정책 설정

### 3.1 정책 확인

**확인 방법:**
1. `pockest` 버킷 클릭
2. 상단의 **"Policies"** 탭 클릭
3. 다음 정책들이 존재하는지 확인:
   - **INSERT 정책** (사용자가 자신의 이미지 업로드 가능)
   - **SELECT 정책** (모든 사용자가 이미지 읽기 가능)

### 3.2 정책이 없다면 생성

#### 방법 1: SQL Editor에서 실행 (권장)

**SQL Editor 접속:**
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **"New query"** 클릭
3. 아래 SQL 복사 후 실행

**SQL 코드:**
```sql
-- 1. 사용자가 자신의 폴더에 이미지 업로드 허용
CREATE POLICY "Users can upload their own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pockest' 
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 2. 모든 사용자가 이미지 읽기 가능 (공개)
CREATE POLICY "Public can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'pockest');

-- 3. 사용자가 자신의 이미지 삭제 가능
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pockest'
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

**실행:**
- **"Run"** (Ctrl+Enter) 클릭

#### 방법 2: Storage UI에서 생성

**INSERT 정책:**
1. Policies 탭에서 **"New policy"** 클릭
2. **Policy name:** `Users can upload their own thumbnails`
3. **Allowed operation:** `INSERT` 선택
4. **Policy definition:**
   ```sql
   bucket_id = 'pockest' 
   AND (storage.foldername(name))[1] = 'thumbnails'
   AND (storage.foldername(name))[2] = auth.uid()::text
   ```
5. **Save policy** 클릭

**SELECT 정책:**
1. **"New policy"** 클릭
2. **Policy name:** `Public can view thumbnails`
3. **Allowed operation:** `SELECT` 선택
4. **Policy definition:**
   ```sql
   bucket_id = 'pockest'
   ```
5. **Save policy** 클릭

---

## 4. 테스트 업로드

### 4.1 Supabase UI에서 직접 업로드

**테스트 단계:**
1. Storage → `pockest` 버킷 클릭
2. **"Upload file"** 클릭
3. 임의의 이미지 파일 선택
4. 업로드 성공 확인

**실패 시:**
- RLS 정책이 올바르게 설정되지 않았을 가능성
- 위 3단계 재확인

### 4.2 익스텐션에서 테스트

**테스트 방법:**
1. 쿠팡 상품 페이지 접속
2. 익스텐션 Popup 열기 (F12 → Console 탭 열어두기)
3. "저장하기" 버튼 클릭
4. Console에서 다음 로그 확인:

**성공 로그:**
```
[ImageOptimizer] Starting process for: https://...
[ImageOptimizer] Fetching image...
[ImageOptimizer] Fetch response: { status: 200, ... }
[ImageOptimizer] Blob created: { size: 12345, type: "image/jpeg" }
[ImageOptimizer] Image loaded successfully: { width: 500, height: 500 }
[ImageOptimizer] Resizing: { original: {...}, resized: {...} }
[ImageOptimizer] Generating blurhash...
[ImageOptimizer] Blurhash generated: LEHV6nWB2yk8pyo0ad...
[ImageOptimizer] Converting to WebP...
[ImageOptimizer] WebP conversion successful: { size: 8765, ... }
[ImageOptimizer] Uploading to Supabase Storage...
[ImageOptimizer] Upload path: thumbnails/xxx/1234567890.webp
[ImageOptimizer] Upload successful: { path: "...", id: "..." }
[ImageOptimizer] Public URL generated: https://xxx.supabase.co/storage/v1/object/public/pockest/thumbnails/...
```

**실패 시 확인할 로그:**
```
[ImageOptimizer] Upload failed: {
  path: "thumbnails/xxx/1234567890.webp",
  error: "new row violates row-level security policy",
  statusCode: 403,
  ...
}
```

**에러 유형별 해결책:**

| 에러 메시지 | 원인 | 해결 방법 |
|------------|------|----------|
| `new row violates row-level security policy` | RLS 정책 누락 또는 잘못됨 | 3단계 RLS 정책 재설정 |
| `The resource already exists` | 파일명 중복 (거의 발생 안 함) | 재시도 |
| `Bucket not found` | `pockest` 버킷이 없음 | 2단계 버킷 생성 |
| `payload too large` | 이미지 크기가 제한 초과 | 버킷 설정에서 File size limit 증가 |

---

## 5. 최종 체크리스트

**완료 확인:**
- [ ] Supabase 대시보드 → Storage 메뉴 접속
- [ ] `pockest` 버킷 존재 확인
- [ ] 버킷이 **Public bucket**으로 설정되어 있음
- [ ] RLS 정책 3개 (INSERT, SELECT, DELETE) 존재
- [ ] Supabase UI에서 직접 파일 업로드 테스트 성공
- [ ] 익스텐션에서 상품 저장 시 Console 로그 확인
  - `[ImageOptimizer] Upload successful:` 로그 출력
  - `[ImageOptimizer] Public URL generated:` 로그 출력
- [ ] 대시보드에서 저장된 상품의 이미지가 정상 표시됨

---

## 6. 추가 디버깅 팁

### 6.1 Network 탭에서 확인

**Chrome DevTools → Network 탭:**
1. Filter를 `Fetch/XHR`로 설정
2. 상품 저장 버튼 클릭
3. `storage/v1/object/pockest` 요청 확인
4. 응답 상태 코드 확인:
   - `200 OK`: 성공
   - `403 Forbidden`: RLS 정책 문제
   - `404 Not Found`: 버킷 없음
   - `413 Payload Too Large`: 이미지 크기 초과

### 6.2 Supabase 로그 확인

**Supabase 대시보드에서:**
1. 왼쪽 메뉴 → **Logs** 클릭
2. **API** 로그 선택
3. 시간별로 에러 로그 확인
4. `storage` 관련 에러 찾기

---

## 7. 문제 지속 시 확인 사항

**여전히 이미지가 저장되지 않는다면:**

1. **Console에 어떤 로그가 출력되는가?**
   - `[ImageOptimizer] Fetch response:` 까지 나오는가?
   - `[ImageOptimizer] Upload failed:` 에러가 나오는가?

2. **Network 탭에서 어느 요청이 실패하는가?**
   - 이미지 fetch가 실패하는가? (403, 404)
   - Supabase upload가 실패하는가? (403, 404)

3. **Supabase Storage 버킷 설정을 다시 확인**
   - Public bucket이 맞는가?
   - RLS 정책이 올바른가?

---

**다음 단계:**
1. ✅ 이 가이드대로 Supabase Storage 설정 완료
2. ✅ 익스텐션 새로고침 (chrome://extensions/)
3. ✅ 쿠팡 상품 페이지에서 저장 테스트
4. ✅ Console 로그 스크린샷 확인

**설정 완료 후 보고:**
- Console 로그 스크린샷
- 성공/실패 여부
- 에러 메시지 (있다면)
