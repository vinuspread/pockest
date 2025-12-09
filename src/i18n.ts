import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 언어 리소스 import
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

// 지원 언어 목록
export const supportedLanguages = ['ko', 'en', 'ja', 'zh'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// 언어별 표시 이름
export const languageNames: Record<SupportedLanguage, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

// 리소스 번들
const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },
};

// i18n 초기화
i18n
  // 브라우저 언어 자동 감지 플러그인
  .use(LanguageDetector)
  // React 바인딩
  .use(initReactI18next)
  // 초기화 설정
  .init({
    resources,
    fallbackLng: 'en', // 기본 언어 (지원하지 않는 언어일 때)
    supportedLngs: supportedLanguages,
    
    // 언어 감지 설정
    detection: {
      // 감지 순서: localStorage → navigator → htmlTag
      order: ['localStorage', 'navigator', 'htmlTag'],
      // 감지된 언어 캐시 위치
      caches: ['localStorage'],
      // localStorage 키 이름
      lookupLocalStorage: 'pockest-language',
    },

    interpolation: {
      escapeValue: false, // React는 XSS 보호가 내장되어 있음
    },

    // 디버그 모드 (개발 환경에서만)
    debug: import.meta.env.DEV,

    // React Suspense 사용
    react: {
      useSuspense: false,
    },
  });

// 언어 변경 함수 (컴포넌트 외부에서도 사용 가능)
export const changeLanguage = (lng: SupportedLanguage) => {
  return i18n.changeLanguage(lng);
};

// 현재 언어 가져오기
export const getCurrentLanguage = (): SupportedLanguage => {
  const current = i18n.language;
  // 'ko-KR' 같은 형식을 'ko'로 변환
  const shortLang = current?.split('-')[0] as SupportedLanguage;
  return supportedLanguages.includes(shortLang) ? shortLang : 'en';
};

export default i18n;

