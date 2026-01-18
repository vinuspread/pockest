/**
 * 공통 타입 정의
 */

// 인증 상태
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

// 유저 정보
export interface User {
  id: string;
  email: string;
  tier: 'free' | 'premium';
  affiliate_agreed?: boolean;
  gender?: string | null;
  age_group?: string | null;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    [key: string]: any;
  };
}

// 상품 저장 요청 (Content Script -> Popup)
export interface SaveItemRequest {
  url: string;
  title: string;
  imageUrl?: string;
  siteName?: string;
  price?: number;
  currency?: string;
}

// 메시지 타입 (Extension 내부 통신)
export type MessageType =
  | 'SAVE_ITEM'
  | 'GET_PAGE_INFO'
  | 'AUTH_STATE_CHANGED'
  | 'SYNC_REQUEST';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}

// API 응답 래퍼
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// 페이지네이션
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 정렬 옵션
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: string;
  order: SortOrder;
}

// 필터 옵션
export interface ItemFilters {
  pocketId?: string;
  isPinned?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  siteName?: string;
}

// Re-export database types
export * from './database';

// Pocket with item count and thumbnails (확장 타입)
import type { Pocket as BasePocket } from './database';
export interface PocketWithCount extends BasePocket {
  item_count?: number;
  recent_thumbnails?: string[]; // 최신 아이템 4개의 이미지 URL
}

// Re-export parser types
export type { ProductData } from '@/utils/parser';

