import React, { useState, useEffect } from 'react';
import { FileText, Save, RefreshCw, AlertCircle, CheckCircle, History, Edit, ChevronRight } from 'lucide-react';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  hospitalId: string;
  phone: string;
}

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string;
}

interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface Consultation {
  _id: string;
  patientId: Patient;
  doctorId: Doctor;
  status: 'open' | 'in_progress' | 'completed';
  priority?: string;
  diagnosis?: string;
  findings?: string;
  treatmentPlan?: string;
  soapNotes?: SOAPNotes;
  updatedAt: string;
}

interface AuditHistoryRecord {
  _id: string;
  timestamp: string;
  metadata: {
    previousState: {
      diagnosis: string;
      findings: string;
      treatmentPlan: string;
      soapNotes: SOAPNotes;
    };
    newState: {
      diagnosis: string;
      findings: string;
      treatmentPlan: string;
      soapNotes: SOAPNotes;
    };
  };
}

export default function MedicalDocumentation() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditHistoryRecord[]>([]);

  // Input states
  const [diagnosis, setDiagnosis] = useState('');
  const [findings, setFindings] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [soapNotes, setSoapNotes] = useState<SOAPNotes>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  // Loading states
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchConsultations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/consultations');
      const result = await res.json();
      if (res.ok && result.success) {
        setConsultations(result.data);
      }
    } catch (err) {
      setError("Failed to fetch consultation records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchAuditHistory = async (consultationId: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/consultations/${consultationId}/history`);
      const result = await res.json();
      if (res.ok && result.success) {
        setAuditHistory(result.data);
      }
    } catch (err) {
      console.error("Failed to load audit history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectConsultation = (c: Consultation) => {
    setSelectedConsultation(c);
    setDiagnosis(c.diagnosis || '');
    setFindings(c.findings || '');
    setTreatmentPlan(c.treatmentPlan || '');
    setSoapNotes(c.soapNotes || { subjective: '', objective: '', assessment: '', plan: '' });
    setError(null);
    setSuccess(null);
    setAuditHistory([]);
    if (c.status === 'completed') {
      fetchAuditHistory(c._id);
    }
  };

  // Run AI enhancement Scribe on updated findings
  const handleAIEnhance = async () => {
    if (!selectedConsultation) return;
    if (!findings.trim() || !treatmentPlan.trim()) {
      setError("Findings and Treatment Plan details are required for AI Enhancement.");
      return;
    }

    setAiLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/consultations/${selectedConsultation._id}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: findings.trim(),
          treatment: treatmentPlan.trim()
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSoapNotes(result.data);
        setSuccess("AI enhancement finished. Suggested changes loaded into SOAP form.");
      } else {
        setError(result.error?.message || "AI Notes enhancement failed.");
      }
    } catch (err) {
      setError("AI Service offline.");
    } finally {
      setAiLoading(false);
    }
  };

  // Submit notes edits
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    setError(null);
    setSuccess(null);

    // Mandatory fields checks
    if (!diagnosis.trim()) {
      setError("Validation Error: Diagnosis is a mandatory clinical field.");
      return;
    }
    if (!findings.trim()) {
      setError("Validation Error: Findings observations is a mandatory clinical field.");
      return;
    }
    if (!treatmentPlan.trim()) {
      setError("Validation Error: Treatment Plan is a mandatory clinical field.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/consultations/${selectedConsultation._id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: diagnosis.trim(),
          findings: findings.trim(),
          treatmentPlan: treatmentPlan.trim(),
          soapNotes
        })
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccess("Consultation notes updated successfully. Previous version archived.");
        setSelectedConsultation(result.data);
        fetchConsultations();
        fetchAuditHistory(selectedConsultation._id);
      } else {
        setError(result.error?.message || "Failed to save edits.");
      }
    } catch (err) {
      setError("Express backend is unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Consultations List */}
        <div className="lg:col-span-1 glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" /> Document Log
            </h2>
            <button onClick={fetchConsultations} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {consultations.length === 0 ? (
            <div className="text-center py-12 text-slate-600 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20 text-xs">
              No clinical documentation records.
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => (
                <div
                  key={c._id}
                  onClick={() => handleSelectConsultation(c)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${selectedConsultation?._id === c._id ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'}`}
                >
                  <span className="font-semibold text-slate-200 block text-xs">
                    {c.patientId?.firstName} {c.patientId?.lastName}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
                    <span>Dr. {c.doctorId?.lastName}</span>
                    <span className={`font-semibold capitalize ${c.status === 'completed' ? 'text-emerald-450' : 'text-amber-400'}`}>
                      {c.status}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono mt-1.5 block">
                    Updated: {new Date(c.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center/Right Side: Documentation Workspace */}
        <div className="lg:col-span-3">
          {selectedConsultation ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Note Editor Form */}
              <div className="md:col-span-2 space-y-6">
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6">
                  <div className="border-b border-slate-900 pb-4 flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">Documentation Review</span>
                      <h2 className="text-lg font-bold text-slate-100 mt-1">
                        {selectedConsultation.patientId?.firstName} {selectedConsultation.patientId?.lastName}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ID: {selectedConsultation.patientId?.hospitalId} • Physician: Dr. {selectedConsultation.doctorId?.firstName} {selectedConsultation.doctorId?.lastName}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${selectedConsultation.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {selectedConsultation.status}
                    </span>
                  </div>

                  {selectedConsultation.status === 'completed' ? (
                    <form onSubmit={handleSaveNotes} className="space-y-5">
                      {/* Diagnosis */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                          <Edit className="w-3.5 h-3.5 text-indigo-400" /> Diagnosis *
                        </label>
                        <input
                          type="text"
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          placeholder="Diagnosis (Required)"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Findings */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Observations & Exam Findings *</label>
                        <textarea
                          rows={3}
                          value={findings}
                          onChange={(e) => setFindings(e.target.value)}
                          placeholder="Findings (Required)"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors resize-none"
                        />
                      </div>

                      {/* Treatment Plan */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Treatment Plan *</label>
                        <textarea
                          rows={3}
                          value={treatmentPlan}
                          onChange={(e) => setTreatmentPlan(e.target.value)}
                          placeholder="Treatment Plan (Required)"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors resize-none"
                        />
                      </div>

                      {/* AI Enhance trigger */}
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={handleAIEnhance}
                          disabled={aiLoading || !findings || !treatmentPlan}
                          className="py-2 px-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/25 text-sky-400 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {aiLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          AI Clinical Notes Enhance
                        </button>
                      </div>

                      {/* SOAP Notes editing */}
                      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-850 space-y-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Edit SOAP Note Sections</span>
                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Subjective</span>
                            <textarea
                              rows={2}
                              value={soapNotes.subjective}
                              onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[11px] text-slate-300 resize-none focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Objective</span>
                            <textarea
                              rows={2}
                              value={soapNotes.objective}
                              onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[11px] text-slate-300 resize-none focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Assessment</span>
                            <textarea
                              rows={2}
                              value={soapNotes.assessment}
                              onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[11px] text-slate-300 resize-none focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Plan</span>
                            <textarea
                              rows={2}
                              value={soapNotes.plan}
                              onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[11px] text-slate-300 resize-none focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Edits button */}
                      <div className="flex justify-end pt-4 border-t border-slate-900">
                        <button
                          type="submit"
                          disabled={loading}
                          className="py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-teal-500/10 flex items-center gap-1.5"
                        >
                          <Save className="w-4 h-4" /> Save Changes & Log Version
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20 text-xs">
                      This patient's consultation is currently active or waiting queue. Edit clinical notes via the "Consultation Workspace" tab.
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Revision History sidebar */}
              <div className="space-y-6">
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block border-b border-slate-900 pb-2 flex items-center gap-1">
                    <History className="w-4 h-4 text-indigo-400" /> Revision History
                  </span>

                  {historyLoading ? (
                    <div className="flex justify-center py-6">
                      <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                    </div>
                  ) : auditHistory.length === 0 ? (
                    <span className="text-xs text-slate-600 block">No modifications logged. This is the original version.</span>
                  ) : (
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                      {auditHistory.map((rec) => (
                        <div key={rec._id} className="text-left bg-slate-900/30 p-3 rounded-xl border border-slate-900 text-xs space-y-2">
                          <span className="text-[9px] text-slate-500 font-mono block">
                            {new Date(rec.timestamp).toLocaleString()}
                          </span>
                          
                          <div className="space-y-1.5 border-t border-slate-950 pt-2 text-[11px]">
                            <span className="font-semibold text-slate-400">Changed Diagnosis:</span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span className="line-through text-rose-450">{rec.metadata.previousState?.diagnosis}</span>
                              <ChevronRight className="w-3 h-3 text-slate-650" />
                              <span className="text-emerald-450 font-semibold">{rec.metadata.newState?.diagnosis}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-16 text-center text-slate-500 flex flex-col items-center justify-center min-h-[450px]">
              <FileText className="w-12 h-12 text-slate-700 mb-3" />
              <span className="font-bold text-slate-400 block">Clinical Documentation Workspace</span>
              <p className="text-xs text-slate-600 max-w-sm mt-1">
                Select a consultation folder from the log file directory list on the left to review documentation notes, audit modifications history, or run AI text enhancement.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
