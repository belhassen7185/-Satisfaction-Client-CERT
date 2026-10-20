import React, { useState, useEffect } from 'react';
import { Language, WhatsAppConfig, WhatsAppLog } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  X,
  Phone,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Bell,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Radio,
  Sliders,
  History
} from 'lucide-react';

interface WhatsAppModalProps {
  language: Language;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ language, onClose }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'logs'>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: true,
    recipientPhone: '+216 98 123 456',
    managerName: 'Karim Ben Salem (Responsable d\'astreinte CERT)',
    notifyOn: 'urgent_and_high',
    includeAiSummary: true,
    includeSuggestedActions: true,
    includeDirectLink: true,
    customHeader: 'Satisfaction Client CERT - Alerte Réclamation Critique',
  });

  const [stats, setStats] = useState<{ totalSent: number; lastSentAt: string | null }>({
    totalSent: 0,
    lastSentAt: null,
  });

  const [logs, setLogs] = useState<WhatsAppLog[]>([]);

  // Testing state
  const [testPhone, setTestPhone] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    message: string;
    whatsappUrl: string;
    delivered?: boolean;
    deliveryMethod?: string;
    errorMessage?: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, logsData] = await Promise.all([
        api.getWhatsAppConfig(),
        api.getWhatsAppLogs(),
      ]);
      setConfig(configData.config);
      setStats(configData.stats);
      setTestPhone(configData.config.recipientPhone);
      setLogs(logsData);
    } catch (e) {
      console.error('Error loading WhatsApp settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateWhatsAppConfig(config);
      setConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testWhatsAppAlert(testPhone);
      setTestResult({
        message: res.message,
        whatsappUrl: res.whatsappUrl,
        delivered: res.delivered,
        deliveryMethod: res.deliveryMethod,
        errorMessage: res.errorMessage,
      });
      // Refresh logs
      const updatedLogs = await api.getWhatsAppLogs();
      setLogs(updatedLogs);
      setStats((prev) => ({ totalSent: prev.totalSent + 1, lastSentAt: new Date().toISOString() }));
    } catch (e: any) {
      alert(e.message || 'Erreur lors du test WhatsApp');
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-black shadow-inner">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.578 1.77.886 2.791.886h.001c3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.772-5.768-5.772zm3.388 8.167c-.145.407-.732.748-1.023.79-.279.041-.637.058-1.033-.069-.24-.077-.55-.179-.955-.355-1.724-.749-2.848-2.511-2.934-2.625-.086-.115-.7-1.026-.7-1.956 0-.931.488-1.389.662-1.579.174-.19.38-.238.507-.238.127 0 .254.001.365.006.118.006.275-.045.431.33.161.387.549 1.341.597 1.439.048.098.08.213.016.34-.064.127-.096.206-.191.317-.095.111-.2.248-.286.333-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.847 1.53.942.19.095.301.079.412-.048.111-.127.476-.555.603-.746.127-.19.254-.159.428-.095.174.063 1.111.524 1.301.619.19.095.317.143.365.222.048.079.048.46-.097.867z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Alertes Temps Réel WhatsApp</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    config.enabled
                      ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40'
                      : 'bg-rose-400/30 text-rose-100 border border-rose-300/40'
                  }`}
                >
                  {config.enabled ? '🟢 Actif' : '⚪ Désactivé'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Notification instantanée des réclamations critiques détectées par l'IA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Paramètres de notification</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'test'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-emerald-600" />
            <span>Tester en direct</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>Journal des envois</span>
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
              {stats.totalSent}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-5">
              {/* Main Switch */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                    Déclenchement automatique des alertes WhatsApp
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Alerter automatiquement dès qu'une réclamation critique est analysée par l'IA Gemini.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Explanation Banner */}
              <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <span className="text-base">💡</span>
                  <span>Comment fonctionnent les alertes WhatsApp ? (توضيح هام)</span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  WhatsApp est une messagerie cryptée. Pour recevoir les alertes sur votre téléphone, deux méthodes sont proposées :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <strong className="text-emerald-950 block mb-0.5">1. Envoi rapide 1-Clic (wa.me) :</strong>
                    <span className="text-emerald-800">L'alerte est préparée et prête dans le système. Un clic sur le bouton vert ouvre WhatsApp avec le message prêt à envoyer.</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <strong className="text-emerald-950 block mb-0.5">2. Envoi automatique direct (CallMeBot) :</strong>
                    <span className="text-emerald-800">Le message arrive <strong>directement sur votre WhatsApp</strong> en arrière-plan grâce à la clé API gratuite CallMeBot !</span>
                  </div>
                </div>
              </div>

              {/* Mode de distribution WhatsApp */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Méthode de transmission des alertes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: 'callmebot' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.provider === 'callmebot' || !config.provider
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-emerald-900 block flex items-center gap-1">
                      🤖 CallMeBot API (Automatique)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Envoi direct en arrière-plan sans ouvrir le navigateur (Clé gratuite)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: 'manual' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.provider === 'manual'
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-emerald-900 block">
                      📱 Envoi 1-Clic (Lien wa.me)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Génère le lien direct prêt à envoyer sans clé API
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: 'webhook' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.provider === 'webhook'
                        ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-400/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-indigo-900 block">
                      🌐 Webhook / Passerelle pro
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Meta Cloud API, Twilio, UltraMsg, Green API, Zapier
                    </span>
                  </button>
                </div>
              </div>

              {/* CallMeBot API Key Setup Box */}
              {(config.provider === 'callmebot' || !config.provider) && (
                <div className="p-4 bg-emerald-950 text-white rounded-2xl space-y-3 border border-emerald-800 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Configuration Passerelle Gratuite CallMeBot
                    </span>
                    <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      100% Gratuit
                    </span>
                  </div>

                  <div className="text-[11px] text-emerald-100 space-y-1.5 leading-relaxed bg-emerald-900/60 p-3 rounded-xl border border-emerald-800">
                    <p className="font-bold text-white">Comment obtenir votre clé en 30 secondes :</p>
                    <ol className="list-decimal list-inside space-y-1 text-emerald-200">
                      <li>Ouvrez WhatsApp et envoyez le texte suivant au robot CallMeBot :</li>
                      <li className="font-mono bg-black/40 px-2 py-1 rounded text-emerald-300 text-xs">
                        I allow callmebot to send me messages
                      </li>
                      <li>Le robot vous répond immédiatement avec votre <strong>API Key</strong> personnelle.</li>
                      <li>Collez votre clé ci-dessous et enregistrez !</li>
                    </ol>

                    <div className="pt-2">
                      <a
                        href="https://wa.me/34644444779?text=I%20allow%20callmebot%20to%20send%20me%20messages"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-lg text-xs font-extrabold transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir WhatsApp pour demander la clé (+34 644 44 47 79)</span>
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-emerald-200 block mb-1">
                      Votre Clé API CallMeBot (API Key)
                    </label>
                    <input
                      type="text"
                      value={config.callmebotApiKey || ''}
                      onChange={(e) => setConfig({ ...config, callmebotApiKey: e.target.value })}
                      placeholder="Exemple: 123456 ou 789012"
                      className="w-full px-3 py-2 bg-emerald-900/80 border border-emerald-700 rounded-xl text-xs font-mono font-bold text-white placeholder-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <span className="text-[10px] text-emerald-400 mt-1 block">
                      Dès que cette clé est renseignée, toutes les réclamations critiques sont envoyées directement sur votre téléphone.
                    </span>
                  </div>
                </div>
              )}

              {/* Recipient Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Numéro WhatsApp du destinataire
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={config.recipientPhone}
                      onChange={(e) => setConfig({ ...config, recipientPhone: e.target.value })}
                      placeholder="+216 95 816 888"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Format international recommandé (ex: +216 95 816 888)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nom / Titre du destinataire
                  </label>
                  <input
                    type="text"
                    value={config.managerName}
                    onChange={(e) => setConfig({ ...config, managerName: e.target.value })}
                    placeholder="Belhassen Bouhajja (Responsable d'astreinte)"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Affiché dans les notifications d'audit
                  </span>
                </div>
              </div>

              {/* AI Severity Threshold Trigger */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Seuil de déclenchement IA (Sensibilité de l'alerte)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, notifyOn: 'urgent_only' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.notifyOn === 'urgent_only'
                        ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-400/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-rose-700 block">
                      🚨 Urgentes uniquement
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Délais critiques, litiges graves, blocages immédiats
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, notifyOn: 'urgent_and_high' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.notifyOn === 'urgent_and_high'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-emerald-800 block">
                        ⚡ Urgentes &amp; Élevées
                      </span>
                      <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded-full">
                        Idéal
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Toutes les réclamations critiques détectées par l'IA
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, notifyOn: 'all' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.notifyOn === 'all'
                        ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-400/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-indigo-700 block">
                      📢 Toutes réclamations
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Même priorité moyenne et faible (flux complet)
                    </span>
                  </button>
                </div>
              </div>

              {/* Message Payload Content Options */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Contenu inclus dans l'alerte WhatsApp
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeAiSummary}
                      onChange={(e) => setConfig({ ...config, includeAiSummary: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold">Résumé décisionnel et diagnostic de l'IA</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeSuggestedActions}
                      onChange={(e) => setConfig({ ...config, includeSuggestedActions: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold">Recommandations d'actions correctives immédiates</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeDirectLink}
                      onChange={(e) => setConfig({ ...config, includeDirectLink: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold">Lien direct d'accès à la réclamation dans l'application</span>
                  </label>
                </div>
              </div>

              {/* Optional Webhook for WhatsApp Cloud API / Zapier */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  URL Webhook WhatsApp Business / Zapier / Make (Optionnel)
                </label>
                <input
                  type="url"
                  value={config.webhookUrl || ''}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  placeholder="https://hooks.zapier.com/hooks/catch/... ou Meta Cloud API"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Si renseigné, un payload JSON est dispatché automatiquement vers votre passerelle API WhatsApp.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saveSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : null}
                  <span>{saveSuccess ? 'Enregistré avec succès !' : saving ? 'Enregistrement...' : 'Enregistrer la configuration'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LIVE TEST */}
          {activeTab === 'test' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Vérification de la liaison WhatsApp</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Cette simulation génère une alerte WhatsApp en temps réel identique à celles déclenchées par l'IA lors de l'enregistrement d'une réclamation critique.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Numéro WhatsApp destinataire pour le test
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+216 98 123 456"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestAlert}
                    disabled={isTesting || !testPhone.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTesting ? 'Envoi...' : 'Déclencher l\'alerte test'}</span>
                  </button>
                </div>
              </div>

              {/* Test Result Showcase */}
              {testResult && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 animate-in fade-in duration-200 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${testResult.delivered ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {testResult.delivered ? <CheckCircle2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                      {testResult.delivered
                        ? `Alerte délivrée directement sur WhatsApp (${testResult.deliveryMethod})`
                        : `Alerte prête à être envoyée sur WhatsApp`}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date().toLocaleTimeString('fr-FR')}
                    </span>
                  </div>

                  {testResult.errorMessage && (
                    <div className="p-2.5 bg-amber-950/70 border border-amber-800 text-amber-200 text-xs rounded-xl">
                      <strong>Note passerelle :</strong> {testResult.errorMessage}
                    </div>
                  )}

                  {/* WhatsApp Preview Bubble */}
                  <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs font-mono text-emerald-100 whitespace-pre-wrap leading-relaxed">
                    {testResult.message || `🔔 *Satisfaction Client CERT - Alerte Réclamation Critique*\n━━━━━━━━━━━━━━━━━━━━\n🧪 *TEST DE TRANSMISSION WHATSAPP EN TEMPS RÉEL*\n📅 *Date :* ${new Date().toLocaleString('fr-FR')}\n✅ *Statut liaison :* Connecté et opérationnel\n👤 *Destinataire :* ${config.managerName} (${testPhone})\n\nCe message confirme que la passerelle de notification WhatsApp est configurée pour le CERT.`}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={testResult.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ouvrir sur WhatsApp Web / Mobile (wa.me)</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(testResult.whatsappUrl)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Lien copié !' : 'Copier le lien wa.me'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOGS & AUDIT TRAIL */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Historique des alertes WhatsApp ({logs.length})
                </span>
                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualiser</span>
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  Aucune alerte WhatsApp enregistrée pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200 rounded-2xl space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              log.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {log.priority || 'Alerte'}
                          </span>
                          <span className="font-bold text-slate-900">
                            {log.recipientRole === 'client' ? 'Message Client' : 'Alerte Responsable'}
                          </span>
                          <span className="font-mono text-slate-500">({log.recipientPhone})</span>
                        </div>

                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.sentAt).toLocaleString('fr-FR')}
                        </span>
                      </div>

                      {log.complaintId && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>Réf: <strong className="text-slate-700">#{log.complaintId}</strong></span>
                          {log.dossierNumber && <span>Dossier: <strong className="text-slate-700">{log.dossierNumber}</strong></span>}
                        </div>
                      )}

                      <p className="text-slate-600 line-clamp-2 bg-white p-2.5 rounded-xl border border-slate-200/80 font-mono text-[11px]">
                        {log.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        {log.status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Délivré via API ({log.deliveryMethod || 'Passerelle'})
                          </span>
                        ) : log.status === 'ready_to_send' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-bold bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                            <Smartphone className="w-3.5 h-3.5" />
                            Prêt à l'envoi (Lien wa.me)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            En attente d'ouverture
                          </span>
                        )}

                        <a
                          href={log.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold shadow-xs transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ouvrir sur WhatsApp (Envoyer)</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
