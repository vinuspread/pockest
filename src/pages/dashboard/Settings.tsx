import { useAuthStore } from '../../store/useAuthStore';
import { LogOut, UserX, Info, Heart, Github } from 'lucide-react';
import manifest from '../../../manifest.json';

export default function Settings() {
  const { user, signOut, withdraw } = useAuthStore();

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) signOut();
  };

  const handleWithdraw = () => {
    const message = "⚠️ [경고] 정말로 탈퇴하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 저장된 모든 포켓과 상품 데이터가 영구 삭제됩니다.";
    if (confirm(message)) withdraw();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">계정 설정</h1>

      {/* 프로필 카드 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
          {user?.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{user?.user_metadata?.full_name || '사용자'}</h2>
          <p className="text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">로그아웃</p>
              <p className="text-sm text-gray-500">현재 기기에서 로그아웃합니다.</p>
            </div>
          </button>

          <button
            onClick={handleWithdraw}
            className="w-full flex items-center px-6 py-4 text-left hover:bg-red-50 transition-colors group"
          >
            <UserX className="w-5 h-5 mr-3 text-red-400 group-hover:text-red-500" />
            <div>
              <p className="font-medium text-red-600">회원 탈퇴</p>
              <p className="text-sm text-red-400">계정과 모든 데이터를 영구 삭제합니다.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

