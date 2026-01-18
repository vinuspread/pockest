import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/utils';
import { Input } from '@/components/ui';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
  onLogout?: () => void;
  onCreatePocket?: () => void;
  user?: User | null;
  className?: string;
}

export function Header({ onSearch, onMenuClick, onCreatePocket, user, className }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  return (
    <header
      className={cn(
        'h-16 px-4 md:px-6 flex items-center justify-between gap-4',
        'bg-white border-b border-gray-100 z-50 relative',
        className
      )}
    >
      {/* 1. 좌측 영역: 로고 */}
      <div className="flex items-center gap-4">
        {/* 로고 (120px) */}
        <div className="flex items-center">
          <img src="/logo.svg" alt="Pockest" className="w-[120px] h-auto object-contain" />
        </div>
      </div>

      {/* 2. 우측 영역: 검색 | 포켓만들기 | 프로필 | 로그아웃 | 햄버거 메뉴 */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* 검색 */}
        <div className="w-48 md:w-[280px]">
          <Input
            type="search"
            placeholder="상품 검색"
            className="text-sm h-10"
            leftIcon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* 포켓 만들기 버튼 */}
        <button
          onClick={onCreatePocket}
          className="hidden md:flex items-center gap-1.5 h-10 px-4 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
        >
          <span>포켓 만들기</span>
        </button>

        {/* 프로필 정보 */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-8 h-8 rounded-full border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden lg:block text-sm text-gray-700 font-medium">
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </span>
          </div>
        )}

        {/* 로그아웃 버튼 제거됨 (햄버거 메뉴로 통합) */}

        {/* 햄버거 메뉴 버튼 (우측으로 이동) */}
        <button
          onClick={onMenuClick}
          className="p-1 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Custom Hamburger Icon (26x24 container, 6px gap, 4px height lines) */}
          <div className="flex flex-col justify-between w-[26px] h-[24px]">
            <div className="w-full h-[4px] bg-[#7548B8]" />
            <div className="w-full h-[4px] bg-[#7548B8]" />
            <div className="w-full h-[4px] bg-[#7548B8]" />
          </div>
        </button>
      </div>
    </header>
  );
}







