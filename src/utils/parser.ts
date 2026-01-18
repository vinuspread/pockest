/**
 * 상품 파서(Parser) 엔진 v2.0
 * 쇼핑몰 페이지에서 상품 정보를 추출하는 순수 함수 집합
 * 
 * 개선 사항:
 * - 다중 이미지 후보군 추출 지원
 * - 쇼핑몰별 상세 이미지 클래스 감지
 * - 광고/배너 이미지 필터링
 * 
 * 우선순위 전략:
 * 1. Meta Tags (og:*, twitter:*, product:*)
 * 2. JSON-LD (Structured Data)
 * 3. DOM Analysis (Fallback)
 */

// ============================================================
// 타입 정의
// ============================================================

export interface ProductData {
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string;           // 대표 이미지 (첫 번째)
  imageUrls: string[];        // 이미지 후보군 (배열)
  mallName: string;
  url: string;
}

interface JsonLdProduct {
  '@type'?: string;
  name?: string;
  image?: string | string[];
  offers?: {
    price?: string | number;
    priceCurrency?: string;
  } | Array<{
    price?: string | number;
    priceCurrency?: string;
  }>;
}

// 광고/배너 이미지 필터링 키워드
const EXCLUDED_IMAGE_KEYWORDS = [
  'ad', 'banner', 'advertisement', 'promotion', 'promo',
  'logo', 'icon', 'btn', 'button', 'arrow', 'cart', 'search',
  'spinner', 'loading', 'placeholder', 'blank', 'empty',
  'social', 'facebook', 'twitter', 'instagram', 'kakao',
  'payment', 'card', 'delivery', 'shipping', 'badge',
  'star', 'rating', 'review', 'like', 'heart', 'share',
];

// 쇼핑몰별 상품 이미지 선택자
const MALL_IMAGE_SELECTORS: Record<string, string[]> = {
  // 네이버 쇼핑/스마트스토어
  'smartstore.naver.com': ['._image', '.product-img img', '.thumb_image img'],
  'shopping.naver.com': ['.productImage img', '.thumb img'],
  'brand.naver.com': ['.product_thumb img', '._image'],
  // 쿠팡
  'coupang.com': ['.prod-image__detail img', '.prod-image img', '.subType-IMAGE img'],
  // 11번가
  '11st.co.kr': ['.img_full img', '.c_product_img img', '.thumb img'],
  // G마켓
  'gmarket.co.kr': ['.thumb-gallery img', '.thumb_img img', '.item_photo img'],
  // 옥션
  'auction.co.kr': ['.thumb-gallery img', '.thumb_img img', '.item_photo img'],
  // SSG
  'ssg.com': ['.cdtl_img img', '.v2_detail img', '.cdtl_item img'],
  // 롯데온
  'lotteon.com': ['.prd_img img', '.thumb img'],
  // 무신사
  'musinsa.com': ['.product-img img', '.prd_img img', '.img-box img'],
  // 29cm
  '29cm.co.kr': ['.detail-image img', '.prd_img img'],
  // W컨셉
  'wconcept.co.kr': ['.prd_img img', '.thumb img'],
  // 아마존
  'amazon': ['.imgTagWrapper img', '#landingImage', '#imgBlkFront', '.image-wrapper img'],
  // 알리익스프레스
  'aliexpress': ['.image-view-magnifier-wrap img', '.images-view-item img'],
};

// ============================================================
// 메타 태그 유틸리티
// ============================================================

/**
 * Meta 태그에서 content 값 추출
 */
function getMetaContent(doc: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const meta = doc.querySelector(selector);
    if (meta) {
      const content = meta.getAttribute('content');
      if (content && content.trim()) {
        return content.trim();
      }
    }
  }
  return '';
}

/**
 * JSON-LD 스크립트에서 Product 데이터 추출
 */
function parseJsonLd(doc: Document): JsonLdProduct | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');

      // 단일 객체인 경우
      if (data['@type'] === 'Product') {
        return data as JsonLdProduct;
      }

      // @graph 배열인 경우
      if (data['@graph'] && Array.isArray(data['@graph'])) {
        const product = data['@graph'].find(
          (item: JsonLdProduct) => item['@type'] === 'Product'
        );
        if (product) return product as JsonLdProduct;
      }

      // 배열인 경우
      if (Array.isArray(data)) {
        const product = data.find(
          (item: JsonLdProduct) => item['@type'] === 'Product'
        );
        if (product) return product as JsonLdProduct;
      }
    } catch {
      continue;
    }
  }

  return null;
}

// ============================================================
// 이미지 추출 (다중 이미지 지원)
// ============================================================

/**
 * 이미지가 유효한지 검증 (광고/아이콘 제외)
 */
function isValidProductImage(src: string): boolean {
  if (!src || src.startsWith('data:')) return false;

  const srcLower = src.toLowerCase();

  // 제외 키워드 체크
  for (const keyword of EXCLUDED_IMAGE_KEYWORDS) {
    if (srcLower.includes(keyword)) {
      return false;
    }
  }

  // 확장자 체크 (gif 제외 - 대부분 아이콘)
  if (srcLower.endsWith('.gif') || srcLower.endsWith('.svg')) {
    return false;
  }

  return true;
}

/**
 * 이미지 URL에서 실제 소스 추출 (Lazy Loading 대응)
 */
function extractImageSrc(img: HTMLImageElement): string {
  return img.src ||
    img.getAttribute('data-src') ||
    img.getAttribute('data-original') ||
    img.getAttribute('data-lazy-src') ||
    img.getAttribute('data-image') ||
    img.getAttribute('data-lazy') ||
    img.getAttribute('data-zoom-image') ||
    img.getAttribute('data-large-image') ||
    '';
}

/**
 * 쇼핑몰별 상품 이미지 추출
 */
function getMallSpecificImages(doc: Document, hostname: string): string[] {
  const images: string[] = [];

  // 매칭되는 쇼핑몰 선택자 찾기
  for (const [mall, selectors] of Object.entries(MALL_IMAGE_SELECTORS)) {
    if (hostname.includes(mall)) {
      for (const selector of selectors) {
        const elements = doc.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el instanceof HTMLImageElement
            ? extractImageSrc(el)
            : el.getAttribute('src') || '';
          if (isValidProductImage(src)) {
            images.push(resolveUrl(src, doc));
          }
        });
      }
      break;
    }
  }

  return [...new Set(images)]; // 중복 제거
}

/**
 * 본문에서 큰 이미지들 찾기 (300px 이상)
 */
function findLargeImages(doc: Document): string[] {
  const images = doc.querySelectorAll('img');
  const candidates: Array<{ src: string; area: number }> = [];
  const MIN_SIZE = 300;

  for (const img of images) {
    const src = extractImageSrc(img);
    if (!isValidProductImage(src)) continue;

    // 크기 확인 (자연 크기 또는 속성값)
    const width = img.naturalWidth || parseInt(img.getAttribute('width') || '0', 10);
    const height = img.naturalHeight || parseInt(img.getAttribute('height') || '0', 10);

    // 최소 크기 체크
    if (width >= MIN_SIZE || height >= MIN_SIZE) {
      // 비율 체크 (너무 가로로 긴 이미지는 배너일 가능성)
      const ratio = width / (height || 1);
      if (ratio > 0.3 && ratio < 4) { // 세로 3:1 ~ 가로 4:1 사이만 허용
        candidates.push({ src: resolveUrl(src, doc), area: width * height });
      }
    }
  }

  // 크기 순으로 정렬 후 상위 10개 반환
  return candidates
    .sort((a, b) => b.area - a.area)
    .slice(0, 10)
    .map((c) => c.src);
}

/**
 * 상품 이미지 후보군 추출 (배열)
 * 우선순위: og:image → 쇼핑몰별 선택자 → 큰 이미지들
 */
export function getProductImages(doc: Document): string[] {
  const imageSet = new Set<string>();
  const hostname = doc.location?.hostname || '';

  // 1순위: Open Graph 이미지
  const ogImages = [
    getMetaContent(doc, ['meta[property="og:image"]']),
    getMetaContent(doc, ['meta[property="og:image:url"]']),
    getMetaContent(doc, ['meta[property="og:image:secure_url"]']),
  ].filter(Boolean);

  ogImages.forEach((img) => {
    const resolved = resolveUrl(img, doc);
    if (isValidProductImage(resolved)) {
      imageSet.add(resolved);
    }
  });

  // 2순위: link rel="image_src"
  const linkImage = doc.querySelector('link[rel="image_src"]');
  if (linkImage) {
    const href = linkImage.getAttribute('href');
    if (href && isValidProductImage(href)) {
      imageSet.add(resolveUrl(href, doc));
    }
  }

  // 3순위: JSON-LD 이미지
  const jsonLd = parseJsonLd(doc);
  if (jsonLd?.image) {
    const jsonImages = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
    jsonImages.forEach((img) => {
      if (img && isValidProductImage(img)) {
        imageSet.add(resolveUrl(img, doc));
      }
    });
  }

  // 4순위: 쇼핑몰별 상품 이미지
  const mallImages = getMallSpecificImages(doc, hostname);
  mallImages.forEach((img) => imageSet.add(img));

  // 5순위: 본문 내 큰 이미지들 (300px 이상)
  const largeImages = findLargeImages(doc);
  largeImages.forEach((img) => imageSet.add(img));

  return Array.from(imageSet).slice(0, 10); // 최대 10개
}

/**
 * 대표 이미지 URL 추출 (하위 호환성)
 */
export function getProductImage(doc: Document): string {
  const images = getProductImages(doc);
  return images[0] || '';
}

// ============================================================
// 제목 추출
// ============================================================

/**
 * 상품 제목 추출
 * 우선순위: og:title → twitter:title → JSON-LD name → title 태그 → h1 태그 → placeholder
 */
export function getProductTitle(doc: Document): string {
  // 1순위: Open Graph 제목
  const ogTitle = getMetaContent(doc, ['meta[property="og:title"]']);
  if (ogTitle && ogTitle.trim()) return cleanTitle(ogTitle);

  // 2순위: Twitter 제목
  const twitterTitle = getMetaContent(doc, [
    'meta[name="twitter:title"]',
    'meta[property="twitter:title"]',
  ]);
  if (twitterTitle && twitterTitle.trim()) return cleanTitle(twitterTitle);

  // 3순위: JSON-LD 제목
  const jsonLd = parseJsonLd(doc);
  if (jsonLd?.name && jsonLd.name.trim()) return cleanTitle(jsonLd.name);

  // 4순위: document.title (title 태그)
  if (doc.title && doc.title.trim()) {
    const cleaned = cleanTitle(doc.title);
    if (cleaned) return cleaned;
  }

  // 5순위: h1 태그 텍스트
  const h1 = doc.querySelector('h1');
  if (h1 && h1.textContent?.trim()) {
    return cleanTitle(h1.textContent);
  }

  // 6순위: 상품 관련 클래스의 제목 요소
  const productTitleSelectors = [
    '.product-title', '.product_title', '.prd_name', '.item_name',
    '.goods_name', '.tit_prd', '[class*="product"][class*="title"]',
    '[class*="product"][class*="name"]', '.name h1', '.title h1',
  ];
  for (const selector of productTitleSelectors) {
    const el = doc.querySelector(selector);
    if (el && el.textContent?.trim()) {
      return cleanTitle(el.textContent);
    }
  }

  // Fallback: placeholder 반환
  return '상품명 없음 (수정해주세요)';
}

/**
 * 제목 정리 (사이트명 제거 등)
 */
function cleanTitle(title: string): string {
  const separators = [' | ', ' - ', ' :: ', ' » ', ' — ', ' · '];

  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep);
      return parts.reduce((a, b) => a.length >= b.length ? a : b).trim();
    }
  }

  return title.trim();
}

// ============================================================
// 쇼핑몰 이름 추출
// ============================================================

/**
 * 쇼핑몰 이름 추출
 */
export function getSiteName(doc: Document, url: string): string {
  const ogSiteName = getMetaContent(doc, ['meta[property="og:site_name"]']);
  if (ogSiteName) return ogSiteName;

  try {
    const hostname = new URL(url).hostname;
    return formatHostname(hostname);
  } catch {
    return '';
  }
}

/**
 * 호스트명 정리
 */
function formatHostname(hostname: string): string {
  return hostname
    .replace(/^www\./, '')
    .replace(/\.co\.kr$/, '')
    .replace(/\.com$/, '')
    .replace(/\.net$/, '')
    .replace(/\.kr$/, '')
    .replace(/\.jp$/, '')
    .split('.').pop() || hostname;
}

// ============================================================
// 가격 추출
// ============================================================

/**
 * 상품 가격 추출
 */
/**
 * 상품 가격 추출
 */
export function getProductPrice(doc: Document): { price: number | null; currency: string } {
  // 1순위: 네이버 쇼핑/스마트스토어 특화 (가장 정확함)
  const naverPriceSelectors = [
    // 스마트스토어 신규/구버전
    '._price_number',
    '.lowestPrice_num__3AlQ-', // 네이버 쇼핑 가격비교
    '.lowestPrice_price__Yw0DX', // 네이버 쇼핑
    '.product_price .price',
    '.price_area .price',
    'span[class*="price_num"]',
    'strong[class*="price_real"]'
  ];

  for (const selector of naverPriceSelectors) {
    const el = doc.querySelector(selector);
    if (el && el.textContent) {
      const price = parsePrice(el.textContent);
      if (price !== null && price > 0) {
        return { price, currency: 'KRW' };
      }
    }
  }

  // 2순위: 메타 태그 가격
  const metaPrice = getMetaContent(doc, [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
  ]);
  const metaCurrency = getMetaContent(doc, [
    'meta[property="product:price:currency"]',
    'meta[property="og:price:currency"]',
  ]);

  if (metaPrice) {
    const price = parsePrice(metaPrice);
    if (price !== null) {
      return { price, currency: metaCurrency || 'KRW' };
    }
  }

  // 3순위: JSON-LD 가격
  const jsonLd = parseJsonLd(doc);
  if (jsonLd?.offers) {
    const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
    if (offers?.price) {
      const price = parsePrice(String(offers.price));
      if (price !== null) {
        return { price, currency: offers.priceCurrency || 'KRW' };
      }
    }
  }

  // 4순위: 본문에서 가격 텍스트 파싱
  return findPriceInDOM(doc);
}

/**
 * 가격 문자열을 숫자로 변환
 */
function parsePrice(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);

  return isNaN(price) ? null : Math.round(price);
}

/**
 * DOM에서 가격 텍스트 찾기
 */
function findPriceInDOM(doc: Document): { price: number | null; currency: string } {
  const priceSelectors = [
    '[class*="price"]',
    '[class*="Price"]',
    '[class*="cost"]',
    '[class*="amount"]',
    '[data-price]',
    '[itemprop="price"]',
    '.product-price',
    '.sale-price',
    '.final-price',
  ];

  const pricePatterns = [
    { regex: /₩\s*([0-9,]+)/, currency: 'KRW' },
    { regex: /([0-9,]+)\s*원/, currency: 'KRW' },
    { regex: /KRW\s*([0-9,]+)/, currency: 'KRW' },
    { regex: /\$\s*([0-9,.]+)/, currency: 'USD' },
    { regex: /USD\s*([0-9,.]+)/, currency: 'USD' },
    { regex: /¥\s*([0-9,]+)/, currency: 'JPY' },
    { regex: /€\s*([0-9,.]+)/, currency: 'EUR' },
  ];

  const priceElements: Array<{ element: Element; fontSize: number; text: string }> = [];

  for (const selector of priceSelectors) {
    const elements = doc.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent || '';
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize) || 0;

      for (const pattern of pricePatterns) {
        if (pattern.regex.test(text)) {
          priceElements.push({ element: el, fontSize, text });
          break;
        }
      }
    }
  }

  priceElements.sort((a, b) => b.fontSize - a.fontSize);

  for (const item of priceElements) {
    for (const pattern of pricePatterns) {
      const match = item.text.match(pattern.regex);
      if (match) {
        const price = parsePrice(match[1]);
        if (price !== null && price > 0) {
          return { price, currency: pattern.currency };
        }
      }
    }
  }

  return { price: null, currency: 'KRW' };
}

// ============================================================
// 유틸리티
// ============================================================

/**
 * 상대 URL을 절대 URL로 변환
 */
function resolveUrl(url: string, doc: Document): string {
  if (!url) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  try {
    const base = doc.baseURI || doc.location?.href || '';
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

// ============================================================
// 메인 파서 함수
// ============================================================

/**
 * 현재 페이지에서 상품 정보 추출
 * Content Script에서 호출되는 메인 함수
 */
export function parseProductFromPage(doc: Document = document): ProductData {
  const url = doc.location?.href || '';
  const { price, currency } = getProductPrice(doc);
  const imageUrls = getProductImages(doc);

  return {
    title: getProductTitle(doc) || '제목 없음',
    price,
    currency,
    imageUrl: imageUrls[0] || '',
    imageUrls,
    mallName: getSiteName(doc, url) || '알 수 없음',
    url,
  };
}

/**
 * 비동기 파서 (SPA 지원): 재시도 로직 포함
 */
export async function parseProductWithRetry(
  doc: Document = document,
  maxRetries: number = 5,
  intervalMs: number = 800
): Promise<ProductData> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < maxRetries; i++) {
    const data = parseProductFromPage(doc);

    // 성공 조건: 가격과 이미지가 모두 있으면 즉시 반환
    if (data.price !== null && data.imageUrl) {
      return data;
    }

    // 마지막 시도면 그냥 반환
    if (i === maxRetries - 1) {
      return data;
    }

    // 대기 후 재시도
    await sleep(intervalMs);
  }

  return parseProductFromPage(doc);
}

/**
 * 페이지가 상품 페이지인지 간단히 판단
 */
export function isProductPage(doc: Document = document): boolean {
  const ogType = getMetaContent(doc, ['meta[property="og:type"]']);
  if (ogType.toLowerCase().includes('product')) {
    return true;
  }

  const jsonLd = parseJsonLd(doc);
  if (jsonLd) {
    return true;
  }

  const { price } = getProductPrice(doc);
  return price !== null;
}
