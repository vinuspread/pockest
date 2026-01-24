/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xnfxfitvgmzrfhhigsgb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DLn32up5Awyji419aa61oA_Z8GDBbxL';

/**
 * Supabase Client 설정
 * Chrome Extension 환경에서는 detectSessionInUrl을 비활성화해야 함
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
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
