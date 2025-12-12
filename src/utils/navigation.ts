/**
 * Dashboard 탭 재사용 로직
 * - 기존 대시보드 탭이 있으면 재사용 (URL만 업데이트)
 * - 없으면 새 탭 생성
 */

export async function openDashboard(pocketId?: string): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    console.warn('[Navigation] Chrome API not available');
    return;
  }

  try {
    // 1. 대시보드 URL 구성
    const baseUrl = chrome.runtime.getURL('index.html');
    const targetUrl = pocketId 
      ? `${baseUrl}#/dashboard/${pocketId}`
      : `${baseUrl}#/dashboard`;

    // 2. 기존 대시보드 탭 검색
    const tabs = await chrome.tabs.query({});
    const dashboardTab = tabs.find(tab => 
      tab.url?.startsWith(baseUrl) && tab.url.includes('#/dashboard')
    );

    if (dashboardTab && dashboardTab.id) {
      // 3-A. 기존 탭이 있으면 재사용 (URL 업데이트 + 활성화)
      console.log('[Navigation] ♻️ Reusing existing dashboard tab:', dashboardTab.id);
      await chrome.tabs.update(dashboardTab.id, {
        active: true,
        url: targetUrl,
      });
      
      // 탭이 속한 윈도우를 최상단으로
      if (dashboardTab.windowId) {
        await chrome.windows.update(dashboardTab.windowId, { focused: true });
      }
    } else {
      // 3-B. 기존 탭이 없으면 새로 생성
      console.log('[Navigation] 🆕 Creating new dashboard tab');
      await chrome.tabs.create({ url: targetUrl });
    }
  } catch (error) {
    console.error('[Navigation] ❌ Error opening dashboard:', error);
    // Fallback: 새 탭 생성
    const fallbackUrl = chrome.runtime.getURL(
      pocketId ? `index.html#/dashboard/${pocketId}` : 'index.html#/dashboard'
    );
    await chrome.tabs.create({ url: fallbackUrl });
  }
}

/**
 * 특정 뷰로 대시보드 이동
 */
export async function openDashboardView(view: 'all' | 'today' | 'pinned' | 'trash'): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    console.warn('[Navigation] Chrome API not available');
    return;
  }

  try {
    const baseUrl = chrome.runtime.getURL('index.html');
    const targetUrl = `${baseUrl}#/dashboard?view=${view}`;

    const tabs = await chrome.tabs.query({});
    const dashboardTab = tabs.find(tab => 
      tab.url?.startsWith(baseUrl) && tab.url.includes('#/dashboard')
    );

    if (dashboardTab && dashboardTab.id) {
      console.log('[Navigation] ♻️ Updating dashboard view:', view);
      await chrome.tabs.update(dashboardTab.id, {
        active: true,
        url: targetUrl,
      });
      
      if (dashboardTab.windowId) {
        await chrome.windows.update(dashboardTab.windowId, { focused: true });
      }
    } else {
      console.log('[Navigation] 🆕 Creating dashboard with view:', view);
      await chrome.tabs.create({ url: targetUrl });
    }
  } catch (error) {
    console.error('[Navigation] ❌ Error opening dashboard view:', error);
  }
}


