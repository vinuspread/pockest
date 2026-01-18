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
  deletePocket: (id: string) => Promise<void>;
  selectPocket: (id: string | null) => void;
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
    // 1. Optimistic Update
    set((state) => ({
      pockets: state.pockets.filter((p) => p.id !== id),
      selectedPocketId: state.selectedPocketId === id ? null : state.selectedPocketId
    }));

    try {
      const now = new Date().toISOString();

      // 2. [Cascade] 해당 포켓의 모든 아이템도 Soft Delete (휴지통으로 이동)
      await supabase
        .from('items')
        .update({ deleted_at: now })
        .eq('pocket_id', id)
        .is('deleted_at', null); // 이미 삭제된 건 건드리지 않음

      // 3. 포켓 Soft Delete
      const { error } = await supabase
        .from('pockets')
        .update({ deleted_at: now })
        .eq('id', id);

      if (error) throw error;

      console.log('[deletePocket] ✅ Soft deleted pocket and its items:', id);

      // 🔥 [Sync] Ensure state is synchronized with server truth
      await get().fetchPockets();
    } catch (error) {
      console.error('[deletePocket] ❌ Failed:', error);
      // 롤백 로직이 복잡하므로 여기선 새로고침 유도 에러 메시지
      set({ pocketsError: '포켓 삭제 실패. 새로고침 해주세요.' });
    }
  },

  selectPocket: (id) => set({ selectedPocketId: id }),
}));
