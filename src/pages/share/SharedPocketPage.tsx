import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import { ItemGrid } from '@/components/dashboard/ItemGrid';
import { useAuth } from '@/hooks';
import type { Item, Pocket } from '@/types/database';
import { DndContext } from '@dnd-kit/core';

export default function SharedPocketPage() {
    const { pocketId } = useParams<{ pocketId: string }>();
    const { user } = useAuth();
    const [pocket, setPocket] = useState<Pocket | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSharedData = async () => {
            if (!pocketId) return;

            try {
                setLoading(true);

                // 1. 포켓 정보 가져오기
                const { data: pocketData, error: pocketError } = await supabase
                    .from('pockets')
                    .select('*')
                    .eq('id', pocketId)
                    .single();

                if (pocketError) throw pocketError;
                if (!pocketData.is_public) throw new Error('이 포켓은 비공개 상태입니다.');

                setPocket(pocketData);

                // 2. 아이템 목록 가져오기
                const { data: itemData, error: itemError } = await supabase
                    .from('items')
                    .select('*')
                    .eq('pocket_id', pocketId)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false });

                if (itemError) throw itemError;

                setItems(itemData || []);

            } catch (err: any) {
                console.warn(err);
                setError(err.message || '포켓을 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchSharedData();
    }, [pocketId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !pocket) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="text-4xl mb-4">🔒</div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">접근할 수 없는 포켓입니다</h1>
                <p className="text-gray-500 text-center mb-6">
                    {error === '이 포켓은 비공개 상태입니다.'
                        ? '작성자가 이 포켓을 비공개로 설정했습니다.'
                        : '존재하지 않거나 삭제된 포켓입니다.'}
                </p>
                <a href="/dashboard" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition">
                    내 Pockest로 돌아가기
                </a>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-y-auto bg-gray-50 flex flex-col">
            {/* Header (Read-Only) */}
            <header className="h-16 px-4 md:px-6 flex items-center justify-between bg-white border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <img src="/logo.svg" alt="Pockest" className="w-[100px]" />
                </div>
                {!user && (
                    <a href="/dashboard" className="text-sm font-bold text-primary-600 hover:text-primary-700">
                        나도 시작하기
                    </a>
                )}
            </header>

            {/* Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
                <div className="mb-8 text-center">
                    <div className="inline-block px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-medium mb-3">
                        Shared Pocket
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {pocket.name}
                    </h1>
                    <p className="text-gray-500">
                        총 {items.length}개의 아이템이 담겨있습니다.
                    </p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[500px]">
                    <DndContext> {/* Fix: Context required for ItemCard */}
                        {items.length > 0 ? (
                            <ItemGrid
                                items={items as any}
                                currentView="all"
                                readonly={true}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                                <p>아직 담긴 아이템이 없습니다.</p>
                            </div>
                        )}
                    </DndContext>
                </div>
            </main>
        </div>
    );
}
