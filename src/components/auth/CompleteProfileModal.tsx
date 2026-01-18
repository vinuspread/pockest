import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks';
import { supabase } from '@/services/supabase/client';
import { Button, Select } from '@/components/ui';
import { cn } from '@/utils';

interface CompleteProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CompleteProfileModal({ isOpen, onClose }: CompleteProfileModalProps) {
    const { user, initialize } = useAuth();
    const [gender, setGender] = useState('');
    const [ageGroup, setAgeGroup] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setGender('');
            setAgeGroup('');
        }
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gender || !ageGroup) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    gender,
                    age_group: ageGroup,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;

            // Refresh auth state to update store
            await initialize();
            onClose();
        } catch (err) {
            console.error('Failed to update profile:', err);
            alert('저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-gray-900">추가 정보 입력</h2>
                    <p className="mt-2 text-sm text-gray-500">
                        더 나은 서비스 제공을 위해<br />
                        아래 정보를 입력해주세요.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 성별 선택 */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">성별</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['남성', '여성', '기타'].map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setGender(g)}
                                    className={cn(
                                        "px-2 py-3 rounded-xl text-sm font-medium border transition-all",
                                        gender === g
                                            ? "bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 연령대 선택 */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">연령대</label>
                        <div className="relative z-20">
                            <Select
                                placeholder="연령대를 선택하세요"
                                value={ageGroup}
                                onChange={setAgeGroup}
                                options={['10대', '20대', '30대', '40대', '50대', '60대', '70대 이상']}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full h-12 text-base font-bold mt-4"
                        disabled={!gender || !ageGroup || loading}
                    >
                        {loading ? '저장 중...' : '시작하기'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
