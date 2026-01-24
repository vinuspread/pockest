import { encode } from 'blurhash';
import { supabase } from '@/services/supabase/client';

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
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Chrome Extension의 host_permissions를 활용하여 이미지 fetch
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }

            // 2. Blob으로 변환
            const blob = await response.blob();
            
            // 3. Blob URL 생성
            const blobUrl = URL.createObjectURL(blob);

            // 4. Image 로드
            const img = new Image();
            img.src = blobUrl;

            img.onload = () => {
                // Blob URL 해제
                URL.revokeObjectURL(blobUrl);

                // 5. 캔버스 생성 및 리사이징 계산
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

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
                const imageData = ctx.getImageData(0, 0, width, height);
                const blurhash = encode(imageData.data, width, height, 4, 3);

                // 8. WebP Blob 변환
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve({ blob, width, height, blurhash });
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    'image/webp',
                    0.75 // Quality reduced for storage optimization
                );
            };

            img.onerror = (_err) => {
                URL.revokeObjectURL(blobUrl);
                reject(new Error(`Failed to load image from blob: ${imageUrl}`));
            };
        } catch (error) {
            reject(new Error(`Failed to process image: ${imageUrl} - ${error}`));
        }
    });
};

/**
 * 처리된 이미지를 Supabase Storage에 업로드합니다.
 * 경로: thumbnails/{userId}/{timestamp}.webp
 */
export const uploadThumbnail = async (userId: string, blob: Blob): Promise<string> => {
    const timestamp = Date.now();
    const path = `thumbnails/${userId}/${timestamp}.webp`;

    const { error } = await supabase.storage
        .from('pockest')
        .upload(path, blob, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('pockest')
        .getPublicUrl(path);

    return publicUrl;
};
