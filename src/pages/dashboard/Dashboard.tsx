import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, usePockets, useItems } from '@/hooks';
import { usePocketStore } from '@/store/usePocketStore';
import { Header, Sidebar } from '@/components/layout';
import { Card, CardContent, Button, Input, Tooltip } from '@/components/ui';
import { Star, Trash2, ExternalLink, Mail, Lock } from 'lucide-react';
import { cn, formatPrice, formatRelativeTime } from '@/utils';

type ViewType = 'all' | 'today' | 'pinned' | 'trash';

export default function Dashboard() {
  console.log('[Dashboard] 🚀 Component mounting...');

  const { pocketId } = useParams<{ pocketId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, signIn, signUp, signInWithGoogle, error, clearError } = useAuth();
  const { pockets, selectedPocketId, select: selectPocket } = usePockets();
  const { items, loading: itemsLoading, togglePin, trash, restore, delete: permanentDelete, search, fetchToday, refresh, showPinnedOnly } = useItems();
  
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

  // 인증 완료 시 초기 포켓 목록 로드 (한 번만)
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[Dashboard] ⚠️ Not authenticated, skipping initial data load');
      return;
    }

    console.log('[Dashboard] 🔄 Authenticated! Loading pockets...');
    const loadPockets = async () => {
      try {
        await usePocketStore.getState().fetchPockets();
        console.log('[Dashboard] 🎉 Pockets loaded');
      } catch (err) {
        console.error('[Dashboard] ❌ Error loading pockets:', err);
      }
    };

    loadPockets();
  }, [isAuthenticated]); // ✅ 의존성 최소화

  // 통합된 뷰/포켓 로직 - "초기화 후 재요청" 패턴 (상태 오염 방지)
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[Dashboard] ⚠️ Not authenticated, skipping data load');
      return;
    }

    // ✅ pockets가 로드되지 않았으면 대기
    if (pockets.length === 0 && pocketId) {
      console.log('[Dashboard] ⏳ Waiting for pockets to load...');
      return;
    }

    const loadViewData = async () => {
      try {
        // ✅ 1단계: 뷰 변경 시 먼저 스토어 상태 리셋 (필터 꼬임 방지)
        console.log('[Dashboard] 🔄 Resetting items state before loading new view');
        usePocketStore.getState().resetItemsState();
        
        // ✅ 2단계: 목적별 독립 함수 호출 (Silo Pattern)
        // 🚨 각 함수는 완전히 독립적이며 다른 필터를 절대 참조하지 않음
        
        // 🔥 우선순위 1: pocketId가 있으면 무조건 포켓 조회 (다른 뷰 무시!)
        if (pocketId && pockets.length > 0) {
          console.log('[Dashboard] 📂 [PRIORITY] Calling fetchItemsByPocket():', pocketId);
          selectPocket(pocketId);
          await usePocketStore.getState().fetchItemsByPocket(pocketId);
        }
        // 우선순위 2: 특수 뷰들
        else if (currentView === 'pinned') {
          console.log('[Dashboard] ⭐ Calling fetchPinnedItems()');
          selectPocket(null);
          await usePocketStore.getState().fetchPinnedItems();
        } 
        else if (currentView === 'today') {
          console.log('[Dashboard] 📅 Calling fetchTodayItems()');
          selectPocket(null);
          await usePocketStore.getState().fetchTodayItems();
        } 
        else if (currentView === 'trash') {
          console.log('[Dashboard] 🗑️ Calling fetchTrashItems()');
          selectPocket(null);
          await usePocketStore.getState().fetchTrashItems();
        } 
        else {
          // 기본: 전체 보기
          console.log('[Dashboard] 🏠 Calling fetchAllItems()');
          selectPocket(null);
          await usePocketStore.getState().fetchAllItems();
        }
        
        console.log('[Dashboard] ✅ View data loaded successfully');
      } catch (err) {
        console.error('[Dashboard] ❌ Error loading view data:', err);
      }
    };

    loadViewData();
  }, [currentView, pocketId, isAuthenticated, pockets, selectPocket]); // 의존성 배열 최소화
  
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

              {/* 구분선 */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 text-gray-500 bg-white">또는</span>
                </div>
              </div>

              {/* 구글 로그인 버튼 */}
              <button
                type="button"
                onClick={signInWithGoogle}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
              >
                <img 
                  className="w-5 h-5 mr-2" 
                  src="https://www.svgrepo.com/show/475656/google-color.svg" 
                  alt="Google" 
                />
                Google 계정으로 계속하기
              </button>

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

  // 포켓 선택 핸들러 (URL 변경)
  const handleSelectPocket = (pocketId: string | null) => {
    console.log('[Dashboard] 🎯 handleSelectPocket called:', pocketId);
    if (pocketId) {
      // 포켓 선택 시 currentView를 'all'로 리셋 (우선순위 보장)
      setCurrentView('all');
      navigate(`/dashboard/${pocketId}`);
    } else {
      // 포켓 해제 시 전체 뷰로
      setCurrentView('all');
      navigate('/dashboard');
    }
  };

  // 뷰 변경 핸들러 (URL 변경)
  const handleViewChange = (view: ViewType) => {
    console.log('[Dashboard] 🎯 handleViewChange called:', view);
    // URL에서 pocketId 제거 (뷰 전환 시)
    navigate('/dashboard');
    setCurrentView(view);
  };

  // 인증된 상태 - 대시보드 표시
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onSearch={search} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          pockets={pockets}
          selectedPocketId={selectedPocketId}
          onSelectPocket={handleSelectPocket}
          onCreatePocket={() => {/* TODO: 폴더 생성 모달 */}}
          currentView={pocketId ? 'pocket' : currentView}
          onViewChange={handleViewChange}
        />

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* 페이지 헤더 - 포켓 이름 동기화 */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {pocketId ? (
                    // pocketId가 있으면 포켓 이름 표시
                    pockets.find(p => p.id === pocketId)?.name || t('dashboard.all_items')
                  ) : (
                    // pocketId가 없으면 뷰 타입에 따라 표시
                    <>
                      {currentView === 'all' && t('dashboard.all_items')}
                      {currentView === 'today' && t('dashboard.today_saved')}
                      {currentView === 'pinned' && t('dashboard.favorites')}
                      {currentView === 'trash' && t('dashboard.trash')}
                    </>
                  )}
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
                      
                      {/* 오버레이 액션 - 즐겨찾기 (휴지통에서는 숨김) */}
                      {currentView !== 'trash' && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-start justify-end p-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              togglePin(item.id);
                            }}
                            className={cn(
                              'p-2 bg-white rounded-full shadow-md transition-all',
                              item.is_pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            )}
                          >
                            <Star className={cn(
                              'w-4 h-4',
                              item.is_pinned ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                            )} />
                          </button>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{item.site_name}</p>
                      {/* 제품명 - 최대 3줄 말줄임 + 커스텀 툴팁 */}
                      <Tooltip text={item.title}>
                        <h3 
                          className="font-medium text-gray-900 text-sm line-clamp-3 mb-2"
                          style={{ wordBreak: 'keep-all' }}
                        >
                          {item.title}
                        </h3>
                      </Tooltip>
                      {item.price && (
                        <p className="font-bold text-primary-600">
                          {formatPrice(item.price, item.currency || 'KRW')}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {formatRelativeTime(item.created_at)}
                      </p>

                      {/* 액션 버튼 - 휴지통 뷰와 일반 뷰 분리 */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        {currentView === 'trash' ? (
                          // 🗑️ 휴지통 뷰: 복구 + 영구삭제 버튼
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm('이 상품을 복구하시겠습니까?')) {
                                  restore(item.id);
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <span>복구</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm('⚠️ 이 상품을 영구 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.')) {
                                  permanentDelete(item.id);
                                }
                              }}
                              className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              영구삭제
                            </button>
                          </>
                        ) : (
                          // 📂 일반 뷰: 방문 + 휴지통 이동 버튼
                          <>
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
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm('이 상품을 휴지통으로 이동하시겠습니까?')) {
                                  trash(item.id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
