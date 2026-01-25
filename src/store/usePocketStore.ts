import { create } from 'zustand';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from './useAuthStore';
import type { PocketWithCount } from '@/types';

interface PocketState {
  // Pockets
  pockets: PocketWithCount[];
  selectedPocketId: string | null;
  pocketsLoading: boolean;
  pocketsError: string | null;

  // Actions - Pockets
  fetchPockets: () => Promise<void>;
  createPocket: (name: string) => Promise<PocketWithCount | null>;
  updatePocket: (id: string, name: string) => Promise<void>;
  togglePublicPocket: (id: string, isPublic: boolean) => Promise<void>;
  deletePocket: (id: string) => Promise<boolean>;
  selectPocket: (id: string | null) => void;
  decrementPocketCount: (pocketId: string) => void;
  initializeSubscription: () => void;
  unsubscribe: () => void;
  subscription?: any;
}

export const usePocketStore = create<PocketState>((set, get) => ({
  pockets: [],
  selectedPocketId: null,
  pocketsLoading: false,
  pocketsError: null,

  // ==========================================
  // POCKET ACTIONS
  // ==========================================
  fetchPockets: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ pocketsLoading: true, pocketsError: null });

    try {
      const { data, error } = await supabase
        .from('pockets')
        .select('*, items(id, image_url, created_at, deleted_at)')
        .eq('user_id', user.id)
        .is('deleted_at', null) // 🔥 Soft Delete된 포켓 제외
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedPockets: PocketWithCount[] = (data || []).map((pocket: any) => {
        const rawItems = pocket.items || [];
        // 🔥 Filter out deleted items for correct count and thumbnails
        const activeItems = rawItems.filter((i: any) => !i.deleted_at);

        const recentThumbnails = activeItems
          .filter((i: any) => i.image_url)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4)
          .map((i: any) => i.image_url);

        // items 배열 제거하고 반환
        const { items: _, ...rest } = pocket;
        return {
          ...rest,
          item_count: activeItems.length,
          recent_thumbnails: recentThumbnails,
          is_public: pocket.is_public ?? false, // Ensure defaults
        };
      });

      set({ pockets: mappedPockets, pocketsLoading: false });
    } catch (error: any) {
      set({ pocketsLoading: false, pocketsError: error.message });
    }
  },

  createPocket: async (name) => {
    const { user } = useAuthStore.getState();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('pockets')
        .insert({ name, is_default: false, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      await get().fetchPockets(); // 목록 갱신
      return data as PocketWithCount;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  updatePocket: async (id, name) => {
    await supabase.from('pockets').update({ name }).eq('id', id);
    set((state) => ({
      pockets: state.pockets.map((p) => p.id === id ? { ...p, name } : p)
    }));
  },

  togglePublicPocket: async (id, isPublic) => {
    try {
      const { error } = await supabase.from('pockets').update({ is_public: isPublic }).eq('id', id);
      if (error) throw error;
      set((state) => ({
        pockets: state.pockets.map((p) => p.id === id ? { ...p, is_public: isPublic } : p)
      }));
    } catch (error) {
      console.error('[togglePublicPocket] Error:', error);
    }
  },

  deletePocket: async (id) => {
    const previousPockets = get().pockets; // Backup for rollback
    const previousSelected = get().selectedPocketId;

    // 1. Optimistic Update
    set((state) => ({
      pockets: state.pockets.filter((p) => p.id !== id),
      selectedPocketId: state.selectedPocketId === id ? null : state.selectedPocketId
    }));

    try {
      const now = new Date().toISOString();

      // 2. [Cascade] Soft delete items
      const { error: itemsError } = await supabase
        .from('items')
        .update({ deleted_at: now })
        .eq('pocket_id', id)
        .is('deleted_at', null);

      if (itemsError) throw itemsError;

      // 3. Soft delete pocket
      const { error: pocketError } = await supabase
        .from('pockets')
        .update({ deleted_at: now })
        .eq('id', id);

      if (pocketError) throw pocketError;

      console.log('[deletePocket] ✅ Soft deleted pocket and its items:', id);
      await get().fetchPockets(); // Sync
      return true; // Success
    } catch (error: any) {
      console.error('[deletePocket] ❌ Failed:', error);

      // 4. Rollback on failure
      set({
        pockets: previousPockets,
        selectedPocketId: previousSelected,
        pocketsError: '포켓 삭제 실패: ' + (error.message || 'Unknown error')
      });
      return false; // Failed
    }
  },

  selectPocket: (id) => set({ selectedPocketId: id }),

  decrementPocketCount: (pocketId) => {
    set((state) => ({
      pockets: state.pockets.map((pocket) =>
        pocket.id === pocketId
          ? { ...pocket, item_count: Math.max(0, (pocket.item_count || 0) - 1) }
          : pocket
      ),
    }));
  },

  // Realtime Subscription
  initializeSubscription: () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    // 구독이 이미 있으면 스킵
    if (get().subscription) return;

    console.log('[PocketStore] 📡 Subscribing to realtime updates...');

    // Pockets 테이블 변경 감지
    const channel = supabase
      .channel('pocket-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'pockets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[PocketStore] 🔔 Pocket Change received:', payload);
          get().fetchPockets(); // Refresh data
        }
      )
      .subscribe((status) => {
        console.log(`[PocketStore] 📡 Subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          // Debug: Connection successful
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[PocketStore] ❌ Realtime Channel Error - Check Supabase Realtime settings or Network/CSP');
        }
      });

    set({ subscription: channel });
  },

  unsubscribe: () => {
    const sub = get().subscription;
    if (sub) {
      supabase.removeChannel(sub);
      set({ subscription: null });
    }
  }
}));
