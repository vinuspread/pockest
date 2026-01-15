import { Trash2, ExternalLink, RefreshCw, Star } from 'lucide-react';
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
}

export function ItemCard({
    item,
    isTrashView = false,
    onRestore,
    onPermanentDelete,
    onTogglePin,
    onMoveToTrash,
    className
}: ItemCardProps) {
    return (
        <Card className={cn(
            "group overflow-hidden border-0 shadow-sm ring-1 ring-gray-100",
            "hover:shadow-xl hover:ring-primary-100 hover:-translate-y-1",
            "transition-all duration-300 ease-out bg-white rounded-2xl",
            className
        )}>
            {/* 이미지 영역 */}
            <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <span className="text-xs">No Image</span>
                    </div>
                )}

                {/* 오버레이 딤 (호버 시 약간 어둡게) */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

                {/* Top Actions Overlay */}
                {!isTrashView && (
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onTogglePin?.(item.id);
                            }}
                            className={cn(
                                'p-2 rounded-full shadow-lg backdrop-blur-md transition-all transform hover:scale-110 active:scale-95',
                                item.is_pinned
                                    ? 'bg-yellow-400 text-white ring-2 ring-white/50'
                                    : 'bg-white/90 text-gray-400 hover:text-yellow-400'
                            )}
                        >
                            <Star className={cn('w-4 h-4', item.is_pinned && 'fill-current')} />
                        </button>
                    </div>
                )}

                {/* 즐겨찾기 상태면 항상 표시 (호버 아닐때도) */}
                {!isTrashView && item.is_pinned && (
                    <div className="absolute top-0 right-0 p-3 group-hover:opacity-0 transition-opacity duration-200">
                        <div className="p-2 rounded-full bg-yellow-400 text-white shadow-md ring-1 ring-white/30">
                            <Star className="w-4 h-4 fill-current" />
                        </div>
                    </div>
                )}
            </div>

            <CardContent className="p-5 flex flex-col h-[180px]">
                {/* 쇼핑몰 정보 */}
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-medium text-gray-400 truncate">
                        {item.site_name || 'Unknown Site'}
                    </span>
                </div>

                {/* 상품명 */}
                <Tooltip text={item.title}>
                    <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2 mb-3 h-[42px]">
                        {item.title}
                    </h3>
                </Tooltip>

                {/* 가격 */}
                <div className="mb-auto">
                    {item.price ? (
                        <p className="text-lg font-bold text-gray-900 tracking-tight">
                            {formatPrice(item.price, item.currency || 'KRW')}
                        </p>
                    ) : (
                        <p className="text-sm font-medium text-gray-300">가격 정보 없음</p>
                    )}
                </div>

                {/* 하단 액션 영역 */}
                <div className="pt-4 mt-2 border-t border-gray-50 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 font-medium">
                        {formatRelativeTime(item.created_at)}
                    </span>

                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {isTrashView ? (
                            <>
                                <button
                                    onClick={() => onRestore?.(item.id)}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="복구"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onPermanentDelete?.(item.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="영구 삭제"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm"
                                >
                                    <span>구매하기</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                    onClick={() => onMoveToTrash?.(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="휴지통으로 이동"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
