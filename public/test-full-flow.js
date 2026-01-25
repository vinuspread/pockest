import { parseProductFromPage } from '../src/utils/parser';
import { processImage, uploadThumbnail } from '../src/utils/imageOptimizer';

window.parseProductFromPage = parseProductFromPage;
window.processImage = processImage;
window.uploadThumbnail = uploadThumbnail;

function updateStep(num, status, content) {
  const step = document.getElementById(`step${num}`);
  const contentEl = document.getElementById(`step${num}-content`);
  
  step.className = 'step ' + status;
  contentEl.innerHTML = content;
}

function clearResults() {
  for (let i = 1; i <= 5; i++) {
    updateStep(i, '', '대기 중...');
  }
  document.getElementById('preview').innerHTML = '';
}

async function runFullTest() {
  clearResults();
  const pageUrl = document.getElementById('pageUrl').value;
  
  if (!pageUrl) {
    alert('상품 페이지 URL을 입력하세요!');
    return;
  }

  try {
    // STEP 1: 페이지 HTML 가져오기
    updateStep(1, 'running', '페이지 요청 중...');
    
    const response = await fetch(pageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    updateStep(1, 'success', `✅ 페이지 로드 성공\nHTML 크기: ${(html.length / 1024).toFixed(2)} KB`);

    // STEP 2: 이미지 URL 추출
    updateStep(2, 'running', 'Parser 실행 중...');
    
    if (typeof window.parseProductFromPage === 'undefined') {
      throw new Error('parseProductFromPage 함수를 불러올 수 없습니다. 빌드를 확인하세요.');
    }
    
    const productData = window.parseProductFromPage(doc);
    
    if (!productData.imageUrl && (!productData.imageUrls || productData.imageUrls.length === 0)) {
      throw new Error('이미지 URL을 찾을 수 없습니다.');
    }

    const imageUrl = productData.imageUrl || productData.imageUrls[0];
    const allImages = productData.imageUrls || [productData.imageUrl];
    
    updateStep(2, 'success', 
      `✅ 상품 정보 추출 성공\n` +
      `제목: ${productData.title}\n` +
      `가격: ${productData.price}\n` +
      `대표 이미지: ${imageUrl}\n` +
      `이미지 개수: ${allImages.length}개`
    );

    // 이미지 프리뷰
    showImagePreviews(allImages);

    // STEP 3: 이미지 다운로드
    updateStep(3, 'running', `Fetch 시도 중...\n${imageUrl}`);
    
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Fetch failed: ${imgResponse.status}`);
    
    const blob = await imgResponse.blob();
    
    updateStep(3, 'success', 
      `✅ 이미지 다운로드 성공\n` +
      `크기: ${(blob.size / 1024).toFixed(2)} KB\n` +
      `타입: ${blob.type}`
    );

    // STEP 4: 이미지 처리
    updateStep(4, 'running', '이미지 처리 중 (Resize, WebP, BlurHash)...');
    
    if (typeof window.processImage === 'undefined') {
      throw new Error('processImage 함수를 불러올 수 없습니다.');
    }
    
    const processed = await window.processImage(imageUrl);
    
    updateStep(4, 'success', 
      `✅ 이미지 처리 성공\n` +
      `리사이즈: ${processed.width}x${processed.height}\n` +
      `WebP 크기: ${(processed.blob.size / 1024).toFixed(2)} KB\n` +
      `압축률: ${((1 - processed.blob.size / blob.size) * 100).toFixed(1)}%\n` +
      `BlurHash: ${processed.blurhash.substring(0, 30)}...`
    );

    // STEP 5: Supabase 업로드
    updateStep(5, 'running', 'Supabase Storage 업로드 중...');
    
    // 임시 사용자 ID (실제로는 인증된 사용자 ID 사용)
    const testUserId = 'test-user-' + Date.now();
    
    if (typeof window.uploadThumbnail === 'undefined') {
      throw new Error('uploadThumbnail 함수를 불러올 수 없습니다.');
    }
    
    const uploadedUrl = await window.uploadThumbnail(testUserId, processed.blob);
    
    updateStep(5, 'success', 
      `✅ Supabase 업로드 성공!\n` +
      `저장 경로: ${uploadedUrl}`
    );

    alert('🎉 전체 테스트 성공! 이미지가 정상적으로 처리되고 업로드되었습니다.');

  } catch (error) {
    const currentStep = 
      document.getElementById('step1').classList.contains('running') ? 1 :
      document.getElementById('step2').classList.contains('running') ? 2 :
      document.getElementById('step3').classList.contains('running') ? 3 :
      document.getElementById('step4').classList.contains('running') ? 4 : 5;
    
    updateStep(currentStep, 'error', 
      `❌ 오류 발생:\n${error.message}\n\n` +
      `Stack:\n${error.stack}`
    );
    
    alert('❌ 테스트 실패! 위의 오류 메시지를 확인하세요.');
  }
}

function showImagePreviews(imageUrls) {
  const preview = document.getElementById('preview');
  preview.innerHTML = '<h3 style="grid-column: 1/-1; margin: 20px 0 10px;">📸 추출된 이미지 미리보기:</h3>';
  
  imageUrls.slice(0, 6).forEach((url, index) => {
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.innerHTML = `
      <img src="${url}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>Error</text></svg>'">
      <div class="preview-info">이미지 ${index + 1}</div>
    `;
    preview.appendChild(div);
  });
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('runTestBtn')?.addEventListener('click', runFullTest);
  document.getElementById('clearBtn')?.addEventListener('click', clearResults);
});
