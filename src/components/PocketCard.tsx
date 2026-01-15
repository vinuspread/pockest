

import { cn } from '@/utils';
import { PocketThumbnail } from './ui/PocketThumbnail';
import type { PocketWithCount } from '@/types';

interface PocketCardProps {
    pocket: PocketWithCount;
    onClick?: () => void;
    className?: string;
}

export function PocketCard({ pocket, onClick, className }: PocketCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'group bg-white rounded-2xl overflow-hidden cursor-pointer',
                'border border-gray-100',
                'hover:border-primary-200 hover:shadow-xl hover:-translate-y-1',
                'transition-all duration-300 ease-out',
                // Shadow handling: The user was debating this.
                // We'll add a subtle shadow by default to give it depth (Shadow "meaning" folder box).
                'shadow-sm',
                className
            )}
        >
            {/* 썸네일 그리드 (2x2) */}
            <div className="aspect-square bg-gray-50 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                <PocketThumbnail
                    images={pocket.recent_thumbnails}
                    className="w-full h-full"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>

            {/* 정보 영역 */}
            <div className="p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-1 truncate group-hover:text-primary-600 transition-colors">
                    {pocket.name}
                </h3>
                <p className="text-gray-500 text-sm">
                    {pocket.item_count || 0}개 상품
                </p>
            </div>
        </div>
    );
}
