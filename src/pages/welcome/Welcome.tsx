import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button } from '@/components/ui';
import { ArrowRight, ShoppingBag } from 'lucide-react';

export default function Welcome() {
    const navigate = useNavigate();

    const handleStart = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl border-0 overflow-hidden">
                <div className="bg-primary-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Pockest 시작하기</h1>
                    <p className="text-primary-100 text-sm">
                        더 똑똑한 쇼핑을 위한 당신만의 포켓
                    </p>
                </div>

                <CardContent className="p-8 space-y-8">
                    {/* Step 1 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-600 font-bold">1</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">상품 담기</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                쇼핑몰에서 사고 싶은 상품을 발견하면<br />
                                Pockest 버튼을 눌러 바로 저장하세요.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-600 font-bold">2</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">가격 추적</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                저장한 상품의 가격 변동을<br />
                                실시간으로 감지하고 알려드립니다.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-600 font-bold">3</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">폴더 관리</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                나만의 폴더를 만들어<br />
                                위시리스트를 깔끔하게 정리하세요.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleStart}
                        className="w-full h-12 text-lg font-bold bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all gap-2"
                    >
                        시작하기 <ArrowRight className="w-5 h-5" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
