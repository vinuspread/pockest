import { useCallback } from 'react';
import { usePocketStore } from '@/store/usePocketStore';

/**
 * 폴더(Pocket) 관련 커스텀 훅
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
  } = usePocketStore();

  // 초기 로드 제거 (부모 컴포넌트에서 인증 후 명시적으로 호출)
  // useEffect(() => {
  //   fetchPockets();
  // }, []);

  // 기본 폴더 찾기
  const defaultPocket = pockets.find((p) => p.is_default);

  // 현재 선택된 폴더
  const selectedPocket = selectedPocketId
    ? pockets.find((p) => p.id === selectedPocketId)
    : null;

  // 새 폴더 생성 후 선택
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

  // 폴더 이름 변경
  const rename = useCallback(
    async (id: string, newName: string) => {
      await updatePocket(id, newName);
    },
    [updatePocket]
  );

  // 폴더 삭제 (기본 폴더는 삭제 불가)
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

    // 모든 폴더 보기 (선택 해제)
    selectAll: () => selectPocket(null),
  };
}





