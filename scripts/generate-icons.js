/**
 * Pockest 아이콘 생성 스크립트
 * Canvas를 사용하여 PNG 아이콘 생성
 */

const fs = require('fs');
const path = require('path');

// 아이콘 사이즈
const sizes = [16, 32, 48, 128];

// SVG 아이콘 (ShoppingBag 스타일)
const createSvgIcon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" rx="6" fill="#8B5CF6"/>
  <path d="M6 6h12l1 14H5L6 6Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M9 6V4.5a3 3 0 0 1 6 0V6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

// 아이콘 디렉토리 생성
const iconsDir = path.join(__dirname, '..', 'public', 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG 파일 생성 (브라우저에서 PNG로 변환 필요)
sizes.forEach(size => {
  const svg = createSvgIcon(size);
  const filePath = path.join(iconsDir, `icon-${size}.svg`);
  fs.writeFileSync(filePath, svg.trim());
  console.log(`✅ Created: icon-${size}.svg`);
});

console.log('\n📌 SVG 아이콘이 생성되었습니다.');
console.log('PNG로 변환하려면 https://svgtopng.com 등을 사용하세요.');
console.log('또는 아래 사이트에서 직접 아이콘을 만드세요:');
console.log('https://favicon.io/favicon-generator/');


