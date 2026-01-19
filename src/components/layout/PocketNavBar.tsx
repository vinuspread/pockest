import { useRef, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { PocketThumbnail } from '@/components/ui/PocketThumbnail';
import { cn } from '@/utils';
import type { PocketWithCount } from '@/types';

interface PocketNavBarProps {
    pockets: PocketWithCount[];
    selectedPocketId: string | null;
    onSelectPocket: (id: string) => void;
    className?: string;
}

export function PocketNavBar({
    pockets,
    selectedPocketId,
    onSelectPocket,
    className,
}: PocketNavBarProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);


    // 선택된 포켓이 있으면 스크롤을 해당 위치로 이동 (UX 향상)
    useEffect(() => {
        if (selectedPocketId && scrollContainerRef.current) {
            const selectedElement = scrollContainerRef.current.querySelector(`[data-pocket-id="${selectedPocketId}"]`) as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [selectedPocketId]);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div
            className={cn(
                'w-full sticky top-0 z-10 py-1 bg-white/95 backdrop-blur-sm', // Header 높이 고려. Sticky top.
                className
            )}
        >
            <div
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={cn(
                    "flex items-center gap-2 px-4 md:px-6 py-[14px] overflow-x-auto no-scrollbar scroll-smooth",
                    isDragging ? "cursor-grabbing scroll-auto" : "cursor-grab"
                )}
                style={{
                    scrollbarWidth: 'none',  /* Firefox */
                    msOverflowStyle: 'none',  /* IE 10+ */
                }}
            >
                <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}</style>
                {pockets.map((pocket) => (
                    <DroppablePocketPill
                        key={pocket.id}
                        pocket={pocket}
                        isSelected={selectedPocketId === pocket.id}
                        onClick={() => onSelectPocket(pocket.id)}
                    />
                ))}
            </div>
        </div>
    );
}

interface DroppablePocketPillProps {
    pocket: PocketWithCount;
    isSelected: boolean;
    onClick: () => void;
}

function DroppablePocketPill({ pocket, isSelected, onClick }: DroppablePocketPillProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: pocket.id,
        data: { type: 'pocket', pocket }
    });

    return (
        <button
            ref={setNodeRef}
            data-pocket-id={pocket.id}
            onClick={(e) => {
                e.stopPropagation(); // 드래그 이벤트 전파 방지? click은 전파되어야 함. 일단 유지.
                onClick();
            }}
            className={cn(
                'flex-shrink-0 flex items-center gap-[14px] p-[14px] rounded-[20px] transition-all duration-200 border',
                'shadow-[0_4px_8px_0_rgba(0,0,0,0.06)]',
                isOver ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500 scale-105 z-20' : '',
                !isOver && isSelected
                    ? 'bg-white border-primary-600 ring-1 ring-primary-600'
                    : !isOver && 'bg-white border-[#EEE] hover:border-primary-200'
            )}
        >
            {/* Thumbnail Image */}
            <div className="w-[28px] h-[28px] rounded-[6px] overflow-hidden bg-gray-100 flex-shrink-0 relative">
                <PocketThumbnail
                    images={pocket.recent_thumbnails?.[0] ? [pocket.recent_thumbnails[0]] : []}
                    className="w-full h-full"
                />
            </div>

            {/* Text */}
            <span className={cn(
                "text-[16px] font-bold tracking-[-0.03em] whitespace-nowrap",
                isSelected ? "text-primary-700" : "text-[#333]"
            )}>
                {pocket.name}
            </span>

            {/* Count Badge */}
            {pocket.item_count !== undefined && (
                <span className={cn(
                    "px-3 py-1 rounded-full text-[13px] font-semibold",
                    isSelected
                        ? "bg-primary-50 text-primary-600"
                        : "bg-[#F5F5F5] text-[#999]"
                )}>
                    {pocket.item_count}
                </span>
            )}
        </button>
    );
}

