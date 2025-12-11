/**
 * Chrome Storage API 래퍼
 * Extension과 Web 환경 모두에서 동작하도록 추상화
 */

type StorageArea = 'local' | 'sync' | 'session';

interface StorageWrapper {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

const isChromeExtension = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.storage;
};

/**
 * Chrome Storage API 래퍼 생성
 */
export const createStorage = (area: StorageArea = 'local'): StorageWrapper => {
  if (isChromeExtension()) {
    const storage = chrome.storage[area];

    return {
      get: async <T>(key: string): Promise<T | null> => {
        const result = await storage.get(key);
        return (result[key] as T) ?? null;
      },

      set: async <T>(key: string, value: T): Promise<void> => {
        await storage.set({ [key]: value });
      },

      remove: async (key: string): Promise<void> => {
        await storage.remove(key);
      },

      clear: async (): Promise<void> => {
        await storage.clear();
      },
    };
  }

  // 웹 환경에서는 localStorage 사용
  return {
    get: async <T>(key: string): Promise<T | null> => {
      const item = localStorage.getItem(key);
      if (!item) return null;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    },

    set: async <T>(key: string, value: T): Promise<void> => {
      localStorage.setItem(key, JSON.stringify(value));
    },

    remove: async (key: string): Promise<void> => {
      localStorage.removeItem(key);
    },

    clear: async (): Promise<void> => {
      localStorage.clear();
    },
  };
};

// 기본 스토리지 인스턴스
export const storage = createStorage('local');
export const syncStorage = createStorage('sync');

// 자주 사용하는 키 상수
export const STORAGE_KEYS = {
  AUTH_SESSION: 'pockest_auth_session',
  USER_PREFERENCES: 'pockest_user_preferences',
  LAST_SYNC: 'pockest_last_sync',
  CACHED_ITEMS: 'pockest_cached_items',
} as const;







