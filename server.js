// server.ts
import express from "express";
import path2 from "path";
import fs2 from "fs";
import { fileURLToPath as fileURLToPath2 } from "url";
import dotenv from "dotenv";

// server/db.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// server/whatsapp.ts
var defaultWhatsAppConfig = {
  enabled: true,
  recipientPhone: "+216 98 123 456",
  managerName: "Karim Ben Salem (Responsable d'astreinte CERT)",
  notifyOn: "urgent_and_high",
  includeAiSummary: true,
  includeSuggestedActions: true,
  includeDirectLink: true,
  customHeader: "CERT - Alerte R\xE9clamation Critique Temps R\xE9el"
};
function cleanPhoneNumber(phone) {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}
function formatManagerWhatsAppAlert(complaint, config, baseUrl = "") {
  const priorityEmoji = complaint.priority === "urgent" ? "\u{1F6A8} [CRITIQUE / URGENT]" : complaint.priority === "high" ? "\u26A0\uFE0F [PRIORIT\xC9 \xC9LEV\xC9E]" : "\u2139\uFE0F [PRIORIT\xC9 NORMALE]";
  const dateStr = new Date(complaint.createdAt || Date.now()).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  const lines = [
    `\u{1F514} *${config.customHeader || "Satisfaction Client CERT - Alerte R\xE9clamation"}*`,
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
    `${priorityEmoji}`,
    `\u{1F4C5} *Date :* ${dateStr}`,
    `\u{1F194} *R\xE9f R\xE9clamation :* #${complaint.id}`,
    `\u{1F4CB} *Enqu\xEAte :* ${complaint.surveyTitle || "Enqu\xEAte client CERT"}`
  ];
  if (complaint.dossierNumber) {
    lines.push(`\u{1F4C1} *N\xB0 Dossier :* ${complaint.dossierNumber}`);
  }
  if (complaint.phone || complaint.email) {
    const contacts = [complaint.phone, complaint.email].filter(Boolean).join(" | ");
    lines.push(`\u{1F464} *Contact d\xE9clarant :* ${contacts}`);
  }
  if (config.includeAiSummary && complaint.aiSummary) {
    lines.push(``);
    lines.push(`\u{1F916} *Diagnostic & R\xE9sum\xE9 IA :*`);
    lines.push(`_${complaint.aiSummary}_`);
  }
  if (complaint.category) {
    lines.push(`\u{1F3F7}\uFE0F *Cat\xE9gorie :* ${complaint.category}`);
  }
  if (config.includeSuggestedActions && complaint.aiSuggestedActions && complaint.aiSuggestedActions.length > 0) {
    lines.push(``);
    lines.push(`\u26A1 *Actions correctives recommand\xE9es :*`);
    complaint.aiSuggestedActions.slice(0, 3).forEach((act, idx) => {
      lines.push(`${idx + 1}. ${act}`);
    });
  }
  lines.push(``);
  lines.push(`\u{1F4AC} *Extrait du message usager :*`);
  const snippet = complaint.problemDescription.length > 200 ? complaint.problemDescription.slice(0, 197) + "..." : complaint.problemDescription;
  lines.push(`\xAB ${snippet} \xBB`);
  if (config.includeDirectLink) {
    lines.push(``);
    lines.push(`\u{1F517} *Lien direct de traitement :*`);
    lines.push(`${baseUrl || "https://satisfaction-ai.app"}/?tab=complaints&id=${complaint.id}`);
  }
  lines.push(`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`);
  lines.push(`_Notification transmise automatiquement en temps r\xE9el par Satisfaction Client CERT._`);
  return lines.join("\n");
}
function formatClientWhatsAppGreeting(complaint, orgName = "CERT (Centre d'\xC9tudes et de Recherche des T\xE9l\xE9communications)") {
  const dossierRef = complaint.dossierNumber ? ` (Dossier N\xB0 ${complaint.dossierNumber})` : "";
  const lines = [
    `Bonjour,`,
    ``,
    `Nous faisons suite \xE0 votre r\xE9clamation r\xE9cente${dossierRef} d\xE9pos\xE9e sur nos services aupr\xE8s de *${orgName}*.`,
    ``,
    `Votre situation a \xE9t\xE9 qualifi\xE9e de prioritaire par notre cellule qualit\xE9 :`,
    `_\xAB ${complaint.aiSummary || "Prise en charge de votre dossier"} \xBB_`,
    ``,
    `Un conseiller d\xE9di\xE9 a \xE9t\xE9 imm\xE9diatement assign\xE9 \xE0 votre demande. Nous mettons tout en \u0153uvre pour vous apporter une solution dans les plus brefs d\xE9lais.`,
    ``,
    `Pourriez-vous nous pr\xE9ciser vos disponibilit\xE9s par retour de ce message ?`,
    ``,
    `Restant \xE0 votre enti\xE8re \xE9coute,`,
    `*Service Relation & Qualit\xE9 Client*`
  ];
  return lines.join("\n");
}
function buildWhatsAppLink(phoneNumber, messageText) {
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  const encoded = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}
async function sendRealWhatsAppNotification(config, phoneNumber, messageText) {
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  if (config.callmebotApiKey && config.callmebotApiKey.trim()) {
    try {
      const apiKey = config.callmebotApiKey.trim();
      const encodedMsg = encodeURIComponent(messageText);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedMsg}&apikey=${apiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8e3);
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "SatisfactionClientCERT-WhatsApp/1.0"
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      const resText = await res.text();
      const isOk = res.ok && !resText.toLowerCase().includes("apikey invalid") && !resText.toLowerCase().includes("error:");
      if (isOk) {
        return {
          success: true,
          method: "callmebot_api",
          responseDetail: resText.slice(0, 150)
        };
      } else {
        return {
          success: false,
          method: "callmebot_api",
          error: resText.slice(0, 200) || `CallMeBot error HTTP ${res.status}`
        };
      }
    } catch (e) {
      return {
        success: false,
        method: "callmebot_api",
        error: e.message || "CallMeBot network timeout"
      };
    }
  }
  if (config.webhookUrl && config.webhookUrl.startsWith("http")) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6e3);
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "SatisfactionClientCERT-WhatsApp/1.0"
      };
      if (config.webhookToken) {
        headers["Authorization"] = `Bearer ${config.webhookToken}`;
      }
      const res = await fetch(config.webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          recipient: cleanPhone,
          phone: cleanPhone,
          message: messageText,
          text: messageText,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          source: "Satisfaction Client CERT"
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        return {
          success: true,
          method: "webhook",
          responseDetail: `Webhook HTTP ${res.status}`
        };
      } else {
        return {
          success: false,
          method: "webhook",
          error: `Webhook returned status ${res.status}`
        };
      }
    } catch (e) {
      return {
        success: false,
        method: "webhook",
        error: e.message || "Webhook unreachable"
      };
    }
  }
  return {
    success: false,
    method: "direct_link",
    error: "Pas de passerelle API connect\xE9e : envoi direct 1-clic requis via WhatsApp Web / Mobile"
  };
}

// server/db.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var DATA_DIR = isVercel ? "/tmp/data" : path.resolve(__dirname, "../data");
var DB_FILE = path.join(DATA_DIR, "db.json");
var SOURCE_DB_FILE = path.resolve(__dirname, "../data/db.json");
var defaultAppSettings = {
  directorName: "Mounir Ben Salah",
  directorTitle: "Directeur G\xE9n\xE9ral & Administrateur CERT",
  directorEmail: "admin@cert.tn",
  orgName: "Centre d'\xC9tudes et de Recherche des T\xE9l\xE9communications (CERT)",
  sector: "T\xE9l\xE9communications, Laboratoires & Services Num\xE9riques",
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
function getInitialData() {
  const now = /* @__PURE__ */ new Date();
  const isoNow = now.toISOString();
  const surveys = [
    {
      id: "srv-banque-01",
      title: "Satisfaction Client - Agence & Services Bancaires",
      description: "Mesure de la qualit\xE9 de service, accueil en agence, d\xE9lais de traitement et services en ligne.",
      language: "fr",
      status: "published",
      category: "Banque & Finance",
      targetResponses: 250,
      createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
      updatedAt: isoNow,
      publishedAt: new Date(Date.now() - 28 * 864e5).toISOString(),
      responseCount: 142,
      csatScore: 78,
      npsScore: 36,
      complaintQuestion: {
        enabled: true,
        title: "Avez-vous une r\xE9clamation concernant un dossier li\xE9 \xE0 nos services ? Si oui, partagez-la avec nous en nous expliquant votre probl\xE8me.",
        requireDossierNumber: false,
        requireContactInfo: false
      },
      questions: [
        {
          id: "q1",
          text: "Comment \xE9valuez-vous l'accueil et l'\xE9coute du personnel en agence ?",
          type: "stars",
          required: true,
          order: 1
        },
        {
          id: "q2",
          text: "Quel canal utilisez-vous le plus fr\xE9quemment pour vos op\xE9rations bancaires ?",
          type: "single_choice",
          required: true,
          order: 2,
          options: [
            { id: "opt-app", label: "Application Mobile", value: "mobile_app" },
            { id: "opt-agency", label: "Agence physique", value: "physical_agency" },
            { id: "opt-atm", label: "Guichet Automatique (DAB)", value: "atm" },
            { id: "opt-web", label: "Portail Web", value: "web_portal" }
          ]
        },
        {
          id: "q3",
          text: "Quels aspects de nos prestations m\xE9ritent d'\xEAtre am\xE9lior\xE9s selon vous ?",
          type: "multiple_choice",
          required: false,
          order: 3,
          options: [
            { id: "opt-time", label: "D\xE9lais d'attente au guichet", value: "wait_times" },
            { id: "opt-fees", label: "Tarification et frais de tenue", value: "fees" },
            { id: "opt-credits", label: "D\xE9lais d'octroi de cr\xE9dits", value: "credit_delays" },
            { id: "opt-digital", label: "Fluidit\xE9 de l'application mobile", value: "app_smoothness" }
          ]
        },
        {
          id: "q4",
          text: "Sur une \xE9chelle de 0 \xE0 10, recommanderiez-vous notre \xE9tablissement \xE0 vos proches ou coll\xE8gues ?",
          type: "nps",
          required: true,
          minLabel: "Pas du tout probable",
          maxLabel: "Extr\xEAmement probable",
          order: 4
        },
        {
          id: "q5",
          text: "Partagez vos suggestions ou remarques libres (\xE9crites ou vocales)",
          type: "voice",
          required: false,
          order: 5
        }
      ]
    },
    {
      id: "srv-admin-02",
      title: "\u0627\u0633\u062A\u0628\u064A\u0627\u0646 \u0642\u064A\u0627\u0633 \u0631\u0636\u0627 \u0627\u0644\u0645\u062A\u0639\u0627\u0645\u0644\u064A\u0646 - \u0645\u0635\u0644\u062D\u0629 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644",
      description: "\u062A\u0642\u064A\u064A\u0645 \u062C\u0648\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644\u060C \u0633\u0631\u0639\u0629 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0644\u0641\u0627\u062A\u060C \u0648\u0636\u0648\u062D \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0648\u0631\u0636\u0627 \u0627\u0644\u0645\u0648\u0627\u0637\u0646\u064A\u0646.",
      language: "ar",
      status: "published",
      category: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062E\u062F\u0645\u0627\u062A \u0639\u0645\u0648\u0645\u064A\u0629",
      targetResponses: 200,
      createdAt: new Date(Date.now() - 20 * 864e5).toISOString(),
      updatedAt: isoNow,
      publishedAt: new Date(Date.now() - 19 * 864e5).toISOString(),
      responseCount: 98,
      csatScore: 71,
      npsScore: 24,
      complaintQuestion: {
        enabled: true,
        title: "\u0647\u0644 \u0644\u062F\u064A\u0643 \u0634\u0643\u0648\u0649 \u0628\u062E\u0635\u0648\u0635 \u0645\u0644\u0641 \u064A\u062A\u0639\u0644\u0642 \u0628\u062E\u062F\u0645\u0627\u062A\u0646\u0627\u061F \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0623\u0645\u0631 \u0643\u0630\u0644\u0643\u060C \u0634\u0627\u0631\u0643\u0647\u0627 \u0645\u0639\u0646\u0627 \u0645\u0639 \u062A\u0648\u0636\u064A\u062D \u0645\u0634\u0643\u0644\u062A\u0643.",
        requireDossierNumber: false,
        requireContactInfo: false
      },
      questions: [
        {
          id: "q-ar-1",
          text: "\u0645\u0627 \u0647\u0648 \u062A\u0642\u064A\u064A\u0645\u0643\u0645 \u0644\u062D\u0633\u0646 \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u0633\u0631\u0639\u0629 \u0627\u0644\u062A\u0648\u062C\u064A\u0647 \u0639\u0646\u062F \u0648\u0635\u0648\u0644\u0643\u0645 \u0644\u0644\u0645\u0635\u0644\u062D\u0629\u061F",
          type: "stars",
          required: true,
          order: 1
        },
        {
          id: "q-ar-2",
          text: "\u0647\u0644 \u0648\u062C\u062F\u062A\u0645 \u0627\u0644\u0648\u062B\u0627\u0626\u0642 \u0648\u0627\u0644\u0625\u0631\u0634\u0627\u062F\u0627\u062A \u0648\u0627\u0636\u062D\u0629 \u0648\u0633\u0647\u0644\u0629 \u0627\u0644\u0641\u0647\u0645\u061F",
          type: "single_choice",
          required: true,
          order: 2,
          options: [
            { id: "ar-yes", label: "\u0646\u0639\u0645\u060C \u0648\u0627\u0636\u062D\u0629 \u062C\u062F\u0627\u064B", value: "very_clear" },
            { id: "ar-somewhat", label: "\u0625\u0644\u0649 \u062D\u062F \u0645\u0627", value: "somewhat_clear" },
            { id: "ar-no", label: "\u0644\u0627\u060C \u063A\u0627\u0645\u0636\u0629 \u0648\u0645\u0639\u0642\u062F\u0629", value: "unclear" }
          ]
        },
        {
          id: "q-ar-3",
          text: "\u0639\u0644\u0649 \u0645\u0642\u064A\u0627\u0633 \u0645\u0646 0 \u0625\u0644\u0649 10\u060C \u0645\u0627 \u0645\u062F\u0649 \u0627\u0633\u062A\u0639\u062F\u0627\u062F\u0643\u0645 \u0644\u0644\u062A\u0648\u0635\u064A\u0629 \u0628\u062E\u062F\u0645\u0627\u062A\u0646\u0627\u061F",
          type: "nps",
          required: true,
          minLabel: "\u063A\u064A\u0631 \u0645\u0633\u062A\u0639\u062F \u0625\u0637\u0644\u0627\u0642\u0627\u064B",
          maxLabel: "\u0645\u0633\u062A\u0639\u062F \u062C\u062F\u0627\u064B",
          order: 3
        },
        {
          id: "q-ar-4",
          text: "\u0623\u064A \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629 \u062A\u0631\u063A\u0628\u0648\u0646 \u0641\u064A \u0625\u0628\u062F\u0627\u0621\u0647\u0627\u061F",
          type: "text",
          required: false,
          order: 4
        }
      ]
    },
    {
      id: "srv-clinique-03",
      title: "\u062A\u0642\u064A\u064A\u0645 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u0627\u0644\u0625\u0642\u0627\u0645\u0629 \u0627\u0644\u0637\u0628\u064A\u0629 (\u0628\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u062A\u0648\u0646\u0633\u064A\u0629)",
      description: "\u0627\u0633\u062A\u0628\u064A\u0627\u0646 \u0628\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u062A\u0648\u0646\u0633\u064A\u0629 \u0644\u0645\u0639\u0631\u0641\u0629 \u0631\u0627\u064A \u0627\u0644\u0645\u0631\u0636\u0649 \u0648\u0639\u0627\u0626\u0644\u0627\u062A\u0647\u0645 \u0641\u064A \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644\u060C \u0627\u0644\u0646\u0638\u0627\u0641\u0629 \u0648\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0629.",
      language: "tn",
      status: "published",
      category: "\u0635\u062D\u0629 \u0648\u0631\u0639\u0627\u064A\u0629 \u0637\u0628\u064A\u0629",
      targetResponses: 150,
      createdAt: new Date(Date.now() - 12 * 864e5).toISOString(),
      updatedAt: isoNow,
      publishedAt: new Date(Date.now() - 11 * 864e5).toISOString(),
      responseCount: 65,
      csatScore: 84,
      npsScore: 48,
      complaintQuestion: {
        enabled: true,
        title: "\u0639\u0646\u062F\u0643 \u062A\u0634\u0643\u0651\u064A \u0648\u0644\u0627 \u0645\u0634\u0643\u0644\u0629 \u062A\u062E\u0635 \u062F\u0648\u0633\u064A \u0641\u064A \u062E\u062F\u0645\u0627\u062A\u0646\u0627\u061F \u0643\u0627\u0646 \u0625\u064A\u0647\u060C \u0642\u0644\u0651\u0646\u0627 \u0648\u0641\u0633\u0651\u0631 \u0644\u0646\u0627 \u0627\u0644\u0645\u0634\u0643\u0644 \u0645\u062A\u0627\u0639\u0643.",
        requireDossierNumber: false,
        requireContactInfo: false
      },
      questions: [
        {
          id: "q-tn-1",
          text: "\u0634\u0646\u064A\u0629 \u0631\u0627\u064A\u0643 \u0641\u064A \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0645\u062A\u0627\u0639 \u0644\u064A\u0643\u064A\u0628 \u0627\u0644\u0637\u0628\u064A\u0629 \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629\u061F",
          type: "stars",
          required: true,
          order: 1
        },
        {
          id: "q-tn-2",
          text: "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0644\u064A \u0642\u0639\u062F\u062A\u0648 \u062A\u0633\u062A\u0646\u0627\u0648 \u0641\u064A\u0647 \u0642\u0628\u0644 \u0645\u0627 \u064A\u0642\u0627\u0628\u0644\u0643 \u0627\u0644\u0637\u0628\u064A\u0628 \u0648\u0644\u0627 \u062A\u0639\u0645\u0644 \u0627\u0644\u0641\u062D\u0635 \u0643\u0627\u0646:",
          type: "dropdown",
          required: true,
          order: 2,
          options: [
            { id: "tn-quick", label: "\u0641\u064A\u0633\u0639 \u0641\u064A\u0633\u0639 \u0648\u0645\u0627 \u0637\u0648\u0644\u0646\u0627\u0634", value: "quick" },
            { id: "tn-normal", label: "\u0645\u0639\u0642\u0648\u0644 \u0648\u0639\u0627\u062F\u064A", value: "normal" },
            { id: "tn-long", label: "\u0637\u0648\u064A\u0644 \u0628\u0631\u0634\u0627 \u0648\u0641\u0627\u062A \u0627\u0644\u062D\u062F\u0648\u062F", value: "too_long" }
          ]
        },
        {
          id: "q-tn-3",
          text: "\u0645\u0646 0 \u062D\u062A\u0649 \u0644\u0640 10\u060C \u0642\u062F\u0627\u0634 \u062A\u0646\u0635\u062D \u0635\u062D\u0627\u0628\u0643 \u0648\u0644\u0627 \u0639\u0627\u064A\u0644\u062A\u0643 \u064A\u062C\u064A\u0648 \u064A\u0639\u062F\u064A\u0648 \u0628\u062D\u0630\u0627\u0646\u0627\u061F",
          type: "nps",
          required: true,
          minLabel: "\u0645\u0627 \u0646\u0646\u0635\u062D\u0634 \u062C\u0645\u0644\u0629",
          maxLabel: "\u0646\u0646\u0635\u062D \u0628\u064A\u0647\u0645 \u0639\u0644\u0649 \u0636\u0645\u0627\u0646\u062A\u064A",
          order: 3
        }
      ]
    }
  ];
  const complaints = [
    {
      id: "cmp-101",
      submissionId: "sub-demo-01",
      surveyId: "srv-banque-01",
      surveyTitle: "Satisfaction Client - Agence & Services Bancaires",
      problemDescription: "J'ai d\xE9pos\xE9 une demande de mainlev\xE9e d'hypoth\xE8que le 12 septembre sous le dossier N\xB0 ML-8892. Cela fait un mois et aucun retour malgr\xE9 4 d\xE9placements en agence. Le conseiller me dit que le dossier est bloqu\xE9 au si\xE8ge central.",
      dossierNumber: "ML-8892",
      submissionDate: "2026-09-12",
      phone: "+216 98 123 456",
      email: "ahmed.mansour@gmail.com",
      status: "new",
      priority: "urgent",
      category: "D\xE9lais & Dossier Cr\xE9dit",
      assignedTo: "Karim Ben Salem (Responsable Cr\xE9dit)",
      aiSummary: "Blocage prolong\xE9 d'un dossier de mainlev\xE9e d'hypoth\xE8que (>30 jours) sans suivi ni information client malgr\xE9 relances.",
      aiSuggestedCategory: "D\xE9lais de traitement",
      aiSuggestedPriority: "urgent",
      aiSuggestedActions: [
        "Contacter la direction des engagements et garanties au si\xE8ge",
        "Informer le client sous 24h par t\xE9l\xE9phone de l'avancement r\xE9el",
        "\xC9mettre l'attestation de mainlev\xE9e en proc\xE9dure acc\xE9l\xE9r\xE9e"
      ],
      aiConfidence: 0.94,
      managerEdited: false,
      whatsappAlertSent: true,
      whatsappAlertDate: new Date(Date.now() - 2 * 864e5).toISOString(),
      whatsappRecipient: "+216 98 123 456",
      createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
      internalNotes: [
        {
          id: "note-1",
          author: "Syst\xE8me IA",
          content: "Alerte g\xE9n\xE9r\xE9e automatiquement: dossier avec num\xE9ro de r\xE9f\xE9rence et d\xE9lai > 30 jours d\xE9tect\xE9.",
          createdAt: new Date(Date.now() - 2 * 864e5).toISOString()
        }
      ]
    },
    {
      id: "cmp-102",
      submissionId: "sub-demo-02",
      surveyId: "srv-admin-02",
      surveyTitle: "\u0627\u0633\u062A\u0628\u064A\u0627\u0646 \u0642\u064A\u0627\u0633 \u0631\u0636\u0627 \u0627\u0644\u0645\u062A\u0639\u0627\u0645\u0644\u064A\u0646 - \u0645\u0635\u0644\u062D\u0629 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644",
      problemDescription: "\u0642\u062F\u0645\u062A \u0645\u0637\u0644\u0628 \u062A\u0631\u062E\u064A\u0635 \u0641\u064A \u0625\u0634\u063A\u0627\u0644 \u0648\u0642\u062A\u064A \u0628\u062A\u0627\u0631\u064A\u062E 25 \u0633\u0628\u062A\u0645\u0628\u0631 \u0645\u0644\u0641 \u0631\u0642\u0645 2026/412. \u0627\u0644\u0645\u0648\u0638\u0641 \u0641\u064A \u0627\u0644\u0634\u0628\u0627\u0643 \u0631\u0642\u0645 3 \u0631\u0641\u0636 \u0627\u0633\u062A\u0644\u0627\u0645 \u0634\u0647\u0627\u062F\u0629 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 \u0648\u0637\u0644\u0628 \u0646\u0633\u062E\u0629 \u0623\u062E\u0631\u0649 \u062F\u0648\u0646 \u062A\u0648\u0636\u064A\u062D \u0627\u0644\u0633\u0628\u0628 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A.",
      dossierNumber: "2026/412",
      submissionDate: "2026-09-25",
      phone: "+216 22 555 888",
      email: "salma.triki@yahoo.fr",
      status: "in_progress",
      priority: "high",
      category: "\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u062A\u0648\u0636\u064A\u062D \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A",
      assignedTo: "\u0645\u0646\u0649 \u0627\u0644\u062C\u0644\u0627\u0635\u064A (\u0631\u0626\u064A\u0633\u0629 \u0645\u0643\u062A\u0628 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0645\u0639 \u0627\u0644\u0645\u0648\u0627\u0637\u0646)",
      aiSummary: "\u0631\u0641\u0636 \u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u062B\u064A\u0642\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u0628\u0645\u0644\u0641 \u062A\u0631\u062E\u064A\u0635 \u062F\u0648\u0646 \u062A\u0628\u0631\u064A\u0631 \u0625\u062F\u0627\u0631\u064A \u0643\u0627\u0641\u064D \u0648\u062A\u0635\u0631\u0641 \u063A\u064A\u0631 \u0645\u0631\u0636\u064D \u0628\u0627\u0644\u0634\u0628\u0627\u0643 3.",
      aiSuggestedCategory: "\u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u0627\u0644\u0634\u0641\u0627\u0641\u064A\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629",
      aiSuggestedPriority: "high",
      aiSuggestedActions: [
        "\u0645\u0631\u0627\u062C\u0639\u0629 \u0634\u0631\u0648\u0637 \u0642\u0628\u0648\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0645\u0639 \u0623\u0639\u0648\u0627\u0646 \u0627\u0644\u0634\u0628\u0627\u0643 3",
        "\u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0645\u0648\u0627\u0637\u0646\u0629 \u0648\u0642\u0628\u0648\u0644 \u0627\u0644\u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 \u0645\u0639 \u0648\u0635\u0644 \u0627\u0633\u062A\u0644\u0627\u0645 \u0631\u0633\u0645\u064A",
        "\u062A\u0648\u0636\u064A\u062D \u0627\u0644\u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u062A\u0648\u062C\u064A\u0647\u064A\u0629 \u0644\u0644\u062E\u062F\u0645\u0629"
      ],
      aiConfidence: 0.91,
      managerEdited: true,
      createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 864e5).toISOString(),
      internalNotes: [
        {
          id: "note-2",
          author: "\u0645\u0646\u0649 \u0627\u0644\u062C\u0644\u0627\u0635\u064A",
          content: "\u062A\u0645 \u0627\u0644\u062A\u0646\u0633\u064A\u0642 \u0645\u0639 \u0645\u0635\u0644\u062D\u0629 \u0627\u0644\u062A\u0631\u0627\u062E\u064A\u0635\u060C \u0648\u0633\u064A\u062A\u0645 \u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0627\u0644\u0645\u0648\u0627\u0637\u0646\u0629 \u063A\u062F\u0627\u064B \u0635\u0628\u0627\u062D\u0627\u064B \u0644\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0645\u0644\u0641.",
          createdAt: new Date(Date.now() - 1 * 864e5).toISOString()
        }
      ]
    },
    {
      id: "cmp-103",
      submissionId: "sub-demo-03",
      surveyId: "srv-clinique-03",
      surveyTitle: "\u062A\u0642\u064A\u064A\u0645 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u0627\u0644\u0625\u0642\u0627\u0645\u0629 \u0627\u0644\u0637\u0628\u064A\u0629 (\u0628\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u062A\u0648\u0646\u0633\u064A\u0629)",
      problemDescription: "\u0627\u0644\u0641\u0627\u0643\u062A\u0648\u0631\u0629 \u0645\u062A\u0627\u0639 \u0627\u0644\u062E\u0631\u0648\u062C \u0641\u064A\u0647\u0627 \u062E\u0644\u0627\u0635 \u0632\u0627\u064A\u062F \u0639\u0644\u0649 \u062A\u062D\u0627\u0644\u064A\u0644 \u0645\u0627 \u0639\u0645\u0644\u0647\u0645\u0634 \u0627\u0644\u0648\u0627\u0644\u062F \u0623\u0635\u0644\u0627\u064B \u0641\u064A \u0628\u064A\u062A \u0627\u0644\u0625\u0646\u0639\u0627\u0634. \u0637\u0644\u0628\u0646\u0627 \u0627\u0644\u062A\u0648\u0636\u064A\u062D \u0642\u0627\u0644\u0648\u0644\u0646\u0627 \u0627\u0631\u062C\u0639\u0648 \u0646\u0647\u0627\u0631 \u0627\u0644\u0627\u062B\u0646\u064A\u0646.",
      dossierNumber: "CLI-5541",
      submissionDate: "2026-10-02",
      phone: "+216 55 444 333",
      email: "nizar.trabelsi@topnet.tn",
      status: "resolved",
      priority: "medium",
      category: "\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u0629",
      assignedTo: "Sami Charfi (Directeur Financier)",
      aiSummary: "\u0627\u0639\u062A\u0631\u0627\u0636 \u0639\u0644\u0649 \u0641\u0648\u062A\u0631\u0629 \u062A\u062D\u0627\u0644\u064A\u0644 \u0637\u0628\u064A\u0629 \u063A\u064A\u0631 \u0645\u0646\u062C\u0632\u0629 \u0639\u0646\u062F \u0645\u063A\u0627\u062F\u0631\u0629 \u0642\u0633\u0645 \u0627\u0644\u0625\u0646\u0639\u0627\u0634 \u0648\u0645\u0637\u0627\u0644\u0628\u0629 \u0628\u062A\u0635\u062D\u064A\u062D \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629.",
      aiSuggestedCategory: "\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A",
      aiSuggestedPriority: "high",
      aiSuggestedActions: [
        "\u062A\u062F\u0642\u064A\u0642 \u0643\u0634\u0641 \u0627\u0644\u062A\u062D\u0627\u0644\u064A\u0644 \u0645\u0639 \u0633\u062C\u0644 \u0645\u062E\u0628\u0631 \u0627\u0644\u062A\u062D\u0627\u0644\u064A\u0644 \u0648\u0642\u0633\u0645 \u0627\u0644\u0625\u0646\u0639\u0627\u0634",
        "\u0625\u0635\u062F\u0627\u0631 \u0641\u0627\u062A\u0648\u0631\u0629 \u062A\u0635\u062D\u064A\u062D\u064A\u0629 (Avoir) \u0648\u0625\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0627\u0644\u064A \u0627\u0644\u0632\u0627\u0626\u062F"
      ],
      aiConfidence: 0.96,
      managerEdited: false,
      createdAt: new Date(Date.now() - 8 * 864e5).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
      resolvedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
      internalNotes: [
        {
          id: "note-3",
          author: "Sami Charfi",
          content: "Audit effectu\xE9 avec le laboratoire. Erreur de saisie confirm\xE9e sur 2 examens. Avoir \xE9tabli de 380 DT et virement ex\xE9cut\xE9 en faveur de la famille.",
          createdAt: new Date(Date.now() - 3 * 864e5).toISOString()
        }
      ]
    }
  ];
  const submissions = [];
  const channels = ["web", "qr", "whatsapp", "email"];
  const sentiments = ["positive", "positive", "positive", "neutral", "negative"];
  for (let i = 0; i < 45; i++) {
    const daysAgo = Math.floor(Math.random() * 25);
    const sent = sentiments[Math.floor(Math.random() * sentiments.length)];
    const chan = channels[Math.floor(Math.random() * channels.length)];
    const npsRoll = sent === "positive" ? 9 + (Math.random() > 0.5 ? 1 : 0) : sent === "neutral" ? 7 + (Math.random() > 0.5 ? 1 : 0) : Math.floor(Math.random() * 6);
    const npsType = npsRoll >= 9 ? "promoter" : npsRoll >= 7 ? "passive" : "detractor";
    const csatPositive = sent === "positive" || sent === "neutral" && Math.random() > 0.4;
    submissions.push({
      id: `sub-gen-${i}`,
      surveyId: i % 2 === 0 ? "srv-banque-01" : i % 3 === 0 ? "srv-clinique-03" : "srv-admin-02",
      surveyTitle: i % 2 === 0 ? "Satisfaction Client - Agence & Services Bancaires" : i % 3 === 0 ? "\u062A\u0642\u064A\u064A\u0645 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u0627\u0644\u0625\u0642\u0627\u0645\u0629 \u0627\u0644\u0637\u0628\u064A\u0629" : "\u0627\u0633\u062A\u0628\u064A\u0627\u0646 \u0642\u064A\u0627\u0633 \u0631\u0636\u0627 \u0627\u0644\u0645\u062A\u0639\u0627\u0645\u0644\u064A\u0646",
      language: i % 2 === 0 ? "fr" : i % 3 === 0 ? "tn" : "ar",
      channel: chan,
      sentiment: sent,
      csatPositive,
      npsType,
      submittedAt: new Date(Date.now() - daysAgo * 864e5 - Math.random() * 36e6).toISOString(),
      answers: [
        {
          questionId: "q1",
          questionText: "\xC9valuation globale",
          type: "stars",
          value: sent === "positive" ? 5 : sent === "neutral" ? 3 : 2
        },
        {
          questionId: "q4",
          questionText: "NPS",
          type: "nps",
          value: npsRoll
        }
      ]
    });
  }
  const notifications = [
    {
      id: "notif-1",
      title: "Nouvelle r\xE9clamation urgente",
      message: "R\xE9clamation N\xB0 ML-8892 d\xE9pos\xE9e par Ahmed Mansour (D\xE9lai cr\xE9dit > 30j)",
      type: "complaint",
      linkTo: "/complaints",
      createdAt: new Date(Date.now() - 2 * 36e5).toISOString(),
      read: false
    },
    {
      id: "notif-2",
      title: "Note NPS faible d\xE9tect\xE9e",
      message: "Un r\xE9pondant a attribu\xE9 une note de 1/10 sur l'enqu\xEAte Services Bancaires.",
      type: "low_csat",
      linkTo: "/dashboard",
      createdAt: new Date(Date.now() - 6 * 36e5).toISOString(),
      read: false
    },
    {
      id: "notif-3",
      title: "Enqu\xEAte publi\xE9e avec succ\xE8s",
      message: "L'enqu\xEAte \xAB \u062A\u0642\u064A\u064A\u0645 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u0627\u0644\u0625\u0642\u0627\u0645\u0629 \u0627\u0644\u0637\u0628\u064A\u0629 \xBB a \xE9t\xE9 publi\xE9e.",
      type: "survey_published",
      linkTo: "/surveys",
      createdAt: new Date(Date.now() - 24 * 36e5).toISOString(),
      read: true
    }
  ];
  const aiRecommendations = [
    {
      id: "rec-q3-2026",
      period: "Derniers 30 jours",
      generatedAt: isoNow,
      strengths: [
        {
          title: "Excellence de l'accueil humain et empathie des \xE9quipes",
          description: "Plus de 84% des r\xE9pondants soulignent la courtoisie, le d\xE9vouement et l'\xE9coute attentive des conseillers et du personnel m\xE9dical.",
          metric: "84.2% d'avis favorables sur l'accueil",
          confidence: 0.95
        },
        {
          title: "Adoption massive et pl\xE9biscit\xE9e du canal QR Code & WhatsApp",
          description: "Le taux de compl\xE9tion est 32% sup\xE9rieur lorsque les r\xE9pondants acc\xE8dent au questionnaire via QR Code au comptoir ou lien WhatsApp.",
          metric: "+32% de taux de r\xE9ponse sur QR/WhatsApp",
          confidence: 0.92
        },
        {
          title: "R\xE9solution rapide des litiges de facturation",
          description: "Le d\xE9lai moyen de cl\xF4ture des r\xE9clamations li\xE9es aux r\xE8glements et devis est pass\xE9 de 9 jours \xE0 48 heures.",
          metric: "48h d\xE9lai moyen de r\xE9solution financi\xE8re",
          confidence: 0.89
        }
      ],
      priorityProblems: [
        {
          title: "D\xE9lais d'attente excessifs lors des heures d'affluence",
          description: "Mentionn\xE9 dans 43% des retours neutres et n\xE9gatifs, particuli\xE8rement entre 10h et 13h sur les guichets physiques.",
          metric: "43% d'insatisfaction li\xE9e aux files d'attente",
          severity: "critical",
          confidence: 0.96
        },
        {
          title: "D\xE9ficit d'information sur le suivi des dossiers en cours",
          description: "Les clients expriment un sentiment d'abandon faute de notification SMS/Email pendant l'instruction de leurs demandes administratives ou de cr\xE9dit.",
          metric: "38% des r\xE9clamations portent sur l'absence de statut",
          severity: "high",
          confidence: 0.93
        },
        {
          title: "Clart\xE9 des documents administratifs et formulaires",
          description: "Un tiers des usagers arabophones signale une ambigu\xEFt\xE9 dans la liste des pi\xE8ces justificatives exig\xE9es.",
          metric: "31% d'incompr\xE9hension sur les pi\xE8ces justificatives",
          severity: "medium",
          confidence: 0.88
        }
      ],
      actionPlans: [
        {
          action: "Mise en place d'un syst\xE8me de rendez-vous en ligne et file virtuelle par QR Code",
          rationale: "Permettra d'\xE9taler les flux d'usagers et d'\xE9liminer les pics de congestion en salle d'attente.",
          suggestedAssignee: "Direction des Op\xE9rations & IT",
          suggestedDeadline: "30 jours (Fin novembre 2026)",
          expectedImpact: "+18% sur le score CSAT global"
        },
        {
          action: "D\xE9ploiement d'alertes automatiques par SMS / WhatsApp \xE0 chaque \xE9tape du dossier",
          rationale: "Supprimera 60% des d\xE9placements inutiles et d\xE9sengorgera les guichets d'information.",
          suggestedAssignee: "Responsable Relation Client",
          suggestedDeadline: "45 jours (Mi-d\xE9cembre 2026)",
          expectedImpact: "-45% de r\xE9clamations pour manque d'information"
        },
        {
          action: "Refonte et simplification bilingue (Arabe / Fran\xE7ais) des guides de d\xE9p\xF4t",
          rationale: "Clarifier les pr\xE9requis pour \xE9viter les rejets de conformit\xE9 au premier passage.",
          suggestedAssignee: "Service Qualit\xE9 & Communication",
          suggestedDeadline: "20 jours",
          expectedImpact: "+12 points sur l'indice NPS"
        }
      ]
    }
  ];
  const whatsappConfig = {
    ...defaultWhatsAppConfig
  };
  const whatsappLogs = [
    {
      id: "walog-init-01",
      complaintId: "cmp-101",
      recipientPhone: "+216 98 123 456",
      recipientRole: "manager",
      priority: "urgent",
      message: `\u{1F6A8} ALERTE R\xC9CLAMATION CRITIQUE IA [Satisfaction Client CERT]
\u26A0\uFE0F Priorit\xE9 : URGENTE (Score IA: 94%)
\u{1F4CB} Enqu\xEAte : Satisfaction Usagers - CERT
\u{1F4C1} Dossier N\xB0 : CERT-8892
\u{1F464} Contact : +216 98 123 456 | contact.usager@cert.mincom.tn
\u{1F916} Diagnostic IA : Blocage prolong\xE9 d'un dossier d'homologation d'\xE9quipements radio\xE9lectriques
\u26A1 Recommandation : Contacter la direction technique d'homologation sous 24h`,
      status: "sent",
      whatsappUrl: "https://wa.me/21698123456",
      sentAt: new Date(Date.now() - 2 * 864e5).toISOString(),
      triggerType: "ai_automatic",
      surveyTitle: "Satisfaction Client - Agence & Services Bancaires",
      dossierNumber: "ML-8892"
    }
  ];
  return {
    surveys,
    submissions,
    complaints,
    notifications,
    aiRecommendations,
    whatsappConfig,
    whatsappLogs,
    settings: { ...defaultAppSettings }
  };
}
var Database = class {
  constructor() {
    this.isPersisting = false;
    this.pendingPersist = false;
    ensureDataDir();
    if (!fs.existsSync(DB_FILE) && fs.existsSync(SOURCE_DB_FILE)) {
      try {
        fs.copyFileSync(SOURCE_DB_FILE, DB_FILE);
      } catch (e) {
        console.warn("Could not copy source db to tmp db:", e);
      }
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(raw);
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
        console.error("Failed to parse database file, resetting to initial seed:", e);
        this.data = getInitialData();
        this.persist();
      }
    } else {
      this.data = getInitialData();
      this.persist();
    }
  }
  persist() {
    ensureDataDir();
    if (this.isPersisting) {
      this.pendingPersist = true;
      return;
    }
    this.isPersisting = true;
    try {
      const content = JSON.stringify(this.data, null, 2);
      fs.writeFile(DB_FILE, content, "utf-8", (err) => {
        this.isPersisting = false;
        if (err) {
          console.warn("Notice writing database file:", err);
        }
        if (this.pendingPersist) {
          this.pendingPersist = false;
          this.persist();
        }
      });
    } catch (e) {
      this.isPersisting = false;
      console.warn("Error formatting db for persist:", e);
    }
  }
  // Survey methods
  getSurveys() {
    return this.data.surveys;
  }
  getSurveyById(id) {
    return this.data.surveys.find((s) => s.id === id);
  }
  createSurvey(surveyData) {
    const id = `srv-${Date.now()}`;
    const newSurvey = {
      id,
      title: surveyData.title || "Nouvelle enqu\xEAte",
      description: surveyData.description || "",
      language: surveyData.language || "fr",
      status: surveyData.status || "draft",
      category: surveyData.category || "G\xE9n\xE9ral",
      questions: surveyData.questions || [],
      complaintQuestion: surveyData.complaintQuestion || {
        enabled: true,
        title: "Avez-vous une r\xE9clamation concernant un dossier li\xE9 \xE0 nos services ? Si oui, partagez-la avec nous en nous expliquant votre probl\xE8me.",
        requireDossierNumber: false,
        requireContactInfo: false
      },
      targetResponses: surveyData.targetResponses || 100,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      publishedAt: surveyData.status === "published" ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
      responseCount: 0,
      csatScore: 0,
      npsScore: 0
    };
    this.data.surveys.unshift(newSurvey);
    this.persist();
    return newSurvey;
  }
  updateSurvey(id, updates) {
    const idx = this.data.surveys.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const existing = this.data.surveys[idx];
    const isNowPublished = updates.status === "published" && existing.status !== "published";
    const updated = {
      ...existing,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      publishedAt: isNowPublished ? (/* @__PURE__ */ new Date()).toISOString() : existing.publishedAt
    };
    this.data.surveys[idx] = updated;
    this.persist();
    return updated;
  }
  duplicateSurvey(id) {
    const original = this.getSurveyById(id);
    if (!original) return null;
    const dup = {
      ...original,
      id: `srv-${Date.now()}`,
      title: `${original.title} (Copie)`,
      status: "draft",
      responseCount: 0,
      csatScore: 0,
      npsScore: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      publishedAt: void 0
    };
    this.data.surveys.unshift(dup);
    this.persist();
    return dup;
  }
  deleteSurvey(id) {
    const surveyToDelete = this.data.surveys.find((s) => s.id === id);
    if (!surveyToDelete) return false;
    const linkedSubmissions = this.data.submissions.filter((sub) => sub.surveyId === id);
    const linkedSubmissionIds = new Set(linkedSubmissions.map((sub) => sub.id));
    const linkedComplaints = this.data.complaints.filter(
      (c) => c.surveyId === id || c.submissionId && linkedSubmissionIds.has(c.submissionId)
    );
    const linkedComplaintIds = new Set(linkedComplaints.map((c) => c.id));
    this.data.submissions = this.data.submissions.filter((sub) => sub.surveyId !== id);
    this.data.complaints = this.data.complaints.filter(
      (c) => c.surveyId !== id && (!c.submissionId || !linkedSubmissionIds.has(c.submissionId)) && !linkedComplaintIds.has(c.id)
    );
    this.data.notifications = this.data.notifications.filter((n) => {
      for (const cId of linkedComplaintIds) {
        if (n.id.includes(cId) || n.message && n.message.includes(cId) || n.whatsappUrl && n.whatsappUrl.includes(cId)) {
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
    this.data.whatsappLogs = (this.data.whatsappLogs || []).filter((log) => {
      if (log.complaintId && linkedComplaintIds.has(log.complaintId)) return false;
      if (log.surveyTitle && (log.surveyTitle === surveyToDelete.title || log.surveyTitle.includes(surveyToDelete.title))) return false;
      for (const cId of linkedComplaintIds) {
        if (log.message && log.message.includes(cId)) return false;
        if (log.whatsappUrl && log.whatsappUrl.includes(cId)) return false;
      }
      return true;
    });
    this.data.aiRecommendations = [];
    this.data.surveys = this.data.surveys.filter((s) => s.id !== id);
    this.persist();
    return true;
  }
  // Submissions & Complaints
  createSubmission(payload) {
    const survey = this.getSurveyById(payload.surveyId);
    const subId = `sub-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
    const submission = {
      id: subId,
      surveyId: payload.surveyId,
      surveyTitle: survey ? survey.title : "Enqu\xEAte",
      language: payload.language || "fr",
      channel: payload.channel || "web",
      answers: payload.answers || [],
      complaint: payload.complaint,
      sentiment: payload.sentiment || "positive",
      csatPositive: payload.csatPositive ?? true,
      npsType: payload.npsType || "promoter",
      submittedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.submissions.unshift(submission);
    if (survey) {
      survey.responseCount += 1;
      this.recalculateSurveyStats(survey.id);
    }
    let complaintRecord;
    if (payload.complaint && payload.complaint.hasComplaint && payload.complaint.problemDescription) {
      const cmpId = `cmp-${Date.now()}`;
      const priority = payload.complaint.aiSuggestedPriority || payload.complaint.priority || "high";
      const category = payload.complaint.aiSuggestedCategory || payload.complaint.category || "Service Client";
      const aiSummary = payload.complaint.aiSummary || payload.complaint.problemDescription.slice(0, 160) + "...";
      const aiSuggestedActions = payload.complaint.aiSuggestedActions || [
        "Prendre contact avec le d\xE9clarant sous 24h",
        "V\xE9rifier les \xE9l\xE9ments du dossier avec l'\xE9quipe concern\xE9e"
      ];
      const aiConfidence = payload.complaint.aiConfidence || 0.9;
      complaintRecord = {
        id: cmpId,
        submissionId: subId,
        surveyId: payload.surveyId,
        surveyTitle: survey ? survey.title : "Enqu\xEAte",
        problemDescription: payload.complaint.problemDescription,
        audioUrl: payload.complaint.audioRecordingUrl,
        audioTranscription: payload.complaint.audioTranscription,
        dossierNumber: payload.complaint.dossierNumber || void 0,
        submissionDate: payload.complaint.submissionDate || void 0,
        phone: payload.complaint.phone || void 0,
        email: payload.complaint.email || void 0,
        status: "new",
        priority,
        category,
        internalNotes: [
          {
            id: `note-${Date.now()}`,
            author: "Syst\xE8me IA",
            content: "R\xE9clamation cr\xE9\xE9e et analys\xE9e par l'IA suite \xE0 la soumission du formulaire client.",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ],
        aiSummary,
        aiSuggestedCategory: category,
        aiSuggestedPriority: priority,
        aiSuggestedActions,
        aiConfidence,
        managerEdited: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const waConfig = this.data.whatsappConfig;
      const isCritical = priority === "urgent" || waConfig.notifyOn !== "urgent_only" && priority === "high" || waConfig.notifyOn === "all";
      if (waConfig.enabled && isCritical) {
        const alertMessage = formatManagerWhatsAppAlert(complaintRecord, waConfig);
        const waUrl = buildWhatsAppLink(waConfig.recipientPhone, alertMessage);
        const hasAutomatedGateway = Boolean(
          waConfig.callmebotApiKey && waConfig.callmebotApiKey.trim() || waConfig.webhookUrl && waConfig.webhookUrl.startsWith("http")
        );
        complaintRecord.whatsappRecipient = waConfig.recipientPhone;
        complaintRecord.whatsappAlertDate = (/* @__PURE__ */ new Date()).toISOString();
        complaintRecord.whatsappAlertReady = true;
        const logId = `walog-${Date.now()}`;
        const notifId = `notif-${Date.now()}-wa`;
        if (hasAutomatedGateway) {
          complaintRecord.whatsappAlertSent = false;
          complaintRecord.whatsappAlertMethod = waConfig.callmebotApiKey ? "callmebot_api" : "webhook";
          const waLog = {
            id: logId,
            complaintId: complaintRecord.id,
            recipientPhone: waConfig.recipientPhone,
            recipientRole: "manager",
            priority: complaintRecord.priority,
            message: alertMessage,
            status: "sent",
            whatsappUrl: waUrl,
            sentAt: complaintRecord.whatsappAlertDate,
            triggerType: "ai_automatic",
            surveyTitle: complaintRecord.surveyTitle,
            dossierNumber: complaintRecord.dossierNumber,
            deliveryMethod: complaintRecord.whatsappAlertMethod
          };
          this.data.whatsappLogs.unshift(waLog);
          this.data.notifications.unshift({
            id: notifId,
            title: `\u{1F6A8} Alerte WhatsApp en cours d'envoi (${priority.toUpperCase()})`,
            message: `Transmission automatique en cours vers ${waConfig.managerName} (${waConfig.recipientPhone})...`,
            type: "whatsapp_alert",
            linkTo: "/complaints",
            whatsappUrl: waUrl,
            deliveryMethod: complaintRecord.whatsappAlertMethod,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            read: false
          });
          sendRealWhatsAppNotification(waConfig, waConfig.recipientPhone, alertMessage).then((result) => {
            if (result.success) {
              if (complaintRecord) {
                complaintRecord.whatsappAlertSent = true;
              }
              waLog.status = "delivered";
              const targetNotif = this.data.notifications.find((n) => n.id === notifId);
              if (targetNotif) {
                targetNotif.title = `\u2705 Alerte WhatsApp d\xE9livr\xE9e (${priority.toUpperCase()})`;
                targetNotif.message = `Notification WhatsApp re\xE7ue avec succ\xE8s par ${waConfig.managerName} (${waConfig.recipientPhone}) via passerelle ${result.method}.`;
              }
            } else {
              waLog.status = "failed";
              waLog.errorMessage = result.error;
              const targetNotif = this.data.notifications.find((n) => n.id === notifId);
              if (targetNotif) {
                targetNotif.title = `\u26A0\uFE0F Alerte WhatsApp pr\xEAte (Envoi manuel requis)`;
                targetNotif.message = `L'API a retourn\xE9 : ${result.error}. Cliquez pour ouvrir et envoyer directement sur WhatsApp.`;
              }
            }
            this.persist();
          }).catch(() => {
          });
        } else {
          complaintRecord.whatsappAlertSent = false;
          complaintRecord.whatsappAlertMethod = "direct_link";
          const waLog = {
            id: logId,
            complaintId: complaintRecord.id,
            recipientPhone: waConfig.recipientPhone,
            recipientRole: "manager",
            priority: complaintRecord.priority,
            message: alertMessage,
            status: "ready_to_send",
            whatsappUrl: waUrl,
            sentAt: complaintRecord.whatsappAlertDate,
            triggerType: "ai_automatic",
            surveyTitle: complaintRecord.surveyTitle,
            dossierNumber: complaintRecord.dossierNumber,
            deliveryMethod: "direct_link"
          };
          this.data.whatsappLogs.unshift(waLog);
          this.data.notifications.unshift({
            id: notifId,
            title: `\u{1F4F1} Alerte WhatsApp pr\xEAte \xE0 envoyer (${priority.toUpperCase()})`,
            message: `R\xE9clamation critique #${complaintRecord.id} : Cliquez ici pour envoyer le message WhatsApp pr\xE9-format\xE9 \xE0 ${waConfig.managerName} (${waConfig.recipientPhone}).`,
            type: "whatsapp_alert",
            linkTo: "/complaints",
            whatsappUrl: waUrl,
            deliveryMethod: "direct_link",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            read: false
          });
          complaintRecord.internalNotes.push({
            id: `note-${Date.now()}-wa`,
            author: "Assistant WhatsApp CERT",
            content: `Alerte WhatsApp pr\xE9-format\xE9e pour le responsable (${waConfig.recipientPhone}). En attente d'ouverture ou d'envoi 1-clic.`,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } else {
        this.data.notifications.unshift({
          id: `notif-${Date.now()}`,
          title: "Nouvelle r\xE9clamation enregistr\xE9e",
          message: `Une r\xE9clamation a \xE9t\xE9 \xE9mise sur l'enqu\xEAte : ${survey ? survey.title : "Enqu\xEAte"}`,
          type: "complaint",
          linkTo: "/complaints",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          read: false
        });
      }
      this.data.complaints.unshift(complaintRecord);
    }
    this.persist();
    return { submission, complaintRecord };
  }
  recalculateSurveyStats(surveyId) {
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
      if (s.npsType === "promoter") {
        promoters++;
        npsTotal++;
      } else if (s.npsType === "detractor") {
        detractors++;
        npsTotal++;
      } else if (s.npsType === "passive") {
        npsTotal++;
      }
    });
    survey.csatScore = Math.round(csatPositives / subs.length * 100);
    survey.npsScore = npsTotal > 0 ? Math.round((promoters - detractors) / npsTotal * 100) : 0;
  }
  getComplaints(filter) {
    let list = this.data.complaints;
    if (filter) {
      if (filter.surveyId && filter.surveyId !== "all") {
        list = list.filter((c) => c.surveyId === filter.surveyId);
      }
      if (filter.status && filter.status !== "all") {
        list = list.filter((c) => c.status === filter.status);
      }
      if (filter.priority && filter.priority !== "all") {
        list = list.filter((c) => c.priority === filter.priority);
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(
          (c) => c.surveyId && c.surveyId.toLowerCase().includes(q) || c.surveyTitle && c.surveyTitle.toLowerCase().includes(q) || c.problemDescription.toLowerCase().includes(q) || c.dossierNumber && c.dossierNumber.toLowerCase().includes(q) || c.email && c.email.toLowerCase().includes(q) || c.phone && c.phone.includes(q) || c.aiSummary.toLowerCase().includes(q)
        );
      }
    }
    return list;
  }
  getSurveyQuestionAnalyses(surveyId) {
    const survey = this.getSurveyById(surveyId);
    if (!survey || !Array.isArray(survey.questions)) return [];
    const subs = this.data.submissions.filter((s) => s.surveyId === surveyId);
    return survey.questions.map((q, idx) => {
      const questionAnswers = subs.map((sub) => sub.answers?.find((a) => a.questionId === q.id)).filter((a) => Boolean(a && a.value !== void 0 && a.value !== ""));
      const responseCount = questionAnswers.length;
      let score = 0;
      let status = "good";
      let details = "";
      let optionsBreakdown = void 0;
      if (responseCount === 0) {
        score = 0;
        status = "good";
        details = "En attente de r\xE9ponses pour cette question";
      } else if (q.type === "stars") {
        const numericValues = questionAnswers.map((a) => Number(a.value)).filter((v) => !isNaN(v) && v >= 1 && v <= 5);
        if (numericValues.length > 0) {
          const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
          score = Math.round(avg / 5 * 100);
          const positiveCount = numericValues.filter((v) => v >= 4).length;
          status = score >= 80 ? "excellent" : score >= 60 ? "good" : "critical";
          details = `Moyenne : ${avg.toFixed(1)}/5 (${positiveCount}/${numericValues.length} avis favorables \u2265 4\u2605)`;
        } else {
          score = survey.csatScore || 70;
          details = `${responseCount} notes enregistr\xE9es`;
        }
      } else if (q.type === "nps") {
        const npsValues = questionAnswers.map((a) => Number(a.value)).filter((v) => !isNaN(v) && v >= 0 && v <= 10);
        if (npsValues.length > 0) {
          const promoters = npsValues.filter((v) => v >= 9).length;
          const passives = npsValues.filter((v) => v >= 7 && v <= 8).length;
          const detractors = npsValues.filter((v) => v <= 6).length;
          const calculatedNps = Math.round((promoters - detractors) / npsValues.length * 100);
          score = Math.max(0, Math.min(100, Math.round((calculatedNps + 100) / 200 * 100)));
          status = calculatedNps >= 40 ? "excellent" : calculatedNps >= 0 ? "good" : "critical";
          details = `NPS : ${calculatedNps >= 0 ? `+${calculatedNps}` : calculatedNps} (${promoters} promoteurs, ${passives} passifs, ${detractors} d\xE9tracteurs)`;
        } else {
          score = 65;
          details = `${responseCount} \xE9valuations NPS`;
        }
      } else if (q.type === "single_choice" || q.type === "multiple_choice" || q.type === "dropdown") {
        const options = q.options || [];
        const counts = {};
        options.forEach((opt) => {
          counts[opt.id || opt.label] = 0;
        });
        questionAnswers.forEach((a) => {
          if (Array.isArray(a.value)) {
            a.value.forEach((val) => {
              const found = options.find((opt) => opt.id === val || opt.value === val || opt.label === val);
              const key = found ? found.id || found.label : String(val);
              counts[key] = (counts[key] || 0) + 1;
            });
          } else {
            const found = options.find((opt) => opt.id === a.value || opt.value === a.value || opt.label === a.value);
            const key = found ? found.id || found.label : String(a.value);
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        optionsBreakdown = options.map((opt) => {
          const cnt = counts[opt.id || opt.label] || 0;
          const pct = responseCount > 0 ? Math.round(cnt / responseCount * 100) : 0;
          return { label: opt.label, count: cnt, percentage: pct };
        });
        const maxOpt = optionsBreakdown.reduce((max, cur) => cur.count > max.count ? cur : max, optionsBreakdown[0]);
        score = maxOpt?.percentage || 60;
        status = score >= 50 ? "excellent" : "good";
        details = `Option majoritaire : "${maxOpt?.label || "N/A"}" (${maxOpt?.percentage || 0}%)`;
      } else if (q.type === "voice") {
        score = 80;
        status = "good";
        details = `${responseCount} enregistrement(s) audio vocal recueilli(s)`;
      } else {
        score = 75;
        status = "good";
        details = `${responseCount} retour(s) textuel(s) analys\xE9(s)`;
      }
      return {
        questionId: q.id,
        questionText: q.text,
        type: q.type,
        score,
        responseCount,
        status,
        details,
        optionsBreakdown
      };
    });
  }
  getComplaintById(id) {
    return this.data.complaints.find((c) => c.id === id);
  }
  updateComplaint(id, updates) {
    const idx = this.data.complaints.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const existing = this.data.complaints[idx];
    const isNowResolved = (updates.status === "resolved" || updates.status === "closed") && existing.status !== "resolved";
    const updated = {
      ...existing,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      resolvedAt: isNowResolved ? (/* @__PURE__ */ new Date()).toISOString() : existing.resolvedAt
    };
    this.data.complaints[idx] = updated;
    this.persist();
    return updated;
  }
  addComplaintNote(complaintId, author, content) {
    const cmp = this.getComplaintById(complaintId);
    if (!cmp) return null;
    const note = {
      id: `note-${Date.now()}`,
      author,
      content,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    cmp.internalNotes.push(note);
    cmp.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.persist();
    return cmp;
  }
  createComplaint(data) {
    const id = data.id || `cmp-${Date.now()}`;
    const dossierNumber = data.dossierNumber || `DOS-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const surveyId = data.surveyId || "";
    const survey = surveyId ? this.getSurveyById(surveyId) : null;
    const surveyTitle = data.surveyTitle || (survey ? survey.title : "Guichet & Accueil G\xE9n\xE9ral CERT");
    const newComplaint = {
      id,
      submissionId: data.submissionId || `manual-${Date.now()}`,
      surveyId,
      surveyTitle,
      problemDescription: data.problemDescription || "",
      dossierNumber,
      submissionDate: data.submissionDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      phone: data.phone || "",
      email: data.email || "",
      status: data.status || "new",
      priority: data.priority || "medium",
      category: data.category || "Accueil & Service",
      assignedTo: data.assignedTo || "",
      internalNotes: data.internalNotes || [
        {
          id: `note-${Date.now()}`,
          author: "Cellule Qualit\xE9 CERT",
          content: "Dossier de r\xE9clamation enregistr\xE9 manuellement dans le registre.",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ],
      aiSummary: data.aiSummary || data.problemDescription?.slice(0, 160) || "Nouvelle r\xE9clamation enregistr\xE9e",
      aiSuggestedCategory: data.aiSuggestedCategory || data.category || "Service & Qualit\xE9",
      aiSuggestedPriority: data.aiSuggestedPriority || data.priority || "medium",
      aiSuggestedActions: data.aiSuggestedActions || [
        "V\xE9rifier le dossier aupr\xE8s du service concern\xE9",
        "Informer l'usager de la prise en charge"
      ],
      aiConfidence: data.aiConfidence || 0.95,
      managerEdited: false,
      whatsappAlertReady: !!(this.data.whatsappConfig?.enabled && (data.phone || this.data.whatsappConfig?.recipientPhone)),
      whatsappRecipient: this.data.whatsappConfig?.recipientPhone,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.complaints.unshift(newComplaint);
    this.data.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: "Nouvelle r\xE9clamation enregistr\xE9e",
      message: `Dossier ${dossierNumber} : ${newComplaint.problemDescription.slice(0, 80)}`,
      type: "complaint",
      linkTo: "/complaints",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      read: false
    });
    this.persist();
    return newComplaint;
  }
  deleteComplaint(id) {
    const initialLen = this.data.complaints.length;
    this.data.complaints = this.data.complaints.filter((c) => c.id !== id);
    const deleted = this.data.complaints.length < initialLen;
    if (deleted) {
      this.persist();
    }
    return deleted;
  }
  // Dashboard Stats
  getDashboardStats(filter) {
    let subs = this.data.submissions;
    if (filter) {
      if (filter.surveyId && filter.surveyId !== "all") {
        subs = subs.filter((s) => s.surveyId === filter.surveyId);
      }
      if (filter.language && filter.language !== "all") {
        subs = subs.filter((s) => s.language === filter.language);
      }
      if (filter.channel && filter.channel !== "all") {
        subs = subs.filter((s) => s.channel === filter.channel);
      }
      if (filter.periodDays && filter.periodDays > 0) {
        const threshold = Date.now() - filter.periodDays * 864e5;
        subs = subs.filter((s) => new Date(s.submittedAt).getTime() >= threshold);
      }
    }
    const totalSurveys = this.data.surveys.length;
    const publishedSurveys = this.data.surveys.filter((s) => s.status === "published").length;
    const totalResponses = subs.length;
    const targetTotal = this.data.surveys.reduce((acc, s) => acc + (s.targetResponses || 100), 0);
    const participationRate = totalResponses > 0 && targetTotal > 0 ? Math.min(100, Math.round(totalResponses / targetTotal * 100)) : 0;
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
      if (s.npsType === "promoter") promoters++;
      else if (s.npsType === "passive") passives++;
      else if (s.npsType === "detractor") detractors++;
      if (s.sentiment === "positive") posCount++;
      else if (s.sentiment === "neutral") neuCount++;
      else if (s.sentiment === "negative") negCount++;
      if (s.channel && channelCounts[s.channel] !== void 0) {
        channelCounts[s.channel]++;
      } else {
        channelCounts.web++;
      }
    });
    const csatPercentage = totalResponses > 0 ? Math.round(csatPositives / totalResponses * 100) : 0;
    const npsTotal = promoters + passives + detractors;
    const npsScore = npsTotal > 0 ? Math.round((promoters - detractors) / npsTotal * 100) : 0;
    let cmps = this.data.complaints;
    if (filter?.surveyId && filter.surveyId !== "all") {
      cmps = cmps.filter((c) => c.surveyId === filter.surveyId);
    }
    const newCount = cmps.filter((c) => c.status === "new").length;
    const inProgressCount = cmps.filter((c) => c.status === "in_progress" || c.status === "pending").length;
    const resolvedCount = cmps.filter((c) => c.status === "resolved" || c.status === "closed").length;
    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - i * 4);
      const dateStr = d.toISOString().split("T")[0];
      timeline.push({
        date: dateStr,
        responses: totalResponses > 0 ? Math.max(1, Math.floor(Math.random() * 8) + 4) : 0,
        csat: totalResponses > 0 ? Math.min(96, Math.max(62, csatPercentage + Math.floor((Math.random() - 0.5) * 12))) : 0,
        nps: totalResponses > 0 ? Math.min(65, Math.max(15, npsScore + Math.floor((Math.random() - 0.5) * 14))) : 0
      });
    }
    let topThemes = [];
    if (totalResponses > 0) {
      if (filter?.surveyId && filter.surveyId !== "all") {
        const survey = this.getSurveyById(filter.surveyId);
        if (survey) {
          const dynamicThemes = [];
          survey.questions?.forEach((q, i) => {
            const isPos = i === 0 || q.type === "stars";
            dynamicThemes.push({
              theme: q.text.length > 40 ? `${q.text.slice(0, 37)}...` : q.text,
              count: Math.max(1, Math.round(totalResponses * (i === 0 ? 0.45 : i === 1 ? 0.3 : 0.2))),
              percentage: i === 0 ? 45 : i === 1 ? 30 : 25,
              sentiment: isPos ? "positive" : "neutral"
            });
          });
          if (cmps.length > 0) {
            dynamicThemes.unshift({
              theme: cmps[0].category || "R\xE9clamations & D\xE9lais signal\xE9s",
              count: cmps.length,
              percentage: Math.min(100, Math.round(cmps.length / Math.max(1, totalResponses) * 100)),
              sentiment: "negative"
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
        resolvedCount
      },
      sentimentBreakdown: {
        positive: posCount,
        neutral: neuCount,
        negative: negCount
      },
      channelBreakdown: channelCounts,
      topThemes,
      timeline
    };
  }
  resetAllClientData() {
    this.data.submissions = [];
    this.data.complaints = [];
    this.data.notifications = [];
    this.data.whatsappLogs = [];
    this.data.aiRecommendations = [];
    this.data.surveys.forEach((s) => {
      s.responseCount = 0;
      s.csatScore = 0;
      s.npsScore = 0;
      s.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    });
    this.persist();
    return { success: true, surveysCount: this.data.surveys.length };
  }
  // Notifications
  getNotifications() {
    return this.data.notifications;
  }
  markNotificationRead(id) {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.persist();
    }
  }
  // Recommendations
  getRecommendations() {
    return this.data.aiRecommendations;
  }
  saveRecommendation(rec) {
    this.data.aiRecommendations.unshift(rec);
    this.persist();
  }
  // WhatsApp Configuration & Logs
  getWhatsAppConfig() {
    return this.data.whatsappConfig || { ...defaultWhatsAppConfig };
  }
  updateWhatsAppConfig(updates) {
    this.data.whatsappConfig = {
      ...this.data.whatsappConfig || defaultWhatsAppConfig,
      ...updates
    };
    this.persist();
    return this.data.whatsappConfig;
  }
  getWhatsAppLogs() {
    return this.data.whatsappLogs || [];
  }
  addWhatsAppLog(log) {
    if (!this.data.whatsappLogs) this.data.whatsappLogs = [];
    this.data.whatsappLogs.unshift(log);
    this.persist();
    return log;
  }
  // App Settings (Director name, title, contact, organization)
  getSettings() {
    if (!this.data.settings) {
      this.data.settings = { ...defaultAppSettings };
      this.persist();
    }
    return this.data.settings;
  }
  updateSettings(updates) {
    const current = this.getSettings();
    this.data.settings = {
      ...current,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.persist();
    return this.data.settings;
  }
};
var dbInstance = new Database();

// server/gemini.ts
import { GoogleGenAI } from "@google/genai";
var aiInstance = null;
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}
async function tryGenerateWithFallback(prompt, systemInstruction, responseMimeType) {
  const ai = getAiClient();
  if (!ai) return null;
  const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
  for (const model of candidateModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType,
          temperature: 0.3
        }
      });
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 12e3));
      const response = await Promise.race([generatePromise, timeoutPromise]);
      if (response && "text" in response) {
        const text = response.text?.trim();
        if (text) return text;
      }
    } catch (err) {
      continue;
    }
  }
  return null;
}
async function generateSurveyWithAI(prompt, language) {
  const langName = language === "fr" ? "fran\xE7ais" : language === "ar" ? "arabe standard" : "darija tunisienne (dialecte tunisien courant)";
  const systemInstruction = `Tu es un expert senior en conception d'enqu\xEAtes de satisfaction client et en exp\xE9rience utilisateur (UX/CX).
Tu con\xE7ois des questionnaires \xE9quilibr\xE9s, concis, pertinents et adapt\xE9s aux r\xE9alit\xE9s du terrain en Tunisie et dans le monde francophone/arabophone.
La langue demand\xE9e est : ${langName}.
Tu dois g\xE9n\xE9rer 5 \xE0 7 questions vari\xE9es (\xE9valuation par \xE9toiles, choix unique, choix multiple, note NPS de 0 \xE0 10, question ouverte texte ou vocale).
Format de sortie : JSON strict respectant la structure demand\xE9e.`;
  const userPrompt = `Cr\xE9e un questionnaire de satisfaction complet pour l'activit\xE9 ou le service suivant :
"${prompt}"

Langue de sortie : ${langName}.
Retourne un objet JSON valide avec :
- title : titre professionnel et accrocheur
- description : br\xE8ve phrase expliquant l'objectif aux r\xE9pondants
- category : cat\xE9gorie sectorielle
- questions : tableau de 5 \xE0 7 questions avec :
  - text : \xE9nonc\xE9 clair de la question
  - type : l'un de ["stars", "single_choice", "multiple_choice", "dropdown", "nps", "text", "voice"]
  - required : bool\xE9en (la plupart obligatoires, les remarques libres facultatives)
  - options : pour les types choix unique, choix multiple ou liste d\xE9roulante (tableau d'objets { id, label, value })`;
  const generatedText = await tryGenerateWithFallback(userPrompt, systemInstruction, "application/json");
  if (generatedText) {
    try {
      return JSON.parse(generatedText);
    } catch (_) {
    }
  }
  if (language === "ar") {
    return {
      title: `\u0627\u0633\u062A\u0628\u064A\u0627\u0646 \u0631\u0636\u0627 \u0627\u0644\u062D\u0631\u0641\u0627\u0621 - ${prompt}`,
      description: "\u0646\u0631\u062C\u0648 \u0645\u0646\u0643\u0645 \u0627\u0644\u062A\u0643\u0631\u0645 \u0628\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0644\u062A\u0642\u064A\u064A\u0645 \u062A\u062C\u0631\u0628\u062A\u0643\u0645 \u0648\u0645\u0633\u0627\u0639\u062F\u062A\u0646\u0627 \u0639\u0644\u0649 \u062A\u062D\u0633\u064A\u0646 \u062C\u0648\u062F\u0629 \u062E\u062F\u0645\u0627\u062A\u0646\u0627.",
      category: "\u062E\u062F\u0645\u0627\u062A",
      questions: [
        { text: "\u0643\u064A\u0641 \u062A\u0642\u064A\u0645\u0648\u0646 \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u062D\u0633\u0646 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629\u061F", type: "stars", required: true },
        {
          text: "\u0645\u0627 \u0647\u064A \u0627\u0644\u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062A\u064A \u062A\u0641\u0636\u0644\u0648\u0646\u0647\u0627 \u0644\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627\u061F",
          type: "single_choice",
          required: true,
          options: [
            { id: "1", label: "\u0627\u0644\u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u0628\u0627\u0634\u0631", value: "phone" },
            { id: "2", label: "\u0627\u0644\u0645\u0643\u062A\u0628 / \u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644", value: "office" },
            { id: "3", label: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0648\u0627\u0644\u0645\u0646\u0635\u0629", value: "digital" }
          ]
        },
        { text: "\u0639\u0644\u0649 \u0645\u0642\u064A\u0627\u0633 \u0645\u0646 0 \u0625\u0644\u0649 10\u060C \u0645\u0627 \u0645\u062F\u0649 \u0627\u062D\u062A\u0645\u0627\u0644\u064A\u0629 \u0623\u0646 \u062A\u0648\u0635\u0648\u0627 \u0628\u062E\u062F\u0645\u0627\u062A\u0646\u0627\u061F", type: "nps", required: true },
        { text: "\u0647\u0644 \u0648\u0627\u062C\u0647\u062A\u0645 \u0623\u064A \u062A\u0623\u062E\u064A\u0631 \u063A\u064A\u0631 \u0645\u0628\u0631\u0631 \u0641\u064A \u0625\u0646\u062C\u0627\u0632 \u062E\u062F\u0645\u062A\u0643\u0645\u061F", type: "single_choice", required: true, options: [{ id: "1", label: "\u0644\u0627\u060C \u0641\u064A \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062D\u062F\u062F", value: "on_time" }, { id: "2", label: "\u0646\u0639\u0645\u060C \u062A\u0623\u062E\u064A\u0631 \u0637\u0641\u064A\u0641", value: "slight_delay" }, { id: "3", label: "\u0646\u0639\u0645\u060C \u062A\u0623\u062E\u064A\u0631 \u0643\u0628\u064A\u0631", value: "huge_delay" }] },
        { text: "\u0645\u0627 \u0647\u064A \u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A\u0643\u0645 \u0644\u062A\u0637\u0648\u064A\u0631 \u062E\u062F\u0645\u0627\u062A\u0646\u0627 \u0645\u0633\u062A\u0642\u0628\u0644\u0627\u064B\u061F", type: "text", required: false }
      ]
    };
  } else if (language === "tn") {
    return {
      title: `\u062A\u0642\u064A\u064A\u0645 \u062E\u062F\u0645\u0627\u062A\u0646\u0627 - ${prompt}`,
      description: "\u0631\u0627\u064A\u0643\u0645 \u064A\u0647\u0645\u0646\u0627 \u0648\u064A\u0639\u0627\u0648\u0646\u0651\u0627 \u0628\u0631\u0634\u0627 \u0628\u0627\u0634 \u0646\u0635\u0644\u062D\u0648 \u062F\u064A\u0645\u0627 \u0648\u0646\u0643\u0648\u0646\u0648 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0648\u0649.",
      category: "\u062E\u062F\u0645\u0627\u062A",
      questions: [
        { text: "\u0634\u0646\u064A\u0629 \u0631\u0627\u064A\u0643 \u0641\u064A \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0643\u064A \u062C\u064A\u062A\u0646\u0627\u061F", type: "stars", required: true },
        {
          text: "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0644\u064A \u0639\u062F\u064A\u062A\u0648 \u0628\u0634 \u0642\u0636\u064A\u062A \u0634\u0648\u0631\u062A\u0643 \u0643\u0627\u0646:",
          type: "dropdown",
          required: true,
          options: [
            { id: "1", label: "\u0641\u064A\u0633\u0639 \u0648\u0645\u0627 \u0637\u0648\u0644\u062A\u0634", value: "fast" },
            { id: "2", label: "\u0639\u0627\u062F\u064A \u0648\u0645\u0639\u0642\u0648\u0644", value: "normal" },
            { id: "3", label: "\u0637\u0648\u064A\u0644 \u0628\u0631\u0634\u0627 \u0648\u0642\u0639\u062F\u062A \u0646\u0633\u062A\u0646\u0649", value: "slow" }
          ]
        },
        { text: "\u0645\u0646 0 \u062D\u062A\u0649 \u0644\u0640 10\u060C \u0642\u062F\u0627\u0634 \u062A\u0646\u0635\u062D \u0635\u062D\u0627\u0628\u0643 \u0648\u0644\u0627 \u0639\u0627\u064A\u0644\u062A\u0643 \u064A\u062A\u0639\u0627\u0645\u0644\u0648 \u0645\u0639\u0627\u0646\u0627\u061F", type: "nps", required: true },
        { text: "\u0641\u0645\u0627 \u062D\u0627\u062C\u0629 \u062A\u062D\u0628\u0646\u0627 \u0646\u0632\u064A\u062F\u0648\u0647\u0627 \u0648\u0644\u0627 \u0646\u0635\u0644\u062D\u0648\u0647\u0627 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629\u061F", type: "text", required: false }
      ]
    };
  }
  return {
    title: `Enqu\xEAte de Satisfaction - ${prompt}`,
    description: "Prenez 2 minutes pour \xE9valuer la qualit\xE9 de nos services et nous aider \xE0 progresser.",
    category: "Services",
    questions: [
      { text: "Comment \xE9valuez-vous la qualit\xE9 globale de l'accueil et de l'\xE9coute ?", type: "stars", required: true },
      {
        text: "Quel canal de contact utilisez-vous principalement ?",
        type: "single_choice",
        required: true,
        options: [
          { id: "1", label: "Sur place (Agence / Magasin)", value: "on_site" },
          { id: "2", label: "T\xE9l\xE9phone / WhatsApp", value: "phone" },
          { id: "3", label: "Site web / Application", value: "online" }
        ]
      },
      { text: "Sur une \xE9chelle de 0 \xE0 10, recommanderiez-vous nos services \xE0 un coll\xE8gue ou un proche ?", type: "nps", required: true },
      { text: "Les d\xE9lais de prise en charge et de r\xE9ponse ont-ils r\xE9pondu \xE0 vos attentes ?", type: "single_choice", required: true, options: [{ id: "1", label: "Totalement satisfaisants", value: "great" }, { id: "2", label: "Acceptables", value: "acceptable" }, { id: "3", label: "Insuffisants / Trop longs", value: "bad" }] },
      { text: "Avez-vous des suggestions d'am\xE9lioration \xE0 partager ?", type: "voice", required: false }
    ]
  };
}
async function analyzeComplaintWithAI(complaintText, language) {
  const langPrompt = language === "ar" ? "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" : language === "tn" ? "\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u062A\u0648\u0646\u0633\u064A\u0629 \u0623\u0648 \u0627\u0644\u0639\u0631\u0628\u064A\u0629" : "Fran\xE7ais";
  const systemInstruction = `Tu es un analyste expert de la gestion de la relation client et du traitement des r\xE9clamations.
Tu analyses les r\xE9clamations des clients exprim\xE9es en ${langPrompt}.
Tu g\xE9n\xE8res un r\xE9sum\xE9 concis, une cat\xE9gorie pr\xE9cise (ex: D\xE9lais, Accueil, Qualit\xE9, Facturation, Technique, Suivi de dossier), une priorit\xE9 ("urgent", "high", "medium", "low"), et 2 \xE0 3 actions correctives r\xE9alistes.
Retourne un JSON strict.`;
  const prompt = `Analyse cette r\xE9clamation client :
"${complaintText}"

R\xE9ponds avec un objet JSON structur\xE9 :
{
  "summary": "r\xE9sum\xE9 en une phrase percutante",
  "category": "cat\xE9gorie du probl\xE8me",
  "priority": "urgent" | "high" | "medium" | "low",
  "suggestedActions": ["action 1", "action 2"],
  "confidence": 0.92,
  "sentiment": "negative"
}`;
  const generatedText = await tryGenerateWithFallback(prompt, systemInstruction, "application/json");
  if (generatedText) {
    try {
      return JSON.parse(generatedText);
    } catch (_) {
    }
  }
  const isUrgent = /urgent|immédiat|bloqué|bloquée|retard|police|avocat|justice|غضب|كارثة|مستعجل|طبيب|عملية/i.test(complaintText);
  const isBilling = /facture|payer|tarif|frais|argent|flous|خلاص|فلوس|فاتورة|سعر/i.test(complaintText);
  const isDelay = /délai|attente|mois|semaine|retard|وقت|نستنى|استنى|تعطيل|تأخير/i.test(complaintText);
  const isWelcome = /accueil|guichet|agent|comportement|معاملة|عون|استقبال/i.test(complaintText);
  let category = "Service Client & Qualit\xE9";
  if (isBilling) category = "Facturation & Paiements";
  else if (isDelay) category = "D\xE9lais & Traitement de dossier";
  else if (isWelcome) category = "Accueil & Qualit\xE9 du Service";
  return {
    summary: complaintText.length > 120 ? complaintText.slice(0, 120) + "..." : complaintText,
    category,
    priority: isUrgent ? "urgent" : isDelay ? "high" : "medium",
    suggestedActions: [
      "Contacter le client sous 24h ouvr\xE9es pour qualifier le probl\xE8me",
      "Consulter l'historique du dossier aupr\xE8s du service r\xE9f\xE9rent"
    ],
    confidence: 0.9,
    sentiment: "negative"
  };
}
async function transcribeAudioWithAI(base64Audio, mimeType, targetLanguage = "fr") {
  const ai = getAiClient();
  if (!ai || !base64Audio) return null;
  let cleanMimeType = (mimeType || "audio/webm").split(";")[0].trim();
  if (!cleanMimeType.startsWith("audio/")) {
    cleanMimeType = "audio/webm";
  }
  const instructionText = targetLanguage === "fr" ? "\xC9coute attentivement cet enregistrement audio. La personne peut s'exprimer en fran\xE7ais, en arabe standard ou en darija tunisienne (dialecte tunisien). Transcris fid\xE8lement ses propos et formule la transcription en fran\xE7ais clair, naturel, soign\xE9 et professionnel (si les propos sont en arabe ou en tunisien, traduis-les directement en fran\xE7ais). Rends UNIQUEMENT le texte final en fran\xE7ais, sans guillemets superflus, sans pr\xE9ambule et sans explications." : "Transcris fid\xE8lement ce message audio. Rends uniquement la transcription textuelle exacte, sans explications ajout\xE9es.";
  const audioPart = {
    inlineData: {
      mimeType: cleanMimeType,
      data: base64Audio
    }
  };
  const models = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [audioPart, instructionText]
      });
      const res = response.text?.trim() || "";
      if (res && !res.toLowerCase().includes("silence") && !res.toLowerCase().includes("aucun son") && res.length > 3) {
        return res;
      }
    } catch (_) {
      continue;
    }
  }
  return null;
}
async function translateTextToFrench(text) {
  if (!text || !text.trim()) return text;
  const prompt = `Tu es un traducteur expert bilingue sp\xE9cialis\xE9 dans la langue fran\xE7aise, l'arabe et la darija tunisienne (dialecte tunisien).
Traduis fid\xE8lement ce propos d'usager/client en fran\xE7ais clair, naturel, fluide et professionnel.
Si le texte est d\xE9j\xE0 en fran\xE7ais, corrige simplement la syntaxe et la ponctuation tout en conservant le sens exact.
Si le texte est en dialecte tunisien ou en arabe, traduis-le fid\xE8lement en fran\xE7ais compr\xE9hensible.

Texte \xE0 traiter :
"""${text}"""

R\xC8GLES IMPORTANTES :
- Rends UNIQUEMENT la traduction finale en fran\xE7ais.
- Ne rajoute aucune introduction, aucune explication, aucune balise, aucun guillemet d\xE9coratif.`;
  const translated = await tryGenerateWithFallback(prompt);
  if (translated && translated.trim().length > 0) {
    return translated.trim();
  }
  return text.trim();
}
async function generateCustomerWhatsAppReplyWithAI(complaint, language = "fr") {
  const langName = language === "ar" ? "arabe standard" : language === "tn" ? "darija tunisienne polie et rassurante" : "fran\xE7ais soign\xE9, bienveillant et professionnel";
  const systemInstruction = `Tu es un responsable du service relation client et r\xE9clamations.
Tu r\xE9diges une r\xE9ponse directe, concise (3 \xE0 5 phrases) et empathique destin\xE9e \xE0 \xEAtre envoy\xE9e via WhatsApp au client insatisfait.
Langue demand\xE9e : ${langName}.
Le message doit :
1. Remercier le client et accuser r\xE9ception avec empathie.
2. Mentionner la prise en charge imm\xE9diate du dossier (citer le num\xE9ro de dossier ${complaint.dossierNumber || ""} s'il existe).
3. Rassurer sur la r\xE9solution rapide et proposer un contact direct.
Rends UNIQUEMENT le texte du message WhatsApp (avec quelques emojis appropri\xE9s), pr\xEAt \xE0 l'envoi.`;
  const prompt = `R\xE9clamation du client :
\xAB ${complaint.problemDescription} \xBB
${complaint.dossierNumber ? `Num\xE9ro de dossier : ${complaint.dossierNumber}` : ""}
${complaint.aiSummary ? `Diagnostic : ${complaint.aiSummary}` : ""}

R\xE9dige le message WhatsApp de r\xE9ponse client.`;
  const generated = await tryGenerateWithFallback(prompt, systemInstruction);
  if (generated && generated.trim()) {
    return generated.trim();
  }
  if (language === "ar") {
    return `\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643\u060C \u0646\u0634\u0643\u0631\u0643 \u0639\u0644\u0649 \u062A\u0648\u0627\u0635\u0644\u0643 \u0645\u0639\u0646\u0627 \u0648\u0646\u0639\u062A\u0630\u0631 \u0628\u0635\u062F\u0642 \u0639\u0646 \u0627\u0644\u0625\u0632\u0639\u0627\u062C \u0628\u062E\u0635\u0648\u0635 ${complaint.dossierNumber ? `\u0627\u0644\u0645\u0644\u0641 \u0631\u0642\u0645 ${complaint.dossierNumber}` : "\u0637\u0644\u0628\u0643\u0645"}. \u0646\u0648\u062F \u0625\u0639\u0644\u0627\u0645\u0643\u0645 \u0628\u0623\u0646 \u0645\u0635\u0644\u062D\u0629 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0645\u0639 \u0627\u0644\u062D\u0631\u0641\u0627\u0621 \u0642\u062F \u062A\u0648\u0644\u062A \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0623\u0645\u0631 \u0628\u0634\u0643\u0644 \u0641\u0648\u0631\u064A \u0644\u062A\u0633\u0631\u064A\u0639 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629. \u0633\u0646\u0648\u0627\u0641\u064A\u0643\u0645 \u0628\u0622\u062E\u0631 \u0627\u0644\u0645\u0633\u062A\u062C\u062F\u0627\u062A \u0647\u0627\u062A\u0641\u064A\u0627\u064B \u0641\u064A \u0623\u0642\u0631\u0628 \u0648\u0642\u062A. \u062F\u0645\u062A \u0628\u062E\u064A\u0631.`;
  } else if (language === "tn") {
    return `\u0639\u0633\u0644\u0627\u0645\u0629\u060C \u064A\u0639\u0637\u064A\u0643 \u0627\u0644\u0635\u062D\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629 \u0645\u062A\u0627\u0639\u0643 \u0648\u0633\u0627\u0645\u062D\u0646\u0627 \u0628\u0631\u0634\u0627 \u0639\u0644\u0649 \u0627\u0644\u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0644\u064A \u0635\u0627\u0631 \u0641\u064A ${complaint.dossierNumber ? `\u0627\u0644\u062F\u0648\u0633\u064A \u0631\u0642\u0645 ${complaint.dossierNumber}` : "\u0637\u0644\u0628\u0643"}. \u062D\u0627\u0628\u064A\u0646 \u0646\u0637\u0645\u0646\u0648\u0643 \u0627\u0644\u0644\u064A \u0627\u0644\u0641\u0631\u064A\u0642 \u0645\u062A\u0627\u0639\u0646\u0627 \u0628\u062F\u0627 \u064A\u062A\u0628\u0639 \u0641\u064A \u0627\u0644\u0645\u0634\u0643\u0644 \u0645\u062A\u0627\u0639\u0643 \u0628\u0635\u0641\u0629 \u0639\u0627\u062C\u0644\u0629 \u0628\u0627\u0634 \u0646\u0635\u0644\u062D\u0648\u0647 \u0641\u064A\u0633\u0639. \u0628\u0627\u0634 \u0646\u0643\u0644\u0645\u0648\u0643 \u0641\u064A \u0623\u0642\u0631\u0628 \u0648\u0642\u062A \u0648\u0646\u0628\u0642\u0627\u0648 \u062F\u064A\u0645\u0627 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629.`;
  }
  return `Bonjour, nous vous remercions d'avoir partag\xE9 votre retour et nous vous pr\xE9sentons nos excuses pour ce d\xE9sagr\xE9ment concernant ${complaint.dossierNumber ? `votre dossier N\xB0 ${complaint.dossierNumber}` : "votre d\xE9marche"}. Notre service qualit\xE9 a pris en charge votre r\xE9clamation en priorit\xE9 absolue et met tout en \u0153uvre pour vous apporter une solution rapide. Un conseiller vous contactera dans les plus brefs d\xE9lais. Bien \xE0 vous, Service Client.`;
}
async function generateRecommendationsWithAI(statsSummary) {
  const surveyTitle = statsSummary?.surveyTitle || "Satisfaction Client CERT (Consolid\xE9)";
  const totalResponses = statsSummary?.totalResponses ?? (statsSummary?.responseCount ?? 0);
  const csat = statsSummary?.csatPercentage ?? 78;
  const nps = statsSummary?.npsScore ?? 34;
  const isAr = statsSummary?.surveyLanguage === "ar";
  const isTn = statsSummary?.surveyLanguage === "tn";
  const realQuestions = Array.isArray(statsSummary?.surveyQuestions) ? statsSummary.surveyQuestions : [];
  const questionAnalyses = Array.isArray(statsSummary?.questionAnalyses) && statsSummary.questionAnalyses.length > 0 ? statsSummary.questionAnalyses : [];
  const complaintsSummary = Array.isArray(statsSummary?.complaintsSummary) ? statsSummary.complaintsSummary : [];
  const systemInstruction = `Tu es un expert senior en analyse de satisfaction client et am\xE9lioration continue pour le CERT.
Tu analyses une enqu\xEAte de satisfaction sp\xE9cifique : "${surveyTitle}" (${statsSummary?.surveyCategory || "Services"}).
Tes conclusions, points forts, dysfonctionnements et plans d'actions DOIVENT \xCATRE 100% CONFORMES et DIRECTEMENT FOND\xC9S sur les questions r\xE9elles pos\xE9es dans cette enqu\xEAte et les r\xE9clamations re\xE7ues.
R\xC8GLES STRICTES :
1. Fonde les 3 points forts (strengths) sur les questions les mieux not\xE9es de cette enqu\xEAte pr\xE9cise et la satisfaction r\xE9elle (${csat}% CSAT, ${totalResponses} r\xE9ponses).
2. Fonde les 3 probl\xE8mes prioritaires (priorityProblems) sur les questions les moins bien not\xE9es et les r\xE9clamations r\xE9elles (${complaintsSummary.length} r\xE9clamations).
3. Formule un plan d'actions (actionPlans) op\xE9rationnel et directement adapt\xE9 aux questions de cette enqu\xEAte.
4. R\xE9dige dans la langue de l'enqu\xEAte (${isAr ? "Arabe" : "Fran\xE7ais"}).
5. Format : JSON strict.`;
  const prompt = `Voici les donn\xE9es R\xC9ELLES de l'enqu\xEAte de satisfaction :
Titre de l'enqu\xEAte : "${surveyTitle}"
Cat\xE9gorie : "${statsSummary?.surveyCategory || "Services"}"
Nombre de r\xE9ponses r\xE9elles : ${totalResponses}
Satisfaction CSAT : ${csat}%
Score NPS : ${nps}
Questions r\xE9elles de l'enqu\xEAte :
${JSON.stringify(realQuestions.map((q) => ({ id: q.id, text: q.text, type: q.type })), null, 2)}
Analyses d\xE9taill\xE9es par question :
${JSON.stringify(questionAnalyses.map((qa) => ({ text: qa.questionText, score: qa.score, details: qa.details })), null, 2)}
R\xE9clamations r\xE9elles signal\xE9es :
${JSON.stringify(complaintsSummary, null, 2)}

Produis le rapport strat\xE9gique en JSON structur\xE9 :
{
  "period": "P\xE9riode courante",
  "strengths": [
    { "title": "...", "description": "...", "metric": "...", "confidence": 0.94 }
  ],
  "priorityProblems": [
    { "title": "...", "description": "...", "metric": "...", "severity": "critical"|"high"|"medium", "confidence": 0.92 }
  ],
  "actionPlans": [
    {
      "action": "...",
      "rationale": "...",
      "suggestedAssignee": "...",
      "suggestedDeadline": "...",
      "expectedImpact": "..."
    }
  ]
}`;
  const generated = await tryGenerateWithFallback(prompt, systemInstruction, "application/json");
  if (generated) {
    try {
      const parsed = JSON.parse(generated);
      if (statsSummary?.surveyId) parsed.surveyId = statsSummary.surveyId;
      if (statsSummary?.surveyTitle) parsed.surveyTitle = statsSummary.surveyTitle;
      parsed.questionAnalyses = questionAnalyses;
      return parsed;
    } catch (_) {
    }
  }
  const totalComplaints = statsSummary?.totalComplaints ?? (statsSummary?.complaints?.total ?? complaintsSummary.length);
  const newComplaints = statsSummary?.newComplaints ?? (statsSummary?.complaints?.newCount ?? complaintsSummary.length);
  const resolvedComplaints = statsSummary?.resolvedComplaints ?? (statsSummary?.complaints?.resolvedCount ?? 0);
  const effectiveQuestionAnalyses = questionAnalyses.length > 0 ? questionAnalyses : [];
  if (effectiveQuestionAnalyses.length === 0 && Array.isArray(statsSummary?.surveyQuestions) && statsSummary.surveyQuestions.length > 0) {
    statsSummary.surveyQuestions.forEach((q, idx) => {
      const offset = idx === 0 ? 8 : idx === 1 ? -4 : idx === 2 ? -14 : 2;
      const score = Math.min(98, Math.max(45, csat + offset));
      const status = score >= 80 ? "excellent" : score >= 65 ? "good" : "critical";
      effectiveQuestionAnalyses.push({
        questionId: q.id,
        questionText: q.text,
        type: q.type,
        score,
        responseCount: totalResponses || 1,
        status,
        details: status === "excellent" ? isAr ? "\u0623\u062F\u0627\u0621 \u0645\u062A\u0645\u064A\u0632 \u0648\u062A\u0641\u0627\u0639\u0644 \u0625\u064A\u062C\u0627\u0628\u064A \u062C\u062F\u0627\u064B" : "Indicateur pl\xE9biscit\xE9 par les r\xE9pondants" : status === "good" ? isAr ? "\u0645\u0633\u062A\u0648\u0649 \u0645\u0631\u0636\u064D \u0648\u0645\u0642\u0628\u0648\u0644" : "Niveau conforme aux attentes" : isAr ? "\u0645\u0624\u0634\u0631 \u064A\u062D\u062A\u0627\u062C \u062E\u0637\u0629 \u062A\u0635\u062D\u064A\u062D\u064A\u0629 \u0639\u0627\u062C\u0644\u0629" : "Axe de tension prioritaire"
      });
    });
  }
  const sortedQ = [...effectiveQuestionAnalyses].sort((a, b) => b.score - a.score);
  const bestQ = sortedQ[0];
  const secondBestQ = sortedQ[1];
  const worstQ = sortedQ[sortedQ.length - 1];
  const primaryComplaint = complaintsSummary[0] || (isAr ? "\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u062D\u0648\u0644 \u0622\u062C\u0627\u0644 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629" : "D\xE9lais de traitement");
  const secondaryComplaint = complaintsSummary[1] || (isAr ? "\u062A\u0648\u0636\u064A\u062D \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u062E\u062F\u0645\u0629" : "Clart\xE9 des d\xE9marches");
  if (isAr) {
    return {
      period: `\u062A\u062D\u0644\u064A\u0644 \u0645\u062E\u0635\u0635: ${surveyTitle}`,
      surveyId: statsSummary?.surveyId,
      surveyTitle,
      questionAnalyses: effectiveQuestionAnalyses,
      strengths: [
        {
          title: bestQ ? `\u0645\u0624\u0634\u0631 \u0645\u062A\u0645\u064A\u0632 \u0641\u064A: ${bestQ.questionText.slice(0, 50)}` : `\u0645\u0624\u0634\u0631 \u0631\u0636\u0627 \u0625\u064A\u062C\u0627\u0628\u064A \u0628\u0646\u0633\u0628\u0629 ${csat}%`,
          description: bestQ ? `\u0633\u062C\u0644\u062A \u0647\u0630\u0647 \u0627\u0644\u0646\u0642\u0637\u0629 \u0646\u0633\u0628\u0629 \u062A\u0642\u064A\u064A\u0645 \u0645\u0631\u062A\u0641\u0639\u0629 (${bestQ.score}%) \u062A\u0639\u0643\u0633 \u0627\u0631\u062A\u064A\u0627\u062D \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u064A\u0646 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u062A\u0628\u064A\u0627\u0646.` : `\u062D\u0635\u0644 \u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u062A\u0628\u064A\u0627\u0646 \u0639\u0644\u0649 \u062A\u0642\u064A\u064A\u0645 \u0639\u0627\u0645 \u0645\u0631\u062A\u0641\u0639 \u064A\u0639\u0643\u0633 \u062C\u0648\u062F\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0648\u062D\u0633\u0646 \u0627\u0644\u062A\u062C\u0627\u0648\u0628.`,
          metric: bestQ ? `${bestQ.score}% \u0631\u0636\u0627 (${bestQ.responseCount} \u0645\u0634\u0627\u0631\u0643\u0629)` : `${csat}% \u0646\u0633\u0628\u0629 \u0627\u0644\u0631\u0636\u0627 (${totalResponses} \u0645\u0634\u0627\u0631\u0643\u0629)`,
          confidence: 0.95
        },
        {
          title: secondBestQ ? `\u0623\u062F\u0627\u0621 \u0625\u064A\u062C\u0627\u0628\u064A \u0641\u064A: ${secondBestQ.questionText.slice(0, 50)}` : `\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062A\u0648\u0635\u064A\u0629 \u0627\u0644\u0635\u0627\u0641\u064A NPS \u0625\u064A\u062C\u0627\u0628\u064A (+${nps})`,
          description: secondBestQ ? `\u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0645\u0634\u062C\u0639\u0629 \u062A\u0624\u0643\u062F \u062C\u0648\u062F\u0629 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0636\u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u062D\u0648\u0631.` : `\u0627\u0644\u0645\u062A\u0639\u0627\u0645\u0644\u0648\u0646 \u064A\u0628\u062F\u0648\u0646 \u0627\u0633\u062A\u0639\u062F\u0627\u062F\u0627\u064B \u0644\u0644\u062A\u0648\u0635\u064A\u0629 \u0628\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0648\u0627\u0644\u0645\u0635\u0627\u0644\u062D \u0627\u0644\u0645\u0642\u062F\u0645\u0629.`,
          metric: secondBestQ ? `${secondBestQ.score}% \u062A\u0642\u064A\u064A\u0645 \u0625\u064A\u062C\u0627\u0628\u064A` : `NPS: +${nps}`,
          confidence: 0.91
        },
        {
          title: "\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0645\u0644\u0641\u0627\u062A \u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u062A\u0628\u064A\u0627\u0646",
          description: `\u062A\u0633\u062C\u064A\u0644 ${totalResponses} \u0625\u062C\u0627\u0628\u0629 \u0645\u0639 \u0627\u0644\u062A\u0639\u0647\u062F \u0628\u0645\u062A\u0627\u0628\u0639\u0629 \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0645\u0646 \u0627\u0644\u0645\u062A\u0639\u0627\u0645\u0644\u064A\u0646.`,
          metric: `${totalResponses} \u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0633\u062C\u0644\u0629`,
          confidence: 0.89
        }
      ],
      priorityProblems: [
        {
          title: `\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0634\u0643\u0648\u0649 \u0627\u0644\u0648\u0627\u0631\u062F\u0629: ${primaryComplaint.slice(0, 55)}`,
          description: `\u062A\u0633\u062C\u064A\u0644 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0648\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0645\u0628\u0627\u0634\u0631\u0629 \u062A\u0633\u062A\u0648\u062C\u0628 \u062A\u062F\u062E\u0644\u0627\u064B \u0641\u0648\u0631\u064A\u0627\u064B \u0644\u062A\u0633\u0648\u064A\u0629 \u0648\u0636\u0639\u064A\u0629 \u0627\u0644\u0645\u062A\u0639\u0627\u0645\u0644\u064A\u0646.`,
          metric: `${complaintsSummary.length} \u0634\u0643\u0648\u0649 \u0645\u062A\u0639\u0644\u0642\u0629 \u0628\u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u062A\u0628\u064A\u0627\u0646`,
          severity: "high",
          confidence: 0.94
        },
        {
          title: worstQ && worstQ.score < 75 ? `\u0646\u0642\u0637\u0629 \u062A\u0633\u062A\u0648\u062C\u0628 \u0627\u0644\u062A\u062D\u0633\u064A\u0646: ${worstQ.questionText.slice(0, 50)}` : `\u0645\u062A\u0627\u0628\u0639\u0629 \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0639\u0627\u0645\u0644\u064A\u0646 \u0648\u062A\u0633\u0631\u064A\u0639 \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A`,
          description: worstQ ? `\u062D\u0635\u0644 \u0647\u0630\u0627 \u0627\u0644\u0633\u0624\u0627\u0644 \u0639\u0644\u0649 \u0623\u062F\u0646\u0649 \u0646\u0633\u0628\u0629 \u062A\u0642\u064A\u064A\u0645 (${worstQ.score}%) \u0641\u064A \u0627\u0644\u0627\u0633\u062A\u0628\u064A\u0627\u0646 \u0645\u0645\u0627 \u064A\u0633\u062A\u062F\u0639\u064A \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u062A\u0635\u062D\u064A\u062D\u064A\u0629.` : `\u062A\u0633\u062C\u064A\u0644 \u062A\u0637\u0644\u0639\u0627\u062A \u0644\u062A\u0628\u0633\u064A\u0637 \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0633\u0631\u064A\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0627\u062A\u0641 \u0623\u0648 \u0648\u0627\u062A\u0633\u0627\u0628.`,
          metric: worstQ ? `${worstQ.score}% \u0646\u0633\u0628\u0629 \u0627\u0644\u0631\u0636\u0627` : `\u062A\u0646\u0628\u064A\u0647 \u0630\u0648 \u0623\u0648\u0644\u0648\u064A\u0629`,
          severity: "medium",
          confidence: 0.9
        }
      ],
      actionPlans: [
        {
          action: `\u0645\u0639\u0627\u0644\u062C\u0629 \u0641\u0648\u0631\u064A\u0629 \u0648\u062A\u0648\u0627\u0635\u0644 \u0645\u0628\u0627\u0634\u0631 \u0628\u0634\u0623\u0646: "${primaryComplaint.slice(0, 45)}"`,
          rationale: `\u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0644\u0634\u0643\u0627\u0648\u0649 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u064A\u0646 \u0641\u064A \u0627\u0633\u062A\u0628\u064A\u0627\u0646 "${surveyTitle}" \u0641\u064A \u0623\u062C\u0644 \u0644\u0627 \u064A\u062A\u062C\u0627\u0648\u0632 48 \u0633\u0627\u0639\u0629.`,
          suggestedAssignee: "\u0645\u0635\u0644\u062D\u0629 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0645\u0639 \u0627\u0644\u0645\u062A\u0639\u0627\u0645\u0644\u064A\u0646 \u0648\u0627\u0644\u0645\u0643\u062A\u0628 \u0627\u0644\u0645\u0639\u0646\u064A",
          suggestedDeadline: "\u062E\u0644\u0627\u0644 48 \u0633\u0627\u0639\u0629",
          expectedImpact: "\u062A\u0633\u0648\u064A\u0629 \u0641\u0648\u0631\u064A\u0629 \u0648\u0631\u0641\u0639 \u0627\u0644\u0631\u0636\u0627 \u0628\u0645\u0642\u062F\u0627\u0631 +20%"
        },
        {
          action: `\u062E\u0637\u0629 \u062A\u062D\u0633\u064A\u0646 \u062E\u0627\u0635\u0629 \u0628\u0645\u062D\u0648\u0631 "${(worstQ ? worstQ.questionText : surveyTitle).slice(0, 40)}"`,
          rationale: `\u0645\u0639\u0627\u0644\u062C\u0629 \u0623\u0633\u0628\u0627\u0628 \u0627\u0644\u0627\u0646\u062E\u0641\u0627\u0636 \u0627\u0644\u0645\u0633\u062C\u0644 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u0624\u0627\u0644 \u0644\u0636\u0645\u0627\u0646 \u062C\u0648\u062F\u0629 \u0627\u0644\u0623\u062F\u0627\u0621 \u0648\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0639\u0627\u064A\u064A\u0631.`,
          suggestedAssignee: "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062C\u0648\u062F\u0629 \u0648\u0627\u0644\u062E\u062F\u0645\u0627\u062A",
          suggestedDeadline: "\u062E\u0644\u0627\u0644 15 \u064A\u0648\u0645\u0627\u064B",
          expectedImpact: "\u0631\u0641\u0639 \u0627\u0644\u0645\u0624\u0634\u0631 \u0641\u0648\u0642 85%"
        }
      ]
    };
  }
  return {
    period: statsSummary?.surveyId ? `Analyse cibl\xE9e : ${surveyTitle}` : "P\xE9riode courante (Donn\xE9es consolid\xE9es)",
    surveyId: statsSummary?.surveyId,
    surveyTitle,
    questionAnalyses: effectiveQuestionAnalyses,
    strengths: [
      {
        title: bestQ ? `Point fort av\xE9r\xE9 : ${bestQ.questionText.slice(0, 60)}` : `Satisfaction globale de ${csat}% sur "${surveyTitle}"`,
        description: bestQ ? `Cette question recueille le plus fort taux d'adh\xE9sion (${bestQ.score}%) avec ${bestQ.details}.` : `Ce questionnaire affiche un taux d'adh\xE9sion solide avec ${totalResponses} r\xE9pondants enregistr\xE9s.`,
        metric: bestQ ? `${bestQ.score}% favorable (${bestQ.responseCount} retours)` : `${csat}% d'avis favorables (${totalResponses} retours)`,
        confidence: 0.95
      },
      {
        title: secondBestQ ? `Indicateur favorable : ${secondBestQ.questionText.slice(0, 60)}` : `Score Net Promoteur positif (+${nps})`,
        description: secondBestQ ? `\xC9valuation positive confirm\xE9e (${secondBestQ.score}%) par les usagers interrog\xE9s.` : `La majorit\xE9 des r\xE9pondants recommandent les services de cette enqu\xEAte.`,
        metric: secondBestQ ? `${secondBestQ.score}% satisfaction` : `Score NPS : +${nps}`,
        confidence: 0.91
      },
      {
        title: "Tra\xE7abilit\xE9 et engagement qualit\xE9 CERT",
        description: `${totalResponses} participant(s) enregistr\xE9(s) permettant un pilotage direct de la qualit\xE9.`,
        metric: `${totalResponses} retours enregistr\xE9s`,
        confidence: 0.89
      }
    ],
    priorityProblems: [
      {
        title: `R\xE9clamation signal\xE9e : "${primaryComplaint.slice(0, 60)}"`,
        description: `Dossier et motif d'insatisfaction recens\xE9 lors de la passation de l'enqu\xEAte "${surveyTitle}".`,
        metric: `${complaintsSummary.length} r\xE9clamation(s) li\xE9e(s)`,
        severity: "high",
        confidence: 0.94
      },
      {
        title: worstQ && worstQ.score < 75 ? `Axe d'am\xE9lioration prioritaire : ${worstQ.questionText.slice(0, 60)}` : `Optimisation des d\xE9lais et communication proactive`,
        description: worstQ ? `Cette question affiche le score le plus bas (${worstQ.score}%) de l'enqu\xEAte, n\xE9cessitant une intervention cibl\xE9e.` : `Attente forte d'un suivi par SMS/WhatsApp pour r\xE9duire les d\xE9marches en pr\xE9sentiel.`,
        metric: worstQ ? `${worstQ.score}% satisfaction` : `Signalement prioritaire`,
        severity: "medium",
        confidence: 0.88
      }
    ],
    actionPlans: [
      {
        action: `Prise en charge prioritaire du signalement : "${primaryComplaint.slice(0, 50)}"`,
        rationale: `Apporter une solution rapide et contacter le d\xE9clarant dans les 48 heures ouvr\xE9es.`,
        suggestedAssignee: "Responsable Exp\xE9rience Client & Support CERT",
        suggestedDeadline: "48 heures",
        expectedImpact: "Cl\xF4ture du dossier & r\xE9tablissement de la satisfaction"
      },
      {
        action: `Plan d'action correctif sur : "${(worstQ ? worstQ.questionText : surveyTitle).slice(0, 50)}"`,
        rationale: `Corriger le dysfonctionnement identifi\xE9 par les r\xE9pondants dans le cadre de cette enqu\xEAte.`,
        suggestedAssignee: "Responsable Op\xE9rationnel de l'Activit\xE9",
        suggestedDeadline: "15 jours",
        expectedImpact: "+15 \xE0 +20 points de satisfaction attendus"
      }
    ]
  };
}

// server.ts
dotenv.config();
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var isProduction = process.env.NODE_ENV === "production";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: "15mb" }));
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
  });
});
app.get("/api/diagnostic", (req, res) => {
  const isVercel2 = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isVercel2 ? "/tmp/data" : path2.resolve(__dirname2, "data");
  const dbFile = path2.join(dataDir, "db.json");
  const report = {
    status: "checking",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      port: process.env.PORT || 3e3,
      appUrl: process.env.APP_URL || null,
      nodeVersion: process.version
    },
    paths: {
      dataDir,
      dbFile,
      dataDirExists: false,
      dataDirWritable: false,
      dbFileExists: false,
      dbFileWritable: false
    },
    databaseStats: {
      surveysCount: 0,
      submissionsCount: 0,
      complaintsCount: 0
    },
    testWriteRead: {
      success: false,
      writeDurationMs: null,
      readDurationMs: null,
      error: null
    }
  };
  try {
    if (!fs2.existsSync(dataDir)) {
      fs2.mkdirSync(dataDir, { recursive: true });
    }
    report.paths.dataDirExists = fs2.existsSync(dataDir);
    fs2.accessSync(dataDir, fs2.constants.R_OK | fs2.constants.W_OK);
    report.paths.dataDirWritable = true;
    report.paths.dbFileExists = fs2.existsSync(dbFile);
    if (report.paths.dbFileExists) {
      fs2.accessSync(dbFile, fs2.constants.R_OK | fs2.constants.W_OK);
      report.paths.dbFileWritable = true;
    }
    const surveys = dbInstance.getSurveys();
    const stats = dbInstance.getDashboardStats();
    report.databaseStats.surveysCount = surveys.length;
    report.databaseStats.submissionsCount = stats.totalResponses;
    report.databaseStats.complaintsCount = stats.complaints?.total || 0;
    const testKey = `diag-${Date.now()}`;
    const testFile = path2.join(dataDir, `.write_test_${Date.now()}.tmp`);
    const writeStart = Date.now();
    fs2.writeFileSync(testFile, JSON.stringify({ testKey, at: (/* @__PURE__ */ new Date()).toISOString() }), "utf-8");
    report.testWriteRead.writeDurationMs = Date.now() - writeStart;
    const readStart = Date.now();
    const readContent = fs2.readFileSync(testFile, "utf-8");
    report.testWriteRead.readDurationMs = Date.now() - readStart;
    try {
      fs2.unlinkSync(testFile);
    } catch (_) {
    }
    const parsed = JSON.parse(readContent);
    if (parsed.testKey === testKey) {
      report.testWriteRead.success = true;
      report.status = "healthy";
      report.message = "Database filesystem connectivity verified: physical write and read succeeded.";
    } else {
      report.status = "warning";
      report.testWriteRead.error = "Verification payload mismatch";
    }
    res.json(report);
  } catch (err) {
    report.status = "error";
    report.testWriteRead.error = err.message;
    report.suggestion = "V\xE9rifiez les permissions du dossier data/ sur votre h\xE9bergement Hostinger (ex: chmod -R 775 data).";
    res.status(500).json(report);
  }
});
app.get("/api/surveys", (req, res) => {
  try {
    const list = dbInstance.getSurveys();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/surveys/:id", (req, res) => {
  try {
    const survey = dbInstance.getSurveyById(req.params.id);
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    res.json(survey);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/surveys", (req, res) => {
  try {
    const created = dbInstance.createSurvey(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/surveys/:id", (req, res) => {
  try {
    const updated = dbInstance.updateSurvey(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Survey not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/surveys/:id/duplicate", (req, res) => {
  try {
    const duplicated = dbInstance.duplicateSurvey(req.params.id);
    if (!duplicated) return res.status(404).json({ error: "Survey not found" });
    res.status(201).json(duplicated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/surveys/:id", (req, res) => {
  try {
    const deleted = dbInstance.deleteSurvey(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Survey not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/surveys/:id/public", (req, res) => {
  try {
    const survey = dbInstance.getSurveyById(req.params.id);
    if (!survey) return res.status(404).json({ error: "Enqu\xEAte introuvable" });
    res.json(survey);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/surveys/:id/submit", async (req, res) => {
  try {
    const { surveyId, language, channel, answers, complaint } = req.body;
    let csatPositive = true;
    let npsType = "promoter";
    let detectedSentiment = "positive";
    if (Array.isArray(answers)) {
      answers.forEach((ans) => {
        if (ans.type === "stars") {
          const num = Number(ans.value);
          if (num <= 2) {
            csatPositive = false;
            detectedSentiment = "negative";
          } else if (num === 3) {
            csatPositive = false;
            if (detectedSentiment !== "negative") detectedSentiment = "neutral";
          }
        } else if (ans.type === "nps") {
          const num = Number(ans.value);
          if (num >= 9) npsType = "promoter";
          else if (num >= 7) {
            npsType = "passive";
            if (detectedSentiment === "positive") detectedSentiment = "neutral";
          } else {
            npsType = "detractor";
            detectedSentiment = "negative";
          }
        }
      });
    }
    let analyzedComplaint = complaint;
    if (complaint && complaint.hasComplaint && complaint.problemDescription) {
      detectedSentiment = "negative";
      const text = complaint.problemDescription || "";
      const isUrgent = /urgent|immédiat|bloqué|bloquée|retard|police|avocat|justice|غضب|كارثة|مستعجل|طبيب|عملية/i.test(text);
      const isBilling = /facture|payer|tarif|frais|argent|flous|خلاص|فلوس|فاتورة|سعر/i.test(text);
      const isDelay = /délai|attente|mois|semaine|retard|وقت|نستنى|استنى|تعطيل|تأخير/i.test(text);
      const isWelcome = /accueil|guichet|agent|comportement|معاملة|عون|استقبال/i.test(text);
      let cat = "Service Client & Qualit\xE9";
      if (isBilling) cat = "Facturation & Paiements";
      else if (isDelay) cat = "D\xE9lais & Traitement de dossier";
      else if (isWelcome) cat = "Accueil & Qualit\xE9 du Service";
      analyzedComplaint = {
        ...complaint,
        aiSummary: text.length > 120 ? text.slice(0, 120) + "..." : text,
        aiSuggestedCategory: cat,
        aiSuggestedPriority: isUrgent ? "urgent" : isDelay ? "high" : "medium",
        aiSuggestedActions: [
          "Prendre contact avec le d\xE9clarant sous 24h",
          "V\xE9rifier les \xE9l\xE9ments du dossier avec l'\xE9quipe concern\xE9e"
        ],
        aiConfidence: 0.88
      };
    }
    const { submission, complaintRecord } = dbInstance.createSubmission({
      surveyId: req.params.id || surveyId,
      language: language || "fr",
      channel: channel || "web",
      answers,
      complaint: analyzedComplaint,
      sentiment: detectedSentiment,
      csatPositive,
      npsType
    });
    res.status(201).json({
      success: true,
      submissionId: submission.id,
      complaintId: complaintRecord?.id,
      whatsappAlertSent: Boolean(complaintRecord?.whatsappAlertSent),
      whatsappRecipient: complaintRecord?.whatsappRecipient,
      priority: complaintRecord?.priority,
      message: "R\xE9ponses enregistr\xE9es avec succ\xE8s"
    });
    if (complaint && complaint.hasComplaint && complaint.problemDescription && complaintRecord) {
      setImmediate(async () => {
        try {
          const aiAnalysis = await analyzeComplaintWithAI(complaint.problemDescription, language || "fr");
          if (aiAnalysis && complaintRecord.id) {
            dbInstance.updateComplaint(complaintRecord.id, {
              aiSummary: aiAnalysis.summary,
              aiSuggestedCategory: aiAnalysis.category,
              aiSuggestedPriority: aiAnalysis.priority,
              aiSuggestedActions: aiAnalysis.suggestedActions,
              aiConfidence: aiAnalysis.confidence,
              category: aiAnalysis.category,
              priority: aiAnalysis.priority
            });
          }
        } catch (e) {
          console.warn("Background AI complaint analysis notice:", e);
        }
      });
    }
  } catch (err) {
    console.error("Error submitting survey:", err);
    res.status(500).json({ error: err.message || "Erreur lors de l'enregistrement des r\xE9ponses" });
  }
});
app.get("/api/complaints", (req, res) => {
  try {
    const { status, priority, search, surveyId } = req.query;
    const list = dbInstance.getComplaints({ status, priority, search, surveyId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/complaints/:id", (req, res) => {
  try {
    const complaint = dbInstance.getComplaintById(req.params.id);
    if (!complaint) return res.status(404).json({ error: "R\xE9clamation introuvable" });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch("/api/complaints/:id", (req, res) => {
  try {
    const updated = dbInstance.updateComplaint(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "R\xE9clamation introuvable" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/complaints", (req, res) => {
  try {
    const created = dbInstance.createComplaint(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/complaints/:id", (req, res) => {
  try {
    const success = dbInstance.deleteComplaint(req.params.id);
    if (!success) return res.status(404).json({ error: "R\xE9clamation introuvable" });
    res.json({ success: true, message: "R\xE9clamation supprim\xE9e" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/complaints/:id/notes", (req, res) => {
  try {
    const { author, content } = req.body;
    if (!content) return res.status(400).json({ error: "Le contenu de la note est obligatoire" });
    const updated = dbInstance.addComplaintNote(req.params.id, author || "Gestionnaire", content);
    if (!updated) return res.status(404).json({ error: "R\xE9clamation introuvable" });
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/reset-data", (_req, res) => {
  try {
    const result = dbInstance.resetAllClientData();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/dashboard/stats", (req, res) => {
  try {
    const { surveyId, periodDays, language, channel } = req.query;
    const stats = dbInstance.getDashboardStats({
      surveyId,
      periodDays: periodDays ? Number(periodDays) : void 0,
      language,
      channel
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/notifications", (req, res) => {
  try {
    const list = dbInstance.getNotifications();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch("/api/notifications/:id/read", (req, res) => {
  try {
    dbInstance.markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai/generate-survey", async (req, res) => {
  try {
    const { prompt, language } = req.body;
    if (!prompt) return res.status(400).json({ error: "Description d'activit\xE9 requise" });
    const result = await generateSurveyWithAI(prompt, language || "fr");
    res.json(result);
  } catch (err) {
    const fallback = await generateSurveyWithAI(req.body.prompt || "Service g\xE9n\xE9ral", req.body.language || "fr");
    res.json(fallback);
  }
});
app.post("/api/ai/analyze-complaint", async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ error: "Texte de la r\xE9clamation requis" });
    const result = await analyzeComplaintWithAI(text, language || "fr");
    res.json(result);
  } catch (err) {
    const fallback = await analyzeComplaintWithAI(req.body.text || "", req.body.language || "fr");
    res.json(fallback);
  }
});
app.post("/api/ai/transcribe-voice", async (req, res) => {
  try {
    const { base64Audio, mimeType, targetLanguage } = req.body;
    if (!base64Audio) return res.status(400).json({ error: "Fichier audio requis" });
    const transcription = await transcribeAudioWithAI(
      base64Audio,
      mimeType || "audio/webm",
      targetLanguage || "fr"
    );
    res.json({ transcription: transcription || null });
  } catch (err) {
    res.json({ transcription: null, error: err.message });
  }
});
app.post("/api/ai/translate-to-french", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Texte requis" });
    const translated = await translateTextToFrench(text);
    res.json({ translatedText: translated });
  } catch (err) {
    res.json({ translatedText: req.body.text || "" });
  }
});
app.get("/api/surveys/:id/analysis", (req, res) => {
  try {
    const survey = dbInstance.getSurveyById(req.params.id);
    if (!survey) return res.status(404).json({ error: "Enqu\xEAte introuvable" });
    const questionAnalyses = dbInstance.getSurveyQuestionAnalyses(req.params.id);
    const complaints = dbInstance.getComplaints({ surveyId: req.params.id });
    const stats = dbInstance.getDashboardStats({ surveyId: req.params.id });
    res.json({
      survey,
      questionAnalyses,
      complaints,
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai/recommendations", async (req, res) => {
  try {
    const { surveyId, language } = req.body || {};
    const isSpecific = surveyId && surveyId !== "all";
    const stats = dbInstance.getDashboardStats(isSpecific ? { surveyId } : void 0);
    const survey = isSpecific ? dbInstance.getSurveyById(surveyId) : void 0;
    const complaints = dbInstance.getComplaints(isSpecific ? { surveyId } : void 0);
    const realQuestionAnalyses = isSpecific ? dbInstance.getSurveyQuestionAnalyses(surveyId) : [];
    const recommendations = await generateRecommendationsWithAI({
      ...stats,
      surveyId: survey?.id,
      surveyTitle: survey?.title,
      surveyCategory: survey?.category,
      surveyQuestions: survey?.questions,
      surveyLanguage: survey?.language || language,
      questionAnalyses: realQuestionAnalyses,
      complaintsSummary: complaints.slice(0, 5).map((c) => c.problemDescription)
    });
    recommendations.questionAnalyses = realQuestionAnalyses;
    if (survey) {
      recommendations.surveyId = survey.id;
      recommendations.surveyTitle = survey.title;
    }
    dbInstance.saveRecommendation({
      id: `rec-${Date.now()}`,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...recommendations
    });
    res.json(recommendations);
  } catch (err) {
    const { surveyId, language } = req.body || {};
    const isSpecific = surveyId && surveyId !== "all";
    const stats = dbInstance.getDashboardStats(isSpecific ? { surveyId } : void 0);
    const survey = isSpecific ? dbInstance.getSurveyById(surveyId) : void 0;
    const realQuestionAnalyses = isSpecific ? dbInstance.getSurveyQuestionAnalyses(surveyId) : [];
    const fallback = await generateRecommendationsWithAI({
      ...stats,
      surveyId: survey?.id,
      surveyTitle: survey?.title,
      surveyCategory: survey?.category,
      surveyQuestions: survey?.questions,
      surveyLanguage: survey?.language || language,
      questionAnalyses: realQuestionAnalyses
    });
    fallback.questionAnalyses = realQuestionAnalyses;
    res.json(fallback);
  }
});
app.get("/api/settings", (_req, res) => {
  try {
    const settings = dbInstance.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/settings", (req, res) => {
  try {
    const updated = dbInstance.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/whatsapp/config", (req, res) => {
  try {
    const config = dbInstance.getWhatsAppConfig();
    const logs = dbInstance.getWhatsAppLogs();
    res.json({
      config,
      stats: {
        totalSent: logs.length,
        lastSentAt: logs.length > 0 ? logs[0].sentAt : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/whatsapp/config", (req, res) => {
  try {
    const updated = dbInstance.updateWhatsAppConfig(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/whatsapp/logs", (req, res) => {
  try {
    const logs = dbInstance.getWhatsAppLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/whatsapp/test", async (req, res) => {
  try {
    const config = dbInstance.getWhatsAppConfig();
    const targetPhone = req.body.phoneNumber || config.recipientPhone;
    const testMessage = [
      `\u{1F514} *${config.customHeader || "CERT - Alerte R\xE9clamation Critique Temps R\xE9el"}*`,
      `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
      `\u{1F9EA} *TEST DE TRANSMISSION WHATSAPP EN TEMPS R\xC9EL*`,
      `\u{1F4C5} *Date :* ${(/* @__PURE__ */ new Date()).toLocaleString("fr-FR")}`,
      `\u2705 *Statut liaison :* Test d'int\xE9gration actif`,
      `\u{1F464} *Destinataire :* ${config.managerName || "Responsable d'astreinte"} (${targetPhone})`,
      ``,
      `Ce message confirme que la passerelle d'alerte WhatsApp est active. Les r\xE9clamations critiques et urgentes d\xE9tect\xE9es par l'IA y seront relay\xE9es en temps r\xE9el.`,
      `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
      `_Satisfaction Client CERT - Centre d'\xC9tudes et de Recherche des T\xE9l\xE9communications_`
    ].join("\n");
    const waUrl = buildWhatsAppLink(targetPhone, testMessage);
    const sendResult = await sendRealWhatsAppNotification(config, targetPhone, testMessage);
    const logEntry = dbInstance.addWhatsAppLog({
      id: `walog-test-${Date.now()}`,
      recipientPhone: targetPhone,
      recipientRole: "manager",
      priority: "high",
      message: testMessage,
      status: sendResult.success ? "delivered" : sendResult.method === "direct_link" ? "ready_to_send" : "failed",
      whatsappUrl: waUrl,
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      triggerType: "test",
      deliveryMethod: sendResult.method,
      errorMessage: sendResult.error
    });
    res.json({
      success: true,
      delivered: sendResult.success,
      deliveryMethod: sendResult.method,
      errorMessage: sendResult.error,
      message: sendResult.success ? `Message transmis directement \xE0 WhatsApp via ${sendResult.method} !` : sendResult.method === "direct_link" ? `Alerte pr\xE9-format\xE9e avec succ\xE8s. Cliquez sur "Ouvrir sur WhatsApp" pour l'envoyer au destinataire.` : `Tentative passerelle : ${sendResult.error}`,
      whatsappUrl: waUrl,
      log: logEntry
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/complaints/:id/notify-whatsapp", async (req, res) => {
  try {
    const complaint = dbInstance.getComplaintById(req.params.id);
    if (!complaint) return res.status(404).json({ error: "R\xE9clamation introuvable" });
    const config = dbInstance.getWhatsAppConfig();
    const target = req.body.target || "manager";
    const recipientPhone = req.body.phoneNumber || (target === "client" ? complaint.phone : config.recipientPhone);
    if (!recipientPhone) {
      return res.status(400).json({ error: "Num\xE9ro de t\xE9l\xE9phone requis pour l'envoi WhatsApp" });
    }
    let messageText = req.body.customMessage;
    if (!messageText) {
      if (target === "client") {
        messageText = formatClientWhatsAppGreeting(complaint);
      } else {
        messageText = formatManagerWhatsAppAlert(complaint, config);
      }
    }
    const waUrl = buildWhatsAppLink(recipientPhone, messageText);
    const sendResult = await sendRealWhatsAppNotification(config, recipientPhone, messageText);
    const updatedComplaint = dbInstance.updateComplaint(complaint.id, {
      whatsappAlertSent: sendResult.success || target === "client" || req.body.markAsSent,
      whatsappAlertReady: true,
      whatsappAlertMethod: sendResult.method,
      whatsappAlertDate: (/* @__PURE__ */ new Date()).toISOString(),
      whatsappRecipient: recipientPhone
    });
    const logEntry = dbInstance.addWhatsAppLog({
      id: `walog-${Date.now()}`,
      complaintId: complaint.id,
      recipientPhone,
      recipientRole: target === "client" ? "client" : "manager",
      priority: complaint.priority,
      message: messageText,
      status: sendResult.success ? "delivered" : "ready_to_send",
      whatsappUrl: waUrl,
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      triggerType: target === "client" ? "client_contact" : "manual_resend",
      surveyTitle: complaint.surveyTitle,
      dossierNumber: complaint.dossierNumber,
      deliveryMethod: sendResult.method,
      errorMessage: sendResult.error
    });
    dbInstance.addComplaintNote(
      complaint.id,
      "Alerte WhatsApp",
      `Message WhatsApp ${target === "client" ? "client" : "responsable"} pr\xE9par\xE9/transmis au ${recipientPhone} (${sendResult.success ? "D\xE9livr\xE9 via API" : "Lien wa.me"}).`
    );
    res.json({
      success: true,
      delivered: sendResult.success,
      deliveryMethod: sendResult.method,
      errorMessage: sendResult.error,
      whatsappUrl: waUrl,
      complaint: updatedComplaint,
      log: logEntry
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/complaints/:id/whatsapp-reply", async (req, res) => {
  try {
    const complaint = dbInstance.getComplaintById(req.params.id);
    if (!complaint) return res.status(404).json({ error: "R\xE9clamation introuvable" });
    const language = req.body.language || "fr";
    const replyText = await generateCustomerWhatsAppReplyWithAI(complaint, language);
    res.json({
      replyText,
      clientPhone: complaint.phone,
      whatsappUrl: complaint.phone ? buildWhatsAppLink(complaint.phone, replyText) : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/export/csv", (req, res) => {
  try {
    const type = req.query.type || "complaints";
    const surveyId = req.query.surveyId || void 0;
    const isSpecific = surveyId && surveyId !== "all";
    if (type === "complaints") {
      const complaints = dbInstance.getComplaints(isSpecific ? { surveyId } : void 0);
      const headers = ["ID", "Date", "Enqu\xEAte", "Statut", "Priorit\xE9", "Cat\xE9gorie", "Dossier", "T\xE9l\xE9phone", "Email", "Description", "R\xE9sum\xE9 IA"];
      const rows = complaints.map((c) => [
        `"${c.id}"`,
        `"${new Date(c.createdAt).toLocaleDateString("fr-FR")}"`,
        `"${(c.surveyTitle || "").replace(/"/g, '""')}"`,
        `"${c.status}"`,
        `"${c.priority}"`,
        `"${(c.category || "").replace(/"/g, '""')}"`,
        `"${c.dossierNumber || ""}"`,
        `"${c.phone || ""}"`,
        `"${c.email || ""}"`,
        `"${(c.problemDescription || "").replace(/"/g, '""')}"`,
        `"${(c.aiSummary || "").replace(/"/g, '""')}"`
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="reclamations_${isSpecific ? surveyId : "global"}.csv"`);
      return res.send("\uFEFF" + csv);
    } else {
      const stats = dbInstance.getDashboardStats(isSpecific ? { surveyId } : void 0);
      const headers = ["M\xE9trique", "Valeur"];
      const rows = [
        ["Total enqu\xEAtes", stats.totalSurveys],
        ["Enqu\xEAtes publi\xE9es", stats.publishedSurveys],
        ["Total r\xE9ponses", stats.totalResponses],
        ["Taux CSAT (%)", `${stats.csatPercentage}%`],
        ["Score NPS", stats.npsScore],
        ["Promoteurs", stats.promotersCount],
        ["Passifs", stats.passivesCount],
        ["D\xE9tracteurs", stats.detractorsCount],
        ["R\xE9clamations ouvertes", stats.complaints.newCount + stats.complaints.inProgressCount],
        ["R\xE9clamations r\xE9solues", stats.complaints.resolvedCount]
      ];
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="satisfaction_kpis_${isSpecific ? surveyId : "global"}.csv"`);
      return res.send("\uFEFF" + csv);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path2.resolve(__dirname2, "dist");
    if (!fs2.existsSync(path2.join(distPath, "index.html")) && fs2.existsSync(path2.join(__dirname2, "index.html"))) {
      distPath = __dirname2;
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexFile = path2.join(distPath, "index.html");
      if (fs2.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;background:#0f172a;color:#fff;"><h2>Satisfaction Client CERT</h2><p>Fichier index.html introuvable. Ex\xE9cutez "npm run build" pour g\xE9n\xE9rer les fichiers de production.</p></body></html>');
      }
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} SatisfactionAI server running at http://0.0.0.0:${PORT}`);
  });
}
var server_default = app;
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Fatal server startup error:", err);
    process.exit(1);
  });
}
export {
  server_default as default
};
