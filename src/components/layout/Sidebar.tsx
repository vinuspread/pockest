import { LogOut, Folder } from 'lucide-react';
import { cn } from '@/utils';
import { useAuth } from '@/hooks';
import { useNavigate } from 'react-router-dom';

// ... (imports)

import type { PocketWithCount } from '@/types';

interface SidebarProps {
  currentView: 'all' | 'today' | 'pinned' | 'trash' | 'folders' | 'pocket' | 'admin';
  onViewChange: (view: 'all' | 'today' | 'pinned' | 'trash') => void;
  allItemsCount?: number;
  todayItemsCount?: number;
  pinnedItemsCount?: number;
  trashItemsCount?: number;
  pockets?: PocketWithCount[];
  selectedPocketId?: string | null;
  onSelectPocket?: (id: string) => void;
  className?: string;
  onClose?: () => void;
  onCreatePocket: () => void;
}

interface NavItemProps {
  iconSrc: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
  variant?: 'primary' | 'secondary' | 'action';
}

function NavItem({ iconSrc, label, active, onClick, badge, variant = 'secondary' }: NavItemProps) {
  const baseStyles = 'w-full flex items-center gap-1 px-2 py-2 rounded-lg text-sm transition-all duration-200 group';

  const primaryStyles = cn(
    'text-[#7548B8] font-bold text-base tracking-[-0.02em]',
    active ? 'bg-[#7548B8]/5' : 'hover:bg-[#7548B8]/5'
  );

  const secondaryStyles = cn(
    active ? 'bg-[#F3F0FA] text-[#333333] font-bold' : 'text-[#999999] hover:text-[#333333] hover:bg-[#F3F0FA]'
  );

  const actionStyles = cn(
    active ? 'bg-[#F3F0FA] text-[#333333] font-bold' : 'text-[#999999] hover:text-[#333333] hover:bg-[#F3F0FA]'
  );

  const finalStyles = cn(
    baseStyles,
    variant === 'primary' && primaryStyles,
    variant === 'secondary' && secondaryStyles,
    variant === 'action' && actionStyles
  );

  return (
    <button onClick={onClick} className={finalStyles}>
      <img
        src={iconSrc}
        alt={label}
        className={cn(
          "flex-shrink-0 transition-opacity",
          variant === 'primary' ? "w-5 h-5" : "w-5 h-5",
          variant === 'action' && "brightness-0 opacity-40"
        )}
      />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className={cn(
          "text-xs font-normal font-pretendard",
          variant === 'primary' ? "text-slate-300" : "text-[#999999] group-hover:text-[#333333]"
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  currentView,
  onViewChange,
  allItemsCount = 0,
  todayItemsCount = 0,
  pinnedItemsCount = 0,
  trashItemsCount = 0,
  pockets = [],
  selectedPocketId,
  onSelectPocket,
  className,
  onClose,
  onCreatePocket,
}: SidebarProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  // Admin Check
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];
  const isAdmin = user?.email && adminEmails.map((e: string) => e.trim()).includes(user.email);

  const handleMenuClick = (view: 'all' | 'today' | 'pinned' | 'trash') => {
    onViewChange(view);
    onClose?.();
  };

  const handlePocketClick = (id: string) => {
    onSelectPocket?.(id);
    onClose?.();
  };

  return (
    <aside
      className={cn(
        'w-full h-full bg-white flex flex-col p-5', // Changed w-64 to w-full
        className
      )}
    >
      {/* 1. 상단 메인 메뉴 Section */}
      <nav className="flex flex-col gap-1 flex-shrink-0">
        <NavItem
          iconSrc="/icon_folder_all.svg"
          label="모든 상품"
          active={currentView === 'all'}
          variant="primary"
          onClick={() => handleMenuClick('all')}
          badge={allItemsCount}
        />
        <NavItem
          iconSrc="/icon_folder_today.svg"
          label="오늘 담은 상품"
          active={currentView === 'today'}
          variant="primary"
          onClick={() => handleMenuClick('today')}
          badge={todayItemsCount}
        />
        <NavItem
          iconSrc="/icon_folder_favorites.svg"
          label="즐겨찾기"
          active={currentView === 'pinned'}
          variant="primary"
          onClick={() => handleMenuClick('pinned')}
          badge={pinnedItemsCount}
        />
      </nav>

      {/* Admin Link (Conditional) */}
      {isAdmin && (
        <div className="px-3 mt-4 pt-4 border-t border-gray-100">
          <NavItem
            iconSrc="https://cdn-icons-png.flaticon.com/512/3524/3524752.png" // Shield Icon placeholder or use Lucide
            label="관리자 페이지"
            active={currentView === 'admin'}
            onClick={() => {
              navigate('/admin');
              onClose?.();
            }}
            variant="action"
          />
        </div>
      )}

      {/* User Profile & Logout */}
      <div className="my-5 flex-shrink-0">
        <div className="h-px bg-[#F3F3F3]" />
      </div>

      {/* 2. 내 포켓 목록 Section (Scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0 mb-4">
        <h3 className="px-2 text-xs font-semibold text-gray-400 mb-2">내 포켓</h3>
        <div className="space-y-1">
          {pockets.map((pocket) => (
            <button
              key={pocket.id}
              onClick={() => handlePocketClick(pocket.id)}
              className={cn(
                'w-full flex items-center gap-1 px-2 py-2 rounded-lg text-sm transition-all duration-200 group', // gap-1 to match NavItem
                selectedPocketId === pocket.id
                  ? 'bg-[#7548B8]/5 text-[#7548B8] font-bold'
                  : 'text-[#666666] hover:bg-[#F3F0FA] hover:text-[#333333]'
              )}
            >
              {/* Folder Icon for alignment */}
              <Folder className={cn(
                "w-5 h-5 flex-shrink-0",
                selectedPocketId === pocket.id ? "fill-[#7548B8]/20 stroke-[#7548B8]" : "fill-gray-100 stroke-gray-400"
              )} />

              <span className="flex-1 text-left truncate">{pocket.name}</span>
              <span className={cn(
                "text-xs",
                selectedPocketId === pocket.id ? "text-[#7548B8]" : "text-[#999999]"
              )}>
                {pocket.item_count || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 구분선 */}
      <div className="my-1 flex-shrink-0">
        <div className="h-px bg-[#F3F3F3]" />
      </div>

      {/* 3. 하단 액션 Section */}
      <div className="space-y-1 flex-shrink-0 mb-2">
        <NavItem
          iconSrc="/icon_btn_folder_add.svg"
          label="포켓 만들기"
          active={false}
          variant="action"
          onClick={onCreatePocket}
        />
        <NavItem
          iconSrc="/icon_trash.svg"
          label="휴지통"
          active={currentView === 'trash'}
          variant="action"
          onClick={() => handleMenuClick('trash')}
          badge={trashItemsCount}
        />
      </div>

      <div className="mt-auto">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}






