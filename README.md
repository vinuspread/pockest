# Pockest

쇼핑 상품 북마크 & 폴더 관리 Chrome Extension + Web Dashboard

## 🛠 기술 스택

- **Core**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Backend**: Supabase (PostgreSQL)
- **Extension**: @crxjs/vite-plugin (Manifest V3)

## 📁 프로젝트 구조

```
/src
  /assets           # 정적 파일 (아이콘, 이미지)
  /background       # Extension 백그라운드 서비스 워커
  /components       # 공통 UI 컴포넌트
    /ui             # 버튼, 카드 등 기본 요소
    /layout         # Header, Sidebar
  /hooks            # 커스텀 훅 (비즈니스 로직)
  /pages
    /popup          # Extension 팝업 (600px)
    /dashboard      # Web 대시보드
    /content        # 쇼핑몰 내 삽입 스크립트
  /services
    /supabase       # Supabase 클라이언트
    /storage        # Chrome Storage 래퍼
  /store            # Zustand 전역 상태
  /styles           # 글로벌 CSS
  /types            # TypeScript 타입 정의
  /utils            # 유틸리티 함수
  manifest.json     # Chrome Extension 설정
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp env.example .env
```

`.env` 파일에 Supabase 정보 입력:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 개발 서버 실행

```bash
# Web Dashboard 개발
npm run dev

# Extension 빌드 (watch mode)
npm run dev:extension
```

### 4. Extension 설치 (개발용)

1. Chrome에서 `chrome://extensions` 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `dist` 폴더 선택

## 📦 빌드

```bash
# 프로덕션 빌드
npm run build

# Extension만 빌드
npm run build:extension
```

## 🔑 주요 기능

- ✅ 현재 페이지 상품 정보 자동 추출
- ✅ 폴더(Pocket)별 상품 분류
- ✅ 즐겨찾기(Star) 기능
- ✅ 오늘 저장(Today List) - 24시간 내 저장 항목
- ✅ 휴지통 (Soft Delete)
- ✅ 가격 필터링 & 검색

## 📝 라이선스

MIT

---
Last updated: 2025-12-10
