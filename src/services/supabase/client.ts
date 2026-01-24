/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables. Check .env or Vercel settings.');
}

const isExtension = window.location.protocol.startsWith('chrome-extension');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isExtension, // 웹에서는 URL 세션 감지 활성화
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
  },
});

// 인증 상태 변경 리스너
export const onAuthStateChange = (
  callback: (event: string, session: unknown) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

// 현재 세션 가져오기
export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Supabase] getSession error:', error.message);
      return null;
    }
    return data.session;
  } catch (error) {
    console.error('[Supabase] getSession exception:', error);
    return null;
  }
};

// 현재 유저 가져오기
export const getUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[Supabase] getUser error:', error.message);
      return null;
    }
    return data.user;
  } catch (error) {
    console.error('[Supabase] getUser exception:', error);
    return null;
  }
};
