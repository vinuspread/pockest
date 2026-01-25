/**
 * Content Script
 * 쇼핑몰 페이지에서 상품 정보를 추출하고 Extension과 통신
 */

import { parseProductFromPage, parseProductWithRetry, isProductPage, type ProductData } from '@/utils/parser';
import { logger } from '@/utils/logger';

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
        logger.log('Unknown message type:', message.type);
        return false;
    }
  }
);

/**
 * 이미지 처리 (리사이징, WebP 변환, BlurHash) - Content Script에서는 URL만 전달
 */
async function handleScrapeProduct(
  sendResponse: (response: ScrapeResponse) => void
): Promise<void> {
  try {
    // SPA 대응을 위해 재시도 로직이 포함된 파서 사용
    const productData = await parseProductWithRetry(document);

    // 최소한의 데이터 검증
    if (!productData.title && !productData.imageUrl) {
      sendResponse({
        success: false,
        data: null,
        error: '상품 정보를 찾을 수 없습니다.',
      });
      return;
    }

    // 이미지 처리는 Popup에서 수행 (Content Script에서는 URL만 전달)
    logger.log('[Content Script] Product data collected:', {
      title: productData.title,
      imageUrl: productData.imageUrl,
      imageCount: productData.imageUrls?.length || 0,
    });
    
    sendResponse({
      success: true,
      data: productData,
    });
  } catch (error) {
    logger.error('Scrape error:', error);
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
    logger.error('GetPageInfo error:', error);
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
  logger.log('Content script loaded', {
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

// ⚠️ Remove auto-initialization for compliance (perform lazily or on specific domains only)
// The manifest now restricts domains, so this script only runs on whitelisted sites.
// However, the report recommended minimizing impact. 
// Given we have a whitelist now, running initialize() is safer, BUT removing it is even safer for performance.
// Let's keep initialize() BUT only call it if we are sure.
// Since we used 'whitelist', content script ONLY injects on shopping sites.
// So 'initialize' running automatically IS ACCEPTABLE for functionality (auto-detect).
// But to be perfectly safe with the "Performance" warning, I will wrap it in a lightweight check or just keep it since whitelist solves the "Every Page" issue.
// Actually, strict compliance suggests: "Don't do heavy parsing on load".
// `isProductPage` is relatively light. `parseProduct` is heavy.
// `initialize()` only calls `isProductPage`. This is fine. 
// I will just replace console.log in initialize and keep the logic, as the whitelist is the main fix.

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
