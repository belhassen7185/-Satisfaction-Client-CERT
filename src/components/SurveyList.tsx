import React, { useState } from 'react';
import { Survey, Language, SurveyStatus } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { api } from '../services/api.ts';
import { QRCodeModal } from './QRCodeModal.tsx';
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  Share2,
  Eye,
  FileText,
  Calendar,
  AlertCircle,
  Filter,
  AlertTriangle,
  X,
  Loader2,
  Database,
  MessageSquare,
  Bot,
  CheckCircle2,
  BarChart3
} from 'lucide-react';

interface SurveyListProps {
  surveys: Survey[];
  language: Language;
  onSelectSurvey: (survey: Survey) => void;
  onCreateNew: () => void;
  onPreview: (survey: Survey) => void;
  onRefresh: () => void;
  onViewReport?: (surveyId: string) => void;
}

export const SurveyList: React.FC<SurveyListProps> = ({
  surveys,
  language,
  onSelectSurvey,
  onCreateNew,
  onPreview,
  onRefresh,
  onViewReport,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar' || language === 'tn';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedForQr, setSelectedForQr] = useState<Survey | null>(null);

  // Cascade delete modal state
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const filtered = surveys.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDuplicate = async (survey: Survey) => {
    try {
      await api.duplicateSurvey(survey.id);
      onRefresh();
    } catch (err: any) {
      console.warn('Duplicate error:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!surveyToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteSurvey(surveyToDelete.id);
      const title = surveyToDelete.title;
      setSurveyToDelete(null);
      onRefresh();
      setDeleteSuccessMsg(
        language === 'ar'
          ? `تم حذف الاستبيان « ${title} » وكافة بياناته (الردود، الشكاوى، والتحليلات) بنجاح.`
          : language === 'tn'
          ? `تم فسخ الاستبيان « ${title} » وكل المعطيات المرتبطة بيه (التشكيات والأجوبة) بنجاح.`
          : `L'enquête « ${title} » et toutes ses données associées (réponses, réclamations, analyses) ont été définitivement supprimées.`
      );
      setTimeout(() => setDeleteSuccessMsg(null), 6000);
    } catch (err: any) {
      setDeleteError(err.message || 'Échec de suppression de l\'enquête.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: SurveyStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t.published}
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
            {t.draft}
          </span>
        );
      case 'archived':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-semibold">
            {t.archived}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Success Message */}
      {deleteSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-medium shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{deleteSuccessMsg}</span>
          </div>
          <button
            onClick={() => setDeleteSuccessMsg(null)}
            className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.surveys}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Créez, publiez et diffusez vos questionnaires multicanaux (WhatsApp, E-mail, Lien direct &amp; QR Code)
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newSurvey}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="published">{t.published}</option>
            <option value="draft">{t.draft}</option>
            <option value="archived">{t.archived}</option>
          </select>
        </div>
      </div>

      {/* Surveys Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Aucune enquête trouvée</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ajustez votre recherche ou créez un nouveau questionnaire de satisfaction pour le CERT.
          </p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newSurvey}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((survey) => (
            <div
              key={survey.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5 space-y-4">
                {/* Status & Category */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {survey.category || 'Services'}
                  </span>
                  {getStatusBadge(survey.status)}
                </div>

                {/* Title & Description */}
                <div>
                  <h3
                    onClick={() => onSelectSurvey(survey)}
                    className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2"
                  >
                    {survey.title}
                  </h3>
                  {survey.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {survey.description}
                    </p>
                  )}
                </div>

                {/* Key Metrics Pill */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Réponses</span>
                    <span className="font-bold text-slate-800 text-sm">{survey.responseCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">CSAT</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {survey.csatScore > 0 ? `${survey.csatScore}%` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">NPS</span>
                    <span className="font-bold text-indigo-600 text-sm">
                      {survey.npsScore !== 0 ? survey.npsScore : '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{survey.questions?.length || 0} questions</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(survey.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectSurvey(survey)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title={t.edit}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onPreview(survey)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title={t.preview}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(survey)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title={t.duplicate}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {onViewReport && (
                    <button
                      onClick={() => onViewReport(survey.id)}
                      className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Consulter le rapport & recommandations de cette enquête"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setDeleteError(null);
                      setSurveyToDelete(survey);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setSelectedForQr(survey)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
                  title="Partager par WhatsApp, Email, Lien direct ou QR Code"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Partager &amp; QR</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code & Share Modal */}
      {selectedForQr && (
        <QRCodeModal
          survey={selectedForQr}
          language={language}
          onClose={() => setSelectedForQr(null)}
        />
      )}

      {/* CASCADE DELETE CONFIRMATION MODAL */}
      {surveyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Header with warning icon */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {language === 'ar'
                      ? 'حذف نهائي للاستبيان وجميع بياناته'
                      : language === 'tn'
                      ? 'فسخ نهائي للاستبيان وكل المعطيات'
                      : 'Suppression définitive de l\'enquête'}
                  </h3>
                  <p className="text-xs text-rose-600 font-medium">
                    {language === 'ar'
                      ? 'سيتم مسح كافة البيانات المرتبطة بهذا الاستبيان'
                      : language === 'tn'
                      ? 'باش يتم فسخ كل المعطيات المرتبطة'
                      : 'Toutes les données rattachées seront effacées'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isDeleting) setSurveyToDelete(null);
                }}
                disabled={isDeleting}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Survey Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                {language === 'ar' ? 'الاستبيان المعني' : language === 'tn' ? 'الاستبيان' : 'Enquête ciblée'}
              </span>
              <p className="text-sm font-bold text-slate-900">
                « {surveyToDelete.title} »
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                <span>ID: <code className="text-[11px] font-mono text-slate-600">{surveyToDelete.id}</code></span>
                <span>•</span>
                <span>{surveyToDelete.responseCount || 0} réponses enregistrées</span>
              </div>
            </div>

            {/* Itemized cascade list */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">
                {language === 'ar'
                  ? 'سيتم الحذف والتطهير الشامل للعناصر التالية فوراً:'
                  : language === 'tn'
                  ? 'العناصر التالية باش تتفسخ بالكامل فيسع:'
                  : 'Les éléments suivants rattachés à cette enquête seront immédiatement supprimés :'}
              </p>

              <div className="space-y-2 bg-rose-50/60 border border-rose-100 rounded-2xl p-4 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>{language === 'ar' ? 'كافة الردود والنماذج المسجلة' : 'Toutes les réponses soumises'}</strong>{' '}
                    ({surveyToDelete.responseCount || 0} {language === 'ar' ? 'رد' : 'réponse(s)'})
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>{language === 'ar' ? 'جميع الشكاوى والملفات' : 'Toutes les réclamations clients'}</strong>{' '}
                    {language === 'ar' ? 'المرتبطة بهذا الاستبيان' : 'créées suite à cette enquête'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>{language === 'ar' ? 'تحليلات الذكاء الاصطناعي والإحصائيات' : 'Analyses IA et indicateurs KPI'}</strong>{' '}
                    {language === 'ar' ? 'سيتم إعادة احتسابها بدون هذا الاستبيان' : 'recalculés en excluant ces données'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>{language === 'ar' ? 'سجلات وإشعارات واتساب' : 'Alertes et journaux WhatsApp'}</strong>{' '}
                    {language === 'ar' ? 'المرتبطة بشكاوى هذا الاستبيان' : 'liés aux réclamations de cette enquête'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message if deletion failed */}
            {deleteError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Irreversible warning banner */}
            <div className="text-[11px] text-slate-500 bg-slate-100/80 p-3 rounded-xl border border-slate-200/80">
              {language === 'ar'
                ? '⚠️ تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه. لن يكون بالإمكان استرجاع أي ردود أو شكاوى محذوفة.'
                : language === 'tn'
                ? '⚠️ تنبيه: العملية نهائية وما تنجمش ترجع فيها. المعطيات اللي باش تتفسخ ما ترجعش.'
                : '⚠️ Attention : Cette opération est irréversible. Les réponses, réclamations et données statistiques supprimées ne pourront pas être récupérées.'}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSurveyToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {language === 'ar' ? 'إلغاء' : language === 'tn' ? 'إلغاء' : 'Annuler'}
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'ar' ? 'جارٍ الحذف الشامل...' : 'Suppression en cours...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {language === 'ar'
                        ? 'تأكيد الحذف ومسح كافة البيانات'
                        : language === 'tn'
                        ? 'تأكيد الفسخ ومسح المعطيات'
                        : 'Supprimer et effacer toutes les données'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
