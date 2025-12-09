import { ShoppingBag, Star, X } from 'lucide-react';
import { cn, formatPrice } from '@/utils';

interface ItemCardProps {
  title: string;
  price?: number | null;
  currency?: string;
  imageUrl?: string | null;
  siteName?: string | null;
  isPinned?: boolean;
  variant?: 'list' | 'grid';
  showDelete?: boolean;
  showPin?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
}

export function ItemCard({
  title,
  price,
  currency = 'KRW',
  imageUrl,
  siteName,
  isPinned = false,
  variant = 'list',
  showDelete = false,
  showPin = false,
  onClick,
  onDelete,
  onTogglePin,
}: ItemCardProps) {
  // 리스트 뷰 (디자인 시안 기준)
  if (variant === 'list') {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onClick}
      >
        {/* 상품 이미지 */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 min-w-0">
          {siteName && (
            <p className="text-xs text-gray-400 mb-0.5">{siteName}</p>
          )}
          <p className="font-medium text-gray-900 text-sm truncate">{title}</p>
          {price != null && (
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {formatPrice(price, currency)}
            </p>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-1">
          {showPin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin?.();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Star
                className={cn(
                  'w-4 h-4 transition-colors',
                  isPinned
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 hover:text-amber-400'
                )}
              />
            </button>
          )}
          {showDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 그리드 뷰 (Pinterest 스타일)
  return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all"
      onClick={onClick}
    >
      {/* 상품 이미지 */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
        )}
        
        {/* 핀 버튼 오버레이 */}
        {showPin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.();
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
          >
            <Star
              className={cn(
                'w-4 h-4 transition-colors',
                isPinned
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-400 hover:text-amber-400'
              )}
            />
          </button>
        )}
      </div>

      {/* 상품 정보 */}
      <div className="p-3">
        {siteName && (
          <p className="text-xs text-violet-500 font-medium truncate mb-0.5">{siteName}</p>
        )}
        <p className="font-medium text-gray-900 text-sm line-clamp-2 min-h-[2.5rem]">
          {title}
        </p>
        {price != null && (
          <p className="text-base font-bold text-gray-900 mt-1">
            {formatPrice(price, currency)}
          </p>
        )}
      </div>
    </div>
  );
}

