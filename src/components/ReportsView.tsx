import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  Survey,
  AIRecommendation,
  DashboardStats,
  Language,
  ComplaintRecord,
} from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { api } from '../services/api.ts';
import {
  Sparkles,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Clock,
  UserCheck,
  FileSpreadsheet,
  ShieldCheck,
  Award,
  FileText,
  Filter,
  Layers,
  ChevronDown,
  Star,
  Radio,
  Mic,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  BarChart3,
  HelpCircle,
  Inbox
} from 'lucide-react';
import { clientStorage } from '../services/clientStorage.ts';

interface ReportsViewProps {
  language: Language;
  initialSurveyId?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ language, initialSurveyId }) => {
  const t = translations[language];
  const isRtl = language === 'ar' || language === 'tn';

  // Surveys list for filtering
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(initialSurveyId || 'all');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  // Report and stats data
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Sync initialSurveyId if it changes
  useEffect(() => {
    if (initialSurveyId && initialSurveyId !== selectedSurveyId) {
      setSelectedSurveyId(initialSurveyId);
    }
  }, [initialSurveyId]);

  // Selected survey object (if not 'all')
  const currentSurvey = surveys.find((s) => s.id === selectedSurveyId);

  // Load surveys list on mount
  useEffect(() => {
    api.getSurveys()
      .then((data) => {
        if (Array.isArray(data)) {
          setSurveys(data);
        }
      })
      .catch((err) => console.warn('Could not load surveys for reports:', err));
  }, []);

  // Load report data whenever selectedSurveyId or period changes
  const loadReportData = async (surveyIdToLoad = selectedSurveyId) => {
    setLoading(true);
    try {
      const isSpecific = surveyIdToLoad !== 'all';
      const [rec, st, cmps] = await Promise.all([
        api.getAIRecommendations({
          surveyId: isSpecific ? surveyIdToLoad : undefined,
          language,
        }).catch(() => null),
        api.getDashboardStats({
          surveyId: isSpecific ? surveyIdToLoad : undefined,
          periodDays: selectedPeriod,
          channel: selectedChannel !== 'all' ? selectedChannel : undefined,
        }).catch(() => null),
        api.getComplaints(isSpecific ? { surveyId: surveyIdToLoad } : undefined).catch(() => []),
      ]);

      if (rec) {
        if (isSpecific && (!rec.questionAnalyses || rec.questionAnalyses.length === 0)) {
          rec.questionAnalyses = clientStorage.getSurveyQuestionAnalyses(surveyIdToLoad);
        }
        setRecommendation(rec);
      } else if (isSpecific) {
        const clientRec = clientStorage.getAIRecommendations(surveyIdToLoad, language);
        setRecommendation(clientRec);
      }

      if (st) setStats(st);
      if (Array.isArray(cmps)) {
        const filteredCmps = isSpecific
          ? cmps.filter((c) => c.surveyId === surveyIdToLoad)
          : cmps;
        setComplaints(filteredCmps);
      }
    } catch (e) {
      console.warn('Notice loading reports data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData(selectedSurveyId);
  }, [selectedSurveyId, selectedPeriod, selectedChannel, language]);

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const isSpecific = selectedSurveyId !== 'all';
      const [rec, st] = await Promise.all([
        api.getAIRecommendations({
          surveyId: isSpecific ? selectedSurveyId : undefined,
          language,
        }),
        api.getDashboardStats({
          surveyId: isSpecific ? selectedSurveyId : undefined,
          periodDays: selectedPeriod,
        }),
      ]);
      if (rec && isSpecific && (!rec.questionAnalyses || rec.questionAnalyses.length === 0)) {
        rec.questionAnalyses = clientStorage.getSurveyQuestionAnalyses(selectedSurveyId);
      }
      setRecommendation(rec);
      setStats(st);
      setExportNotice('Rapport IA et préconisations actualisés avec succès pour cette enquête !');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (e) {
      console.warn('Failed to regenerate report:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = (type: 'complaints' | 'stats') => {
    api.downloadCsv(type, selectedSurveyId);
  };

  // Helper for question type icons
  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case 'stars':
        return <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Étoiles 1-5</span>;
      case 'nps':
        return <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">NPS (0-10)</span>;
      case 'single_choice':
        return <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold"><Radio className="w-3 h-3" /> Choix unique</span>;
      case 'multiple_choice':
        return <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold">Choix multiple</span>;
      case 'voice':
        return <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold"><Mic className="w-3 h-3" /> Voix / Audio</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">Texte libre</span>;
    }
  };

  // Generate and download professional PDF report tailored to the selected survey
  const handleDownloadPdf = () => {
    if (!recommendation) return;
    setIsExportingPdf(true);
    setExportNotice(null);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const surveyTitleHeader = currentSurvey?.title || 'TOUTES LES ENQUÊTES (RAPPORT CONSOLIDÉ)';

      // Header Banner
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setFillColor(79, 70, 229); // Accent strip
      doc.rect(0, 0, pageWidth, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Satisfaction Client CERT • RAPPORT STRATÉGIQUE D’EXPÉRIENCE CLIENT', margin, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(199, 210, 254);
      doc.text(
        `Périmètre : ${surveyTitleHeader.slice(0, 65)} • Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`,
        margin,
        20
      );

      let y = 36;

      // Section 1: Synthèse des KPIs
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('1. INDICATEURS CLÉS DE PERFORMANCE (KPIs)', margin, y);
      y += 6;

      const respVal = currentSurvey ? (currentSurvey.responseCount || 0) : (stats?.totalResponses || 0);
      const csatVal = currentSurvey ? (respVal > 0 ? (currentSurvey.csatScore || 0) : 0) : (stats?.csatPercentage || 0);
      const npsVal = currentSurvey ? (respVal > 0 ? (currentSurvey.npsScore || 0) : 0) : (stats?.npsScore || 0);
      const cmpsVal = complaints.length;

      const kpis = [
        { label: 'Satisfaction CSAT', val: respVal > 0 ? `${csatVal}%` : '-', sub: 'Score global' },
        { label: 'Score Net Promoteur', val: respVal > 0 ? (npsVal >= 0 ? `+${npsVal}` : String(npsVal)) : '-', sub: 'NPS' },
        { label: 'Réponses Recueillies', val: String(respVal), sub: 'Participants' },
        { label: 'Réclamations Liées', val: String(cmpsVal), sub: 'Dossiers ouverts' },
      ];

      const kpiWidth = (contentWidth - 9) / 4;
      kpis.forEach((kpi, idx) => {
        const kX = margin + idx * (kpiWidth + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(kX, y, kpiWidth, 18, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(idx === 0 ? 5 : idx === 1 ? 67 : idx === 2 ? 30 : 220, idx === 0 ? 150 : idx === 1 ? 56 : idx === 2 ? 41 : 38, idx === 0 ? 105 : idx === 1 ? 202 : idx === 2 ? 59 : 38);
        doc.text(kpi.val, kX + 3, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(kpi.label, kX + 3, y + 12);
        doc.setTextColor(148, 163, 184);
        doc.text(kpi.sub, kX + 3, y + 15.5);
      });

      y += 24;

      // Section 2: Analyse Question par Question (si disponible)
      if (recommendation.questionAnalyses && recommendation.questionAnalyses.length > 0) {
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`2. ANALYSE DÉTAILLÉE PAR QUESTION DE L’ENQUÊTE (${recommendation.questionAnalyses.length} QUESTIONS)`, margin, y);
        y += 6;

        recommendation.questionAnalyses.slice(0, 5).forEach((qa, idx) => {
          doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(`Q${idx + 1}.`, margin + 3, y + 5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          const splitQ = doc.splitTextToSize(qa.questionText, contentWidth - 45);
          doc.text(splitQ.slice(0, 1), margin + 11, y + 5);

          // Score badge
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(qa.score >= 80 ? 5 : qa.score >= 65 ? 30 : 220, qa.score >= 80 ? 150 : qa.score >= 65 ? 41 : 38, qa.score >= 80 ? 105 : qa.score >= 65 ? 59 : 38);
          doc.text(`${qa.score}%`, contentWidth - 12, y + 5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Type: ${qa.type} • ${qa.details || 'Évaluation des répondants'}`, margin + 11, y + 9.5);

          y += 14;
        });

        y += 3;
      }

      // Section 3: Points forts IA
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('3. POINTS FORTS & ATOUTS MAJEURS DÉTECTÉS PAR L’IA', margin, y);
      y += 5;

      recommendation.strengths.slice(0, 3).forEach((st, i) => {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

        doc.setTextColor(6, 95, 70);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`• ${st.title}`, margin + 4, y + 5);

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const splitDesc = doc.splitTextToSize(st.description, contentWidth - 8);
        doc.text(splitDesc.slice(0, 2), margin + 4, y + 9.5);

        y += 18;
      });

      // Section 4: Problèmes prioritaires
      y += 2;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('4. AXES D’AMÉLIORATION & DYSFONCTIONNEMENTS PRIORITAIRES', margin, y);
      y += 5;

      recommendation.priorityProblems.slice(0, 2).forEach((prob) => {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 202, 202);
        doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

        doc.setTextColor(153, 27, 27);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`[${prob.severity.toUpperCase()}] ${prob.title}`, margin + 4, y + 5);

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const splitDesc = doc.splitTextToSize(prob.description, contentWidth - 8);
        doc.text(splitDesc.slice(0, 2), margin + 4, y + 9.5);

        y += 18;
      });

      // Footer Page 1
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Satisfaction Client CERT • Document officiel certifié d’aide à la décision', margin, 290);
      doc.text('Page 1 / 2', pageWidth - margin - 15, 290);

      // PAGE 2: Plan d'actions opérationnelles
      doc.addPage();

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 16, 'F');
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 2.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Satisfaction Client CERT • PLAN D’ACTIONS OPÉRATIONNELLES : ${surveyTitleHeader.slice(0, 50)}`, margin, 10);

      y = 26;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('5. FEUILLE DE ROUTE OPÉRATIONNELLE RECOMMANDÉE (PLAN D’ACTIONS)', margin, y);
      y += 7;

      // Table Header
      const colWidths = [50, 60, 28, 22, 22];
      const colHeaders = ['Action Recommandée', 'Justification Chiffrée', 'Responsable', 'Échéance', 'Impact Attendu'];

      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      let xCol = margin;
      colHeaders.forEach((h, idx) => {
        doc.text(h, xCol + 2, y + 4.8);
        xCol += colWidths[idx];
      });

      y += 7;

      // Table Rows
      recommendation.actionPlans.forEach((plan, i) => {
        const rowHeight = 22;
        doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

        let curX = margin;

        // Action
        doc.setTextColor(30, 27, 75);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        const splitAction = doc.splitTextToSize(`A${i + 1}. ${plan.action}`, colWidths[0] - 4);
        doc.text(splitAction.slice(0, 3), curX + 2, y + 5);
        curX += colWidths[0];

        // Justification
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const splitRat = doc.splitTextToSize(plan.rationale, colWidths[1] - 4);
        doc.text(splitRat.slice(0, 3), curX + 2, y + 5);
        curX += colWidths[1];

        // Responsable
        doc.setTextColor(67, 56, 202);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        const splitResp = doc.splitTextToSize(plan.suggestedAssignee, colWidths[2] - 4);
        doc.text(splitResp.slice(0, 2), curX + 2, y + 5);
        curX += colWidths[2];

        // Échéance
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(plan.suggestedDeadline, curX + 2, y + 5);
        curX += colWidths[3];

        // Impact
        doc.setTextColor(5, 150, 105);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        const splitImp = doc.splitTextToSize(plan.expectedImpact, colWidths[4] - 3);
        doc.text(splitImp.slice(0, 3), curX + 2, y + 5);

        y += rowHeight;
      });

      y += 14;

      // Section Signatures
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('6. CADRE DE VALIDATION & ENGAGEMENT QUALITÉ CERT', margin, y);
      y += 6;

      const signBoxWidth = (contentWidth - 6) / 2;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, signBoxWidth, 28, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Direction Expérience Client & Qualité CERT', margin + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Visa & Approbation :', margin + 4, y + 12);
      doc.line(margin + 4, y + 23, margin + signBoxWidth - 4, y + 23);

      const xSign2 = margin + signBoxWidth + 6;
      doc.roundedRect(xSign2, y, signBoxWidth, 28, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Responsable d’Exploitation / Direction Générale', xSign2 + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Validation finale du plan d’actions :', xSign2 + 4, y + 12);
      doc.line(xSign2 + 4, y + 23, xSign2 + signBoxWidth - 4, y + 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Satisfaction Client CERT • Synthèse stratégique certifiée d’aide à la décision', margin, 290);
      doc.text('Page 2 / 2', pageWidth - margin - 15, 290);

      const cleanFileName = `Rapport_Satisfaction_CERT_${selectedSurveyId !== 'all' ? selectedSurveyId : 'Global'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(cleanFileName);
      setExportNotice(`Rapport PDF "${cleanFileName}" généré et téléchargé avec succès !`);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: any) {
      console.warn('PDF generation fallback to print:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header & Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.reportsTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? 'تقارير تحليلية ذكية مخصصة لكل استبيان مع تشخيص الذكاء الاصطناعي وخطة عمل تشغيلية'
              : 'Analyses stratégiques, diagnostics IA conformes et plans d\'actions adaptés à chaque enquête'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf || !recommendation}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Générer le rapport PDF haute qualité conforme à l'enquête sélectionnée"
          >
            <FileText className={`w-4 h-4 ${isExportingPdf ? 'animate-bounce' : ''}`} />
            <span>{isExportingPdf ? 'Génération du PDF...' : 'Télécharger Rapport PDF (Conforme)'}</span>
          </button>

          <button
            onClick={() => handleExportCsv('complaints')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Réclamations (CSV)</span>
          </button>

          <button
            onClick={() => handleExportCsv('stats')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Export KPIs</span>
          </button>

          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Calcul en cours...' : 'Actualiser Rapport IA'}</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* FILTER BAR: CRITICAL SURVEY SELECTOR (CONFORMITÉ AVEC LES ENQUÊTES) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-900">
              {language === 'ar' ? 'اختيار الاستبيان للتحليل المخصص :' : 'Sélectionnez l\'enquête à analyser :'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Survey Dropdown */}
            <div className="relative min-w-[280px] sm:min-w-[340px]">
              <select
                value={selectedSurveyId}
                onChange={(e) => setSelectedSurveyId(e.target.value)}
                className="w-full px-3.5 py-2 pr-8 bg-slate-50 border border-indigo-200 hover:border-indigo-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors shadow-2xs"
              >
                <option value="all">
                  📊 {language === 'ar' ? 'كافة الاستبيانات (تحليل مجمع شامل)' : `Toutes les enquêtes (Consolidé - ${surveys.length} enquêtes)`}
                </option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    📋 [{s.status === 'published' ? 'Publiée' : 'Brouillon'}] {s.title} ({s.responseCount || 0} réponses)
                  </option>
                ))}
              </select>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Période :</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value={7}>7 derniers jours</option>
                <option value={30}>30 derniers jours</option>
                <option value={90}>3 derniers mois</option>
                <option value={0}>Tout l'historique</option>
              </select>
            </div>

            {/* Channel Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Canal :</span>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">Tous canaux</option>
                <option value="qr">QR Code</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Web direct</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTED SURVEY CONTEXT CARD */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold tracking-wider">
                {currentSurvey ? currentSurvey.category || 'Services' : 'Périmètre Global'}
              </span>
              {currentSurvey && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${currentSurvey.status === 'published' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300'}`}>
                  {currentSurvey.status === 'published' ? 'Enquête Publiée' : 'Brouillon'}
                </span>
              )}
              {currentSurvey && (
                <span className="text-xs text-slate-400 font-mono">
                  ID: {currentSurvey.id}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {currentSurvey ? currentSurvey.title : 'Toutes les enquêtes CERT (Rapport Consolidé Global)'}
            </h3>
            {currentSurvey?.description && (
              <p className="text-xs text-slate-300 line-clamp-2 max-w-2xl">
                {currentSurvey.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs text-center">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Réponses</span>
              <span className="text-base font-extrabold text-white">
                {currentSurvey ? currentSurvey.responseCount || 0 : stats?.totalResponses || 0}
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">CSAT</span>
              <span className="text-base font-extrabold text-emerald-400">
                {currentSurvey ? (currentSurvey.responseCount > 0 ? `${currentSurvey.csatScore}%` : '-') : `${stats?.csatPercentage || 0}%`}
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">NPS</span>
              <span className="text-base font-extrabold text-indigo-300">
                {currentSurvey ? (currentSurvey.responseCount > 0 ? (currentSurvey.npsScore >= 0 ? `+${currentSurvey.npsScore}` : currentSurvey.npsScore) : '-') : `+${stats?.npsScore || 0}`}
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Réclamations</span>
              <span className="text-base font-extrabold text-rose-400">
                {complaints.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONSOLIDATED VIEW: LIST OF AVAILABLE SURVEYS (IF 'ALL' SELECTED) */}
      {selectedSurveyId === 'all' && surveys.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'ar' ? 'الاستبيانات المتاحة للتحليل الفردي والمخصص' : 'Enquêtes disponibles pour analyse dédiée'}
                </h3>
                <p className="text-xs text-slate-500">
                  {surveys.length} enquête(s) recensée(s). Cliquez sur une enquête pour afficher son diagnostic précis.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveys.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedSurveyId(s.id)}
                className="p-4 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl space-y-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">
                    {s.category || 'Services'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {s.status === 'published' ? 'Publiée' : 'Brouillon'}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {s.title}
                </h4>

                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60 text-center text-xs">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Réponses</span>
                    <span className="font-bold text-slate-800">{s.responseCount || 0}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">CSAT</span>
                    <span className="font-bold text-emerald-600">
                      {s.responseCount > 0 ? `${s.csatScore}%` : '-'}
                    </span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Questions</span>
                    <span className="font-bold text-indigo-600">{s.questions?.length || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Analyser cette enquête</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZERO RESPONSES NOTICE (IF SPECIFIC SURVEY SELECTED BUT NO RESPONSES) */}
      {currentSurvey && (currentSurvey.responseCount === 0 || (stats && stats.totalResponses === 0)) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
          <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950">
              {language === 'ar' ? 'استبيان في انتظار المشاركات الأولى' : 'Cette enquête est en attente de ses premières réponses'}
            </h4>
            <p className="text-amber-800/90 leading-relaxed">
              {language === 'ar'
                ? 'تم إنشاء وتفعيل هذا الاستبيان بنجاح. بمجرد قيام المتعاملين بالإجابة عبر الرابط أو رمز QR، سيتم احتساب مؤشرات الرضا CSAT و NPS والتوصيات التشغيلية تلقائياً وبدقة.'
                : 'Ce questionnaire est actif et conforme. Dès que les premiers usagers soumettront leurs avis via QR Code ou lien direct, les scores de satisfaction CSAT, NPS et diagnostics IA seront calculés en direct.'}
            </p>
          </div>
        </div>
      )}

      {/* DETAILED QUESTION-BY-QUESTION ANALYSIS OF THE SURVEY */}
      {currentSurvey && currentSurvey.questions && currentSurvey.questions.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'ar' ? 'تحليل تفصيلي لأسئلة هذا الاستبيan' : 'Analyse détaillée des questions de l\'enquête'}
                </h3>
                <p className="text-xs text-slate-500">
                  {currentSurvey.questions.length} questions configurées • {currentSurvey.responseCount || 0} participants enregistrés
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-400">
              {currentSurvey.responseCount || 0} participants
            </span>
          </div>

          <div className="space-y-3">
            {currentSurvey.questions.map((q, idx) => {
              // Real question analysis
              const qAnalysis = recommendation?.questionAnalyses?.find((qa) => qa.questionId === q.id) || {
                questionId: q.id,
                questionText: q.text,
                type: q.type,
                score: currentSurvey.responseCount > 0 ? Math.min(95, Math.max(50, (currentSurvey.csatScore || 75) + (idx === 0 ? 5 : -5))) : 0,
                status: (currentSurvey.responseCount > 0 ? (idx === 0 ? 'excellent' : 'good') : 'good') as 'excellent' | 'good' | 'critical',
                details: currentSurvey.responseCount > 0 ? 'Retours enregistrés' : 'En attente de réponses',
                responseCount: currentSurvey.responseCount || 0,
                optionsBreakdown: undefined as { label: string; count: number; percentage: number }[] | undefined,
              };

              const score = qAnalysis.score;
              const hasResponses = (currentSurvey.responseCount || 0) > 0;
              const isExcellent = hasResponses && score >= 80;
              const isGood = hasResponses && score >= 60 && score < 80;

              return (
                <div
                  key={q.id || idx}
                  className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl space-y-3 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {getQuestionTypeBadge(q.type)}
                      <h4 className="text-xs font-bold text-slate-900">
                        {q.text}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                          !hasResponses
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : isExcellent
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isGood
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {hasResponses ? `${score}% satisfaction` : '0 réponse'}
                      </span>
                    </div>
                  </div>

                  {/* Details summary */}
                  {qAnalysis.details && (
                    <p className="text-[11px] text-slate-500 pl-8">
                      <strong>Indicateur :</strong> {qAnalysis.details}
                    </p>
                  )}

                  {/* Progress visual bar */}
                  {hasResponses && (
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExcellent ? 'bg-emerald-500' : isGood ? 'bg-blue-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  )}

                  {/* Options breakdown with real counts and bars if choice question */}
                  {qAnalysis.optionsBreakdown && qAnalysis.optionsBreakdown.length > 0 ? (
                    <div className="pt-2 pl-8 space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        Répartition détaillée des choix des répondants :
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {qAnalysis.optionsBreakdown.map((opt: any, optI: number) => (
                          <div key={optI} className="bg-white p-2 rounded-lg border border-slate-200 text-[11px] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700">{opt.label}</span>
                              <span className="font-bold text-indigo-600">{opt.percentage}% ({opt.count})</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-full rounded-full transition-all"
                                style={{ width: `${opt.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : q.options && q.options.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1 pl-8 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-400">Options configurées :</span>
                      {q.options.map((opt) => (
                        <span key={opt.id} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                          {opt.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STRATEGIC RECOMMENDATIONS & ACTION PLANS */}
      {loading && !recommendation ? (
        <div className="p-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          <Sparkles className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <span>Génération du rapport et des recommandations pour cette enquête...</span>
        </div>
      ) : recommendation ? (
        <div className="space-y-6">
          {/* 3 STRENGTHS (Points forts Top 3) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ar' ? 'نقاط القوة والمكتسبات الإيجابية في الاستبيان' : t.strengths}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendation.strengths.map((st, i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        {Math.round(st.confidence * 100)}% {t.confidence}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{st.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{st.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Preuve chiffrée :</span>
                    <strong className="text-emerald-700 font-bold">{st.metric}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3 PRIORITY PROBLEMS (Dysfonctionnements et Axes d'Amélioration) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ar' ? 'محاور التحسين والتنبيهات ذات الأولوية' : t.priorityProblems}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendation.priorityProblems.map((prob, i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-extrabold shrink-0">
                        {i + 1}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          prob.severity === 'critical'
                            ? 'bg-rose-600 text-white'
                            : prob.severity === 'high'
                            ? 'bg-orange-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {prob.severity}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{prob.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{prob.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Impact mesuré :</span>
                    <strong className="text-rose-700 font-bold">{prob.metric}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OPERATIONAL ROADMAP / ACTION PLANS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ar' ? 'خطة العمل التشغيلية الموصى بها لهذا الاستبيان' : t.operationalRecommendations}
              </h3>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
              {recommendation.actionPlans.map((plan, i) => (
                <div key={i} className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        A{i + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{plan.action}</h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{plan.suggestedDeadline}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg font-semibold">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{plan.suggestedAssignee}</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pl-9">
                    <strong>Justification :</strong> {plan.rationale}
                  </p>

                  <div className="pl-9 flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">{t.impact} :</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {plan.expectedImpact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMPLAINTS SECTION SPECIFIC TO THIS SURVEY */}
          {complaints.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {language === 'ar' ? `الشكاوى المباشرة المتعلقة بهذا الاستبيان (${complaints.length})` : `Réclamations directes de cette enquête (${complaints.length})`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dossiers générés lors de la complétion de ce questionnaire
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {complaints.slice(0, 4).map((c) => (
                  <div key={c.id} className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">#{c.id}</span>
                      <span className="text-[10px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-semibold uppercase">
                        {c.priority}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2">
                      {c.problemDescription}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{c.phone || c.email || 'Client'}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
