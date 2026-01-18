import { Card, CardContent } from '@/components/ui';
import { Star } from 'lucide-react';

export function EmptyState() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-primary-500 fill-primary-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">아직 저장된 상품이 없네요!</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Pockest가 어떻게 보이는지 미리 확인해보세요.<br />
                    쇼핑몰에서 마음에 드는 상품을 저장하면 이렇게 정리됩니다.
                </p>

                {/* 데모 그리드 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 opacity-70 pointer-events-none select-none relative">
                    {/* 데모 오버레이 - 클릭 유도 */}
                    <div className="absolute inset-0 z-10"></div>

                    {/* 데모 아이템 1: 캠핑 */}
                    <Card className="overflow-hidden border-dashed border-2 border-primary-200 bg-white">
                        <div className="aspect-square bg-gray-100 relative">
                            <img src="https://loremflickr.com/400/400/camping,tent" alt="Demo" className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="p-4">
                            <p className="text-xs text-primary-600 font-bold mb-1">Camping World</p>
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">초경량 2인용 백패킹 텐트 방수 3000mm</h3>
                            <p className="font-bold text-gray-900">249,000원</p>
                        </CardContent>
                    </Card>

                    {/* 데모 아이템 2: 데스크테리어 */}
                    <Card className="overflow-hidden border-dashed border-2 border-primary-200 bg-white">
                        <div className="aspect-square bg-gray-100 relative">
                            <img src="https://loremflickr.com/400/400/desk,computer" alt="Demo" className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="p-4">
                            <p className="text-xs text-primary-600 font-bold mb-1">Desk Setup</p>
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">원목 모니터 받침대 듀얼 모니터용</h3>
                            <p className="font-bold text-gray-900">45,000원</p>
                        </CardContent>
                    </Card>

                    {/* 데모 아이템 3: 웨딩/인테리어 */}
                    <Card className="overflow-hidden border-dashed border-2 border-primary-200 bg-white">
                        <div className="aspect-square bg-gray-100 relative">
                            <img src="https://loremflickr.com/400/400/furniture,interior" alt="Demo" className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="p-4">
                            <p className="text-xs text-primary-600 font-bold mb-1">Maison</p>
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">모던 세라믹 식탁 조명 펜던트</h3>
                            <p className="font-bold text-gray-900">128,000원</p>
                        </CardContent>
                    </Card>

                    {/* 데모 아이템 4: 패션 */}
                    <Card className="overflow-hidden border-dashed border-2 border-primary-200 bg-white">
                        <div className="aspect-square bg-gray-100 relative">
                            <img src="https://loremflickr.com/400/400/fashion,bag" alt="Demo" className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="p-4">
                            <p className="text-xs text-primary-600 font-bold mb-1">Luxury Brand</p>
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">클래식 사첼백 브라운 가죽</h3>
                            <p className="font-bold text-gray-900">350,000원</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-8">
                    <p className="text-sm text-primary-600 font-medium bg-primary-50 inline-block px-4 py-2 rounded-full">
                        ✨ 이제 당신만의 위시리스트를 채워보세요!
                    </p>
                </div>
            </div>
        </div>
    );
}
