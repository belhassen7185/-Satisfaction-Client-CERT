/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Survey,
  Language,
  AppNotification,
  AuthUser,
  AppSettings,
} from './types/index.ts';
import { api } from './services/api.ts';
import { authService } from './services/auth.ts';
import { clientStorage } from './services/clientStorage.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { SurveyList } from './components/SurveyList.tsx';
import { SurveyEditor } from './components/SurveyEditor.tsx';
import { ComplaintsView } from './components/ComplaintsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SurveyPublicView } from './components/SurveyPublicView.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { WhatsAppModal } from './components/WhatsAppModal.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { CertLogo } from './components/CertLogo.tsx';
import { Monitor, Smartphone, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [appSettings, setAppSettings] = useState<AppSettings>(() => clientStorage.getSettings());
  const [language, setLanguage] = useState<Language>('fr');
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Surveys state
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);

  // Survey editing & preview
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');

  // Notifications & Active Complaints
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unhandledComplaintsCount, setUnhandledComplaintsCount] = useState<number>(0);
  const [selectedReportSurveyId, setSelectedReportSurveyId] = useState<string | null>(null);

  // Public survey query param check (?survey=id&channel=...)
  const [publicSurveyId, setPublicSurveyId] = useState<string | null>(null);
  const [publicChannel, setPublicChannel] = useState<'web' | 'qr' | 'whatsapp' | 'email'>('web');
  const [publicSurvey, setPublicSurvey] = useState<Survey | null>(null);
  const [loadingPublicSurvey, setLoadingPublicSurvey] = useState(false);

  useEffect(() => {
    // Check URL parameters on mount (?survey=... or in hash #?survey=...)
    let sId: string | null = null;
    let ch: 'web' | 'qr' | 'whatsapp' | 'email' = 'web';

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('survey')) {
      sId = searchParams.get('survey');
      ch = (searchParams.get('channel') as any) || 'web';
    } else if (window.location.hash) {
      const hashPart = window.location.hash.includes('?')
        ? window.location.hash.split('?')[1]
        : window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashPart);
      if (hashParams.has('survey')) {
        sId = hashParams.get('survey');
        ch = (hashParams.get('channel') as any) || 'web';
      }
    }

    if (sId) {
      setPublicSurveyId(sId);
      setPublicChannel(ch);
      setLoadingPublicSurvey(true);
      api.getSurvey(sId)
        .then((data) => {
          setPublicSurvey(data);
          setLoadingPublicSurvey(false);
        })
        .catch((err) => {
          console.warn('Could not fetch survey directly, using available list', err);
          setLoadingPublicSurvey(false);
        });
    }
  }, []);

  // Update document direction and language on change
  useEffect(() => {
    const isRtl = language === 'ar' || language === 'tn';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language === 'fr' ? 'fr' : 'ar';
  }, [language]);

  const loadSurveys = async () => {
    setLoadingSurveys(true);
    try {
      const data = await api.getSurveys();
      if (Array.isArray(data)) {
        setSurveys(data);
      }
    } catch (err) {
      console.warn('Surveys refresh note:', err);
    } finally {
      setLoadingSurveys(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
      const cmps = await api.getComplaints();
      if (Array.isArray(cmps)) {
        const active = cmps.filter((c) => c.status === 'new' || c.status === 'in_progress').length;
        setUnhandledComplaintsCount(active);
      } else {
        setUnhandledComplaintsCount(0);
      }
    } catch (err) {
      console.warn('Notifications refresh note:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data && data.directorName) {
        setAppSettings(data);
        setCurrentUser((prev) => {
          if (!prev) return prev;
          if (prev.role === 'admin' || prev.username === 'admin' || prev.id === 'usr-admin') {
            const parts = data.directorName.trim().split(/\s+/);
            const initials = parts.length > 1
              ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
              : parts[0].slice(0, 2).toUpperCase();
            return {
              ...prev,
              name: data.directorName,
              roleTitle: data.directorTitle || prev.roleTitle,
              email: data.directorEmail || prev.email,
              avatarInitials: initials,
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Settings load note:', err);
    }
  };

  useEffect(() => {
    loadSettings();
    loadSurveys();
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // If a user accessed via public link or QR code (?survey=id)
  if (publicSurveyId) {
    if (loadingPublicSurvey && !publicSurvey) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-3 bg-white rounded-2xl shadow-md mb-4 border border-slate-100">
            <CertLogo size="sm" className="h-9 w-auto" />
          </div>
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <h2 className="text-base font-bold text-slate-800">Satisfaction Client CERT</h2>
          <p className="text-xs text-slate-500 mt-1">Chargement de votre questionnaire en cours...</p>
        </div>
      );
    }

    const surveyToRender = publicSurvey || surveys.find((s) => s.id === publicSurveyId) || {
      id: publicSurveyId,
      title: 'Enquête de satisfaction',
      description: 'Merci de partager votre avis pour nous aider à améliorer nos prestations.',
      language: language,
      status: 'published' as const,
      category: 'Services',
      targetResponses: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responseCount: 0,
      csatScore: 0,
      npsScore: 0,
      complaintQuestion: {
        enabled: true,
        title: 'Avez-vous une réclamation concernant un dossier lié à nos services ? Si oui, partagez-la avec nous en nous expliquant votre problème.',
        requireDossierNumber: false,
        requireContactInfo: false,
      },
      questions: [
        {
          id: 'q1',
          text: 'Comment évaluez-vous la qualité globale de l\'accueil et du service reçu ?',
          type: 'stars' as const,
          required: true,
          order: 1,
        },
        {
          id: 'q2',
          text: 'Sur une échelle de 0 à 10, recommanderiez-vous notre organisation ?',
          type: 'nps' as const,
          required: true,
          order: 2,
        },
        {
          id: 'q3',
          text: 'Partagez vos remarques ou suggestions libres (écrites ou vocales)',
          type: 'voice' as const,
          required: false,
          order: 3,
        },
      ],
    };

    return (
      <div>
        {/* Quick return bar if testing from dashboard */}
        <div className="bg-slate-900 text-white text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Mode Usager Public (Enquête CERT)</span>
          </div>
          <button
            onClick={() => {
              setPublicSurveyId(null);
              window.history.replaceState({}, '', window.location.pathname);
              loadSurveys();
              loadNotifications();
            }}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
          >
            Retour à l'Administration
          </button>
        </div>
        <SurveyPublicView
          survey={surveyToRender}
          channel={publicChannel}
        />
      </div>
    );
  }

  // Dashboard Access Control: show LoginPage if not authenticated
  if (!currentUser) {
    return (
      <LoginPage
        language={language}
        onLanguageChange={setLanguage}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadSurveys();
          loadNotifications();
        }}
      />
    );
  }

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenWhatsApp={() => setShowWhatsAppModal(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNavigateToComplaints={() => {
          setCurrentTab('complaints');
          setEditingSurvey(null);
          setIsCreatingNew(false);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex">
        {/* SaaS Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setEditingSurvey(null);
            setIsCreatingNew(false);
          }}
          language={language}
          complaintsCount={unhandledComplaintsCount}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenWhatsApp={() => setShowWhatsAppModal(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Conditional View Rendering */}
          {editingSurvey || isCreatingNew ? (
            <SurveyEditor
              survey={editingSurvey}
              language={language}
              onSave={(saved) => {
                setEditingSurvey(null);
                setIsCreatingNew(false);
                loadSurveys();
              }}
              onCancel={() => {
                setEditingSurvey(null);
                setIsCreatingNew(false);
              }}
              onPreview={(previewObj) => setPreviewSurvey(previewObj)}
            />
          ) : currentTab === 'dashboard' ? (
            <Dashboard
              surveys={surveys}
              language={language}
              onNavigateToSurveys={() => setCurrentTab('surveys')}
              onNavigateToComplaints={() => setCurrentTab('complaints')}
              onNavigateToReports={() => setCurrentTab('reports')}
            />
          ) : currentTab === 'surveys' ? (
            <SurveyList
              surveys={surveys}
              language={language}
              onSelectSurvey={(s) => setEditingSurvey(s)}
              onCreateNew={() => {
                setEditingSurvey(null);
                setIsCreatingNew(true);
              }}
              onPreview={(s) => setPreviewSurvey(s)}
              onRefresh={() => {
                loadSurveys();
                loadNotifications();
              }}
              onViewReport={(sId) => {
                setSelectedReportSurveyId(sId);
                setCurrentTab('reports');
              }}
            />
          ) : currentTab === 'complaints' ? (
            <ComplaintsView language={language} />
          ) : currentTab === 'reports' ? (
            <ReportsView language={language} initialSurveyId={selectedReportSurveyId || undefined} />
          ) : currentTab === 'settings' ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Paramètres Généraux &amp; Direction</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gérez l'identité institutionnelle du CERT, les coordonnées de la direction et la conformité.
                  </p>
                </div>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Modifier les paramètres
                </button>
              </div>

              {/* Director Card Preview */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {currentUser?.avatarInitials ||
                      (appSettings.directorName
                        ? appSettings.directorName
                            .trim()
                            .split(/\s+/)
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'MB')}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      Directeur Actuel Enregistré
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {currentUser?.name || appSettings.directorName || 'Mounir Ben Salah'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {currentUser?.roleTitle || appSettings.directorTitle || 'Directeur Général & Administrateur CERT'} • {currentUser?.email || appSettings.directorEmail || 'admin@cert.tn'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Changer le nom du directeur
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Survey Preview Mockup Modal (Desktop / Mobile toggle) */}
      {previewSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl h-[92vh] bg-slate-900 rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-slate-800">
            {/* Mockup Header Toolbar */}
            <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Prévisualisation en direct</span>
                <span className="text-[11px] text-slate-500 line-clamp-1">({previewSurvey.title})</span>
              </div>

              {/* Viewport switch: Desktop vs Smartphone */}
              <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    previewViewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Ordinateur</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    previewViewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Smartphone</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewSurvey(null);
                  loadSurveys();
                  loadNotifications();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mockup Display Container */}
            <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-y-auto">
              <div
                className={`transition-all duration-300 bg-white rounded-2xl shadow-2xl overflow-y-auto h-full ${
                  previewViewport === 'mobile'
                    ? 'w-[390px] max-w-full border-8 border-slate-800 rounded-[40px] shadow-2xl'
                    : 'w-full'
                }`}
              >
                <SurveyPublicView
                  survey={previewSurvey}
                  isPreview={true}
                  onClosePreview={() => {
                    setPreviewSurvey(null);
                    loadSurveys();
                    loadNotifications();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          language={language}
          onClose={() => setShowSettingsModal(false)}
          currentUser={currentUser}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            setAppSettings((prev) => ({
              ...prev,
              directorName: updated.name,
              directorTitle: updated.roleTitle,
              directorEmail: updated.email,
            }));
          }}
        />
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          language={language}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
    </div>
  );
}
