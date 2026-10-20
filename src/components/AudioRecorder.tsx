import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle,
  Volume2,
  Languages,
  Edit3,
  HelpCircle,
  FileAudio,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Language } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';

interface AudioRecorderProps {
  language: Language;
  onTranscriptionChange: (text: string) => void;
  onAudioRecorded?: (audioBlob: Blob, base64: string) => void;
  initialText?: string;
  placeholder?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  language,
  onTranscriptionChange,
  onAudioRecorded,
  initialText = '',
  placeholder,
}) => {
  const t = translations[language] || translations.fr;
  const isRtl = language === 'ar' || language === 'tn';

  // Input spoken language chosen by user (defaults to matching survey language)
  const [spokenLang, setSpokenLang] = useState<'fr' | 'ar'>(() =>
    language === 'fr' ? 'fr' : 'ar'
  );

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcribedText, setTranscribedText] = useState(initialText);
  const [originalSpokenText, setOriginalSpokenText] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // References to completely avoid React state closure staleness
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialText !== undefined) {
      setTranscribedText(initialText);
      liveTranscriptRef.current = initialText;
    }
  }, [initialText]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_) {}
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [audioUrl]);

  const hasArabicChars = (text: string) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  const startVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (_) {}
  };

  const startRecording = async () => {
    setErrorMsg(null);
    setSuccessNotice(null);
    setInterimText('');
    audioChunksRef.current = [];
    liveTranscriptRef.current = '';

    // 1. Initialize Browser Web Speech Recognition
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;

        // Configure speech recognition language based on user selection
        if (spokenLang === 'fr') {
          recognition.lang = 'fr-FR';
        } else {
          // Arabic standard and Tunisian dialects
          recognition.lang = 'ar-TN';
        }

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript + ' ';
            } else {
              interim += transcript;
            }
          }

          if (interim) {
            setInterimText(interim);
          }

          if (final) {
            const currentTotal = liveTranscriptRef.current
              ? `${liveTranscriptRef.current.trim()} ${final.trim()}`
              : final.trim();
            liveTranscriptRef.current = currentTotal;
            setTranscribedText(currentTotal);
            onTranscriptionChange(currentTotal);
          }
        };

        recognition.onerror = (e: any) => {
          // If ar-TN is not supported on this specific browser, fall back to ar-SA
          if (e.error === 'language-not-supported' && recognition.lang === 'ar-TN') {
            try {
              recognition.lang = 'ar-SA';
              recognition.start();
            } catch (_) {}
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (_) {}
    }

    // 2. Initialize MediaRecorder & Audio Visualizer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualizer(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
          } catch (_) {}
        }
        setAudioLevel(0);

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const rawBase64 = (reader.result as string).split(',')[1];

          if (onAudioRecorded) {
            onAudioRecorded(blob, rawBase64);
          }

          // Process the transcription & translation pipeline safely
          await finalizeAudioTranscription(rawBase64, blob.type);
        };
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access notice:', err);
      setErrorMsg(
        t.micPermissionDenied ||
          (isRtl
            ? 'تعذر الوصول إلى الميكروفون. يرجى السماح بالوصول أو كتابة رسالتك مباشرة في خانة النص.'
            : 'Accès au microphone non autorisé. Vous pouvez saisir votre réponse directement au clavier ci-dessous.')
      );
      setIsRecording(false);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
      }
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }
    setInterimText('');

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Safe transcription and translation without arbitrary fake text replacement
  const finalizeAudioTranscription = async (base64Data: string, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMsg(null);

    // Read directly from ref to avoid React closure staleness
    const captured = (liveTranscriptRef.current || '').trim();

    try {
      if (captured.length > 0) {
        setOriginalSpokenText(captured);

        // If the survey or interface expects French, and the captured text has Arabic, translate it
        if ((language === 'fr' || spokenLang === 'ar') && hasArabicChars(captured)) {
          setIsTranslating(true);
          try {
            const french = await api.translateToFrench(captured);
            if (french && french.trim()) {
              setTranscribedText(french.trim());
              onTranscriptionChange(french.trim());
              setSuccessNotice(
                language === 'fr'
                  ? 'Transcription et traduction en français réussies ! Vous pouvez la modifier avant envoi.'
                  : 'تم استخراج الصوت وترجمته للفرنسية بنجاح ! يمكنك التعديل أدناه.'
              );
              return;
            }
          } catch (_) {} finally {
            setIsTranslating(false);
          }
        }

        // Otherwise keep the user's authentic spoken text
        setTranscribedText(captured);
        onTranscriptionChange(captured);
        setSuccessNotice(
          isRtl
            ? 'تم تحويل صوتك إلى نص بنجاح ! يمكنك تعديل النص أدناه قبل الإرسال.'
            : 'Texte dicté enregistré avec succès ! Vous pouvez le modifier ou le compléter.'
        );
        return;
      }

      // If browser Web Speech API did not capture any text, try server-side audio transcription
      const serverResult = await api.transcribeVoice(
        base64Data,
        mimeType,
        language === 'fr' ? 'fr' : 'ar'
      );

      if (serverResult && serverResult.trim().length > 0) {
        const clean = serverResult.trim();
        setTranscribedText(clean);
        onTranscriptionChange(clean);
        setSuccessNotice(
          isRtl
            ? 'تمت معالجة التسجيل واستخراج النص بنجاح !'
            : 'Transcription audio réussie ! Vous pouvez affiner le texte ci-dessous.'
        );
        return;
      }

      // If no speech was detected (e.g. mic mute or silent clip), notify honestly WITHOUT inventing fake claims
      setSuccessNotice(
        isRtl
          ? 'تم حفظ التسجيل الصوتي بنجاح ! يمكنك الاستماع إليه أو كتابة توضيحاتك أدناه.'
          : 'Message vocal audio bien enregistré ! Vous pouvez le réécouter ou préciser votre demande par écrit.'
      );
    } catch (_) {
      setSuccessNotice(
        isRtl
          ? 'تم حفظ التسجيل الصوتي. يمكنك كتابة وتوضيح ما ترغب به في الخانة أسفله.'
          : 'Enregistrement audio mémorisé. Vous pouvez affiner le texte ci-dessous.'
      );
    } finally {
      setIsTranscribing(false);
      setIsTranslating(false);
    }
  };

  // Manual trigger to translate current text in textarea to French
  const handleTranslateToFrench = async () => {
    if (!transcribedText.trim()) return;
    setIsTranslating(true);
    setErrorMsg(null);
    try {
      const translated = await api.translateToFrench(transcribedText.trim());
      if (translated && translated.trim() && translated.trim() !== transcribedText.trim()) {
        setOriginalSpokenText(transcribedText.trim());
        setTranscribedText(translated.trim());
        onTranscriptionChange(translated.trim());
        setSuccessNotice(
          isRtl
            ? 'تمت ترجمة النص إلى الفرنسية بنجاح !'
            : 'Traduction en français réussie ! Vous pouvez corriger avant d\'envoyer.'
        );
      } else {
        setSuccessNotice(
          isRtl
            ? 'النص جاهز ومُترجم بالكامل.'
            : 'Le texte est déjà dans un format clair et exploitable.'
        );
      }
    } catch (err: any) {
      console.warn('Translation note:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (originalSpokenText) {
      setTranscribedText(originalSpokenText);
      onTranscriptionChange(originalSpokenText);
      setSuccessNotice(
        isRtl
          ? 'تمت استعادة النص الأصلي.'
          : 'Texte d\'origine restauré.'
      );
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscribedText('');
    setOriginalSpokenText(null);
    setInterimText('');
    setErrorMsg(null);
    setSuccessNotice(null);
    liveTranscriptRef.current = '';
    onTranscriptionChange('');
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      audio.onended = () => setIsPlaying(false);
    }

    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleApplyPreset = (presetText: string) => {
    const updated = transcribedText ? `${transcribedText.trim()} ${presetText}` : presetText;
    setTranscribedText(updated);
    onTranscriptionChange(updated);
    setSuccessNotice(
      isRtl
        ? 'تمت إضافة المقترح ! يمكنك التعديل عليه.'
        : 'Suggestion appliquée ! Vous pouvez la modifier ou la compléter.'
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Localized presets for quick responses
  const getHelperPresets = () => {
    if (language === 'ar') {
      return [
        'تأخير غير مبرر في معالجة الملف',
        'صعوبة في الحصول على التوجيه والاستقبال',
        'استفسار بخصوص الإجراءات والوثائق',
        'خدمة سريعة وشكراً لحسن المعاملة',
      ];
    }
    if (language === 'tn') {
      return [
        'تعطلت وقعدت نستنى برشا في الدوسي متاعي',
        'الاستقبال باهي أما فما حاجات موش واضحة',
        'استفسار على الإجراءات والخدمات المطلوبة',
        'يعطيهم الصحة خدمة سريعة واستقبال ممتاز',
      ];
    }
    return [
      "Délai d'attente trop long pour le traitement de mon dossier",
      "Accueil convenable mais manque d'explications claires",
      "Problème lié aux frais et factures non conformes",
      "Service rapide et personnel attentif",
    ];
  };

  return (
    <div
      className={`space-y-3 p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl ${
        isRtl ? 'rtl' : 'ltr'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Spoken Language Selector & Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Languages className="w-3.5 h-3.5 text-indigo-600" />
          <span>{isRtl ? 'لغة الحديث في الميكروفون :' : 'Langue parlée au micro :'}</span>
          <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5 ml-1">
            <button
              type="button"
              onClick={() => setSpokenLang('fr')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                spokenLang === 'fr'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇫🇷 Français
            </button>
            <button
              type="button"
              onClick={() => setSpokenLang('ar')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                spokenLang === 'ar'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇹🇳 عربي / دارجة
            </button>
          </div>
        </div>

        {/* Live status badge */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-100/90 border border-rose-300 text-rose-700 rounded-full text-xs font-bold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
            <span>
              {isRtl
                ? `جاري التسجيل (${formatTime(recordingSeconds)})`
                : `Enregistrement en direct (${formatTime(recordingSeconds)})`}
            </span>
          </div>
        )}

        {(isTranscribing || isTranslating) && (
          <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>
              {isTranslating
                ? isRtl
                  ? 'جاري الترجمة بالذكاء الاصطناعي...'
                  : 'Traduction IA en cours...'
                : isRtl
                ? 'جاري استخراج وتحويل الصوت...'
                : 'Transcription vocale en cours...'}
            </span>
          </div>
        )}
      </div>

      {/* Main Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>
                {audioUrl
                  ? isRtl
                    ? 'إعادة التسجيل بالصوت'
                    : 'Réenregistrer par la voix'
                  : isRtl
                  ? '🎙️ انقر للتحدث والتسجيل بالصوت'
                  : '🎙️ Parler pour dicter'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer ring-2 ring-rose-500/50"
            >
              <Square className="w-4 h-4 fill-current text-rose-500" />
              <span>
                {isRtl
                  ? `إيقاف واعتماد النص (${formatTime(recordingSeconds)})`
                  : `Arrêter & Valider (${formatTime(recordingSeconds)})`}
              </span>
            </button>
          )}

          {audioUrl && !isRecording && (
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-rose-600" />
              ) : (
                <Play className="w-4 h-4 text-emerald-600" />
              )}
              <span>{isPlaying ? (isRtl ? 'إيقاف مؤقت' : 'Pause') : isRtl ? 'الاستماع للتسجيل' : 'Écouter'}</span>
            </button>
          )}

          {transcribedText && hasArabicChars(transcribedText) && (
            <button
              type="button"
              onClick={handleTranslateToFrench}
              disabled={isTranslating}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Traduire fidèlement ce texte en français"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {isTranslating
                  ? isRtl
                    ? 'جاري الترجمة...'
                    : 'Traduction...'
                  : isRtl
                  ? 'ترجمة النص إلى الفرنسية'
                  : 'Traduire en français'}
              </span>
            </button>
          )}

          {originalSpokenText &&
            transcribedText !== originalSpokenText &&
            !isRecording && (
              <button
                type="button"
                onClick={handleRestoreOriginal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                title="Voir le texte d'origine parlé"
              >
                <span>{isRtl ? 'استعادة النص الأصلي' : 'Texte d\'origine'}</span>
              </button>
            )}

          {audioUrl && !isRecording && (
            <button
              type="button"
              onClick={resetRecording}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title={isRtl ? 'حذف وبدء جديد' : 'Effacer et recommencer'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time audio waveform / level meters while recording */}
      {isRecording && (
        <div className="p-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
            <Volume2 className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
            <span>
              {spokenLang === 'fr'
                ? 'Parlez maintenant en français dans votre micro :'
                : 'تفضل بالتحدث الآن بالعربية أو الدارجة التونسية :'}
            </span>
          </div>
          {/* Animated equalizer bars */}
          <div className="flex items-center gap-1 h-5 shrink-0">
            {[20, 45, 75, 100, 60, 30, 85, 40, 90, 50].map((h, idx) => (
              <div
                key={idx}
                className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, Math.min(20, (h * Math.max(audioLevel, 25)) / 100))}px`,
                  opacity: audioLevel > 10 ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Real-time live speech stream preview */}
      {interimText && isRecording && (
        <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 font-medium italic animate-in fade-in duration-100 flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-indigo-500 animate-bounce shrink-0" />
          <span>{interimText}</span>
        </div>
      )}

      {/* Success notification */}
      {successNotice && !isRecording && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Editable transcription field */}
      <div className="space-y-1.5 pt-1">
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium gap-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] uppercase font-extrabold">
              {language === 'fr' ? 'FR' : 'TEXTE'}
            </span>
            <span>
              {isRtl
                ? 'النص المحول (يمكنك تعديله أو إضافة تفاصيل بحرية قبل الإرسال) :'
                : 'Texte extrait (modifiable librement avant envoi) :'}
            </span>
          </div>
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            <span>
              {isRtl ? 'يمكنك تصحيح أو كتابة أي تفاصيل إضافية' : 'Vous pouvez corriger ou ajouter du texte'}
            </span>
          </span>
        </div>

        <textarea
          rows={3}
          value={transcribedText}
          onChange={(e) => {
            setTranscribedText(e.target.value);
            liveTranscriptRef.current = e.target.value;
            onTranscriptionChange(e.target.value);
          }}
          placeholder={
            placeholder ||
            (isRtl
              ? 'تحدث في الميكروفون أو اكتب هنا : سيتحول كلامك تلقائياً إلى نص ويبقى قابلاً للتعديل بنسبة 100%...'
              : 'Parlez dans votre micro ou écrivez ici : le texte apparaîtra automatiquement et reste 100% modifiable...')
          }
          className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-2xs"
        />

        {/* Quick helper suggestions adapted to language */}
        <div className="pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span>
              {isRtl ? 'اقتراحات سريعة بنقرة واحدة :' : 'Suggestions rapides :'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getHelperPresets().map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-[11px] px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors cursor-pointer text-left"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
