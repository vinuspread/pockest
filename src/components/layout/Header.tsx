import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { cn } from '@/utils';
import { Input } from '@/components/ui';

interface HeaderProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export function Header({ onSearch, className }: HeaderProps) {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(e.target.value);
  };

  return (
    <header
      className={cn(
        'h-16 px-6 flex items-center justify-between gap-4',
        'bg-white border-b border-gray-100',
        className
      )}
    >
      {/* 로고 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <span className="font-semibold text-gray-900 text-lg">Pockest</span>
      </div>

      {/* 검색 */}
      <div className="flex-1 max-w-md">
        <Input
          type="search"
          placeholder="상품 검색..."
          leftIcon={<Search className="w-4 h-4" />}
          onChange={handleSearch}
        />
      </div>

      {/* 우측 액션 */}
      <div className="flex items-center gap-2">
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



