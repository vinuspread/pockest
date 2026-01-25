/**
 * Background Service Worker
 * Chrome Extension의 백그라운드 프로세스
 */

// ============================================================
// 사이드 패널 설정 함수
// ============================================================

import { logger } from '@/utils/logger';

const setupSidePanel = () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => logger.log('SidePanel behavior set successfully'))
    .catch((error) => logger.error('SidePanel Setup Error:', error));
};

// ============================================================
// 설치/업데이트 이벤트
// ============================================================

chrome.runtime.onInstalled.addListener((details) => {
  logger.log('Extension installed:', details.reason);

  // 사이드 패널 동작 설정
  setupSidePanel();

  if (details.reason === 'install') {
    // 최초 설치 시 환영 페이지(Welcome) 열기
    logger.log('Opening welcome page for new installation');
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html#/welcome'),
    });
  } else if (details.reason === 'update') {
    // 업데이트 시에는 로그만 출력
    logger.log('Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// ============================================================
// 브라우저 시작 이벤트
// ============================================================

chrome.runtime.onStartup.addListener(() => {
  logger.log('Browser started, setting up side panel');
  setupSidePanel();
});

// ============================================================
// 액션 클릭 이벤트 (사이드 패널 강제 열기)
// ============================================================

chrome.action.onClicked.addListener(async (tab) => {
  logger.log('Action clicked, opening side panel');

  // windowId로 사이드 패널 열기 (더 안정적)
  if (tab.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      logger.log('Side panel opened via windowId');
    } catch (error) {
      logger.error('Failed to open side panel:', error);

      // Fallback: tabId로 시도
      if (tab.id) {
        try {
          await chrome.sidePanel.open({ tabId: tab.id });
          logger.log('Side panel opened via tabId (fallback)');
        } catch (fallbackError) {
          logger.error('Fallback also failed:', fallbackError);
        }
      }
    }
  }
});

// ============================================================
// 메시지 핸들러
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'FETCH_IMAGE':
      // Content Script에서 CORS 우회를 위해 Background에서 fetch
      handleFetchImage(message.payload)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 비동기 응답

    case 'SAVE_ITEM':
      handleSaveItem(message.payload)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 비동기 응답

    case 'GET_PAGE_INFO':
      // Content Script에 요청 전달
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'GET_PAGE_INFO' }, sendResponse);
      }
      return true;

    case 'AUTH_STATE_CHANGED':
      // 인증 상태 변경 시 모든 탭에 알림
      broadcastMessage({ type: 'AUTH_STATE_CHANGED', payload: message.payload });
      break;

    case 'PRODUCT_PAGE_DETECTED':
      logger.log('Product page detected:', message.payload?.url);
      break;

    default:
      logger.log('Unknown message type:', message.type);
  }
});

// ============================================================
// 헬퍼 함수
// ============================================================

// 이미지 fetch 핸들러 (CORS 우회)
async function handleFetchImage(imageUrl: string) {
  logger.log('[Background] Fetching image:', imageUrl);
  
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    
    const blob = await response.blob();
    logger.log('[Background] Image fetched, blob size:', blob.size);
    
    // Blob을 ArrayBuffer로 변환하여 전송
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    return {
      base64,
      type: blob.type,
      size: blob.size,
    };
  } catch (error) {
    logger.error('[Background] Image fetch failed:', error);
    throw error;
  }
}

// 상품 저장 핸들러
async function handleSaveItem(item: unknown) {
  logger.log('Save item request:', item);
  return item;
}

// 모든 탭에 메시지 브로드캐스트
// ⚠️ WARNING: tabs 권한 제거로 인해 브로드캐스트 불가
// 대안: Storage API를 사용하거나 개별 탭에서 polling
function broadcastMessage(message: unknown) {
  // Storage를 통한 상태 공유 방식으로 변경 권장
  chrome.storage.local.set({ lastAuthState: message }).catch(() => {
    // Storage 실패 무시
  });
}

logger.log('Background service worker started');
