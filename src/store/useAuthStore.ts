import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/services/supabase/client';
import type { User, AuthStatus } from '@/types';
import type { Profile } from '@/types/database';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      status: 'loading',
      error: null,

      initialize: async () => {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('[Auth] Session error:', sessionError.message);
            set({ user: null, status: 'unauthenticated', error: null });
            return;
          }
          
          if (session?.user) {
            // profiles 테이블에서 추가 정보 가져오기
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('tier')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.warn('[Auth] Profile fetch warning:', profileError.message);
            }

            const profileData = profile as Pick<Profile, 'tier'> | null;

            set({
              user: {
                id: session.user.id,
                email: session.user.email || '',
                tier: profileData?.tier || 'free',
              },
              status: 'authenticated',
              error: null,
            });
            return;
          }
          
          set({ user: null, status: 'unauthenticated', error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Auth] Initialize exception:', errorMessage);
          set({ user: null, status: 'unauthenticated', error: null });
        }
      },

      signInWithEmail: async (email, password) => {
        set({ status: 'loading', error: null });
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            console.error('[Auth] SignIn error:', error.message);
            set({
              user: null,
              status: 'unauthenticated',
              error: error.message === 'Invalid login credentials' 
                ? '이메일 또는 비밀번호가 올바르지 않습니다.' 
                : error.message,
            });
            return;
          }

          if (data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('tier')
              .eq('id', data.user.id)
              .single();

            const profileData = profile as Pick<Profile, 'tier'> | null;

            set({
              user: {
                id: data.user.id,
                email: data.user.email || '',
                tier: profileData?.tier || 'free',
              },
              status: 'authenticated',
              error: null,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
          console.error('[Auth] SignIn exception:', errorMessage);
          set({
            user: null,
            status: 'unauthenticated',
            error: errorMessage,
          });
        }
      },

      signUpWithEmail: async (email, password) => {
        set({ status: 'loading', error: null });
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) {
            console.error('[Auth] SignUp error:', error.message);
            let userFriendlyError = error.message;
            
            if (error.message.includes('already registered')) {
              userFriendlyError = '이미 등록된 이메일입니다.';
            } else if (error.message.includes('password')) {
              userFriendlyError = '비밀번호는 최소 6자 이상이어야 합니다.';
            }
            
            set({
              user: null,
              status: 'unauthenticated',
              error: userFriendlyError,
            });
            return;
          }

          if (data.user) {
            // 회원가입 성공 - 이메일 확인이 필요한 경우
            if (!data.session) {
              set({
                user: null,
                status: 'unauthenticated',
                error: '이메일로 전송된 확인 링크를 클릭해주세요.',
              });
              return;
            }

            set({
              user: {
                id: data.user.id,
                email: data.user.email || '',
                tier: 'free',
              },
              status: 'authenticated',
              error: null,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '회원가입에 실패했습니다.';
          console.error('[Auth] SignUp exception:', errorMessage);
          set({
            user: null,
            status: 'unauthenticated',
            error: errorMessage,
          });
        }
      },

      signOut: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          
          if (error) {
            console.error('[Auth] SignOut error:', error.message);
          }
          
          set({ user: null, status: 'unauthenticated', error: null });
        } catch (error) {
          console.error('[Auth] SignOut exception:', error instanceof Error ? error.message : error);
          set({ user: null, status: 'unauthenticated', error: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'pockest-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
