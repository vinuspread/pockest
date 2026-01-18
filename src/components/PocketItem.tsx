import React from 'react';
import { Folder } from 'lucide-react';
import { cn, openDashboard } from '@/utils';
import type { PocketWithCount } from '@/types';

interface PocketItemProps {
  pocket: PocketWithCount;

  // Popup용: 상품 저장 기능
  onSave?: (pocketId: string) => void;
  isSelected?: boolean;
  isSaving?: boolean;
  showSaveButton?: boolean;
  isPopup?: boolean;

  // Sidebar용: 대시보드 이동
  onClick?: (pocketId: string) => void;
  isActive?: boolean;

  // 공통
  className?: string;
}

export function PocketItem({
  pocket,
  onSave,
  isSelected = false,
  isSaving = false,
  showSaveButton = false,
  isPopup = false,
  onClick,
  isActive = false,
  className,
}: PocketItemProps) {
  const itemCount = pocket.item_count ?? 0;
  const thumbnails = pocket.recent_thumbnails ?? [];

  const handleClick = async () => {
    // 1. 팝업 모드라면 대시보드 탭 재사용 또는 생성 (최우선)
    if (isPopup) {
      await openDashboard(pocket.id);
      return;
    }

    // 2. 팝업이 아니라면(사이드바 등), 부모로부터 받은 onClick 실행
    if (onClick) {
      onClick(pocket.id);
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      onSave(pocket.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors',
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'hover:bg-gray-50',
        className
      )}
    >
      {/* 썸네일 - 좌측 고정, 작게 */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {thumbnails.length > 0 && thumbnails[0] ? (
          <img
            src={thumbnails[0]}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Folder className="w-4 h-4 text-gray-300" />
          </div>
        )}
      </div>

      {/* 포켓명 - 중앙 (flex-1으로 남은 공간 차지) */}
      <p className={cn(
        'flex-1 min-w-0 font-medium text-sm truncate',
        isActive ? 'text-primary-700' : 'text-gray-900'
      )}>
        {pocket.name}
      </p>

      {/* 갯수 표시 (담기 버튼이 없거나 Sidebar인 경우) */}
      {!showSaveButton && (
        <span className="text-xs text-gray-400 flex-shrink-0">
          {itemCount}개
        </span>
      )}

      {/* 기본 포켓 표시 (Sidebar용) */}
      {!showSaveButton && pocket.is_default && (
        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">기본</span>
      )}

      {/* 담기 버튼 - 가장 오른쪽 끝, hover 시에만 표시 및 클릭 가능 */}
      {showSaveButton && onSave && (
        <div className="ml-auto flex-shrink-0">
          {isSaving && isSelected ? (
            <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
          ) : (
            <button
              onClick={handleSaveClick}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-lg',
                'opacity-0 group-hover:opacity-100',
                'pointer-events-none group-hover:pointer-events-auto',
                'transition-all duration-200',
                isSelected
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              )}
            >
              담기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

