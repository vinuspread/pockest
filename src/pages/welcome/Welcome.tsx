import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Pin, PanelRight, ArrowRight, Sparkles, Globe } from 'lucide-react';
import { supportedLanguages, languageNames, changeLanguage, getCurrentLanguage, type SupportedLanguage } from '../../i18n';

export default function Welcome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();

  const handleGetStarted = () => {
    // 대시보드로 이동 (로그인 필요 시 자동으로 로그인 화면 표시)
    navigate('/dashboard');
  };

  const handleLanguageChange = (lng: SupportedLanguage) => {
    changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-6 relative">
      {/* 언어 선택기 */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-400" />
        <select
          value={currentLang}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 cursor-pointer"
        >
          {supportedLanguages.map((lng) => (
            <option key={lng} value={lng}>
              {languageNames[lng]}
            </option>
          ))}
        </select>
      </div>

      <div className="max-w-4xl w-full">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-6 shadow-lg shadow-violet-200">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3 flex-wrap">
            {t('welcome.title')}
            <Sparkles className="w-8 h-8 text-violet-500" />
          </h1>
          <p className="text-lg text-gray-600">
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* 가이드 카드 (3단계) */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
              <Pin className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold">
                1
              </span>
              <h3 className="text-lg font-semibold text-gray-900">{t('welcome.step1_title')}</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('welcome.step1_desc')}
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <PanelRight className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold">
                2
              </span>
              <h3 className="text-lg font-semibold text-gray-900">{t('welcome.step2_title')}</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('welcome.step2_desc')}
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold">
                3
              </span>
              <h3 className="text-lg font-semibold text-gray-900">{t('welcome.step3_title')}</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('welcome.step3_desc')}
            </p>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-8 text-center text-white mb-8 shadow-lg">
          <h3 className="text-xl font-semibold mb-3">{t('welcome.tips_title')}</h3>
          <div className="space-y-2 text-violet-50">
            <p>{t('welcome.tip1')}</p>
            <p>{t('welcome.tip2')}</p>
            <p>{t('welcome.tip3')}</p>
          </div>
        </div>

        {/* 시작하기 버튼 */}
        <div className="text-center">
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-3 px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 transition-all transform hover:scale-105"
          >
            {t('welcome.start_btn')}
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-4 text-sm text-gray-500">
            {t('welcome.start_hint')}
          </p>
        </div>
      </div>
    </div>
  );
}
