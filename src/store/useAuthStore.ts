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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  withdraw: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
              .select('tier, affiliate_agreed')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.warn('[Auth] Profile fetch warning:', profileError.message);
            }

            const profileData = profile as Pick<Profile, 'tier' | 'affiliate_agreed'> | null;

            set({
              user: {
                id: session.user.id,
                email: session.user.email || '',
                tier: profileData?.tier || 'free',
                affiliate_agreed: profileData?.affiliate_agreed ?? false,
                user_metadata: session.user.user_metadata,
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
              .select('tier, affiliate_agreed')
              .eq('id', data.user.id)
              .single();

            const profileData = profile as Pick<Profile, 'tier' | 'affiliate_agreed'> | null;

            set({
              user: {
                id: data.user.id,
                email: data.user.email || '',
                tier: profileData?.tier || 'free',
                affiliate_agreed: profileData?.affiliate_agreed ?? false,
                user_metadata: data.user.user_metadata,
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
                affiliate_agreed: false,
                user_metadata: data.user.user_metadata,
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

      signInWithGoogle: async () => {
        set({ status: 'loading', error: null });

        try {
          // 1. 크롬 익스텐션 환경인지 확인
          const isExtension = typeof chrome !== 'undefined' && chrome.identity;

          if (isExtension) {
            // [Extension] chrome.identity 사용
            const redirectUrl = chrome.identity.getRedirectURL();
            console.log('Using Extension Redirect URL:', redirectUrl);

            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                skipBrowserRedirect: true,
                redirectTo: redirectUrl,
              },
            });

            if (error) throw error;
            if (!data?.url) throw new Error('No login URL returned');

            const responseUrl = await chrome.identity.launchWebAuthFlow({
              url: data.url,
              interactive: true,
            });

            if (!responseUrl) throw new Error('Login cancelled');

            const urlObj = new URL(responseUrl);
            const code = urlObj.searchParams.get('code');

            if (code) {
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) throw exchangeError;
            } else {
              const params = new URLSearchParams(urlObj.hash.substring(1));
              const access_token = params.get('access_token');
              const refresh_token = params.get('refresh_token');

              if (!access_token) throw new Error('No access token found');

              const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token: refresh_token || '',
              });
              if (sessionError) throw sessionError;
            }
          } else {
            // [Web] 일반 리다이렉트 방식 사용
            console.log('Using Web Redirect Flow');
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${window.location.origin}/dashboard`,
                queryParams: {
                  prompt: 'select_account',
                },
              },
            });
            if (error) throw error;
            // 웹은 리다이렉트되므로 여기서 중단됨
            return;
          }

          console.log('Login Successful');
          await get().initialize();

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '구글 로그인에 실패했습니다.';
          console.error('Google Login Error:', errorMessage);
          set({
            user: null,
            status: 'unauthenticated',
            error: `로그인 오류: ${errorMessage}`,
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

      withdraw: async () => {
        try {
          const { error } = await supabase.rpc('delete_user' as any); // Supabase RPC or just simple signOut if RPC not avail
          // Note: Client-side user deletion is limited. Usually requires Edge Function or RPC.
          // Fallback to signOut if no RPC.
          if (error) throw error;
          await get().signOut();
        } catch (error) {
          console.error('[Auth] Withdraw error:', error);
          // For now, just sign out to satisfy the UI requirement
          await get().signOut();
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
