import { useEffect, useState } from 'react';
import { getUnregisteredSitesStats } from '@/services/supabase/unregisteredSites';
import type { UnregisteredSiteStats } from '@/services/supabase/unregisteredSites';
import { Card, CardContent } from '@/components/ui';
import { ExternalLink, TrendingUp, Users, Calendar } from 'lucide-react';

export function UnregisteredSitesPanel() {
  const [stats, setStats] = useState<UnregisteredSiteStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getUnregisteredSitesStats();
      setStats(data);
    } catch (error) {
      console.error('[UnregisteredSitesPanel] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>아직 수집된 미등록 쇼핑몰이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">미등록 쇼핑몰 통계</h2>
          <p className="text-sm text-gray-500 mt-1">
            사용자들이 시도한 미등록 쇼핑몰 목록 (인기순)
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary-600">{stats.length}</div>
          <div className="text-xs text-gray-500">총 도메인</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">총 방문 횟수</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.reduce((sum, s) => sum + s.total_visits, 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">총 사용자 수</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.reduce((sum, s) => sum + s.unique_users, 0).toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">평균 방문/사이트</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(stats.reduce((sum, s) => sum + s.total_visits, 0) / stats.length).toFixed(1)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순위
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    도메인
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자 수
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 방문
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    최근 방문
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((site, index) => (
                  <tr key={site.domain} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-sm font-bold">
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://${site.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 group"
                        >
                          {site.domain}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        첫 발견: {new Date(site.first_discovered).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {site.unique_users}명
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {site.total_visits.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                      {new Date(site.last_visit).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="px-3 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                        등록하기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500 text-center mt-4">
        💡 사용자 수와 방문 횟수가 많은 쇼핑몰을 우선적으로 등록하는 것을 권장합니다.
      </div>
    </div>
  );
}
