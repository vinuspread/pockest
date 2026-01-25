/**
 * Production-safe Logger
 * 개발 환경에서만 로그 출력
 */

const IS_DEV = import.meta.env.MODE === 'development';
const DEBUG = true; // 임시 디버그 모드

export const logger = {
  log: (...args: unknown[]) => {
    if (IS_DEV || DEBUG) console.log('[Pockest]', ...args);
  },
  error: (...args: unknown[]) => {
    if (IS_DEV || DEBUG) console.error('[Pockest]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (IS_DEV || DEBUG) console.warn('[Pockest]', ...args);
  },
};
