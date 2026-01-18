import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase/client';
import { Button, Card, CardContent } from '@/components/ui';
import { AddPlatformModal } from '@/components/admin/AddPlatformModal';
import { UserManagement } from '@/components/admin/UserManagement'; // Import
import { Plus, Users, BarChart3, Link as LinkIcon } from 'lucide-react'; // Added icons

interface AffiliatePlatform {
    id: string;
    name: string;
    domains: string[];
    type: 'param_injection' | 'api_generation';
    config: any;
    is_active: boolean;
}

export default function AdminDashboard() {
    const [platforms, setPlatforms] = useState<AffiliatePlatform[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<AffiliatePlatform | null>(null);
    const [activeTab, setActiveTab] = useState<'platforms' | 'users' | 'analytics'>('platforms'); // Tab State

    useEffect(() => {
        if (activeTab === 'platforms') {
            fetchPlatforms();
        }
    }, [activeTab]);

    const fetchPlatforms = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('affiliate_platforms')
                .select('*')
                .order('name');

            if (error) throw error;
            setPlatforms(data || []);
        } catch (err) {
            console.error('Failed to fetch platforms:', err);
        } finally {
            setLoading(false);
        }
    };

    const togglePlatform = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('affiliate_platforms')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            await fetchPlatforms();
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Update failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this platform?')) return;

        try {
            const { error } = await supabase
                .from('affiliate_platforms')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchPlatforms();
        } catch (err) {
            console.error('Failed to delete platform:', err);
            alert('Delete failed');
        }
    };

    const openEditModal = (platform: AffiliatePlatform) => {
        setSelectedPlatform(platform);
        setIsAddModalOpen(true);
    };

    const handleModalClose = () => {
        setIsAddModalOpen(false);
        setSelectedPlatform(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl w-fit shadow-sm border border-gray-200">
                        <button
                            onClick={() => setActiveTab('platforms')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'platforms' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <LinkIcon className="w-4 h-4" />
                            제휴 플랫폼
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Users className="w-4 h-4" />
                            회원 관리
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            통계
                        </button>
                    </div>
                </div>

                {activeTab === 'users' && <UserManagement />}

                {activeTab === 'analytics' && (
                    <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
                        준비 중입니다... 🚧
                    </div>
                )}

                {activeTab === 'platforms' && (
                    <>
                        <div className="flex justify-end mb-6">
                            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                플랫폼 추가
                            </Button>
                        </div>

                        <AddPlatformModal
                            isOpen={isAddModalOpen}
                            onClose={handleModalClose}
                            onSuccess={() => {
                                handleModalClose();
                                fetchPlatforms();
                            }}
                            initialData={selectedPlatform}
                        />

                        {/* Platforms List */}
                        <div className="grid gap-6">
                            {loading ? (
                                <div>로딩 중...</div>
                            ) : platforms.length === 0 ? (
                                <Card>
                                    <CardContent className="p-8 text-center text-gray-500">
                                        등록된 제휴 플랫폼이 없습니다. 추가해주세요.
                                    </CardContent>
                                </Card>
                            ) : (
                                platforms.map(platform => (
                                    <Card key={platform.id} className="overflow-hidden">
                                        <div className="p-6 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-bold text-gray-900">{platform.name}</h3>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${platform.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {platform.is_active ? '활성' : '비활성'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 font-mono">
                                                    {platform.domains.join(', ')}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="text-right mr-4">
                                                    <div className="text-xs text-gray-400 uppercase">타입</div>
                                                    <div className="text-sm font-medium">{platform.type}</div>
                                                </div>

                                                <Button
                                                    onClick={() => openEditModal(platform)}
                                                    variant="ghost"
                                                    className="text-gray-500 hover:text-gray-900"
                                                >
                                                    수정
                                                </Button>

                                                <Button
                                                    onClick={() => handleDelete(platform.id)}
                                                    variant="ghost"
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    삭제
                                                </Button>

                                                <Button
                                                    onClick={() => togglePlatform(platform.id, platform.is_active)}
                                                    variant={platform.is_active ? "secondary" : "primary"}
                                                >
                                                    {platform.is_active ? '비활성화' : '활성화'}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Config Preview (Optional) */}
                                        <div className="bg-gray-50 px-6 py-3 border-t text-xs font-mono text-gray-600">
                                            {JSON.stringify(platform.config)}
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
