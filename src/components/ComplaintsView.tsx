import React, { useState, useEffect } from 'react';
import {
  ComplaintRecord,
  ComplaintStatus,
  ComplaintPriority,
  Language,
  Survey,
} from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { api } from '../services/api.ts';
import { CertLogo } from './CertLogo.tsx';
import {
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  Sparkles,
  ArrowRight,
  Send,
  Edit2,
  Save,
  X,
  ShieldAlert,
  ChevronRight,
  MessageSquare,
  ExternalLink,
  MessageCircle,
  Share2,
  Plus,
  Download,
  Trash2,
  Printer,
  Check,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { WhatsAppModal } from './WhatsAppModal.tsx';

interface ComplaintsViewProps {
  language: Language;
  initialSurveyId?: string;
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  language,
  initialSurveyId = 'all',
}) => {
  const t = translations[language];
  const isRtl = language === 'ar' || language === 'tn';

  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(initialSurveyId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Drawer / Selected Complaint
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);

  // WhatsApp modal and actions state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [sendingWhatsAppAlert, setSendingWhatsAppAlert] = useState(false);
  const [whatsAppSuccessMsg, setWhatsAppSuccessMsg] = useState<string | null>(null);
  const [clientWhatsAppReply, setClientWhatsAppReply] = useState<string>('');
  const [generatingClientReply, setGeneratingClientReply] = useState(false);
  const [showClientWhatsAppComposer, setShowClientWhatsAppComposer] = useState(false);

  // Note entry in drawer
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Edit AI category / summary
  const [isEditingAi, setIsEditingAi] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editSummary, setEditSummary] = useState('');

  // New Complaint Registration Modal
  const [showNewComplaintModal, setShowNewComplaintModal] = useState(false);
  const [isCreatingComplaint, setIsCreatingComplaint] = useState(false);
  const [newComplaintForm, setNewComplaintForm] = useState({
    surveyId: '',
    dossierNumber: `DOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    phone: '',
    email: '',
    category: 'Accueil & Réception',
    priority: 'medium' as ComplaintPriority,
    problemDescription: '',
    assignedTo: '',
    notifyWhatsApp: true,
  });

  // Citizen Printable Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Load Surveys list for survey selector
  useEffect(() => {
    api.getSurveys().then((list) => setSurveys(list)).catch(() => {});
  }, []);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints({
        surveyId: selectedSurveyId !== 'all' ? selectedSurveyId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: search.trim() || undefined,
      });

      // Optional local category filter
      const filtered = categoryFilter !== 'all'
        ? data.filter((c) => c.category === categoryFilter)
        : data;

      setComplaints(filtered);
      if (selectedComplaint) {
        const found = filtered.find((c) => c.id === selectedComplaint.id);
        if (found) setSelectedComplaint(found);
      }
    } catch (e) {
      console.error('Error loading complaints:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [selectedSurveyId, statusFilter, priorityFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadComplaints();
  };

  const handleUpdateStatus = async (complaintId: string, newStatus: ComplaintStatus) => {
    try {
      const updated = await api.updateComplaint(complaintId, { status: newStatus });
      setSelectedComplaint(updated);
      setComplaints(complaints.map((c) => (c.id === complaintId ? updated : c)));
    } catch (e: any) {
      alert(e.message || 'Erreur de mise à jour');
    }
  };

  const handleUpdatePriority = async (complaintId: string, newPriority: ComplaintPriority) => {
    try {
      const updated = await api.updateComplaint(complaintId, { priority: newPriority });
      setSelectedComplaint(updated);
      setComplaints(complaints.map((c) => (c.id === complaintId ? updated : c)));
    } catch (e: any) {
      alert(e.message || 'Erreur de mise à jour');
    }
  };

  const handleUpdateAssignee = async (complaintId: string, assignee: string) => {
    try {
      const updated = await api.updateComplaint(complaintId, { assignedTo: assignee });
      setSelectedComplaint(updated);
      setComplaints(complaints.map((c) => (c.id === complaintId ? updated : c)));
    } catch (e: any) {
      alert(e.message || 'Erreur de mise à jour');
    }
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette réclamation du registre ?');
    if (!confirmDelete) return;

    try {
      await api.deleteComplaint(complaintId);
      setComplaints(complaints.filter((c) => c.id !== complaintId));
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint(null);
      }
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la suppression');
    }
  };

  const handleSaveAiEdits = async () => {
    if (!selectedComplaint) return;
    try {
      const updated = await api.updateComplaint(selectedComplaint.id, {
        category: editCategory,
        aiSummary: editSummary,
        managerEdited: true,
      });
      setSelectedComplaint(updated);
      setComplaints(complaints.map((c) => (c.id === selectedComplaint.id ? updated : c)));
      setIsEditingAi(false);
    } catch (e: any) {
      alert(e.message || 'Erreur');
    }
  };

  const handleResendManagerWhatsApp = async () => {
    if (!selectedComplaint) return;
    setSendingWhatsAppAlert(true);
    setWhatsAppSuccessMsg(null);
    try {
      const res = await api.notifyComplaintViaWhatsApp(selectedComplaint.id, { target: 'manager', markAsSent: true });
      setSelectedComplaint(res.complaint);
      setComplaints(complaints.map((c) => (c.id === res.complaint.id ? res.complaint : c)));
      if (res.delivered) {
        setWhatsAppSuccessMsg('Alerte transmise directement sur WhatsApp via passerelle API !');
      } else {
        setWhatsAppSuccessMsg('Message WhatsApp prêt et conversation ouverte !');
      }
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      setTimeout(() => setWhatsAppSuccessMsg(null), 3500);
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'envoi WhatsApp');
    } finally {
      setSendingWhatsAppAlert(false);
    }
  };

  const handleGenerateClientReply = async () => {
    if (!selectedComplaint) return;
    setGeneratingClientReply(true);
    try {
      const res = await api.getComplaintWhatsAppReply(selectedComplaint.id, language);
      setClientWhatsAppReply(res.replyText);
      setShowClientWhatsAppComposer(true);
    } catch (e: any) {
      alert(e.message || 'Erreur de génération');
    } finally {
      setGeneratingClientReply(false);
    }
  };

  const handleSendClientReply = async () => {
    if (!selectedComplaint || !selectedComplaint.phone) return;
    try {
      const res = await api.notifyComplaintViaWhatsApp(selectedComplaint.id, {
        target: 'client',
        phoneNumber: selectedComplaint.phone,
        customMessage: clientWhatsAppReply,
      });
      setSelectedComplaint(res.complaint);
      setComplaints(complaints.map((c) => (c.id === res.complaint.id ? res.complaint : c)));
      setWhatsAppSuccessMsg('Message WhatsApp prêt et conversation ouverte !');
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      setTimeout(() => setWhatsAppSuccessMsg(null), 3500);
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'envoi au client');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !newNote.trim()) return;
    setIsAddingNote(true);
    try {
      const updated = await api.addComplaintNote(selectedComplaint.id, 'Responsable Qualité CERT', newNote.trim());
      setSelectedComplaint(updated);
      setComplaints(complaints.map((c) => (c.id === selectedComplaint.id ? updated : c)));
      setNewNote('');
    } catch (e: any) {
      alert(e.message || 'Erreur');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleCreateNewComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaintForm.problemDescription.trim()) {
      alert('Veuillez renseigner le motif de réclamation.');
      return;
    }

    setIsCreatingComplaint(true);
    try {
      const surveyMatch = surveys.find((s) => s.id === newComplaintForm.surveyId);
      const created = await api.createComplaint({
        surveyId: newComplaintForm.surveyId || '',
        surveyTitle: surveyMatch ? surveyMatch.title : 'Guichet & Accueil Général CERT',
        dossierNumber: newComplaintForm.dossierNumber.trim(),
        phone: newComplaintForm.phone.trim(),
        email: newComplaintForm.email.trim(),
        category: newComplaintForm.category,
        priority: newComplaintForm.priority,
        problemDescription: newComplaintForm.problemDescription.trim(),
        assignedTo: newComplaintForm.assignedTo.trim() || 'Cellule Qualité CERT',
      });

      // If notifyWhatsApp is checked and phone is available, prompt/open WhatsApp
      if (newComplaintForm.notifyWhatsApp && created.phone) {
        try {
          await api.notifyComplaintViaWhatsApp(created.id, { target: 'manager', markAsSent: true });
        } catch {}
      }

      setComplaints([created, ...complaints]);
      setSelectedComplaint(created);
      setShowNewComplaintModal(false);
      setNewComplaintForm({
        surveyId: '',
        dossierNumber: `DOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        phone: '',
        email: '',
        category: 'Accueil & Réception',
        priority: 'medium',
        problemDescription: '',
        assignedTo: '',
        notifyWhatsApp: true,
      });
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création');
    } finally {
      setIsCreatingComplaint(false);
    }
  };

  const handleExportCSV = () => {
    if (complaints.length === 0) {
      alert('Aucune réclamation à exporter.');
      return;
    }

    const headers = [
      'ID Réclamation',
      'N° Dossier',
      'Date Dépôt',
      'Enquête / Service Origine',
      'Statut',
      'Priorité',
      'Catégorie',
      'Téléphone',
      'E-mail',
      'Agent Assigné',
      'Description Citoyen',
      'Diagnostic Synthèse IA',
      'WhatsApp Livré',
    ];

    const rows = complaints.map((c) => [
      `"${c.id}"`,
      `"${c.dossierNumber || ''}"`,
      `"${c.submissionDate || c.createdAt.slice(0, 10)}"`,
      `"${(c.surveyTitle || '').replace(/"/g, '""')}"`,
      `"${c.status}"`,
      `"${c.priority}"`,
      `"${c.category}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.assignedTo || ''}"`,
      `"${(c.problemDescription || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(c.aiSummary || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${c.whatsappAlertSent ? 'OUI' : 'NON'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cert-registre-reclamations-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Badge helpers
  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            {t.newComplaints}
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {t.inProgressComplaints}
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
            En attente usager
          </span>
        );
      case 'resolved':
      case 'closed':
      default:
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {t.resolvedComplaints}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: ComplaintPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-md text-[11px] font-extrabold uppercase tracking-wide">
            {t.urgent}
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 rounded-md text-[11px] font-bold uppercase tracking-wide">
            {t.high}
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-[11px] font-semibold uppercase tracking-wide">
            {t.medium}
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-medium uppercase tracking-wide">
            {t.low}
          </span>
        );
    }
  };

  // Metrics
  const totalCount = complaints.length;
  const newCount = complaints.filter((c) => c.status === 'new').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;
  const whatsAppDeliveredCount = complaints.filter((c) => c.whatsappAlertSent).length;

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Executive Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-2xl shrink-0">
            <CertLogo className="h-10 w-auto" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {isRtl ? 'سجل الشكاوى والمتابعة الفورية' : 'Registre Officiel des Réclamations'}
              </h2>
              <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-bold">
                CERT Qualité
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {isRtl
                ? 'نظام تتبع الشكاوى الواردة عبر الاستبيانات، التنبيه الفوري عبر WhatsApp والتشخيص الذكي بالذكاء الاصطناعي'
                : 'Pilotage temps réel des réclamations usagers, qualification par IA Gemini et alertes WhatsApp automatiques'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNewComplaintModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRtl ? '+ تسجيل شكوى جديدة' : '+ Nouvelle Réclamation'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Exporter en fichier CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{isRtl ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWhatsAppModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.578 1.77.886 2.791.886h.001c3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.772-5.768-5.772zm3.388 8.167c-.145.407-.732.748-1.023.79-.279.041-.637.058-1.033-.069-.24-.077-.55-.179-.955-.355-1.724-.749-2.848-2.511-2.934-2.625-.086-.115-.7-1.026-.7-1.956 0-.931.488-1.389.662-1.579.174-.19.38-.238.507-.238.127 0 .254.001.365.006.118.006.275-.045.431.33.161.387.549 1.341.597 1.439.048.098.08.213.016.34-.064.127-.096.206-.191.317-.095.111-.2.248-.286.333-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.847 1.53.942.19.095.301.079.412-.048.111-.127.476-.555.603-.746.127-.19.254-.159.428-.095.174.063 1.111.524 1.301.619.19.095.317.143.365.222.048.079.048.46-.097.867z" />
            </svg>
            <span>Alertes WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 5 Executive KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Total */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all' ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-sm' : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Dossiers</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Enregistrés au registre</div>
        </div>

        {/* Nouvelles */}
        <div
          onClick={() => setStatusFilter('new')}
          className={`p-4 bg-rose-50/60 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'new' ? 'border-rose-500 ring-2 ring-rose-200 shadow-sm' : 'border-rose-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Nouvelles
            </span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 tracking-tight">{newCount}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">À traiter prioritairement</div>
        </div>

        {/* En cours */}
        <div
          onClick={() => setStatusFilter('in_progress')}
          className={`p-4 bg-amber-50/60 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'in_progress' ? 'border-amber-500 ring-2 ring-amber-200 shadow-sm' : 'border-amber-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>En cours</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 tracking-tight">{inProgressCount}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">Investigation en cours</div>
        </div>

        {/* Résolues */}
        <div
          onClick={() => setStatusFilter('resolved')}
          className={`p-4 bg-emerald-50/60 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'resolved' ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-sm' : 'border-emerald-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Résolues</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">{resolvedCount}</span>
            <span className="text-xs font-extrabold text-emerald-600">({resolutionRate}%)</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Clôturées avec succès</div>
        </div>

        {/* Alertes WhatsApp */}
        <div
          onClick={() => setShowWhatsAppModal(true)}
          className="p-4 bg-gradient-to-br from-teal-50/80 to-emerald-50/80 rounded-2xl border border-emerald-200/90 hover:border-emerald-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-900 text-xs font-extrabold">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 fill-[#25D366]" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.578 1.77.886 2.791.886h.001c3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.772-5.768-5.772zm3.388 8.167c-.145.407-.732.748-1.023.79-.279.041-.637.058-1.033-.069-.24-.077-.55-.179-.955-.355-1.724-.749-2.848-2.511-2.934-2.625-.086-.115-.7-1.026-.7-1.956 0-.931.488-1.389.662-1.579.174-.19.38-.238.507-.238.127 0 .254.001.365.006.118.006.275-.045.431.33.161.387.549 1.341.597 1.439.048.098.08.213.016.34-.064.127-.096.206-.191.317-.095.111-.2.248-.286.333-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.847 1.53.942.19.095.301.079.412-.048.111-.127.476-.555.603-.746.127-.19.254-.159.428-.095.174.063 1.111.524 1.301.619.19.095.317.143.365.222.048.079.048.46-.097.867z" />
              </svg>
              Alertes WhatsApp
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800 tracking-tight">{whatsAppDeliveredCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Transmises aux astreintes</div>
        </div>
      </div>

      {/* Advanced Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? 'البحث برقم الملف، الهاتف أو الكلمات المفتاحية...' : 'Rechercher par dossier, nom, téléphone, problème...'}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  api.getComplaints({
                    surveyId: selectedSurveyId !== 'all' ? selectedSurveyId : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
                  }).then(setComplaints);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Survey Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 text-[11px] hidden md:inline">Enquête :</span>
            <select
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px]"
            >
              <option value="all">Toutes les enquêtes</option>
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouvelles</option>
              <option value="in_progress">En cours</option>
              <option value="pending">En attente usager</option>
              <option value="resolved">Résolues / Clôturées</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">Urgente</option>
              <option value="high">Élevée</option>
              <option value="medium">Moyenne</option>
              <option value="low">Faible</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes catégories</option>
              <option value="Accueil & Réception">Accueil & Réception</option>
              <option value="Délais d'attente">Délais d'attente</option>
              <option value="Procédures & Documents">Procédures & Documents</option>
              <option value="Facturation & Tarifs">Facturation & Tarifs</option>
              <option value="Homologation & Technique">Homologation & Technique</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={loadComplaints}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Actualiser la liste"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Active filter summary pill */}
        {(selectedSurveyId !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || search) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-400">Filtres actifs :</span>
            {selectedSurveyId !== 'all' && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-semibold flex items-center gap-1">
                Enquête : {surveys.find((s) => s.id === selectedSurveyId)?.title.slice(0, 24) || selectedSurveyId}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSurveyId('all')} />
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[11px] font-semibold flex items-center gap-1">
                Statut : {statusFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[11px] font-semibold flex items-center gap-1">
                Priorité : {priorityFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPriorityFilter('all')} />
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-semibold flex items-center gap-1">
                Catégorie : {categoryFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedSurveyId('all');
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setSearch('');
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer ml-1"
            >
              Réinitialiser tous les filtres
            </button>
          </div>
        )}
      </div>

      {/* Complaints List Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Chargement des dossiers de réclamation...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Aucune réclamation trouvée</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aucun dossier ne correspond aux filtres appliqués ou aucune réclamation n'a été émise pour ce périmètre.
            </p>
            <button
              type="button"
              onClick={() => setShowNewComplaintModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enregistrer un dossier</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedComplaint(item);
                  setEditCategory(item.category);
                  setEditSummary(item.aiSummary);
                  setIsEditingAi(false);
                }}
                className={`p-4 sm:p-5 hover:bg-slate-50/80 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  selectedComplaint?.id === item.id ? 'bg-indigo-50/40 border-l-4 border-indigo-600' : ''
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                    {getPriorityBadge(item.priority)}
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-semibold">
                      {item.category}
                    </span>
                    {item.dossierNumber && (
                      <span className="text-[11px] text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        N° {item.dossierNumber}
                      </span>
                    )}
                    {item.whatsappAlertSent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        WhatsApp Livré ✅
                      </span>
                    ) : item.whatsappAlertReady ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        WhatsApp Prêt 📱
                      </span>
                    ) : null}
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* AI Diagnosis Summary or Original preview */}
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {item.aiSummary || item.problemDescription}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    « {item.problemDescription} »
                  </p>

                  {/* Origin survey badge & contacts */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-600">
                      Origine : <strong className="text-slate-800">{item.surveyTitle}</strong>
                    </span>
                    {item.phone && (
                      <span className="flex items-center gap-1 text-emerald-700 font-mono font-bold">
                        <Phone className="w-3 h-3" />
                        {item.phone}
                      </span>
                    )}
                    {item.email && (
                      <span className="flex items-center gap-1 text-blue-700 font-mono">
                        <Mail className="w-3 h-3" />
                        {item.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Quick Controls */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                  {/* Inline Status Fast Switcher */}
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdateStatus(item.id, e.target.value as ComplaintStatus)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:border-indigo-400 cursor-pointer focus:outline-none"
                  >
                    <option value="new">Nouvelle</option>
                    <option value="in_progress">En cours</option>
                    <option value="pending">En attente</option>
                    <option value="resolved">Résolue</option>
                    <option value="closed">Clôturée</option>
                  </select>

                  {/* Assignee pill */}
                  <div className="text-xs text-slate-600 font-medium hidden sm:flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="line-clamp-1 max-w-[120px]">{item.assignedTo || 'Non assigné'}</span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteComplaint(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer la réclamation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight
                    className="w-4 h-4 text-slate-400 cursor-pointer"
                    onClick={() => {
                      setSelectedComplaint(item);
                      setEditCategory(item.category);
                      setEditSummary(item.aiSummary);
                      setIsEditingAi(false);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Detailed Sheet / Slide-Over Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header with CertLogo */}
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CertLogo className="h-8 w-auto shrink-0" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{selectedComplaint.id}</span>
                    {getStatusBadge(selectedComplaint.status)}
                    {getPriorityBadge(selectedComplaint.priority)}
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">
                    {selectedComplaint.aiSummary || 'Détails de la réclamation'}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 cursor-pointer"
                  title="Imprimer le récépissé officiel usager"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Status and Assignment Controller */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Statut du dossier
                  </label>
                  <select
                    value={selectedComplaint.status}
                    onChange={(e) => handleUpdateStatus(selectedComplaint.id, e.target.value as ComplaintStatus)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="new">Nouvelle</option>
                    <option value="in_progress">En cours de traitement</option>
                    <option value="pending">En attente (usager/pièce)</option>
                    <option value="resolved">Résolue</option>
                    <option value="closed">Clôturée</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Priorité
                  </label>
                  <select
                    value={selectedComplaint.priority}
                    onChange={(e) => handleUpdatePriority(selectedComplaint.id, e.target.value as ComplaintPriority)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="urgent">Urgente</option>
                    <option value="high">Élevée</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Faible</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Agent responsable
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedComplaint.assignedTo || ''}
                    onBlur={(e) => handleUpdateAssignee(selectedComplaint.id, e.target.value)}
                    placeholder="Assigner un gestionnaire..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* AI Analysis and Recommendations Card */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 border border-indigo-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Analyse Intelligente IA
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                      Fiabilité : {Math.round((selectedComplaint.aiConfidence || 0.9) * 100)}%
                    </span>
                    {!isEditingAi ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingAi(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Corriger</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveAiEdits}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>Enregistrer</span>
                      </button>
                    )}
                  </div>
                </div>

                {!isEditingAi ? (
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500">Catégorie détectée :</span>{' '}
                      <span className="font-bold text-slate-900">{selectedComplaint.category}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Synthèse décisionnelle :</span>
                      <p className="font-medium text-slate-800 mt-0.5 bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        {selectedComplaint.aiSummary}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Catégorie :</label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full p-2 bg-white border border-indigo-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Résumé :</label>
                      <textarea
                        rows={2}
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        className="w-full p-2 bg-white border border-indigo-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* AI Suggested Actions */}
                {selectedComplaint.aiSuggestedActions && selectedComplaint.aiSuggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-indigo-200/60 space-y-1.5">
                    <span className="text-[11px] font-bold text-indigo-900">
                      Actions suggérées par l'IA :
                    </span>
                    <ul className="space-y-1">
                      {selectedComplaint.aiSuggestedActions.map((act, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-indigo-950 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Original Raw Customer Statement */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Description originale du déclarant
                  </h4>
                  {selectedComplaint.audioTranscription && (
                    <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                      🎙️ Dictée vocale transcrite
                    </span>
                  )}
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedComplaint.problemDescription}
                </div>
              </div>

              {/* Dossier & Contact Info */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">N° Dossier</span>
                  <span className="font-bold text-slate-800">{selectedComplaint.dossierNumber || 'Non renseigné'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Date de dépôt</span>
                  <span className="font-bold text-slate-800">{selectedComplaint.submissionDate || selectedComplaint.createdAt.slice(0, 10)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Téléphone</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedComplaint.phone || 'Non renseigné'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">E-mail</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedComplaint.email || 'Non renseigné'}</span>
                </div>
              </div>

              {/* WhatsApp Live Alert & Fast Response Section */}
              <div className="p-5 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border border-emerald-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.578 1.77.886 2.791.886h.001c3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.772-5.768-5.772zm3.388 8.167c-.145.407-.732.748-1.023.79-.279.041-.637.058-1.033-.069-.24-.077-.55-.179-.955-.355-1.724-.749-2.848-2.511-2.934-2.625-.086-.115-.7-1.026-.7-1.956 0-.931.488-1.389.662-1.579.174-.19.38-.238.507-.238.127 0 .254.001.365.006.118.006.275-.045.431.33.161.387.549 1.341.597 1.439.048.098.08.213.016.34-.064.127-.096.206-.191.317-.095.111-.2.248-.286.333-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.847 1.53.942.19.095.301.079.412-.048.111-.127.476-.555.603-.746.127-.19.254-.159.428-.095.174.063 1.111.524 1.301.619.19.095.317.143.365.222.048.079.048.46-.097.867z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                        Diffusion &amp; Alertes WhatsApp en Temps Réel
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        Notification automatique du responsable et réponse directe au client
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(true)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Paramètres WhatsApp
                  </button>
                </div>

                {/* Manager Alert Card */}
                <div className="p-3.5 bg-white/90 border border-emerald-200/90 rounded-xl space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Alerte Responsable d'astreinte</span>
                    </div>

                    {selectedComplaint.whatsappAlertSent ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {selectedComplaint.whatsappAlertMethod === 'callmebot_api' || selectedComplaint.whatsappAlertMethod === 'webhook'
                          ? 'Délivrée automatiquement via API ✅'
                          : 'Transmise sur WhatsApp ✅'}
                      </span>
                    ) : selectedComplaint.whatsappAlertReady ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                        📱 Alerte prête (Envoi 1-Clic)
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Non transmise ⚠️
                      </span>
                    )}
                  </div>

                  {selectedComplaint.whatsappRecipient && (
                    <div className="text-[11px] text-slate-600">
                      Destinataire : <strong className="font-mono text-slate-900">{selectedComplaint.whatsappRecipient}</strong>
                      {selectedComplaint.whatsappAlertDate && (
                        <span> • {new Date(selectedComplaint.whatsappAlertDate).toLocaleString('fr-FR')}</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResendManagerWhatsApp}
                      disabled={sendingWhatsAppAlert}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {sendingWhatsAppAlert
                          ? 'Envoi...'
                          : selectedComplaint.whatsappAlertSent
                          ? 'Renvoyer sur WhatsApp'
                          : 'Ouvrir & Envoyer sur WhatsApp'}
                      </span>
                    </button>

                    {/* Share Complaint Summary to WhatsApp / Email */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `*CERT - Réclamation #${selectedComplaint.id}*\n` +
                        (selectedComplaint.dossierNumber ? `📁 Dossier : ${selectedComplaint.dossierNumber}\n` : '') +
                        `🚨 Priorité : ${selectedComplaint.priority.toUpperCase()}\n` +
                        `🏷️ Catégorie : ${selectedComplaint.category}\n` +
                        `📝 Diagnostic : ${selectedComplaint.aiSummary || selectedComplaint.problemDescription}\n` +
                        `⚡ Action : ${(selectedComplaint.aiSuggestedActions || [])[0] || 'Prise en charge requise'}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Transférer la réclamation sur WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>Transférer sur WhatsApp</span>
                    </a>

                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        `[CERT Réclamation] Dossier ${selectedComplaint.dossierNumber || selectedComplaint.id} - ${selectedComplaint.priority.toUpperCase()}`
                      )}&body=${encodeURIComponent(
                        `Bonjour,\n\nVoici le dossier de réclamation #${selectedComplaint.id} :\n\n` +
                        `- Dossier : ${selectedComplaint.dossierNumber || 'N/A'}\n` +
                        `- Priorité : ${selectedComplaint.priority.toUpperCase()}\n` +
                        `- Catégorie : ${selectedComplaint.category}\n` +
                        `- Enquête : ${selectedComplaint.surveyTitle}\n\n` +
                        `Diagnostic IA :\n${selectedComplaint.aiSummary || selectedComplaint.problemDescription}\n\n` +
                        `Actions recommandées :\n` +
                        (selectedComplaint.aiSuggestedActions || []).map((a, i) => `${i + 1}. ${a}`).join('\n') +
                        `\n\nCentre d'Études et de Recherche des Télécommunications (CERT)`
                      )}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Transférer par e-mail"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Transférer par E-mail</span>
                    </a>
                  </div>
                </div>

                {/* Customer Direct WhatsApp Communication */}
                <div className="p-3.5 bg-white/90 border border-emerald-200/90 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Contact direct de l'usager</span>
                    </div>

                    {selectedComplaint.phone ? (
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                        {selectedComplaint.phone}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Aucun numéro fourni
                      </span>
                    )}
                  </div>

                  {selectedComplaint.phone ? (
                    <div className="space-y-2.5">
                      <p className="text-[11px] text-slate-600">
                        Désamorcez l'insatisfaction en contactant directement le citoyen par WhatsApp avec une réponse personnalisée.
                      </p>

                      {!showClientWhatsAppComposer ? (
                        <button
                          type="button"
                          onClick={handleGenerateClientReply}
                          disabled={generatingClientReply}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{generatingClientReply ? 'L\'IA rédige le message...' : 'Générer une réponse WhatsApp par l\'IA'}</span>
                        </button>
                      ) : (
                        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            Message WhatsApp personnalisé pour l'usager :
                          </label>
                          <textarea
                            rows={4}
                            value={clientWhatsAppReply}
                            onChange={(e) => setClientWhatsAppReply(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-emerald-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
                          />

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={handleGenerateClientReply}
                              disabled={generatingClientReply}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Régénérer par l'IA</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowClientWhatsAppComposer(false)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                Masquer
                              </button>
                              <button
                                type="button"
                                onClick={handleSendClientReply}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Envoyer sur WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500 italic">
                        Le déclarant n'a pas laissé de numéro WhatsApp. Vous pouvez traiter le dossier en interne ou par e-mail.
                      </p>
                      {selectedComplaint.email && (
                        <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                          <span className="text-[11px] text-blue-900 font-mono font-bold">
                            {selectedComplaint.email}
                          </span>
                          <a
                            href={`mailto:${selectedComplaint.email}?subject=${encodeURIComponent(
                              `[CERT] Prise en charge de votre réclamation${selectedComplaint.dossierNumber ? ` (Dossier ${selectedComplaint.dossierNumber})` : ''}`
                            )}&body=${encodeURIComponent(
                              `Bonjour,\n\nNous faisons suite à votre réclamation récente auprès du CERT.\n\nVotre dossier a été pris en charge avec priorité par notre cellule qualité.\nNous restons à votre entière écoute.\n\nBien cordialement,\nService Qualité - CERT`
                            )}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Répondre par e-mail</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {whatsAppSuccessMsg && (
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{whatsAppSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* Internal Notes and Audit Trail */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Notes internes &amp; Historique
                  </h4>
                  <span className="text-xs text-slate-400">{selectedComplaint.internalNotes?.length || 0} notes</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {(selectedComplaint.internalNotes || []).map((n) => (
                    <div key={n.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-slate-700">
                        <span>{n.author}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(n.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-slate-600">{n.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add note form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ajouter une note de suivi interne..."
                    className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isAddingNote || !newNote.trim()}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedComplaint.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'resolved')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.markResolved}</span>
                  </button>
                )}
                {selectedComplaint.status === 'new' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'in_progress')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{t.markInProgress}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteComplaint(selectedComplaint.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enregistrer une nouvelle réclamation manuelle */}
      {showNewComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <CertLogo className="h-8 w-auto" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {isRtl ? 'تسجيل شكوى رسمية جديدة' : 'Enregistrer une Réclamation'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Saisie directe au guichet, par téléphone ou courrier administratif
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewComplaintModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewComplaint} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">N° Dossier</label>
                  <input
                    type="text"
                    value={newComplaintForm.dossierNumber}
                    onChange={(e) => setNewComplaintForm({ ...newComplaintForm, dossierNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Enquête / Service rattaché</label>
                  <select
                    value={newComplaintForm.surveyId}
                    onChange={(e) => setNewComplaintForm({ ...newComplaintForm, surveyId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="">Accueil & Guichet Général CERT</option>
                    {surveys.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Téléphone de l'usager (WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="+216 99 999 999"
                    value={newComplaintForm.phone}
                    onChange={(e) => setNewComplaintForm({ ...newComplaintForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Adresse E-mail de l'usager</label>
                  <input
                    type="email"
                    placeholder="usager@exemple.tn"
                    value={newComplaintForm.email}
                    onChange={(e) => setNewComplaintForm({ ...newComplaintForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catégorie du motif</label>
                  <select
                    value={newComplaintForm.category}
                    onChange={(e) => setNewComplaintForm({ ...newComplaintForm, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="Accueil & Réception">Accueil & Réception</option>
                    <option value="Délais d'attente">Délais d'attente</option>
                    <option value="Procédures & Documents">Procédures & Documents</option>
                    <option value="Facturation & Tarifs">Facturation & Tarifs</option>
                    <option value="Homologation & Technique">Homologation & Technique</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Niveau de Priorité</label>
                  <select
                    value={newComplaintForm.priority}
                    onChange={(e) => setNewComplaintForm({ ...newComplaintForm, priority: e.target.value as ComplaintPriority })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="urgent">Urgente (Bloquante / Direction)</option>
                    <option value="high">Élevée</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Faible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Description détaillée de la réclamation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newComplaintForm.problemDescription}
                  onChange={(e) => setNewComplaintForm({ ...newComplaintForm, problemDescription: e.target.value })}
                  placeholder="Expliquez la situation exprimée par le citoyen..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Agent / Service Assigné</label>
                <input
                  type="text"
                  placeholder="Ex: M. Ben Salem (Bureau d'Ordre / Cellule Qualité)"
                  value={newComplaintForm.assignedTo}
                  onChange={(e) => setNewComplaintForm({ ...newComplaintForm, assignedTo: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <input
                  type="checkbox"
                  id="notifyWhatsAppCheck"
                  checked={newComplaintForm.notifyWhatsApp}
                  onChange={(e) => setNewComplaintForm({ ...newComplaintForm, notifyWhatsApp: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="notifyWhatsAppCheck" className="text-xs font-semibold text-emerald-950 cursor-pointer">
                  Activer la notification WhatsApp instantanée pour le responsable d'astreinte
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewComplaintModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingComplaint}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCreatingComplaint ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Enregistrer le dossier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Récépissé Officiel Citoyen (Printable Receipt) */}
      {showReceiptModal && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 space-y-6 shadow-2xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-4">
            {/* Header of Receipt */}
            <div className="flex items-center justify-between pb-6 border-b-2 border-slate-200">
              <div className="flex items-center gap-3">
                <CertLogo className="h-10 w-auto" />
                <div>
                  <h4 className="text-base font-black text-slate-900">CERT - TUNISIE</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Centre d'Études et de Recherche des Télécommunications</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cellule Qualité &amp; Relations Citoyens</span>
                <span className="text-xs font-mono font-bold text-indigo-700">ISO 9001:2015</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                RÉCÉPISSÉ DE DÉPÔT DE RÉCLAMATION
              </h3>
              <p className="text-xs text-slate-500">
                Document officiel attestant de l'enregistrement de votre réclamation dans le registre du CERT.
              </p>
            </div>

            {/* Receipt Details Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3 font-sans">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Numéro de Dossier :</span>
                <strong className="font-mono text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {selectedComplaint.dossierNumber || selectedComplaint.id}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Date d'enregistrement :</span>
                <strong className="text-slate-800">{new Date(selectedComplaint.createdAt).toLocaleString('fr-FR')}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Périmètre / Service :</span>
                <strong className="text-slate-800">{selectedComplaint.surveyTitle}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Catégorie :</span>
                <strong className="text-slate-800">{selectedComplaint.category}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Priorité attribuée :</span>
                <strong className="uppercase text-slate-800">{selectedComplaint.priority}</strong>
              </div>
              {selectedComplaint.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Contact WhatsApp renseigné :</span>
                  <strong className="font-mono text-emerald-700">{selectedComplaint.phone}</strong>
                </div>
              )}
            </div>

            {/* Verbatim snippet */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block">Objet / Déclaration :</span>
              <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 italic text-[11px] leading-relaxed">
                « {selectedComplaint.problemDescription} »
              </p>
            </div>

            {/* Commitment note */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-indigo-950 space-y-1">
              <strong>Engagement de service CERT :</strong>
              <p>
                Nos équipes s'engagent à analyser tout dossier sous 24 à 48 heures ouvrées. Vous serez notifié par WhatsApp ou téléphone dès l'avancement de votre dossier.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Sauvegarder PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Alerts Configuration & History Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          language={language}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
    </div>
  );
};
