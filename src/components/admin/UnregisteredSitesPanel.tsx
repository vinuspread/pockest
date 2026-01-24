import { useEffect, useState } from 'react';
import { getUnregisteredSitesStats } from '@/services/supabase/unregisteredSites';
import type { UnregisteredSiteStats } from '@/services/supabase/unregisteredSites';
import { Card, CardContent } from '@/components/ui';
import { ExternalLink, TrendingUp, Users, Calendar, Copy, Check, X, AlertCircle } from 'lucide-react';

export function UnregisteredSitesPanel() {
  const [stats, setStats] = useState<UnregisteredSiteStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [copied, setCopied] = useState(false);

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

  const handleRegisterClick = (domain: string) => {
    setSelectedDomain(domain);
    setShowGuideModal(true);
    setCopied(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                      <button 
                        onClick={() => handleRegisterClick(site.domain)}
                        className="px-3 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                      >
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

      {/* Registration Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">쇼핑몰 등록 가이드</h2>
                  <p className="text-sm text-gray-500">AI에게 제공할 정보 수집 방법</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuideModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Selected Domain Info */}
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-2">등록할 쇼핑몰 도메인:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-4 py-2 rounded-lg font-mono text-sm font-semibold text-gray-900 border border-gray-200">
                    {selectedDomain}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedDomain)}
                    className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                  </button>
                </div>
              </div>

              {/* Step-by-step Guide */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  쇼핑몰 기본 정보 수집
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">📌 쇼핑몰 이름</p>
                    <p className="text-sm text-gray-600">예) "무신사", "Amazon", "AliExpress"</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">🌐 도메인 (이미 수집됨)</p>
                    <code className="text-sm text-primary-600 font-mono">{selectedDomain}</code>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-6">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  이미지 CDN 주소 확인 (중요!)
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-gray-700 font-medium">⚠️ 이미지 로딩 실패를 방지하려면 CDN 정보가 필수입니다.</p>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">📋 확인 방법:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-2">
                      <li>
                        <strong>{selectedDomain}</strong> 접속 후 상품 상세 페이지로 이동
                      </li>
                      <li>
                        <kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">F12</kbd> 눌러 개발자 도구 열기
                      </li>
                      <li>
                        <strong>Network</strong> 탭 클릭 → <strong>Img</strong> 필터 선택
                      </li>
                      <li>
                        페이지 새로고침 (<kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl+R</kbd>)
                      </li>
                      <li>
                        상품 이미지 파일 클릭 → <strong>Headers</strong> 탭에서 <code className="bg-white px-1 py-0.5 rounded text-xs">Request URL</code> 확인
                      </li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-amber-300">
                    <p className="text-xs font-semibold text-gray-700 mb-2">예시:</p>
                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">쿠팡:</span>
                        <code className="text-primary-600">https://thumbnail.coupangcdn.com/...</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">아마존:</span>
                        <code className="text-primary-600">https://m.media-amazon.com/images/...</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">알리:</span>
                        <code className="text-primary-600">https://ae01.alicdn.com/...</code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      💡 <strong>팁:</strong> 이미지 우클릭 → "이미지 주소 복사"로도 확인 가능합니다.
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-6">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                  AI 에이전트에게 요청하기
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-gray-700 font-medium">다음 형식으로 Cursor AI에게 요청하세요:</p>
                  
                  <div className="bg-white rounded-lg border border-gray-300 p-4 font-mono text-sm">
                    <div className="text-gray-600 mb-2">// 복사해서 사용하세요 👇</div>
                    <div className="space-y-1 text-gray-900">
                      <div>
                        <span className="text-primary-600 font-semibold">{selectedDomain}</span> 쇼핑몰 등록해줘.
                      </div>
                      <div className="text-gray-500 text-xs mt-3">// 추가 정보가 있다면:</div>
                      <div className="text-gray-700">
                        - 쇼핑몰 이름: <span className="text-amber-600">[이름]</span>
                      </div>
                      <div className="text-gray-700">
                        - CDN 도메인: <span className="text-amber-600">[*.cdn-domain.com]</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(`${selectedDomain} 쇼핑몰 등록해줘.`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        복사됨!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        요청 메시지 복사
                      </>
                    )}
                  </button>
                </div>

                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-6">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                  AI가 자동으로 처리하는 작업
                </h3>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 shrink-0">✓</span>
                      <span><strong>manifest.json</strong>에 도메인 추가 (host_permissions)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 shrink-0">✓</span>
                      <span><strong>siteDetector.ts</strong>에 등록된 쇼핑몰 리스트 추가</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 shrink-0">✓</span>
                      <span><strong>popup/index.html</strong>의 CSP에 CDN 추가 (제공 시)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 shrink-0">✓</span>
                      <span><strong>parser.ts</strong>에 쇼핑몰별 선택자 추가 (선택적)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 shrink-0">✓</span>
                      <span>빌드 + 커밋 + GitHub 푸시</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-100 rounded-xl p-4 mt-4">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>💡 참고:</strong> AI에게 요청 후 약 1-2분 내 자동으로 처리됩니다. 
                    완료되면 익스텐션을 재로드하여 새 쇼핑몰을 테스트하세요.
                    CDN 정보가 없어도 기본 이미지 추출 알고리즘이 작동하지만, 제공하면 더 정확합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
