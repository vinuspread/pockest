import React, { useState } from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import { cn } from '@/utils';
import { Input } from '@/components/ui';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onMenuClick?: () => void; // 🍔 햄버거 메뉴 클릭 핸들러 추가
  className?: string;
}

export function Header({ onSearch, onMenuClick, className }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      console.log('[Header] 🔍 Search triggered:', searchQuery);
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
        'bg-white border-b border-gray-100',
        className
      )}
    >
      {/* 좌측 영역: 메뉴 버튼(모바일) + 로고 */}
      <div className="flex items-center gap-3">
        {/* 🍔 햄버거 메뉴 버튼 (모바일 전용) */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* 로고 */}
        <div className="flex items-center">
          <img src="/logo.svg" alt="Pockest" className="w-10 h-auto" />
        </div>
      </div>

      {/* 검색 */}
      <div className="flex-1 max-w-md">
        <Input
          type="search"
          placeholder="상품 검색..."
          className="text-sm"
          leftIcon={<Search className="w-4 h-4" />}
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* 우측 액션 (모바일 숨김) */}
      <div className="hidden md:flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <User className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </header>
  );
}







