import React, { useState, useEffect } from 'react';
import {
  DashboardStats,
  Survey,
  Language,
} from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { api } from '../services/api.ts';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  Globe,
  QrCode,
  MessageSquare,
  Mail,
  Filter,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart2,
  Clock,
  RotateCcw
} from 'lucide-react';

interface DashboardProps {
  surveys: Survey[];
  language: Language;
  onNavigateToSurveys: () => void;
  onNavigateToComplaints: () => void;
  onNavigateToReports: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  surveys,
  language,
  onNavigateToSurveys,
  onNavigateToComplaints,
  onNavigateToReports,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar' || language === 'tn';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30); // 7, 30, 90, 0
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats({
        surveyId: selectedSurveyId,
        periodDays: selectedPeriod,
        language: selectedLang,
        channel: selectedChannel,
      });
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedSurveyId, selectedPeriod, selectedLang, selectedChannel]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400 text-sm">
        <Sparkles className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
        <span>Chargement des indicateurs en temps réel...</span>
      </div>
    );
  }

  const s = stats || {
    totalSurveys: surveys.length,
    publishedSurveys: surveys.filter((x) => x.status === 'published').length,
    totalResponses: 0,
    participationRate: 0,
    csatPercentage: 0,
    npsScore: 0,
    promotersCount: 0,
    passivesCount: 0,
    detractorsCount: 0,
    complaints: { total: 0, newCount: 0, inProgressCount: 0, resolvedCount: 0 },
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    channelBreakdown: { web: 0, qr: 0, whatsapp: 0, email: 0 },
    topThemes: [],
    timeline: [],
  };

  const totalSentiments =
    (s.sentimentBreakdown.positive || 0) +
    (s.sentimentBreakdown.neutral || 0) +
    (s.sentimentBreakdown.negative || 0) || 1;

  const posPct = Math.round(((s.sentimentBreakdown.positive || 0) / totalSentiments) * 100);
  const neuPct = Math.round(((s.sentimentBreakdown.neutral || 0) / totalSentiments) * 100);
  const negPct = 100 - posPct - neuPct;

  const totalChannels =
    (s.channelBreakdown.web || 0) +
    (s.channelBreakdown.qr || 0) +
    (s.channelBreakdown.whatsapp || 0) +
    (s.channelBreakdown.email || 0) || 1;

  return (
    <div className="space-y-6">
      {/* Top Banner and Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.dashboard}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi temps réel des KPIs de satisfaction (CSAT, NPS), réclamations et signaux d'expérience
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Actualiser les données"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToReports}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Synthèse IA décisionnelle</span>
          </button>
        </div>
      </div>

      {/* Real-time Interactive Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtres :</span>
        </div>

        {/* Survey filter */}
        <select
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
        >
          <option value="all">{t.allSurveys}</option>
          {surveys.map((sv) => (
            <option key={sv.id} value={sv.id}>
              {sv.title}
            </option>
          ))}
        </select>

        {/* Period filter */}
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(Number(e.target.value))}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
        >
          <option value={7}>7 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={90}>3 derniers mois</option>
          <option value={0}>Toutes les dates</option>
        </select>

        {/* Language filter */}
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
        >
          <option value="all">Toutes langues</option>
          <option value="fr">Français</option>
          <option value="ar">العربية (Arabe)</option>
          <option value="tn">الدارجة التونسية</option>
        </select>

        {/* Channel filter */}
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
        >
          <option value="all">{t.allChannels}</option>
          <option value="web">Web direct</option>
          <option value="qr">Code QR</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
        </select>
      </div>

      {/* KPI Highlight Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CSAT Score Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.csatRate}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{s.csatPercentage}%</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +4.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {t.csatFormulaHint}
          </p>
        </div>

        {/* NPS Score Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.npsScore}
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${s.npsScore >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {s.npsScore > 0 ? `+${s.npsScore}` : s.npsScore}
            </span>
            <span className="text-xs text-slate-500 font-medium">sur -100 à +100</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
            <span className="text-emerald-700 font-bold">{s.promotersCount} Promot.</span>
            <span className="text-amber-700">{s.passivesCount} Pass.</span>
            <span className="text-rose-700 font-bold">{s.detractorsCount} Détr.</span>
          </div>
        </div>

        {/* Total Responses & Participation Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.totalResponses}
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{s.totalResponses}</span>
            <span className="text-xs text-slate-500 font-medium">
              Taux part. : <strong className="text-slate-800">{s.participationRate}%</strong>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {s.publishedSurveys} enquêtes publiées en circulation
          </p>
        </div>

        {/* Complaints Overview Card */}
        <div
          onClick={onNavigateToComplaints}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.complaintsOverview}
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-100 transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">{s.complaints.total}</span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {s.complaints.newCount} nouvelles
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
            <span>{s.complaints.inProgressCount} en cours</span>
            <span className="text-emerald-700 font-semibold">{s.complaints.resolvedCount} résolues</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-700 font-semibold pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Alertes WhatsApp IA actives
            </span>
            <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">Gérer &rarr;</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Chart (Timeline of Satisfaction) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.satisfactionEvolution}</h3>
              <p className="text-xs text-slate-400">Évolution conjointe du CSAT (%) et du volume de réponses</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Indicateurs réels
            </span>
          </div>

          {/* SVG Timeline Chart */}
          <div className="h-64 flex flex-col justify-end pt-4">
            <div className="flex items-end justify-between h-48 gap-2 pt-4 px-2 border-b border-slate-100">
              {s.timeline.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] font-semibold p-1.5 rounded-md pointer-events-none whitespace-nowrap shadow-lg">
                    CSAT: {pt.csat}% | Rep: {pt.responses}
                  </div>

                  {/* Dual bar: responses volume + CSAT indicator */}
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    <div
                      className="w-3 sm:w-5 bg-indigo-600 rounded-t-sm transition-all group-hover:bg-indigo-700"
                      style={{ height: `${Math.min(100, (pt.csat / 100) * 100)}%` }}
                    />
                    <div
                      className="w-1.5 sm:w-2.5 bg-slate-300 rounded-t-sm"
                      style={{ height: `${Math.min(100, (pt.responses / 12) * 100)}%` }}
                    />
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium truncate w-12 text-center mt-2">
                    {pt.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-medium pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-indigo-600 rounded-xs" />
                <span>Score CSAT (%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-slate-300 rounded-xs" />
                <span>Volume de réponses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t.sentimentDistribution}</h3>
            <p className="text-xs text-slate-400">Classification automatique des retours clients</p>
          </div>

          {/* Visual Bar Distribution */}
          <div className="space-y-4 pt-2">
            <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100">
              <div
                style={{ width: `${posPct}%` }}
                className="bg-emerald-500 transition-all"
                title={`Positif: ${posPct}%`}
              />
              <div
                style={{ width: `${neuPct}%` }}
                className="bg-amber-400 transition-all"
                title={`Neutre: ${neuPct}%`}
              />
              <div
                style={{ width: `${negPct}%` }}
                className="bg-rose-500 transition-all"
                title={`Négatif: ${negPct}%`}
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700">{t.positive}</span>
                </div>
                <span className="font-bold text-slate-900">{posPct}%</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="font-semibold text-slate-700">{t.neutral}</span>
                </div>
                <span className="font-bold text-slate-900">{neuPct}%</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-semibold text-slate-700">{t.negative}</span>
                </div>
                <span className="font-bold text-slate-900">{negPct}%</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
              💡 <em>L'IA classe chaque réponse textuelle et vocale selon l'intensité des sentiments exprimés.</em>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Top Recurring Themes & Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Themes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.recurringThemes}</h3>
              <p className="text-xs text-slate-400">Fréquence des sujets mentionnés dans les commentaires</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Analyse sémantique</span>
          </div>

          <div className="space-y-3 pt-1">
            {s.topThemes.map((th, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{th.theme}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        th.sentiment === 'positive'
                          ? 'bg-emerald-50 text-emerald-700'
                          : th.sentiment === 'negative'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {th.sentiment}
                    </span>
                    <span className="font-bold text-slate-700">{th.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      th.sentiment === 'positive'
                        ? 'bg-emerald-500'
                        : th.sentiment === 'negative'
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${th.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t.channelPerformance}</h3>
            <p className="text-xs text-slate-400">Répartition des réponses par canal de collecte</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Web Direct</span>
                <Globe className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{s.channelBreakdown.web}</div>
              <div className="text-[11px] text-slate-400">
                {Math.round(((s.channelBreakdown.web || 0) / totalChannels) * 100)}% du total
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Code QR</span>
                <QrCode className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{s.channelBreakdown.qr}</div>
              <div className="text-[11px] text-slate-400">
                {Math.round(((s.channelBreakdown.qr || 0) / totalChannels) * 100)}% du total
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">WhatsApp</span>
                <MessageSquare className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{s.channelBreakdown.whatsapp}</div>
              <div className="text-[11px] text-slate-400">
                {Math.round(((s.channelBreakdown.whatsapp || 0) / totalChannels) * 100)}% du total
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Email</span>
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{s.channelBreakdown.email}</div>
              <div className="text-[11px] text-slate-400">
                {Math.round(((s.channelBreakdown.email || 0) / totalChannels) * 100)}% du total
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
