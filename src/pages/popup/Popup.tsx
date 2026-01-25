import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag, X, Check,
  ChevronLeft, ChevronRight, Undo2, CheckCircle, Edit3
} from 'lucide-react';
import { useAuth, usePockets, useItems } from '@/hooks';
import { useAuthStore } from '@/store/useAuthStore';
import { usePocketStore } from '@/store/usePocketStore';
import { useItemStore } from '@/store/useItemStore';
// import { supabase } from '@/services/supabase/client';
import { Toast, useToast } from '@/components/ui';
import { cn, formatPrice, openDashboard } from '@/utils';
import type { ProductData } from '@/utils/parser';
import { processImage, uploadThumbnail } from '@/utils/imageOptimizer';
import { AuthForms } from '@/components/auth/AuthForms';
import { logger } from '@/utils/logger';
import { detectSiteType } from '@/utils/siteDetector';
import { recordUnregisteredSite } from '@/services/supabase/unregisteredSites';

type ScrapeStatus = 'idle' | 'scraping' | 'saving' | 'success' | 'error' | 'unsupported'; // Added 'unsupported'
type TabType = 'pocket' | 'today';

const SUPPORTED_MALLS = [
  { category: 'Global', names: ['Amazon', 'AliExpress', 'eBay', 'Walmart', 'Costco', 'Temu'] },
  { category: 'Korea', names: ['네이버쇼핑', '쿠팡', 'G마켓', '11번가', 'SSG', '무신사', '29CM'] },
  { category: 'Others', names: ['Rakuten', 'Taobao', 'ZARA', 'IKEA', 'H&M', 'Nike'] }
];

const PocketThumbnail = ({ images = [] }: { images?: string[] }) => {
  const displayImages = images.slice(0, 4);
  const count = displayImages.length;

  if (count === 0) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-200">
        <img
          src="/icon_thumbnail_default.png"
          alt="Default"
          className="w-10 h-10 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/icon_folder_default.svg";
          }}
        />
      </div>
    );
  }

  if (count === 1) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
        <img src={displayImages[0]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden flex border border-gray-200">
        <div className="w-1/2 h-full">
          <img src={displayImages[0]} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="w-1/2 h-full">
          <img src={displayImages[1]} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden flex border border-gray-200">
        <div className="w-1/2 h-full">
          <img src={displayImages[0]} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="w-1/2 h-full flex flex-col">
          <div className="h-1/2 w-full">
            <img src={displayImages[1]} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="h-1/2 w-full">
            <img src={displayImages[2]} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    );
  }

  // 4 or more
  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden grid grid-cols-2 border border-gray-200">
      {displayImages.map((img, idx) => (
        <div key={idx} className="w-full h-full">
          <img src={img} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
};

export default function Popup() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { pockets, create: createPocket, refresh: refreshPockets } = usePockets();
  const { items, add: addItem, refresh: refreshItems, fetchToday } = useItems();
  const pocketsLoading = usePocketStore((state) => state.pocketsLoading);
  const { toast, showToast, hideToast } = useToast();

  const [productData, setProductData] = useState<ProductData | null>(null);
  const [status, setStatus] = useState<ScrapeStatus>('idle');
  const [scrapeError, setScrapeError] = useState<string>('');

  // 이미지 선택기 상태
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // 저장 완료 상태 (UX 개선)
  const [isSaved, setIsSaved] = useState(false);
  const [savedPocketName, setSavedPocketName] = useState('');

  // 상품명 편집 상태
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 가격 편집 상태
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState('');
  const priceInputRef = useRef<HTMLInputElement>(null);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('pocket');
  const [todayItems, setTodayItems] = useState<typeof items>([]);

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 새 포켓 생성 상태
  const [isCreatingPocket, setIsCreatingPocket] = useState(false);
  const [newPocketName, setNewPocketName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 지원 쇼핑몰 리스트 모달 상태
  const [showSupportedMalls, setShowSupportedMalls] = useState(false);

  // 로그인 폼 상태
  // const [isLoginMode, setIsLoginMode] = useState(true); // Moved to AuthForms
  // const [isSubmitting, setIsSubmitting] = useState(false); // Moved to AuthForms

  // 현재 탭 URL 추적
  const currentUrlRef = useRef<string>('');

  // ============================================================
  // Side Panel 환경 대응: 컴포넌트 마운트 시 Auth 세션 복구 (1회만)
  // ============================================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        logger.log('Initializing auth session...');
        await useAuthStore.getState().initialize();
        logger.log('Auth initialization complete');
      } catch (error) {
        logger.error('Init error:', error);
      }
    };

    initAuth();
  }, []);

  // Realtime Subscription
  useEffect(() => {
    if (isAuthenticated) {
      usePocketStore.getState().initializeSubscription();
    }
    return () => {
      usePocketStore.getState().unsubscribe();
    };
  }, [isAuthenticated]);

  // ============================================================
  // 로그인 상태 변화 감지 → 데이터 자동 로드 (핵심 수정!)
  // ============================================================
  useEffect(() => {
    if (!isAuthenticated) {
      logger.log('⚠️ Not authenticated, skipping data fetch');
      return;
    }

    // 로그인 완료 시 데이터 자동 로드
    const loadData = async () => {
      try {
        logger.log('Authenticated! Loading pockets and today items...');

        await Promise.all([
          usePocketStore.getState().fetchPockets(),
          useItemStore.getState().fetchTodayItems()
        ]);

        logger.log('Data loaded successfully');
      } catch (error) {
        logger.error('Error loading data:', error);
      }
    };

    loadData();
  }, [isAuthenticated]); // isAuthenticated가 true로 바뀌면 자동 실행

  // ============================================================
  // Auto-refresh on Sidebar Focus/Visibility (Backup for Realtime)
  // ============================================================
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleRefresh = async () => {
      if (document.visibilityState === 'visible') {
        logger.log('Sidebar visible/focused, refreshing data...');
        await Promise.all([
          usePocketStore.getState().fetchPockets(),
          useItemStore.getState().fetchTodayItems()
        ]);
      }
    };

    window.addEventListener('visibilitychange', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('visibilitychange', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [isAuthenticated]);

  // ============================================================
  // 현재 탭에서 상품 정보 스크래핑
  // ============================================================
  const scrapeCurrentPage = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setScrapeError(t('error.not_extension'));
      setStatus('error');
      return;
    }

    setStatus('scraping');
    setScrapeError('');
    setIsSaved(false);
    setSelectedImageIndex(0);
    setIsEditingTitle(false);

    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

      if (!tab?.id || tab.id === chrome.tabs.TAB_ID_NONE) {
        setScrapeError(t('error.no_tab_info'));
        setStatus('error');
        return;
      }

      currentUrlRef.current = tab.url || '';

      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
        setScrapeError(t('error.restricted_page'));
        setStatus('error');
        return;
      }

      const sendMessageWithRetry = async (retries = 3, delay = 500) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await new Promise<any>((resolve) => {
              chrome.tabs.sendMessage(
                tab.id!,
                { type: 'SCRAPE_PRODUCT' },
                (response) => {
                  if (chrome.runtime.lastError) {
                    // Suppress 'Receiving end does not exist' noise as it's common on non-injected pages
                    const msg = chrome.runtime.lastError.message;
                    if (!msg?.includes('Receiving end does not exist')) {
                      logger.warn(`Retry ${i + 1}/${retries}:`, msg);
                    }
                    resolve(null);
                  } else {
                    resolve(response);
                  }
                }
              );
            });

            if (response) {
              logger.log('[Popup] Scrape response received:', response.success);
              if (response.success && response.data) {
                logger.log('[Popup] Setting product data:', {
                  title: response.data.title,
                  imageUrl: response.data.imageUrl,
                  imageCount: response.data.imageUrls?.length
                });
                setProductData(response.data);
                setEditedTitle(response.data.title);
                setScrapeError('');
                setStatus('idle');
                return;
              } else {
                setScrapeError(response.error || t('error.product_not_found'));
                setStatus('error');
                return;
              }
            }

            // 재시도 전 대기
            if (i < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error) {
            logger.error(`Retry ${i + 1} failed:`, error);
          }
        }

        // 모든 재시도 실패 - 사이트 타입 분석
        try {
          const currentUrl = tab.url || '';
          const siteType = await detectSiteType(currentUrl, tab.id);
          const { user } = useAuthStore.getState();
          
          if (siteType === 'unregistered') {
            // 미등록 쇼핑몰 - Supabase에 기록 (에러 발생해도 무시)
            try {
              if (user?.id) {
                await recordUnregisteredSite(tab.url!, user.id);
              }
            } catch (recordError) {
              logger.warn('Failed to record unregistered site:', recordError);
            }
            setScrapeError(t('error.unregistered_mall'));
            setStatus('unsupported');
          } else if (siteType === 'general') {
            // 일반 사이트
            setScrapeError(t('error.not_shopping_site'));
            setStatus('unsupported');
          } else {
            // 등록된 쇼핑몰이지만 통신 실패
            setScrapeError(t('error.page_communication'));
            setStatus('error');
          }
        } catch (detectionError) {
          // 사이트 타입 감지 실패 시 기본 에러 메시지
          logger.warn('Site detection failed:', detectionError);
          setScrapeError(t('error.page_communication'));
          setStatus('error');
        }
      };

      await sendMessageWithRetry();
    } catch (error) {
      logger.warn('Scrape error:', error);
      setScrapeError(t('common.error'));
      setStatus('error');
    }
  }, [t]);

  // ============================================================
  // Chrome Tab Event Listeners (사이드 패널 동기화)
  // ============================================================
  useEffect(() => {
    if (!isAuthenticated || typeof chrome === 'undefined') return;

    scrapeCurrentPage();

    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      logger.log('Tab activated:', activeInfo.tabId);
      setTimeout(() => {
        scrapeCurrentPage();
      }, 100);
    };

    const handleTabUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (changeInfo.status === 'complete' && tab.active) {
        if (tab.url && tab.url !== currentUrlRef.current) {
          logger.log('Tab URL changed:', tab.url);
          currentUrlRef.current = tab.url;
          scrapeCurrentPage();
        }
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [isAuthenticated, scrapeCurrentPage]);

  // ============================================================
  // Today 탭 - DB의 24시간 로직을 신뢰 (프론트엔드 필터링 제거)
  // ============================================================
  useEffect(() => {
    if (activeTab === 'today' && isAuthenticated) {
      // DB RPC(get_today_items)로 24시간 이내 데이터 조회
      fetchToday().then(() => {
        // fetchToday가 items 상태를 업데이트하므로 별도 필터링 불필요
        logger.log('Today items fetched from DB (24h logic)');
      }).catch((err) => {
        logger.error('Failed to fetch today items:', err);
      });
    }
  }, [activeTab, isAuthenticated, fetchToday]);

  // Today 탭용 아이템 (items 상태를 그대로 사용)
  useEffect(() => {
    if (activeTab === 'today') {
      setTodayItems(items);
    }
  }, [activeTab, items]);

  // 포켓 검색 필터링
  const filteredPockets = pockets.filter((pocket) =>
    pocket.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============================================================
  // 이미지 네비게이션 (Carousel)
  // ============================================================
  const imageUrls = productData?.imageUrls || [];
  const currentImageUrl = imageUrls[selectedImageIndex] || productData?.imageUrl || '';
  const hasMultipleImages = imageUrls.length > 1;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex < imageUrls.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  // ============================================================
  // 상품명 편집 핸들러
  // ============================================================
  const handleStartEditTitle = () => {
    if (productData) {
      setEditedTitle(productData.title);
      setIsEditingTitle(true);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  };

  const handleSaveTitle = () => {
    if (productData && editedTitle.trim()) {
      setProductData({
        ...productData,
        title: editedTitle.trim(),
      });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      if (productData) setEditedTitle(productData.title);
    }
  };

  // ============================================================
  // 가격 편집 핸들러
  // ============================================================
  const handleStartEditPrice = () => {
    if (productData) {
      // 현재 가격을 string으로 변환 (콤마 포함)
      const currentPrice = productData.price
        ? productData.price.toLocaleString()
        : '';
      setEditedPrice(currentPrice);
      setIsEditingPrice(true);
      setTimeout(() => priceInputRef.current?.focus(), 50);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // 숫자만 추출
    const numericValue = input.replace(/[^0-9]/g, '');

    // 빈 값이면 그대로 설정
    if (numericValue === '') {
      setEditedPrice('');
      return;
    }

    // 숫자를 콤마 포맷으로 변환
    const formatted = Number(numericValue).toLocaleString();
    setEditedPrice(formatted);
  };

  const handleSavePrice = () => {
    if (!productData) return;

    // 입력된 문자열에서 숫자만 추출 (콤마, 공백 제거)
    const numericValue = editedPrice.replace(/[^0-9.]/g, '');
    const parsedPrice = parseFloat(numericValue);

    if (!isNaN(parsedPrice) && parsedPrice >= 0) {
      setProductData({
        ...productData,
        price: parsedPrice,
      });
    }

    setIsEditingPrice(false);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSavePrice();
    } else if (e.key === 'Escape') {
      setIsEditingPrice(false);
      if (productData) {
        setEditedPrice(productData.price ? productData.price.toLocaleString() : '');
      }
    }
  };

  // ============================================================
  // 로그인/회원가입 핸들러
  // ============================================================


  // ============================================================
  // 포켓에 저장 핸들러
  // ============================================================
  const handleSaveToPocket = async (pocketId: string) => {
    logger.log('[Popup] handleSaveToPocket called, pocketId:', pocketId);
    logger.log('[Popup] productData exists:', !!productData);
    
    if (!productData) {
      logger.warn('[Popup] No product data, showing warning');
      showToast(t('toast.fetch_product_first'), 'warning');
      return;
    }

    const { user } = useAuthStore.getState();
    logger.log('[Popup] User exists:', !!user);
    
    if (!user) {
      logger.warn('[Popup] No user, showing warning');
      showToast(t('toast.login_required'), 'warning');
      return;
    }

    const pocket = pockets.find((p) => p.id === pocketId);
    setStatus('saving');

    try {
      let finalImageUrl: string | null = null;
      let finalBlurhash: string | null = null;

      // 이미지 URL 결정: UI에서 선택된 이미지 또는 대표 이미지
      const targetImageUrl = (productData.imageUrls && productData.imageUrls[selectedImageIndex]) 
        || productData.imageUrl;

      logger.log('[Popup] Save started');
      logger.log('[Popup] Target image URL:', targetImageUrl);

      // 이미지 처리 (Popup은 Extension Page이므로 host_permissions 완전 작동)
      if (targetImageUrl) {
        try {
          logger.log('[Popup] Processing image...');
          const { blob, blurhash } = await processImage(targetImageUrl);

          logger.log('[Popup] Uploading thumbnail...');
          finalImageUrl = await uploadThumbnail(user.id, blob);
          finalBlurhash = blurhash;

          logger.log('[Popup] Image processed successfully:', finalImageUrl);
        } catch (imgError) {
          logger.warn('[Popup] Image processing failed:', imgError);
          // 이미지 실패해도 상품은 저장 (no image)
        }
      } else {
        logger.warn('[Popup] No image URL found, saving without image');
      }

      const result = await addItem({
        url: productData.url,
        title: productData.title, // 편집된 제목 사용
        site_name: productData.mallName || null,
        image_url: finalImageUrl || null,
        price: productData.price,
        currency: productData.currency || 'KRW',
        pocket_id: pocketId,
        is_pinned: false,
        memo: null,
        deleted_at: null,
        blurhash: finalBlurhash,
      });

      if (result) {
        setStatus('success');
        setIsSaved(true);
        setSavedPocketName(pocket?.name || 'Pocket');
        showToast(t('toast.item_saved'), 'success');
        refreshItems();
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      logger.error('Save error:', error);
      setStatus('error');
      showToast(t('toast.save_failed'), 'error');
    }
  };

  // 저장 취소 (되돌리기)
  const handleUndoSave = () => {
    setIsSaved(false);
    setSavedPocketName('');
    setStatus('idle');
  };

  // ============================================================
  // 새 포켓 생성 핸들러
  // ============================================================
  const handleCreatePocket = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!newPocketName.trim()) return;
    if (isCreating) return;

    setIsCreating(true);

    try {
      const authState = useAuthStore.getState();

      if (!authState.user) {
        await authState.initialize();

        const refreshedState = useAuthStore.getState();
        if (!refreshedState.user) {
          showToast(t('toast.login_required'), 'warning');
          setIsCreating(false);
          return;
        }
      }

      const result = await createPocket(newPocketName.trim());

      if (result) {
        setNewPocketName('');
        setIsCreatingPocket(false);
        showToast(t('toast.pocket_created'), 'success');
        refreshPockets();
      }
    } catch (error) {
      logger.error('Create pocket error:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      showToast(errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // 아이템 삭제 (Today 탭에서)
  const handleRemoveItem = async (itemId: string) => {
    setTodayItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // 팝업 닫기
  const handleClose = () => {
    window.close();
  };

  // 대시보드 열기 (탭 재사용)
  const handleOpenSettings = async () => {
    await openDashboard();
  };

  // ============================================================
  // 로딩 상태
  // ============================================================
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ============================================================
  // 로그인 화면
  // ============================================================
  // ============================================================
  // 로그인 화면
  // ============================================================
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        <header className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center">
            <img src="/logo.svg" alt="Pockest" className="h-6 w-auto" />
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="flex flex-col items-center justify-center mb-6">
            <img src="/logo.svg" alt="Pockest" className="w-[120px] h-auto object-contain" />
          </div>

          <AuthForms />
        </div>
      </div>
    );
  }

  // ============================================================
  // 메인 화면 (인증됨) - Full Height 레이아웃
  // ============================================================
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* 헤더 - flex-none (고정 높이) */}
      {/* 헤더 - flex-none (고정 높이) */}
      <header className="flex-none flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100/50">
        <div className="flex items-center">
          <img src="/logo.svg" alt="Pockest" className="h-6 w-auto" />
        </div>
        <button
          onClick={handleOpenSettings}
          className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <img src="/icon_dashboard.svg" alt="Dashboard" className="w-6 h-6" />
        </button>
      </header>

      {/* 상품 정보 프리뷰 영역 - flex-none (고정 높이) */}
      {isSaved ? (
        <div className="flex-none px-4 py-4 bg-green-50 border-b border-green-100">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-700">
                "{savedPocketName}"{t('popup.saved_to')}
              </p>
              <p className="text-xs text-green-600">{t('popup.see_other_products')}</p>
            </div>
            <button
              onClick={handleUndoSave}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-green-600 text-xs font-medium rounded-lg border border-green-200 hover:bg-green-50 transition-colors flex-shrink-0"
            >
              <Undo2 className="w-3 h-3" />
              {t('popup.undo')}
            </button>
          </div>
        </div>
      ) : pocketsLoading && pockets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="animate-spin w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">{t('popup.loading_data')}</p>
        </div>
      ) : status === 'scraping' ? (
        <div className="flex-none px-4 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-500">{t('popup.fetching_product')}</span>
          </div>
        </div>
      ) : status === 'unsupported' ? (
        <div className="flex-none px-6 py-6 bg-gray-50 border-b border-gray-100 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1">
            <ShoppingBag className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {t('error.unsupported_site_title')}
            </h3>
            <p className="text-sm text-gray-500">
              {t('error.unsupported_site_desc')}
            </p>
          </div>
          <button
            onClick={() => setShowSupportedMalls(true)}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-full transition-colors mt-1"
          >
            {t('popup.view_supported_malls')}
          </button>
        </div>
      ) : status === 'error' || (!productData && status === 'idle') ? (
        <div className="flex-none px-4 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/icon_warning.svg" alt="Warning" className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-sm leading-snug font-medium break-keep">
                {scrapeError || t('popup.fetch_failed')}
              </p>
            </div>
            <button
              onClick={scrapeCurrentPage}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
            >
              <img src="/icon_reload.svg" alt="Retry" className="w-6 h-6 opacity-60 hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      ) : productData ? (
        <div className="flex-none px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {/* 이미지 선택기 (Carousel) */}
            <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
              {currentImageUrl ? (
                <img src={currentImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {hasMultipleImages && (
                <>
                  <button
                    onClick={handlePrevImage}
                    disabled={selectedImageIndex === 0}
                    className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/50 text-white flex items-center justify-center rounded-r transition-opacity',
                      selectedImageIndex === 0 ? 'opacity-30' : 'hover:bg-black/70'
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    disabled={selectedImageIndex === imageUrls.length - 1}
                    className={cn(
                      'absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/50 text-white flex items-center justify-center rounded-l transition-opacity',
                      selectedImageIndex === imageUrls.length - 1 ? 'opacity-30' : 'hover:bg-black/70'
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {selectedImageIndex + 1}/{imageUrls.length}
                  </div>
                </>
              )}
            </div>

            {/* 상품 정보 + 제목 편집 */}
            {/* 상품 정보 + 제목 편집 */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-24 py-0.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-[#7548B8] font-bold">{productData.mallName}</p>
                  {!isEditingTitle && (
                    <button
                      onClick={handleStartEditTitle}
                      className="px-2 py-0.5 text-[10px] text-[#7548B8] bg-primary-50 hover:bg-primary-100 rounded-full transition-colors font-medium"
                    >
                      edit
                    </button>
                  )}
                </div>

                {/* 제목 편집 영역 */}
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={handleTitleKeyDown}
                    className="w-full text-sm font-medium text-gray-900 border border-primary-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white"
                  />
                ) : (
                  <p
                    className="text-[13px] leading-[18px] text-gray-800 font-medium line-clamp-2 cursor-pointer hover:opacity-80"
                    onClick={handleStartEditTitle}
                  >
                    {productData.title}
                  </p>
                )}
              </div>

              {/* 가격 편집 영역 */}
              <div className="mt-auto">
                {isEditingPrice ? (
                  <input
                    ref={priceInputRef}
                    type="text"
                    value={editedPrice}
                    onChange={handlePriceChange}
                    onBlur={handleSavePrice}
                    onKeyDown={handlePriceKeyDown}
                    placeholder="0"
                    className="w-full border-b-2 border-[#7548B8] focus:outline-none text-lg font-bold text-gray-900 bg-transparent p-0"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-1.5 group cursor-pointer" onClick={handleStartEditPrice}>
                    <p className="text-lg font-extrabold text-[#333]">
                      {!productData.price ? '가격 정보 없음' : formatPrice(productData.price, productData.currency)}
                    </p>
                    {/* 가격 수정 연필 아이콘 */}
                    <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 탭 & 검색 영역 */}
      <div className="flex-none bg-white">
        <div className="px-5 pt-4 pb-2 text-center text-sm text-gray-500 font-medium">
          저장할 포켓을 선택하세요
        </div>

        <div className="px-5 py-2">
          <div className="relative">
            <input
              type="text"
              placeholder="포켓 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#7548B8] transition-colors shadow-sm"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <img src="/icon_search.svg" alt="Search" className="w-4 h-4 opacity-50" />
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-200 mt-1">
          <button
            onClick={() => setActiveTab('pocket')}
            className={cn(
              "flex-1 py-3 text-sm font-bold transition-colors relative",
              activeTab === 'pocket' ? "text-[#7548B8]" : "text-gray-400"
            )}
          >
            Pocket
            {activeTab === 'pocket' && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#7548B8]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={cn(
              "flex-1 py-3 text-sm font-bold transition-colors relative",
              activeTab === 'today' ? "text-[#7548B8]" : "text-gray-400"
            )}
          >
            Today
            {activeTab === 'today' && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#7548B8]" />
            )}
          </button>
        </div>
      </div>

      {/* 포켓 목록 영역 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2 bg-gray-50/50">
        {pocketsLoading && pockets.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-6 h-6 border-2 border-[#7548B8] border-t-transparent rounded-full" />
          </div>
        ) : activeTab === 'pocket' ? (
          // Pocket 탭: 폴더 목록
          filteredPockets.length > 0 ? (
            filteredPockets.map((pocket) => (
              <div
                key={pocket.id}
                onClick={() => openDashboard(pocket.id)}
                className="group flex items-center justify-between p-3 bg-white rounded-2xl border border-transparent hover:border-[#7548B8]/30 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 flex-shrink-0">
                    <PocketThumbnail images={pocket.recent_thumbnails} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{pocket.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{pocket.item_count || 0}개</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveToPocket(pocket.id);
                  }}
                  className="px-4 py-2 bg-gray-50 text-gray-500 text-sm font-bold rounded-full group-hover:bg-[#7548B8] group-hover:text-white transition-colors"
                >
                  담기
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">
              검색 결과가 없습니다.
            </div>
          )
        ) : (
          // Today 탭: 오늘 저장한 아이템 목록
          todayItems.length > 0 ? (
            todayItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-3 flex gap-3 shadow-sm">
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-gray-300 m-auto" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-xs text-gray-500 mb-0.5">{item.site_name || '쇼핑몰'}</p>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {formatPrice(item.price || 0, item.currency || 'KRW')}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-full transition-all"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <ShoppingBag className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">상품이 없습니다.</p>
            </div>
          )
        )}
      </div>

      {/* Footer - fixed bottom (하단 고정) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t border-gray-100">
        {isCreatingPocket ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('popup.new_pocket_name')}
              value={newPocketName}
              onChange={(e) => setNewPocketName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreatePocket();
                }
              }}
              className="flex-1 px-3 py-2.5 border border-primary-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              autoFocus
            />
            <button
              type="button"
              onClick={(e) => handleCreatePocket(e)}
              disabled={!newPocketName.trim() || isCreating}
              className="p-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {isCreating ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingPocket(false);
                setNewPocketName('');
              }}
              className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreatingPocket(true)}
            className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-200"
          >
            <span className="text-sm">{t('popup.create_pocket')}</span>
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* Supported Malls Modal */}
      {showSupportedMalls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{t('popup.supported_malls_title')}</h3>
              <button
                onClick={() => setShowSupportedMalls(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-6">
              {SUPPORTED_MALLS.map((category) => (
                <div key={category.category}>
                  <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">{category.category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {category.names.map((name) => (
                      <span key={name} className="px-3 py-1.5 bg-gray-50 text-gray-700 text-sm rounded-lg font-medium border border-gray-100">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">이 외에도 다양한 쇼핑몰을 지원합니다.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
