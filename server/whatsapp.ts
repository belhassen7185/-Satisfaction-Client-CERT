import { ComplaintRecord, WhatsAppConfig, WhatsAppLog, ComplaintPriority } from '../src/types/index.ts';

export const defaultWhatsAppConfig: WhatsAppConfig = {
  enabled: true,
  recipientPhone: '+216 98 123 456',
  managerName: 'Karim Ben Salem (Responsable d\'astreinte CERT)',
  notifyOn: 'urgent_and_high',
  includeAiSummary: true,
  includeSuggestedActions: true,
  includeDirectLink: true,
  customHeader: 'CERT - Alerte Réclamation Critique Temps Réel',
};

export function cleanPhoneNumber(phone: string): string {
  // Remove non-digit chars except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

export function formatManagerWhatsAppAlert(
  complaint: ComplaintRecord,
  config: WhatsAppConfig,
  baseUrl: string = ''
): string {
  const priorityEmoji =
    complaint.priority === 'urgent'
      ? '🚨 [CRITIQUE / URGENT]'
      : complaint.priority === 'high'
      ? '⚠️ [PRIORITÉ ÉLEVÉE]'
      : 'ℹ️ [PRIORITÉ NORMALE]';

  const dateStr = new Date(complaint.createdAt || Date.now()).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [
    `🔔 *${config.customHeader || 'Satisfaction Client CERT - Alerte Réclamation'}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `${priorityEmoji}`,
    `📅 *Date :* ${dateStr}`,
    `🆔 *Réf Réclamation :* #${complaint.id}`,
    `📋 *Enquête :* ${complaint.surveyTitle || 'Enquête client CERT'}`,
  ];

  if (complaint.dossierNumber) {
    lines.push(`📁 *N° Dossier :* ${complaint.dossierNumber}`);
  }

  if (complaint.phone || complaint.email) {
    const contacts = [complaint.phone, complaint.email].filter(Boolean).join(' | ');
    lines.push(`👤 *Contact déclarant :* ${contacts}`);
  }

  if (config.includeAiSummary && complaint.aiSummary) {
    lines.push(``);
    lines.push(`🤖 *Diagnostic & Résumé IA :*`);
    lines.push(`_${complaint.aiSummary}_`);
  }

  if (complaint.category) {
    lines.push(`🏷️ *Catégorie :* ${complaint.category}`);
  }

  if (config.includeSuggestedActions && complaint.aiSuggestedActions && complaint.aiSuggestedActions.length > 0) {
    lines.push(``);
    lines.push(`⚡ *Actions correctives recommandées :*`);
    complaint.aiSuggestedActions.slice(0, 3).forEach((act, idx) => {
      lines.push(`${idx + 1}. ${act}`);
    });
  }

  lines.push(``);
  lines.push(`💬 *Extrait du message usager :*`);
  const snippet =
    complaint.problemDescription.length > 200
      ? complaint.problemDescription.slice(0, 197) + '...'
      : complaint.problemDescription;
  lines.push(`« ${snippet} »`);

  if (config.includeDirectLink) {
    lines.push(``);
    lines.push(`🔗 *Lien direct de traitement :*`);
    lines.push(`${baseUrl || 'https://satisfaction-ai.app'}/?tab=complaints&id=${complaint.id}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Notification transmise automatiquement en temps réel par Satisfaction Client CERT._`);

  return lines.join('\n');
}

export function formatClientWhatsAppGreeting(
  complaint: ComplaintRecord,
  orgName: string = 'CERT (Centre d\'Études et de Recherche des Télécommunications)'
): string {
  const dossierRef = complaint.dossierNumber ? ` (Dossier N° ${complaint.dossierNumber})` : '';
  const lines: string[] = [
    `Bonjour,`,
    ``,
    `Nous faisons suite à votre réclamation récente${dossierRef} déposée sur nos services auprès de *${orgName}*.`,
    ``,
    `Votre situation a été qualifiée de prioritaire par notre cellule qualité :`,
    `_« ${complaint.aiSummary || 'Prise en charge de votre dossier'} »_`,
    ``,
    `Un conseiller dédié a été immédiatement assigné à votre demande. Nous mettons tout en œuvre pour vous apporter une solution dans les plus brefs délais.`,
    ``,
    `Pourriez-vous nous préciser vos disponibilités par retour de ce message ?`,
    ``,
    `Restant à votre entière écoute,`,
    `*Service Relation & Qualité Client*`,
  ];
  return lines.join('\n');
}

export function buildWhatsAppLink(phoneNumber: string, messageText: string): string {
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  const encoded = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export interface WhatsAppSendResult {
  success: boolean;
  method: 'callmebot_api' | 'webhook' | 'direct_link';
  error?: string;
  responseDetail?: string;
}

export async function sendRealWhatsAppNotification(
  config: WhatsAppConfig,
  phoneNumber: string,
  messageText: string
): Promise<WhatsAppSendResult> {
  const cleanPhone = cleanPhoneNumber(phoneNumber);

  // 1. Prioritize CallMeBot API if an API key is provided
  if (config.callmebotApiKey && config.callmebotApiKey.trim()) {
    try {
      const apiKey = config.callmebotApiKey.trim();
      const encodedMsg = encodeURIComponent(messageText);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedMsg}&apikey=${apiKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'SatisfactionClientCERT-WhatsApp/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const resText = await res.text();
      const isOk =
        res.ok &&
        !resText.toLowerCase().includes('apikey invalid') &&
        !resText.toLowerCase().includes('error:');

      if (isOk) {
        return {
          success: true,
          method: 'callmebot_api',
          responseDetail: resText.slice(0, 150),
        };
      } else {
        return {
          success: false,
          method: 'callmebot_api',
          error: resText.slice(0, 200) || `CallMeBot error HTTP ${res.status}`,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        method: 'callmebot_api',
        error: e.message || 'CallMeBot network timeout',
      };
    }
  }

  // 2. Dispatch to custom Webhook / Gateway if configured
  if (config.webhookUrl && config.webhookUrl.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'SatisfactionClientCERT-WhatsApp/1.0',
      };
      if (config.webhookToken) {
        headers['Authorization'] = `Bearer ${config.webhookToken}`;
      }

      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipient: cleanPhone,
          phone: cleanPhone,
          message: messageText,
          text: messageText,
          timestamp: new Date().toISOString(),
          source: 'Satisfaction Client CERT',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        return {
          success: true,
          method: 'webhook',
          responseDetail: `Webhook HTTP ${res.status}`,
        };
      } else {
        return {
          success: false,
          method: 'webhook',
          error: `Webhook returned status ${res.status}`,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        method: 'webhook',
        error: e.message || 'Webhook unreachable',
      };
    }
  }

  // 3. If neither gateway is configured, notification is prepared for manual 1-click send via wa.me link
  return {
    success: false,
    method: 'direct_link',
    error: 'Pas de passerelle API connectée : envoi direct 1-clic requis via WhatsApp Web / Mobile',
  };
}

export async function dispatchWebhookIfConfigured(
  webhookUrl: string | undefined,
  payload: any
): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SatisfactionClientCERT-WhatsApp-Notifier/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (e) {
    console.warn('WhatsApp webhook dispatch error (non-blocking):', e);
    return false;
  }
}
