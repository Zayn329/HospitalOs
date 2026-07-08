import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, RefreshCw, AlertCircle, FileText, ShieldAlert, Plus, Trash2, Heart } from 'lucide-react';

interface Patient {
  firstName: string;
  lastName: string;
  allergies: string[];
  medicalHistory: string[];
}

interface Prescription {
  _id: string;
  medications: string[];
  instructions: string;
  createdAt: string;
}

interface Consultation {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    hospitalId: string;
    phone: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };
  status: 'open' | 'in_progress' | 'completed';
  priority?: string;
  symptoms?: string[];
  diagnosis?: string;
  treatmentPlan?: string;
  findings?: string;
  createdAt: string;
}

interface LabResult {
  testName: string;
  result: string;
  date: string;
}

export default function DoctorWorkspace() {
  const [queue, setQueue] = useState<Consultation[]>([]);
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  
  // Loaded clinical context
  const [patientContext, setPatientContext] = useState<Patient | null>(null);
  const [pastPrescriptions, setPastPrescriptions] = useState<Prescription[]>([]);
  const [pastConsultations, setPastConsultations] = useState<Consultation[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);

  // Clinical inputs
  const [diagnosis, setDiagnosis] = useState('');
  const [findings, setFindings] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');

  // AI Scribe SOAP notes
  const [soapNotes, setSoapNotes] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [scribeLoading, setScribeLoading] = useState(false);

  // Prescription builder
  const [medications, setMedications] = useState<string[]>([]);
  const [currentMed, setCurrentMed] = useState('');
  const [instructions, setInstructions] = useState('');
  
  // Allergy warning states
  const [allergyWarnings, setAllergyWarnings] = useState<string[]>([]);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  // General states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/consultations/queue');
      const result = await res.json();
      if (res.ok && result.success) {
        setQueue(result.data);
      }
    } catch (err) {
      setError("Failed to fetch wait queue from API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenConsultation = async (consultation: Consultation) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/consultations/${consultation._id}/start`, {
        method: 'POST'
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setActiveConsultation(result.data.consultation);
        setPatientContext(result.data.patient);
        setPastPrescriptions(result.data.pastPrescriptions);
        setPastConsultations(result.data.pastConsultations);
        setLabResults(result.data.labResults);
        
        // Reset inputs
        setDiagnosis(result.data.consultation.diagnosis || '');
        setFindings(result.data.consultation.findings || '');
        setTreatmentPlan(result.data.consultation.treatmentPlan || '');
        setSoapNotes({ subjective: '', objective: '', assessment: '', plan: '' });
        setMedications([]);
        setCurrentMed('');
        setInstructions('');
        setAllergyWarnings([]);
        setOverrideReason('');
        setShowOverrideInput(false);
      } else {
        setError(result.error?.message || "Failed to start consultation.");
      }
    } catch (err) {
      setError("Express api service unreachable.");
    } finally {
      setLoading(false);
    }
  };

  // Run AI SOAP Scribe
  const handleConsultScribe = async () => {
    if (!activeConsultation) return;
    if (!findings.trim() || !treatmentPlan.trim()) {
      setError("Please input findings and a treatment plan for the AI Scribe to process.");
      return;
    }

    setScribeLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/consultations/${activeConsultation._id}/scribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: activeConsultation.symptoms || ['General evaluation'],
          findings: findings.trim(),
          treatment: treatmentPlan.trim()
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSoapNotes(result.data);
      } else {
        setError(result.error?.message || "AI Scribe notes generation failed.");
      }
    } catch (err) {
      setError("AI Scribe service offline.");
    } finally {
      setScribeLoading(false);
    }
  };

  // Add medication to prescription list
  const handleAddMedication = () => {
    if (!currentMed.trim()) return;
    const updatedMeds = [...medications, currentMed.trim()];
    setMedications(updatedMeds);
    setCurrentMed('');
    triggerAllergyCheck(updatedMeds);
  };

  // Remove medication
  const handleRemoveMedication = (idx: number) => {
    const updatedMeds = medications.filter((_, i) => i !== idx);
    setMedications(updatedMeds);
    triggerAllergyCheck(updatedMeds);
  };

  // Medication safety check API trigger
  const triggerAllergyCheck = async (medsList: string[]) => {
    if (!patientContext || medsList.length === 0) {
      setAllergyWarnings([]);
      setShowOverrideInput(false);
      return;
    }

    const currentMedications = pastPrescriptions
      .filter(p => p.status === 'active')
      .flatMap(p => p.medications);

    try {
      const res = await fetch('http://localhost:8000/api/v1/agent/medication-safety/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allergies: patientContext.allergies,
          medications: medsList,
          current_medications: currentMedications
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.isConflict) {
          setAllergyWarnings(result.warnings);
          setShowOverrideInput(true);
        } else {
          setAllergyWarnings([]);
          setShowOverrideInput(false);
        }
      }
    } catch (err) {
      // Local fallback checking in UI
      const warnings: string[] = [];
      for (const med of medsList) {
        const m = med.toLowerCase();
        for (const allergy of patientContext.allergies) {
          const a = allergy.toLowerCase();
          if (a.includes(m) || m.includes(a)) {
            warnings.push(`Direct match conflict: Prescribed medication '${med}' matches patient allergen '${allergy}'.`);
          } else if (a.includes('penicillin') && (m.includes('amoxicillin') || m.includes('ampicillin'))) {
            warnings.push(`Class Cross-Reactivity warning: Penicillin allergen reacts with prescribed '${med}'.`);
          }
        }

        for (const curr of currentMedications) {
          const currLower = curr.toLowerCase();
          if (currLower.includes("warfarin") && (m.includes("aspirin") || m.includes("ibuprofen"))) {
            warnings.push(`Drug-Drug Interaction: Prescribing '${med}' alongside '${curr}' increases bleeding risk.`);
          } else if (m.includes("warfarin") && (currLower.includes("aspirin") || currLower.includes("ibuprofen"))) {
            warnings.push(`Drug-Drug Interaction: Prescribing '${med}' alongside '${curr}' increases bleeding risk.`);
          } else if (currLower.includes("lisinopril") && m.includes("spironolactone")) {
            warnings.push(`Drug-Drug Interaction: Prescribing '${med}' alongside '${curr}' increases hyperkalemia risk.`);
          } else if (m.includes("lisinopril") && currLower.includes("spironolactone")) {
            warnings.push(`Drug-Drug Interaction: Prescribing '${med}' alongside '${curr}' increases hyperkalemia risk.`);
          }

          const medClean = med.split(' ')[0].toLowerCase();
          const currClean = curr.split(' ')[0].toLowerCase();
          if (medClean === currClean) {
            warnings.push(`Duplicate Medication: Patient is already prescribed '${curr}' which duplicates proposed '${med}'.`);
          } else if ((medClean === 'ibuprofen' || medClean === 'naproxen' || medClean === 'aspirin') &&
                     (currClean === 'ibuprofen' || currClean === 'naproxen' || currClean === 'aspirin')) {
            warnings.push(`Therapeutic Duplication: Both '${med}' and '${curr}' are NSAIDs. Avoid co-prescribing.`);
          }
        }
      }
      setAllergyWarnings(warnings);
      setShowOverrideInput(warnings.length > 0);
    }
  };

  // Complete consultation submission
  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultation) return;

    setError(null);
    setSuccess(null);

    if (!diagnosis.trim() || !findings.trim() || !treatmentPlan.trim()) {
      setError("Please fill out Diagnosis, Findings, and Treatment Plan fields.");
      return;
    }

    if (allergyWarnings.length > 0 && !overrideReason.trim()) {
      setError("Allergy warning alert active. Please enter an override justification reason to complete booking.");
      return;
    }

    // Default SOAP notes if AI was not run
    const finalSoapNotes = soapNotes.subjective ? soapNotes : {
      subjective: `Patient reports symptoms: ${(activeConsultation.symptoms || []).join(', ') || 'Not reported'}`,
      objective: `Clinical findings: ${findings}`,
      assessment: `Diagnosis: ${diagnosis}`,
      plan: `Plan: ${treatmentPlan}`
    };

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/consultations/${activeConsultation._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: diagnosis.trim(),
          findings: findings.trim(),
          treatmentPlan: treatmentPlan.trim(),
          soapNotes: finalSoapNotes,
          medications: medications.length > 0 ? medications : undefined,
          instructions: medications.length > 0 ? instructions || 'Take as directed.' : undefined,
          allergyOverrideReason: allergyWarnings.length > 0 ? overrideReason.trim() : undefined
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setSuccess("Consultation completed successfully. Patient charts updated.");
        setActiveConsultation(null);
        setPatientContext(null);
        fetchQueue();
      } else {
        if (result.error?.code === 'ALLERGY_CONFLICT') {
          setAllergyWarnings(result.error.warnings);
          setShowOverrideInput(true);
        }
        setError(result.error?.message || "Failed to complete consultation.");
      }
    } catch (err) {
      setError("Network error completing consultation.");
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
        
        {/* Panel 1: Patient queue list */}
        <div className="lg:col-span-1 glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" /> Clinic Queue
            </h2>
            <button onClick={fetchQueue} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12 text-slate-650 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20 text-xs">
              No patients waiting in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((c) => (
                <div
                  key={c._id}
                  onClick={() => !activeConsultation && handleOpenConsultation(c)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${activeConsultation?._id === c._id ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/30 border-slate-900 hover:border-slate-800 cursor-pointer'} ${activeConsultation && activeConsultation._id !== c._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="font-semibold text-slate-200 block text-xs">
                    {c.patientId?.firstName} {c.patientId?.lastName}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
                    <span>Priority: <span className="font-semibold capitalize text-sky-400">{c.priority || 'routine'}</span></span>
                    <span>{c.status === 'in_progress' ? 'In Progress' : 'Waiting'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 2: Clinical worksheet */}
        <div className="lg:col-span-3">
          {activeConsultation && patientContext ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Worksheet Form */}
              <div className="md:col-span-2 space-y-6">
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6">
                  <div className="border-b border-slate-900 pb-4">
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">Clinical Consultation workspace</span>
                    <h2 className="text-lg font-bold text-slate-100 mt-1">
                      {activeConsultation.patientId?.firstName} {activeConsultation.patientId?.lastName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Symptoms reported: {activeConsultation.symptoms?.join(', ') || 'None'}
                    </p>
                  </div>

                  <form onSubmit={handleCompleteConsultation} className="space-y-5">
                    {/* Diagnosis */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Diagnosis *</label>
                      <input
                        type="text"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="e.g. Acute streptococcal tonsillitis"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Findings */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Clinical Findings & Observations *</label>
                      <textarea
                        rows={3}
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        placeholder="Notes on exam, throat redness, lymph nodes swollen, temperature..."
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
                        placeholder="Rest, fluid intake, prescriptions, instructions..."
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    {/* AI Scribe SOAP trigger */}
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={handleConsultScribe}
                        disabled={scribeLoading || !findings || !treatmentPlan}
                        className="py-2 px-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/25 text-sky-400 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {scribeLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        Consult AI Scribe (Generate SOAP)
                      </button>
                    </div>

                    {/* SOAP Review block */}
                    {soapNotes.subjective && (
                      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-850 space-y-4">
                        <span className="text-[10px] text-sky-450 font-bold uppercase tracking-wider block">Structured SOAP Notes (AI Generated)</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Subjective</span>
                            <textarea
                              rows={2}
                              value={soapNotes.subjective}
                              onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[11px] text-slate-355 resize-none focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Objective</span>
                            <textarea
                              rows={2}
                              value={soapNotes.objective}
                              onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[11px] text-slate-355 resize-none focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Assessment</span>
                            <textarea
                              rows={2}
                              value={soapNotes.assessment}
                              onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[11px] text-slate-355 resize-none focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Plan</span>
                            <textarea
                              rows={2}
                              value={soapNotes.plan}
                              onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[11px] text-slate-355 resize-none focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prescription Builder */}
                    <div className="pt-4 border-t border-slate-900 space-y-4">
                      <span className="block text-[11px] font-bold text-slate-300">Prescription Builder</span>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={currentMed}
                          onChange={(e) => setCurrentMed(e.target.value)}
                          placeholder="e.g. Amoxicillin 500mg"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddMedication}
                          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {medications.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {medications.map((med, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                                {med}
                                <button type="button" onClick={() => handleRemoveMedication(idx)} className="text-rose-450 hover:text-rose-350 ml-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                          
                          <input
                            type="text"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Instructions (e.g. Take 1 capsule twice daily for 7 days)"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Allergy warnings warning box */}
                    {allergyWarnings.length > 0 && (
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-450 space-y-3 animate-in shake duration-300">
                        <span className="font-bold flex items-center gap-2 text-rose-400 text-sm">
                          <ShieldAlert className="w-5 h-5 text-rose-400" />
                          CRITICAL: Drug-Allergy Warning Alert!
                        </span>
                        <ul className="list-disc pl-5 text-xs text-rose-300 space-y-1">
                          {allergyWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>

                        {showOverrideInput && (
                          <div className="space-y-1.5 pt-2 border-t border-rose-500/20">
                            <label className="block text-[10px] font-bold text-rose-400 uppercase">Enter Override Clinical Justification *</label>
                            <input
                              type="text"
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              placeholder="Clinical reason (e.g. Patient previously tolerated, allergy is mild rash only)"
                              className="w-full bg-slate-950 border border-rose-500/30 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submit Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConsultation(null);
                          setPatientContext(null);
                        }}
                        className="py-2.5 px-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                      >
                        Close workspace
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="py-2.5 px-5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10"
                      >
                        Complete Consultation
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Patient Context Sidebar */}
              <div className="space-y-6">
                
                {/* Patient summary */}
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block border-b border-slate-900 pb-2">Patient Demographics</span>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-600 block">Allergies:</span>
                      {patientContext.allergies.length === 0 ? (
                        <span className="text-xs text-slate-400">None documented</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patientContext.allergies.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-semibold text-rose-400">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-600 block">Medical History:</span>
                      {patientContext.medicalHistory.length === 0 ? (
                        <span className="text-xs text-slate-400">None documented</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patientContext.medicalHistory.map((h, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350">
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Laboratory results */}
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block border-b border-slate-900 pb-2">Recent Lab Results</span>
                  {labResults.length === 0 ? (
                    <span className="text-xs text-slate-600">No laboratory records</span>
                  ) : (
                    <div className="space-y-3">
                      {labResults.map((r, i) => (
                        <div key={i} className="text-left bg-slate-900/30 p-2.5 rounded-xl border border-slate-900 text-xs">
                          <span className="font-semibold text-slate-200 block">{r.testName}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{r.result}</p>
                          <span className="text-[9px] text-slate-600 font-mono mt-1 block">{r.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescription history */}
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block border-b border-slate-900 pb-2">Prescription History</span>
                  {pastPrescriptions.length === 0 ? (
                    <span className="text-xs text-slate-600">No prescribing history</span>
                  ) : (
                    <div className="space-y-3">
                      {pastPrescriptions.map((p, i) => (
                        <div key={i} className="text-left bg-slate-900/30 p-2.5 rounded-xl border border-slate-900 text-xs">
                          <div className="flex flex-wrap gap-1">
                            {p.medications.map((m, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-indigo-400">
                                {m}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{p.instructions}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Past Consultations */}
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block border-b border-slate-900 pb-2">Past Consultations</span>
                  {pastConsultations.length === 0 ? (
                    <span className="text-xs text-slate-600">No past consultations</span>
                  ) : (
                    <div className="space-y-3">
                      {pastConsultations.map((c, i) => (
                        <div key={i} className="text-left bg-slate-900/30 p-2.5 rounded-xl border border-slate-900 text-xs">
                          <span className="font-semibold text-slate-200 block">Diagnosis: {c.diagnosis}</span>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Findings: {c.findings}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-16 text-center text-slate-500 flex flex-col items-center justify-center min-h-[450px]">
              <Heart className="w-12 h-12 text-slate-700 mb-3" />
              <span className="font-bold text-slate-400 block">Clinical Consultation Workspace</span>
              <p className="text-xs text-slate-600 max-w-sm mt-1">
                Select a checked-in patient from the wait queue on the left to load their clinical profile, chart records, and open the active consultation worksheet.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
