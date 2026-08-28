import { useState, useEffect } from 'react';
import { LogOut, FileText, Cpu, CheckCircle, XCircle, RefreshCw, Printer } from 'lucide-react';

interface Consultation {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    hospitalId: string;
    allergies: string[];
    medicalHistory: string[];
  };
  doctorId: {
    firstName: string;
    lastName: string;
    specialization: string;
  };
  diagnosis: string;
  treatmentPlan: string;
  status: string;
  updatedAt: string;
}

interface DischargeWorkspaceProps {
  token: string | null;
  addLog: (msg: string) => void;
}

export default function DischargeWorkspace({ token: _token, addLog }: DischargeWorkspaceProps) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  // Form states
  const [dischargeInstructions, setDischargeInstructions] = useState('');
  const [followUpRecommendations, setFollowUpRecommendations] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState<any | null>(null);

  const fetchConsultations = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all completed consultations
      const res = await fetch('http://localhost:5000/api/v1/consultations');
      const data = await res.json();
      if (res.ok && data.success) {
        const completed = data.data.filter((c: any) => c.status === 'completed');
        
        // Fetch existing discharges
        const dischargeRes = await fetch('http://localhost:5000/api/v1/discharges');
        const dischargeData = await dischargeRes.json();
        
        if (dischargeRes.ok && dischargeData.success) {
          // Filter out consultations that already have completed discharges
          const awaitingDischarge = completed.filter((c: any) => {
            return !dischargeData.data.some((d: any) => d.consultationId === c._id);
          });
          setConsultations(awaitingDischarge);
        } else {
          setConsultations(completed);
        }
      }
    } catch (err) {
      setError("Failed to fetch completed consultations from API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const handleSelectConsultation = async (consultation: Consultation) => {
    setError(null);
    setSuccess(null);
    setSelectedConsultation(consultation);
    setDischargeInstructions('');
    setFollowUpRecommendations('');
    setDischargeSummary(null);

    // Fetch prescribed medications if any
    try {
      const res = await fetch(`http://localhost:5000/api/v1/consultations/${consultation._id}/start`, { method: 'POST' });
      const result = await res.json();
      if (res.ok && result.success) {
        const currentPrescription = result.data.pastPrescriptions.find(
          (p: any) => p.consultationId === consultation._id
        );
        setMedications(currentPrescription?.medications || []);
      } else {
        setMedications([]);
      }
    } catch (err) {
      setMedications([]);
    }
  };

  const handleAIDraft = async () => {
    if (!selectedConsultation) return;

    setError(null);
    setDrafting(true);
    addLog(`Consulting Patient Care Agent to draft instructions for consultation: ${selectedConsultation._id}...`);
    try {
      const res = await fetch('http://localhost:5000/api/v1/discharges/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: selectedConsultation._id })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setDischargeInstructions(result.data.dischargeInstructions);
        setFollowUpRecommendations(result.data.followUpRecommendations);
        addLog("AI draft discharge plan successfully generated and loaded.");
      } else {
        setError(result.error?.message || "Failed to generate AI draft instructions.");
      }
    } catch (err) {
      setError("Express API server unreachable.");
    } finally {
      setDrafting(false);
    }
  };

  const handleApproveDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    const payload = {
      consultationId: selectedConsultation._id,
      dischargeInstructions: dischargeInstructions.trim(),
      followUpRecommendations: followUpRecommendations.trim(),
      medications
    };

    addLog(`Submitting approved patient discharge record for ID: ${selectedConsultation.patientId._id}...`);
    try {
      const res = await fetch('http://localhost:5000/api/v1/discharges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccess("Patient discharge approved successfully!");
        setDischargeSummary({
          patientName: `${selectedConsultation.patientId.firstName} ${selectedConsultation.patientId.lastName}`,
          hospitalId: selectedConsultation.patientId.hospitalId,
          diagnosis: selectedConsultation.diagnosis,
          medications,
          dischargeInstructions: result.data.dischargeInstructions,
          followUpRecommendations: result.data.followUpRecommendations,
          dischargedAt: new Date(result.data.createdAt).toLocaleString()
        });
        addLog(`Discharge completed: ID ${result.data._id}`);
        setSelectedConsultation(null);
        fetchConsultations();
      } else {
        setError(result.error?.message || "Failed to complete discharge.");
      }
    } catch (err) {
      setError("Express API server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <LogOut className="w-6 h-6 text-sky-400" />
            Patient Discharge Workspace
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Authorize patient checkout, generate follow-up care plans, and compile printable discharge summaries.
          </p>
        </div>
        <button
          onClick={fetchConsultations}
          disabled={loading}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar consultations list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase block border-b border-slate-900 pb-2">Ready to Discharge</span>
            
            {consultations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No completed consultations waiting for discharge.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {consultations.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => handleSelectConsultation(c)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-2 block ${
                      selectedConsultation?._id === c._id
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-slate-900/30 border-slate-900 hover:border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold block">{c.patientId.firstName} {c.patientId.lastName}</span>
                        <span className="text-[9px] text-slate-500 font-mono block">{c.patientId.hospitalId}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400">Completed</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1"><span className="text-slate-650">Diag:</span> {c.diagnosis}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Discharge Form & Summary View */}
        <div className="lg:col-span-2 space-y-6">
          {selectedConsultation ? (
            <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-900 pb-4">
                <span className="text-[10px] text-sky-400 font-bold uppercase block mb-1">Discharge approval form</span>
                <h3 className="text-sm font-bold text-slate-100">
                  Discharge Summary for {selectedConsultation.patientId.firstName} {selectedConsultation.patientId.lastName}
                </h3>
              </div>

              {/* Patient info recap card */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/15 border border-slate-900 rounded-xl p-4 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-500 block">Diagnosis:</span>
                  <span className="font-semibold text-slate-200">{selectedConsultation.diagnosis}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Treatment Plan:</span>
                  <span className="text-slate-350">{selectedConsultation.treatmentPlan}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block">Prescribed Medications:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {medications.length === 0 ? (
                      <span className="text-[11px] text-slate-500">None prescribed</span>
                    ) : (
                      medications.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-indigo-400">
                          {m}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleApproveDischarge} className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Discharge Instructions *</label>
                  <button
                    type="button"
                    onClick={handleAIDraft}
                    disabled={drafting}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-[10px] font-bold transition-all"
                  >
                    {drafting ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Cpu className="w-3.5 h-3.5" />
                    )}
                    Generate AI Instructions
                  </button>
                </div>

                <div className="space-y-4">
                  <textarea
                    rows={4}
                    required
                    value={dischargeInstructions}
                    onChange={(e) => setDischargeInstructions(e.target.value)}
                    placeholder="Provide dietary guidelines, activity limitations, medication warnings, and emergency red flags..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Follow-up Care Recommendations *</label>
                    <input
                      type="text"
                      required
                      value={followUpRecommendations}
                      onChange={(e) => setFollowUpRecommendations(e.target.value)}
                      placeholder="e.g. Follow up in 7 days for re-evaluation"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => setSelectedConsultation(null)}
                    className="py-2.5 px-4 bg-slate-900 border border-slate-800 text-slate-450 hover:text-slate-250 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2.5 px-5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10"
                  >
                    Approve Discharge
                  </button>
                </div>
              </form>
            </div>
          ) : dischargeSummary ? (
            <div className="glow-card rounded-3xl bg-slate-950/60 border border-emerald-500/20 p-6 space-y-5 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  DISCHARGE APPROVED
                </span>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 py-1 px-2.5 rounded bg-slate-900 text-slate-400 hover:text-slate-200 text-[10px] font-bold transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>

              {/* Printable Discharge Summary Sheet */}
              <div className="space-y-4 text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-3 border-b border-slate-900 pb-3 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Patient Name:</span>
                    <span className="font-bold text-slate-200">{dischargeSummary.patientName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Hospital ID:</span>
                    <span className="font-mono text-slate-200">{dischargeSummary.hospitalId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Discharge Time:</span>
                    <span className="text-slate-200">{dischargeSummary.dischargedAt}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Principal Diagnosis:</span>
                    <span className="font-semibold text-slate-200">{dischargeSummary.diagnosis}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Prescribed Home Medications</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {dischargeSummary.medications.length === 0 ? (
                      <span className="text-slate-550 italic">No home medications prescribed.</span>
                    ) : (
                      dischargeSummary.medications.map((m: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-indigo-400">
                          {m}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Care Instructions</span>
                  <p className="text-[11px] text-slate-350 bg-slate-900/20 border border-slate-900 p-3 rounded-xl whitespace-pre-line leading-relaxed font-sans">
                    {dischargeSummary.dischargeInstructions}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Follow-up Care recommendations</span>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-sans">{dischargeSummary.followUpRecommendations}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setDischargeSummary(null)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Dismiss Summary
                </button>
              </div>
            </div>
          ) : (
            <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-10 flex flex-col items-center justify-center text-center space-y-4">
              <FileText className="w-12 h-12 text-slate-700" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-300">Select a Patient</h3>
                <p className="text-xs text-slate-500 max-w-xs">Select a completed consultation from the sidebar queue to manage their discharge status.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
