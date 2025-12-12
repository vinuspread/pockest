import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * clsx + tailwind-merge 조합
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}








