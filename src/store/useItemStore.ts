import { create } from 'zustand';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from './useAuthStore';
import { usePocketStore } from './usePocketStore';
import type { Item, ItemFilters } from '@/types';

interface ItemState {
    items: Item[];
    itemsLoading: boolean;
    itemsTotal: number;
    itemsError: string | null;
    filters: ItemFilters;
    currentPage: number;
    pageSize: number;
    selectedPocketId: string | null; // Used to track which pocket is currently being viewed

    // Actions
    fetchItemsByPocket: (pocketId: string) => Promise<void>;
    fetchPinnedItems: () => Promise<void>;
    fetchTodayItems: () => Promise<void>;
    fetchTrashItems: () => Promise<void>;
    fetchAllItems: () => Promise<void>;
    searchItems: (query: string) => Promise<void>;

    addItem: (item: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<Item | null>;
    updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
    moveToTrash: (id: string) => Promise<void>;
    restoreFromTrash: (id: string, pocketId?: string) => Promise<void>;
    permanentDelete: (id: string) => Promise<void>;
    togglePin: (id: string) => Promise<void>;

    setFilters: (filters: Partial<ItemFilters>) => void;
    clearFilters: () => void;
    setPage: (page: number) => void;
    resetItemsState: () => void;
}

export const useItemStore = create<ItemState>((set, get) => ({
    items: [],
    itemsLoading: false,
    itemsTotal: 0,
    itemsError: null,
    filters: {},
    currentPage: 1,
    pageSize: 20,
    selectedPocketId: null,

    // ==========================================
    // ITEM FETCH ACTIONS
    // ==========================================
    fetchItemsByPocket: async (pocketId) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        // Context switch check: If same pocket, keep items (refresh). Else clear.
        const isSameContext = get().selectedPocketId === pocketId;
        set({
            items: isSameContext ? get().items : [],
            itemsLoading: true,
            itemsError: null,
            selectedPocketId: pocketId
        });
        console.log('[ItemStore] Fetching Pocket:', pocketId, isSameContext ? '(Refresh)' : '(New)');

        try {
            const { data, error, count } = await supabase
                .from('items')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .eq('pocket_id', pocketId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
        } catch (error: any) {
            set({ itemsLoading: false, itemsError: error.message });
        }
    },

    fetchPinnedItems: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        // Context check: If already null (system view), keep items. 
        // Note: We can't distinguish between 'Pinned' and 'Today' easily without excessive state, 
        // but keeping items for system view refresh is generally safe or acceptable flicker reduction.
        const isSystemView = get().selectedPocketId === null;
        set({
            items: isSystemView ? get().items : [],
            itemsLoading: true,
            itemsError: null,
            selectedPocketId: null
        });
        console.log('[ItemStore] Fetching Pinned Items', isSystemView ? '(Refresh)' : '(New)');

        try {
            const { data, error, count } = await supabase
                .from('items')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .eq('is_pinned', true)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
        } catch (error: any) {
            set({ itemsLoading: false, itemsError: error.message });
        }
    },

    fetchTodayItems: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const isSystemView = get().selectedPocketId === null;
        set({
            items: isSystemView ? get().items : [],
            itemsLoading: true,
            itemsError: null,
            selectedPocketId: null
        });
        console.log('[ItemStore] Fetching Today Items', isSystemView ? '(Refresh)' : '(New)');

        try {
            const oneDayAgo = new Date();
            oneDayAgo.setHours(oneDayAgo.getHours() - 24);

            const { data, error, count } = await supabase
                .from('items')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .gte('created_at', oneDayAgo.toISOString())
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
        } catch (error: any) {
            set({ itemsLoading: false, itemsError: error.message });
        }
    },

    fetchTrashItems: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const isSystemView = get().selectedPocketId === null;
        set({
            items: isSystemView ? get().items : [],
            itemsLoading: true,
            itemsError: null,
            selectedPocketId: null
        });
        console.log('[ItemStore] Fetching Trash Items', isSystemView ? '(Refresh)' : '(New)');

        try {
            const { data, error, count } = await supabase
                .from('items')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false });

            if (error) throw error;
            set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
        } catch (error: any) {
            set({ itemsLoading: false, itemsError: error.message });
        }
    },

    fetchAllItems: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const isSystemView = get().selectedPocketId === null;
        set({
            items: isSystemView ? get().items : [],
            itemsLoading: true,
            itemsError: null,
            selectedPocketId: null
        });
        console.log('[ItemStore] Fetching All Items', isSystemView ? '(Refresh)' : '(New)');

        try {
            const { data, error, count } = await supabase
                .from('items')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
        } catch (error: any) {
            set({ itemsLoading: false, itemsError: error.message });
        }
    },

    searchItems: async (query: string) => {
        const { user } = useAuthStore.getState();
        if (!user || !query.trim()) return;

        // Search always resets items because results are different
        // Search always resets items because results are different
        set({ items: [], itemsLoading: true, itemsError: null, selectedPocketId: null });
        console.log('[ItemStore] Searching items:', query);

        try {
            const { data, error, count } = await supabase
                .from('items')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .ilike('title', `%${query}%`)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
        } catch (error: any) {
            set({ itemsLoading: false, itemsError: '검색 중 오류가 발생했습니다.' });
        }
    },

    // ==========================================
    // CRUD ACTIONS
    // ==========================================
    addItem: async (item) => {
        const { user } = useAuthStore.getState();
        if (!user) return null;

        try {
            let data, error;

            // 1. Attempt insert
            try {
                const result = await supabase
                    .from('items')
                    .insert({ ...item, user_id: user.id })
                    .select()
                    .single();
                data = result.data;
                error = result.error;
            } catch (err) {
                error = err;
            }

            // 2. Retry without blurhash if needed
            if (error && ((error as any).message?.includes('blurhash') || (error as any).code === 'PGRST204')) {
                const { blurhash, ...itemWithoutBlurhash } = item;
                const result = await supabase
                    .from('items')
                    .insert({ ...itemWithoutBlurhash, user_id: user.id })
                    .select()
                    .single();
                data = result.data;
                error = result.error;
            }

            if (error) throw error;
            console.log('[ItemStore] ✅ Item added successfully');

            const addedItem = data as Item;
            const targetPocketId = addedItem.pocket_id;

            // Update Pocket Store Count
            if (targetPocketId) {
                // We'll rely on fetching pockets or exposing an action, but for now let's just re-fetch pockets
                usePocketStore.getState().fetchPockets();

                // Auto-refresh current view if in same pocket
                if (get().selectedPocketId === targetPocketId) {
                    await get().fetchItemsByPocket(targetPocketId);
                }
            }

            return addedItem;
        } catch (error: any) {
            console.error('[ItemStore] ❌ Failed:', error);
            return null;
        }
    },

    updateItem: async (id, updates) => {
        await supabase.from('items').update(updates).eq('id', id);
        set((state) => ({
            items: state.items.map((i) => i.id === id ? { ...i, ...updates } : i)
        }));
    },

    moveToTrash: async (id) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const targetItem = get().items.find((item) => item.id === id);
        if (!targetItem) return;

        console.log('[ItemStore] 🗑️ Starting delete for item:', id);
        console.log('[ItemStore] Current items count:', get().items.length);

        try {
            // 1. 먼저 서버에서 삭제
            console.log('[ItemStore] Updating server...');
            const { data, error } = await supabase
                .from('items')
                .update({
                    deleted_at: new Date().toISOString(),
                    is_pinned: false
                })
                .eq('id', id)
                .eq('user_id', user.id)
                .select();

            console.log('[ItemStore] Server response:', { data, error });

            if (error) throw error;

            // 2. 성공하면 UI에서 제거
            console.log('[ItemStore] Removing from UI...');
            set((state) => ({
                items: state.items.filter((item) => item.id !== id),
            }));
            console.log('[ItemStore] Items after removal:', get().items.length);

            // 3. 포켓 카운트 감소 (리프레시 없이)
            if (targetItem.pocket_id) {
                console.log('[ItemStore] Decrementing pocket count for:', targetItem.pocket_id);
                usePocketStore.getState().decrementPocketCount(targetItem.pocket_id);
            }

            console.log('[ItemStore] ✅ Delete completed successfully');
        } catch (error: any) {
            console.error('[ItemStore] ❌ Failed to move to trash:', error);
            set({ itemsError: '휴지통 이동 실패' });
            throw error; // 에러를 상위로 전달하여 토스트 표시
        }
    },

    restoreFromTrash: async (id) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const targetItem = get().items.find((item) => item.id === id);
        const targetPocketId = targetItem?.pocket_id;

        try {
            if (targetPocketId) {
                const { data: pocket } = await supabase
                    .from('pockets')
                    .select('deleted_at')
                    .eq('id', targetPocketId)
                    .single();

                if (pocket?.deleted_at) {
                    await supabase.from('pockets').update({ deleted_at: null }).eq('id', targetPocketId);
                    await usePocketStore.getState().fetchPockets();
                }
            }

            const { error } = await supabase.from('items').update({ deleted_at: null }).eq('id', id).eq('user_id', user.id);
            if (error) throw error;

            set((state) => ({
                items: state.items.filter((item) => item.id !== id)
            }));

            if (targetPocketId) {
                usePocketStore.getState().fetchPockets();
            }

        } catch (error: any) {
            console.error('[ItemStore] ❌ Failed to restore:', error);
            set({ itemsError: '복구 실패' });
        }
    },

    permanentDelete: async (id) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        set((state) => ({
            items: state.items.filter((item) => item.id !== id),
        }));

        try {
            const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', user.id);
            if (error) throw error;
        } catch (error: any) {
            console.error('[ItemStore] ❌ Failed to delete permanently:', error);
            set({ itemsError: '영구 삭제 실패' });
        }
    },

    togglePin: async (id) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const item = get().items.find((i) => i.id === id);
        if (!item) return;

        const newStatus = !item.is_pinned;
        const oldStatus = item.is_pinned;

        // Optimistic Update
        set((state) => ({
            items: state.items.map((i) => i.id === id ? { ...i, is_pinned: newStatus } : i)
        }));

        // Check if in Pinned View and unpinning
        if (get().selectedPocketId === null && !newStatus) {
            // Logic to verify if we are in "Pinned Only" view is strictly UI based usually.
            // But based on previous store logic:
            // If we are strictly in "Fetch Pinned" mode, unlikely we can know for sure without a flag.
            // However, if the current loaded items are ALL pinned, safe to assume?
            // Let's keep it simple: The UI (Dashboard) should react or we just let it be.
            // Previous store logic had window.location.hash check which is bad coupling.
            // Let's remove UI coupling here.
        }

        try {
            const { error } = await supabase.from('items').update({ is_pinned: newStatus }).eq('id', id).eq('user_id', user.id);
            if (error) throw error;
        } catch (error: any) {
            console.error('[ItemStore] ❌ Failed toggle pin:', error);
            // Rollback
            set((state) => ({
                items: state.items.map((i) => i.id === id ? { ...i, is_pinned: oldStatus } : i)
            }));
        }
    },

    setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters }, currentPage: 1 })),
    clearFilters: () => set({ filters: {}, currentPage: 1 }),
    setPage: (page) => set({ currentPage: page }),
    resetItemsState: () => set({ items: [], filters: {}, itemsError: null, itemsLoading: false }),
}));
