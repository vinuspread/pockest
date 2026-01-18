import React, { forwardRef, useState } from 'react';
import { cn } from '@/utils';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode; // 유지하되, password type일 경우 덮어쓰거나 별도 처리
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, leftIcon, rightIcon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';

    // 실제로 적용될 타입 (비밀번호 보기 토글에 따라 변경)
    const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    const handleTogglePassword = (e: React.MouseEvent) => {
      e.preventDefault();
      setShowPassword(!showPassword);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full px-4 py-3 bg-white border rounded-xl text-sm transition-all outline-none",
              "placeholder:text-gray-400",
              "focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10",
              "disabled:bg-gray-50 disabled:text-gray-500",
              error ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-gray-200",
              leftIcon && "pl-10",
              (rightIcon || isPasswordType) && "pr-10", // 아이콘 공간 확보
              className
            )}
            {...props}
          />
          {/* 비밀번호 토글 버튼 우선, 아니면 props로 받은 rightIcon 표시 */}
          {isPasswordType ? (
            <button
              type="button"
              onClick={handleTogglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {rightIcon}
              </div>
            )
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-500 animate-in slide-in-from-top-1 fade-in">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
