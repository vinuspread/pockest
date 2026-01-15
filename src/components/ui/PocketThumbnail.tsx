
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
            <div className={cn("w-full h-full", className)}>
                <img src={displayImages[0]} alt="" className="w-full h-full object-cover" />
            </div>
        );
    }

    if (count === 2) {
        return (
            <div className={cn("w-full h-full flex", className)}>
                <div className="w-1/2 h-full border-r border-white/50">
                    <img src={displayImages[0]} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="w-1/2 h-full">
                    <img src={displayImages[1]} alt="" className="w-full h-full object-cover" />
                </div>
            </div>
        );
    }

    if (count === 3) {
        return (
            <div className={cn("w-full h-full flex", className)}>
                <div className="w-1/2 h-full border-r border-white/50">
                    <img src={displayImages[0]} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="w-1/2 h-full flex flex-col">
                    <div className="h-1/2 w-full border-b border-white/50">
                        <img src={displayImages[1]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="h-1/2 w-full">
                        <img src={displayImages[2]} alt="" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        );
    }

    // 4 or more
    return (
        <div className={cn("w-full h-full grid grid-cols-2", className)}>
            <div className="border-r border-b border-white/50">
                <img src={displayImages[0]} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="border-b border-white/50">
                <img src={displayImages[1]} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="border-r border-white/50">
                <img src={displayImages[2]} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
                <img src={displayImages[3]} alt="" className="w-full h-full object-cover" />
            </div>
        </div>
    );
}
