
import { cn } from '@/utils';

interface PocketThumbnailProps {
    images?: string[];
    className?: string;
}

export function PocketThumbnail({ images = [], className }: PocketThumbnailProps) {
    const displayImages = images.slice(0, 4);
    const count = displayImages.length;

    if (count === 0) {
        return (
            <div className={cn("w-full h-full bg-gray-50 flex items-center justify-center border border-gray-100", className)}>
                <img
                    src="/icon_thumbnail_default.png"
                    alt="Default"
                    className="w-1/2 h-1/2 object-contain opacity-50"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "/icon_folder_default.svg";
                    }}
                />
            </div>
        );
    }

    if (count === 1) {
        return (
            <div className={cn("w-full h-full rounded-[12px] overflow-hidden", className)}>
                <img src={displayImages[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
            </div>
        );
    }

    if (count === 2) {
        return (
            <div className={cn("w-full h-full grid grid-cols-2 gap-0.5 bg-gray-100 rounded-[12px] overflow-hidden", className)}>
                <div className="relative w-full h-full">
                    <img src={displayImages[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="relative w-full h-full">
                    <img src={displayImages[1]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                </div>
            </div>
        );
    }

    if (count === 3) {
        return (
            <div className={cn("w-full h-full grid grid-cols-2 gap-0.5 bg-gray-100 rounded-[12px] overflow-hidden", className)}>
                <div className="relative w-full h-full row-span-2">
                    <img src={displayImages[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="grid grid-rows-2 gap-0.5 h-full">
                    <div className="relative w-full h-full">
                        <img src={displayImages[1]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div className="relative w-full h-full">
                        <img src={displayImages[2]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        );
    }

    // 4 or more
    return (
        <div className={cn("w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-gray-100 rounded-[12px] overflow-hidden", className)}>
            <div className="relative w-full h-full">
                <img src={displayImages[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="relative w-full h-full">
                <img src={displayImages[1]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="relative w-full h-full">
                <img src={displayImages[2]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="relative w-full h-full">
                <img src={displayImages[3]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
        </div>
    );
}
