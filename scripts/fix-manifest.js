/**
 * Post-build script: manifest.json 수정
 * @crxjs/vite-plugin이 side_panel 설정을 제대로 처리하지 못하는 문제 해결
 */

const fs = require('fs');
const path = require('path');

const distManifestPath = path.resolve(__dirname, '../dist/manifest.json');

if (!fs.existsSync(distManifestPath)) {
  console.error('❌ dist/manifest.json not found. Run build first.');
  process.exit(1);
}

// 현재 manifest 읽기
const manifest = JSON.parse(fs.readFileSync(distManifestPath, 'utf-8'));

console.log('🔧 Fixing manifest.json for Side Panel support...');

// 1. action에서 default_popup 완전 제거 (핵심!)
if (manifest.action) {
  if (manifest.action.default_popup) {
    console.log('  ✓ Removing default_popup from action');
    delete manifest.action.default_popup;
  }
  // action 객체가 비어있으면 기본값 설정
  if (!manifest.action.default_title) {
    manifest.action.default_title = 'Pockest';
  }
}

// 2. permissions 재정렬 (sidePanel을 맨 앞에)
const requiredPermissions = ['identity', 'sidePanel', 'storage', 'tabs', 'scripting', 'activeTab'];
manifest.permissions = requiredPermissions;
console.log('  ✓ Permissions set:', manifest.permissions.join(', '));

// 3. side_panel 설정 강제 추가
manifest.side_panel = {
  default_path: 'src/pages/popup/index.html'
};
console.log('  ✓ side_panel configuration set');

// 4. 아이콘 설정 확인
if (!manifest.icons) {
  manifest.icons = {
    "16": "assets/icons/icon-16.png",
    "32": "assets/icons/icon-32.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  };
  console.log('  ✓ Icons configuration added');
}

// 5. action.default_icon 설정
if (manifest.action && !manifest.action.default_icon) {
  manifest.action.default_icon = {
    "16": "assets/icons/icon-16.png",
    "32": "assets/icons/icon-32.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  };
  console.log('  ✓ action.default_icon added');
}

// 수정된 manifest 저장
fs.writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2));

console.log('✅ manifest.json fixed successfully!');
console.log('');
console.log('Final manifest.json:');
console.log(JSON.stringify(manifest, null, 2));
