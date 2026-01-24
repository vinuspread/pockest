/**
 * 사이트 타입 감지 유틸리티
 */

// manifest.json의 등록된 쇼핑몰 도메인 리스트
const REGISTERED_DOMAINS = [
  'amazon.com',
  'amazon.co.jp',
  'amazon.co.uk',
  'amazon.de',
  'amazon.ca',
  'aliexpress.com',
  'ebay.com',
  'walmart.com',
  'target.com',
  'costco.com',
  'temu.com',
  'shein.com',
  'etsy.com',
  'wish.com',
  'banggood.com',
  'geekbuying.com',
  'dhgate.com',
  'taobao.com',
  'tmall.com',
  'jd.com',
  '1688.com',
  'rakuten.co.jp',
  'shopping.yahoo.co.jp',
  'zozo.jp',
  'lohaco.jp',
  'biccamera.com',
  'yodobashi.com',
  'smartstore.naver.com',
  'shopping.naver.com',
  'coupang.com',
  'gmarket.co.kr',
  '11st.co.kr',
  'auction.co.kr',
  'ssg.com',
  'lotteon.com',
  'musinsa.com',
  '29cm.co.kr',
  'wconcept.co.kr',
  'bestbuy.com',
  'newegg.com',
  'ikea.com',
  'zara.com',
  'hm.com',
  'asos.com',
  'uniqlo.com',
  'allegro.pl',
  'otto.de',
  'zalando.com',
  'cdiscount.com',
  'fnac.com',
  'ohou.se',
  'zipggo.com',
  'casamia.co.kr',
  'hanssem.com',
  'marketb.kr',
  '10x10.co.kr',
  'artboxmall.com',
  'binaryshop.co.kr',
  'a-bly.com',
  'zigzag.kr',
  'brandi.co.kr',
  'hago.kr',
  'wayfair.com',
  'houzz.com',
  'westelm.com',
  'urbanoutfitters.com',
  'anthropologie.com',
];

/**
 * URL에서 도메인 추출
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * 등록된 쇼핑몰인지 확인
 */
export function isRegisteredShoppingMall(url: string): boolean {
  const domain = extractDomain(url);
  return REGISTERED_DOMAINS.some(registered => domain.includes(registered));
}

/**
 * 쇼핑몰 가능성이 있는 사이트인지 URL 기반 체크
 */
export function isLikelyShoppingMall(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  
  // 쇼핑몰 관련 키워드
  const shoppingKeywords = [
    'shop',
    'store',
    'mall',
    'market',
    'cart',
    'product',
    'item',
    'goods',
    'buy',
    'commerce',
    'shopping',
  ];
  
  return shoppingKeywords.some(keyword => lowerUrl.includes(keyword));
}

/**
 * 페이지 분석: executeScript로 실제 페이지 내용 체크
 * (activeTab 권한 필요)
 */
export async function analyzePageForShopping(tabId: number): Promise<{
  isShoppingPage: boolean;
  confidence: number;
}> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        let score = 0;
        
        // 1. 가격 표시 요소
        const priceSelectors = [
          '[class*="price"]',
          '[id*="price"]',
          '[data-price]',
          '.product-price',
          '.sale-price',
          '.original-price',
        ];
        const hasPrice = priceSelectors.some(sel => document.querySelector(sel));
        if (hasPrice) score += 30;
        
        // 2. 장바구니/구매 버튼
        const buttonSelectors = [
          '[class*="cart"]',
          '[class*="buy"]',
          '[class*="purchase"]',
          'button[type="submit"]',
        ];
        const hasCartButton = buttonSelectors.some(sel => document.querySelector(sel));
        if (hasCartButton) score += 25;
        
        // 3. 상품 이미지 갤러리
        const imageGallery = document.querySelectorAll('img').length > 3;
        if (imageGallery) score += 15;
        
        // 4. Meta 태그 체크
        const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content');
        if (ogType === 'product' || ogType === 'product.item') score += 30;
        
        // 5. Schema.org Product
        const hasProductSchema = document.querySelector('[itemtype*="Product"]');
        if (hasProductSchema) score += 20;
        
        return {
          isShoppingPage: score >= 30,
          confidence: Math.min(score, 100),
        };
      },
    });
    
    return results[0].result;
  } catch (error) {
    // executeScript 실패 시 (권한 없음 등)
    return { isShoppingPage: false, confidence: 0 };
  }
}

/**
 * 종합 사이트 타입 판별
 */
export type SiteType = 
  | 'registered'      // 등록된 쇼핑몰
  | 'unregistered'    // 미등록 쇼핑몰
  | 'general';        // 일반 사이트

export async function detectSiteType(url: string, tabId?: number): Promise<SiteType> {
  // 1. 등록된 쇼핑몰 체크
  if (isRegisteredShoppingMall(url)) {
    return 'registered';
  }
  
  // 2. URL 기반 쇼핑몰 가능성 체크
  if (isLikelyShoppingMall(url)) {
    return 'unregistered';
  }
  
  // 3. 페이지 분석 (tabId가 있을 경우)
  if (tabId) {
    const analysis = await analyzePageForShopping(tabId);
    if (analysis.isShoppingPage && analysis.confidence >= 50) {
      return 'unregistered';
    }
  }
  
  return 'general';
}
