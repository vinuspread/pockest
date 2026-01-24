
import { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { X, Download, Copy, Share2, Check, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/utils';
import type { Item } from '@/types';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    pocketName: string;
    items: Item[];
    totalPrice: number;
    userName?: string;
    shareUrl: string;
    pocketId?: string; // New
    isPublic?: boolean; // New
    onTogglePublic?: (isPublic: boolean) => void; // New
}

export function ShareModal({
    isOpen,
    onClose,
    pocketName,
    items,
    totalPrice,
    shareUrl,
    pocketId, // New
    isPublic = false, // New
    onTogglePublic // New
}: ShareModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(false);

    // 공유용으로 표시할 아이템 (최대 9개)
    const displayItems = items.slice(0, 9);

    // 나머지 아이템 개수
    const remainingCount = Math.max(0, items.length - 9);
    
    // 이미지 프리로드 (Supabase URL만)
    const preloadImages = useCallback(() => {
        const imageUrls = displayItems
            .filter(item => item.image_url?.includes('supabase.co/storage'))
            .map(item => item.image_url!);
            
        if (imageUrls.length === 0) {
            setImagesLoaded(true);
            return;
        }
        
        let loadedCount = 0;
        imageUrls.forEach(url => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                loadedCount++;
                if (loadedCount === imageUrls.length) {
                    setImagesLoaded(true);
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === imageUrls.length) {
                    setImagesLoaded(true);
                }
            };
            img.src = url;
        });
    }, [displayItems]);
    
    if (!isOpen) return null;

    const handleDownloadImage = async () => {
        if (!cardRef.current) return;

        try {
            setIsGenerating(true);
            
            // 이미지 로딩이 완료될 때까지 대기
            if (!imagesLoaded) {
                await new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        if (imagesLoaded) {
                            clearInterval(checkInterval);
                            resolve(true);
                        }
                    }, 100);
                    
                    // 5초 타임아웃
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve(false);
                    }, 5000);
                });
            }

            // 고해상도 캡처를 위해 scale 증가
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                useCORS: true, // 이미지 CORS 처리 (외부 이미지인 경우 중요)
                allowTaint: false,
                backgroundColor: null,
                logging: false,
            });

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `pockest-${pocketName}.png`;
            link.click();
        } catch (err) {
            console.error('Failed to generate image:', err);
            alert('이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    // 모달이 열릴 때 이미지 프리로드
    useEffect(() => {
        if (isOpen) {
            setImagesLoaded(false);
            preloadImages();
        }
    }, [isOpen]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <Share2 className="w-5 h-5 text-primary-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">포켓 공유하기</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="flex flex-col gap-6 items-center">

                        {/* 📸 Share Card Preview Area (Capture Target) */}
                        <div className="relative shadow-2xl rounded-2xl overflow-hidden transform transition-transform hover:scale-[1.02] duration-300">
                            <div
                                ref={cardRef}
                                className="w-[320px] bg-gradient-to-br from-primary-600 to-indigo-700 text-white p-6 relative overflow-hidden"
                            >
                                {/* Background Decor */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                                {/* Card Header */}
                                <div className="relative z-10 mb-6 text-center">
                                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium mb-3 border border-white/10">
                                        <ShoppingBag className="w-3 h-3" />
                                        <span>My Wishlist</span>
                                    </div>
                                    <h3 className="text-2xl font-bold leading-tight mb-1 drop-shadow-md">
                                        {pocketName}
                                    </h3>
                                    <p className="text-primary-200 text-sm">
                                        {items.length}개의 아이템 • {formatPrice(totalPrice)}
                                    </p>
                                </div>

                                {/* Card Grid */}
                                <div className="relative z-10 grid grid-cols-3 gap-2 mb-6">
                                    {displayItems.map((item) => {
                                        // Supabase Storage URL만 허용 (CORS 문제 방지)
                                        const isSupabaseUrl = item.image_url?.includes('supabase.co/storage');
                                        const safeImageUrl = isSupabaseUrl ? item.image_url : null;
                                        
                                        return (
                                            <div key={item.id} className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm border border-white/50">
                                                {safeImageUrl ? (
                                                    <img
                                                        src={safeImageUrl}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                        <ShoppingBag className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {/* 빈 칸 채우기 (9개 미만일 때) */}
                                    {Array.from({ length: Math.max(0, 9 - items.length) }).map((_, i) => (
                                        <div key={`empty-${i}`} className="aspect-square bg-white/5 rounded-lg border border-white/10" />
                                    ))}

                                    {/* More Badge */}
                                    {remainingCount > 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-20" style={{ gridColumnStart: 3, gridRowStart: 3 }}>
                                            <span className="text-white font-bold">+{remainingCount}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/20">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1.5">
                                            <img src="/logo.svg" alt="Pockest" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold opacity-90">Pockest</span>
                                            <span className="text-[10px] opacity-70">Smart Wishlist</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 text-center max-w-xs">
                            위 이미지가 생성됩니다. 다운로드하여 SNS에 공유해보세요!
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
                    {/* Public Toggle Switch */}
                    {pocketId && onTogglePublic && ( // Only show if pocket exists (not Today/Favorites view)
                        <div className="flex items-center justify-between px-2 py-1">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900">링크로 공유하기</span>
                                <span className="text-xs text-gray-500">활성화하면 누구나 이 링크로 포켓을 볼 수 있습니다.</span>
                            </div>
                            <button
                                onClick={() => onTogglePublic(!isPublic)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${isPublic ? 'bg-primary-600' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`${isPublic ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200`}
                                />
                            </button>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {isPublic && (
                            <button
                                onClick={handleCopyLink}
                                className="flex-1 h-12 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? '복사됨' : '링크 복사'}
                            </button>
                        )}

                        <button
                            onClick={handleDownloadImage}
                            disabled={isGenerating}
                            className={`${isPublic ? 'flex-[2]' : 'flex-[1]'} h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary-200`}
                        >
                            {isGenerating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                            이미지 저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
