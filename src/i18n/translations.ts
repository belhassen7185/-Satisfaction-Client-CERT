import { Language } from '../types/index.ts';

export interface Translations {
  appName: string;
  appSubtitle: string;
  dashboard: string;
  surveys: string;
  complaints: string;
  reports: string;
  settings: string;
  notifications: string;
  loginTitle: string;
  loginSubtitle: string;
  usernameLabel: string;
  passwordLabel: string;
  rememberMe: string;
  signInBtn: string;
  signOutBtn: string;
  invalidCredentialsError: string;
  demoAccountsTitle: string;
  newSurvey: string;
  aiGenerator: string;
  search: string;
  filterByPeriod: string;
  allSurveys: string;
  allChannels: string;
  totalSurveys: string;
  publishedSurveys: string;
  totalResponses: string;
  participationRate: string;
  csatRate: string;
  csatFormulaHint: string;
  npsScore: string;
  npsFormulaHint: string;
  promoters: string;
  passives: string;
  detractors: string;
  complaintsOverview: string;
  newComplaints: string;
  inProgressComplaints: string;
  resolvedComplaints: string;
  satisfactionEvolution: string;
  sentimentDistribution: string;
  positive: string;
  neutral: string;
  negative: string;
  recurringThemes: string;
  channelPerformance: string;
  status: string;
  published: string;
  draft: string;
  archived: string;
  actions: string;
  edit: string;
  duplicate: string;
  preview: string;
  share: string;
  qrCode: string;
  delete: string;
  copyLink: string;
  linkCopied: string;
  openSurvey: string;
  whatsappShare: string;
  emailShare: string;
  downloadPng: string;
  printQr: string;
  
  // Editor
  surveyTitle: string;
  surveyDescription: string;
  surveyLanguage: string;
  questionsCount: string;
  addQuestion: string;
  questionType: string;
  questionText: string;
  required: string;
  optional: string;
  options: string;
  addOption: string;
  saveSurvey: string;
  publishSurvey: string;
  complaintQuestionSection: string;
  complaintQuestionToggle: string;
  complaintQuestionExplanation: string;
  complaintQuestionStandardText: string;
  aiSuggestQuestions: string;
  aiGenerateTitle: string;
  aiActivityPrompt: string;
  aiGenerateBtn: string;
  aiGenerating: string;
  aiTranslateTitle: string;
  aiTranslateBtn: string;

  // Question types
  singleChoice: string;
  multipleChoice: string;
  dropdown: string;
  starsRating: string;
  npsRating: string;
  freeText: string;
  voiceResponse: string;

  // Public Survey
  welcomeToSurvey: string;
  step: string;
  of: string;
  previous: string;
  next: string;
  submitSurvey: string;
  submitting: string;
  thankYouTitle: string;
  thankYouMessage: string;
  referenceNumber: string;
  recordVoice: string;
  stopRecording: string;
  playbackAudio: string;
  transcribing: string;
  transcriptionResult: string;
  editTranscription: string;
  micPermissionDenied: string;
  recordComplaintVoice: string;
  dossierNumber: string;
  depositDate: string;
  phoneNumber: string;
  emailAddress: string;
  privacyDisclaimer: string;
  hasComplaintPrompt: string;
  describeComplaint: string;
  viewStepper: string;
  viewFullForm: string;

  // Complaints module
  complaintsList: string;
  searchComplaints: string;
  complaintDetails: string;
  originalText: string;
  aiSummary: string;
  category: string;
  priority: string;
  urgent: string;
  high: string;
  medium: string;
  low: string;
  assignee: string;
  internalNotes: string;
  addNote: string;
  markResolved: string;
  markInProgress: string;
  aiSuggestedActions: string;
  confidenceScore: string;
  editAiCategory: string;
  saveChanges: string;

  // Reports
  reportsTitle: string;
  reportsSubtitle: string;
  generateAiReport: string;
  strengths: string;
  priorityProblems: string;
  operationalRecommendations: string;
  exportCsv: string;
  exportExcel: string;
  printReport: string;
  confidence: string;
  suggestedDeadline: string;
  suggestedAssignee: string;
  impact: string;
}

export const translations: Record<Language, Translations> = {
  fr: {
    appName: "Satisfaction Client CERT",
    appSubtitle: "Centre d'Études et de Recherche des Télécommunications - Enquêtes & Réclamations IA",
    dashboard: "Tableau de bord",
    surveys: "Enquêtes",
    complaints: "Réclamations",
    reports: "Rapports & IA",
    settings: "Paramètres",
    notifications: "Notifications",
    loginTitle: "Connexion au Tableau de Bord",
    loginSubtitle: "Accès sécurisé pour l'équipe de gestion et la direction du CERT",
    usernameLabel: "Identifiant ou E-mail",
    passwordLabel: "Mot de passe",
    rememberMe: "Se souvenir de moi sur cet appareil",
    signInBtn: "Se connecter au tableau de bord",
    signOutBtn: "Déconnexion",
    invalidCredentialsError: "Identifiant ou mot de passe incorrect. Veuillez vérifier vos accès.",
    demoAccountsTitle: "Accès rapides de démonstration",
    newSurvey: "Nouvelle enquête",
    aiGenerator: "Générateur IA",
    search: "Rechercher...",
    filterByPeriod: "Période",
    allSurveys: "Toutes les enquêtes",
    allChannels: "Tous les canaux",
    totalSurveys: "Total des enquêtes",
    publishedSurveys: "Enquêtes publiées",
    totalResponses: "Réponses collectées",
    participationRate: "Taux de participation",
    csatRate: "Taux de satisfaction CSAT",
    csatFormulaHint: "Notes positives (4 & 5 étoiles / avis favorables)",
    npsScore: "Score NPS",
    npsFormulaHint: "% Promoteurs (9-10) moins % Détracteurs (0-6)",
    promoters: "Promoteurs (9-10)",
    passives: "Passifs (7-8)",
    detractors: "Détracteurs (0-6)",
    complaintsOverview: "Réclamations clients",
    newComplaints: "Nouvelles",
    inProgressComplaints: "En cours",
    resolvedComplaints: "Résolues / Clôturées",
    satisfactionEvolution: "Évolution de la satisfaction",
    sentimentDistribution: "Répartition des sentiments",
    positive: "Positif",
    neutral: "Neutre",
    negative: "Négatif",
    recurringThemes: "Thèmes les plus fréquents",
    channelPerformance: "Performance par canal",
    status: "Statut",
    published: "Publiée",
    draft: "Brouillon",
    archived: "Archivée",
    actions: "Actions",
    edit: "Modifier",
    duplicate: "Dupliquer",
    preview: "Prévisualiser",
    share: "Diffuser",
    qrCode: "Code QR",
    delete: "Supprimer",
    copyLink: "Copier le lien",
    linkCopied: "Lien copié !",
    openSurvey: "Ouvrir",
    whatsappShare: "Partager sur WhatsApp",
    emailShare: "Envoyer par e-mail",
    downloadPng: "Télécharger PNG",
    printQr: "Imprimer le QR Code",

    surveyTitle: "Titre de l'enquête",
    surveyDescription: "Description / Objectif",
    surveyLanguage: "Langue principale",
    questionsCount: "Questions",
    addQuestion: "Ajouter une question",
    questionType: "Type de question",
    questionText: "Libellé de la question",
    required: "Obligatoire",
    optional: "Facultative",
    options: "Options de réponse",
    addOption: "Ajouter une option",
    saveSurvey: "Enregistrer l'enquête",
    publishSurvey: "Publier l'enquête",
    complaintQuestionSection: "Question spéciale de réclamation",
    complaintQuestionToggle: "Activer la question de réclamation à la fin",
    complaintQuestionExplanation: "Cette question apparaîtra toujours en dernière position pour capter les mécontentements et créer automatiquement une réclamation dédiée.",
    complaintQuestionStandardText: "Avez-vous une réclamation concernant un dossier lié à nos services ? Si oui, partagez-la avec nous en nous expliquant votre problème.",
    aiSuggestQuestions: "Générer un questionnaire par IA",
    aiGenerateTitle: "Création assistée par Intelligence Artificielle",
    aiActivityPrompt: "Décrivez l'activité, le service ou le département à évaluer (ex: Clinique privée, Agence bancaire, Guichet administratif, Commerce de détail...)",
    aiGenerateBtn: "Générer les questions avec Gemini",
    aiGenerating: "Génération en cours...",
    aiTranslateTitle: "Traduire avec l'IA",
    aiTranslateBtn: "Traduire l'enquête",

    singleChoice: "Choix unique (Radio)",
    multipleChoice: "Choix multiple (Cases)",
    dropdown: "Liste déroulante",
    starsRating: "Évaluation étoiles (1-5)",
    npsRating: "Note NPS (0-10)",
    freeText: "Texte libre",
    voiceResponse: "Réponse vocale",

    welcomeToSurvey: "Votre avis compte pour nous",
    step: "Étape",
    of: "sur",
    previous: "Précédent",
    next: "Suivant",
    submitSurvey: "Envoyer mes réponses",
    submitting: "Envoi en cours...",
    thankYouTitle: "Merci pour votre contribution !",
    thankYouMessage: "Vos réponses ont bien été enregistrées. Elles nous aident à améliorer continuellement nos services.",
    referenceNumber: "N° de référence",
    recordVoice: "Enregistrer un message vocal",
    stopRecording: "Arrêter l'enregistrement",
    playbackAudio: "Écouter mon enregistrement",
    transcribing: "Transcription vocale en cours...",
    transcriptionResult: "Texte transcrit (modifiable avant envoi) :",
    editTranscription: "Vous pouvez corriger le texte transcrit si nécessaire.",
    micPermissionDenied: "L'accès au microphone est requis pour l'enregistrement vocal.",
    recordComplaintVoice: "Parler pour décrire le problème",
    dossierNumber: "Numéro du dossier (facultatif)",
    depositDate: "Date de dépôt (facultatif)",
    phoneNumber: "Numéro de téléphone (facultatif)",
    emailAddress: "Adresse e-mail (facultatif)",
    privacyDisclaimer: "Vos coordonnées sont strictement réservées au traitement et au suivi de votre réclamation.",
    hasComplaintPrompt: "Avez-vous une réclamation concernant un dossier lié à nos services ?",
    describeComplaint: "Expliquez en détail le problème rencontré...",
    viewStepper: "Étape par étape",
    viewFullForm: "Formulaire complet",

    complaintsList: "Registre des réclamations",
    searchComplaints: "Rechercher par dossier, nom, téléphone ou mot-clé...",
    complaintDetails: "Détails de la réclamation",
    originalText: "Description originale du client",
    aiSummary: "Synthèse et Analyse IA",
    category: "Catégorie",
    priority: "Priorité",
    urgent: "Urgente",
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
    assignee: "Responsable assigné",
    internalNotes: "Notes internes & Historique",
    addNote: "Ajouter une note de suivi",
    markResolved: "Marquer comme résolue",
    markInProgress: "Passer en cours de traitement",
    aiSuggestedActions: "Actions recommandées par l'IA",
    confidenceScore: "Indice de confiance IA",
    editAiCategory: "Modifier la catégorie / le résumé",
    saveChanges: "Enregistrer les modifications",

    reportsTitle: "Rapports & Recommandations Intelligentes",
    reportsSubtitle: "Synthèse décisionnelle générée à partir des données réelles collectées",
    generateAiReport: "Générer une analyse IA approfondie",
    strengths: "Points forts identifiés (Top 3)",
    priorityProblems: "Problèmes prioritaires à traiter (Top 3)",
    operationalRecommendations: "Recommandations opérationnelles concrètes",
    exportCsv: "Exporter en CSV / Excel",
    exportExcel: "Exporter les données",
    printReport: "Imprimer le rapport PDF",
    confidence: "Confiance",
    suggestedDeadline: "Échéance indicative",
    suggestedAssignee: "Responsable suggéré",
    impact: "Impact attendu"
  },

  ar: {
    appName: "رضا الحرفاء CERT",
    appSubtitle: "مركز الدراسات والبحوث للاتصالات - قياس رضا الحرفاء والشكاوى الذكية",
    dashboard: "لوحة القيادة",
    surveys: "الاستبيانات",
    complaints: "الشكاوى",
    reports: "التقارير والذكاء الاصطناعي",
    settings: "الإعدادات",
    notifications: "الإشعارات",
    loginTitle: "تسجيل الدخول إلى لوحة القيادة",
    loginSubtitle: "دخول آمن لفريق الإدارة وإطارات مركز الدراسات والبحوث للاتصالات CERT",
    usernameLabel: "اسم المستخدم أو البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    rememberMe: "تذكرني على هذا الجهاز",
    signInBtn: "الدخول إلى لوحة القيادة",
    signOutBtn: "تسجيل الخروج",
    invalidCredentialsError: "اسم المستخدم أو كلمة المرور غير صحيحة. الرجاء التثبت من معطيات الدخول.",
    demoAccountsTitle: "حسابات تجريبية للدخول السريع",
    newSurvey: "استبيان جديد",
    aiGenerator: "المولد الذكي",
    search: "بحث...",
    filterByPeriod: "الفترة الزمنية",
    allSurveys: "كافة الاستبيانات",
    allChannels: "جميع القنوات",
    totalSurveys: "مجموع الاستبيانات",
    publishedSurveys: "الاستبيانات المنشورة",
    totalResponses: "الإجابات المستلمة",
    participationRate: "نسبة المشاركة",
    csatRate: "مؤشر الرضا CSAT",
    csatFormulaHint: "التقييمات الإيجابية (4 و 5 نجوم / التقييمات الراضية)",
    npsScore: "مؤشر التوصية NPS",
    npsFormulaHint: "نسبة المروجين (9-10) ناقص نسبة المنتقدين (0-6)",
    promoters: "المروجون (9-10)",
    passives: "المحايدون (7-8)",
    detractors: "المنتقدون (0-6)",
    complaintsOverview: "شكاوى الحرفاء",
    newComplaints: "جديدة",
    inProgressComplaints: "قيد المعالجة",
    resolvedComplaints: "تمت معالجتها / مغلقة",
    satisfactionEvolution: "تطور مستوى الرضا",
    sentimentDistribution: "توزيع المشاعر والانطباعات",
    positive: "إيجابي",
    neutral: "محايد",
    negative: "سلبي",
    recurringThemes: "المحاور الأكثر تكراراً",
    channelPerformance: "أداء قنوات النشر",
    status: "الحالة",
    published: "منشور",
    draft: "مسودة",
    archived: "مؤرشف",
    actions: "الإجراءات",
    edit: "تعديل",
    duplicate: "نسخ",
    preview: "معاينة",
    share: "مشاركة ونشر",
    qrCode: "رمز الاستجابة السريعة QR",
    delete: "حذف",
    copyLink: "نسخ الرابط",
    linkCopied: "تم نسخ الرابط بنجاح!",
    openSurvey: "فتح",
    whatsappShare: "مشاركة عبر واتساب",
    emailShare: "إرسال عبر البريد الإلكتروني",
    downloadPng: "تحميل صورة PNG",
    printQr: "طباعة رمز QR",

    surveyTitle: "عنوان الاستبيان",
    surveyDescription: "الوصف والهدف",
    surveyLanguage: "اللغة الأساسية",
    questionsCount: "عدد الأسئلة",
    addQuestion: "إضافة سؤال",
    questionType: "نوع السؤال",
    questionText: "نص السؤال",
    required: "إجباري",
    optional: "اختياري",
    options: "خيارات الإجابة",
    addOption: "إضافة خيار",
    saveSurvey: "حفظ الاستبيان",
    publishSurvey: "نشر الاستبيان",
    complaintQuestionSection: "سؤال الشكوى المخصص",
    complaintQuestionToggle: "تفعيل سؤال الشكوى في نهاية الاستبيان",
    complaintQuestionExplanation: "سيظهر هذا السؤال دائماً في المرتبة الأخيرة لرصد المشكلات وإنشاء بطاقة شكوى تلقائية.",
    complaintQuestionStandardText: "هل لديك شكوى بخصوص ملف يتعلق بخدماتنا؟ إذا كان الأمر كذلك، شاركها معنا مع توضيح مشكلتك.",
    aiSuggestQuestions: "توليد الاستبيان بالذكاء الاصطناعي",
    aiGenerateTitle: "إنشاء الاستبيان بمساعدة الذكاء الاصطناعي",
    aiActivityPrompt: "صف طبيعة النشاط أو الخدمة أو المصلحة المعنية (مثال: مستشفى، وكالة بنكية، مصلحة إدارية، متجر تجزئة...)",
    aiGenerateBtn: "توليد الأسئلة عبر Gemini",
    aiGenerating: "جاري التوليد الذكي...",
    aiTranslateTitle: "الترجمة الذكية",
    aiTranslateBtn: "ترجمة الاستبيان",

    singleChoice: "اختيار وحيد (Radio)",
    multipleChoice: "خيارات متعددة (مربعات اختيار)",
    dropdown: "قائمة منسدلة",
    starsRating: "تقييم بالنجوم (1-5)",
    npsRating: "مقياس NPS من 0 إلى 10",
    freeText: "نص حر",
    voiceResponse: "إجابة صوتية",

    welcomeToSurvey: "رأيكم يهمنا لتطوير خدماتنا",
    step: "المرحلة",
    of: "من",
    previous: "السابق",
    next: "التالي",
    submitSurvey: "إرسال الإجابات",
    submitting: "جاري الإرسال...",
    thankYouTitle: "شكراً جزيلاً لمشاركتكم!",
    thankYouMessage: "تم تسجيل إجاباتكم بنجاح، وستساهم مباشرة في تحسين جودة خدماتنا.",
    referenceNumber: "الرقم المرجعي",
    recordVoice: "تسجيل رسالة صوتية",
    stopRecording: "إيقاف التسجيل",
    playbackAudio: "الاستماع للتسجيل",
    transcribing: "جاري تحويل الصوت إلى نص...",
    transcriptionResult: "النص المحول (يمكنك تعديله قبل الإرسال):",
    editTranscription: "يمكنك مراجعة وتصحيح النص عند الحاجة.",
    micPermissionDenied: "يرجى منح الإذن للوصول إلى الميكروفون للتسجيل الصوتي.",
    recordComplaintVoice: "التحدث لشرح المشكلة",
    dossierNumber: "رقم الملف (اختياري)",
    depositDate: "تاريخ الإيداع (اختياري)",
    phoneNumber: "رقم الهاتف (اختياري)",
    emailAddress: "البريد الإلكتروني (اختياري)",
    privacyDisclaimer: "تستخدم هذه البيانات الشخصية حصرياً لمعالجة ومتابعة شكواكم.",
    hasComplaintPrompt: "هل لديك شكوى بخصوص ملف يتعلق بخدماتنا؟",
    describeComplaint: "اشرح المشكلة التي واجهتها بالتفصيل...",
    viewStepper: "سؤال بسؤال",
    viewFullForm: "الاستمارة كاملة",

    complaintsList: "سجل الشكاوى والاعتراضات",
    searchComplaints: "البحث برقم الملف، الهاتف أو الكلمات المفتاحية...",
    complaintDetails: "تفاصيل الشكوى",
    originalText: "النص الأصلي من الحريف",
    aiSummary: "ملخص وتحليل الذكاء الاصطناعي",
    category: "التصنيف",
    priority: "الأولوية",
    urgent: "عاجلة جداً",
    high: "مرتفعة",
    medium: "متوسطة",
    low: "منخفضة",
    assignee: "المكلف بالمعالجة",
    internalNotes: "ملاحظات داخلية وسجل المتابعة",
    addNote: "إضافة ملاحظة متابعة",
    markResolved: "تحديد كـ معالجة",
    markInProgress: "تغيير إلى قيد المعالجة",
    aiSuggestedActions: "الإجراءات المقترحة من الذكاء الاصطناعي",
    confidenceScore: "مؤشر الثقة والموثوقية",
    editAiCategory: "تعديل التصنيف أو الملخص",
    saveChanges: "حفظ التعديلات",

    reportsTitle: "التقارير والتوصيات الذكية",
    reportsSubtitle: "تقرير تحليلي استراتيجي مبني على البيانات الفعلية المجمعة",
    generateAiReport: "توليد تحليل ذكي معمق",
    strengths: "أهم نقاط القوة (أفضل 3)",
    priorityProblems: "المشاكل ذات الأولوية القصوى (أهم 3)",
    operationalRecommendations: "توصيات تشغيلية ملموسة للتحسين",
    exportCsv: "تصدير بصيغة CSV / Excel",
    exportExcel: "تصدير البيانات",
    printReport: "طباعة التقرير بصيغة PDF",
    confidence: "مستوى الثقة",
    suggestedDeadline: "الأجل المقترح",
    suggestedAssignee: "المسؤول المقترح",
    impact: "الأثر المتوقع"
  },

  tn: {
    appName: "Satisfaction Client CERT",
    appSubtitle: "مركز الدراسات والبحوث للاتصالات CERT - قياس رضا الحرفاء ومتابعة التشكيات الفورية",
    dashboard: "لوحة التحكم",
    surveys: "الاستبيانات",
    complaints: "التشكيات",
    reports: "التقارير والذكاء الاصطناعي",
    settings: "الإعدادات",
    notifications: "الإشعارات",
    loginTitle: "دخول للوحة التحكم",
    loginSubtitle: "دخول مؤمن لإدارة وفريق مركز الدراسات والبحوث للاتصالات CERT",
    usernameLabel: "المعرّف أو الإيميل",
    passwordLabel: "كلمة السر",
    rememberMe: "تذكرني في الجهاز هذا",
    signInBtn: "أدخل للوحة التحكم",
    signOutBtn: "خروج",
    invalidCredentialsError: "المعرّف أو كلمة السر غالطة. عاود ثبّت في معطياتك.",
    demoAccountsTitle: "حسابات تجربة سريعة للتيست",
    newSurvey: "استبيان جديد",
    aiGenerator: "المولد الذكي بالذكاء الاصطناعي",
    search: "لوّج...",
    filterByPeriod: "الفترة",
    allSurveys: "الاستبيانات الكل",
    allChannels: "القنوات الكل",
    totalSurveys: "مجموع الاستبيانات",
    publishedSurveys: "الاستبيانات المنشورة",
    totalResponses: "الإجابات اللي وصلنا",
    participationRate: "نسبة المشاركة",
    csatRate: "نسبة الرضا العامة CSAT",
    csatFormulaHint: "التقييمات الإيجابية (4 و 5 نجوم / اللي راضيين)",
    npsScore: "سكور التوصية NPS",
    npsFormulaHint: "% المروجين (9-10) ناقص % اللي مش راضيين (0-6)",
    promoters: "راضيين برشا (9-10)",
    passives: "عادي / محايدين (7-8)",
    detractors: "مش راضيين (0-6)",
    complaintsOverview: "تشكيات الحرفاء",
    newComplaints: "جديدة",
    inProgressComplaints: "قيد المتابعة",
    resolvedComplaints: "تحلّت / مريقلة",
    satisfactionEvolution: "تطور الرضا عبر الوقت",
    sentimentDistribution: "توزيع آراء وانطباعات الحرفاء",
    positive: "إيجابي / باهي",
    neutral: "متوسط / عادي",
    negative: "سلبي / فما مشكل",
    recurringThemes: "المواضيع اللي تتعاود برشا",
    channelPerformance: "أداء القنوات (واتساب، كود QR، واب...)",
    status: "الوضعية",
    published: "منشور",
    draft: "مسوّدة",
    archived: "مؤرشف",
    actions: "العمليات",
    edit: "بدّل / عدّل",
    duplicate: "دوبليكي",
    preview: "شوف المنظر",
    share: "بارتاجي",
    qrCode: "كود QR",
    delete: "فسّخ",
    copyLink: "انسخ الليان",
    linkCopied: "تم نسخ الرابط بنجاح!",
    openSurvey: "حل الاستبيان",
    whatsappShare: "بارتاجي على واتساب",
    emailShare: "ابعث بالإيميل",
    downloadPng: "هبّط تصويرة PNG",
    printQr: "اطبع كود QR",

    surveyTitle: "عنوان الاستبيان",
    surveyDescription: "توضيح / الهدف من الاستبيان",
    surveyLanguage: "اللغة الرئيسية",
    questionsCount: "عدد الأسئلة",
    addQuestion: "زيد سؤال جديد",
    questionType: "نوع السؤال",
    questionText: "نص السؤال",
    required: "إجباري",
    optional: "اختياري",
    options: "خيارات الإجابة",
    addOption: "زيد خيار",
    saveSurvey: "سجّل الاستبيان",
    publishSurvey: "انشر الاستبيان",
    complaintQuestionSection: "سؤال التشكيات الخاص",
    complaintQuestionToggle: "فعّل سؤال التشكيات في اللخر",
    complaintQuestionExplanation: "السؤال هذا يقعد ديما في آخر الاستبيان بش يلتقط المشاكل ويعمل دوسي تشكي وحدو.",
    complaintQuestionStandardText: "عندك تشكّي ولا مشكلة تخص دوسي في خدماتنا؟ كان إيه، قلّنا وفسّر لنا المشكل متاعك.",
    aiSuggestQuestions: "اقترح أسئلة بالذكاء الاصطناعي",
    aiGenerateTitle: "صنع استبيان بالذكاء الاصطناعي",
    aiActivityPrompt: "فسّر النشاط ولا المصلحة متاعك (مثال: كلينيك، بانكة، إدارة عمومية، حانوت تجاري...)",
    aiGenerateBtn: "اصنع الأسئلة بالـ Gemini",
    aiGenerating: "قاعد يصنع في الأسئلة...",
    aiTranslateTitle: "ترجم بالذكاء الاصطناعي",
    aiTranslateBtn: "ترجم الاستبيان",

    singleChoice: "اختيار واحد برك",
    multipleChoice: "تنجم تختار برشا",
    dropdown: "قائمة تختار منها",
    starsRating: "تقييم بالنجوم (1-5)",
    npsRating: "نوطة NPS من 0 حتى لـ 10",
    freeText: "اكتب رايك بحرية",
    voiceResponse: "إجابة بصوتك",

    welcomeToSurvey: "رايك يهمنا ويعاونّا بش نتحسنو",
    step: "مرحلة",
    of: "من",
    previous: "ارجع بالتوالي",
    next: "تعدى للي بعدو",
    submitSurvey: "ابعث الإجابات متاعك",
    submitting: "قاعد يبعث...",
    thankYouTitle: "يعطيك الصحة على مشاركتك!",
    thankYouMessage: "إجاباتك تقيّدت بنجاح، وبش تعاونا نحسنو الخدمات ديما للأحسن.",
    referenceNumber: "نمرة المرجع",
    recordVoice: "سجّل ميساج بصوتك",
    stopRecording: "حبّس التسجيل",
    playbackAudio: "اسمع التسجيل متاعك",
    transcribing: "قاعد يحول في الصوت لكلام مكتوب...",
    transcriptionResult: "الكلام المكتوب (تنجم تصلحو قبل ما تبعث):",
    editTranscription: "تنجم تصلح أي غلطة في الكلام المكتوب كان فما حاجة ناقصة.",
    micPermissionDenied: "لازم تعطي الإذن للميكرو بش تنجم تسجل صوتك.",
    recordComplaintVoice: "احكي بصوتك وفسّر المشكل",
    dossierNumber: "نمرة الدوسي (كان تحب)",
    depositDate: "تاريخ ما حطيت الدوسي (كان تحب)",
    phoneNumber: "نمرة التليفون (كان تحب)",
    emailAddress: "الإيميل (كان تحب)",
    privacyDisclaimer: "المعلومات هاذي تقعد سرية وتستعمل كهو بش نتابعو المشكل ونصلحوه.",
    hasComplaintPrompt: "عندك تشكّي ولا مشكلة تخص دوسي في خدماتنا؟",
    describeComplaint: "فسّرلنا بالباهي شنية صار معاك والمشكل وين...",
    viewStepper: "سؤال بسؤال",
    viewFullForm: "الاستمارة الكل فرد ضربة",

    complaintsList: "قائمة التشكيات والمشاكل",
    searchComplaints: "لوّج بنمرة الدوسي، الاسم، التليفون ولا كلمة...",
    complaintDetails: "تفاصيل التشكي",
    originalText: "كلام الحريف كيف ما قالو بالضبط",
    aiSummary: "تلخيص وتحليل الذكاء الاصطناعي",
    category: "الصنف",
    priority: "الأولوية",
    urgent: "مستعجلة برشا",
    high: "عالية",
    medium: "متوسطة",
    low: "ضعيفة",
    assignee: "شكون مكلّف بيها",
    internalNotes: "ملاحظات وتاريخ المتابعة",
    addNote: "زيد ملاحظة جديدة",
    markResolved: "حطّها تحلّت ومريقلة",
    markInProgress: "حطّها قيد المعالجة",
    aiSuggestedActions: "الحلول المقترحة من الذكاء الاصطناعي",
    confidenceScore: "نسبة التأكد متاع الذكاء الاصطناعي",
    editAiCategory: "بدّل الصنف ولا التلخيص",
    saveChanges: "سجّل التبديل",

    reportsTitle: "التقارير والتوصيات الذكية",
    reportsSubtitle: "تقرير استراتيجي مبني على الأرقام الحقيقية اللي تسجلت",
    generateAiReport: "اطلب تحليل ذكي معمّق",
    strengths: "الحاجات الباهية اللي تميزنا (أحسن 3)",
    priorityProblems: "أكبر المشاكل اللي لازم نصلحوها (أهم 3)",
    operationalRecommendations: "توصيات عملية وملموسة للإصلاح",
    exportCsv: "خرّج في فيشي CSV / Excel",
    exportExcel: "خرّج المعطيات",
    printReport: "اطبع التقرير PDF",
    confidence: "مستوى الثقة",
    suggestedDeadline: "الأجل المقترح",
    suggestedAssignee: "شكون مكلف",
    impact: "النتيجة المنتظرة"
  }
};
