# Chrome Web Store 심사 대비 수정 사항 리포트

이 리포트는 Chrome Web Store 심사 통과를 위해 적용된 기술적 및 정책적 수정 사항을 요약합니다. 외부 검증(Cursor 등) 시 참고 자료로 활용하세요.

## 1. 주요 수정 사항 요약

### ✅ 1. 광범위한 권한 문제 해결 (`<all_urls>`)
*   **이전 상태**: 모든 웹사이트(`*://*/*`)에 대한 스크립트 실행 및 데이터 접근 권한 요청. (반려 위험 높음)
*   **현재 상태**: **명시된 60+개 주요 쇼핑몰 도메인**에 대해서만 권한 요청 (Whitelist 방식).
    *   포함된 카테고리: Global(Amazon, AliExpress, eBay 등), Korea(Naver, Coupang 등), Japan, China, Fashion/Interior 전문몰.
    *   **효과**: "최소 권한의 원칙(Use of Permissions)" 준수, 심사 통과 확률 대폭 상향.

### ✅ 2. 콘솔 로그 제거 (Clean Code)
*   **이전 상태**: `console.log`가 프로덕션 빌드에도 포함되어 사용자 콘솔 오염 및 디버깅 정보 노출.
*   **현재 상태**: `src/utils/logger.ts` 유틸리티 도입.
    *   모든 `console.log`, `console.error`를 `logger.log`, `logger.error`로 교체.
    *   `logger`는 개발 환경(`import.meta.env.MODE === 'development'`)에서만 동작하며, 프로덕션 빌드 시 로그를 출력하지 않음.

### ✅ 3. 불필요한 권한 제거
*   **조치**: `manifest.json`에서 `identity` 권한 제거.
*   **이유**: Google OAuth API(`chrome.identity`)를 직접 사용하지 않고, Supabase Auth(PKCE Flow)를 사용하므로 해당 권한 불필요.

### ✅ 4. Content Script 최적화
*   **이전 상태**: 모든 페이지 로드 시 스크립트가 초기화됨.
*   **현재 상태**: `manifest.json`의 `matches` 필드에 지정된 **쇼핑몰 도메인에서만** 스크립트가 로드됨.
    *   비쇼핑 사이트(뉴스, 유튜브 등)에 영향을 주지 않음 (성능 최적화).

### ✅ 5. 빌드 무결성 확보
*   **조치**: `scripts/fix-manifest.js` 유지.
    *   Vite 빌드 후 `manifest.json`이 `.ts` 소스 파일이 아닌 빌드된 `.js` 파일을 가리키도록 경로 자동 수정 기능 포함.
    *   CSP(Content Security Policy) 및 Host Permissions 자동 주입 로직 검증 완료.

---

## 2. 검증 요청 포인트 (To Cursor)

다음 항목들을 중점적으로 다시 점검 요청하시면 좋습니다:

1.  **Whitelist Coverage**: `manifest.json`에 나열된 도메인 패턴(`*://*.domain.com/*`)이 서브 도메인을 포함하여 올바르게 작성되었는지 확인.
2.  **Permission Safety**: `permissions` 목록(`sidePanel`, `storage`, `activeTab`)이 기능 구현에 필요한 최소 한도인지 재확인.
3.  **Code Safety**: `content/index.tsx` 등에서 여전히 남아있는 보안 위협(원격 코드 실행 `eval` 등 - 없어야 함) 여부.
