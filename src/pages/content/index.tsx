/**
 * Content Script
 * 쇼핑몰 페이지에서 상품 정보를 추출하고 Extension과 통신
 */

import { parseProductFromPage, isProductPage, type ProductData } from '@/utils/parser';

// ============================================================
// 타입 정의
// ============================================================

interface ScrapeResponse {
  success: boolean;
  data: ProductData | null;
  error?: string;
}

type MessageType = 'SCRAPE_PRODUCT' | 'GET_PAGE_INFO' | 'CHECK_PRODUCT_PAGE';

interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

// ============================================================
// 메시지 핸들러
// ============================================================

/**
 * Chrome Runtime 메시지 리스너
 * Popup이나 Background에서 요청을 받아 처리
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ScrapeResponse | boolean | ProductData) => void
  ) => {
    switch (message.type) {
      case 'SCRAPE_PRODUCT':
        handleScrapeProduct(sendResponse);
        return true; // 비동기 응답을 위해 true 반환

      case 'GET_PAGE_INFO':
        handleGetPageInfo(sendResponse);
        return true;

      case 'CHECK_PRODUCT_PAGE':
        sendResponse(isProductPage(document));
        return false;

      default:
        console.log('[Pockest] Unknown message type:', message.type);
        return false;
    }
  }
);

/**
 * 상품 정보 스크래핑 핸들러
 */
function handleScrapeProduct(
  sendResponse: (response: ScrapeResponse) => void
): void {
  try {
    const productData = parseProductFromPage(document);
    
    // 최소한의 데이터 검증
    if (!productData.title && !productData.imageUrl) {
      sendResponse({
        success: false,
        data: null,
        error: '상품 정보를 찾을 수 없습니다.',
      });
      return;
    }

    sendResponse({
      success: true,
      data: productData,
    });
  } catch (error) {
    console.error('[Pockest] Scrape error:', error);
    sendResponse({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '파싱 중 오류가 발생했습니다.',
    });
  }
}

/**
 * 페이지 기본 정보 반환 (간단 버전)
 */
function handleGetPageInfo(
  sendResponse: (response: ProductData) => void
): void {
  try {
    const productData = parseProductFromPage(document);
    sendResponse(productData);
  } catch (error) {
    console.error('[Pockest] GetPageInfo error:', error);
    // 오류 시 기본값 반환
    sendResponse({
      title: document.title || '',
      price: null,
      currency: 'KRW',
      imageUrl: '',
      imageUrls: [],
      mallName: window.location.hostname.replace('www.', ''),
      url: window.location.href,
    });
  }
}

// ============================================================
// 초기화
// ============================================================

/**
 * Content Script 로드 시 초기화
 */
function initialize(): void {
  // 상품 페이지 여부 로깅 (디버깅용)
  const isProduct = isProductPage(document);
  console.log('[Pockest] Content script loaded', {
    url: window.location.href,
    isProductPage: isProduct,
  });

  // 상품 페이지인 경우 Background에 알림 (선택적)
  if (isProduct) {
    chrome.runtime.sendMessage({
      type: 'PRODUCT_PAGE_DETECTED',
      payload: { url: window.location.href },
    }).catch(() => {
      // Background가 없는 경우 무시
    });
  }
}

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
