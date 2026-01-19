import { encode } from 'blurhash';
import { supabase } from '@/services/supabase/client';

interface ProcessedImage {
    blob: Blob;
    width: number;
    height: number;
    blurhash: string;
}

const MAX_WIDTH = 300;

/**
 * 이미지 URL을 받아 리사이징(최대 600px), WebP 변환, BlurHash 생성을 수행합니다.
 * 주의: CORS 문제가 발생할 수 있으므로, 원본 이미지가 CORS 헤더를 지원해야 합니다.
 * Extension Context에서는 content script에서 fetch하여 blob으로 전달하는 것이 안전할 수 있습니다.
 */
export const processImage = async (imageUrl: string): Promise<ProcessedImage> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = () => {
            // 1. 캔버스 생성 및 리사이징 계산
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

            // 2. 이미지 그리기
            ctx.drawImage(img, 0, 0, width, height);

            // 3. BlurHash 생성 (32x32 픽셀 정도의 작은 데이터로 계산)
            const imageData = ctx.getImageData(0, 0, width, height);
            const blurhash = encode(imageData.data, width, height, 4, 3);

            // 4. WebP Blob 변환
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
            reject(new Error(`Failed to load image: ${imageUrl}`));
        };
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
