import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import { useTranslation } from 'react-i18next';
import { useAuth, usePockets } from '@/hooks';
import { usePocketStore } from '@/store/usePocketStore';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import { useItemStore } from '@/store/useItemStore';
import { Header, Sidebar, PocketNavBar } from '@/components/layout';
import { Card, CardContent, Button, useToast, Toast } from '@/components/ui';
import { Share2, Smartphone, CheckCircle, Trash2, Edit3 } from 'lucide-react';

import { ShareModal } from '@/components/ShareModal';
import { CreatePocketModal } from '@/components/CreatePocketModal';
import { EditPocketModal } from '@/components/EditPocketModal';
import { AuthForms } from '@/components/auth/AuthForms';
import { CompleteProfileModal } from '@/components/auth/CompleteProfileModal';
import { FolderGrid } from '@/components/dashboard/FolderGrid';
import { ItemGrid } from '@/components/dashboard/ItemGrid';
import { EmptyState } from '@/components/dashboard/EmptyState';



type ViewType = 'all' | 'today' | 'pinned' | 'trash' | 'folders';

export default function Dashboard() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCreatePocketModalOpen, setIsCreatePocketModalOpen] = useState(false);
  const [isEditPocketModalOpen, setIsEditPocketModalOpen] = useState(false);
  const [editingPocketId, setEditingPocketId] = useState<string | null>(null);
  const [isCompleteProfileModalOpen, setIsCompleteProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Prevent flicker
  // console.log('[Dashboard] 🚀 Component mounting...');

  const { pocketId } = useParams<{ pocketId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, signOut, initialize } = useAuth();
  const {
    pockets,
    select: selectPocket,
    selectedPocketId,
    remove: deletePocket,
    togglePublic
  } = usePockets();
  const { items, itemsLoading, itemsError, searchItems: search, updateItem } = useItemStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  // ... (existing helper hooks for dnd sensors)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // ... (drag handlers: handleDragStart, handleDragEnd)
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const itemId = active.id as string;
    const targetPocketId = over.id as string;

    // 아이템을 포켓으로 이동
    if (active.data.current?.type === 'item' && over.data.current?.type === 'pocket') {
      const item = items.find(i => i.id === itemId);
      if (item && item.pocket_id === targetPocketId) return;

      try {
        await updateItem(itemId, { pocket_id: targetPocketId });
        usePocketStore.getState().fetchPockets();
        showToast("아이템이 이동되었습니다.", "success");
        if (selectedPocketId) {
          useItemStore.setState(state => ({
            items: state.items.filter(i => i.id !== itemId)
          }));
        }
      } catch (error) {
        showToast("이동 실패", "error");
      }
    }
  };


  // 초기 뷰 설정: 기본값을 'all'로 변경하여 모든 상품을 먼저 보여줌
  const [currentView, setCurrentView] = useState<ViewType>('all');

  // useToast 훅 사용
  const { toast, showToast, hideToast } = useToast();

  // Ref to track if we've already initialized the menu state
  const hasInitializedMenu = useRef(false);

  // 로그인 감지 및 프로필 정보 확인
  useEffect(() => {
    if (isAuthenticated) {
      document.documentElement.classList.add('dashboard-page');
      document.body.classList.add('dashboard-page');

      // Force close mobile menu ONLY ONCE on mount/auth
      if (!hasInitializedMenu.current) {
        setTimeout(() => setIsMobileMenuOpen(false), 0);
        hasInitializedMenu.current = true;
      }

      // 🔒 대시보드 진입 시 전역 스크롤 잠금 다시 활성화
      const lockStyle = document.querySelector('style[data-viewport-lock="true"]');
      if (lockStyle) {
        lockStyle.removeAttribute('media');
      }

      // 프로필 정보(성별/연령) 확인 및 모달 표시
      if (user && (!user.gender || !user.age_group)) {
        setIsCompleteProfileModalOpen(true);
      } else {
        setIsCompleteProfileModalOpen(false);
      }
    } else {
      document.documentElement.classList.remove('dashboard-page');
      document.body.classList.remove('dashboard-page');

      // Reset menu state and initialization ref when user logs out
      // This ensures the logic runs again on next login
      hasInitializedMenu.current = false;
      setIsMobileMenuOpen(false);
    }

    return () => {
      document.documentElement.classList.remove('dashboard-page');
      document.body.classList.remove('dashboard-page');
    };
  }, [isAuthenticated, user]);

  // 인증 완료 시 초기 포켓 목록 로드 (한 번만)
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadPockets = async () => {
      try {
        await usePocketStore.getState().fetchPockets();
      } catch (err) {
        console.error('[Dashboard] ❌ Error loading pockets:', err);
        return;
      }
      if (pockets.length === 0 && pocketId) return;

      const loadViewData = async () => {
        try {
          if (pocketId && pockets.length > 0) {
            selectPocket(pocketId);
            await useItemStore.getState().fetchItemsByPocket(pocketId);
          } else if (currentView === 'pinned') {
            selectPocket(null);
            await useItemStore.getState().fetchPinnedItems();
          } else if (currentView === 'today') {
            selectPocket(null);
            await useItemStore.getState().fetchTodayItems();
          } else if (currentView === 'trash') {
            selectPocket(null);
            await useItemStore.getState().fetchTrashItems();
          } else if (currentView === 'folders') {
            selectPocket(null);
          } else {
            selectPocket(null);
            await useItemStore.getState().fetchAllItems();
          }
        } catch (err) {
          console.error('[Dashboard] ❌ Error loading view data:', err);
        } finally {
          setIsInitialLoad(false);
        }
      };
      loadViewData();
    };
    loadPockets();
  }, [currentView, pocketId, isAuthenticated, pockets.length, selectPocket]);

  // 🔥 [New] Window focus 시 자동 새로고침 (사이드바에서 추가한 상품 실시간 반영)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = async () => {
      if (pocketId && pockets.length > 0) {
        await useItemStore.getState().fetchItemsByPocket(pocketId);
      } else if (currentView === 'pinned') {
        await useItemStore.getState().fetchPinnedItems();
      } else if (currentView === 'today') {
        await useItemStore.getState().fetchTodayItems();
      } else if (currentView === 'trash') {
        await useItemStore.getState().fetchTrashItems();
      } else if (currentView === 'folders') {
        // Folders view
      } else {
        await useItemStore.getState().fetchAllItems();
      }
      await usePocketStore.getState().fetchPockets();
      await fetchCounts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, pocketId, currentView, pockets.length, user]);

  // 주요메뉴 카운트 계산
  const [allItemsCount, setAllItemsCount] = useState(0);
  const [todayItemsCount, setTodayItemsCount] = useState(0);
  const [pinnedItemsCount, setPinnedItemsCount] = useState(0);
  const [trashItemsCount, setTrashItemsCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const { count: allCount } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null);
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      const { count: todayCount } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', oneDayAgo.toISOString()).is('deleted_at', null);
      const { count: pinnedCount } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_pinned', true).is('deleted_at', null);
      setAllItemsCount(allCount || 0);
      setTodayItemsCount(todayCount || 0);
      setPinnedItemsCount(pinnedCount || 0);
      const { count: trashCount } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('deleted_at', 'is', null);
      setTrashItemsCount(trashCount || 0);
    } catch (error) {
      console.error('[Dashboard] Failed to fetch counts:', error);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);



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
    const lockStyle = document.querySelector('style[data-viewport-lock="true"]');
    if (lockStyle) {
      lockStyle.setAttribute('media', 'max-width: 1px');
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 overflow-y-auto">
        <style>{`html, body { overflow: auto !important; position: static !important; }`}</style>
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img src="/logo.svg" alt="Pockest" className="w-[160px] h-auto object-contain" />
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <AuthForms />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 포켓 선택 핸들러 (URL 변경)
  const handleSelectPocket = (pocketId: string | null) => {
    if (pocketId) {
      if (currentView !== 'all') setCurrentView('all');
      navigate(`/dashboard/${pocketId}`);
    } else {
      setCurrentView('folders');
      navigate('/dashboard');
    }
    setIsMobileMenuOpen(false);
  };

  // 뷰 변경 핸들러 (URL 변경)
  const handleViewChange = (view: ViewType) => {
    navigate('/dashboard');
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  // 포켓 삭제 핸들러
  const handleDeletePocket = async (id: string): Promise<boolean> => {
    const success = await deletePocket(id);
    if (success && pocketId === id) {
      navigate('/dashboard');
      setCurrentView('folders');
    }
    return success;
  };

  const handleEditPocket = (id: string) => {
    setEditingPocketId(id);
    setIsEditPocketModalOpen(true);
  };

  // Monetization Gate 핸들러
  const handleAgreeAffiliate = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles').update({ affiliate_agreed: true }).eq('id', user.id);
      if (error) throw error;
      await initialize();
    } catch (err) {
      console.error('Failed to update agreement:', err);
      alert('처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Profile Completion Modal */}
        <CompleteProfileModal
          isOpen={isCompleteProfileModalOpen}
          onClose={() => setIsCompleteProfileModalOpen(false)}
        />

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

        <Header
          onSearch={search}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          onLogoClick={() => handleViewChange('all')}
          onLogout={signOut}
          onCreatePocket={() => setIsCreatePocketModalOpen(true)}
          user={user as any}
        />

        <PocketNavBar
          pockets={pockets}
          selectedPocketId={selectedPocketId}
          onSelectPocket={handleSelectPocket}
        />

        {/* 📱 Mobile & Desktop Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-[80%] max-w-[300px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300">
              <Sidebar
                currentView={pocketId ? 'pocket' : currentView}
                onViewChange={handleViewChange}
                allItemsCount={allItemsCount}
                todayItemsCount={todayItemsCount}
                pinnedItemsCount={pinnedItemsCount}
                trashItemsCount={trashItemsCount}
                pockets={pockets}
                selectedPocketId={selectedPocketId}
                onSelectPocket={handleSelectPocket}
                onClose={() => setIsMobileMenuOpen(false)}
                onCreatePocket={() => setIsCreatePocketModalOpen(true)}
                onEditPocket={handleEditPocket}
                onDeletePocket={(id, name) => {
                  if (confirm(`'${name}' 포켓을 삭제하시겠습니까?`)) {
                    handleDeletePocket(id);
                  }
                }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {pocketId ? (
                      pockets.find(p => p.id === pocketId)?.name || t('dashboard.all_items')
                    ) : (
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
                  <Button
                    variant="secondary"
                    className="flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium text-gray-600 bg-gray-50 border-0 hover:bg-gray-100 hover:text-gray-900 transition-all"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>포켓 공유</span>
                  </Button>

                  {pocketId && pockets.find(p => p.id === pocketId && !p.is_default) && (
                    <Button
                      variant="secondary"
                      className="flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium text-gray-600 bg-gray-50 border-0 hover:bg-gray-100 hover:text-gray-900 transition-all"
                      onClick={() => {
                        if (pocketId) setEditingPocketId(pocketId);
                        setIsEditPocketModalOpen(true);
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>수정</span>
                    </Button>
                  )}

                  {pocketId && pockets.find(p => p.id === pocketId && !p.is_default) && (
                    <Button
                      variant="secondary"
                      className="flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium text-red-500 bg-red-50/50 border-0 hover:bg-red-100 hover:text-red-700 transition-all"
                      onClick={async () => {
                        const currentPocket = pockets.find(p => p.id === pocketId);
                        if (!currentPocket) return;
                        const itemCount = currentPocket.item_count || 0;
                        const message = itemCount > 0
                          ? `'${currentPocket.name}' 포켓을 삭제하시겠습니까?\n포함된 ${itemCount}개의 상품도 휴지통으로 이동합니다.`
                          : `'${currentPocket.name}' 포켓을 삭제하시겠습니까?`;

                        if (confirm(message)) {
                          const success = await handleDeletePocket(pocketId);
                          if (!success) {
                            showToast("삭제에 실패했습니다. (서버/권한 오류)", "error");
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>삭제</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className="h-full">
                {itemsError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-red-500 gap-4">
                    <p>데이터를 불러오는데 실패했습니다.</p>
                    <p className="text-sm bg-red-50 px-4 py-2 rounded font-mono">{itemsError}</p>
                    <Button onClick={() => window.location.reload()} variant="primary">새로고침</Button>
                  </div>
                ) : currentView === 'folders' ? (
                  <FolderGrid
                    pockets={pockets}
                    onSelectPocket={handleSelectPocket}
                    onCreatePocket={() => setIsCreatePocketModalOpen(true)}
                  />
                ) : itemsLoading || isInitialLoad ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
                  </div>
                ) : !items || items.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ItemGrid items={items} currentView={currentView} />
                )}
              </div>
            </div>
          </main>
        </div>

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
          shareUrl={`${import.meta.env.VITE_APP_URL || window.location.origin}/#/share/${pocketId || ''}`}
          pocketId={pocketId || undefined}
          isPublic={pocketId ? pockets.find(p => p.id === pocketId)?.is_public : false}
          onTogglePublic={pocketId ? (val) => togglePublic(pocketId, val) : undefined}
        />

        <CreatePocketModal
          isOpen={isCreatePocketModalOpen}
          onClose={() => setIsCreatePocketModalOpen(false)}
        />

        {(pocketId || editingPocketId) && (
          <EditPocketModal
            isOpen={isEditPocketModalOpen}
            onClose={() => {
              setIsEditPocketModalOpen(false);
              setEditingPocketId(null);
            }}
            pocketId={editingPocketId || pocketId || ''}
            initialName={pockets.find(p => p.id === (editingPocketId || pocketId))?.name || ''}
          />
        )}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="w-32 h-32 bg-white/90 backdrop-blur rounded-xl shadow-2xl border-2 border-primary-500/50 flex items-center justify-center">
            <span className="text-2xl">📦</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
