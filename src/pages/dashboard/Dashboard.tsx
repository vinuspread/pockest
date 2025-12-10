import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, usePockets, useItems } from '@/hooks';
import { usePocketStore } from '@/store/usePocketStore';
import { Header, Sidebar } from '@/components/layout';
import { Card, CardContent, Button, Input } from '@/components/ui';
import { Star, Trash2, ExternalLink, Mail, Lock } from 'lucide-react';
import { cn, formatPrice, formatRelativeTime } from '@/utils';

type ViewType = 'all' | 'today' | 'pinned' | 'trash';

export default function Dashboard() {
  console.log('[Dashboard] 🚀 Component mounting...');

  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, signIn, signUp, error, clearError } = useAuth();
  const { pockets, selectedPocketId, select: selectPocket } = usePockets();
  const { items, loading: itemsLoading, togglePin, trash, search, fetchToday, refresh, showPinnedOnly } = useItems();
  
  const [currentView, setCurrentView] = useState<ViewType>('all');

  // 디버깅용 로그
  console.log('[Dashboard] 📊 Render state:', { 
    isAuthenticated,
    authLoading,
    user: user?.email,
    currentView, 
    itemsLoading, 
    itemsCount: items?.length,
    pocketsCount: pockets?.length,
    isItemsArray: Array.isArray(items),
    hasItems: items && items.length > 0
  });

  // 인증 완료 시 초기 데이터 로드
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[Dashboard] ⚠️ Not authenticated, skipping initial data load');
      return;
    }

    console.log('[Dashboard] 🔄 Authenticated! Loading initial data...');
    const loadInitialData = async () => {
      try {
        await Promise.all([
          usePocketStore.getState().fetchPockets(),
          refresh()
        ]);
        console.log('[Dashboard] 🎉 Initial data loaded');
      } catch (err) {
        console.error('[Dashboard] ❌ Error loading initial data:', err);
      }
    };

    loadInitialData();
  }, [isAuthenticated, refresh]);

  // 뷰 변경 시 데이터 갱신
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('[Dashboard] View changed:', currentView);
    
    // 비동기 함수 호출 시 에러 핸들링
    const fetchData = async () => {
      try {
        if (currentView === 'today') {
          await fetchToday();
        } else if (currentView === 'pinned') {
          showPinnedOnly(true);
        } else if (currentView === 'all') {
          showPinnedOnly(false); // 핀 필터 해제
          await refresh();
        } else if (currentView === 'trash') {
          // TODO: 휴지통 보기 기능 구현 필요 (현재는 일반 목록과 동일하게 동작할 수 있음)
          console.warn('Trash view implementation pending');
          // 임시로 전체 목록 보여주기
          await refresh();
        }
      } catch (err) {
        console.error('[Dashboard] Error fetching data for view:', currentView, err);
      }
    };

    fetchData();
  }, [currentView, isAuthenticated, fetchToday, refresh, showPinnedOnly]);
  
  // 로그인 폼 상태
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 로그인/회원가입 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    clearError();

    try {
      if (isLoginMode) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인증 체크 - 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 미인증 상태 - 로그인 폼 표시
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="w-full max-w-md p-8">
          {/* 로고 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-3xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Pockest</h1>
            <p className="text-gray-500 mt-2">
              {isLoginMode ? t('auth.login_title') : t('auth.signup_title')}
            </p>
          </div>

          {/* 로그인/회원가입 폼 */}
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  label={t('auth.email_placeholder')}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
                
                <Input
                  type="password"
                  label={t('auth.password_placeholder')}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  {isLoginMode ? t('auth.login_btn') : t('auth.signup_btn')}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    clearError();
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {isLoginMode ? t('auth.signup_link') : t('auth.login_link')}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 인증된 상태 - 대시보드 표시
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onSearch={search} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          pockets={pockets}
          selectedPocketId={selectedPocketId}
          onSelectPocket={selectPocket}
          onCreatePocket={() => {/* TODO: 폴더 생성 모달 */}}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* 페이지 헤더 */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentView === 'all' && t('dashboard.all_items')}
                  {currentView === 'today' && t('dashboard.today_saved')}
                  {currentView === 'pinned' && t('dashboard.favorites')}
                  {currentView === 'trash' && t('dashboard.trash')}
                </h1>
                <p className="text-gray-500 mt-1">
                  {t('dashboard.total_items', { count: items?.length || 0 })}
                </p>
              </div>
              {user && (
                <p className="text-sm text-gray-500">{user.email}</p>
              )}
            </div>

            {/* 상품 그리드 */}
            {itemsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : !items || items.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500">{t('dashboard.no_items')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(items || []).map((item) => (
                  <Card key={item.id} className="group overflow-hidden">
                    {/* 이미지 */}
                    <div className="relative aspect-square bg-gray-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          No Image
                        </div>
                      )}
                      
                      {/* 오버레이 액션 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => togglePin(item.id)}
                          className="p-2 bg-white rounded-full shadow-md"
                        >
                          <Star className={cn(
                            'w-4 h-4',
                            item.is_pinned ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                          )} />
                        </button>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{item.site_name}</p>
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
                        {item.title}
                      </h3>
                      {item.price && (
                        <p className="font-bold text-primary-600">
                          {formatPrice(item.price, item.currency || 'KRW')}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {formatRelativeTime(item.created_at)}
                      </p>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{t('dashboard.visit')}</span>
                        </a>
                        <button
                          onClick={() => trash(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
