export type Language = 'fr' | 'ar' | 'tn';

export type SurveyStatus = 'draft' | 'published' | 'archived';

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'stars'
  | 'nps'
  | 'text'
  | 'voice';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface Question {
  id: string;
  text: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  minLabel?: string;
  maxLabel?: string;
  order: number;
}

export interface ComplaintQuestionConfig {
  enabled: boolean;
  title: string;
  requireDossierNumber: boolean;
  requireContactInfo: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  language: Language;
  status: SurveyStatus;
  questions: Question[];
  complaintQuestion: ComplaintQuestionConfig;
  targetResponses?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  category?: string;
  // stats summary
  responseCount: number;
  csatScore: number;
  npsScore: number;
}

export interface AnswerItem {
  questionId: string;
  questionText: string;
  type: QuestionType;
  value: string | number | string[];
  audioUrl?: string;
  transcription?: string;
}

export interface ComplaintData {
  hasComplaint: boolean;
  problemDescription?: string;
  dossierNumber?: string;
  submissionDate?: string;
  phone?: string;
  email?: string;
  audioRecordingUrl?: string;
  audioTranscription?: string;
}

export interface SurveySubmission {
  id: string;
  surveyId: string;
  surveyTitle: string;
  language: Language;
  channel: 'web' | 'qr' | 'whatsapp' | 'email';
  answers: AnswerItem[];
  complaint?: ComplaintData;
  submittedAt: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  csatPositive?: boolean;
  npsType?: 'promoter' | 'passive' | 'detractor';
}

export type ComplaintStatus = 'new' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type ComplaintPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface ComplaintRecord {
  id: string;
  submissionId: string;
  surveyId: string;
  surveyTitle: string;
  problemDescription: string;
  audioUrl?: string;
  audioTranscription?: string;
  dossierNumber?: string;
  submissionDate?: string;
  phone?: string;
  email?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  category: string;
  assignedTo?: string;
  internalNotes: ComplaintNote[];
  aiSummary: string;
  aiSuggestedCategory: string;
  aiSuggestedPriority: ComplaintPriority;
  aiSuggestedActions: string[];
  aiConfidence: number;
  managerEdited: boolean;
  whatsappAlertSent?: boolean;
  whatsappAlertReady?: boolean;
  whatsappAlertMethod?: 'callmebot_api' | 'webhook' | 'direct_link';
  whatsappAlertDate?: string;
  whatsappRecipient?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ComplaintNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface DashboardStats {
  totalSurveys: number;
  publishedSurveys: number;
  totalResponses: number;
  participationRate: number;
  csatPercentage: number;
  npsScore: number;
  promotersCount: number;
  passivesCount: number;
  detractorsCount: number;
  complaints: {
    total: number;
    newCount: number;
    inProgressCount: number;
    resolvedCount: number;
  };
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  channelBreakdown: {
    web: number;
    qr: number;
    whatsapp: number;
    email: number;
  };
  topThemes: {
    theme: string;
    count: number;
    percentage: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  }[];
  timeline: {
    date: string;
    responses: number;
    csat: number;
    nps: number;
  }[];
}

export interface QuestionAnalysis {
  questionId: string;
  questionText: string;
  type: QuestionType | string;
  score: number;
  responseCount: number;
  status: 'excellent' | 'good' | 'critical';
  details?: string;
  optionsBreakdown?: { label: string; count: number; percentage: number }[];
}

export interface AIRecommendation {
  id: string;
  period: string;
  surveyId?: string;
  surveyTitle?: string;
  executiveSummary?: string;
  questionAnalyses?: QuestionAnalysis[];
  strengths: {
    title: string;
    description: string;
    metric: string;
    confidence: number;
  }[];
  priorityProblems: {
    title: string;
    description: string;
    metric: string;
    severity: 'critical' | 'high' | 'medium';
    confidence: number;
  }[];
  priorityIssues?: {
    title: string;
    description: string;
    metric: string;
    severity: 'critical' | 'high' | 'medium';
    confidence: number;
  }[];
  actionPlans: {
    action: string;
    rationale: string;
    suggestedAssignee: string;
    suggestedDeadline: string;
    expectedImpact: string;
  }[];
  generatedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'complaint' | 'low_csat' | 'survey_published' | 'info' | 'whatsapp_alert';
  linkTo?: string;
  whatsappUrl?: string;
  deliveryMethod?: 'callmebot_api' | 'webhook' | 'direct_link';
  createdAt: string;
  read: boolean;
}

export interface WhatsAppConfig {
  enabled: boolean;
  recipientPhone: string;
  managerName: string;
  notifyOn: 'urgent_only' | 'urgent_and_high' | 'all';
  provider?: 'callmebot' | 'webhook' | 'manual';
  callmebotApiKey?: string;
  webhookUrl?: string;
  webhookToken?: string;
  includeAiSummary: boolean;
  includeSuggestedActions: boolean;
  includeDirectLink: boolean;
  customHeader?: string;
}

export interface WhatsAppLog {
  id: string;
  complaintId?: string;
  recipientPhone: string;
  recipientRole: 'manager' | 'client';
  priority?: ComplaintPriority;
  message: string;
  status: 'sent' | 'delivered' | 'ready_to_send' | 'failed';
  whatsappUrl: string;
  sentAt: string;
  triggerType: 'ai_automatic' | 'manual_resend' | 'client_contact' | 'test';
  surveyTitle?: string;
  dossierNumber?: string;
  deliveryMethod?: 'callmebot_api' | 'webhook' | 'direct_link';
  errorMessage?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'quality_manager' | 'agent' | 'director';
  roleTitle: string;
  department: string;
  avatarInitials: string;
  token?: string;
}

export interface AppSettings {
  directorName: string;
  directorTitle: string;
  directorEmail: string;
  orgName: string;
  sector: string;
  updatedAt?: string;
}
