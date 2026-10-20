import React from 'react';
import { Language } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  HelpCircle,
  Sparkles,
  X,
  LogOut,
} from 'lucide-react';
import { AuthUser } from '../types/index.ts';
import { CertLogo } from './CertLogo.tsx';

export type NavTab = 'dashboard' | 'surveys' | 'complaints' | 'reports' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  language: Language;
  complaintsCount: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenWhatsApp?: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  language,
  complaintsCount,
  isOpen,
  onClose,
  onOpenWhatsApp,
  currentUser,
  onLogout,
}) => {
  const t = translations[language];

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: t.dashboard,
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'surveys' as NavTab,
      label: t.surveys,
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'complaints' as NavTab,
      label: t.complaints,
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: complaintsCount > 0 ? complaintsCount : undefined,
      badgeColor: 'bg-rose-600 text-white',
    },
    {
      id: 'reports' as NavTab,
      label: t.reports,
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings' as NavTab,
      label: t.settings,
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-2xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 left-0 h-full lg:h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200/90 z-50 lg:z-10 flex flex-col justify-between transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-5">
          {/* Mobile close button & brand */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CertLogo className="h-8 w-auto" />
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-white text-indigo-700' : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {onOpenWhatsApp && (
            <button
              type="button"
              onClick={() => {
                onOpenWhatsApp();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/90 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 fill-[#25D366]" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.578 1.77.886 2.791.886h.001c3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.772-5.768-5.772zm3.388 8.167c-.145.407-.732.748-1.023.79-.279.041-.637.058-1.033-.069-.24-.077-.55-.179-.955-.355-1.724-.749-2.848-2.511-2.934-2.625-.086-.115-.7-1.026-.7-1.956 0-.931.488-1.389.662-1.579.174-.19.38-.238.507-.238.127 0 .254.001.365.006.118.006.275-.045.431.33.161.387.549 1.341.597 1.439.048.098.08.213.016.34-.064.127-.096.206-.191.317-.095.111-.2.248-.286.333-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.847 1.53.942.19.095.301.079.412-.048.111-.127.476-.555.603-.746.127-.19.254-.159.428-.095.174.063 1.111.524 1.301.619.19.095.317.143.365.222.048.079.048.46-.097.867z" />
                </svg>
                <span>Alertes WhatsApp IA</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          )}
        </div>

        {/* User Profile Card & Logout in Sidebar */}
        {currentUser && (
          <div className="mx-4 mt-auto mb-2 p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                  currentUser.role === 'admin'
                    ? 'bg-indigo-600'
                    : currentUser.role === 'quality_manager'
                    ? 'bg-emerald-600'
                    : 'bg-blue-600'
                }`}
              >
                {currentUser.avatarInitials}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {currentUser.roleTitle}
                </span>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title={t.signOutBtn}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Bottom AI Status Banner */}
        <div className="p-4 mx-4 mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/80 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-950">Moteur Gemini IA</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Analyse automatique de sentiment, détection des réclamations et recommandations d'amélioration.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Serveur opérationnel</span>
          </div>
        </div>
      </aside>
    </>
  );
};
