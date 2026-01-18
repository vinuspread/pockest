import { PocketCard } from '@/components/PocketCard';
import type { PocketWithCount } from '@/types';

interface FolderGridProps {
    pockets: PocketWithCount[];
    onSelectPocket: (id: string) => void;
    onCreatePocket: () => void;
}

export function FolderGrid({ pockets, onSelectPocket, onCreatePocket }: FolderGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* 포켓 만들기 버튼 카드 */}
            <button
                onClick={onCreatePocket}
                className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-primary-500 hover:border-primary-200 hover:bg-primary-50/50 transition-all group"
            >
                <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center transition-colors">
                    <span className="text-2xl font-light">+</span>
                </div>
                <span className="font-medium">포켓 만들기</span>
            </button>

            {pockets.map((pocket) => (
                <PocketCard
                    key={pocket.id}
                    pocket={pocket}
                    onClick={() => onSelectPocket(pocket.id)}
                    className="aspect-[4/3]"
                />
            ))}
        </div>
    );
}
