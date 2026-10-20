import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  QrCode as QrIcon,
  ExternalLink,
  Globe,
  Info,
  CheckCircle2,
  Mail,
  Send,
  Share2,
  Smartphone,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import { Survey, Language } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { getPublicAppBaseUrl, getAiStudioSharedUrl } from '../utils/url.ts';

interface QRCodeModalProps {
  survey: Survey;
  language: Language;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ survey, language, onClose }) => {
  const t = translations[language];
  const isRtl = language === 'ar' || language === 'tn';
  const [activeTab, setActiveTab] = useState<'all' | 'whatsapp' | 'email' | 'link' | 'qr'>('all');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [customHost, setCustomHost] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [urlSource, setUrlSource] = useState<'direct' | 'shared'>('direct');

  // WhatsApp form
  const [whatsappPhone, setWhatsappPhone] = useState('');
  
  // Email form
  const [emailTo, setEmailTo] = useState('');

  // Compute public base URL
  const publicOrigin = customHost.trim()
    ? customHost.trim().replace(/\/+$/, '')
    : urlSource === 'shared'
    ? getAiStudioSharedUrl()
    : getPublicAppBaseUrl();

  // URLs per channel
  const surveyUrl = `${publicOrigin}/?survey=${survey.id}`;
  const whatsappSurveyUrl = `${publicOrigin}/?survey=${survey.id}&channel=whatsapp`;
  const emailSurveyUrl = `${publicOrigin}/?survey=${survey.id}&channel=email`;
  const qrSurveyUrl = `${publicOrigin}/?survey=${survey.id}&channel=qr`;

  // WhatsApp message
  const whatsappMessage =
    isRtl
      ? `مرحباً بك،\nيدعوكم مركز الدراسات والبحوث للاتصالات (CERT) للمشاركة في استبيان قياس رضا المتعاملين :\n\n📋 *${survey.title}*\n${survey.description ? survey.description + '\n' : ''}\n👉 يمكنك الإجابة في دقيقة إلى دقيقتين عبر الرابط التالي :\n${whatsappSurveyUrl}\n\nرأيكم يهمنا لتطوير وتحسين جودة خدماتنا !`
      : `Bonjour,\nLe CERT (Centre d'Études et de Recherche des Télécommunications) vous invite à donner votre avis :\n\n📋 *${survey.title}*\n${survey.description ? survey.description + '\n' : ''}\n👉 Répondez en 1 à 2 minutes ici :\n${whatsappSurveyUrl}\n\nVotre avis est essentiel pour l'amélioration de nos services CERT !`;

  // Email subject & body
  const emailSubject =
    isRtl
      ? `[CERT] استبيان قياس رضا المتعاملين : ${survey.title}`
      : `[CERT] Enquête de satisfaction usagers : ${survey.title}`;
  const emailBody =
    isRtl
      ? `تحية طيبة وبعد،\n\nفي إطار الحرص على التطوير المستمر لجودة الخدمات والاستقبال، يدعوكم مركز الدراسات والبحوث للاتصالات (CERT) لمشاركتنا تقييمكم وتجربتكم :\n\n📌 الاستبيان : ${survey.title}\n${survey.description ? `📝 التفاصيل : ${survey.description}\n` : ''}\nللإجابة على هذا الاستبيان (يستغرق دقيقتين فقط)، يرجى النقر على الرابط التالي :\n👉 ${emailSurveyUrl}\n\nمشاركتكم وملاحظاتكم تساهم في تحسين خدماتنا وتلبية تطلعاتكم.\n\nمع فائق الشكر والتقدير،\nمصلحة الجودة ورضا المتعاملين\nمركز الدراسات والبحوث للاتصالات (CERT)\nhttps://www.cert.nat.tn`
      : `Madame, Monsieur,\n\nDans le cadre de l'amélioration continue de la qualité de ses prestations, le CERT (Centre d'Études et de Recherche des Télécommunications) vous invite à partager votre retour d'expérience :\n\n📌 Enquête : ${survey.title}\n${survey.description ? `📝 Détails : ${survey.description}\n` : ''}\nPour répondre à cette enquête (durée estimée : 2 minutes), veuillez cliquer sur le lien suivant :\n👉 ${emailSurveyUrl}\n\nVos réponses sont confidentielles et nous permettent d'adapter au mieux nos services à vos besoins.\n\nNous vous remercions pour votre précieuse collaboration.\n\nCordialement,\nService Qualité & Satisfaction Usagers\nCERT - Centre d'Études et de Recherche des Télécommunications\nhttps://www.cert.nat.tn`;

  useEffect(() => {
    QRCode.toDataURL(qrSurveyUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [qrSurveyUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyWhatsapp = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2000);
  };

  const handleSendWhatsapp = () => {
    const cleanPhone = whatsappPhone.replace(/[^0-9+]/g, '');
    const encodedText = encodeURIComponent(whatsappMessage);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.replace('+', '')}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleCopyEmail = () => {
    const fullEmailText = `Objet: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullEmailText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSendEmail = () => {
    const to = emailTo.trim();
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode-${survey.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.png`;
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'ar' || language === 'tn' ? 'rtl' : 'ltr'}">
        <head>
          <title>${survey.title} - Satisfaction Client CERT</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 40px;
              color: #0f172a;
            }
            .card {
              max-width: 480px;
              margin: 0 auto;
              border: 2px solid #e2e8f0;
              padding: 32px;
              border-radius: 20px;
            }
            .badge {
              display: inline-block;
              background-color: #4338ca;
              color: white;
              font-weight: 800;
              font-size: 11px;
              padding: 4px 10px;
              border-radius: 6px;
              margin-bottom: 12px;
              letter-spacing: 0.5px;
            }
            h1 { font-size: 20px; margin-bottom: 8px; color: #1e1b4b; }
            p { font-size: 13px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }
            img { width: 260px; height: 260px; margin-bottom: 20px; }
            .hint { font-size: 13px; font-weight: 600; color: #4338ca; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">CERT • Satisfaction Client</div>
            <h1>${survey.title}</h1>
            <p>${survey.description || 'Scannez ce code pour partager votre avis en 2 minutes'}</p>
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="hint">📱 Scannez avec l'appareil photo de votre smartphone pour répondre</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isDevEnvironment = typeof window !== 'undefined' && window.location.origin.includes('ais-dev-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Diffusion &amp; Partage de l'enquête</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{survey.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-slate-100 bg-white overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'email'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            E-mail
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <QrIcon className="w-3.5 h-3.5" />
            QR Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'link'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Lien direct
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Quick Direct Link Header Bar */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5">
            {/* Link source toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-slate-700">
                {isRtl ? 'اختر الرابط المطلوب مشاركته :' : 'Choisir le type d\'URL :'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setUrlSource('direct')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    urlSource === 'direct'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={isRtl ? 'رابط فعّال يعمل فوراً بدون خطأ 404' : 'Lien direct actif fonctionnel sans erreur 404'}
                >
                  ⚡ {isRtl ? 'الرابط المباشر الفوري (شغّال)' : 'Lien direct actif (Garanti)'}
                </button>
                <button
                  type="button"
                  onClick={() => setUrlSource('shared')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    urlSource === 'shared'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={isRtl ? 'يتطلب النقر على زر Partager في أعلى AI Studio' : 'Nécessite d\'avoir cliqué sur Partager en haut d\'AI Studio'}
                >
                  🌐 {isRtl ? 'الرابط العام المفتوح (ais-pre)' : 'Lien public partagé (ais-pre)'}
                </button>
              </div>
            </div>

            {urlSource === 'shared' && (
              <p className="text-[10px] text-indigo-700 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100 leading-relaxed">
                {isRtl
                  ? '💡 تنبيه: لكي يفتح هذا الرابط للجمهور بدون طلب حساب غوغل وبدون خطأ 404، يرجى النقر أولاً على زر « Partager (مشاركة) » في أعلى يمين نافذة AI Studio.'
                  : '💡 Note : Pour que ce lien public sans connexion Google fonctionne sans erreur 404, assurez-vous d\'avoir cliqué sur le bouton « Partager » en haut d\'AI Studio.'}
              </p>
            )}

            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {isRtl ? 'رابط الاستبيان المختار' : 'Lien du questionnaire'}
              </label>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isRtl ? 'جاهز للنشر والمشاركة' : 'Prêt à diffuser'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={surveyUrl}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? t.linkCopied : t.copyLink}</span>
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={surveyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tester et ouvrir le questionnaire dans un nouvel onglet</span>
              </a>
            </div>
          </div>

          {/* TAB 1: WHATSAPP SHARING */}
          {(activeTab === 'all' || activeTab === 'whatsapp') && (
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.983zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">Partage WhatsApp</h4>
                    <p className="text-xs text-emerald-700">Envoyez l'enquête directement par WhatsApp aux usagers et clients du CERT</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">Canal WhatsApp</span>
              </div>

              {/* Phone number optional input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Numéro du destinataire (facultatif)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Ex: +216 98 123 456 ou laisser vide pour choisir le contact</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="+216 ... (laisser vide pour sélectionner sur WhatsApp)"
                    className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Message preview */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Message pré-formaté WhatsApp</label>
                <div className="bg-white border border-emerald-200 rounded-xl p-3 text-xs text-slate-700 whitespace-pre-line font-sans leading-relaxed shadow-2xs">
                  {whatsappMessage}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendWhatsapp}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.983zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>{t.whatsappShare}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyWhatsapp}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-emerald-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {copiedWhatsapp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWhatsapp ? 'Message copié !' : 'Copier le texte'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL SHARING */}
          {(activeTab === 'all' || activeTab === 'email') && (
            <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-950">Partage par E-mail</h4>
                    <p className="text-xs text-blue-700">Envoyez l'invitation officielle aux entreprises et usagers par courriel</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">Canal Email</span>
              </div>

              {/* Email recipient input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Adresse e-mail du destinataire (facultatif)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Ex: contact@entreprise.tn</span>
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="contact@entreprise.tn (laisser vide pour ouvrir votre client mail)"
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-blue-500"
                />
              </div>

              {/* Email preview */}
              <div className="space-y-2">
                <div className="bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-700 space-y-2 shadow-2xs">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Objet : </span>
                    <span className="font-bold text-slate-900">{emailSubject}</span>
                  </div>
                  <div className="whitespace-pre-line font-sans leading-relaxed text-slate-700 max-h-36 overflow-y-auto pr-1">
                    {emailBody}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.emailShare}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-blue-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? 'Email copié !' : 'Copier le modèle'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QR CODE */}
          {(activeTab === 'all' || activeTab === 'qr') && (
            <div className="border border-indigo-200 bg-indigo-50/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <QrIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">Code QR pour affichage &amp; bornes</h4>
                    <p className="text-xs text-indigo-700">Pour guichets CERT, comptoirs d'accueil, affiches et courriers</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">Canal QR Code</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 bg-white p-4 rounded-xl border border-indigo-100">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-36 h-36 bg-white p-2 rounded-xl shadow-xs border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center bg-slate-100 rounded-xl animate-pulse shrink-0">
                    <span className="text-xs text-slate-500">Chargement...</span>
                  </div>
                )}

                <div className="space-y-3 text-center sm:text-left flex-1">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{survey.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scannez avec un smartphone pour ouvrir le questionnaire immédiatement.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.downloadPng}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t.printQr} (Affiche CERT)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Alert for Access on other devices */}
          {isDevEnvironment && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-900">
                  {language === 'ar' || language === 'tn'
                    ? 'تنبيه لنشر الاستبيان للعموم دون طلب حساب غوغل :'
                    : 'Diffusion publique sans connexion Google requise :'}
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {language === 'ar' || language === 'tn' ? (
                    <>
                      تم تحويل الروابط ورمز الـ QR أعلاه تلقائياً إلى الرابط العام المفتوح للجميع (<span className="font-mono font-semibold">ais-pre-...</span>). لكي يتمكن المواطنون من فتح الرابط بدون ظهور واجهة تسجيل الدخول إلى غوغل، يرجى النقر على زر <strong>Partager (مشاركة)</strong> في أعلى يمين واجهة AI Studio لنشر النسخة العامة، أو إدخال نطاق المركز الرسمي أدناه.
                    </>
                  ) : (
                    <>
                      Les liens et le QR code ont été configurés automatiquement avec l'URL publique partagée (<span className="font-mono font-semibold">ais-pre-...</span>). Pour que vos usagers puissent y accéder librement sans écran de connexion Google, assurez-vous de cliquer sur <strong>Partager (Share)</strong> en haut d'AI Studio pour publier la version publique, ou configurez votre domaine officiel ci-dessous.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Custom Domain / Host configuration */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Masquer la configuration du domaine' : 'Personnaliser l\'adresse web ou le domaine CERT (ex: enquetes.cert.tn)...'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-100">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Nom de domaine ou URL de diffusion publique (ex: https://satisfaction.cert.nat.tn)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder={publicOrigin}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800"
                  />
                  {customHost && (
                    <button
                      type="button"
                      onClick={() => setCustomHost('')}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Cette adresse sera automatiquement appliquée aux liens WhatsApp, E-mail, Lien direct et QR Code.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-xs">
          <span className="text-[11px] text-slate-500 font-medium">Satisfaction Client CERT • Multi-canal</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
