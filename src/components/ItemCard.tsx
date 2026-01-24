import { memo } from 'react';
import { Trash2, RefreshCw, Star } from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn, formatPrice, formatRelativeTime } from '@/utils';
import { Card, CardContent, Tooltip } from '@/components/ui';
import type { Item } from '@/types';

interface ItemCardProps {
    item: Item;
    isTrashView?: boolean;
    onRestore?: (id: string) => void;
    onPermanentDelete?: (id: string) => void;
    onTogglePin?: (id: string) => void;
    onMoveToTrash?: (id: string) => void;
    className?: string;
    readOnly?: boolean;
}

export const ItemCard = memo(function ItemCard({
    item,
    isTrashView = false,
    onRestore,
    onPermanentDelete,
    onTogglePin,
    onMoveToTrash,
    className,
    readOnly = false // New
}: ItemCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: { type: 'item', item },
        disabled: readOnly // Disable drag if readOnly
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleAffiliateClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        // 드래그 중이거나 특수 키(Ctrl/Cmd) 클릭 시 기본 동작 유지
        if (isDragging || e.ctrlKey || e.metaKey || e.shiftKey) return;

        e.preventDefault();

        // 1. 팝업 차단 방지 및 빠른 이동을 위해 우선 원본 열기
        const win = window.open(item.url, '_blank');

        try {
            // 2. Edge Function을 통해 제휴 링크 생성
            const { data, error } = await supabase.functions.invoke('get-affiliate-link', {
                body: { url: item.url, itemId: item.id }
            });

            if (error) throw error;

            // 3. 제휴 링크가 생성되었고, 원본과 다르다면 리다이렉트 (쿠키 심기)
            if (data?.affiliateUrl && data.affiliateUrl !== item.url && win) {
                win.location.href = data.affiliateUrl;
            }
        } catch (err) {
            console.warn('[ItemCard] Affiliate link generation failed:', err);
            // 실패해도 이미 원본이 열려있으므로 사용자 경험 저해 없음
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="h-full">
            <Card className={cn(
                "group overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 h-full flex flex-col",
                "transition-all duration-300 ease-out bg-white rounded-[20px]",
                "will-change-transform [backface-visibility:hidden]", // Fix for font aliasing
                className
            )}>
                {/* 1. Image Area with Padding */}
                <div className="p-3 pb-0">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50">
                        {!isTrashView && item.url ? (
                            <a
                                href={item.url}
                                onClick={handleAffiliateClick}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full h-full cursor-pointer group/image"
                            >
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.title}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <span className="text-xs">No Image</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                            </a>
                        ) : (
                            <>
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.title}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <span className="text-xs">No Image</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                            </>
                        )}

                        {/* Star Button (Top-Left) */}
                        {!isTrashView && !readOnly && ( // Hide star if readOnly
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onTogglePin?.(item.id);
                                }}
                                className={cn(
                                    'absolute top-3 left-3 p-2 rounded-full shadow-md backdrop-blur-sm transition-all active:scale-95 z-10',
                                    item.is_pinned
                                        ? 'bg-white text-[#7548B8] ring-1 ring-black/5'
                                        : 'bg-white/90 text-gray-400 hover:text-[#7548B8]'
                                )}
                            >
                                <Star className={cn('w-5 h-5', item.is_pinned && 'fill-current')} />
                            </button>
                        )}
                    </div>
                </div>

                <CardContent className="p-3 flex flex-col">
                    {/* 2. Platform Name */}
                    <div className="mb-2">
                        <span className="text-xs font-bold text-primary-600">
                            {item.site_name || 'Shopping'}
                        </span>
                    </div>

                    {/* 3. Title */}
                    <Tooltip text={item.title}>
                        <h3 className="font-medium text-gray-900 text-sm leading-snug line-clamp-2 h-[40px] mb-2">
                            {item.title}
                        </h3>
                    </Tooltip>

                    {/* 4. Price & Date */}
                    <div className="flex items-end justify-between mb-4 border-b border-dashed border-gray-100 pb-3">
                        <div className="text-2xl font-bold text-gray-900 tracking-tight">
                            {item.price ? formatPrice(item.price, item.currency || 'KRW') : '-'}
                        </div>
                        <span className="text-xs text-gray-400 mb-1 font-medium">
                            {formatRelativeTime(item.created_at)}
                        </span>
                    </div>

                    {/* 5. Action Buttons */}
                    <div className="flex gap-2 h-11">
                        {isTrashView ? (
                            <>
                                <button
                                    onClick={() => onRestore?.(item.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>복구</span>
                                </button>
                                <button
                                    onClick={() => onPermanentDelete?.(item.id)}
                                    className="w-[30%] flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <>
                                <a
                                    href={item.url}
                                    onClick={handleAffiliateClick}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-[2] flex items-center justify-center gap-1.5 bg-primary-50 text-primary-600 font-bold text-sm rounded-xl hover:bg-primary-600 hover:text-white shadow-sm hover:shadow-lg hover:shadow-primary-200 transition-all hover:-translate-y-0.5"
                                >
                                    <span>구매하기</span>
                                </a>
                                {!readOnly && (
                                    <button
                                        onClick={() => onMoveToTrash?.(item.id)}
                                        className="flex-1 flex items-center justify-center bg-gray-100 text-gray-400 font-bold text-sm rounded-xl hover:bg-gray-200 hover:text-gray-600 transition-colors"
                                    >
                                        <span>삭제</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});
