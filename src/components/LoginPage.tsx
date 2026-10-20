import React, { useState } from 'react';
import { Language, AuthUser } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { CertLogo } from './CertLogo.tsx';
import { authService } from '../services/auth.ts';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  BarChart3,
  AlertCircle,
  Building2,
} from 'lucide-react';

interface LoginPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  language,
  onLanguageChange,
  onLoginSuccess,
}) => {
  const t = translations[language] || translations.fr;
  const isRtl = language === 'ar' || language === 'tn';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage(
        language === 'fr'
          ? 'Veuillez saisir votre identifiant et votre mot de passe.'
          : 'الرجاء إدخال اسم المستخدم وكلمة المرور.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const user = await authService.login(username, password, rememberMe);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(t.invalidCredentialsError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100 ${
        isRtl ? 'rtl' : 'ltr'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Left Institutional & Visual Showcase Pane */}
      <div className="lg:w-7/12 relative bg-gradient-to-br from-slate-950 via-[#0a1936] to-[#08203e] p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Ambient Glows echoing CERT colors: Emerald (#00a884) & Purple (#6b2185) & Telecom Blue */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Republic & Ministry */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center p-1.5 shadow-sm">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase">
                {language === 'ar' || language === 'tn'
                  ? 'الجمهورية التونسية • وزارة تكنولوجيات الاتصال'
                  : 'République Tunisienne • Ministère des Technologies de la Communication'}
              </p>
              <h2 className="text-xs font-semibold text-slate-300">
                Centre d'Études et de Recherche des Télécommunications (CERT)
              </h2>
            </div>
          </div>
        </div>

        {/* Hero Visual Presentation with the CERT Logo Photo Asset */}
        <div className="relative z-10 my-8 sm:my-12 max-w-xl">
          {/* Logo Showcase Box */}
          <div className="inline-flex p-4 sm:p-5 rounded-3xl bg-white/95 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl border border-white/20 mb-8 hover:scale-[1.02] transition-transform duration-300">
            <CertLogo size="xl" className="h-16 sm:h-20 w-auto" />
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {language === 'ar'
              ? 'المنظومة الذكية لقياس رضا الحرفاء ومتابعة الشكاوى'
              : language === 'tn'
              ? 'المنظومة الذكية لقياس رضا الحرفاء ومتابعة التشكيات'
              : 'Système Intelligent de Mesure de Satisfaction & Gestion des Réclamations'}
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            {language === 'ar'
              ? 'منصة رقمية متكاملة تابعة لمركز الدراسات والبحوث للاتصالات تعتمد على الذكاء الاصطناعي لتحليل الاستبيانات ورصد التشكيات في الإبان مع إشعارات واتساب فورية.'
              : language === 'tn'
              ? 'منظومة عصرية تابعة للـ CERT تعاون في متابعة تقييم الخدمات وتحليل التشكيات بالذكاء الاصطناعي مع إشعارات واتساب لحظية.'
              : 'Plateforme institutionnelle d\'écoute usagers et de gouvernance de la qualité, pilotée par le CERT avec analyse de sentiment IA, alertes WhatsApp en temps réel et suivi rigoureux des dossiers.'}
          </p>

          {/* Key Advantages Grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {language === 'ar' || language === 'tn' ? 'مؤشرات CSAT & NPS' : 'Indicateurs CSAT & NPS'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'ar' || language === 'tn'
                    ? 'جمع متواصل عبر الويب، الباركود QR، والرسائل'
                    : 'Collecte multicanale continue et temps réel'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {language === 'ar' || language === 'tn' ? 'تحليل ذكي فوري' : 'Intelligence Artificielle'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'ar' || language === 'tn'
                    ? 'تلخيص آلي، تصنيف الأولويات واقتراح الحلول'
                    : 'Diagnostic automatique et suggestions d\'actions'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {language === 'ar' || language === 'tn' ? 'تنبيهات واتساب' : 'Alertes WhatsApp'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'ar' || language === 'tn'
                    ? 'إشعار مباشر للمسؤولين عند كل شكوى عاجلة'
                    : 'Notification immédiate des dossiers prioritaires'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {language === 'ar' || language === 'tn' ? 'حوكمة الجودة' : 'Gouvernance Qualité'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'ar' || language === 'tn'
                    ? 'سجل تدقيق كامل ومطابقة لمعايير ISO'
                    : 'Traçabilité complète des réclamations'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance Footnote */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium">Système Opérationnel • Pôle Qualité CERT</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Conforme ISO 9001:2015 & Protection des Données Personnelles
          </span>
        </div>
      </div>

      {/* Right Login Form Pane */}
      <div className="lg:w-5/12 bg-slate-900 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Top bar with Language Switcher */}
        <div className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Langue / اللغة :</span>
          </div>
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onLanguageChange('fr')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'fr'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('ar')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'ar'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('tn')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'tn'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              تونسي
            </button>
          </div>
        </div>

        {/* Center Login Card */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          <div className="text-center sm:text-left">
            <div className="inline-block lg:hidden mb-4 p-3 bg-white rounded-2xl shadow-md">
              <CertLogo size="sm" className="h-9 w-auto" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {t.loginTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              {t.loginSubtitle}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {t.usernameLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin ou admin@cert.tn"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password field with Show/Hide toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-medium">
                  {t.rememberMe}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Vérification des accès...</span>
                </>
              ) : (
                <>
                  <span>{t.signInBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-800 text-center text-slate-500 text-[11px]">
          <p>© 2026 CERT Tunisie • Centre d'Études et de Recherche des Télécommunications</p>
        </div>
      </div>
    </div>
  );
};
