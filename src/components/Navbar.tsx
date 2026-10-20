import React, { useState } from 'react';
import { Language, AppNotification } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import {
  Bell,
  Globe,
  Settings,
  User,
  CheckCircle2,
  AlertCircle,
  Menu,
  Shield,
  Sparkles,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { AuthUser } from '../types/index.ts';
import { CertLogo } from './CertLogo.tsx';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onNavigateToComplaints: () => void;
  onOpenWhatsApp?: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  notifications,
  onMarkNotificationRead,
  onOpenSettings,
  onToggleSidebar,
  onNavigateToComplaints,
  onOpenWhatsApp,
  currentUser,
  onLogout,
}) => {
  const t = translations[language];
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 h-16 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center py-1">
            <CertLogo className="h-10 w-auto" />
          </div>
          <div className="h-7 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">
              {t.appName}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium line-clamp-1">
              {t.appSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Language selector */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => onLanguageChange('fr')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              language === 'fr'
                ? 'bg-white shadow-xs text-indigo-700 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            FR
          </button>
          <button
            onClick={() => onLanguageChange('ar')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              language === 'ar'
                ? 'bg-white shadow-xs text-indigo-700 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            العربية
          </button>
          <button
            onClick={() => onLanguageChange('tn')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              language === 'tn'
                ? 'bg-white shadow-xs text-indigo-700 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تونسي
          </button>
        </div>

        {/* WhatsApp Real-Time Alerts Quick Trigger */}
        {onOpenWhatsApp && (
          <button
            onClick={onOpenWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Gérer les alertes WhatsApp en temps réel"
          >
            <svg className="w-4 h-4 fill-[#25D366]" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.578 1.77.886 2.791.886h.001c3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.772-5.768-5.772zm3.388 8.167c-.145.407-.732.748-1.023.79-.279.041-.637.058-1.033-.069-.24-.077-.55-.179-.955-.355-1.724-.749-2.848-2.511-2.934-2.625-.086-.115-.7-1.026-.7-1.956 0-.931.488-1.389.662-1.579.174-.19.38-.238.507-.238.127 0 .254.001.365.006.118.006.275-.045.431.33.161.387.549 1.341.597 1.439.048.098.08.213.016.34-.064.127-.096.206-.191.317-.095.111-.2.248-.286.333-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.847 1.53.942.19.095.301.079.412-.048.111-.127.476-.555.603-.746.127-.19.254-.159.428-.095.174.063 1.111.524 1.301.619.19.095.317.143.365.222.048.079.048.46-.097.867z" />
            </svg>
            <span className="hidden sm:inline">WhatsApp</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
            title={t.notifications}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-slate-900">{t.notifications}</span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucune notification pour le moment.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        onMarkNotificationRead(notif.id);
                        if (notif.type === 'complaint' || notif.type === 'whatsapp_alert') {
                          setShowNotifications(false);
                          onNavigateToComplaints();
                        }
                      }}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                        !notif.read ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          notif.type === 'whatsapp_alert'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {notif.type === 'whatsapp_alert' ? (
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.578 1.77.886 2.791.886h.001c3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.772-5.768-5.772zm3.388 8.167c-.145.407-.732.748-1.023.79-.279.041-.637.058-1.033-.069-.24-.077-.55-.179-.955-.355-1.724-.749-2.848-2.511-2.934-2.625-.086-.115-.7-1.026-.7-1.956 0-.931.488-1.389.662-1.579.174-.19.38-.238.507-.238.127 0 .254.001.365.006.118.006.275-.045.431.33.161.387.549 1.341.597 1.439.048.098.08.213.016.34-.064.127-.096.206-.191.317-.095.111-.2.248-.286.333-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.847 1.53.942.19.095.301.079.412-.048.111-.127.476-.555.603-.746.127-.19.254-.159.428-.095.174.063 1.111.524 1.301.619.19.095.317.143.365.222.048.079.048.46-.097.867z" />
                          </svg>
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span className="truncate">{notif.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(notif.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        {notif.whatsappUrl && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <a
                              href={notif.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ouvrir sur WhatsApp / إرسال</span>
                            </a>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {notif.deliveryMethod === 'callmebot_api'
                                ? 'Passerelle API CallMeBot'
                                : 'Transmission 1-clic'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title={t.settings}
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User profile avatar and logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div
            className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-xs ${
              currentUser?.role === 'admin'
                ? 'bg-indigo-600'
                : currentUser?.role === 'quality_manager'
                ? 'bg-emerald-600'
                : 'bg-slate-900'
            }`}
            title={currentUser?.email || 'admin@cert.tn'}
          >
            {currentUser?.avatarInitials || 'MB'}
          </div>
          <div className="hidden md:block text-left">
            <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[130px]">
              {currentUser?.name || localStorage.getItem('cert_director_name') || 'Directeur Général'}
            </span>
            <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
              {currentUser?.roleTitle || 'Direction Générale CERT'}
            </span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 ml-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title={t.signOutBtn}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
