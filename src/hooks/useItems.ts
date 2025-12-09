import { useCallback, useEffect } from 'react';
import { usePocketStore } from '@/store/usePocketStore';
import type { ItemFilters } from '@/types';

/**
 * 상품 관련 커스텀 훅
 */
export function useItems() {
  const {
    items,
    itemsLoading,
    itemsTotal,
    currentPage,
    pageSize,
    filters,
    fetchItems,
    fetchTodayItems,
    addItem,
    updateItem,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    togglePin,
    setFilters,
    clearFilters,
    setPage,
  } = usePocketStore();

  // 초기 로드
  useEffect(() => {
    fetchItems();
  }, []);

  // 페이지네이션 정보
  const totalPages = Math.ceil(itemsTotal / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // 필터 적용
  const applyFilters = useCallback(
    (newFilters: Partial<ItemFilters>) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  // 검색
  const search = useCallback(
    (query: string) => {
      setFilters({ search: query || undefined });
    },
    [setFilters]
  );

  // 즐겨찾기만 보기
  const showPinnedOnly = useCallback(
    (pinned: boolean) => {
      setFilters({ isPinned: pinned ? true : undefined });
    },
    [setFilters]
  );

  return {
    // State
    items,
    loading: itemsLoading,
    total: itemsTotal,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    filters,

    // Actions
    refresh: fetchItems,
    fetchToday: fetchTodayItems,
    add: addItem,
    update: updateItem,
    trash: moveToTrash,
    restore: restoreFromTrash,
    delete: permanentDelete,
    togglePin,

    // Filters
    applyFilters,
    clearFilters,
    search,
    showPinnedOnly,

    // Pagination
    goToPage: setPage,
    nextPage: () => hasNextPage && setPage(currentPage + 1),
    prevPage: () => hasPrevPage && setPage(currentPage - 1),
  };
}



