/**
 * Background Service Worker
 * Chrome Extension의 백그라운드 프로세스
 */

// ============================================================
// 사이드 패널 설정 함수
// ============================================================

const setupSidePanel = () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log('[Pockest] SidePanel behavior set successfully'))
    .catch((error) => console.error('[Pockest] SidePanel Setup Error:', error));
};

// ============================================================
// 설치/업데이트 이벤트
// ============================================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Pockest] Extension installed:', details.reason);
  
  // 사이드 패널 동작 설정
  setupSidePanel();

  if (details.reason === 'install') {
    // 최초 설치 시 환영 페이지(Welcome) 열기
    console.log('[Pockest] Opening welcome page for new installation');
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html#/welcome'),
    });
  } else if (details.reason === 'update') {
    // 업데이트 시에는 로그만 출력
    console.log('[Pockest] Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// ============================================================
// 브라우저 시작 이벤트
// ============================================================

chrome.runtime.onStartup.addListener(() => {
  console.log('[Pockest] Browser started, setting up side panel');
  setupSidePanel();
});

// ============================================================
// 액션 클릭 이벤트 (사이드 패널 강제 열기)
// ============================================================

chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Pockest] Action clicked, opening side panel');
  
  // windowId로 사이드 패널 열기 (더 안정적)
  if (tab.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      console.log('[Pockest] Side panel opened via windowId');
    } catch (error) {
      console.error('[Pockest] Failed to open side panel:', error);
      
      // Fallback: tabId로 시도
      if (tab.id) {
        try {
          await chrome.sidePanel.open({ tabId: tab.id });
          console.log('[Pockest] Side panel opened via tabId (fallback)');
        } catch (fallbackError) {
          console.error('[Pockest] Fallback also failed:', fallbackError);
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
      console.log('[Pockest] Product page detected:', message.payload?.url);
      break;

    default:
      console.log('[Pockest] Unknown message type:', message.type);
  }
});

// ============================================================
// 헬퍼 함수
// ============================================================

// 상품 저장 핸들러
async function handleSaveItem(item: unknown) {
  console.log('[Pockest] Save item request:', item);
  return item;
}

// 모든 탭에 메시지 브로드캐스트
function broadcastMessage(message: unknown) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // 탭에 content script가 없는 경우 무시
        });
      }
    });
  });
}

console.log('[Pockest] Background service worker started');
