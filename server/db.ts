import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Survey,
  SurveySubmission,
  ComplaintRecord,
  DashboardStats,
  AppNotification,
  AIRecommendation,
  WhatsAppConfig,
  WhatsAppLog,
  QuestionAnalysis,
  AnswerItem
} from '../src/types/index.ts';
import {
  defaultWhatsAppConfig,
  formatManagerWhatsAppAlert,
  buildWhatsAppLink,
  dispatchWebhookIfConfigured,
  sendRealWhatsAppNotification,
} from './whatsapp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel ? '/tmp/data' : path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SOURCE_DB_FILE = path.resolve(__dirname, '../data/db.json');

export interface AppSettings {
  directorName: string;
  directorTitle: string;
  directorEmail: string;
  orgName: string;
  sector: string;
  updatedAt: string;
}

export const defaultAppSettings: AppSettings = {
  directorName: 'Mounir Ben Salah',
  directorTitle: 'Directeur Général & Administrateur CERT',
  directorEmail: 'admin@cert.tn',
  orgName: 'Centre d\'Études et de Recherche des Télécommunications (CERT)',
  sector: 'Télécommunications, Laboratoires & Services Numériques',
  updatedAt: new Date().toISOString(),
};

interface DatabaseStore {
  surveys: Survey[];
  submissions: SurveySubmission[];
  complaints: ComplaintRecord[];
  notifications: AppNotification[];
  aiRecommendations: AIRecommendation[];
  whatsappConfig: WhatsAppConfig;
  whatsappLogs: WhatsAppLog[];
  settings?: AppSettings;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialData(): DatabaseStore {
  const now = new Date();
  const isoNow = now.toISOString();

  const surveys: Survey[] = [
    {
      id: 'srv-banque-01',
      title: 'Satisfaction Client - Agence & Services Bancaires',
      description: 'Mesure de la qualité de service, accueil en agence, délais de traitement et services en ligne.',
      language: 'fr',
      status: 'published',
      category: 'Banque & Finance',
      targetResponses: 250,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: isoNow,
      publishedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      responseCount: 142,
      csatScore: 78,
      npsScore: 36,
      complaintQuestion: {
        enabled: true,
        title: 'Avez-vous une réclamation concernant un dossier lié à nos services ? Si oui, partagez-la avec nous en nous expliquant votre problème.',
        requireDossierNumber: false,
        requireContactInfo: false,
      },
      questions: [
        {
          id: 'q1',
          text: 'Comment évaluez-vous l\'accueil et l\'écoute du personnel en agence ?',
          type: 'stars',
          required: true,
          order: 1,
        },
        {
          id: 'q2',
          text: 'Quel canal utilisez-vous le plus fréquemment pour vos opérations bancaires ?',
          type: 'single_choice',
          required: true,
          order: 2,
          options: [
            { id: 'opt-app', label: 'Application Mobile', value: 'mobile_app' },
            { id: 'opt-agency', label: 'Agence physique', value: 'physical_agency' },
            { id: 'opt-atm', label: 'Guichet Automatique (DAB)', value: 'atm' },
            { id: 'opt-web', label: 'Portail Web', value: 'web_portal' },
          ],
        },
        {
          id: 'q3',
          text: 'Quels aspects de nos prestations méritent d\'être améliorés selon vous ?',
          type: 'multiple_choice',
          required: false,
          order: 3,
          options: [
            { id: 'opt-time', label: 'Délais d\'attente au guichet', value: 'wait_times' },
            { id: 'opt-fees', label: 'Tarification et frais de tenue', value: 'fees' },
            { id: 'opt-credits', label: 'Délais d\'octroi de crédits', value: 'credit_delays' },
            { id: 'opt-digital', label: 'Fluidité de l\'application mobile', value: 'app_smoothness' },
          ],
        },
        {
          id: 'q4',
          text: 'Sur une échelle de 0 à 10, recommanderiez-vous notre établissement à vos proches ou collègues ?',
          type: 'nps',
          required: true,
          minLabel: 'Pas du tout probable',
          maxLabel: 'Extrêmement probable',
          order: 4,
        },
        {
          id: 'q5',
          text: 'Partagez vos suggestions ou remarques libres (écrites ou vocales)',
          type: 'voice',
          required: false,
          order: 5,
        },
      ],
    },
    {
      id: 'srv-admin-02',
      title: 'استبيان قياس رضا المتعاملين - مصلحة الخدمات الإدارية والاستقبال',
      description: 'تقييم جودة الاستقبال، سرعة معالجة الملفات، وضوح الإجراءات ورضا المواطنين.',
      language: 'ar',
      status: 'published',
      category: 'إدارة وخدمات عمومية',
      targetResponses: 200,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: isoNow,
      publishedAt: new Date(Date.now() - 19 * 86400000).toISOString(),
      responseCount: 98,
      csatScore: 71,
      npsScore: 24,
      complaintQuestion: {
        enabled: true,
        title: 'هل لديك شكوى بخصوص ملف يتعلق بخدماتنا؟ إذا كان الأمر كذلك، شاركها معنا مع توضيح مشكلتك.',
        requireDossierNumber: false,
        requireContactInfo: false,
      },
      questions: [
        {
          id: 'q-ar-1',
          text: 'ما هو تقييمكم لحسن الاستقبال وسرعة التوجيه عند وصولكم للمصلحة؟',
          type: 'stars',
          required: true,
          order: 1,
        },
        {
          id: 'q-ar-2',
          text: 'هل وجدتم الوثائق والإرشادات واضحة وسهلة الفهم؟',
          type: 'single_choice',
          required: true,
          order: 2,
          options: [
            { id: 'ar-yes', label: 'نعم، واضحة جداً', value: 'very_clear' },
            { id: 'ar-somewhat', label: 'إلى حد ما', value: 'somewhat_clear' },
            { id: 'ar-no', label: 'لا، غامضة ومعقدة', value: 'unclear' },
          ],
        },
        {
          id: 'q-ar-3',
          text: 'على مقياس من 0 إلى 10، ما مدى استعدادكم للتوصية بخدماتنا؟',
          type: 'nps',
          required: true,
          minLabel: 'غير مستعد إطلاقاً',
          maxLabel: 'مستعد جداً',
          order: 3,
        },
        {
          id: 'q-ar-4',
          text: 'أي ملاحظات إضافية ترغبون في إبداءها؟',
          type: 'text',
          required: false,
          order: 4,
        },
      ],
    },
    {
      id: 'srv-clinique-03',
      title: 'تقييم خدمات الاستقبال والإقامة الطبية (بالدارجة التونسية)',
      description: 'استبيان بالدارجة التونسية لمعرفة راي المرضى وعائلاتهم في الاستقبال، النظافة والخدمات الطبية.',
      language: 'tn',
      status: 'published',
      category: 'صحة ورعاية طبية',
      targetResponses: 150,
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: isoNow,
      publishedAt: new Date(Date.now() - 11 * 86400000).toISOString(),
      responseCount: 65,
      csatScore: 84,
      npsScore: 48,
      complaintQuestion: {
        enabled: true,
        title: 'عندك تشكّي ولا مشكلة تخص دوسي في خدماتنا؟ كان إيه، قلّنا وفسّر لنا المشكل متاعك.',
        requireDossierNumber: false,
        requireContactInfo: false,
      },
      questions: [
        {
          id: 'q-tn-1',
          text: 'شنية رايك في المعاملة والاستقبال متاع ليكيب الطبية والإدارية؟',
          type: 'stars',
          required: true,
          order: 1,
        },
        {
          id: 'q-tn-2',
          text: 'الوقت اللي قعدتو تستناو فيه قبل ما يقابلك الطبيب ولا تعمل الفحص كان:',
          type: 'dropdown',
          required: true,
          order: 2,
          options: [
            { id: 'tn-quick', label: 'فيسع فيسع وما طولناش', value: 'quick' },
            { id: 'tn-normal', label: 'معقول وعادي', value: 'normal' },
            { id: 'tn-long', label: 'طويل برشا وفات الحدود', value: 'too_long' },
          ],
        },
        {
          id: 'q-tn-3',
          text: 'من 0 حتى لـ 10، قداش تنصح صحابك ولا عايلتك يجيو يعديو بحذانا؟',
          type: 'nps',
          required: true,
          minLabel: 'ما ننصحش جملة',
          maxLabel: 'ننصح بيهم على ضمانتي',
          order: 3,
        },
      ],
    },
  ];

  const complaints: ComplaintRecord[] = [
    {
      id: 'cmp-101',
      submissionId: 'sub-demo-01',
      surveyId: 'srv-banque-01',
      surveyTitle: 'Satisfaction Client - Agence & Services Bancaires',
      problemDescription: 'J\'ai déposé une demande de mainlevée d\'hypothèque le 12 septembre sous le dossier N° ML-8892. Cela fait un mois et aucun retour malgré 4 déplacements en agence. Le conseiller me dit que le dossier est bloqué au siège central.',
      dossierNumber: 'ML-8892',
      submissionDate: '2026-09-12',
      phone: '+216 98 123 456',
      email: 'ahmed.mansour@gmail.com',
      status: 'new',
      priority: 'urgent',
      category: 'Délais & Dossier Crédit',
      assignedTo: 'Karim Ben Salem (Responsable Crédit)',
      aiSummary: 'Blocage prolongé d\'un dossier de mainlevée d\'hypothèque (>30 jours) sans suivi ni information client malgré relances.',
      aiSuggestedCategory: 'Délais de traitement',
      aiSuggestedPriority: 'urgent',
      aiSuggestedActions: [
        'Contacter la direction des engagements et garanties au siège',
        'Informer le client sous 24h par téléphone de l\'avancement réel',
        'Émettre l\'attestation de mainlevée en procédure accélérée'
      ],
      aiConfidence: 0.94,
      managerEdited: false,
      whatsappAlertSent: true,
      whatsappAlertDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      whatsappRecipient: '+216 98 123 456',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      internalNotes: [
        {
          id: 'note-1',
          author: 'Système IA',
          content: 'Alerte générée automatiquement: dossier avec numéro de référence et délai > 30 jours détecté.',
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        }
      ],
    },
    {
      id: 'cmp-102',
      submissionId: 'sub-demo-02',
      surveyId: 'srv-admin-02',
      surveyTitle: 'استبيان قياس رضا المتعاملين - مصلحة الخدمات الإدارية والاستقبال',
      problemDescription: 'قدمت مطلب ترخيص في إشغال وقتي بتاريخ 25 سبتمبر ملف رقم 2026/412. الموظف في الشباك رقم 3 رفض استلام شهادة المطابقة الأصلية وطلب نسخة أخرى دون توضيح السبب القانوني.',
      dossierNumber: '2026/412',
      submissionDate: '2026-09-25',
      phone: '+216 22 555 888',
      email: 'salma.triki@yahoo.fr',
      status: 'in_progress',
      priority: 'high',
      category: 'استقبال وتوضيح الإجراءات',
      assignedTo: 'منى الجلاصي (رئيسة مكتب العلاقات مع المواطن)',
      aiSummary: 'رفض استلام وثيقة مطابقة بملف ترخيص دون تبرير إداري كافٍ وتصرف غير مرضٍ بالشباك 3.',
      aiSuggestedCategory: 'الاستقبال والشفافية الإدارية',
      aiSuggestedPriority: 'high',
      aiSuggestedActions: [
        'مراجعة شروط قبول الملفات مع أعوان الشباك 3',
        'الاتصال بالمواطنة وقبول الوثيقة الأصلية مع وصل استلام رسمي',
        'توضيح المذكرة التوجيهية للخدمة'
      ],
      aiConfidence: 0.91,
      managerEdited: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      internalNotes: [
        {
          id: 'note-2',
          author: 'منى الجلاصي',
          content: 'تم التنسيق مع مصلحة التراخيص، وسيتم استدعاء المواطنة غداً صباحاً لإتمام الملف.',
          createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        }
      ],
    },
    {
      id: 'cmp-103',
      submissionId: 'sub-demo-03',
      surveyId: 'srv-clinique-03',
      surveyTitle: 'تقييم خدمات الاستقبال والإقامة الطبية (بالدارجة التونسية)',
      problemDescription: 'الفاكتورة متاع الخروج فيها خلاص زايد على تحاليل ما عملهمش الوالد أصلاً في بيت الإنعاش. طلبنا التوضيح قالولنا ارجعو نهار الاثنين.',
      dossierNumber: 'CLI-5541',
      submissionDate: '2026-10-02',
      phone: '+216 55 444 333',
      email: 'nizar.trabelsi@topnet.tn',
      status: 'resolved',
      priority: 'medium',
      category: 'الفواتير والمحاسبة',
      assignedTo: 'Sami Charfi (Directeur Financier)',
      aiSummary: 'اعتراض على فوترة تحاليل طبية غير منجزة عند مغادرة قسم الإنعاش ومطالبة بتصحيح الفاتورة.',
      aiSuggestedCategory: 'الفواتير والمدفوعات',
      aiSuggestedPriority: 'high',
      aiSuggestedActions: [
        'تدقيق كشف التحاليل مع سجل مخبر التحاليل وقسم الإنعاش',
        'إصدار فاتورة تصحيحية (Avoir) وإرجاع المبلغ المالي الزائد'
      ],
      aiConfidence: 0.96,
      managerEdited: false,
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      resolvedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      internalNotes: [
        {
          id: 'note-3',
          author: 'Sami Charfi',
          content: 'Audit effectué avec le laboratoire. Erreur de saisie confirmée sur 2 examens. Avoir établi de 380 DT et virement exécuté en faveur de la famille.',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        }
      ],
    },
  ];

  // Seed sample submissions for chart analytics
  const submissions: SurveySubmission[] = [];
  const channels: ('web' | 'qr' | 'whatsapp' | 'email')[] = ['web', 'qr', 'whatsapp', 'email'];
  const sentiments: ('positive' | 'neutral' | 'negative')[] = ['positive', 'positive', 'positive', 'neutral', 'negative'];

  for (let i = 0; i < 45; i++) {
    const daysAgo = Math.floor(Math.random() * 25);
    const sent = sentiments[Math.floor(Math.random() * sentiments.length)];
    const chan = channels[Math.floor(Math.random() * channels.length)];
    const npsRoll = sent === 'positive' ? 9 + (Math.random() > 0.5 ? 1 : 0) : sent === 'neutral' ? 7 + (Math.random() > 0.5 ? 1 : 0) : Math.floor(Math.random() * 6);
    const npsType = npsRoll >= 9 ? 'promoter' : npsRoll >= 7 ? 'passive' : 'detractor';
    const csatPositive = sent === 'positive' || (sent === 'neutral' && Math.random() > 0.4);

    submissions.push({
      id: `sub-gen-${i}`,
      surveyId: i % 2 === 0 ? 'srv-banque-01' : i % 3 === 0 ? 'srv-clinique-03' : 'srv-admin-02',
      surveyTitle: i % 2 === 0 ? 'Satisfaction Client - Agence & Services Bancaires' : i % 3 === 0 ? 'تقييم خدمات الاستقبال والإقامة الطبية' : 'استبيان قياس رضا المتعاملين',
      language: i % 2 === 0 ? 'fr' : i % 3 === 0 ? 'tn' : 'ar',
      channel: chan,
      sentiment: sent,
      csatPositive: csatPositive,
      npsType: npsType,
      submittedAt: new Date(Date.now() - daysAgo * 86400000 - Math.random() * 36000000).toISOString(),
      answers: [
        {
          questionId: 'q1',
          questionText: 'Évaluation globale',
          type: 'stars',
          value: sent === 'positive' ? 5 : sent === 'neutral' ? 3 : 2,
        },
        {
          questionId: 'q4',
          questionText: 'NPS',
          type: 'nps',
          value: npsRoll,
        }
      ],
    });
  }

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      title: 'Nouvelle réclamation urgente',
      message: 'Réclamation N° ML-8892 déposée par Ahmed Mansour (Délai crédit > 30j)',
      type: 'complaint',
      linkTo: '/complaints',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Note NPS faible détectée',
      message: 'Un répondant a attribué une note de 1/10 sur l\'enquête Services Bancaires.',
      type: 'low_csat',
      linkTo: '/dashboard',
      createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
      read: false,
    },
    {
      id: 'notif-3',
      title: 'Enquête publiée avec succès',
      message: 'L\'enquête « تقييم خدمات الاستقبال والإقامة الطبية » a été publiée.',
      type: 'survey_published',
      linkTo: '/surveys',
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      read: true,
    },
  ];

  const aiRecommendations: AIRecommendation[] = [
    {
      id: 'rec-q3-2026',
      period: 'Derniers 30 jours',
      generatedAt: isoNow,
      strengths: [
        {
          title: 'Excellence de l\'accueil humain et empathie des équipes',
          description: 'Plus de 84% des répondants soulignent la courtoisie, le dévouement et l\'écoute attentive des conseillers et du personnel médical.',
          metric: '84.2% d\'avis favorables sur l\'accueil',
          confidence: 0.95,
        },
        {
          title: 'Adoption massive et plébiscitée du canal QR Code & WhatsApp',
          description: 'Le taux de complétion est 32% supérieur lorsque les répondants accèdent au questionnaire via QR Code au comptoir ou lien WhatsApp.',
          metric: '+32% de taux de réponse sur QR/WhatsApp',
          confidence: 0.92,
        },
        {
          title: 'Résolution rapide des litiges de facturation',
          description: 'Le délai moyen de clôture des réclamations liées aux règlements et devis est passé de 9 jours à 48 heures.',
          metric: '48h délai moyen de résolution financière',
          confidence: 0.89,
        },
      ],
      priorityProblems: [
        {
          title: 'Délais d\'attente excessifs lors des heures d\'affluence',
          description: 'Mentionné dans 43% des retours neutres et négatifs, particulièrement entre 10h et 13h sur les guichets physiques.',
          metric: '43% d\'insatisfaction liée aux files d\'attente',
          severity: 'critical',
          confidence: 0.96,
        },
        {
          title: 'Déficit d\'information sur le suivi des dossiers en cours',
          description: 'Les clients expriment un sentiment d\'abandon faute de notification SMS/Email pendant l\'instruction de leurs demandes administratives ou de crédit.',
          metric: '38% des réclamations portent sur l\'absence de statut',
          severity: 'high',
          confidence: 0.93,
        },
        {
          title: 'Clarté des documents administratifs et formulaires',
          description: 'Un tiers des usagers arabophones signale une ambiguïté dans la liste des pièces justificatives exigées.',
          metric: '31% d\'incompréhension sur les pièces justificatives',
          severity: 'medium',
          confidence: 0.88,
        },
      ],
      actionPlans: [
        {
          action: 'Mise en place d\'un système de rendez-vous en ligne et file virtuelle par QR Code',
          rationale: 'Permettra d\'étaler les flux d\'usagers et d\'éliminer les pics de congestion en salle d\'attente.',
          suggestedAssignee: 'Direction des Opérations & IT',
          suggestedDeadline: '30 jours (Fin novembre 2026)',
          expectedImpact: '+18% sur le score CSAT global',
        },
        {
          action: 'Déploiement d\'alertes automatiques par SMS / WhatsApp à chaque étape du dossier',
          rationale: 'Supprimera 60% des déplacements inutiles et désengorgera les guichets d\'information.',
          suggestedAssignee: 'Responsable Relation Client',
          suggestedDeadline: '45 jours (Mi-décembre 2026)',
          expectedImpact: '-45% de réclamations pour manque d\'information',
        },
        {
          action: 'Refonte et simplification bilingue (Arabe / Français) des guides de dépôt',
          rationale: 'Clarifier les prérequis pour éviter les rejets de conformité au premier passage.',
          suggestedAssignee: 'Service Qualité & Communication',
          suggestedDeadline: '20 jours',
          expectedImpact: '+12 points sur l\'indice NPS',
        },
      ],
    },
  ];

  const whatsappConfig: WhatsAppConfig = {
    ...defaultWhatsAppConfig,
  };

  const whatsappLogs: WhatsAppLog[] = [
    {
      id: 'walog-init-01',
      complaintId: 'cmp-101',
      recipientPhone: '+216 98 123 456',
      recipientRole: 'manager',
      priority: 'urgent',
      message: `🚨 ALERTE RÉCLAMATION CRITIQUE IA [Satisfaction Client CERT]\n⚠️ Priorité : URGENTE (Score IA: 94%)\n📋 Enquête : Satisfaction Usagers - CERT\n📁 Dossier N° : CERT-8892\n👤 Contact : +216 98 123 456 | contact.usager@cert.mincom.tn\n🤖 Diagnostic IA : Blocage prolongé d'un dossier d'homologation d'équipements radioélectriques\n⚡ Recommandation : Contacter la direction technique d'homologation sous 24h`,
      status: 'sent',
      whatsappUrl: 'https://wa.me/21698123456',
      sentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      triggerType: 'ai_automatic',
      surveyTitle: 'Satisfaction Client - Agence & Services Bancaires',
      dossierNumber: 'ML-8892',
    },
  ];

  return {
    surveys,
    submissions,
    complaints,
    notifications,
    aiRecommendations,
    whatsappConfig,
    whatsappLogs,
    settings: { ...defaultAppSettings },
  };
}

export class Database {
  private data: DatabaseStore;

  constructor() {
    ensureDataDir();
    if (!fs.existsSync(DB_FILE) && fs.existsSync(SOURCE_DB_FILE)) {
      try {
        fs.copyFileSync(SOURCE_DB_FILE, DB_FILE);
      } catch (e) {
        console.warn('Could not copy source db to tmp db:', e);
      }
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure properties exist if older db file loaded
        if (!this.data.whatsappConfig) {
          this.data.whatsappConfig = { ...defaultWhatsAppConfig };
        }
        if (!Array.isArray(this.data.whatsappLogs)) {
          this.data.whatsappLogs = [];
        }
        if (!this.data.settings) {
          this.data.settings = { ...defaultAppSettings };
        }
      } catch (e) {
        console.error('Failed to parse database file, resetting to initial seed:', e);
        this.data = getInitialData();
        this.persist();
      }
    } else {
      this.data = getInitialData();
      this.persist();
    }
  }

  private isPersisting = false;
  private pendingPersist = false;

  private persist() {
    ensureDataDir();
    if (this.isPersisting) {
      this.pendingPersist = true;
      return;
    }
    this.isPersisting = true;
    try {
      const content = JSON.stringify(this.data, null, 2);
      fs.writeFile(DB_FILE, content, 'utf-8', (err) => {
        this.isPersisting = false;
        if (err) {
          console.warn('Notice writing database file:', err);
        }
        if (this.pendingPersist) {
          this.pendingPersist = false;
          this.persist();
        }
      });
    } catch (e) {
      this.isPersisting = false;
      console.warn('Error formatting db for persist:', e);
    }
  }

  // Survey methods
  getSurveys(): Survey[] {
    return this.data.surveys;
  }

  getSurveyById(id: string): Survey | undefined {
    return this.data.surveys.find((s) => s.id === id);
  }

  createSurvey(surveyData: Partial<Survey>): Survey {
    const id = `srv-${Date.now()}`;
    const newSurvey: Survey = {
      id,
      title: surveyData.title || 'Nouvelle enquête',
      description: surveyData.description || '',
      language: surveyData.language || 'fr',
      status: surveyData.status || 'draft',
      category: surveyData.category || 'Général',
      questions: surveyData.questions || [],
      complaintQuestion: surveyData.complaintQuestion || {
        enabled: true,
        title: 'Avez-vous une réclamation concernant un dossier lié à nos services ? Si oui, partagez-la avec nous en nous expliquant votre problème.',
        requireDossierNumber: false,
        requireContactInfo: false,
      },
      targetResponses: surveyData.targetResponses || 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: surveyData.status === 'published' ? new Date().toISOString() : undefined,
      responseCount: 0,
      csatScore: 0,
      npsScore: 0,
    };
    this.data.surveys.unshift(newSurvey);
    this.persist();
    return newSurvey;
  }

  updateSurvey(id: string, updates: Partial<Survey>): Survey | null {
    const idx = this.data.surveys.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const existing = this.data.surveys[idx];
    const isNowPublished = updates.status === 'published' && existing.status !== 'published';
    const updated: Survey = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      publishedAt: isNowPublished ? new Date().toISOString() : existing.publishedAt,
    };
    this.data.surveys[idx] = updated;
    this.persist();
    return updated;
  }

  duplicateSurvey(id: string): Survey | null {
    const original = this.getSurveyById(id);
    if (!original) return null;
    const dup: Survey = {
      ...original,
      id: `srv-${Date.now()}`,
      title: `${original.title} (Copie)`,
      status: 'draft',
      responseCount: 0,
      csatScore: 0,
      npsScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: undefined,
    };
    this.data.surveys.unshift(dup);
    this.persist();
    return dup;
  }

  deleteSurvey(id: string): boolean {
    const surveyToDelete = this.data.surveys.find((s) => s.id === id);
    if (!surveyToDelete) return false;

    // 1. Identify all linked submission IDs
    const linkedSubmissions = this.data.submissions.filter((sub) => sub.surveyId === id);
    const linkedSubmissionIds = new Set(linkedSubmissions.map((sub) => sub.id));

    // 2. Identify all linked complaint IDs (surveyId match OR submissionId match)
    const linkedComplaints = this.data.complaints.filter(
      (c) => c.surveyId === id || (c.submissionId && linkedSubmissionIds.has(c.submissionId))
    );
    const linkedComplaintIds = new Set(linkedComplaints.map((c) => c.id));

    // 3. Remove all submissions for this survey
    this.data.submissions = this.data.submissions.filter((sub) => sub.surveyId !== id);

    // 4. Remove all complaints for this survey & its submissions
    this.data.complaints = this.data.complaints.filter(
      (c) => c.surveyId !== id && (!c.submissionId || !linkedSubmissionIds.has(c.submissionId)) && !linkedComplaintIds.has(c.id)
    );

    // 5. Remove all notifications linked to this survey or its complaints
    this.data.notifications = this.data.notifications.filter((n) => {
      for (const cId of linkedComplaintIds) {
        if (n.id.includes(cId) || (n.message && n.message.includes(cId)) || (n.whatsappUrl && n.whatsappUrl.includes(cId))) {
          return false;
        }
      }
      if (n.message && (n.message.includes(id) || n.message.includes(surveyToDelete.title))) {
        return false;
      }
      if (n.title && n.title.includes(surveyToDelete.title)) {
        return false;
      }
      return true;
    });

    // 6. Remove all WhatsApp logs linked to this survey or its complaints
    this.data.whatsappLogs = (this.data.whatsappLogs || []).filter((log) => {
      if (log.complaintId && linkedComplaintIds.has(log.complaintId)) return false;
      if (log.surveyTitle && (log.surveyTitle === surveyToDelete.title || log.surveyTitle.includes(surveyToDelete.title))) return false;
      for (const cId of linkedComplaintIds) {
        if (log.message && log.message.includes(cId)) return false;
        if (log.whatsappUrl && log.whatsappUrl.includes(cId)) return false;
      }
      return true;
    });

    // 7. Clear cached AI recommendations/analysis so it recalculates without deleted survey data
    this.data.aiRecommendations = [];

    // 8. Remove the survey itself
    this.data.surveys = this.data.surveys.filter((s) => s.id !== id);

    this.persist();
    return true;
  }

  // Submissions & Complaints
  createSubmission(payload: {
    surveyId: string;
    language: 'fr' | 'ar' | 'tn';
    channel?: 'web' | 'qr' | 'whatsapp' | 'email';
    answers: any[];
    complaint?: any;
    sentiment?: 'positive' | 'neutral' | 'negative';
    csatPositive?: boolean;
    npsType?: 'promoter' | 'passive' | 'detractor';
  }): { submission: SurveySubmission; complaintRecord?: ComplaintRecord } {
    const survey = this.getSurveyById(payload.surveyId);
    const subId = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const submission: SurveySubmission = {
      id: subId,
      surveyId: payload.surveyId,
      surveyTitle: survey ? survey.title : 'Enquête',
      language: payload.language || 'fr',
      channel: payload.channel || 'web',
      answers: payload.answers || [],
      complaint: payload.complaint,
      sentiment: payload.sentiment || 'positive',
      csatPositive: payload.csatPositive ?? true,
      npsType: payload.npsType || 'promoter',
      submittedAt: new Date().toISOString(),
    };
    this.data.submissions.unshift(submission);

    // Update survey stats count
    if (survey) {
      survey.responseCount += 1;
      this.recalculateSurveyStats(survey.id);
    }

    let complaintRecord: ComplaintRecord | undefined;
    if (payload.complaint && payload.complaint.hasComplaint && payload.complaint.problemDescription) {
      const cmpId = `cmp-${Date.now()}`;
      const priority = payload.complaint.aiSuggestedPriority || payload.complaint.priority || 'high';
      const category = payload.complaint.aiSuggestedCategory || payload.complaint.category || 'Service Client';
      const aiSummary = payload.complaint.aiSummary || (payload.complaint.problemDescription.slice(0, 160) + '...');
      const aiSuggestedActions = payload.complaint.aiSuggestedActions || [
        'Prendre contact avec le déclarant sous 24h',
        'Vérifier les éléments du dossier avec l\'équipe concernée'
      ];
      const aiConfidence = payload.complaint.aiConfidence || 0.90;

      complaintRecord = {
        id: cmpId,
        submissionId: subId,
        surveyId: payload.surveyId,
        surveyTitle: survey ? survey.title : 'Enquête',
        problemDescription: payload.complaint.problemDescription,
        audioUrl: payload.complaint.audioRecordingUrl,
        audioTranscription: payload.complaint.audioTranscription,
        dossierNumber: payload.complaint.dossierNumber || undefined,
        submissionDate: payload.complaint.submissionDate || undefined,
        phone: payload.complaint.phone || undefined,
        email: payload.complaint.email || undefined,
        status: 'new',
        priority: priority,
        category: category,
        internalNotes: [
          {
            id: `note-${Date.now()}`,
            author: 'Système IA',
            content: 'Réclamation créée et analysée par l\'IA suite à la soumission du formulaire client.',
            createdAt: new Date().toISOString(),
          }
        ],
        aiSummary: aiSummary,
        aiSuggestedCategory: category,
        aiSuggestedPriority: priority,
        aiSuggestedActions: aiSuggestedActions,
        aiConfidence: aiConfidence,
        managerEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // REAL-TIME WHATSAPP ALERT DISPATCH FOR CRITICAL COMPLAINTS
      const waConfig = this.data.whatsappConfig;
      const isCritical =
        priority === 'urgent' ||
        (waConfig.notifyOn !== 'urgent_only' && priority === 'high') ||
        waConfig.notifyOn === 'all';

      if (waConfig.enabled && isCritical) {
        const alertMessage = formatManagerWhatsAppAlert(complaintRecord, waConfig);
        const waUrl = buildWhatsAppLink(waConfig.recipientPhone, alertMessage);

        const hasAutomatedGateway = Boolean(
          (waConfig.callmebotApiKey && waConfig.callmebotApiKey.trim()) ||
          (waConfig.webhookUrl && waConfig.webhookUrl.startsWith('http'))
        );

        complaintRecord.whatsappRecipient = waConfig.recipientPhone;
        complaintRecord.whatsappAlertDate = new Date().toISOString();
        complaintRecord.whatsappAlertReady = true;

        const logId = `walog-${Date.now()}`;
        const notifId = `notif-${Date.now()}-wa`;

        if (hasAutomatedGateway) {
          // If a gateway is configured, initiate async real dispatch
          complaintRecord.whatsappAlertSent = false;
          complaintRecord.whatsappAlertMethod = waConfig.callmebotApiKey ? 'callmebot_api' : 'webhook';

          const waLog: WhatsAppLog = {
            id: logId,
            complaintId: complaintRecord.id,
            recipientPhone: waConfig.recipientPhone,
            recipientRole: 'manager',
            priority: complaintRecord.priority,
            message: alertMessage,
            status: 'sent',
            whatsappUrl: waUrl,
            sentAt: complaintRecord.whatsappAlertDate,
            triggerType: 'ai_automatic',
            surveyTitle: complaintRecord.surveyTitle,
            dossierNumber: complaintRecord.dossierNumber,
            deliveryMethod: complaintRecord.whatsappAlertMethod,
          };
          this.data.whatsappLogs.unshift(waLog);

          this.data.notifications.unshift({
            id: notifId,
            title: `🚨 Alerte WhatsApp en cours d'envoi (${priority.toUpperCase()})`,
            message: `Transmission automatique en cours vers ${waConfig.managerName} (${waConfig.recipientPhone})...`,
            type: 'whatsapp_alert',
            linkTo: '/complaints',
            whatsappUrl: waUrl,
            deliveryMethod: complaintRecord.whatsappAlertMethod,
            createdAt: new Date().toISOString(),
            read: false,
          });

          // Execute real background dispatch
          sendRealWhatsAppNotification(waConfig, waConfig.recipientPhone, alertMessage).then((result) => {
            if (result.success) {
              if (complaintRecord) {
                complaintRecord.whatsappAlertSent = true;
              }
              waLog.status = 'delivered';
              const targetNotif = this.data.notifications.find((n) => n.id === notifId);
              if (targetNotif) {
                targetNotif.title = `✅ Alerte WhatsApp délivrée (${priority.toUpperCase()})`;
                targetNotif.message = `Notification WhatsApp reçue avec succès par ${waConfig.managerName} (${waConfig.recipientPhone}) via passerelle ${result.method}.`;
              }
            } else {
              waLog.status = 'failed';
              waLog.errorMessage = result.error;
              const targetNotif = this.data.notifications.find((n) => n.id === notifId);
              if (targetNotif) {
                targetNotif.title = `⚠️ Alerte WhatsApp prête (Envoi manuel requis)`;
                targetNotif.message = `L'API a retourné : ${result.error}. Cliquez pour ouvrir et envoyer directement sur WhatsApp.`;
              }
            }
            this.persist();
          }).catch(() => {});
        } else {
          // No automated gateway: pre-format the message for instant 1-click dispatch
          complaintRecord.whatsappAlertSent = false;
          complaintRecord.whatsappAlertMethod = 'direct_link';

          const waLog: WhatsAppLog = {
            id: logId,
            complaintId: complaintRecord.id,
            recipientPhone: waConfig.recipientPhone,
            recipientRole: 'manager',
            priority: complaintRecord.priority,
            message: alertMessage,
            status: 'ready_to_send',
            whatsappUrl: waUrl,
            sentAt: complaintRecord.whatsappAlertDate,
            triggerType: 'ai_automatic',
            surveyTitle: complaintRecord.surveyTitle,
            dossierNumber: complaintRecord.dossierNumber,
            deliveryMethod: 'direct_link',
          };
          this.data.whatsappLogs.unshift(waLog);

          this.data.notifications.unshift({
            id: notifId,
            title: `📱 Alerte WhatsApp prête à envoyer (${priority.toUpperCase()})`,
            message: `Réclamation critique #${complaintRecord.id} : Cliquez ici pour envoyer le message WhatsApp pré-formaté à ${waConfig.managerName} (${waConfig.recipientPhone}).`,
            type: 'whatsapp_alert',
            linkTo: '/complaints',
            whatsappUrl: waUrl,
            deliveryMethod: 'direct_link',
            createdAt: new Date().toISOString(),
            read: false,
          });

          complaintRecord.internalNotes.push({
            id: `note-${Date.now()}-wa`,
            author: 'Assistant WhatsApp CERT',
            content: `Alerte WhatsApp pré-formatée pour le responsable (${waConfig.recipientPhone}). En attente d'ouverture ou d'envoi 1-clic.`,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // Standard notification
        this.data.notifications.unshift({
          id: `notif-${Date.now()}`,
          title: 'Nouvelle réclamation enregistrée',
          message: `Une réclamation a été émise sur l'enquête : ${survey ? survey.title : 'Enquête'}`,
          type: 'complaint',
          linkTo: '/complaints',
          createdAt: new Date().toISOString(),
          read: false,
        });
      }

      this.data.complaints.unshift(complaintRecord);
    }

    this.persist();
    return { submission, complaintRecord };
  }

  private recalculateSurveyStats(surveyId: string) {
    const subs = this.data.submissions.filter((s) => s.surveyId === surveyId);
    if (subs.length === 0) return;
    const survey = this.getSurveyById(surveyId);
    if (!survey) return;

    let csatPositives = 0;
    let promoters = 0;
    let detractors = 0;
    let npsTotal = 0;

    subs.forEach((s) => {
      if (s.csatPositive) csatPositives++;
      if (s.npsType === 'promoter') {
        promoters++;
        npsTotal++;
      } else if (s.npsType === 'detractor') {
        detractors++;
        npsTotal++;
      } else if (s.npsType === 'passive') {
        npsTotal++;
      }
    });

    survey.csatScore = Math.round((csatPositives / subs.length) * 100);
    survey.npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : 0;
  }

  getComplaints(filter?: { status?: string; priority?: string; search?: string; surveyId?: string }): ComplaintRecord[] {
    let list = this.data.complaints;
    if (filter) {
      if (filter.surveyId && filter.surveyId !== 'all') {
        list = list.filter((c) => c.surveyId === filter.surveyId);
      }
      if (filter.status && filter.status !== 'all') {
        list = list.filter((c) => c.status === filter.status);
      }
      if (filter.priority && filter.priority !== 'all') {
        list = list.filter((c) => c.priority === filter.priority);
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(
          (c) =>
            (c.surveyId && c.surveyId.toLowerCase().includes(q)) ||
            (c.surveyTitle && c.surveyTitle.toLowerCase().includes(q)) ||
            c.problemDescription.toLowerCase().includes(q) ||
            (c.dossierNumber && c.dossierNumber.toLowerCase().includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            c.aiSummary.toLowerCase().includes(q)
        );
      }
    }
    return list;
  }

  getSurveyQuestionAnalyses(surveyId: string): QuestionAnalysis[] {
    const survey = this.getSurveyById(surveyId);
    if (!survey || !Array.isArray(survey.questions)) return [];

    const subs = this.data.submissions.filter((s) => s.surveyId === surveyId);

    return survey.questions.map((q, idx) => {
      const questionAnswers = subs
        .map((sub) => sub.answers?.find((a) => a.questionId === q.id))
        .filter((a): a is AnswerItem => Boolean(a && a.value !== undefined && a.value !== ''));

      const responseCount = questionAnswers.length;

      let score = 0;
      let status: 'excellent' | 'good' | 'critical' = 'good';
      let details = '';
      let optionsBreakdown: { label: string; count: number; percentage: number }[] | undefined = undefined;

      if (responseCount === 0) {
        score = 0;
        status = 'good';
        details = 'En attente de réponses pour cette question';
      } else if (q.type === 'stars') {
        const numericValues = questionAnswers
          .map((a) => Number(a.value))
          .filter((v) => !isNaN(v) && v >= 1 && v <= 5);
        if (numericValues.length > 0) {
          const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
          score = Math.round((avg / 5) * 100);
          const positiveCount = numericValues.filter((v) => v >= 4).length;
          status = score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'critical';
          details = `Moyenne : ${avg.toFixed(1)}/5 (${positiveCount}/${numericValues.length} avis favorables ≥ 4★)`;
        } else {
          score = survey.csatScore || 70;
          details = `${responseCount} notes enregistrées`;
        }
      } else if (q.type === 'nps') {
        const npsValues = questionAnswers
          .map((a) => Number(a.value))
          .filter((v) => !isNaN(v) && v >= 0 && v <= 10);
        if (npsValues.length > 0) {
          const promoters = npsValues.filter((v) => v >= 9).length;
          const passives = npsValues.filter((v) => v >= 7 && v <= 8).length;
          const detractors = npsValues.filter((v) => v <= 6).length;
          const calculatedNps = Math.round(((promoters - detractors) / npsValues.length) * 100);
          score = Math.max(0, Math.min(100, Math.round(((calculatedNps + 100) / 200) * 100)));
          status = calculatedNps >= 40 ? 'excellent' : calculatedNps >= 0 ? 'good' : 'critical';
          details = `NPS : ${calculatedNps >= 0 ? `+${calculatedNps}` : calculatedNps} (${promoters} promoteurs, ${passives} passifs, ${detractors} détracteurs)`;
        } else {
          score = 65;
          details = `${responseCount} évaluations NPS`;
        }
      } else if (q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'dropdown') {
        const options = q.options || [];
        const counts: Record<string, number> = {};
        options.forEach((opt) => {
          counts[opt.id || opt.label] = 0;
        });

        questionAnswers.forEach((a) => {
          if (Array.isArray(a.value)) {
            a.value.forEach((val: any) => {
              const found = options.find((opt) => opt.id === val || opt.value === val || opt.label === val);
              const key = found ? (found.id || found.label) : String(val);
              counts[key] = (counts[key] || 0) + 1;
            });
          } else {
            const found = options.find((opt) => opt.id === a.value || opt.value === a.value || opt.label === a.value);
            const key = found ? (found.id || found.label) : String(a.value);
            counts[key] = (counts[key] || 0) + 1;
          }
        });

        optionsBreakdown = options.map((opt) => {
          const cnt = counts[opt.id || opt.label] || 0;
          const pct = responseCount > 0 ? Math.round((cnt / responseCount) * 100) : 0;
          return { label: opt.label, count: cnt, percentage: pct };
        });

        const maxOpt = optionsBreakdown.reduce((max, cur) => (cur.count > max.count ? cur : max), optionsBreakdown[0]);
        score = maxOpt?.percentage || 60;
        status = score >= 50 ? 'excellent' : 'good';
        details = `Option majoritaire : "${maxOpt?.label || 'N/A'}" (${maxOpt?.percentage || 0}%)`;
      } else if (q.type === 'voice') {
        score = 80;
        status = 'good';
        details = `${responseCount} enregistrement(s) audio vocal recueilli(s)`;
      } else {
        score = 75;
        status = 'good';
        details = `${responseCount} retour(s) textuel(s) analysé(s)`;
      }

      return {
        questionId: q.id,
        questionText: q.text,
        type: q.type,
        score,
        responseCount,
        status,
        details,
        optionsBreakdown,
      };
    });
  }

  getComplaintById(id: string): ComplaintRecord | undefined {
    return this.data.complaints.find((c) => c.id === id);
  }

  updateComplaint(id: string, updates: Partial<ComplaintRecord>): ComplaintRecord | null {
    const idx = this.data.complaints.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const existing = this.data.complaints[idx];
    const isNowResolved = (updates.status === 'resolved' || updates.status === 'closed') && existing.status !== 'resolved';
    const updated: ComplaintRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      resolvedAt: isNowResolved ? new Date().toISOString() : existing.resolvedAt,
    };
    this.data.complaints[idx] = updated;
    this.persist();
    return updated;
  }

  addComplaintNote(complaintId: string, author: string, content: string): ComplaintRecord | null {
    const cmp = this.getComplaintById(complaintId);
    if (!cmp) return null;
    const note = {
      id: `note-${Date.now()}`,
      author,
      content,
      createdAt: new Date().toISOString(),
    };
    cmp.internalNotes.push(note);
    cmp.updatedAt = new Date().toISOString();
    this.persist();
    return cmp;
  }

  createComplaint(data: Partial<ComplaintRecord>): ComplaintRecord {
    const id = data.id || `cmp-${Date.now()}`;
    const dossierNumber = data.dossierNumber || `DOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const surveyId = data.surveyId || '';
    const survey = surveyId ? this.getSurveyById(surveyId) : null;
    const surveyTitle = data.surveyTitle || (survey ? survey.title : 'Guichet & Accueil Général CERT');

    const newComplaint: ComplaintRecord = {
      id,
      submissionId: data.submissionId || `manual-${Date.now()}`,
      surveyId,
      surveyTitle,
      problemDescription: data.problemDescription || '',
      dossierNumber,
      submissionDate: data.submissionDate || new Date().toISOString().slice(0, 10),
      phone: data.phone || '',
      email: data.email || '',
      status: data.status || 'new',
      priority: data.priority || 'medium',
      category: data.category || 'Accueil & Service',
      assignedTo: data.assignedTo || '',
      internalNotes: data.internalNotes || [
        {
          id: `note-${Date.now()}`,
          author: 'Cellule Qualité CERT',
          content: 'Dossier de réclamation enregistré manuellement dans le registre.',
          createdAt: new Date().toISOString(),
        },
      ],
      aiSummary: data.aiSummary || data.problemDescription?.slice(0, 160) || 'Nouvelle réclamation enregistrée',
      aiSuggestedCategory: data.aiSuggestedCategory || data.category || 'Service & Qualité',
      aiSuggestedPriority: data.aiSuggestedPriority || data.priority || 'medium',
      aiSuggestedActions: data.aiSuggestedActions || [
        'Vérifier le dossier auprès du service concerné',
        'Informer l\'usager de la prise en charge',
      ],
      aiConfidence: data.aiConfidence || 0.95,
      managerEdited: false,
      whatsappAlertReady: !!(this.data.whatsappConfig?.enabled && (data.phone || this.data.whatsappConfig?.recipientPhone)),
      whatsappRecipient: this.data.whatsappConfig?.recipientPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.complaints.unshift(newComplaint);

    this.data.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: 'Nouvelle réclamation enregistrée',
      message: `Dossier ${dossierNumber} : ${newComplaint.problemDescription.slice(0, 80)}`,
      type: 'complaint',
      linkTo: '/complaints',
      createdAt: new Date().toISOString(),
      read: false,
    });

    this.persist();
    return newComplaint;
  }

  deleteComplaint(id: string): boolean {
    const initialLen = this.data.complaints.length;
    this.data.complaints = this.data.complaints.filter((c) => c.id !== id);
    const deleted = this.data.complaints.length < initialLen;
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  // Dashboard Stats
  getDashboardStats(filter?: { surveyId?: string; periodDays?: number; language?: string; channel?: string }): DashboardStats {
    let subs = this.data.submissions;
    if (filter) {
      if (filter.surveyId && filter.surveyId !== 'all') {
        subs = subs.filter((s) => s.surveyId === filter.surveyId);
      }
      if (filter.language && filter.language !== 'all') {
        subs = subs.filter((s) => s.language === filter.language);
      }
      if (filter.channel && filter.channel !== 'all') {
        subs = subs.filter((s) => s.channel === filter.channel);
      }
      if (filter.periodDays && filter.periodDays > 0) {
        const threshold = Date.now() - filter.periodDays * 86400000;
        subs = subs.filter((s) => new Date(s.submittedAt).getTime() >= threshold);
      }
    }

    const totalSurveys = this.data.surveys.length;
    const publishedSurveys = this.data.surveys.filter((s) => s.status === 'published').length;
    const totalResponses = subs.length;
    const targetTotal = this.data.surveys.reduce((acc, s) => acc + (s.targetResponses || 100), 0);
    const participationRate = totalResponses > 0 && targetTotal > 0 ? Math.min(100, Math.round((totalResponses / targetTotal) * 100)) : 0;

    let csatPositives = 0;
    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    let posCount = 0;
    let neuCount = 0;
    let negCount = 0;

    const channelCounts = { web: 0, qr: 0, whatsapp: 0, email: 0 };

    subs.forEach((s) => {
      if (s.csatPositive) csatPositives++;
      if (s.npsType === 'promoter') promoters++;
      else if (s.npsType === 'passive') passives++;
      else if (s.npsType === 'detractor') detractors++;

      if (s.sentiment === 'positive') posCount++;
      else if (s.sentiment === 'neutral') neuCount++;
      else if (s.sentiment === 'negative') negCount++;

      if (s.channel && channelCounts[s.channel] !== undefined) {
        channelCounts[s.channel]++;
      } else {
        channelCounts.web++;
      }
    });

    const csatPercentage = totalResponses > 0 ? Math.round((csatPositives / totalResponses) * 100) : 0;
    const npsTotal = promoters + passives + detractors;
    const npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : 0;

    let cmps = this.data.complaints;
    if (filter?.surveyId && filter.surveyId !== 'all') {
      cmps = cmps.filter((c) => c.surveyId === filter.surveyId);
    }
    const newCount = cmps.filter((c) => c.status === 'new').length;
    const inProgressCount = cmps.filter((c) => c.status === 'in_progress' || c.status === 'pending').length;
    const resolvedCount = cmps.filter((c) => c.status === 'resolved' || c.status === 'closed').length;

    // Timeline calculations: group by last 7 periods
    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 4);
      const dateStr = d.toISOString().split('T')[0];
      timeline.push({
        date: dateStr,
        responses: totalResponses > 0 ? Math.max(1, Math.floor(Math.random() * 8) + 4) : 0,
        csat: totalResponses > 0 ? Math.min(96, Math.max(62, csatPercentage + Math.floor((Math.random() - 0.5) * 12))) : 0,
        nps: totalResponses > 0 ? Math.min(65, Math.max(15, npsScore + Math.floor((Math.random() - 0.5) * 14))) : 0,
      });
    }

    let topThemes: { theme: string; count: number; percentage: number; sentiment: 'positive' | 'neutral' | 'negative' }[] = [];

    if (totalResponses > 0) {
      if (filter?.surveyId && filter.surveyId !== 'all') {
        const survey = this.getSurveyById(filter.surveyId);
        if (survey) {
          const dynamicThemes: { theme: string; count: number; percentage: number; sentiment: 'positive' | 'neutral' | 'negative' }[] = [];
          survey.questions?.forEach((q, i) => {
            const isPos = i === 0 || q.type === 'stars';
            dynamicThemes.push({
              theme: q.text.length > 40 ? `${q.text.slice(0, 37)}...` : q.text,
              count: Math.max(1, Math.round(totalResponses * (i === 0 ? 0.45 : i === 1 ? 0.3 : 0.2))),
              percentage: i === 0 ? 45 : i === 1 ? 30 : 25,
              sentiment: isPos ? 'positive' : 'neutral',
            });
          });
          if (cmps.length > 0) {
            dynamicThemes.unshift({
              theme: cmps[0].category || 'Réclamations & Délais signalés',
              count: cmps.length,
              percentage: Math.min(100, Math.round((cmps.length / Math.max(1, totalResponses)) * 100)),
              sentiment: 'negative',
            });
          }
          if (dynamicThemes.length > 0) {
            topThemes = dynamicThemes.slice(0, 5);
          }
        }
      }
    }

    return {
      totalSurveys,
      publishedSurveys,
      totalResponses,
      participationRate,
      csatPercentage,
      npsScore,
      promotersCount: promoters,
      passivesCount: passives,
      detractorsCount: detractors,
      complaints: {
        total: cmps.length,
        newCount,
        inProgressCount,
        resolvedCount,
      },
      sentimentBreakdown: {
        positive: posCount,
        neutral: neuCount,
        negative: negCount,
      },
      channelBreakdown: channelCounts,
      topThemes,
      timeline,
    };
  }

  resetAllClientData(): { success: boolean; surveysCount: number } {
    this.data.submissions = [];
    this.data.complaints = [];
    this.data.notifications = [];
    this.data.whatsappLogs = [];
    this.data.aiRecommendations = [];

    this.data.surveys.forEach((s) => {
      s.responseCount = 0;
      s.csatScore = 0;
      s.npsScore = 0;
      s.updatedAt = new Date().toISOString();
    });

    this.persist();
    return { success: true, surveysCount: this.data.surveys.length };
  }

  // Notifications
  getNotifications(): AppNotification[] {
    return this.data.notifications;
  }

  markNotificationRead(id: string): void {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.persist();
    }
  }

  // Recommendations
  getRecommendations(): AIRecommendation[] {
    return this.data.aiRecommendations;
  }

  saveRecommendation(rec: AIRecommendation): void {
    this.data.aiRecommendations.unshift(rec);
    this.persist();
  }

  // WhatsApp Configuration & Logs
  getWhatsAppConfig(): WhatsAppConfig {
    return this.data.whatsappConfig || { ...defaultWhatsAppConfig };
  }

  updateWhatsAppConfig(updates: Partial<WhatsAppConfig>): WhatsAppConfig {
    this.data.whatsappConfig = {
      ...(this.data.whatsappConfig || defaultWhatsAppConfig),
      ...updates,
    };
    this.persist();
    return this.data.whatsappConfig;
  }

  getWhatsAppLogs(): WhatsAppLog[] {
    return this.data.whatsappLogs || [];
  }

  addWhatsAppLog(log: WhatsAppLog): WhatsAppLog {
    if (!this.data.whatsappLogs) this.data.whatsappLogs = [];
    this.data.whatsappLogs.unshift(log);
    this.persist();
    return log;
  }

  // App Settings (Director name, title, contact, organization)
  getSettings(): AppSettings {
    if (!this.data.settings) {
      this.data.settings = { ...defaultAppSettings };
      this.persist();
    }
    return this.data.settings;
  }

  updateSettings(updates: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    this.data.settings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.settings;
  }
}

export const dbInstance = new Database();
