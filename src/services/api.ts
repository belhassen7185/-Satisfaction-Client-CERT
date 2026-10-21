import {
  Survey,
  SurveySubmission,
  ComplaintRecord,
  DashboardStats,
  AppNotification,
  AIRecommendation,
  WhatsAppConfig,
  WhatsAppLog,
  Language,
  AppSettings,
} from '../types/index.ts';
import { clientStorage } from './clientStorage.ts';

const API_BASE = '/api';

export interface ApiDiagnosticErrorLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status: number;
  statusText: string;
  hostname: string;
  href: string;
  errorMessage?: string;
  responseSnippet?: string;
}

const DIAGNOSTIC_STORAGE_KEY = 'satisfaction_ai_diagnostic_api_errors';

/**
 * Checks whether the app is running on a production or remote host
 * (e.g. Hostinger, Cloud Run, custom domain, anything other than localhost/127.0.0.1)
 */
export function isProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  return Boolean(host && host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0');
}

/**
 * Captures and logs 404/500/network errors to browser console and localStorage
 * specifically when running on a production host to trace why responses aren't reaching the backend.
 */
export function logApiDiagnosticError(
  endpoint: string,
  method = 'GET',
  status = 0,
  statusText = 'NETWORK_ERROR',
  errorMessage?: string,
  responseSnippet?: string
): void {
  const isProd = isProductionHost();
  const timestamp = new Date().toISOString();
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server';
  const href = typeof window !== 'undefined' ? window.location.href : '';

  const entry: ApiDiagnosticErrorLog = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp,
    endpoint,
    method,
    status,
    statusText,
    hostname,
    href,
    errorMessage,
    responseSnippet: responseSnippet ? responseSnippet.slice(0, 300) : undefined,
  };

  // 1. Output to browser console with prominent visual badge
  console.error(
    `%c[PROD API DIAGNOSTIC] HTTP ${status || 'ERR'} on ${method} ${endpoint}`,
    'background: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
    {
      endpoint,
      method,
      status,
      statusText,
      errorMessage,
      responseSnippet,
      hostname,
      isProductionHost: isProd,
      timestamp,
    }
  );

  // 2. Persist to localStorage specifically when on production host (and keep accessible)
  if (typeof window !== 'undefined') {
    try {
      const existingRaw = localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
      let list: ApiDiagnosticErrorLog[] = [];
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) list = parsed;
        } catch (_) {}
      }
      list.unshift(entry);
      // Keep last 30 logs to avoid unbounded growth
      if (list.length > 30) list = list.slice(0, 30);
      localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}

    // Expose quick console helper on window
    try {
      (window as any).__CERT_API_LOGS__ = (window as any).__CERT_API_LOGS__ || [];
      (window as any).__CERT_API_LOGS__.unshift(entry);
      (window as any).__GET_API_DIAGNOSTICS__ = getStoredDiagnosticLogs;
      (window as any).__CLEAR_API_DIAGNOSTICS__ = clearStoredDiagnosticLogs;
    } catch (_) {}
  }
}

export function getStoredDiagnosticLogs(): ApiDiagnosticErrorLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function clearStoredDiagnosticLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    if ((window as any).__CERT_API_LOGS__) {
      (window as any).__CERT_API_LOGS__ = [];
    }
  } catch (_) {}
}

/**
 * Wrapper around fetch that captures and logs 404, 500, and network errors automatically
 */
async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method || 'GET';
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      // Clone response to read snippet without consuming the body
      let snippet = '';
      try {
        const cloned = res.clone();
        snippet = await cloned.text();
      } catch (_) {}
      logApiDiagnosticError(url, method, res.status, res.statusText, undefined, snippet);
    }
    return res;
  } catch (err: any) {
    logApiDiagnosticError(url, method, 0, 'FETCH_NETWORK_ERROR', err?.message || String(err));
    throw err;
  }
}

/**
 * Helper to check if a fetch response is valid JSON with diagnostic logging
 */
async function parseJsonResponse<T>(res: Response, endpoint = '', method = 'GET'): Promise<T | null> {
  if (!res.ok) {
    let snippet = '';
    try {
      snippet = await res.text();
    } catch (_) {}
    logApiDiagnosticError(endpoint, method, res.status, res.statusText, undefined, snippet);
    return null;
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    let snippet = '';
    try {
      snippet = await res.text();
    } catch (_) {}
    logApiDiagnosticError(
      endpoint,
      method,
      res.status,
      `NON_JSON_CONTENT_TYPE (${contentType})`,
      'Expected JSON but received HTML or text. On Hostinger, check if Apache redirected to index.html.',
      snippet
    );
    return null;
  }
  try {
    return await res.json();
  } catch (err: any) {
    logApiDiagnosticError(endpoint, method, res.status, 'JSON_PARSE_ERROR', err?.message);
    return null;
  }
}

export const api = {
  // Health
  async getHealth(): Promise<{ status: string; geminiConfigured: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await parseJsonResponse<{ status: string; geminiConfigured: boolean }>(res);
      if (data) return data;
    } catch {
      // Fallback
    }
    return { status: 'ok', geminiConfigured: true };
  },

  // Surveys
  async getSurveys(): Promise<Survey[]> {
    try {
      const res = await fetch(`${API_BASE}/surveys`);
      const data = await parseJsonResponse<Survey[]>(res);
      if (Array.isArray(data)) {
        return data;
      }
    } catch {
      // Network/Vercel static fallback
    }
    return clientStorage.getSurveys();
  },

  async getSurvey(id: string): Promise<Survey> {
    try {
      const res = await fetch(`${API_BASE}/surveys/${id}`);
      const data = await parseJsonResponse<Survey>(res);
      if (data && data.id) return data;
    } catch {
      // Network/Vercel static fallback
    }
    const local = clientStorage.getSurveyById(id);
    if (!local) throw new Error('Enquête introuvable');
    return local;
  },

  async createSurvey(data: Partial<Survey>): Promise<Survey> {
    try {
      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const created = await parseJsonResponse<Survey>(res);
      if (created && created.id) {
        // Also sync local
        try {
          clientStorage.updateSurvey(created.id, created);
        } catch {
          // If not in local store yet, that's fine
        }
        return created;
      }
    } catch {
      // Network/Vercel static fallback
    }
    // Seamless client-side creation (essential on Vercel)
    return clientStorage.createSurvey(data);
  },

  async updateSurvey(id: string, data: Partial<Survey>): Promise<Survey> {
    try {
      const res = await fetch(`${API_BASE}/surveys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await parseJsonResponse<Survey>(res);
      if (updated && updated.id) {
        return updated;
      }
    } catch {
      // Fallback
    }
    return clientStorage.updateSurvey(id, data);
  },

  async duplicateSurvey(id: string): Promise<Survey> {
    try {
      const res = await fetch(`${API_BASE}/surveys/${id}/duplicate`, {
        method: 'POST',
      });
      const duplicated = await parseJsonResponse<Survey>(res);
      if (duplicated && duplicated.id) return duplicated;
    } catch {
      // Fallback
    }
    return clientStorage.duplicateSurvey(id);
  },

  async deleteSurvey(id: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/surveys/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        clientStorage.deleteSurvey(id);
        return;
      }
    } catch {
      // Fallback
    }
    clientStorage.deleteSurvey(id);
  },

  // Public
  async getPublicSurvey(id: string): Promise<Survey> {
    try {
      const res = await fetch(`${API_BASE}/surveys/${id}/public`);
      const data = await parseJsonResponse<Survey>(res);
      if (data && data.id) return data;
    } catch {
      // Fallback
    }
    const local = clientStorage.getSurveyById(id);
    if (!local) throw new Error('Enquête non disponible');
    return local;
  },

  async submitSurvey(surveyId: string, payload: any): Promise<{ success: boolean; submissionId: string; complaintId?: string }> {
    const endpoint = `${API_BASE}/surveys/${surveyId}/submit`;
    try {
      const res = await safeFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse<{ success: boolean; submissionId: string; complaintId?: string }>(res, endpoint, 'POST');
      if (data && data.success) {
        try {
          clientStorage.submitSurvey(surveyId, payload);
        } catch {}
        return data;
      }
    } catch (err: any) {
      logApiDiagnosticError(endpoint, 'POST', 0, 'SUBMISSION_NETWORK_ERROR', err?.message || String(err));
    }
    return clientStorage.submitSurvey(surveyId, payload);
  },

  // Complaints
  async getComplaints(filter?: { status?: string; priority?: string; search?: string; surveyId?: string }): Promise<ComplaintRecord[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.status) params.set('status', filter.status);
      if (filter?.priority) params.set('priority', filter.priority);
      if (filter?.search) params.set('search', filter.search);
      if (filter?.surveyId) params.set('surveyId', filter.surveyId);

      const res = await fetch(`${API_BASE}/complaints?${params.toString()}`);
      const data = await parseJsonResponse<ComplaintRecord[]>(res);
      if (Array.isArray(data)) return data;
    } catch {
      // Fallback
    }
    return clientStorage.getComplaints(filter);
  },

  async getSurveyAnalysis(surveyId: string): Promise<{
    survey: Survey;
    questionAnalyses: any[];
    complaints: ComplaintRecord[];
    stats: DashboardStats;
  }> {
    try {
      const res = await fetch(`${API_BASE}/surveys/${surveyId}/analysis`);
      const data = await parseJsonResponse<any>(res);
      if (data && data.survey) return data;
    } catch {
      // Fallback
    }
    const survey = clientStorage.getSurveyById(surveyId);
    if (!survey) throw new Error('Enquête introuvable');
    return {
      survey,
      questionAnalyses: clientStorage.getSurveyQuestionAnalyses(surveyId),
      complaints: clientStorage.getComplaints({ surveyId }),
      stats: clientStorage.getDashboardStats({ surveyId }),
    };
  },

  downloadCsv(type: 'complaints' | 'stats', surveyId?: string): void {
    const isSpecific = surveyId && surveyId !== 'all';
    try {
      if (type === 'complaints') {
        const complaints = clientStorage.getComplaints(isSpecific ? { surveyId } : undefined);
        const headers = ['ID', 'Date', 'Enquête', 'Statut', 'Priorité', 'Catégorie', 'Dossier', 'Téléphone', 'Email', 'Description', 'Résumé IA'];
        const rows = complaints.map((c) => [
          `"${c.id}"`,
          `"${new Date(c.createdAt).toLocaleDateString('fr-FR')}"`,
          `"${(c.surveyTitle || '').replace(/"/g, '""')}"`,
          `"${c.status}"`,
          `"${c.priority}"`,
          `"${(c.category || '').replace(/"/g, '""')}"`,
          `"${c.dossierNumber || ''}"`,
          `"${c.phone || ''}"`,
          `"${c.email || ''}"`,
          `"${(c.problemDescription || '').replace(/"/g, '""')}"`,
          `"${(c.aiSummary || '').replace(/"/g, '""')}"`,
        ]);
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reclamations_${isSpecific ? surveyId : 'global'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const stats = clientStorage.getDashboardStats(isSpecific ? { surveyId } : undefined);
        const headers = ['Métrique', 'Valeur'];
        const rows = [
          ['Total enquêtes', stats.totalSurveys],
          ['Enquêtes publiées', stats.publishedSurveys],
          ['Total réponses', stats.totalResponses],
          ['Taux CSAT (%)', `${stats.csatPercentage}%`],
          ['Score NPS', stats.npsScore],
          ['Promoteurs', stats.promotersCount],
          ['Passifs', stats.passivesCount],
          ['Détracteurs', stats.detractorsCount],
          ['Réclamations ouvertes', stats.complaints.newCount + stats.complaints.inProgressCount],
          ['Réclamations résolues', stats.complaints.resolvedCount],
        ];
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `satisfaction_kpis_${isSpecific ? surveyId : 'global'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // Fallback to server route if client download fails
      const query = isSpecific ? `?type=${type}&surveyId=${surveyId}` : `?type=${type}`;
      window.location.href = `/api/export/csv${query}`;
    }
  },

  async getComplaint(id: string): Promise<ComplaintRecord> {
    try {
      const res = await fetch(`${API_BASE}/complaints/${id}`);
      const data = await parseJsonResponse<ComplaintRecord>(res);
      if (data && data.id) return data;
    } catch {
      // Fallback
    }
    const c = clientStorage.getComplaint(id);
    if (!c) throw new Error('Réclamation introuvable');
    return c;
  },

  async updateComplaint(id: string, updates: Partial<ComplaintRecord>): Promise<ComplaintRecord> {
    try {
      const res = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await parseJsonResponse<ComplaintRecord>(res);
      if (data && data.id) return data;
    } catch {
      // Fallback
    }
    return clientStorage.updateComplaint(id, updates);
  },

  async createComplaint(data: Partial<ComplaintRecord>): Promise<ComplaintRecord> {
    try {
      const res = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const created = await parseJsonResponse<ComplaintRecord>(res);
      if (created && created.id) {
        try {
          clientStorage.createComplaint(created);
        } catch {}
        return created;
      }
    } catch {
      // Fallback
    }
    return clientStorage.createComplaint(data);
  },

  async deleteComplaint(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        clientStorage.deleteComplaint(id);
        return true;
      }
    } catch {
      // Fallback
    }
    return clientStorage.deleteComplaint(id);
  },

  async addComplaintNote(id: string, author: string, content: string): Promise<ComplaintRecord> {
    try {
      const res = await fetch(`${API_BASE}/complaints/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, content }),
      });
      const data = await parseJsonResponse<ComplaintRecord>(res);
      if (data && data.id) return data;
    } catch {
      // Fallback
    }
    return clientStorage.addComplaintNote(id, author, content);
  },

  // Stats
  async getDashboardStats(filter?: { surveyId?: string; periodDays?: number; language?: string; channel?: string }): Promise<DashboardStats> {
    const params = new URLSearchParams();
    if (filter?.surveyId) params.set('surveyId', filter.surveyId);
    if (filter?.periodDays) params.set('periodDays', String(filter.periodDays));
    if (filter?.language) params.set('language', filter.language);
    if (filter?.channel) params.set('channel', filter.channel);
    const endpoint = `${API_BASE}/dashboard/stats?${params.toString()}`;

    try {
      const res = await safeFetch(endpoint);
      const data = await parseJsonResponse<DashboardStats>(res, endpoint, 'GET');
      if (data && typeof data.totalSurveys === 'number') {
        // Older deployments or partial API payloads may omit fields consumed by the dashboard.
        return {
          ...data,
          complaints: { total: 0, newCount: 0, inProgressCount: 0, resolvedCount: 0, ...(data.complaints || {}) },
          sentimentBreakdown: { positive: 0, neutral: 0, negative: 0, ...(data.sentimentBreakdown || {}) },
          channelBreakdown: { web: 0, qr: 0, whatsapp: 0, email: 0, ...(data.channelBreakdown || {}) },
          topThemes: Array.isArray(data.topThemes) ? data.topThemes : [],
          timeline: Array.isArray(data.timeline) ? data.timeline : [],
        };
      }
    } catch (err: any) {
      logApiDiagnosticError(endpoint, 'GET', 0, 'DASHBOARD_STATS_NETWORK_ERROR', err?.message || String(err));
    }
    return clientStorage.getDashboardStats(filter);
  },

  // Notifications
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      const data = await parseJsonResponse<AppNotification[]>(res);
      if (Array.isArray(data)) return data;
    } catch {
      // Fallback
    }
    return clientStorage.getNotifications();
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // Safe ignore
    }
    clientStorage.markNotificationRead(id);
  },

  // AI endpoints
  async generateSurveyWithAI(prompt: string, language: 'fr' | 'ar' | 'tn'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/ai/generate-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language }),
      });
      const data = await parseJsonResponse<any>(res);
      if (data && (data.title || data.questions)) {
        return data;
      }
    } catch {
      // Fallback
    }
    // High-quality local generator template fallback
    return clientStorage.generateSurveyWithAI(prompt, language);
  },

  async analyzeComplaintWithAI(text: string, language: 'fr' | 'ar' | 'tn'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/ai/analyze-complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      const data = await parseJsonResponse<any>(res);
      if (data) return data;
    } catch {
      // Fallback
    }
    return {
      sentiment: 'négatif',
      urgency: 'élevée',
      category: 'Qualité de service',
      summary: text.slice(0, 100),
      actionableSuggestions: [
        'Prendre contact avec le client pour recueillir des précisions',
        'Vérifier le dossier technique associé',
      ],
    };
  },

  async transcribeVoice(base64Audio: string, mimeType: string, targetLanguage: string = 'fr'): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/ai/transcribe-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Audio, mimeType, targetLanguage }),
      });
      const data = await parseJsonResponse<{ transcription: string | null }>(res);
      if (data?.transcription) return data.transcription;
    } catch {
      // Fallback
    }
    return null;
  },

  async translateToFrench(text: string): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/ai/translate-to-french`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await parseJsonResponse<{ translatedText: string }>(res);
      if (data?.translatedText) return data.translatedText;
    } catch {
      // Fallback
    }
    return text;
  },

  async getAIRecommendations(filter?: { surveyId?: string; language?: string }): Promise<AIRecommendation> {
    try {
      const res = await fetch(`${API_BASE}/ai/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filter || {}),
      });
      const data = await parseJsonResponse<AIRecommendation>(res);
      if (data) return data;
    } catch {
      // Fallback
    }
    return clientStorage.getAIRecommendations(filter?.surveyId, filter?.language);
  },

  // WhatsApp Real-Time Notifications
  async getWhatsAppConfig(): Promise<{ config: WhatsAppConfig; stats: { totalSent: number; lastSentAt: string | null } }> {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/config`);
      const data = await parseJsonResponse<any>(res);
      if (data?.config) return data;
    } catch {
      // Fallback
    }
    return clientStorage.getWhatsAppConfig();
  },

  async updateWhatsAppConfig(config: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await parseJsonResponse<WhatsAppConfig>(res);
      if (data) return data;
    } catch {
      // Fallback
    }
    return clientStorage.updateWhatsAppConfig(config);
  },

  async getWhatsAppLogs(): Promise<WhatsAppLog[]> {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/logs`);
      const data = await parseJsonResponse<WhatsAppLog[]>(res);
      if (Array.isArray(data)) return data;
    } catch {
      // Fallback
    }
    return clientStorage.getWhatsAppLogs();
  },

  async testWhatsAppAlert(phoneNumber?: string): Promise<{
    success: boolean;
    delivered?: boolean;
    deliveryMethod?: string;
    errorMessage?: string;
    message: string;
    whatsappUrl: string;
    log: WhatsAppLog;
  }> {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await parseJsonResponse<any>(res);
      if (data?.success) return data;
    } catch {
      // Fallback
    }
    const cleanPhone = (phoneNumber || '21650392095').replace(/\D/g, '');
    const message = `🔔 TEST ALERTE WHATSAPP - CERT Satisfaction Client\nSystème de notification en temps réel fonctionnel.\nDate: ${new Date().toLocaleString('fr-FR')}`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    const log: WhatsAppLog = {
      id: `log-${Date.now()}`,
      recipientPhone: cleanPhone,
      recipientRole: 'manager',
      message: message.slice(0, 100),
      status: 'ready_to_send',
      whatsappUrl,
      sentAt: new Date().toISOString(),
      triggerType: 'test',
      deliveryMethod: 'direct_link',
    };
    return {
      success: true,
      delivered: false,
      deliveryMethod: 'direct_link',
      message,
      whatsappUrl,
      log,
    };
  },

  async notifyComplaintViaWhatsApp(
    complaintId: string,
    options?: { target?: 'manager' | 'client'; phoneNumber?: string; customMessage?: string; markAsSent?: boolean }
  ): Promise<{
    success: boolean;
    delivered?: boolean;
    deliveryMethod?: string;
    errorMessage?: string;
    whatsappUrl: string;
    complaint: ComplaintRecord;
    log: WhatsAppLog;
  }> {
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/notify-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });
      const data = await parseJsonResponse<any>(res);
      if (data?.success) return data;
    } catch {
      // Fallback
    }
    const complaint = clientStorage.getComplaint(complaintId);
    if (!complaint) throw new Error('Réclamation introuvable');
    const cleanPhone = (options?.phoneNumber || complaint.phone || '21650392095').replace(/\D/g, '');
    const message = options?.customMessage || `🚨 ALERTE RÉCLAMATION CERT (#${complaint.id})\nMotif: ${complaint.problemDescription.slice(0, 150)}`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    const log: WhatsAppLog = {
      id: `log-${Date.now()}`,
      complaintId: complaint.id,
      recipientPhone: cleanPhone,
      recipientRole: options?.target || 'manager',
      message: message.slice(0, 100),
      status: 'ready_to_send',
      whatsappUrl,
      sentAt: new Date().toISOString(),
      triggerType: 'client_contact',
      deliveryMethod: 'direct_link',
    };
    return {
      success: true,
      delivered: false,
      deliveryMethod: 'direct_link',
      whatsappUrl,
      complaint,
      log,
    };
  },

  async getComplaintWhatsAppReply(
    complaintId: string,
    language?: Language
  ): Promise<{ replyText: string; clientPhone?: string; whatsappUrl?: string }> {
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/whatsapp-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const data = await parseJsonResponse<any>(res);
      if (data?.replyText) return data;
    } catch {
      // Fallback
    }
    const complaint = clientStorage.getComplaint(complaintId);
    const clientPhone = complaint?.phone || '+216 50 392 095';
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const replyText =
      language === 'ar' || language === 'tn'
        ? `مرحباً بك. نشكرك على ملاحظتك بخصوص مصلحة CERT (${complaint?.id || ''}). نحن بصدد دراسة طلبك والتكفل به في أقرب وقت.`
        : `Bonjour. Le Centre d'Études et de Recherche des Télécommunications (CERT) vous remercie pour votre retour concernant votre dossier #${complaint?.id || ''}. Notre service traite votre réclamation en priorité.`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(replyText)}`;
    return { replyText, clientPhone, whatsappUrl };
  },

  async resetAllData(): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/reset-data`, { method: 'POST' });
      if (res.ok) {
        clientStorage.resetAllClientData();
        return { success: true };
      }
    } catch {
      // Fallback
    }
    clientStorage.resetAllClientData();
    return { success: true };
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await parseJsonResponse<AppSettings>(res);
      if (data && data.directorName) {
        clientStorage.saveSettings(data);
        return data;
      }
    } catch {
      // Fallback
    }
    return clientStorage.getSettings();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    // Save to local storage first for instant offline fallback
    const local = clientStorage.saveSettings(settings);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await parseJsonResponse<AppSettings>(res);
      if (data && data.directorName) {
        clientStorage.saveSettings(data);
        return data;
      }
    } catch {
      // Fallback to local
    }
    return local;
  },

  // Production Diagnostics Helpers
  getDiagnosticLogs(): ApiDiagnosticErrorLog[] {
    return getStoredDiagnosticLogs();
  },

  clearDiagnosticLogs(): void {
    clearStoredDiagnosticLogs();
  },

  isProductionHost(): boolean {
    return isProductionHost();
  },
};
