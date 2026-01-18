

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/utils';
import { PocketThumbnail } from './ui/PocketThumbnail';
import type { PocketWithCount } from '@/types';

interface PocketCardProps {
    pocket: PocketWithCount;
    onClick?: () => void;
    className?: string;
}

export const PocketCard = memo(function PocketCard({ pocket, onClick, className }: PocketCardProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: pocket.id,
        data: { type: 'pocket', pocket }
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                'group bg-white rounded-[20px] overflow-hidden cursor-pointer',
                isOver ? 'border-2 border-primary-500 bg-primary-50' : 'border border-[#EEE]',
                'p-3 flex flex-col gap-3', // Padding 12px, Gap 12px
                'hover:border-primary-200 hover:shadow-xl hover:-translate-y-1',
                'transition-all duration-300 ease-out',
                'shadow-sm',
                'will-change-transform [backface-visibility:hidden]', // Fix for font aliasing
                className
            )}
        >
            {/* 썸네일 그리드 (2x2) */}
            <div className="aspect-square bg-gray-50 relative overflow-hidden rounded-[12px] group-hover:opacity-90 transition-opacity">
                <PocketThumbnail
                    images={pocket.recent_thumbnails}
                    className="w-full h-full"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>

            {/* 정보 영역 */}
            <div className="px-1 pb-1"> {/* Minimal padding for text alignment */}
                <h3 className="font-bold text-gray-900 text-lg mb-0.5 truncate group-hover:text-primary-600 transition-colors">
                    {pocket.name}
                </h3>
                <p className="text-gray-500 text-sm">
                    {pocket.item_count || 0}개 상품
                </p>
            </div>
        </div>
    );
});
