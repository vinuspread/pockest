import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import { useTranslation } from 'react-i18next';
import { useAuth, usePockets, useItems } from '@/hooks';
import { usePocketStore } from '@/store/usePocketStore';
import { Header, Sidebar } from '@/components/layout';
import { Card, CardContent, Button, Input } from '@/components/ui';
import { Share2, Lock, Smartphone, CheckCircle, Star, Trash2, Mail } from 'lucide-react';

import { ShareModal } from '@/components/ShareModal';
import { ItemCard } from '@/components/ItemCard';
import { PocketCard } from '@/components/PocketCard';
import { CreatePocketModal } from '@/components/CreatePocketModal';

type ViewType = 'all' | 'today' | 'pinned' | 'trash' | 'folders';

export default function Dashboard() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCreatePocketModalOpen, setIsCreatePocketModalOpen] = useState(false);
  // console.log('[Dashboard] 🚀 Component mounting...');

  const { pocketId } = useParams<{ pocketId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, signIn, signUp, signInWithGoogle, error, clearError, initialize } = useAuth();
  const { pockets, selectedPocketId, select: selectPocket, remove: deletePocket } = usePockets();
  const { items, loading: itemsLoading, togglePin, trash, restore, delete: permanentDelete, search } = useItems();

  // 초기 뷰 설정: pocketId가 없으면 'folders' (포켓 목록)를 기본값으로 사용
  const [currentView, setCurrentView] = useState<ViewType>(pocketId ? 'all' : 'folders');

  // 디버깅용 로그 - 제거
  // console.log('[Dashboard] 📊 Render state:', ...);

  // Dashboard 레이아웃 렌더링 시에만 html과 body 스크롤 방지 (로그인 화면에서는 스크롤 가능)
  useEffect(() => {
    if (isAuthenticated) {
      document.documentElement.classList.add('dashboard-page');
      document.body.classList.add('dashboard-page');

      // 🔒 대시보드 진입 시 전역 스크롤 잠금 다시 활성화
      const lockStyle = document.querySelector('style[data-viewport-lock="true"]');
      if (lockStyle) {
        lockStyle.removeAttribute('media'); // 스타일 복구
      }
    } else {
      document.documentElement.classList.remove('dashboard-page');
      document.body.classList.remove('dashboard-page');
    }

    return () => {
      document.documentElement.classList.remove('dashboard-page');
      document.body.classList.remove('dashboard-page');
    };
  }, [isAuthenticated]);

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
          else if (currentView === 'folders') {
            // 폴더 목록 뷰: 포켓 정보만 있으면 됨 (이미 loadPockets에서 로드됨)
            console.log('[Dashboard] 📂 Rendering folder list');
            selectPocket(null);
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
    };

    loadPockets();
  }, [currentView, pocketId, isAuthenticated, pockets.length, selectPocket]); // 의존성 배열 최소화

  // 🔥 [New] Window focus 시 자동 새로고침 (사이드바에서 추가한 상품 실시간 반영)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = async () => {
      console.log('[Dashboard] 🔄 Window focused, refreshing current view...');

      // 현재 보고 있는 뷰에 따라 새로고침
      if (pocketId && pockets.length > 0) {
        await usePocketStore.getState().fetchItemsByPocket(pocketId);
      } else if (currentView === 'pinned') {
        await usePocketStore.getState().fetchPinnedItems();
      } else if (currentView === 'today') {
        await usePocketStore.getState().fetchTodayItems();
      } else if (currentView === 'trash') {
        await usePocketStore.getState().fetchTrashItems();
      } else if (currentView === 'folders') {
        // 폴더 목록은 fetchPockets()로 처리됨
      } else {
        await usePocketStore.getState().fetchAllItems();
      }

      // 포켓 목록도 새로고침 (카운트 업데이트)
      await usePocketStore.getState().fetchPockets();

      // 주요메뉴 카운트도 새로고침
      await fetchCounts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, pocketId, currentView, pockets.length, user]); // fetchCounts는 handleFocus 내부에서 직접 호출

  // 주요메뉴 카운트 계산
  const [allItemsCount, setAllItemsCount] = useState(0);
  const [todayItemsCount, setTodayItemsCount] = useState(0);
  const [pinnedItemsCount, setPinnedItemsCount] = useState(0);
  const [trashItemsCount, setTrashItemsCount] = useState(0); // 🗑️ 휴지통 카운트 추가

  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      // 모든 상품 카운트
      const { count: allCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      // 오늘 담은 상품 카운트 (24시간)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      const { count: todayCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneDayAgo.toISOString())
        .is('deleted_at', null);

      // 즐겨찾기 카운트
      const { count: pinnedCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_pinned', true)
        .is('deleted_at', null);

      setAllItemsCount(allCount || 0);
      setTodayItemsCount(todayCount || 0);
      setPinnedItemsCount(pinnedCount || 0);

      // 🗑️ 휴지통 카운트 (deleted_at이 null이 아닌 것)
      const { count: trashCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      setTrashItemsCount(trashCount || 0);
    } catch (error) {
      console.error('[Dashboard] Failed to fetch counts:', error);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // 로그인 폼 상태
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 🍔 모바일 메뉴 상태
  // const [isShareModalOpen, setIsShareModalOpen] = useState(false); // 🔗 공유 모달 상태 - REMOVED DUPLICATE

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
    // 🔓 로그인 화면에서는 전역 스크롤 잠금 해제 (index.html의 스타일 무력화)
    const lockStyle = document.querySelector('style[data-viewport-lock="true"]');
    if (lockStyle) {
      lockStyle.setAttribute('media', 'max-width: 1px'); // 스타일 무력화
    }

    // 대시보드로 돌아갈 때를 대비해 정리 (useEffect로 처리하면 좋지만, 조건부 렌더링이라 여기서 처리)
    // 실제로는 Dashboard 컴포넌트가 언마운트되거나 재렌더링될 때 복구해야 함.
    // Dashboard.tsx의 useEffect에서 인증 시 다시 활성화하도록 수정 필요.

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 overflow-y-auto">
        <style>{`html, body { overflow: auto !important; position: static !important; }`}</style>
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
      setCurrentView('folders'); // 포켓 선택 해제 시 폴더 목록으로 이동
      navigate('/dashboard');
    }
    // 모바일 메뉴 닫기 (네비게이션 발생 시)
    setIsMobileMenuOpen(false);
  };

  // 뷰 변경 핸들러 (URL 변경)
  const handleViewChange = (view: ViewType) => {
    console.log('[Dashboard] 🎯 handleViewChange called:', view);
    // URL에서 pocketId 제거 (뷰 전환 시)
    navigate('/dashboard');
    setCurrentView(view);
    // 모바일 메뉴 닫기
    setIsMobileMenuOpen(false);
  };

  // 포켓 삭제 핸들러
  const handleDeletePocket = async (id: string) => {
    await deletePocket(id);
    // 삭제 후 전체 보기로 이동 (현재 보고 있던 포켓일 수 있으므로)
    if (pocketId === id) {
      navigate('/dashboard');
      navigate('/dashboard');
      setCurrentView('folders');
    }
  };

  // Monetization Gate 핸들러
  const handleAgreeAffiliate = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ affiliate_agreed: true })
        .eq('id', user.id);

      if (error) throw error;

      // 프로필 정보 갱신
      await initialize();
    } catch (err) {
      console.error('Failed to update agreement:', err);
      alert('처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 인증된 상태 - 대시보드 표시
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Monetization Gate Modal */}
      {isAuthenticated && user && user.affiliate_agreed === false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden ring-1 ring-white/20">
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Pockest 무료 이용 안내</h2>
              <p className="text-primary-100 text-sm">
                서비스 유지를 위해 제휴 수익 활동에 동의해주세요.
              </p>
            </div>

            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">모든 기능이 100% 무료</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      위시리스트, 가격 추적, 폴더 관리 등 Pockest의 모든 프리미엄 기능을 평생 무료로 제공합니다.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">가격은 그대로</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      제휴 링크를 통해 구매하더라도 상품 가격은 동일하며, 추가 비용은 절대 발생하지 않습니다.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 text-center leading-relaxed">
                  Pockest는 쿠팡 파트너스 등 제휴 마케팅 활동을 통해 일정액의 수수료를 제공받을 수 있습니다. 이에 동의하시면 아래 버튼을 눌러주세요.
                </div>

                <Button
                  onClick={handleAgreeAffiliate}
                  className="w-full h-12 text-lg font-bold bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all"
                >
                  동의하고 계속하기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Header onSearch={search} onMenuClick={() => setIsMobileMenuOpen(true)} />

      {/* 📱 Mobile Sidebar Overlay (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-[80%] max-w-[300px] h-full bg-white shadow-2xl animate-in slide-in-from-left duration-300">
            <Sidebar
              pockets={pockets}
              selectedPocketId={selectedPocketId}
              onSelectPocket={handleSelectPocket}
              onCreatePocket={() => setIsCreatePocketModalOpen(true)}
              currentView={pocketId ? 'pocket' : currentView}
              onViewChange={handleViewChange}
              allItemsCount={allItemsCount}
              todayItemsCount={todayItemsCount}
              pinnedItemsCount={pinnedItemsCount}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* 🖥️ Desktop Sidebar (Hidden on Mobile) */}
        <div className="hidden md:flex h-full border-r border-gray-100 bg-white">
          <Sidebar
            pockets={pockets}
            selectedPocketId={selectedPocketId}
            onSelectPocket={handleSelectPocket}
            onCreatePocket={() => setIsCreatePocketModalOpen(true)}
            currentView={pocketId ? 'pocket' : currentView}
            onViewChange={handleViewChange}
            allItemsCount={allItemsCount}
            todayItemsCount={todayItemsCount}
            pinnedItemsCount={pinnedItemsCount}
            trashItemsCount={trashItemsCount} // 🗑️ prop 전달
          />
        </div>

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
                      {currentView === 'folders' && '내 포켓'}
                    </>
                  )}
                </h1>
                <p className="text-gray-500 mt-1">
                  {currentView === 'folders'
                    ? `${pockets.length}개의 포켓`
                    : t('dashboard.total_items', { count: items?.length || 0 })
                  }
                </p>
              </div>
              <div className="flex items-center gap-4">
                {user && (
                  <p className="text-sm text-gray-500">{user.email}</p>
                )}

                {/* 🔗 포켓 공유 버튼 (모든 뷰에서 표시) */}
                <Button
                  variant="secondary"
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 border-gray-200 bg-white"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <Share2 className="w-4 h-4" />
                  <span>포켓 공유</span>
                </Button>

                {/* 🔥 폴더 삭제 버튼 (대시보드 헤더) */}
                {pocketId && pockets.find(p => p.id === pocketId && !p.is_default) && (
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 bg-white"
                    onClick={() => {
                      const currentPocket = pockets.find(p => p.id === pocketId);
                      if (!currentPocket) return;

                      const itemCount = currentPocket.item_count || 0;
                      if (itemCount > 0) {
                        if (confirm(`'${currentPocket.name}' 폴더를 삭제하시겠습니까?\n포함된 ${itemCount}개의 상품도 휴지통으로 이동합니다.`)) {
                          handleDeletePocket(pocketId);
                        }
                      } else {
                        if (confirm(`'${currentPocket.name}' 폴더를 삭제하시겠습니까?`)) {
                          handleDeletePocket(pocketId);
                        }
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>폴더 삭제</span>
                  </Button>
                )}
              </div>
            </div>



            {/* 뷰 렌더링: 폴더 목록 vs 상품 그리드 */}
            {currentView === 'folders' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* 포켓 만들기 버튼 카드 */}
                <button
                  onClick={() => setIsCreatePocketModalOpen(true)}
                  className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-primary-500 hover:border-primary-200 hover:bg-primary-50/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center transition-colors">
                    <span className="text-2xl font-light">+</span>
                  </div>
                  <span className="font-medium">포켓 만들기</span>
                </button>

                {pockets.map((pocket) => (
                  <PocketCard
                    key={pocket.id}
                    pocket={pocket}
                    onClick={() => handleSelectPocket(pocket.id)}
                    className="aspect-[4/3]"
                  />
                ))}
              </div>
            ) : itemsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : !items || items.length === 0 ? (
              // 🧪 데이터가 없을 때 데모 데이터 표시 (Smart Onboarding)
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-primary-500 fill-primary-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">아직 저장된 상품이 없네요!</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Pockest가 어떻게 보이는지 미리 확인해보세요.<br />
                    쇼핑몰에서 마음에 드는 상품을 저장하면 이렇게 정리됩니다.
                  </p>

                  {/* 데모 그리드 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 opacity-70 pointer-events-none select-none relative">
                    {/* 데모 오버레이 - 클릭 유도 */}
                    <div className="absolute inset-0 z-10"></div>

                    {/* 데모 아이템 1: 캠핑 */}
                    <Card className="overflow-hidden border-dashed border-2 border-primary-200 bg-white">
                      <div className="aspect-square bg-gray-100 relative">
                        <img src="https://loremflickr.com/400/400/camping,tent" alt="Demo" className="w-full h-full object-cover" />
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-primary-600 font-bold mb-1">Camping World</p>
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">초경량 2인용 백패킹 텐트 방수 3000mm</h3>
                        <p className="font-bold text-gray-900">249,000원</p>
                      </CardContent>
                    </Card>

                    {/* 데모 아이템 2: 데스크테리어 */}
                    <Card className="overflow-hidden border-dashed border-2 border-primary-200 bg-white">
                      <div className="aspect-square bg-gray-100 relative">
                        <img src="https://loremflickr.com/400/400/desk,computer" alt="Demo" className="w-full h-full object-cover" />
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-primary-600 font-bold mb-1">Desk Setup</p>
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">원목 모니터 받침대 듀얼 모니터용</h3>
                        <p className="font-bold text-gray-900">45,000원</p>
                      </CardContent>
                    </Card>

                    {/* 데모 아이템 3: 웨딩/인테리어 */}
                    <Card className="overflow-hidden border-dashed border-2 border-primary-200 bg-white">
                      <div className="aspect-square bg-gray-100 relative">
                        <img src="https://loremflickr.com/400/400/furniture,interior" alt="Demo" className="w-full h-full object-cover" />
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-primary-600 font-bold mb-1">Maison</p>
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">모던 세라믹 식탁 조명 펜던트</h3>
                        <p className="font-bold text-gray-900">128,000원</p>
                      </CardContent>
                    </Card>

                    {/* 데모 아이템 4: 패션 */}
                    <Card className="overflow-hidden border-dashed border-2 border-primary-200 bg-white">
                      <div className="aspect-square bg-gray-100 relative">
                        <img src="https://loremflickr.com/400/400/fashion,bag" alt="Demo" className="w-full h-full object-cover" />
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-primary-600 font-bold mb-1">Luxury Brand</p>
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">클래식 사첼백 브라운 가죽</h3>
                        <p className="font-bold text-gray-900">350,000원</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-8">
                    <p className="text-sm text-primary-600 font-medium bg-primary-50 inline-block px-4 py-2 rounded-full">
                      ✨ 이제 당신만의 위시리스트를 채워보세요!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // 📱 Item Grid (Premium Design)
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
                {(items || []).map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isTrashView={currentView === 'trash'}
                    onRestore={(id: string) => {
                      if (confirm('이 상품을 복구하시겠습니까?')) restore(id);
                    }}
                    onPermanentDelete={(id: string) => {
                      if (confirm('⚠️ 이 상품을 영구 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.')) permanentDelete(id);
                    }}
                    onTogglePin={togglePin}
                    onMoveToTrash={(id: string) => {
                      if (confirm('이 상품을 휴지통으로 이동하시겠습니까?')) trash(id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 공유 모달 */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        pocketName={
          pocketId
            ? pockets.find(p => p.id === pocketId)?.name || 'My Items'
            : currentView === 'today' ? '오늘 저장한 항목'
              : currentView === 'pinned' ? '즐겨찾기'
                : 'My Pockest'
        }
        items={items || []}
        totalPrice={(items || []).reduce((sum, item) => sum + (item.price || 0), 0)}
        userName={user?.email || undefined}
        shareUrl={`${import.meta.env.VITE_APP_URL || window.location.origin}/dashboard/${pocketId || ''}`}
      />

      {/* 포켓 생성 모달 */}
      <CreatePocketModal
        isOpen={isCreatePocketModalOpen}
        onClose={() => setIsCreatePocketModalOpen(false)}
      />
    </div>
  );
}
