import { useState, useRef, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { usePockets } from '@/hooks';
import { Button, Input } from '@/components/ui';

interface EditPocketModalProps {
    isOpen: boolean;
    onClose: () => void;
    pocketId: string;
    initialName: string;
}

export function EditPocketModal({ isOpen, onClose, pocketId, initialName }: EditPocketModalProps) {
    const [name, setName] = useState(initialName);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { rename } = usePockets();

    // 모달 열릴 때 초기화 및 포커스
    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setIsSubmitting(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isSubmitting) return;

        // 이름이 변경되지 않았으면 그냥 닫기
        if (name.trim() === initialName) {
            onClose();
            return;
        }

        try {
            setIsSubmitting(true);
            await rename(pocketId, name.trim());
            onClose();
        } catch (error) {
            console.error('Failed to update pocket:', error);
            alert('포켓 수정에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <Edit3 className="w-5 h-5 text-primary-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">포켓 이름 수정</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <Input
                            ref={inputRef}
                            id="pocketName"
                            label="포켓 이름"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: 갖고 싶은 위시리스트"
                            maxLength={20}
                            autoComplete="off"
                        />
                        <p className="mt-2 text-xs text-gray-500 text-right">
                            {name.length}/20
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim()}
                            isLoading={isSubmitting}
                            className="flex-[2] bg-primary-600 hover:bg-primary-700"
                        >
                            수정 완료
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
