import { encode } from 'blurhash';
import { supabase } from '@/services/supabase/client';
import { logger } from './logger';

interface ProcessedImage {
    blob: Blob;
    width: number;
    height: number;
    blurhash: string;
}

const MAX_WIDTH = 200;

/**
 * 이미지 URL을 받아 리사이징(최대 200px), WebP 변환, BlurHash 생성을 수행합니다.
 * Chrome Extension의 host_permissions를 활용하여 CORS 문제를 우회합니다.
 */
export const processImage = async (imageUrl: string): Promise<ProcessedImage> => {
    logger.log('[ImageOptimizer] Starting process for:', imageUrl);
    
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Background Service Worker를 통해 이미지 fetch (CORS 우회)
            logger.log('[ImageOptimizer] Requesting image from Background...');
            
            const bgResponse = await chrome.runtime.sendMessage({
                type: 'FETCH_IMAGE',
                payload: imageUrl
            });
            
            logger.log('[ImageOptimizer] Background response:', bgResponse);
            
            if (!bgResponse.success) {
                throw new Error(bgResponse.error || 'Background fetch failed');
            }

            // 2. Base64를 Blob으로 변환
            logger.log('[ImageOptimizer] Converting base64 to blob...');
            const { base64, type } = bgResponse.data;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type });
            
            logger.log('[ImageOptimizer] Blob created:', {
                size: blob.size,
                type: blob.type
            });
            
            // 3. Blob URL 생성
            const blobUrl = URL.createObjectURL(blob);

            // 4. Image 로드
            const img = new Image();
            img.src = blobUrl;

            img.onload = () => {
                // Blob URL 해제
                URL.revokeObjectURL(blobUrl);
                
                logger.log('[ImageOptimizer] Image loaded successfully:', {
                    width: img.width,
                    height: img.height
                });

                // 5. 캔버스 생성 및 리사이징 계산
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                
                logger.log('[ImageOptimizer] Resizing:', {
                    original: { width: img.width, height: img.height },
                    resized: { width, height }
                });

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // 6. 이미지 그리기
                ctx.drawImage(img, 0, 0, width, height);

                // 7. BlurHash 생성
                logger.log('[ImageOptimizer] Generating blurhash...');
                const imageData = ctx.getImageData(0, 0, width, height);
                const blurhash = encode(imageData.data, width, height, 4, 3);
                logger.log('[ImageOptimizer] Blurhash generated:', blurhash.substring(0, 20) + '...');

                // 8. WebP Blob 변환
                logger.log('[ImageOptimizer] Converting to WebP...');
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            logger.log('[ImageOptimizer] WebP conversion successful:', {
                                size: blob.size,
                                type: blob.type,
                                compressionRatio: ((1 - blob.size / imageData.data.length) * 100).toFixed(1) + '%'
                            });
                            resolve({ blob, width, height, blurhash });
                        } else {
                            logger.error('[ImageOptimizer] Canvas to Blob conversion failed');
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    'image/webp',
                    0.75 // Quality reduced for storage optimization
                );
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(blobUrl);
                logger.error('[ImageOptimizer] Image load error:', {
                    imageUrl,
                    error: err
                });
                reject(new Error(`Failed to load image from blob: ${imageUrl}`));
            };
        } catch (error) {
            logger.error('[ImageOptimizer] Process failed:', {
                imageUrl,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            reject(error);
        }
    });
};

/**
 * 처리된 이미지를 Supabase Storage에 업로드합니다.
 * 경로: thumbnails/{userId}/{timestamp}.webp
 */
export const uploadThumbnail = async (userId: string, blob: Blob): Promise<string> => {
    logger.log('[ImageOptimizer] Uploading to Supabase Storage...', {
        userId,
        blobSize: blob.size,
        blobType: blob.type
    });
    
    const timestamp = Date.now();
    const path = `thumbnails/${userId}/${timestamp}.webp`;
    
    logger.log('[ImageOptimizer] Upload path:', path);

    const { data, error } = await supabase.storage
        .from('pockest')
        .upload(path, blob, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        logger.error('[ImageOptimizer] Upload failed:', {
            path,
            error: error.message,
            statusCode: (error as any).statusCode,
            details: error
        });
        throw error;
    }
    
    logger.log('[ImageOptimizer] Upload successful:', data);

    const { data: { publicUrl } } = supabase.storage
        .from('pockest')
        .getPublicUrl(path);
    
    logger.log('[ImageOptimizer] Public URL generated:', publicUrl);

    return publicUrl;
};
