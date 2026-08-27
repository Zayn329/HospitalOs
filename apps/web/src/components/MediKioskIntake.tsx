import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertTriangle, ShieldCheck, Heart, Sparkles, Send, Volume2, Globe, Stethoscope, FileText, Upload, CheckCircle2, FileCheck, Layers, Key, Clock, Trash2 } from 'lucide-react';

export const MediKioskIntake: React.FC = () => {
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [mode, setMode] = useState<'allopathy' | 'ayush'>('allopathy');
  const [isListening, setIsListening] = useState(false);
  const [step, setStep] = useState<'welcome' | 'consent' | 'cc' | 'socrates' | 'ocr' | 'summary'>('welcome');
  const [sessionId, setSessionId] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<Array<{ id: string; question: string; options: string[] }>>([]);
  const [socratesAnswers, setSocratesAnswers] = useState<Record<string, string>>({});
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorSummary, setDoctorSummary] = useState<any>(null);

  // Module D: ABHA / Aadhaar Auth State
  const [inputAbhaId, setInputAbhaId] = useState<string>('91-2345-6789-0123');
  const [inputAadhaar, setInputAadhaar] = useState<string>('9876-5432-1098');
  const [aadhaarOtp, setAadhaarOtp] = useState<string>('123456');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [abhaDetails, setAbhaDetails] = useState<any>(null);

  // Module D: Granular DPDP Consent State
  const [shareHistory, setShareHistory] = useState<boolean>(true);
  const [shareScannedDocs, setShareScannedDocs] = useState<boolean>(true);
  const [shareAnalytics, setShareAnalytics] = useState<boolean>(false);
  const [accessDurationHours, setAccessDurationHours] = useState<number>(24);

  // Module D: Ephemeral Memory Wipe & Inactivity Auto-Reset
  const [inactivityTimer, setInactivityTimer] = useState<number>(60);
  const [wipeNotice, setWipeNotice] = useState<string | null>(null);

  // Module B: OCR State
  const [docType, setDocType] = useState<string>('Lab Report');
  const [docFileName, setDocFileName] = useState<string>('Lab_Report_MultiPage.pdf');
  const [ocrInputText, setOcrText] = useState<string>(
    'Page 1: Rx Metformin 500mg BD. Diagnosis: Type 2 Diabetes Mellitus\n--- NEXT PAGE ---\nPage 2: HbA1c 8.4% (Reference < 5.7%) - ELEVATED. Serum Creatinine 1.5 mg/dL (Reference 0.6-1.2) - HIGH'
  );
  const [scannedDocs, setScannedDocs] = useState<Array<any>>([]);
  const [digitizing, setDigitizing] = useState(false);

  // Inactivity Auto-Reset Countdown Timer for Ephemeral Kiosks
  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(() => {
      setInactivityTimer((prev) => {
        if (prev <= 1) {
          handleWipeSessionMemory('Inactivity timeout auto-reset (60s idle threshold reached).');
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  // Reset timer on user activity
  const resetActivityTimer = () => {
    setInactivityTimer(60);
  };

  // Start Session with Module D ABHA / Aadhaar Auth
  const handleStartSession = async () => {
    setLoading(true);
    setWipeNotice(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/medikiosk/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          mode,
          abhaId: inputAbhaId.trim() || undefined,
          aadhaarNumber: inputAadhaar.trim() || undefined,
          aadhaarOtp: otpSent ? aadhaarOtp.trim() : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setAbhaDetails(data.data.abhaDetails);
        setStep('consent');
      }
    } catch (err) {
      console.error('Error starting session:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send ABDM Sandbox OTP Simulation
  const handleSendAadhaarOtp = () => {
    setOtpSent(true);
  };

  // Give Granular DPDP Consent
  const handleGiveConsent = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/medikiosk/session/${sessionId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareHistory,
          shareScannedDocs,
          shareAnalytics,
          accessDurationHours
        })
      });
      const data = await res.json();
      if (data.success) {
        setStep('cc');
      }
    } catch (err) {
      console.error('Error recording consent:', err);
    } finally {
      setLoading(false);
    }
  };

  // Module D: Ephemeral Session Wipe API Call
  const handleWipeSessionMemory = async (_reason = 'Manual patient/staff session wipe requested.') => {
    if (!sessionId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/medikiosk/session/${sessionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      setWipeNotice(data.message || 'Session memory securely wiped.');
    } catch (err) {
      setWipeNotice('Session memory wiped locally.');
    } finally {
      // Reset all kiosk state
      setSessionId('');
      setStep('welcome');
      setChiefComplaint('');
      setSocratesAnswers({});
      setDoctorSummary(null);
      setRedFlags([]);
      setScannedDocs([]);
      setAbhaDetails(null);
      setOtpSent(false);
      setInactivityTimer(60);
    }
  };

  // Submit Chief Complaint & Get Adaptive Questions
  const handleSubmitChiefComplaint = async () => {
    if (!chiefComplaint.trim()) return;
    resetActivityTimer();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/medikiosk/session/${sessionId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chiefComplaint })
      });
      const data = await res.json();
      if (data.success) {
        setAdaptiveQuestions(data.data.adaptiveQuestions || []);
        setRedFlags(data.data.redFlagsDetected || []);
        setStep('socrates');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Module B: Run OCR Digitization Pipeline
  const handleRunOcrDigitization = async () => {
    if (!sessionId) return;
    resetActivityTimer();
    setDigitizing(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/medikiosk/session/${sessionId}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: docFileName,
          docType: docType,
          rawText: ocrInputText
        })
      });
      const data = await res.json();
      if (data.success && data.data?.document) {
        setScannedDocs((prev) => [...prev, data.data.document]);
      }
    } catch (err) {
      console.error('OCR Digitization failed:', err);
    } finally {
      setDigitizing(false);
    }
  };

  // Submit Socrates Answers & Get Summary
  const handleCompleteIntake = async () => {
    resetActivityTimer();
    setLoading(true);
    try {
      await fetch(`http://localhost:5000/api/v1/medikiosk/session/${sessionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chiefComplaint, socrates: socratesAnswers })
      });

      const res = await fetch(`http://localhost:5000/api/v1/medikiosk/session/${sessionId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setDoctorSummary(data.data);
        setStep('summary');
      }
    } catch (err) {
      console.error('Error completing intake:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Voice Input Mock
  const toggleVoiceInput = () => {
    resetActivityTimer();
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        if (step === 'cc' && !chiefComplaint) {
          setChiefComplaint('सीने में दर्द और सांस लेने में तकलीफ (Chest pain and shortness of breath)');
        }
        setIsListening(false);
      }, 2500);
    }
  };

  return (
    <div
      onClick={resetActivityTimer}
      className="w-full max-w-4xl mx-auto p-6 space-y-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-2xl my-4 relative"
    >
      {/* Kiosk Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              MediKiosk Operating Portal
            </h2>
            <p className="text-xs text-slate-400">Modules A, B, C, & D (ABDM Auth, DPDP Compliance, Ephemeral Wipe)</p>
          </div>
        </div>

        {/* Control Toggles */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setLanguage('hi')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                language === 'hi' ? 'bg-teal-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>हिंदी</span>
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                language === 'en' ? 'bg-teal-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>English</span>
            </button>
          </div>

          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setMode('allopathy')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'allopathy' ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Modern
            </button>
            <button
              onClick={() => setMode('ayush')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'ayush' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              AYUSH
            </button>
          </div>
        </div>
      </div>

      {/* Module D: Ephemeral Session Wipe Notification */}
      {wipeNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{wipeNotice}</span>
        </div>
      )}

      {/* Red Flags Alert Header */}
      {redFlags.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-3 text-rose-300 animate-pulse">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-400" />
          <div className="text-sm">
            <span className="font-bold">TRIAGE ALERT DETECTED:</span> {redFlags.join(' | ')}
          </div>
        </div>
      )}

      {/* Step Navigation Bar & Module D Inactivity Timer */}
      {sessionId && (
        <div className="flex flex-wrap items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-teal-400 font-bold px-2">Session: {sessionId}</span>
            {abhaDetails && (
              <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded font-mono font-bold border border-teal-500/30">
                ABHA: {abhaDetails.abhaId} ({abhaDetails.verificationStatus})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Wipe: {inactivityTimer}s</span>
            </span>

            <button
              onClick={() => handleWipeSessionMemory('User manual memory wipe')}
              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg flex items-center space-x-1 font-bold transition-all"
              title="Immediately Wipe Kiosk Session Data"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe Memory</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Welcome, Mode Selection & Module D ABHA Sandbox Auth */}
      {step === 'welcome' && (
        <div className="py-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="w-8 h-8 text-slate-950" />
            </div>
            <h3 className="text-xl font-bold">
              {language === 'hi' ? 'नमस्कार! कृपया अपनी स्वास्थ्य जानकारी दर्ज करें' : 'Welcome! Self-record your history'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {language === 'hi'
                ? 'ABDM ABHA आईडी लिंक करें, सहमति दें और अपनी स्वास्थ्य रिपोर्ट डिजिटाइज करें।'
                : 'Link your ABDM ABHA ID, provide DPDP consent, and digitize medical records.'}
            </p>
          </div>

          {/* Module D: ABDM / Aadhaar Sandbox Authentication Card */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4 max-w-lg mx-auto">
            <div className="flex items-center space-x-2 text-teal-400 font-bold text-sm">
              <Key className="w-4 h-4" />
              <span>ABDM ABHA Sandbox Identity Linkage</span>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">ABHA ID Number (14 Digits):</label>
                <input
                  type="text"
                  value={inputAbhaId}
                  onChange={(e) => setInputAbhaId(e.target.value)}
                  placeholder="e.g. 91-2345-6789-0123"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Aadhaar Number (Sandbox Verification):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputAadhaar}
                    onChange={(e) => setInputAadhaar(e.target.value)}
                    placeholder="12-digit Aadhaar"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSendAadhaarOtp}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold border border-slate-700 rounded-lg"
                  >
                    Send OTP
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg space-y-2">
                  <span className="text-teal-300 font-bold block">Aadhaar Sandbox OTP Sent:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aadhaarOtp}
                      onChange={(e) => setAadhaarOtp(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-center tracking-widest"
                    />
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded flex items-center">
                      ✓ OTP Verified
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg hover:brightness-110 transition-all text-sm"
            >
              {loading ? 'Initializing ABDM Session...' : language === 'hi' ? 'शुरू करें (Start Intake)' : 'Start Verified Kiosk Session'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Module D - Granular DPDP Consent Prompt */}
      {step === 'consent' && (
        <div className="py-6 space-y-6">
          <div className="p-6 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-5">
            <div className="flex items-center justify-between text-teal-400">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6" />
                <h4 className="font-bold text-lg">DPDP Act 2023 Granular Data Consent</h4>
              </div>
              <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 text-xs font-mono font-bold rounded border border-teal-500/30">
                DPDP-2023-V1
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Under the Digital Personal Data Protection (DPDP) Act 2023 & ABDM guidelines, select granular data permissions before commencing your intake.
            </p>

            {/* Granular Toggles */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-200 font-medium">1. Share Clinical History & Symptoms with Treating Doctor</span>
                <input
                  type="checkbox"
                  checked={shareHistory}
                  onChange={(e) => setShareHistory(e.target.checked)}
                  className="w-4 h-4 accent-teal-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-200 font-medium">2. Share Scanned Prescriptions & Lab OCR Digitization Timeline</span>
                <input
                  type="checkbox"
                  checked={shareScannedDocs}
                  onChange={(e) => setShareScannedDocs(e.target.checked)}
                  className="w-4 h-4 accent-teal-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-200 font-medium">3. Allow Anonymous Quality & Kiosk Analytics Improvement</span>
                <input
                  type="checkbox"
                  checked={shareAnalytics}
                  onChange={(e) => setShareAnalytics(e.target.checked)}
                  className="w-4 h-4 accent-teal-500"
                />
              </label>

              <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Doctor Access Expiry Duration:</span>
                <select
                  value={accessDurationHours}
                  onChange={(e) => setAccessDurationHours(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 text-xs focus:outline-none"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Default)</option>
                  <option value={48}>48 Hours</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <Volume2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Audio explanation active in {language === 'hi' ? 'Hindi (हिंदी)' : 'English'}. Session automatically wipes upon submission.</span>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleGiveConsent}
              disabled={loading}
              className="px-6 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl hover:bg-teal-400 transition-all text-sm"
            >
              {loading ? 'Processing...' : language === 'hi' ? 'सहमति दर्ज करें (Record Consent)' : 'Confirm Granular Consent'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Chief Complaint Input (Voice + Touch) */}
      {step === 'cc' && (
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span>{language === 'hi' ? 'मुख्य लक्षण / समस्या (Chief Complaint):' : 'What is your main symptom or reason for visit?'}</span>
              <span className="text-xs text-teal-400 flex items-center space-x-1">
                <Mic className="w-3.5 h-3.5" />
                <span>Voice input enabled</span>
              </span>
            </label>
            <div className="relative">
              <textarea
                value={chiefComplaint}
                onChange={(e) => {
                  resetActivityTimer();
                  setChiefComplaint(e.target.value);
                }}
                placeholder={
                  language === 'hi'
                    ? 'उदा: 2 दिनों से सीने में दर्द और चक्कर आना...'
                    : 'e.g. Chest pain for 2 days radiating to left shoulder...'
                }
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={toggleVoiceInput}
                className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${
                  isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-teal-400 hover:bg-slate-700'
                }`}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Quick Tap Symptoms */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400">Quick Touch Selector (Elderly / Fast-Tap):</span>
            <div className="flex flex-wrap gap-2">
              {['Chest Pain', 'Fever & Cough', 'Severe Headache', 'Abdominal Pain', 'Shortness of Breath'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => {
                    resetActivityTimer();
                    setChiefComplaint(sym);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-teal-500/20 hover:border-teal-500/40 border border-slate-700 text-xs rounded-lg text-slate-300 transition-all"
                >
                  + {sym}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmitChiefComplaint}
              disabled={loading || !chiefComplaint.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-bold rounded-xl disabled:opacity-50 text-sm flex items-center space-x-2"
            >
              <span>{language === 'hi' ? 'अगला सवाल (Next)' : 'Next Step'}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: SOCRATES / AYUSH Adaptive Questioning */}
      {step === 'socrates' && (
        <div className="py-6 space-y-6">
          <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-1">
            <span className="text-xs uppercase tracking-wider text-teal-400 font-bold">
              {mode === 'ayush' ? 'AYUSH Dashavidha Pariksha Mode' : 'SOCRATES Adaptive Clinical Intake'}
            </span>
            <h4 className="text-base font-bold text-slate-100">Chief Complaint: "{chiefComplaint}"</h4>
          </div>

          <div className="space-y-4">
            {adaptiveQuestions.map((q) => (
              <div key={q.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <label className="text-sm font-semibold text-slate-200 block">{q.question}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        resetActivityTimer();
                        setSocratesAnswers({ ...socratesAnswers, [q.id]: opt });
                      }}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                        socratesAnswers[q.id] === opt
                          ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('ocr')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 font-bold rounded-xl text-xs flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Proceed to Module B Document OCR Upload</span>
            </button>

            <button
              onClick={handleCompleteIntake}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg hover:brightness-110"
            >
              {loading ? 'Synthesizing Draft Summary...' : 'Submit to Doctor Screen'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4.5: Module B: Medical Document Digitization & OCR Pipeline */}
      {step === 'ocr' && (
        <div className="py-6 space-y-6 animate-in fade-in duration-200">
          <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3 text-teal-300">
              <FileText className="w-6 h-6 text-teal-400" />
              <div>
                <h4 className="font-bold text-base">Module B: Medical Document Digitization & OCR Pipeline</h4>
                <p className="text-xs text-slate-400">Digitize Multi-Page Prescriptions, Lab Reports, & Discharge Summaries</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs font-mono font-bold border border-teal-500/30">
              Docling + Groq OCR Engine
            </span>
          </div>

          {/* Upload & Parsing Control Card */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Document Category:</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Lab Report">Lab Report (e.g. HbA1c, Metabolic Panel)</option>
                  <option value="Prescription">Paper Prescription (Handwritten/Printed)</option>
                  <option value="Discharge Summary">Multi-Page Hospital Discharge Summary</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Scanned Document Filename:</label>
                <input
                  type="text"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">
                Multi-Page Scanned Content / OCR Input Stream:
              </label>
              <textarea
                value={ocrInputText}
                onChange={(e) => {
                  resetActivityTimer();
                  setOcrText(e.target.value);
                }}
                rows={4}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOcrText('Page 1: Prescription Metformin 500mg BD\n--- NEXT PAGE ---\nPage 2: HbA1c 8.4% High, Creatinine 1.5 High')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-teal-400"
                >
                  Load Sample Multi-Page Lab (HbA1c &gt; 8.0%)
                </button>
              </div>

              <button
                onClick={handleRunOcrDigitization}
                disabled={digitizing}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg hover:brightness-110 disabled:opacity-50"
              >
                <Upload className={`w-4 h-4 ${digitizing ? 'animate-bounce' : ''}`} />
                <span>{digitizing ? 'Extracting via Docling OCR...' : 'Digitize & Parse Document'}</span>
              </button>
            </div>
          </div>

          {/* Digitized Output Cards */}
          {scannedDocs.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-teal-400" />
                <span>Digitized Document Artifacts ({scannedDocs.length})</span>
              </h4>

              {scannedDocs.map((doc, idx) => (
                <div key={idx} className="p-5 bg-slate-950 border border-teal-500/30 rounded-xl space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-850 pb-3">
                    <div>
                      <span className="text-xs font-bold text-teal-400 font-mono">{doc.id}</span>
                      <h5 className="text-sm font-bold text-slate-100">{doc.fileName} ({doc.docType})</h5>
                    </div>
                    {doc.pageCount && (
                      <span className="flex items-center space-x-1 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-xs">
                        <Layers className="w-3.5 h-3.5 text-teal-400" />
                        <span>{doc.pageCount} Pages</span>
                      </span>
                    )}
                  </div>

                  {/* Abnormal Lab Flag Alert Box */}
                  {doc.abnormalLabFlags && doc.abnormalLabFlags.length > 0 && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-1">
                      <span className="text-xs font-bold text-rose-400 flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>ABNORMAL LAB FLAGGED IN TIMELINE:</span>
                      </span>
                      <ul className="list-disc list-inside text-xs text-rose-300">
                        {doc.abnormalLabFlags.map((flag: string, fIdx: number) => (
                          <li key={fIdx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Extracted Entities Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-400 font-semibold block mb-1">Extracted Diagnosis:</span>
                      <span className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded font-medium border border-teal-500/30 inline-block">
                        {doc.extractedDiagnosis || 'None identified'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-400 font-semibold block mb-1">Active Medications:</span>
                      {doc.extractedMedications && doc.extractedMedications.length > 0 ? (
                        <ul className="space-y-1">
                          {doc.extractedMedications.map((m: any, mIdx: number) => (
                            <li key={mIdx} className="text-slate-200 font-mono">
                              • {m.name} ({m.dosage})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-500">None extracted</span>
                      )}
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-400 font-semibold block mb-1">Extracted Lab Values:</span>
                      {doc.extractedLabValues && doc.extractedLabValues.length > 0 ? (
                        <ul className="space-y-1">
                          {doc.extractedLabValues.map((l: any, lIdx: number) => (
                            <li key={lIdx} className={l.isAbnormal ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                              • {l.test}: {l.result} {l.unit} ({l.referenceRange})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-500">None extracted</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('socrates')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
            >
              Back to Questions
            </button>

            <button
              onClick={handleCompleteIntake}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg hover:brightness-110"
            >
              {loading ? 'Synthesizing Draft Summary...' : 'Submit All & Generate Doctor Summary'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Module C - Bilingual Draft Summary View & Module D Ephemeral Memory Wipe Banner */}
      {step === 'summary' && doctorSummary && (
        <div className="py-6 space-y-6 animate-in fade-in duration-200">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-300">
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Module C Complete: Bilingual Pre-Consultation Summary Draft Synchronized with Doctor Screen!</span>
            </div>
          </div>

          {/* Module C Dual-View Box */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-5">
            <h4 className="text-sm uppercase tracking-wider text-teal-400 font-bold flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-teal-400" />
                <span>Structured SOAP Draft Summary (Chief Complaint → HPI → Past History → ROS → Prior Investigations)</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">Bilingual Dual-View Active</span>
            </h4>

            {/* 5-Stage Structured SOAP Flow Grid */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <span className="text-teal-400 font-bold block">1. Chief Complaint:</span>
                <p className="text-slate-200">{doctorSummary.structuredSOAP.chiefComplaint}</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <span className="text-teal-400 font-bold block">2. History of Present Illness (HPI):</span>
                <p className="text-slate-200">{doctorSummary.structuredSOAP.historyOfPresentIllness}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-teal-400 font-bold block">3. Past Medical History & Allergies:</span>
                  <p className="text-slate-200">{doctorSummary.structuredSOAP.pastMedicalHistory || 'None reported'}</p>
                  <p className="text-rose-400 font-medium">Allergies: {doctorSummary.structuredSOAP.allergies || 'No known drug allergies'}</p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-teal-400 font-bold block">4. Review of Systems (ROS):</span>
                  <p className="text-slate-200">{doctorSummary.structuredSOAP.reviewOfSystems || 'Negative except CC'}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <span className="text-teal-400 font-bold block">5. Prior Investigations Timeline (Scanned Documents):</span>
                <p className="text-slate-300 font-mono">{doctorSummary.structuredSOAP.priorInvestigations || doctorSummary.structuredSOAP.priorInvestigationsTimeline || 'No prior documents attached'}</p>
              </div>
            </div>

            {/* Bilingual Audio Confirmation Box */}
            <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between items-center text-teal-300 font-bold">
                <span className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-teal-400" />
                  <span>Bilingual Spoken Audio Confirmation (Localized Patient Voice Text):</span>
                </span>
                <button
                  type="button"
                  onClick={() => alert(`Playing spoken audio: "${doctorSummary.bilingualAudioConfirmation.patientAudioText}"`)}
                  className="px-3 py-1 bg-teal-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-teal-400 flex items-center space-x-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Play Spoken Audio</span>
                </button>
              </div>
              <p className="text-slate-200 italic p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                "{doctorSummary.bilingualAudioConfirmation.patientAudioText}"
              </p>
              <div className="text-slate-400 text-[11px] pt-1">
                <span className="font-semibold text-slate-300">Doctor English Executive Stream:</span> {doctorSummary.bilingualAudioConfirmation.doctorEnglishSummary}
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => handleWipeSessionMemory('Intake completed & memory purged.')}
              className="px-6 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold rounded-xl text-xs border border-rose-500/30 transition-all flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wipe Ephemeral Kiosk Memory & Finish</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
