import { useCallback } from 'react';
import { usePocketStore } from '@/store/usePocketStore';

/**
 * 포켓(Pocket) 관련 커스텀 훅
 */
export function usePockets() {
  const {
    pockets,
    selectedPocketId,
    pocketsLoading,
    fetchPockets,
    createPocket,
    updatePocket,
    deletePocket,
    selectPocket,
    togglePublicPocket, // New
  } = usePocketStore();

  // 초기 로드 제거 (부모 컴포넌트에서 인증 후 명시적으로 호출)
  // useEffect(() => {
  //   fetchPockets();
  // }, []);

  // 기본 포켓 찾기
  const defaultPocket = pockets.find((p) => p.is_default);

  // 현재 선택된 포켓
  const selectedPocket = selectedPocketId
    ? pockets.find((p) => p.id === selectedPocketId)
    : null;

  // 새 포켓 생성 후 선택
  const createAndSelect = useCallback(
    async (name: string) => {
      const pocket = await createPocket(name);
      if (pocket) {
        selectPocket(pocket.id);
      }
      return pocket;
    },
    [createPocket, selectPocket]
  );

  // 포켓 이름 변경
  const rename = useCallback(
    async (id: string, newName: string) => {
      await updatePocket(id, newName);
    },
    [updatePocket]
  );

  // 포켓 삭제 (기본 포켓은 삭제 불가)
  const remove = useCallback(
    async (id: string) => {
      const pocket = pockets.find((p) => p.id === id);
      if (pocket?.is_default) {
        console.warn('Cannot delete default pocket');
        return false;
      }
      await deletePocket(id);
      return true;
    },
    [pockets, deletePocket]
  );

  return {
    // State
    pockets,
    loading: pocketsLoading,
    selectedPocketId,
    selectedPocket,
    defaultPocket,

    // Actions
    refresh: fetchPockets,
    create: createPocket,
    createAndSelect,
    rename,
    remove,
    select: selectPocket,
    togglePublic: togglePublicPocket, // New

    // 모든 포켓 보기 (선택 해제)
    selectAll: () => selectPocket(null),
  };
}





