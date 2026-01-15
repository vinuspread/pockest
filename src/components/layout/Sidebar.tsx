import { cn } from '@/utils';
import type { PocketWithCount } from '@/types';

interface SidebarProps {
  pockets: PocketWithCount[];
  selectedPocketId: string | null;
  onSelectPocket: (id: string | null) => void;
  onCreatePocket: () => void;
  currentView: 'all' | 'today' | 'pinned' | 'trash' | 'pocket' | 'folders';
  onViewChange: (view: 'all' | 'today' | 'pinned' | 'trash') => void;
  allItemsCount?: number;
  todayItemsCount?: number;
  pinnedItemsCount?: number;
  trashItemsCount?: number;
  className?: string;
}

interface NavItemProps {
  iconSrc: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
  variant?: 'primary' | 'secondary' | 'action'; // primary: 상단메뉴, secondary: 폴더, action: 하단메뉴
}

function NavItem({ iconSrc, label, active, onClick, badge, variant = 'secondary' }: NavItemProps) {
  // 스타일 정의
  const baseStyles = 'w-full flex items-center gap-1 px-2 py-2 rounded-lg text-sm transition-all duration-200 group';

  // 1. 모든상품, 오늘담은상품, 즐겨찾기 (Primary)
  // - 기본: 포인트 컬러 (#7747B5)
  // - 폰트: 16px, Bold (text-base)
  // - 레터스페이싱: -2%
  // - 마우스 오버: bg-purple-800/5 (bg-[#7747B5]/5)
  const primaryStyles = cn(
    'text-[#7747B5] font-bold text-base tracking-[-0.02em]',
    active ? 'bg-[#7747B5]/5' : 'hover:bg-[#7747B5]/5'
  );

  // 2. 포켓 (Secondary)
  // - 기본: #999999
  // - 마우스 오버: #333333 + 연보라 배경 (#F3F0FA)
  // - 활성: #333333 + 연보라 배경
  const secondaryStyles = cn(
    active ? 'bg-[#F3F0FA] text-[#333333] font-bold' : 'text-[#999999] hover:text-[#333333] hover:bg-[#F3F0FA]'
  );

  // 3. 하단 메뉴 (Action - 만들기, 휴지통)
  // - 기본: #999999
  // - 마우스 오버: #333333
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
          variant === 'primary' ? "w-5 h-5" : "w-5 h-5", // 아이콘 크기 통일
          variant === 'action' && "brightness-0 opacity-40" // action 아이콘: 흰색→검은색 변환 후 40% 투명도
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
  pockets,
  selectedPocketId,
  onSelectPocket,
  onCreatePocket,
  currentView,
  onViewChange,
  allItemsCount = 0,
  todayItemsCount = 0,
  pinnedItemsCount = 0,
  trashItemsCount = 0, // 🗑️ 기본값 0
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'w-64 h-full bg-white border-r border-gray-100 flex flex-col p-5',
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
          onClick={() => {
            onSelectPocket(null);
            onViewChange('all');
          }}
          badge={allItemsCount}
        />
        <NavItem
          iconSrc="/icon_folder_today.svg"
          label="오늘 담은 상품"
          active={currentView === 'today'}
          variant="primary"
          onClick={() => {
            onSelectPocket(null);
            onViewChange('today');
          }}
          badge={todayItemsCount}
        />
        <NavItem
          iconSrc="/icon_folder_favorites.svg"
          label="즐겨찾기"
          active={currentView === 'pinned'}
          variant="primary"
          onClick={() => {
            onSelectPocket(null);
            onViewChange('pinned');
          }}
          badge={pinnedItemsCount}
        />
      </nav>

      {/* 구분선 */}
      <div className="my-5 flex-shrink-0">
        <div className="h-px bg-[#F3F3F3]" />
      </div>

      {/* 2. 포켓 리스트 Section */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {/* ... */}
        {pockets.filter(p => p.is_default).map((pocket) => (
          <NavItem
            key={pocket.id}
            iconSrc="/icon_folder_default.svg"
            label={pocket.name}
            active={selectedPocketId === pocket.id}
            variant="secondary"
            onClick={() => onSelectPocket(pocket.id)}
            badge={pocket.item_count || 0}
          />
        ))}

        {pockets.filter(p => !p.is_default).map((pocket) => (
          <NavItem
            key={pocket.id}
            iconSrc="/icon_folder_default.svg"
            label={pocket.name}
            active={selectedPocketId === pocket.id}
            variant="secondary"
            onClick={() => onSelectPocket(pocket.id)}
            badge={pocket.item_count || 0}
          />
        ))}
      </div>

      {/* 구분선 */}
      <div className="my-5 flex-shrink-0">
        <div className="h-px bg-[#F3F3F3]" />
      </div>

      {/* 3. 하단 액션 Section */}
      <div className="space-y-1 flex-shrink-0">
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
          onClick={() => {
            onSelectPocket(null);
            onViewChange('trash');
          }}
          badge={trashItemsCount} // ✅ 실제 데이터 연결 완료
        />
      </div>
    </aside>
  );
}





