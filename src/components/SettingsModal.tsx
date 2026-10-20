import React, { useState, useEffect } from 'react';
import { Language, AuthUser } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { authService, getSavedDirectorName } from '../services/auth.ts';
import { api } from '../services/api.ts';
import { clientStorage } from '../services/clientStorage.ts';
import {
  X,
  Building,
  ShieldCheck,
  Database,
  MessageSquare,
  Sparkles,
  User,
  Check,
  Building2,
  Mail,
  Award,
  Loader2,
} from 'lucide-react';

interface SettingsModalProps {
  language: Language;
  onClose: () => void;
  currentUser?: AuthUser | null;
  onUpdateUser?: (updated: AuthUser) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  language,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
  const t = translations[language];

  const [directorName, setDirectorName] = useState(() => {
    return (
      localStorage.getItem('cert_director_name') ||
      getSavedDirectorName() ||
      currentUser?.name ||
      'Mounir Ben Salah'
    );
  });
  const [directorTitle, setDirectorTitle] = useState(
    currentUser?.roleTitle || 'Directeur Général & Administrateur CERT'
  );
  const [directorEmail, setDirectorEmail] = useState(
    currentUser?.email || 'admin@cert.tn'
  );
  const [orgName, setOrgName] = useState(
    localStorage.getItem('cert_org_name') || 'Centre d\'Études et de Recherche des Télécommunications (CERT)'
  );
  const [sector, setSector] = useState(
    localStorage.getItem('cert_sector') || 'Télécommunications, Laboratoires & Services Numériques'
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync with backend database on open
  useEffect(() => {
    let mounted = true;
    api
      .getSettings()
      .then((settings) => {
        if (!mounted || !settings) return;
        if (settings.directorName) setDirectorName(settings.directorName);
        if (settings.directorTitle) setDirectorTitle(settings.directorTitle);
        if (settings.directorEmail) setDirectorEmail(settings.directorEmail);
        if (settings.orgName) setOrgName(settings.orgName);
        if (settings.sector) setSector(settings.sector);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const trimmedName = directorName.trim();
    const trimmedTitle = directorTitle.trim();
    const trimmedEmail = directorEmail.trim();
    const trimmedOrg = orgName.trim();
    const trimmedSector = sector.trim();

    // 1. Immediately persist to localStorage and clientStorage
    localStorage.setItem('cert_director_name', trimmedName);
    localStorage.setItem('cert_org_name', trimmedOrg);
    localStorage.setItem('cert_sector', trimmedSector);

    clientStorage.saveSettings({
      directorName: trimmedName,
      directorTitle: trimmedTitle,
      directorEmail: trimmedEmail,
      orgName: trimmedOrg,
      sector: trimmedSector,
    });

    // 2. Update user profile state
    const updated = authService.updateUser({
      name: trimmedName,
      roleTitle: trimmedTitle,
      email: trimmedEmail,
    });

    if (updated && onUpdateUser) {
      onUpdateUser(updated);
    }

    // 3. Persist to backend server API
    try {
      await api.updateSettings({
        directorName: trimmedName,
        directorTitle: trimmedTitle,
        directorEmail: trimmedEmail,
        orgName: trimmedOrg,
        sector: trimmedSector,
      });
    } catch (err) {
      console.warn('Could not save to server API, saved in local store:', err);
    } finally {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.settings}</h3>
              <p className="text-xs text-slate-500">
                Configuration de l'organisation, direction et conformité
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Success Banner */}
          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Modifications du directeur et de l'organisme enregistrées avec succès !</span>
            </div>
          )}

          {/* Direction & Director's Name Field */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Direction &amp; Profil Administrateur
              </h4>
            </div>

            <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Nom du Directeur / Responsable <span className="text-indigo-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    placeholder="Ex: Mounir Ben Salah"
                    className="w-full pl-9 p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ce nom est mis à jour dans la barre de navigation, le menu latéral et les rapports officiels.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Titre / Fonction
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={directorTitle}
                      onChange={(e) => setDirectorTitle(e.target.value)}
                      placeholder="Directeur Général CERT"
                      className="w-full pl-8 p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={directorEmail}
                      onChange={(e) => setDirectorEmail(e.target.value)}
                      placeholder="admin@cert.tn"
                      className="w-full pl-8 p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Settings */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Profil de l'organisme
              </h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nom de l'organisation / Administration
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Secteur d'activité
                </label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Integration Statuses */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              État des Intégrations
            </h4>

            <div className="space-y-2">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Intelligence Artificielle Google Gemini</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  Opérationnel
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Base de données persistante (PostgreSQL DDL)</span>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Actif (Persistent)
                </span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Alertes WhatsApp Réclamations Critiques (Temps Réel)</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  Actif (Temps Réel)
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Legal Compliance */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Sécurité, Confidentialité &amp; Lois Applicables</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Les questionnaires sont strictement anonymes par défaut. Les coordonnées ne sont collectées que sur déclaration volontaire lors d'une réclamation.
              Les enregistrements audio sont soumis à l'accord explicite du microphone et peuvent être supprimés après transcription.
            </p>
          </div>

          {/* Action buttons */}
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
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : null}
              <span>{saving ? 'Enregistrement en cours...' : saved ? 'Enregistré avec succès !' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
