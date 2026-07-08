import React, { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Activity, AlertTriangle, AlertCircle, Clock, FileText, Users } from 'lucide-react';

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

interface Consultation {
  _id: string;
  patientId: Patient;
  doctorId: Doctor;
  status: 'open' | 'in_progress' | 'completed';
  priority?: 'emergency' | 'urgent' | 'routine';
  triageNotes?: string;
  triageAIEvaluated?: boolean;
  createdAt: string;
}

export default function PatientTriage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  // Symptoms and AI Triage states
  const [symptomText, setSymptomText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    priority: 'emergency' | 'urgent' | 'routine';
    explanation: string;
    suggestedQuestions: string[];
    insufficientInfo: boolean;
  } | null>(null);

  // Confirmed details
  const [confirmedPriority, setConfirmedPriority] = useState<'emergency' | 'urgent' | 'routine'>('routine');
  const [triageNotes, setTriageNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // General states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/consultations/queue');
      const result = await res.json();
      if (res.ok && result.success) {
        setConsultations(result.data);
      } else {
        setError("Failed to fetch waiting queue.");
      }
    } catch (err) {
      setError("Express backend is offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectConsultation = (c: Consultation) => {
    setSelectedConsultation(c);
    setSymptomText('');
    setAiSuggestion(null);
    setTriageNotes(c.triageNotes || '');
    setConfirmedPriority(c.priority || 'routine');
    setOverrideReason('');
    setError(null);
    setSuccess(null);
  };

  // Run AI symptom evaluation
  const handleEvaluateSymptoms = async () => {
    if (!symptomText.trim()) {
      setError("Please describe the patient's symptoms first.");
      return;
    }

    setAiLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/triage/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: symptomText.trim() })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setAiSuggestion(result.data);
        setConfirmedPriority(result.data.priority);
      } else {
        setError(result.error?.message || "Failed to analyze symptoms.");
      }
    } catch (err) {
      setError("AI Triage advisor unreachable.");
    } finally {
      setAiLoading(false);
    }
  };

  // Confirm and submit triage
  const handleConfirmTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    setError(null);
    setSuccess(null);

    const isOverride = aiSuggestion !== null && confirmedPriority !== aiSuggestion.priority;
    if (isOverride && !overrideReason.trim()) {
      setError("Please provide an override reason explaining why you adjusted the suggested priority level.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/triage/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: selectedConsultation._id,
          priority: confirmedPriority,
          triageNotes: triageNotes.trim() || undefined,
          isOverride,
          overrideReason: isOverride ? overrideReason.trim() : undefined,
          suggestedPriority: aiSuggestion?.priority
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setSuccess(`Triage confirmed. Patient priority is set to ${confirmedPriority}.`);
        setSelectedConsultation(null);
        setAiSuggestion(null);
        setSymptomText('');
        fetchData();
      } else {
        setError(result.error?.message || "Triage confirmation failed.");
      }
    } catch (err) {
      setError("Express backend unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case 'emergency':
        return <span className="text-[10px] font-bold text-rose-450 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase">Emergency</span>;
      case 'urgent':
        return <span className="text-[10px] font-bold text-amber-450 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">Urgent</span>;
      default:
        return <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full uppercase">Routine</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Messages */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Panel 1: Select waiting patient to triage */}
        <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" /> Waiting for Triage
            </h2>
            <button onClick={fetchData} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {consultations.length === 0 ? (
            <div className="text-center py-12 text-slate-600 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
              No patients currently waiting in the clinic queue.
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => (
                <div
                  key={c._id}
                  onClick={() => handleSelectConsultation(c)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${selectedConsultation?._id === c._id ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-200 block">
                      {c.patientId?.firstName} {c.patientId?.lastName}
                    </span>
                    {getPriorityBadge(c.priority)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Doctor: Dr. {c.doctorId?.lastName} ({c.doctorId?.specialization})
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Arrived {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 2: Triage Assessment Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {selectedConsultation ? (
            <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6">
              <div className="border-b border-slate-900 pb-4">
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">
                  Active Triage Worksheet:
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-1">
                  {selectedConsultation.patientId?.firstName} {selectedConsultation.patientId?.lastName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: {selectedConsultation.patientId?.hospitalId} • Assigned: Dr. {selectedConsultation.doctorId?.firstName} {selectedConsultation.doctorId?.lastName}
                </p>
              </div>

              {/* Step 1: Input symptoms */}
              <div className="space-y-3">
                <label className="block text-[11px] font-semibold text-slate-400">Describe Presenting Symptoms *</label>
                <div className="flex gap-3">
                  <textarea
                    rows={3}
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                    placeholder="Describe symptoms in detail (e.g. crushing chest pain spreading to left shoulder, lightheadedness, nausea)"
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleEvaluateSymptoms}
                    disabled={aiLoading || !symptomText.trim()}
                    className="px-4 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/30 text-sky-400 text-xs font-semibold rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
                    ) : (
                      <Activity className="w-5 h-5 text-sky-400" />
                    )}
                    AI Assess
                  </button>
                </div>
              </div>

              {/* AI Suggestion box */}
              {aiSuggestion && (
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-850 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-start border-b border-slate-950 pb-3">
                    <div>
                      <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">AI Triage Recommendation:</span>
                      <span className="text-sm font-bold text-slate-200 capitalize mt-0.5 block flex items-center gap-1.5">
                        Priority: {aiSuggestion.priority}
                      </span>
                    </div>
                    {getPriorityBadge(aiSuggestion.priority)}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {aiSuggestion.explanation}
                  </p>

                  {/* Insufficient Details Warning */}
                  {aiSuggestion.insufficientInfo && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start gap-2.5 text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Vague Symptom Input:</span>
                        Please ask the following questions to secure additional details.
                      </div>
                    </div>
                  )}

                  {/* Recommended questions */}
                  {aiSuggestion.suggestedQuestions?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Follow-up Screening Questions:</span>
                      <ul className="space-y-1">
                        {aiSuggestion.suggestedQuestions.map((q, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-400 font-semibold">•</span> {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Confirm triage settings */}
              <form onSubmit={handleConfirmTriage} className="space-y-4 pt-4 border-t border-slate-900">
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400">Triage Priority Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['routine', 'urgent', 'emergency'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setConfirmedPriority(level as any)}
                        className={`py-2.5 rounded-xl border text-xs font-semibold capitalize transition-all ${confirmedPriority === level ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-md' : 'bg-slate-900 border-slate-850 text-slate-400'}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Override Reason */}
                {aiSuggestion && confirmedPriority !== aiSuggestion.priority && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-[11px] font-semibold text-rose-450 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Priority Override Reason *
                    </label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Clinical assessment notes signs of neurological delay not captured in text"
                      className="w-full bg-slate-900 border border-rose-500/25 focus:border-rose-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Triage Notes */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400">Clinical Triage Notes (Optional)</label>
                  <input
                    type="text"
                    value={triageNotes}
                    onChange={(e) => setTriageNotes(e.target.value)}
                    placeholder="Enter additional nurse notes, vital signs, or observations"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedConsultation(null)}
                    className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2 px-5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10"
                  >
                    Confirm Triage & Update Queue
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[350px]">
              <FileText className="w-12 h-12 text-slate-700 mb-3" />
              <span className="font-semibold block text-slate-450">Triage Assessment Workspace</span>
              <p className="text-xs text-slate-650 max-w-sm mt-1">
                Select a patient from the waiting list on the left to begin symptom evaluation, AI triage assessment, and priority configuration.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
