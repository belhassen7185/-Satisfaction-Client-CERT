import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dbInstance } from './server/db.ts';
import {
  generateSurveyWithAI,
  analyzeComplaintWithAI,
  transcribeAudioWithAI,
  translateTextToFrench,
  generateRecommendationsWithAI,
  generateCustomerWhatsAppReplyWithAI,
} from './server/gemini.ts';
import {
  formatManagerWhatsAppAlert,
  formatClientWhatsAppGreeting,
  buildWhatsAppLink,
  cleanPhoneNumber,
  dispatchWebhookIfConfigured,
  sendRealWhatsAppNotification,
} from './server/whatsapp.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Enable CORS for all incoming client origins (mobile phones, external hosts, WhatsApp web views)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Parse JSON bodies (with 15MB limit for audio base64 uploads)
app.use(express.json({ limit: '15mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
  });
});

// Diagnostic endpoint: live write/read test for production server connectivity & storage
app.get('/api/diagnostic', (req, res) => {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isVercel ? '/tmp/data' : path.resolve(__dirname, 'data');
  const dbFile = path.join(dataDir, 'db.json');

  const report: any = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      appUrl: process.env.APP_URL || null,
      nodeVersion: process.version,
    },
    paths: {
      dataDir,
      dbFile,
      dataDirExists: false,
      dataDirWritable: false,
      dbFileExists: false,
      dbFileWritable: false,
    },
    databaseStats: {
      surveysCount: 0,
      submissionsCount: 0,
      complaintsCount: 0,
    },
    testWriteRead: {
      success: false,
      writeDurationMs: null,
      readDurationMs: null,
      error: null,
    },
  };

  try {
    // 1. Directory check
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    report.paths.dataDirExists = fs.existsSync(dataDir);
    fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
    report.paths.dataDirWritable = true;

    // 2. File stats
    report.paths.dbFileExists = fs.existsSync(dbFile);
    if (report.paths.dbFileExists) {
      fs.accessSync(dbFile, fs.constants.R_OK | fs.constants.W_OK);
      report.paths.dbFileWritable = true;
    }

    // 3. Database in-memory stats
    const surveys = dbInstance.getSurveys();
    const stats = dbInstance.getDashboardStats();
    report.databaseStats.surveysCount = surveys.length;
    report.databaseStats.submissionsCount = stats.totalResponses;
    report.databaseStats.complaintsCount = stats.complaints?.total || 0;

    // 4. Live Write & Read test
    const testKey = `diag-${Date.now()}`;
    const testFile = path.join(dataDir, `.write_test_${Date.now()}.tmp`);
    const writeStart = Date.now();
    fs.writeFileSync(testFile, JSON.stringify({ testKey, at: new Date().toISOString() }), 'utf-8');
    report.testWriteRead.writeDurationMs = Date.now() - writeStart;

    const readStart = Date.now();
    const readContent = fs.readFileSync(testFile, 'utf-8');
    report.testWriteRead.readDurationMs = Date.now() - readStart;
    try {
      fs.unlinkSync(testFile);
    } catch (_) {}

    const parsed = JSON.parse(readContent);
    if (parsed.testKey === testKey) {
      report.testWriteRead.success = true;
      report.status = 'healthy';
      report.message = 'Database filesystem connectivity verified: physical write and read succeeded.';
    } else {
      report.status = 'warning';
      report.testWriteRead.error = 'Verification payload mismatch';
    }

    res.json(report);
  } catch (err: any) {
    report.status = 'error';
    report.testWriteRead.error = err.message;
    report.suggestion = 'Vérifiez les permissions du dossier data/ sur votre hébergement Hostinger (ex: chmod -R 775 data).';
    res.status(500).json(report);
  }
});

// 1. Surveys API
app.get('/api/surveys', (req, res) => {
  try {
    const list = dbInstance.getSurveys();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/surveys/:id', (req, res) => {
  try {
    const survey = dbInstance.getSurveyById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.json(survey);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/surveys', (req, res) => {
  try {
    const created = dbInstance.createSurvey(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/surveys/:id', (req, res) => {
  try {
    const updated = dbInstance.updateSurvey(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Survey not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/surveys/:id/duplicate', (req, res) => {
  try {
    const duplicated = dbInstance.duplicateSurvey(req.params.id);
    if (!duplicated) return res.status(404).json({ error: 'Survey not found' });
    res.status(201).json(duplicated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/surveys/:id', (req, res) => {
  try {
    const deleted = dbInstance.deleteSurvey(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Survey not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Public Survey Access & Submission
app.get('/api/surveys/:id/public', (req, res) => {
  try {
    const survey = dbInstance.getSurveyById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Enquête introuvable' });
    // In public mode, can view published or preview draft
    res.json(survey);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/surveys/:id/submit', async (req, res) => {
  try {
    const { surveyId, language, channel, answers, complaint } = req.body;

    // Detect sentiment and NPS/CSAT from answers
    let csatPositive = true;
    let npsType: 'promoter' | 'passive' | 'detractor' = 'promoter';
    let detectedSentiment: 'positive' | 'neutral' | 'negative' = 'positive';

    if (Array.isArray(answers)) {
      answers.forEach((ans: any) => {
        if (ans.type === 'stars') {
          const num = Number(ans.value);
          if (num <= 2) {
            csatPositive = false;
            detectedSentiment = 'negative';
          } else if (num === 3) {
            csatPositive = false;
            if (detectedSentiment !== 'negative') detectedSentiment = 'neutral';
          }
        } else if (ans.type === 'nps') {
          const num = Number(ans.value);
          if (num >= 9) npsType = 'promoter';
          else if (num >= 7) {
            npsType = 'passive';
            if (detectedSentiment === 'positive') detectedSentiment = 'neutral';
          } else {
            npsType = 'detractor';
            detectedSentiment = 'negative';
          }
        }
      });
    }

    // Immediate fast heuristic analysis for complaints (instant response)
    let analyzedComplaint = complaint;
    if (complaint && complaint.hasComplaint && complaint.problemDescription) {
      detectedSentiment = 'negative';
      const text = complaint.problemDescription || '';
      const isUrgent = /urgent|immédiat|bloqué|bloquée|retard|police|avocat|justice|غضب|كارثة|مستعجل|طبيب|عملية/i.test(text);
      const isBilling = /facture|payer|tarif|frais|argent|flous|خلاص|فلوس|فاتورة|سعر/i.test(text);
      const isDelay = /délai|attente|mois|semaine|retard|وقت|نستنى|استنى|تعطيل|تأخير/i.test(text);
      const isWelcome = /accueil|guichet|agent|comportement|معاملة|عون|استقبال/i.test(text);

      let cat = 'Service Client & Qualité';
      if (isBilling) cat = 'Facturation & Paiements';
      else if (isDelay) cat = 'Délais & Traitement de dossier';
      else if (isWelcome) cat = 'Accueil & Qualité du Service';

      analyzedComplaint = {
        ...complaint,
        aiSummary: text.length > 120 ? text.slice(0, 120) + '...' : text,
        aiSuggestedCategory: cat,
        aiSuggestedPriority: isUrgent ? 'urgent' : isDelay ? 'high' : 'medium',
        aiSuggestedActions: [
          'Prendre contact avec le déclarant sous 24h',
          'Vérifier les éléments du dossier avec l\'équipe concernée'
        ],
        aiConfidence: 0.88,
      };
    }

    const { submission, complaintRecord } = dbInstance.createSubmission({
      surveyId: req.params.id || surveyId,
      language: language || 'fr',
      channel: channel || 'web',
      answers,
      complaint: analyzedComplaint,
      sentiment: detectedSentiment,
      csatPositive,
      npsType,
    });

    // Respond immediately to the user without waiting for AI network calls (< 10ms)
    res.status(201).json({
      success: true,
      submissionId: submission.id,
      complaintId: complaintRecord?.id,
      whatsappAlertSent: Boolean(complaintRecord?.whatsappAlertSent),
      whatsappRecipient: complaintRecord?.whatsappRecipient,
      priority: complaintRecord?.priority,
      message: 'Réponses enregistrées avec succès',
    });

    // Run deep AI analysis in the background without blocking the respondent
    if (complaint && complaint.hasComplaint && complaint.problemDescription && complaintRecord) {
      setImmediate(async () => {
        try {
          const aiAnalysis = await analyzeComplaintWithAI(complaint.problemDescription, language || 'fr');
          if (aiAnalysis && complaintRecord.id) {
            dbInstance.updateComplaint(complaintRecord.id, {
              aiSummary: aiAnalysis.summary,
              aiSuggestedCategory: aiAnalysis.category,
              aiSuggestedPriority: aiAnalysis.priority,
              aiSuggestedActions: aiAnalysis.suggestedActions,
              aiConfidence: aiAnalysis.confidence,
              category: aiAnalysis.category,
              priority: aiAnalysis.priority,
            });
          }
        } catch (e) {
          console.warn('Background AI complaint analysis notice:', e);
        }
      });
    }
  } catch (err: any) {
    console.error('Error submitting survey:', err);
    res.status(500).json({ error: err.message || 'Erreur lors de l\'enregistrement des réponses' });
  }
});

// 3. Complaints API
app.get('/api/complaints', (req, res) => {
  try {
    const { status, priority, search, surveyId } = req.query as Record<string, string>;
    const list = dbInstance.getComplaints({ status, priority, search, surveyId });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/complaints/:id', (req, res) => {
  try {
    const complaint = dbInstance.getComplaintById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Réclamation introuvable' });
    res.json(complaint);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/complaints/:id', (req, res) => {
  try {
    const updated = dbInstance.updateComplaint(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Réclamation introuvable' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints', (req, res) => {
  try {
    const created = dbInstance.createComplaint(req.body || {});
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/complaints/:id', (req, res) => {
  try {
    const success = dbInstance.deleteComplaint(req.params.id);
    if (!success) return res.status(404).json({ error: 'Réclamation introuvable' });
    res.json({ success: true, message: 'Réclamation supprimée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints/:id/notes', (req, res) => {
  try {
    const { author, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Le contenu de la note est obligatoire' });
    const updated = dbInstance.addComplaintNote(req.params.id, author || 'Gestionnaire', content);
    if (!updated) return res.status(404).json({ error: 'Réclamation introuvable' });
    res.status(201).json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset all client data endpoint
app.post('/api/reset-data', (_req, res) => {
  try {
    const result = dbInstance.resetAllClientData();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Dashboard Stats API
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const { surveyId, periodDays, language, channel } = req.query as Record<string, string>;
    const stats = dbInstance.getDashboardStats({
      surveyId,
      periodDays: periodDays ? Number(periodDays) : undefined,
      language,
      channel,
    });
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Notifications API
app.get('/api/notifications', (req, res) => {
  try {
    const list = dbInstance.getNotifications();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', (req, res) => {
  try {
    dbInstance.markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. AI Endpoints
app.post('/api/ai/generate-survey', async (req, res) => {
  try {
    const { prompt, language } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Description d\'activité requise' });
    const result = await generateSurveyWithAI(prompt, language || 'fr');
    res.json(result);
  } catch (err: any) {
    const fallback = await generateSurveyWithAI(req.body.prompt || 'Service général', req.body.language || 'fr');
    res.json(fallback);
  }
});

app.post('/api/ai/analyze-complaint', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ error: 'Texte de la réclamation requis' });
    const result = await analyzeComplaintWithAI(text, language || 'fr');
    res.json(result);
  } catch (err: any) {
    const fallback = await analyzeComplaintWithAI(req.body.text || '', req.body.language || 'fr');
    res.json(fallback);
  }
});

app.post('/api/ai/transcribe-voice', async (req, res) => {
  try {
    const { base64Audio, mimeType, targetLanguage } = req.body;
    if (!base64Audio) return res.status(400).json({ error: 'Fichier audio requis' });
    const transcription = await transcribeAudioWithAI(
      base64Audio,
      mimeType || 'audio/webm',
      targetLanguage || 'fr'
    );
    res.json({ transcription: transcription || null });
  } catch (err: any) {
    res.json({ transcription: null, error: err.message });
  }
});

app.post('/api/ai/translate-to-french', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Texte requis' });
    const translated = await translateTextToFrench(text);
    res.json({ translatedText: translated });
  } catch (err: any) {
    res.json({ translatedText: req.body.text || '' });
  }
});

// 6. Survey Deep Analysis API & AI Recommendations
app.get('/api/surveys/:id/analysis', (req, res) => {
  try {
    const survey = dbInstance.getSurveyById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Enquête introuvable' });
    const questionAnalyses = dbInstance.getSurveyQuestionAnalyses(req.params.id);
    const complaints = dbInstance.getComplaints({ surveyId: req.params.id });
    const stats = dbInstance.getDashboardStats({ surveyId: req.params.id });
    res.json({
      survey,
      questionAnalyses,
      complaints,
      stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/recommendations', async (req, res) => {
  try {
    const { surveyId, language } = req.body || {};
    const isSpecific = surveyId && surveyId !== 'all';
    const stats = dbInstance.getDashboardStats(isSpecific ? { surveyId } : undefined);
    const survey = isSpecific ? dbInstance.getSurveyById(surveyId) : undefined;
    const complaints = dbInstance.getComplaints(isSpecific ? { surveyId } : undefined);
    const realQuestionAnalyses = isSpecific ? dbInstance.getSurveyQuestionAnalyses(surveyId) : [];

    const recommendations = await generateRecommendationsWithAI({
      ...stats,
      surveyId: survey?.id,
      surveyTitle: survey?.title,
      surveyCategory: survey?.category,
      surveyQuestions: survey?.questions,
      surveyLanguage: survey?.language || language,
      questionAnalyses: realQuestionAnalyses,
      complaintsSummary: complaints.slice(0, 5).map((c) => c.problemDescription),
    });

    // Ensure questionAnalyses are attached and aligned
    recommendations.questionAnalyses = realQuestionAnalyses;
    if (survey) {
      recommendations.surveyId = survey.id;
      recommendations.surveyTitle = survey.title;
    }

    dbInstance.saveRecommendation({
      id: `rec-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      ...recommendations,
    });
    res.json(recommendations);
  } catch (err: any) {
    const { surveyId, language } = req.body || {};
    const isSpecific = surveyId && surveyId !== 'all';
    const stats = dbInstance.getDashboardStats(isSpecific ? { surveyId } : undefined);
    const survey = isSpecific ? dbInstance.getSurveyById(surveyId) : undefined;
    const realQuestionAnalyses = isSpecific ? dbInstance.getSurveyQuestionAnalyses(surveyId) : [];
    const fallback = await generateRecommendationsWithAI({
      ...stats,
      surveyId: survey?.id,
      surveyTitle: survey?.title,
      surveyCategory: survey?.category,
      surveyQuestions: survey?.questions,
      surveyLanguage: survey?.language || language,
      questionAnalyses: realQuestionAnalyses,
    });
    fallback.questionAnalyses = realQuestionAnalyses;
    res.json(fallback);
  }
});

// App Settings (Director & Organization) API
app.get('/api/settings', (_req, res) => {
  try {
    const settings = dbInstance.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const updated = dbInstance.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. WhatsApp Real-Time Notifications API
app.get('/api/whatsapp/config', (req, res) => {
  try {
    const config = dbInstance.getWhatsAppConfig();
    const logs = dbInstance.getWhatsAppLogs();
    res.json({
      config,
      stats: {
        totalSent: logs.length,
        lastSentAt: logs.length > 0 ? logs[0].sentAt : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/whatsapp/config', (req, res) => {
  try {
    const updated = dbInstance.updateWhatsAppConfig(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/whatsapp/logs', (req, res) => {
  try {
    const logs = dbInstance.getWhatsAppLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/test', async (req, res) => {
  try {
    const config = dbInstance.getWhatsAppConfig();
    const targetPhone = req.body.phoneNumber || config.recipientPhone;

    const testMessage = [
      `🔔 *${config.customHeader || 'CERT - Alerte Réclamation Critique Temps Réel'}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🧪 *TEST DE TRANSMISSION WHATSAPP EN TEMPS RÉEL*`,
      `📅 *Date :* ${new Date().toLocaleString('fr-FR')}`,
      `✅ *Statut liaison :* Test d'intégration actif`,
      `👤 *Destinataire :* ${config.managerName || 'Responsable d\'astreinte'} (${targetPhone})`,
      ``,
      `Ce message confirme que la passerelle d'alerte WhatsApp est active. Les réclamations critiques et urgentes détectées par l'IA y seront relayées en temps réel.`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `_Satisfaction Client CERT - Centre d'Études et de Recherche des Télécommunications_`,
    ].join('\n');

    const waUrl = buildWhatsAppLink(targetPhone, testMessage);

    // Attempt real dispatch if an API or Webhook is configured
    const sendResult = await sendRealWhatsAppNotification(config, targetPhone, testMessage);

    const logEntry = dbInstance.addWhatsAppLog({
      id: `walog-test-${Date.now()}`,
      recipientPhone: targetPhone,
      recipientRole: 'manager',
      priority: 'high',
      message: testMessage,
      status: sendResult.success ? 'delivered' : sendResult.method === 'direct_link' ? 'ready_to_send' : 'failed',
      whatsappUrl: waUrl,
      sentAt: new Date().toISOString(),
      triggerType: 'test',
      deliveryMethod: sendResult.method,
      errorMessage: sendResult.error,
    });

    res.json({
      success: true,
      delivered: sendResult.success,
      deliveryMethod: sendResult.method,
      errorMessage: sendResult.error,
      message: sendResult.success
        ? `Message transmis directement à WhatsApp via ${sendResult.method} !`
        : sendResult.method === 'direct_link'
        ? `Alerte pré-formatée avec succès. Cliquez sur "Ouvrir sur WhatsApp" pour l'envoyer au destinataire.`
        : `Tentative passerelle : ${sendResult.error}`,
      whatsappUrl: waUrl,
      log: logEntry,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints/:id/notify-whatsapp', async (req, res) => {
  try {
    const complaint = dbInstance.getComplaintById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Réclamation introuvable' });

    const config = dbInstance.getWhatsAppConfig();
    const target = req.body.target || 'manager'; // 'manager' | 'client'
    const recipientPhone =
      req.body.phoneNumber ||
      (target === 'client' ? complaint.phone : config.recipientPhone);

    if (!recipientPhone) {
      return res.status(400).json({ error: 'Numéro de téléphone requis pour l\'envoi WhatsApp' });
    }

    let messageText = req.body.customMessage;
    if (!messageText) {
      if (target === 'client') {
        messageText = formatClientWhatsAppGreeting(complaint);
      } else {
        messageText = formatManagerWhatsAppAlert(complaint, config);
      }
    }

    const waUrl = buildWhatsAppLink(recipientPhone, messageText);

    // Attempt real dispatch if gateway available
    const sendResult = await sendRealWhatsAppNotification(config, recipientPhone, messageText);

    // Update complaint record
    const updatedComplaint = dbInstance.updateComplaint(complaint.id, {
      whatsappAlertSent: sendResult.success || target === 'client' || req.body.markAsSent,
      whatsappAlertReady: true,
      whatsappAlertMethod: sendResult.method,
      whatsappAlertDate: new Date().toISOString(),
      whatsappRecipient: recipientPhone,
    });

    // Record in logs
    const logEntry = dbInstance.addWhatsAppLog({
      id: `walog-${Date.now()}`,
      complaintId: complaint.id,
      recipientPhone,
      recipientRole: target === 'client' ? 'client' : 'manager',
      priority: complaint.priority,
      message: messageText,
      status: sendResult.success ? 'delivered' : 'ready_to_send',
      whatsappUrl: waUrl,
      sentAt: new Date().toISOString(),
      triggerType: target === 'client' ? 'client_contact' : 'manual_resend',
      surveyTitle: complaint.surveyTitle,
      dossierNumber: complaint.dossierNumber,
      deliveryMethod: sendResult.method,
      errorMessage: sendResult.error,
    });

    // Add note to complaint
    dbInstance.addComplaintNote(
      complaint.id,
      'Alerte WhatsApp',
      `Message WhatsApp ${target === 'client' ? 'client' : 'responsable'} préparé/transmis au ${recipientPhone} (${sendResult.success ? 'Délivré via API' : 'Lien wa.me'}).`
    );

    res.json({
      success: true,
      delivered: sendResult.success,
      deliveryMethod: sendResult.method,
      errorMessage: sendResult.error,
      whatsappUrl: waUrl,
      complaint: updatedComplaint,
      log: logEntry,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints/:id/whatsapp-reply', async (req, res) => {
  try {
    const complaint = dbInstance.getComplaintById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Réclamation introuvable' });

    const language = (req.body.language || 'fr') as 'fr' | 'ar' | 'tn';
    const replyText = await generateCustomerWhatsAppReplyWithAI(complaint, language);

    res.json({
      replyText,
      clientPhone: complaint.phone,
      whatsappUrl: complaint.phone ? buildWhatsAppLink(complaint.phone, replyText) : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. CSV Export
app.get('/api/export/csv', (req, res) => {
  try {
    const type = req.query.type || 'complaints';
    const surveyId = (req.query.surveyId as string) || undefined;
    const isSpecific = surveyId && surveyId !== 'all';
    if (type === 'complaints') {
      const complaints = dbInstance.getComplaints(isSpecific ? { surveyId } : undefined);
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
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reclamations_${isSpecific ? surveyId : 'global'}.csv"`);
      return res.send('\uFEFF' + csv);
    } else {
      const stats = dbInstance.getDashboardStats(isSpecific ? { surveyId } : undefined);
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
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="satisfaction_kpis_${isSpecific ? surveyId : 'global'}.csv"`);
      return res.send('\uFEFF' + csv);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware mounting for Dev or Static files in Production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html')) && fs.existsSync(path.join(__dirname, 'index.html'))) {
      distPath = __dirname;
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;background:#0f172a;color:#fff;"><h2>Satisfaction Client CERT</h2><p>Fichier index.html introuvable. Exécutez "npm run build" pour générer les fichiers de production.</p></body></html>');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SatisfactionAI server running at http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}
