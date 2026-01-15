import { create } from 'zustand';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from './useAuthStore';
import type { PocketWithCount, Item, ItemFilters } from '@/types';
// import type { PocketInsert, ItemInsert, ItemUpdate } from '@/types/database';

interface PocketState {
  // Pockets
  pockets: PocketWithCount[];
  selectedPocketId: string | null;
  pocketsLoading: boolean;
  pocketsError: string | null;

  // Items
  items: Item[];
  itemsLoading: boolean;
  itemsTotal: number;
  itemsError: string | null;

  // Filters (UI용 상태일 뿐, Fetch에 관여하지 않음)
  filters: ItemFilters;
  currentPage: number;
  pageSize: number;

  // Actions - Pockets
  fetchPockets: () => Promise<void>;
  createPocket: (name: string) => Promise<PocketWithCount | null>;
  updatePocket: (id: string, name: string) => Promise<void>;
  deletePocket: (id: string) => Promise<void>;
  selectPocket: (id: string | null) => void;

  // Actions - Items (완전 분리된 함수들)
  fetchItemsByPocket: (pocketId: string) => Promise<void>;
  fetchPinnedItems: () => Promise<void>;
  fetchTodayItems: () => Promise<void>;
  fetchTrashItems: () => Promise<void>;
  fetchAllItems: () => Promise<void>;
  searchItems: (query: string) => Promise<void>;

  // CRUD
  addItem: (item: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<Item | null>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string, pocketId?: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;

  // UI State
  setFilters: (filters: Partial<ItemFilters>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  resetItemsState: () => void;
}

export const usePocketStore = create<PocketState>((set, get) => ({
  pockets: [],
  selectedPocketId: null,
  pocketsLoading: false,
  pocketsError: null,
  items: [],
  itemsLoading: false,
  itemsTotal: 0,
  itemsError: null,
  filters: {},
  currentPage: 1,
  pageSize: 20,

  // ==========================================
  // 1. POCKET ACTIONS
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
      set({ pocketsError: '폴더 삭제 실패. 새로고침 해주세요.' });
    }
  },

  selectPocket: (id) => set({ selectedPocketId: id, currentPage: 1 }),

  // ==========================================
  // 2. ITEM FETCH ACTIONS (SILO PATTERN)
  // ==========================================

  // A. 특정 포켓 조회 (절대 즐겨찾기 필터 안 봄)
  fetchItemsByPocket: async (pocketId) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    // 초기화: 기존 데이터 비우기 (잔상 제거)
    set({ items: [], itemsLoading: true, itemsError: null, selectedPocketId: pocketId });
    console.log('[Silo] Fetching Pocket:', pocketId);

    try {
      const { data, error, count } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('pocket_id', pocketId) // 오직 포켓 ID만 조건
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
    } catch (error: any) {
      set({ itemsLoading: false, itemsError: error.message });
    }
  },

  // B. 즐겨찾기 조회 (절대 포켓 필터 안 봄)
  fetchPinnedItems: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ items: [], itemsLoading: true, itemsError: null, selectedPocketId: null });
    console.log('[Silo] Fetching Pinned Items');

    try {
      const { data, error, count } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_pinned', true) // 오직 즐겨찾기만 조건
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
    } catch (error: any) {
      set({ itemsLoading: false, itemsError: error.message });
    }
  },

  // C. 오늘 저장 조회
  fetchTodayItems: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ items: [], itemsLoading: true, itemsError: null, selectedPocketId: null });
    console.log('[Silo] Fetching Today Items');

    try {
      // 24시간 로직 (DB 함수 사용 권장하지만, 일단 쿼리로 직접 구현)
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

  // D. 휴지통 조회
  fetchTrashItems: async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('[fetchTrashItems] ⚠️ No user, skipping');
      return;
    }

    set({ items: [], itemsLoading: true, itemsError: null, selectedPocketId: null });
    console.log('[Silo] 🗑️ Fetching Trash Items');

    try {
      const { data, error, count } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null) // deleted_at이 있는 것만 조회
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
      console.log('[fetchTrashItems] ✅ Loaded', data?.length || 0, 'items');
    } catch (error: any) {
      console.error('[fetchTrashItems] ❌ Error:', error);
      set({ itemsLoading: false, itemsError: error.message });
    }
  },

  // E. 전체 조회
  fetchAllItems: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ items: [], itemsLoading: true, itemsError: null, selectedPocketId: null });
    console.log('[Silo] Fetching All Items');

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

  // F. 검색 (Global Search)
  searchItems: async (query: string) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('[searchItems] ⚠️ No user, skipping');
      return;
    }

    // 빈 검색어 방지
    if (!query.trim()) {
      console.log('[searchItems] ⚠️ Empty query, skipping');
      return;
    }

    set({ items: [], itemsLoading: true, itemsError: null, selectedPocketId: null });
    console.log('[Silo] 🔍 Searching items:', query);

    try {
      const { data, error, count } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .ilike('title', `%${query}%`) // 제목 부분 일치 검색 (Case-insensitive)
        .is('deleted_at', null) // 삭제된 것 제외
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ items: data as Item[], itemsTotal: count || 0, itemsLoading: false });
      console.log('[searchItems] ✅ Found', data?.length || 0, 'items');
    } catch (error: any) {
      console.error('[searchItems] ❌ Error:', error);
      set({ itemsLoading: false, itemsError: '검색 중 오류가 발생했습니다.' });
    }
  },

  // ==========================================
  // 3. CRUD ACTIONS
  // ==========================================
  addItem: async (item) => {
    const { user } = useAuthStore.getState();
    if (!user) return null;

    try {
      let data, error;

      // 1차 시도: 모든 필드 포함 (blurhash 포함)
      try {
        const result = await supabase
          .from('items')
          .insert({ ...item, user_id: user.id })
          .select()
          .single();
        data = result.data;
        error = result.error;
      } catch (err) {
        // Supabase 클라이언트단 예외 발생 시
        error = err;
      }

      // 2차 시도: blurhash 컬럼이 없어서 실패한 경우, 제외하고 재시도
      if (error && ((error as any).message?.includes('blurhash') || (error as any).details?.includes('blurhash') || (error as any).code === 'PGRST204')) {
        console.warn('[addItem] ⚠️ blurhash column missing, retrying without it...');
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

      if (error) throw error;

      console.log('[addItem] ✅ Item added successfully');

      // 🔥 [New] 사이드바 포켓 카운트 실시간 증가 (+1)
      const addedItem = data as Item;
      const targetPocketId = addedItem.pocket_id;

      if (targetPocketId) {
        set((state) => ({
          pockets: state.pockets.map((pocket) => {
            if (pocket.id === targetPocketId && pocket.item_count !== undefined) {
              const newCount = pocket.item_count + 1;
              console.log('[addItem] 📊 Count sync:', pocket.name, pocket.item_count, '→', newCount);
              return { ...pocket, item_count: newCount };
            }
            return pocket;
          })
        }));

        // 🔥 [New] 현재 보고 있는 폴더가 추가된 아이템의 폴더와 같으면 자동 새로고침
        const currentState = get();
        if (currentState.selectedPocketId === targetPocketId) {
          console.log('[addItem] 🔄 Auto-refreshing current pocket view:', targetPocketId);
          await get().fetchItemsByPocket(targetPocketId);
        }
      }

      return addedItem;
    } catch (error: any) {
      console.error('[addItem] ❌ Failed:', error);
      // For debugging only: show specific error
      alert(`Save Failed: ${error.message || JSON.stringify(error)}`);
      return null;
    }
  },

  updateItem: async (id, updates) => {
    await supabase.from('items').update(updates).eq('id', id);
    set((state) => ({
      items: state.items.map((i) => i.id === id ? { ...i, ...updates } : i)
    }));
  },

  // [Action] 휴지통으로 이동 (Soft Delete - Silent Update + Real-time Count Sync)
  moveToTrash: async (id) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    // [Step 1] 삭제 전, 해당 아이템이 어떤 포켓 소속인지 찾음
    const targetItem = get().items.find((item) => item.id === id);
    const targetPocketId = targetItem?.pocket_id;

    console.log('[moveToTrash] 🗑️ Moving to trash (Silent):', id, '| Pocket:', targetPocketId);

    // ✅ [Step 2] Optimistic Update: UI에서 즉시 제거 + 사이드바 카운트 동기화
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),

      // 🔥 [New] 사이드바 포켓 카운트 실시간 감소 (-1)
      pockets: state.pockets.map((pocket) => {
        if (pocket.id === targetPocketId && pocket.item_count !== undefined) {
          const newCount = Math.max(0, pocket.item_count - 1);
          console.log('[moveToTrash] 📊 Count sync:', pocket.name, pocket.item_count, '→', newCount);
          return { ...pocket, item_count: newCount };
        }
        return pocket;
      })
    }));

    try {
      const { error } = await supabase
        .from('items')
        .update({
          deleted_at: new Date().toISOString(),
          is_pinned: false // 휴지통 이동 시 즐겨찾기 해제
        })
        .eq('id', id)
        .eq('user_id', user.id); // 보안: 본인 아이템만

      if (error) throw error;

      console.log('[moveToTrash] ✅ Success (Network-free count sync)');
    } catch (error: any) {
      console.error('[moveToTrash] ❌ Failed:', error);
      set({ itemsError: '휴지통 이동 실패' });

      // TODO: 실패 시 아이템 복원 + 카운트 롤백
    }
  },

  // [Action] 휴지통에서 복구 (Silent Update + Real-time Count Sync)
  restoreFromTrash: async (id) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    // [Step 1] 복구 전, 해당 아이템이 어떤 포켓으로 돌아갈지 찾음
    const targetItem = get().items.find((item) => item.id === id);
    const targetPocketId = targetItem?.pocket_id;

    console.log('[restoreFromTrash] 🔄 Restoring (Silent):', id, '| Pocket:', targetPocketId);

    try {
      // 🔥 [Check] 부모 포켓이 삭제된 상태인지 확인
      if (targetPocketId) {
        const { data: pocket } = await supabase
          .from('pockets')
          .select('deleted_at')
          .eq('id', targetPocketId)
          .single();

        if (pocket?.deleted_at) {
          console.log('[restoreFromTrash] 🏗️ Parent pocket is deleted. Restoring pocket...', targetPocketId);
          await supabase
            .from('pockets')
            .update({ deleted_at: null })
            .eq('id', targetPocketId);

          // 포켓 목록 갱신 필요 (복구된 포켓 보여주기 위해)
          await get().fetchPockets();
        }
      }

      // items 업데이트: deleted_at 제거
      const { error } = await supabase
        .from('items')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // ✅ Optimistic UI Update (이미 목록을 다시 불러왔을 수도 있지만 안전하게)
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        pockets: state.pockets.map((pocket) => {
          if (pocket.id === targetPocketId && pocket.item_count !== undefined) {
            return { ...pocket, item_count: pocket.item_count + 1 };
          }
          return pocket;
        })
      }));

      console.log('[restoreFromTrash] ✅ Success');
    } catch (error: any) {
      console.error('[restoreFromTrash] ❌ Failed:', error);
      set({ itemsError: '복구 실패' });
    }
  },

  // [Action] 영구 삭제 (Silent Update)
  permanentDelete: async (id) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    console.log('[permanentDelete] 💀 Deleting permanently (Silent):', id);

    // ✅ Optimistic Update: UI에서 즉시 제거 (깜빡임 없음!)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));

    try {
      const { error } = await supabase
        .from('items')
        .delete() // 진짜 삭제 (Hard Delete)
        .eq('id', id)
        .eq('user_id', user.id); // 보안: 본인 아이템만

      if (error) throw error;

      console.log('[permanentDelete] ✅ Success - Gone forever');
    } catch (error: any) {
      console.error('[permanentDelete] ❌ Failed:', error);
      set({ itemsError: '영구 삭제 실패' });
      // TODO: 실패 시 롤백 로직 추가 고려
    }
  },

  // [Action] 즐겨찾기 토글 (Zero-Latency Optimistic Update)
  togglePin: async (id) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const item = get().items.find((i) => i.id === id);
    if (!item) {
      console.warn('[togglePin] ⚠️ Item not found:', id);
      return;
    }

    const newStatus = !item.is_pinned;
    const oldStatus = item.is_pinned;

    // 현재 뷰 감지: 즐겨찾기 뷰인지 확인
    // const isPinnedView = ...
    !window.location.hash.match(/\/dashboard\/[^/]+$/); // pocketId가 없음
    const currentUrl = window.location.hash;
    const isInPinnedView = currentUrl.includes('#/dashboard') &&
      (currentUrl === '#/dashboard' || currentUrl === '#/dashboard/');

    console.log('[togglePin] ⭐ Toggling pin (Zero-Latency):', id, oldStatus, '→', newStatus);
    console.log('[togglePin] 📍 Current view check:', { currentUrl, isInPinnedView });

    // ✅ [Step 1] Optimistic Update: 즉시 반영 (Zero-Latency!)
    set((state) => {
      // 🔥 특수 케이스: 즐겨찾기 뷰에서 핀 해제 → 리스트에서 즉시 제거
      // (사용자가 현재 "즐겨찾기만 모아보기" 상태에서 핀을 해제하면
      //  해당 아이템은 더 이상 이 뷰에 속하지 않으므로 사라져야 함)

      // selectedPocketId가 null이고, URL이 /dashboard인 경우 → 전체 뷰 또는 특수 뷰
      // 이 경우 추가 로직으로 현재 뷰를 확인해야 함
      // 간단하게: items 배열이 모두 is_pinned=true라면 즐겨찾기 뷰로 추정
      const allItemsPinned = state.items.every(i => i.is_pinned);
      const likelyPinnedView = state.selectedPocketId === null && allItemsPinned;

      if (likelyPinnedView && !newStatus) {
        // 즐겨찾기 뷰에서 핀 해제 → 리스트에서 제거
        console.log('[togglePin] 🗑️ Removing from pinned view');
        return {
          items: state.items.filter((i) => i.id !== id)
        };
      }

      // 일반 케이스: 아이콘 상태만 토글
      return {
        items: state.items.map((i) => i.id === id ? { ...i, is_pinned: newStatus } : i)
      };
    });

    try {
      // ✅ [Step 2] Silent Request: 백그라운드에서 서버 업데이트
      const { error } = await supabase
        .from('items')
        .update({ is_pinned: newStatus })
        .eq('id', id)
        .eq('user_id', user.id); // 보안: 본인 아이템만

      if (error) throw error;

      console.log('[togglePin] ✅ Success (Zero-Latency)');
    } catch (error: any) {
      console.error('[togglePin] ❌ Failed, rolling back...', error);

      // ✅ [Step 3] Rollback: 실패 시 원래 상태로 복구
      set((state) => {
        // 즐겨찾기 뷰에서 제거했던 경우 → 다시 추가
        const wasRemoved = !state.items.find((i) => i.id === id);

        if (wasRemoved && item) {
          console.log('[togglePin] 🔄 Restoring removed item');
          return {
            items: [...state.items, { ...item, is_pinned: oldStatus }]
          };
        }

        // 일반 케이스: 상태만 되돌림
        return {
          items: state.items.map((i) => i.id === id ? { ...i, is_pinned: oldStatus } : i)
        };
      });

      set({ itemsError: '즐겨찾기 설정 실패' });
    }
  },

  // ==========================================
  // 4. UI STATE ACTIONS
  // ==========================================
  setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters }, currentPage: 1 })),
  clearFilters: () => set({ filters: {}, currentPage: 1 }),
  setPage: (page) => set({ currentPage: page }),
  resetItemsState: () => set({ items: [], filters: {}, itemsError: null, itemsLoading: false }),
}));
