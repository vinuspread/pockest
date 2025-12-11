import React from 'react';
import {
  Home,
  Clock,
  Star,
  Folder,
  Trash2,
  Plus,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils';
import type { PocketWithCount } from '@/types';

interface SidebarProps {
  pockets: PocketWithCount[];
  selectedPocketId: string | null;
  onSelectPocket: (id: string | null) => void;
  onCreatePocket: () => void;
  currentView: 'all' | 'today' | 'pinned' | 'trash' | 'pocket';
  onViewChange: (view: 'all' | 'today' | 'pinned' | 'trash') => void;
  className?: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

function NavItem({ icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
        'transition-colors duration-150',
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-100'
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">
          {badge}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  pockets,
  selectedPocketId,
  onSelectPocket,
  onCreatePocket,
  currentView,
  onViewChange,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'w-64 h-full bg-white border-r border-gray-100',
        'flex flex-col',
        className
      )}
    >
      {/* 메인 네비게이션 */}
      <nav className="flex-1 p-4 space-y-1">
        <NavItem
          icon={<Home className="w-5 h-5" />}
          label="모든 상품"
          active={currentView === 'all'}
          onClick={() => {
            onSelectPocket(null); // 포켓 선택 해제
            onViewChange('all');
          }}
        />
        <NavItem
          icon={<Clock className="w-5 h-5" />}
          label="오늘 저장"
          active={currentView === 'today'}
          onClick={() => {
            onSelectPocket(null); // 포켓 선택 해제
            onViewChange('today');
          }}
        />
        <NavItem
          icon={<Star className="w-5 h-5" />}
          label="즐겨찾기"
          active={currentView === 'pinned'}
          onClick={() => {
            onSelectPocket(null); // 포켓 선택 해제
            onViewChange('pinned');
          }}
        />

        {/* 폴더 섹션 */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              폴더
            </span>
            <button
              onClick={onCreatePocket}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-1">
            {pockets.map((pocket) => {
              const itemCount = pocket.item_count ?? 0;
              
              return (
                <button
                  key={pocket.id}
                  onClick={() => {
                    onSelectPocket(pocket.id);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                    'transition-colors duration-150',
                    selectedPocketId === pocket.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Folder className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">{pocket.name}</span>
                  <span className="text-xs text-gray-400">{itemCount}</span>
                  {pocket.is_default && (
                    <span className="text-xs text-gray-400">기본</span>
                  )}
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 휴지통 */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <NavItem
            icon={<Trash2 className="w-5 h-5" />}
            label="휴지통"
            active={currentView === 'trash'}
            onClick={() => {
              onSelectPocket(null); // 포켓 선택 해제
              onViewChange('trash');
            }}
          />
        </div>
      </nav>

      {/* 하단 설정 */}
      <div className="p-4 border-t border-gray-100">
        <NavItem
          icon={<Settings className="w-5 h-5" />}
          label="설정"
        />
      </div>
    </aside>
  );
}





