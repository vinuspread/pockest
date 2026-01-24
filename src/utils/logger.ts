/**
 * Production-safe Logger
 * 개발 환경에서만 로그 출력
 */

const IS_DEV = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (IS_DEV) console.log('[Pockest]', ...args);
  },
  error: (...args: unknown[]) => {
    if (IS_DEV) console.error('[Pockest]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (IS_DEV) console.warn('[Pockest]', ...args);
  },
};
