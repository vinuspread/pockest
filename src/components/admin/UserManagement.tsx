import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase/client';
import { Button, Card } from '@/components/ui';
import { Ban, Trash2, ShieldAlert, CheckCircle } from 'lucide-react';
import { Profile } from '@/types/database';

export function UserManagement() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBanToggle = async (id: string, currentStatus: boolean | undefined) => {
        const action = currentStatus ? '차단 해제' : '차단';
        if (!confirm(`정말 이 사용자를 ${action} 하시겠습니까?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            await fetchUsers();
        } catch (err) {
            console.error('Failed into update ban status:', err);
            alert('작업 실패');
        }
    };

    const handleForceDelete = async (id: string) => {
        // NOTE: This usually requires a backend function to delete from auth.users too.
        // For now, we will mark them as deleted or trying to delete from profiles if RLS allows.
        // The user requested "Force Delete (Expel)".

        if (!confirm('주의: 이 작업은 되돌릴 수 없습니다. 사용자를 영구 삭제하시겠습니까?')) return;

        try {
            // In a real app, call Edge Function: await supabase.functions.invoke('admin-delete-user', { body: { userId: id } })
            // Here, we try direct delete from profiles (which might fail if foreign keys exist)
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
            alert('삭제 실패 (제약 조건이나 권한 문제일 수 있습니다. 완전한 삭제를 위해선 Edge Function이 필요합니다).');
        }
    };

    if (loading) return <div>사용자 목록 로딩 중...</div>;

    return (
        <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">회원 관리</h2>
                <div className="text-sm text-gray-500 mt-1">
                    총 회원: {users.length}명
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
                        <tr>
                            <th className="px-6 py-4">사용자</th>
                            <th className="px-6 py-4">상태</th>
                            <th className="px-6 py-4">정보</th>
                            <th className="px-6 py-4">가입일</th>
                            <th className="px-6 py-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{user.email}</span>
                                        <span className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}...</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.is_banned ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                            <ShieldAlert className="w-3 h-3" />
                                            차단됨
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            <CheckCircle className="w-3 h-3" />
                                            활동중
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="flex flex-col gap-1">
                                        <span className="capitalize">{user.tier === 'premium' ? '프리미엄' : '무료'}</span>
                                        {user.country && <span className="text-xs text-gray-400">🏳️ {user.country}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant={user.is_banned ? "secondary" : "ghost"}
                                            className={user.is_banned ? "" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
                                            onClick={() => handleBanToggle(user.id, user.is_banned)}
                                            size="sm"
                                        >
                                            <Ban className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleForceDelete(user.id)}
                                            size="sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
