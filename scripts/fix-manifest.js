import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.resolve(__dirname, '../dist/manifest.json');

try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // ✅ 빌드된 파일 경로 검증 (CRITICAL)
    if (manifest.background?.service_worker?.endsWith('.ts')) {
        console.error('❌ CRITICAL: background.service_worker는 .js 파일이어야 합니다');
        process.exit(1);
    }
    if (manifest.content_scripts?.some(cs => cs.js?.some(file => file.endsWith('.tsx') || file.endsWith('.ts')))) {
        console.error('❌ CRITICAL: content_scripts.js는 .js 파일이어야 합니다');
        process.exit(1);
    }

    // CSP 설정 추가 (Manifest V3)
    // 'unsafe-inline' 제거 및 필요한 도메인 허용
    manifest.content_security_policy = {
        extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com;"
    };

    // 개발 환경 포트 허용 (HMR 등)
    if (!manifest.host_permissions) {
        manifest.host_permissions = [];
    }
    const devUrls = [
        'http://localhost:3000/*',
        'http://localhost:3001/*',
        'ws://localhost:3001/*',
        'https://accounts.google.com/*',
        'https://*.supabase.co/*',
        'wss://*.supabase.co/*'
    ];

    devUrls.forEach(url => {
        if (!manifest.host_permissions.includes(url)) {
            manifest.host_permissions.push(url);
        }
    });

    // web_accessible_resources v3 format fix
    if (manifest.web_accessible_resources) {
        manifest.web_accessible_resources = manifest.web_accessible_resources.map(resource => {
            if (typeof resource === 'string') {
                return {
                    resources: [resource],
                    matches: ['<all_urls>']
                };
            }
            return resource;
        });
    }

    // 구글 로그인 관련 oauth2 설정 (identity 권한 사용 시 필수)
    // manifest.oauth2 = {
    //     client_id: "YOUR_CLIENT_ID.apps.googleusercontent.com",
    //     scopes: ["https://www.googleapis.com/auth/userinfo.email"]
    // };
    
    // ⚠️ Supabase Auth 사용 시 identity 권한이 불필요할 수 있음
    // Supabase는 브라우저 기반 PKCE 인증을 사용하므로 identity 권한 제거 고려

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Manifest fixed: CSP & Host Permissions updated.');

} catch (error) {
    console.error('Failed to fix manifest:', error);
    process.exit(1);
}
