import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { onAuthStateChange } from '@/services/supabase/client';

/**
 * 인증 관련 커스텀 훅
 * Email/Password 인증만 지원
 */
export function useAuth() {
  const {
    user,
    status,
    error,
    initialize,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearError,
  } = useAuthStore();

  // 초기화 및 인증 상태 리스너 설정
  useEffect(() => {
    initialize();

    const { data: subscription } = onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.setState({
          user: null,
          status: 'unauthenticated',
        });
      } else if (event === 'SIGNED_IN') {
        // 세션이 변경되면 다시 초기화
        initialize();
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [initialize]);

  return {
    // State
    user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    error,

    // Derived
    isPremium: user?.tier === 'premium',

    // Actions (Email/Password only)
    signIn: signInWithEmail,
    signUp: signUpWithEmail,
    signOut,
    clearError,
  };
}
