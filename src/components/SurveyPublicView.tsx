import React, { useState } from 'react';
import {
  Survey,
  Language,
  Question,
  AnswerItem,
  ComplaintData
} from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { api } from '../services/api.ts';
import { AudioRecorder } from './AudioRecorder.tsx';
import {
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  HelpCircle,
  FileText,
  ShieldCheck,
  LayoutList,
  Layers,
  ChevronDown,
  UserCheck,
  Loader2,
  Share2,
  Mail,
  Copy,
  Check,
  MessageCircle,
  X
} from 'lucide-react';
import { CertLogo } from './CertLogo.tsx';
import { getPublicAppBaseUrl } from '../utils/url.ts';

interface SurveyPublicViewProps {
  survey: Survey;
  channel?: 'web' | 'qr' | 'whatsapp' | 'email';
  onClosePreview?: () => void;
  isPreview?: boolean;
}

export const SurveyPublicView: React.FC<SurveyPublicViewProps> = ({
  survey,
  channel = 'web',
  onClosePreview,
  isPreview = false,
}) => {
  const [lang, setLang] = useState<Language>(survey.language || 'fr');
  const t = translations[lang];
  const isRtl = lang === 'ar' || lang === 'tn';

  // Display mode: stepper (one question at a time) or full form
  const [displayMode, setDisplayMode] = useState<'stepper' | 'full'>('stepper');
  const [currentStep, setCurrentStep] = useState(0);

  // User answers keyed by question ID
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [voiceTranscriptions, setVoiceTranscriptions] = useState<Record<string, string>>({});

  // Complaint section state
  const [hasComplaint, setHasComplaint] = useState<boolean | null>(null);
  const [complaintText, setComplaintText] = useState('');
  const [complaintDossier, setComplaintDossier] = useState('');
  const [complaintDate, setComplaintDate] = useState('');
  const [complaintPhone, setComplaintPhone] = useState('');
  const [complaintEmail, setComplaintEmail] = useState('');
  const [complaintVoiceBase64, setComplaintVoiceBase64] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionRef, setSubmissionRef] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sharing states
  const [copiedSurveyLink, setCopiedSurveyLink] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const getSurveyShareUrl = () => {
    const base = getPublicAppBaseUrl();
    return `${base}/?survey=${survey.id}`;
  };

  const handleCopySurveyLink = async () => {
    try {
      await navigator.clipboard.writeText(getSurveyShareUrl());
      setCopiedSurveyLink(true);
      setTimeout(() => setCopiedSurveyLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyReceipt = async () => {
    if (!submissionRef) return;
    try {
      const text = `CERT - Réf. Réception: ${submissionRef}\nEnquête: ${survey.title}\nDate: ${new Date().toLocaleDateString()}`;
      await navigator.clipboard.writeText(text);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2000);
    } catch {
      // ignore
    }
  };

  const questions = survey.questions || [];
  // If complaint question is enabled, it acts as an additional final step in stepper mode
  const totalSteps = questions.length + (survey.complaintQuestion?.enabled ? 1 : 0);

  const handleAnswerChange = (qId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
    setValidationError(null);
  };

  const handleVoiceTranscription = (qId: string, text: string) => {
    setVoiceTranscriptions((prev) => ({ ...prev, [qId]: text }));
    setAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep < questions.length) {
      const q = questions[currentStep];
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          setValidationError(
            lang === 'ar' || lang === 'tn'
              ? 'هذا السؤال إجباري، يرجى تقديم إجابتكم للمتابعة.'
              : 'Cette question est obligatoire pour poursuivre.'
          );
          return false;
        }
      }
    }
    setValidationError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check mandatory questions in full mode or final step
    for (const q of questions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          setValidationError(
            lang === 'ar' || lang === 'tn'
              ? `يرجى الإجابة على السؤال الإجباري: « ${q.text} »`
              : `Veuillez répondre à la question obligatoire : « ${q.text} »`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    setValidationError(null);

    // Prepare answers payload
    const formattedAnswers: AnswerItem[] = questions.map((q) => ({
      questionId: q.id,
      questionText: q.text,
      type: q.type,
      value: answers[q.id] ?? '',
      transcription: voiceTranscriptions[q.id],
    }));

    // Prepare complaint payload if user specified an issue
    let complaintPayload: ComplaintData | undefined;
    if (hasComplaint && complaintText.trim().length > 0) {
      complaintPayload = {
        hasComplaint: true,
        problemDescription: complaintText.trim(),
        dossierNumber: complaintDossier.trim() || undefined,
        submissionDate: complaintDate || undefined,
        phone: complaintPhone.trim() || undefined,
        email: complaintEmail.trim() || undefined,
        audioTranscription: complaintText.trim(),
      };
    }

    try {
      const res = await api.submitSurvey(survey.id, {
        surveyId: survey.id,
        language: lang,
        channel: channel || 'web',
        answers: formattedAnswers,
        complaint: complaintPayload,
      });

      setIsSubmitting(false);
      setSubmitted(true);
      setSubmissionRef(res.submissionId || `REF-${Math.floor(100000 + Math.random() * 900000)}`);
    } catch (err: any) {
      setIsSubmitting(false);
      setValidationError(err.message || 'Erreur lors de l\'enregistrement de votre réponse');
    }
  };

  // Render question control based on type
  const renderQuestionInput = (q: Question) => {
    const value = answers[q.id];

    switch (q.type) {
      case 'stars':
        return (
          <div className="flex items-center justify-center gap-3 py-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleAnswerChange(q.id, star)}
                className="p-2 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    (value || 0) >= star
                      ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                      : 'text-slate-300 hover:text-amber-200'
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case 'nps':
        return (
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-11 gap-1.5 sm:gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const isSelected = value === score;
                const isPromoter = score >= 9;
                const isPassive = score >= 7 && score <= 8;
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => handleAnswerChange(q.id, score)}
                    className={`py-3 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? isPromoter
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                          : isPassive
                          ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-300'
                          : 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-medium px-1">
              <span>{q.minLabel || (isRtl ? 'غير محتمل إطلاقاً (0)' : 'Pas du tout probable (0)')}</span>
              <span>{q.maxLabel || (isRtl ? 'محتمل جداً (10)' : 'Extrêmement probable (10)')}</span>
            </div>
          </div>
        );

      case 'single_choice':
        return (
          <div className="space-y-2 py-3">
            {(q.options || []).map((opt) => {
              const isSelected = value === opt.value;
              return (
                <label
                  key={opt.id}
                  onClick={() => handleAnswerChange(q.id, opt.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-600 ring-1 ring-indigo-600 text-indigo-950 font-medium'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm">{opt.label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'multiple_choice':
        const selectedList: string[] = Array.isArray(value) ? value : [];
        const toggleOption = (optVal: string) => {
          if (selectedList.includes(optVal)) {
            handleAnswerChange(q.id, selectedList.filter((v) => v !== optVal));
          } else {
            handleAnswerChange(q.id, [...selectedList, optVal]);
          }
        };

        return (
          <div className="space-y-2 py-3">
            {(q.options || []).map((opt) => {
              const isChecked = selectedList.includes(opt.value);
              return (
                <label
                  key={opt.id}
                  onClick={() => toggleOption(opt.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-indigo-50/70 border-indigo-600 ring-1 ring-indigo-600 text-indigo-950 font-medium'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-sm">{opt.label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'dropdown':
        return (
          <div className="py-3 relative">
            <select
              value={value || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              className="w-full appearance-none p-3.5 pr-10 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="" disabled>
                {isRtl ? '-- يرجى اختيار إجابة --' : '-- Choisissez une option --'}
              </option>
              {(q.options || []).map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="py-3">
            <AudioRecorder
              language={lang}
              initialText={value || ''}
              onTranscriptionChange={(text) => handleVoiceTranscription(q.id, text)}
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div className="py-3">
            <textarea
              rows={4}
              value={value || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              placeholder={isRtl ? 'اكتب إجابتك أو ملاحظتك هنا...' : 'Votre réponse détaillée...'}
              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        );
    }
  };

  // Render complaint question section
  const renderComplaintSection = () => {
    const complaintQuestionText =
      lang === 'ar'
        ? 'هل لديك شكوى بخصوص ملف يتعلق بخدماتنا؟ إذا كان الأمر كذلك، شاركها معنا مع توضيح مشكلتك.'
        : lang === 'tn'
        ? 'عندك تشكّي ولا مشكلة تخص دوسي في خدماتنا؟ كان إيه، قلّنا وفسّر لنا المشكل متاعك.'
        : 'Avez-vous une réclamation concernant un dossier lié à nos services ? Si oui, partagez-la avec nous en nous expliquant votre problème.';

    return (
      <div className="space-y-5 p-6 bg-rose-50/50 border-2 border-rose-200/80 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 leading-snug">
              {complaintQuestionText}
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              {t.complaintQuestionExplanation}
            </p>
          </div>
        </div>

        {/* Binary question: Yes / No */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHasComplaint(true)}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
              hasComplaint === true
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-300'
                : 'bg-white hover:bg-rose-50 text-slate-700 border-slate-300'
            }`}
          >
            {isRtl ? 'نعم، لدي شكوى' : 'Oui, j\'ai une réclamation'}
          </button>
          <button
            type="button"
            onClick={() => {
              setHasComplaint(false);
              setComplaintText('');
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
              hasComplaint === false
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300'
            }`}
          >
            {isRtl ? 'لا، لا توجد أي شكوى' : 'Non, aucune réclamation'}
          </button>
        </div>

        {/* If user answered Yes: display detailed description + optional dossier & contact fields */}
        {hasComplaint === true && (
          <div className="space-y-4 pt-3 border-t border-rose-200 animate-in fade-in duration-200">
            {/* Written description or voice message */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                {isRtl ? 'اشرح لنا المشكلة (كتابياً أو برسالة صوتية) :' : 'Expliquez votre problème (par écrit ou par message vocal) :'}
              </label>

              <AudioRecorder
                language={lang}
                initialText={complaintText}
                placeholder={isRtl ? 'اشرح بالتفصيل ما الذي حدث معك ورقم المعاملة إن وجد...' : 'Expliquez en détail le dysfonctionnement constaté, les démarches effectuées...'}
                onTranscriptionChange={(text) => setComplaintText(text)}
                onAudioRecorded={(blob, base64) => setComplaintVoiceBase64(base64)}
              />
            </div>

            {/* Optional administrative and contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.dossierNumber}
                </label>
                <input
                  type="text"
                  value={complaintDossier}
                  onChange={(e) => setComplaintDossier(e.target.value)}
                  placeholder="Ex: 2026/ML-409"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.depositDate}
                </label>
                <input
                  type="date"
                  value={complaintDate}
                  onChange={(e) => setComplaintDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.phoneNumber}
                </label>
                <input
                  type="tel"
                  value={complaintPhone}
                  onChange={(e) => setComplaintPhone(e.target.value)}
                  placeholder="+216 -- --- ---"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.emailAddress}
                </label>
                <input
                  type="email"
                  value={complaintEmail}
                  onChange={(e) => setComplaintEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Privacy notice banner */}
            <div className="flex items-center gap-2 p-3 bg-white/80 border border-slate-200 rounded-lg text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.privacyDisclaimer}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Thank You Confirmation View
  if (submitted) {
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4"
      >
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900">{t.thankYouTitle}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{t.thankYouMessage}</p>
          </div>

          {submissionRef && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                {t.referenceNumber}
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-mono font-bold text-indigo-700 tracking-wider">
                  {submissionRef}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  title="Copier la référence"
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                >
                  {copiedReceipt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}


          {hasComplaint && complaintText && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 text-left">
              <strong>{isRtl ? 'متابعة الشكوى :' : 'Prise en charge de votre réclamation :'}</strong>
              <p className="mt-1">
                {isRtl
                  ? 'تم تسجيل شكواكم وتوجيهها للمصلحة المعنية مع التنبيه الفوري لفريق المتابعة.'
                  : 'Votre réclamation a été transmise au service compétent avec notification prioritaire.'}
              </p>
            </div>
          )}

          {isPreview && onClosePreview && (
            <button
              onClick={onClosePreview}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Fermer la prévisualisation
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active respondent form view
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50/70 text-slate-900 pb-16"
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center py-0.5">
              <CertLogo className="h-8 w-auto" />
            </div>
            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
            <div>
              <h1 className="text-sm font-bold text-slate-900 line-clamp-1">{survey.title}</h1>
              {survey.category && (
                <span className="text-[11px] text-slate-500">{survey.category}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stepper vs Full form toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDisplayMode('stepper')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  displayMode === 'stepper' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t.viewStepper}</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('full')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  displayMode === 'full' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>{t.viewFullForm}</span>
              </button>
            </div>

            {/* Language switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setLang('fr')}
                className={`px-2 py-1 rounded-md transition-colors ${lang === 'fr' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-600'}`}
              >
                FR
              </button>
              <button
                onClick={() => setLang('ar')}
                className={`px-2 py-1 rounded-md transition-colors ${lang === 'ar' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-600'}`}
              >
                عربي
              </button>
              <button
                onClick={() => setLang('tn')}
                className={`px-2 py-1 rounded-md transition-colors ${lang === 'tn' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-600'}`}
              >
                تونسي
              </button>
            </div>

            {/* Quick Share Button (WhatsApp & Email) */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title={isRtl ? 'مشاركة الاستبيان عبر واتساب والبريد' : 'Partager l\'enquête sur WhatsApp et par e-mail'}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.share}</span>
            </button>

            {isPreview && onClosePreview && (
              <button
                onClick={onClosePreview}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Quitter l'aperçu
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Bar (in Stepper Mode) */}
      {displayMode === 'stepper' && (
        <div className="w-full bg-slate-200 h-1.5">
          <div
            className="bg-indigo-600 h-1.5 transition-all duration-300"
            style={{ width: `${Math.round(((currentStep + 1) / totalSteps) * 100)}%` }}
          />
        </div>
      )}

      {/* Main Content Card */}
      <main className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          {/* Survey title & welcome banner */}
          <div className="mb-6 pb-6 border-b border-slate-100 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
              <UserCheck className="w-4 h-4" />
              <span>{t.welcomeToSurvey}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{survey.title}</h2>
            {survey.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{survey.description}</p>
            )}
          </div>

          {validationError && (
            <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Stepper Mode View */}
          {displayMode === 'stepper' ? (
            <div className="space-y-6">
              {currentStep < questions.length ? (
                // Current Question
                (() => {
                  const q = questions[currentStep];
                  return (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span>
                          {t.step} {currentStep + 1} {t.of} {totalSteps}
                        </span>
                        {q.required ? (
                          <span className="text-rose-600 font-bold">* {t.required}</span>
                        ) : (
                          <span className="text-slate-400">{t.optional}</span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">{q.text}</h3>
                      {q.description && (
                        <p className="text-xs text-slate-500">{q.description}</p>
                      )}

                      {renderQuestionInput(q)}
                    </div>
                  );
                })()
              ) : (
                // Final Step: Special Complaint Question
                renderComplaintSection()
              )}

              {/* Navigation controls */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    currentStep === 0
                      ? 'text-slate-300 pointer-events-none'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  <span>{t.previous}</span>
                </button>

                {currentStep < totalSteps - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>{t.next}</span>
                    {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t.submitting}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{t.submitSurvey}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Full Form View
            <form onSubmit={handleSubmit} className="space-y-8">
              {questions.map((q, idx) => (
                <div key={q.id} className="space-y-3 pb-6 border-b border-slate-100 last:border-b-0">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Question {idx + 1}</span>
                    {q.required ? (
                      <span className="text-rose-600 font-bold">* {t.required}</span>
                    ) : (
                      <span className="text-slate-400">{t.optional}</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{q.text}</h3>
                  {q.description && <p className="text-xs text-slate-500">{q.description}</p>}
                  {renderQuestionInput(q)}
                </div>
              ))}

              {/* Special Complaint Question always at the end */}
              {survey.complaintQuestion?.enabled && renderComplaintSection()}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t.submitting}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>{t.submitSurvey}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isRtl ? 'مشاركة الاستبيان' : 'Partager l\'enquête'}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{survey.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isRtl
                ? 'انشر هذا الاستبيان للمتعاملين والشركاء لجمع آرائهم عبر واتساب أو البريد الإلكتروني.'
                : 'Diffusez cette enquête auprès des usagers et partenaires via WhatsApp ou par e-mail.'}
            </p>

            <div className="space-y-3">
              {/* WhatsApp button */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Bonjour, je vous invite à participer à cette enquête de satisfaction CERT « ${survey.title} » :\n${getSurveyShareUrl()}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
                className="w-full flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <MessageCircle className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">{t.whatsappShare}</div>
                    <div className="text-[11px] text-emerald-700">{isRtl ? 'مشاركة فورية للمحادثات والمجموعات' : 'Discussion individuelle ou groupe'}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Email button */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`Invitation : Enquête de satisfaction CERT - ${survey.title}`)}&body=${encodeURIComponent(
                  `Bonjour,\n\nVous êtes invité(e) à répondre à l'enquête de satisfaction CERT « ${survey.title} » :\n${getSurveyShareUrl()}\n\nMerci pour votre participation !`
                )}`}
                onClick={() => setShowShareModal(false)}
                className="w-full flex items-center justify-between p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-950">{t.emailShare}</div>
                    <div className="text-[11px] text-blue-700">{isRtl ? 'إرسال دعوة رسمية بالبريد' : 'Invitation officielle avec lien'}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-700 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Copy Link */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopySurveyLink}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-colors cursor-pointer border border-slate-300"
                >
                  {copiedSurveyLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSurveyLink ? t.linkCopied : t.copyLink}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
