import { create } from 'zustand';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from './useAuthStore';
import type { PocketWithCount, Item, ItemFilters } from '@/types';
import type { PocketInsert, ItemInsert, ItemUpdate } from '@/types/database';

interface PocketState {
  // Pockets (폴더)
  pockets: PocketWithCount[];
  selectedPocketId: string | null;
  pocketsLoading: boolean;
  pocketsError: string | null;

  // Items (상품)
  items: Item[];
  itemsLoading: boolean;
  itemsTotal: number;
  itemsError: string | null;

  // Filters
  filters: ItemFilters;
  currentPage: number;
  pageSize: number;

  // Actions - Pockets
  fetchPockets: () => Promise<void>;
  createPocket: (name: string) => Promise<PocketWithCount | null>;
  updatePocket: (id: string, name: string) => Promise<void>;
  deletePocket: (id: string) => Promise<void>;
  selectPocket: (id: string | null) => void;

  // Actions - Items
  fetchItems: () => Promise<void>;
  fetchTodayItems: () => Promise<void>;
  addItem: (item: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<Item | null>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string, pocketId?: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;

  // Actions - Filters
  setFilters: (filters: Partial<ItemFilters>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
}

export const usePocketStore = create<PocketState>((set, get) => ({
  // Initial state
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

  // Pocket actions
  fetchPockets: async () => {
    // ✅ 인증 가드: 로그인 안 했으면 요청하지 않음
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('[fetchPockets] ⚠️ Not authenticated, skipping request');
      return;
    }

    console.log('[fetchPockets] 🔄 Starting fetch for user:', user.id);
    // ✅ 로딩 중에도 기존 데이터 유지 (0으로 깜빡임 방지)
    set({ pocketsLoading: true, pocketsError: null });
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[fetchPockets] ❌ Auth error:', userError.message, userError);
        // 에러 시에만 pockets 초기화
        set({ pocketsLoading: false, pocketsError: userError.message });
        return;
      }
      
      if (!userData.user) {
        console.warn('[fetchPockets] ⚠️ No authenticated user after getUser()');
        set({ pockets: [], pocketsLoading: false, pocketsError: 'Not authenticated' });
        return;
      }

      console.log('[fetchPockets] 📡 Querying pockets for user:', userData.user.id);
      // ✅ 아이템 개수 + 썸네일 이미지를 함께 가져오기
      const { data, error } = await supabase
        .from('pockets')
        .select('*, items(id, image_url, created_at)')
        .eq('user_id', userData.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[fetchPockets] ❌ Query error:', error.message, 'Code:', error.code, 'Details:', error.details);
        // 에러 시 기존 데이터 유지
        set({ pocketsLoading: false, pocketsError: error.message });
        return;
      }
      
      // ✅ 아이템 카운트 + 썸네일 매핑 (핵심 로직)
      const mappedPockets: PocketWithCount[] = (data || []).map((pocket) => {
        const pocketData = pocket as Record<string, unknown>;
        const items = pocketData.items as Array<{ id: string; image_url: string | null; created_at: string }> | undefined;
        
        // 아이템 개수
        const itemCount = items?.length || 0;
        
        // 최신 아이템 4개의 썸네일 (created_at 내림차순 정렬 후 image_url 있는 것만)
        const recentThumbnails = (items || [])
          .filter(item => item.image_url) // image_url 있는 것만
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // 최신순
          .slice(0, 4) // 최대 4개
          .map(item => item.image_url as string);
        
        // items 속성 제외하고 나머지 속성만 추출
        const { items: _items, ...pocketWithoutItems } = pocketData;
        
        return {
          ...pocketWithoutItems,
          item_count: itemCount,
          recent_thumbnails: recentThumbnails,
        } as PocketWithCount;
      });
      
      console.log('[fetchPockets] ✅ Success! Mapped pockets:', mappedPockets.map(p => ({ 
        name: p.name, 
        item_count: p.item_count, 
        thumbnails: p.recent_thumbnails?.length 
      })));
      
      // ✅ 성공 시에만 새 데이터로 교체
      set({ pockets: mappedPockets, pocketsLoading: false, pocketsError: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[fetchPockets] ❌ Exception:', errorMessage, error);
      // 예외 시 기존 데이터 유지
      set({ pocketsLoading: false, pocketsError: errorMessage });
    }
  },

  createPocket: async (name) => {
    try {
      console.log('[createPocket] Starting with name:', name);
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('[createPocket] Auth result:', { user: userData?.user?.id, error: userError?.message });
      
      if (userError) {
        console.error('[createPocket] Auth error:', userError.message, userError);
        throw new Error(`인증 오류: ${userError.message}`);
      }
      
      if (!userData.user) {
        console.error('[createPocket] No user found');
        throw new Error('로그인이 필요합니다.');
      }

      const insertData: PocketInsert = {
        name,
        is_default: false,
        user_id: userData.user.id,
      };
      
      console.log('[createPocket] Insert data:', insertData);

      const { data, error } = await supabase
        .from('pockets')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[createPocket] DB error:', error.message, error.code, error.details, error.hint);
        throw new Error(`DB 오류: ${error.message}`);
      }
      
      console.log('[createPocket] Success:', data);
      
      // ✅ 생성 성공 후 서버에서 전체 데이터 재조회 (강제 동기화)
      // 로컬 배열 조작 없이 fetchPockets()로 완전히 덮어씌움
      await get().fetchPockets();
      
      // 새로 생성된 포켓을 최신 상태에서 찾아서 반환
      const newPocket = get().pockets.find(p => p.id === data.id);
      return newPocket || (data as PocketWithCount);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('[createPocket] Exception:', errorMessage, error);
      throw error;
    }
  },

  updatePocket: async (id, name) => {
    try {
      const { error } = await supabase
        .from('pockets')
        .update({ name } as { name: string })
        .eq('id', id);

      if (error) {
        console.error('[updatePocket] Error:', error.message);
        return;
      }
      
      set((state) => ({
        pockets: state.pockets.map((p) =>
          p.id === id ? { ...p, name } : p
        ),
      }));
    } catch (error) {
      console.error('[updatePocket] Exception:', error instanceof Error ? error.message : error);
    }
  },

  deletePocket: async (id) => {
    try {
      const { error } = await supabase.from('pockets').delete().eq('id', id);
      
      if (error) {
        console.error('[deletePocket] Error:', error.message);
        return;
      }
      
      set((state) => ({
        pockets: state.pockets.filter((p) => p.id !== id),
        selectedPocketId:
          state.selectedPocketId === id ? null : state.selectedPocketId,
      }));
    } catch (error) {
      console.error('[deletePocket] Exception:', error instanceof Error ? error.message : error);
    }
  },

  selectPocket: (id) => {
    set({ selectedPocketId: id, currentPage: 1 });
    get().fetchItems();
  },

  // Item actions
  fetchItems: async () => {
    // ✅ 인증 가드: 로그인 안 했으면 요청하지 않음
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('[fetchItems] ⚠️ Not authenticated, skipping request');
      return;
    }

    console.log('[fetchItems] 🔄 Starting fetch for user:', user.id);
    set({ itemsLoading: true, itemsError: null });
    const { selectedPocketId, filters, currentPage, pageSize } = get();

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[fetchItems] ❌ Auth error:', userError.message, userError);
        set({ items: [], itemsLoading: false, itemsError: userError.message });
        return;
      }
      
      if (!userData.user) {
        console.warn('[fetchItems] ⚠️ No authenticated user after getUser()');
        set({ items: [], itemsLoading: false, itemsError: 'Not authenticated' });
        return;
      }

      let query = supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', userData.user.id)
        .is('deleted_at', null);

      if (selectedPocketId) {
        query = query.eq('pocket_id', selectedPocketId);
      }

      if (filters.isPinned !== undefined) {
        query = query.eq('is_pinned', filters.isPinned);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.siteName) {
        query = query.eq('site_name', filters.siteName);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[fetchItems] ❌ Query error:', error.message, 'Code:', error.code, 'Details:', error.details);
        set({ items: [], itemsLoading: false, itemsError: error.message });
        return;
      }
      
      console.log('[fetchItems] ✅ Success! Fetched', data?.length || 0, 'items (total:', count, ')');
      set({
        items: (data as Item[]) || [],
        itemsTotal: count || 0,
        itemsLoading: false,
        itemsError: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[fetchItems] ❌ Exception:', errorMessage, error);
      set({ items: [], itemsLoading: false, itemsError: errorMessage });
    }
  },

  fetchTodayItems: async () => {
    // ✅ 인증 가드: 로그인 안 했으면 요청하지 않음
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('[fetchTodayItems] ⚠️ Not authenticated, skipping request');
      return;
    }

    console.log('[fetchTodayItems] 🔄 Starting fetch for user:', user.id);
    set({ itemsLoading: true, itemsError: null });
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('[fetchTodayItems] ❌ Auth error:', userError?.message, userError);
        set({ items: [], itemsLoading: false, itemsError: 'Not authenticated' });
        return;
      }

      const { data, error } = await supabase
        .rpc('get_today_items', { p_user_id: userData.user.id });

      if (error) {
        console.error('[fetchTodayItems] ❌ RPC error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        console.error('[fetchTodayItems] 💡 Tip: Check if get_today_items() RPC function exists in Supabase');
        set({ items: [], itemsLoading: false, itemsError: error.message });
        return;
      }
      
      console.log('[fetchTodayItems] ✅ Success! Fetched', data?.length || 0, 'today items');
      if (data && data.length > 0) {
        console.log('[fetchTodayItems] 📦 Sample item:', {
          title: data[0].title,
          created_at: data[0].created_at,
          site_name: data[0].site_name
        });
      }
      set({ items: (data as Item[]) || [], itemsLoading: false, itemsError: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[fetchTodayItems] ❌ Exception:', errorMessage, error);
      set({ items: [], itemsLoading: false, itemsError: errorMessage });
    }
  },

  addItem: async (item) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('[addItem] Auth error:', userError?.message || 'Not authenticated');
        return null;
      }

      const insertData: ItemInsert = {
        user_id: userData.user.id,
        url: item.url,
        title: item.title,
        price: item.price,
        currency: item.currency,
        image_url: item.image_url,
        site_name: item.site_name,
        pocket_id: item.pocket_id,
        is_pinned: item.is_pinned,
        memo: item.memo,
        deleted_at: item.deleted_at,
      };

      const { data, error } = await supabase
        .from('items')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[addItem] ❌ Error:', error.message, 'Code:', error.code);
        return null;
      }
      
      const newItem = data as Item;
      console.log('[addItem] ✅ Item added successfully, refreshing all lists');
      
      // ✅ 아이템 추가 후 포켓 + 아이템 + Today 리스트 모두 재조회
      // (카운트 + 썸네일 + Today 동기화)
      try {
        await Promise.all([
          get().fetchPockets(),      // 1. 포켓 목록(카운트) 갱신
          get().fetchItems(),        // 2. 현재 포켓 아이템 갱신
          get().fetchTodayItems()    // 3. Today 리스트 갱신 (필수!)
        ]);
        console.log('[addItem] 🔄 All lists refreshed successfully');
      } catch (refreshError) {
        // fetch 함수들은 내부적으로 에러를 처리하지만, 혹시 모를 에러를 catch
        console.error('[addItem] ⚠️ Error during refresh:', refreshError);
      }
      
      return newItem;
    } catch (error) {
      console.error('[addItem] Exception:', error instanceof Error ? error.message : error);
      return null;
    }
  },

  updateItem: async (id, updates) => {
    try {
      const updateData: ItemUpdate = { ...updates };

      const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('[updateItem] Error:', error.message);
        return;
      }
      
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    } catch (error) {
      console.error('[updateItem] Exception:', error instanceof Error ? error.message : error);
    }
  },

  moveToTrash: async (id) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('[moveToTrash] Auth error');
        return;
      }

      const { error } = await supabase
        .rpc('move_item_to_trash', {
          p_item_id: id,
          p_user_id: userData.user.id,
        });

      if (error) {
        console.error('[moveToTrash] Error:', error.message);
        return;
      }
      
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    } catch (error) {
      console.error('[moveToTrash] Exception:', error instanceof Error ? error.message : error);
    }
  },

  restoreFromTrash: async (id, pocketId) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('[restoreFromTrash] Auth error');
        return;
      }

      const { error } = await supabase
        .rpc('restore_item_from_trash', {
          p_item_id: id,
          p_user_id: userData.user.id,
          p_pocket_id: pocketId,
        });

      if (error) {
        console.error('[restoreFromTrash] Error:', error.message);
        return;
      }
      
      get().fetchItems();
    } catch (error) {
      console.error('[restoreFromTrash] Exception:', error instanceof Error ? error.message : error);
    }
  },

  permanentDelete: async (id) => {
    try {
      const { error } = await supabase.from('items').delete().eq('id', id);
      
      if (error) {
        console.error('[permanentDelete] Error:', error.message);
        return;
      }
      
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    } catch (error) {
      console.error('[permanentDelete] Exception:', error instanceof Error ? error.message : error);
    }
  },

  togglePin: async (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    await get().updateItem(id, { is_pinned: !item.is_pinned });
  },

  // Filter actions
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      currentPage: 1,
    }));
    get().fetchItems();
  },

  clearFilters: () => {
    set({ filters: {}, currentPage: 1 });
    get().fetchItems();
  },

  setPage: (page) => {
    set({ currentPage: page });
    get().fetchItems();
  },
}));
