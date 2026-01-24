import { ItemCard } from '@/components/ItemCard';
import { useItems } from '@/hooks';
import type { Item } from '@/types';

interface ItemGridProps {
    items: Item[];
    currentView: string;
    readonly?: boolean; // New
}

export function ItemGrid({ items, currentView, readonly = false }: ItemGridProps) {
    const { restore, delete: permanentDelete, togglePin, trash } = useItems();

    const isTrashView = currentView === 'trash';

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1440px]:grid-cols-6 gap-6 pb-10">
            {items.map((item) => (
                <ItemCard
                    key={item.id}
                    item={item}
                    isTrashView={isTrashView}
                    onRestore={(id: string) => {
                        if (confirm('이 상품을 복구하시겠습니까?')) restore(id);
                    }}
                    onPermanentDelete={(id: string) => {
                        if (confirm('⚠️ 이 상품을 영구 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.')) permanentDelete(id);
                    }}
                    onTogglePin={togglePin}
                    onMoveToTrash={(id: string) => {
                        if (confirm('이 상품을 휴지통으로 이동하시겠습니까?')) trash(id);
                    }}
                    readOnly={readonly} // Pass readOnly
                />
            ))}
        </div>
    );
}
