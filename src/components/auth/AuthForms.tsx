import { useState } from 'react';
import { useAuth } from '@/hooks';
import { useTranslation } from 'react-i18next';
import { Input, Select } from '@/components/ui';
import { cn } from '@/utils';

interface AuthFormsProps {
    onSuccess?: () => void;
}

export function AuthForms({ onSuccess }: AuthFormsProps) {
    const { t } = useTranslation();
    const { signIn, signUp, signInWithGoogle, error: authError, clearError } = useAuth();

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [ageGroup, setAgeGroup] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        setValidationError(null);
        clearError();

        const showError = (msg: string) => {
            setValidationError(msg);
        };

        try {
            if (isLoginMode) {
                if (!email) {
                    showError(t('auth.email_placeholder') + '을 입력해주세요.');
                    return;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    showError('유효한 이메일 주소를 입력해주세요.');
                    return;
                }

                if (!password) {
                    showError(t('auth.password_placeholder') + '를 입력해주세요.');
                    return;
                }

                await signIn(email, password);
                if (onSuccess) onSuccess();
            } else {
                // Sign Up Validation
                if (!fullName) {
                    showError('이름(닉네임)을 입력해주세요.');
                    return;
                }
                if (!gender) {
                    showError('성별을 선택해주세요.');
                    return;
                }
                if (!ageGroup) {
                    showError('연령대를 선택해주세요.');
                    return;
                }
                if (!email) {
                    showError('이메일을 입력해주세요.');
                    return;
                }
                // Simple email regex
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    showError('유효한 이메일 주소를 입력해주세요.');
                    return;
                }

                if (!password) {
                    showError('비밀번호를 입력해주세요.');
                    return;
                }

                const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W]{6,}$/;
                if (!passwordRegex.test(password)) {
                    showError('비밀번호는 영문/숫자 조합 6자 이상이어야 합니다.');
                    return;
                }

                await signUp(email, password, {
                    full_name: fullName,
                    gender, // "남성" | "여성" | "기타"
                    age_group: ageGroup,
                });
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            // Error is handled by useAuth and stored in authError usually, 
            // but custom validation errors are local.
            // The hook calls set({ error: ... }) so authError will be updated.
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">
                    {isLoginMode ? t('auth.login_title') : '새 계정을 만드세요'}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    {isLoginMode
                        ? '포켓에 저장된 아이템을 확인하세요'
                        : '나만의 위시리스트를 관리해보세요'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* 회원가입 시 추가 필드 */}
                {!isLoginMode && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Input
                            type="text"
                            placeholder="이름 (닉네임)"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />

                        <div className="grid grid-cols-3 gap-2">
                            {['남성', '여성', '기타'].map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setGender(g)}
                                    className={cn(
                                        "px-2 py-3 rounded-xl text-xs font-medium border transition-all",
                                        gender === g
                                            ? "bg-primary-50 border-primary-200 text-primary-600"
                                            : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                                    )}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>

                        <div className="relative z-10">
                            <Select
                                placeholder="연령대 선택"
                                value={ageGroup}
                                onChange={setAgeGroup}
                                options={['10대', '20대', '30대', '40대', '50대', '60대', '70대 이상']}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <Input
                        type="email"
                        placeholder={t('auth.email_placeholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <Input
                        type="password"
                        placeholder={t('auth.password_placeholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {/* 에러 메시지 */}
                {(authError || validationError) && (
                    <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl font-medium animate-shake">
                        {authError || validationError}
                    </div>
                )}

                {/* 제출 버튼 */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        isLoginMode ? '로그인' : '회원가입'
                    )}
                </button>
            </form>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-2 text-gray-400 bg-white">또는</span>
                </div>
            </div>

            <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="w-full h-12 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 mb-4"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                Google로 계속하기
            </button>

            {/* 모드 전환 */}
            <div className="text-center">
                <button
                    type="button"
                    onClick={() => {
                        setIsLoginMode(!isLoginMode);
                        setValidationError(null);
                        clearError();
                    }}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                >
                    {isLoginMode ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                </button>
            </div>
        </div>
    );
}
