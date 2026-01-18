import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
};

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

const iconStyles = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
};

export function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, message]);

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]',
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
        'transition-all duration-200',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        styles[type]
      )}
    >
      <Icon className={cn('w-5 h-5', iconStyles[type])} />
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 200);
        }}
        className="p-1 hover:bg-black/5 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast 상태 관리 훅
interface ToastState {
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  return { toast, showToast, hideToast };
}
