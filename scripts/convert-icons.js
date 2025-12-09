/**
 * SVG를 PNG로 변환하는 스크립트
 * 실행: npm run icons
 */

const fs = require('fs');
const path = require('path');

// sharp 라이브러리 체크
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('❌ sharp 라이브러리가 설치되어 있지 않습니다.');
  console.log('   npm install sharp --save-dev 를 실행하세요.\n');
  console.log('또는 아래 온라인 도구를 사용하세요:');
  console.log('   https://svgtopng.com/\n');
  console.log('SVG 파일 위치: public/assets/icons/');
  process.exit(1);
}

const iconsDir = path.join(__dirname, '..', 'public', 'assets', 'icons');
const sizes = [16, 32, 48, 128];

async function convertIcons() {
  console.log('🎨 Converting SVG icons to PNG...\n');

  for (const size of sizes) {
    const svgPath = path.join(iconsDir, `icon-${size}.svg`);
    const pngPath = path.join(iconsDir, `icon-${size}.png`);

    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  icon-${size}.svg not found, skipping...`);
      continue;
    }

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      
      console.log(`✅ icon-${size}.png created`);
    } catch (err) {
      console.error(`❌ Failed to convert icon-${size}.svg:`, err.message);
    }
  }

  console.log('\n✨ Icon conversion complete!');
}

convertIcons();


