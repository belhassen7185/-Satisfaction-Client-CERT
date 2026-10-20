import React, { useState } from 'react';
import {
  Survey,
  Question,
  QuestionType,
  Language,
  SurveyStatus,
} from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { api } from '../services/api.ts';
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Sparkles,
  Save,
  Send,
  Eye,
  Smartphone,
  Monitor,
  HelpCircle,
  AlertTriangle,
  X,
  Languages,
  Check,
  Star,
  Mic,
  AlignLeft,
  List,
  CheckSquare,
  Radio,
  FileCheck
} from 'lucide-react';

interface SurveyEditorProps {
  survey?: Survey | null;
  language: Language;
  onSave: (saved: Survey) => void;
  onCancel: () => void;
  onPreview: (survey: Survey) => void;
}

export const SurveyEditor: React.FC<SurveyEditorProps> = ({
  survey,
  language,
  onSave,
  onCancel,
  onPreview,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar' || language === 'tn';

  // Form states
  const [title, setTitle] = useState(survey?.title || '');
  const [description, setDescription] = useState(survey?.description || '');
  const [surveyLang, setSurveyLang] = useState<Language>(survey?.language || language);
  const [category, setCategory] = useState(survey?.category || 'Services');
  const [status, setStatus] = useState<SurveyStatus>(survey?.status || 'draft');
  const [questions, setQuestions] = useState<Question[]>(
    survey?.questions || [
      {
        id: 'q1',
        text: 'Comment évaluez-vous la qualité globale de nos services ?',
        type: 'stars',
        required: true,
        order: 1,
      },
      {
        id: 'q2',
        text: 'Recommanderiez-vous nos prestations à votre entourage ? (Note NPS 0-10)',
        type: 'nps',
        required: true,
        order: 2,
      },
    ]
  );

  // Complaint question configuration
  const [complaintEnabled, setComplaintEnabled] = useState(
    survey?.complaintQuestion?.enabled ?? true
  );

  // AI Generator Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add new question
  const handleAddQuestion = (type: QuestionType = 'single_choice') => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      text: '',
      type,
      required: true,
      order: questions.length + 1,
      options:
        type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown'
          ? [
              { id: '1', label: 'Option 1', value: 'opt_1' },
              { id: '2', label: 'Option 2', value: 'opt_2' },
            ]
          : undefined,
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (qId: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, ...updates } : q)));
  };

  const handleDeleteQuestion = (qId: string) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) {
      return;
    }
    const newArr = [...questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    // update order numbers
    newArr.forEach((q, i) => (q.order = i + 1));
    setQuestions(newArr);
  };

  // Add / remove question options
  const handleAddOption = (qId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        const currentOpts = q.options || [];
        const newOptId = String(currentOpts.length + 1);
        return {
          ...q,
          options: [
            ...currentOpts,
            { id: newOptId, label: `Option ${newOptId}`, value: `opt_${newOptId}` },
          ],
        };
      })
    );
  };

  const handleUpdateOption = (qId: string, optId: string, label: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: (q.options || []).map((opt) =>
            opt.id === optId ? { ...opt, label, value: label.toLowerCase().replace(/\s+/g, '_') } : opt
          ),
        };
      })
    );
  };

  const handleDeleteOption = (qId: string, optId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: (q.options || []).filter((opt) => opt.id !== optId),
        };
      })
    );
  };

  // AI Survey Generation
  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    setErrorMsg(null);
    try {
      const generated = await api.generateSurveyWithAI(aiPrompt.trim(), surveyLang);
      if (generated) {
        if (generated.title) setTitle(generated.title);
        if (generated.description) setDescription(generated.description);
        if (generated.category) setCategory(generated.category);
        if (Array.isArray(generated.questions) && generated.questions.length > 0) {
          const mappedQuestions: Question[] = generated.questions.map((gq: any, i: number) => ({
            id: `ai-q-${Date.now()}-${i}`,
            text: gq.text,
            type: gq.type || 'single_choice',
            required: gq.required ?? true,
            order: i + 1,
            options: gq.options || (gq.type === 'single_choice' || gq.type === 'multiple_choice' ? [
              { id: '1', label: 'Satisfait', value: 'sat' },
              { id: '2', label: 'Insatisfait', value: 'unsat' }
            ] : undefined)
          }));
          setQuestions(mappedQuestions);
        }
        setShowAiModal(false);
        setAiPrompt('');
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      setErrorMsg(err.message || 'Échec de la génération par IA');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSave = async (publishNow = false) => {
    if (!title.trim()) {
      setErrorMsg('Veuillez saisir un titre pour l\'enquête.');
      return;
    }
    if (questions.length === 0) {
      setErrorMsg('Veuillez ajouter au moins une question.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const cleanedQuestions = questions.map((q, idx) => ({
      ...q,
      text: q.text.trim() || `Question ${idx + 1}`,
      options: q.options?.map((opt, optIdx) => ({
        ...opt,
        label: opt.label.trim() || `Option ${optIdx + 1}`,
      })),
    }));

    const payload: Partial<Survey> = {
      title: title.trim(),
      description: description.trim(),
      language: surveyLang,
      category: category.trim() || 'Services',
      status: publishNow ? 'published' : status,
      questions: cleanedQuestions,
      complaintQuestion: {
        enabled: complaintEnabled,
        title:
          surveyLang === 'ar'
            ? 'هل لديك شكوى بخصوص ملف يتعلق بخدماتنا؟ إذا كان الأمر كذلك، شاركها معنا مع توضيح مشكلتك.'
            : surveyLang === 'tn'
            ? 'عندك تشكّي ولا مشكلة تخص دوسي في خدماتنا؟ كان إيه، قلّنا وفسّر لنا المشكل متاعك.'
            : 'Avez-vous une réclamation concernant un dossier lié à nos services ? Si oui, partagez-la avec nous en nous expliquant votre problème.',
        requireDossierNumber: false,
        requireContactInfo: false,
      },
    };

    try {
      let result: Survey;
      if (survey?.id) {
        result = await api.updateSurvey(survey.id, payload);
      } else {
        result = await api.createSurvey(payload);
      }
      setIsSaving(false);
      onSave(result);
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err.message || 'Erreur lors de l\'enregistrement de l\'enquête.');
    }
  };

  const getQuestionTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'stars':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'nps':
        return <span className="font-bold text-xs text-indigo-600">0-10</span>;
      case 'single_choice':
        return <Radio className="w-4 h-4 text-blue-600" />;
      case 'multiple_choice':
        return <CheckSquare className="w-4 h-4 text-purple-600" />;
      case 'dropdown':
        return <List className="w-4 h-4 text-emerald-600" />;
      case 'voice':
        return <Mic className="w-4 h-4 text-rose-600" />;
      case 'text':
      default:
        return <AlignLeft className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {survey ? t.edit : t.newSurvey}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Éditeur professionnel avec génération IA et question spécifique de réclamation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Generator button */}
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.aiSuggestQuestions}</span>
          </button>

          {/* Preview button */}
          <button
            type="button"
            onClick={() => {
              const previewObj: Survey = {
                id: survey?.id || 'preview',
                title: title || 'Aperçu de l\'enquête',
                description,
                language: surveyLang,
                status,
                category,
                questions,
                complaintQuestion: {
                  enabled: complaintEnabled,
                  title: '',
                  requireDossierNumber: false,
                  requireContactInfo: false,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                responseCount: 0,
                csatScore: 0,
                npsScore: 0,
              };
              onPreview(previewObj);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>{t.preview}</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{t.saveSurvey}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{t.publishSurvey}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Survey Meta Settings Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Informations Générales
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-700">{t.surveyTitle} *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Enquête de Satisfaction Usagers - Mairie & Services d'Accueil"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">{t.surveyLanguage}</label>
            <select
              value={surveyLang}
              onChange={(e) => setSurveyLang(e.target.value as Language)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="fr">Français (FR)</option>
              <option value="ar">العربية (RTL - AR)</option>
              <option value="tn">الدارجة التونسية (TN)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-700">{t.surveyDescription}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Message introductif expliquant le but du questionnaire aux usagers..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Catégorie / Secteur</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Santé, Banque, Commerce, Administration..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Questions Manager */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Questions du questionnaire</h3>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
              {questions.length}
            </span>
          </div>

          {/* Add question dropdown / buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAddQuestion('stars')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Star className="w-3.5 h-3.5" />
              <span>+ Étoiles</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('nps')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>+ NPS</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('single_choice')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>+ Choix unique</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('voice')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>+ Vocal</span>
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="p-1.5 bg-slate-100 rounded-lg shrink-0">
                    {getQuestionTypeIcon(q.type)}
                  </div>
                  <select
                    value={q.type}
                    onChange={(e) => handleUpdateQuestion(q.id, { type: e.target.value as QuestionType })}
                    className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 cursor-pointer"
                  >
                    <option value="stars">{t.starsRating}</option>
                    <option value="nps">{t.npsRating}</option>
                    <option value="single_choice">{t.singleChoice}</option>
                    <option value="multiple_choice">{t.multipleChoice}</option>
                    <option value="dropdown">{t.dropdown}</option>
                    <option value="text">{t.freeText}</option>
                    <option value="voice">{t.voiceResponse}</option>
                  </select>
                </div>

                {/* Question actions: Up, Down, Delete, Required toggle */}
                <div className="flex items-center gap-1">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 mr-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t.required}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
                    title="Monter"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(idx, 'down')}
                    disabled={idx === questions.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
                    title="Descendre"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text Input */}
              <div>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                  placeholder="Intitulé de la question..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Options manager if choice or dropdown */}
              {(q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'dropdown') && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Options de réponse</span>
                    <button
                      type="button"
                      onClick={() => handleAddOption(q.id)}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addOption}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(q.options || []).map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => handleUpdateOption(q.id, opt.id, e.target.value)}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteOption(q.id, opt.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Question Button Footer */}
        <button
          type="button"
          onClick={() => handleAddQuestion('single_choice')}
          className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl text-slate-600 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addQuestion}</span>
        </button>
      </div>

      {/* SPECIAL COMPLAINT QUESTION SECTION (Section 4 of brief) */}
      <div className="p-6 bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 rounded-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full text-[11px] font-bold uppercase tracking-wider">
                Module Réclamation
              </span>
              <span className="text-xs text-slate-500">Toujours en dernière position</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">{t.complaintQuestionSection}</h4>
            <p className="text-xs text-slate-600">{t.complaintQuestionExplanation}</p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={complaintEnabled}
              onChange={(e) => setComplaintEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
          </label>
        </div>

        {complaintEnabled && (
          <div className="p-4 bg-white/90 border border-rose-200 rounded-xl space-y-2 text-xs text-slate-700">
            <div className="font-semibold text-rose-900">
              Formulation automatique selon la langue sélectionnée :
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800">
              {surveyLang === 'ar'
                ? '« هل لديك شكوى بخصوص ملف يتعلق بخدماتنا؟ إذا كان الأمر كذلك، شاركها معنا مع توضيح مشكلتك. »'
                : surveyLang === 'tn'
                ? '« عندك تشكّي ولا مشكلة تخص دوسي في خدماتنا؟ كان إيه، قلّنا وفسّر لنا المشكل متاعك. »'
                : '« Avez-vous une réclamation concernant un dossier lié à nos services ? Si oui, partagez-la avec nous en nous expliquant votre problème. »'}
            </div>
            <p className="text-[11px] text-slate-500">
              ✓ Intègre la saisie vocale et écrite + champs facultatifs (n° dossier, date de dépôt, téléphone, email) et déclenche la création d'une réclamation avec alerte immédiate.
            </p>
          </div>
        )}
      </div>

      {/* AI Survey Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t.aiGenerateTitle}</h3>
                  <p className="text-xs text-slate-500">Alimenté par Google Gemini</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{t.aiActivityPrompt}</label>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex : Clinique privée pluridisciplinaire en Tunisie. Nous souhaitons évaluer l'accueil d'urgence, la propreté des chambres, les explications médicales et le temps d'attente à la pharmacie..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <span>Langue cible :</span>
                <span className="font-bold text-indigo-700">
                  {surveyLang === 'fr' ? 'Français' : surveyLang === 'ar' ? 'العربية الفصحى' : 'الدارجة التونسية'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isAiGenerating || !aiPrompt.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.aiGenerating}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.aiGenerateBtn}</span>
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
