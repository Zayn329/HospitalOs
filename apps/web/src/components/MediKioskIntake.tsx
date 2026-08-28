import React, { useState, useEffect } from 'react';
import {
  Mic, MicOff, AlertTriangle, ShieldCheck, Heart, Sparkles, Send, Volume2, Globe, Stethoscope, FileText, Upload, CheckCircle2, FileCheck, Clock, Trash2, ArrowRight, Shield, ChevronRight
} from 'lucide-react';

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

  const resetActivityTimer = () => {
    setInactivityTimer(60);
  };

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

  const handleSendAadhaarOtp = () => {
    setOtpSent(true);
  };

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

  // Helper step index for progress bar
  const getStepIndex = () => {
    switch (step) {
      case 'welcome': return 1;
      case 'consent': return 2;
      case 'cc': return 3;
      case 'socrates': return 4;
      case 'ocr': return 5;
      case 'summary': return 6;
      default: return 1;
    }
  };

  return (
    <div
      onClick={resetActivityTimer}
      className="w-full max-w-5xl mx-auto space-y-6 text-slate-100 my-2 relative font-sans"
    >
      {/* Visual Accent Glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-2xl h-32 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>

      {/* Main Kiosk Container Card */}
      <div className="relative bg-[#090d1f]/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-tr from-teal-500 to-cyan-400 rounded-2xl shadow-lg shadow-teal-500/20 text-slate-950 font-bold">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-black bg-gradient-to-r from-teal-300 via-cyan-200 to-white bg-clip-text text-transparent">
                  Aethera Clinical Intake
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Kiosk Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Self-service conversational intake, document OCR & instant doctor screen routing
              </p>
            </div>
          </div>

          {/* Quick Language & Medical Mode Selectors */}
          <div className="flex items-center space-x-3 self-stretch sm:self-auto justify-end">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                  language === 'hi' ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>हिंदी</span>
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                  language === 'en' ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>English</span>
              </button>
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setMode('allopathy')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'allopathy' ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Modern
              </button>
              <button
                onClick={() => setMode('ayush')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'ayush' ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                AYUSH
              </button>
            </div>
          </div>
        </div>

        {/* Multi-Step Workflow Visual Progress Bar */}
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium">
          {[
            { id: 1, name: language === 'hi' ? '1. ABHA पहचान' : '1. Identify', key: 'welcome' },
            { id: 2, name: language === 'hi' ? '2. DPDP सहमति' : '2. Consent', key: 'consent' },
            { id: 3, name: language === 'hi' ? '3. लक्षण बातचीत' : '3. Conversational', key: 'cc' },
            { id: 4, name: language === 'hi' ? '4. डॉक्टर प्रश्न' : '4. History', key: 'socrates' },
            { id: 5, name: language === 'hi' ? '5. पर्चा अपलोड' : '5. Document OCR', key: 'ocr' }
          ].map((item) => {
            const currentIdx = getStepIndex();
            const isActive = item.id === currentIdx || (currentIdx === 6 && item.id === 5);
            const isCompleted = item.id < currentIdx;
            return (
              <div key={item.id} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-400 to-cyan-400 shadow-md shadow-teal-500/30'
                      : isCompleted
                      ? 'bg-teal-500/40'
                      : 'bg-slate-800'
                  }`}
                />
                <span className={`block truncate text-[11px] font-semibold ${isActive ? 'text-teal-300 font-bold' : isCompleted ? 'text-slate-300' : 'text-slate-600'}`}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ephemeral Wipe Notice */}
        {wipeNotice && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{wipeNotice}</span>
          </div>
        )}

        {/* Red Flags Triage Banner */}
        {redFlags.length > 0 && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-3 text-rose-300 animate-pulse shadow-lg shadow-rose-500/5">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-400" />
            <div className="text-sm">
              <span className="font-extrabold uppercase tracking-wide">PRIORITY EMERGENCY ALERT:</span> {redFlags.join(' | ')}
            </div>
          </div>
        )}

        {/* Active Session Status & Ephemeral Reset */}
        {sessionId && (
          <div className="flex flex-wrap items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-850 text-xs text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-teal-300 font-bold px-2 py-0.5 bg-slate-900 rounded-lg border border-slate-800">
                Session: {sessionId}
              </span>
              {abhaDetails && (
                <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 rounded-lg font-mono font-bold border border-teal-500/30">
                  ABHA: {abhaDetails.abhaId} ({abhaDetails.verificationStatus})
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1.5 text-slate-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Wipe: {inactivityTimer}s</span>
              </span>

              <button
                onClick={() => handleWipeSessionMemory('User manual memory wipe')}
                className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl flex items-center space-x-1.5 font-bold transition-all"
                title="Immediately Wipe Kiosk Session Data"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe Session</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: WELCOME & ABDM ABHA LOGIN */}
        {step === 'welcome' && (
          <div className="py-4 space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-teal-400 via-cyan-400 to-indigo-500 rounded-3xl flex items-center justify-center shadow-xl shadow-teal-500/20 p-4">
                <Sparkles className="w-10 h-10 text-slate-950" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white">
                {language === 'hi' ? 'नमस्कार! बिना कतार में लगे अपनी बीमारी रिकॉर्ड करें' : 'Self-Record Clinical History & Scan Docs'}
              </h3>
              <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                {language === 'hi'
                  ? 'ABDM ABHA आईडी दर्ज करें, अपनी पुरानी पर्ची फोटो खीचें और डॉक्टर के पास सीधा समरी भेजें।'
                  : 'Link your ABHA ID, speak your symptoms, scan paper lab reports & push summary directly to the doctor.'}
              </p>
            </div>

            {/* ABHA / Aadhaar Verification Card */}
            <div className="p-6 bg-slate-950/90 border border-slate-800 rounded-3xl space-y-5 max-w-xl mx-auto shadow-inner">
              <div className="flex items-center space-x-2 text-teal-300 font-bold text-sm">
                <Shield className="w-5 h-5 text-teal-400" />
                <span>Module D: ABDM ABHA / Aadhaar Identity Linkage</span>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">ABHA ID (14 Digits):</label>
                  <input
                    type="text"
                    value={inputAbhaId}
                    onChange={(e) => setInputAbhaId(e.target.value)}
                    placeholder="e.g. 91-2345-6789-0123"
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-teal-400 rounded-xl p-3 text-slate-200 focus:outline-none font-mono text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Aadhaar Number (Sandbox Verification):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputAadhaar}
                      onChange={(e) => setInputAadhaar(e.target.value)}
                      placeholder="12-digit Aadhaar"
                      className="flex-1 bg-slate-900/80 border border-slate-800 focus:border-teal-400 rounded-xl p-3 text-slate-200 focus:outline-none font-mono text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSendAadhaarOtp}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-teal-300 font-bold border border-slate-700 rounded-xl text-xs transition-colors"
                    >
                      Send OTP
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl space-y-2 animate-in fade-in">
                    <span className="text-teal-300 font-bold block">Aadhaar Sandbox OTP Verified:</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aadhaarOtp}
                        onChange={(e) => setAadhaarOtp(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono text-center tracking-widest text-sm"
                      />
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" /> Verified
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
                className="px-10 py-4 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 hover:brightness-110 text-slate-950 font-black rounded-2xl shadow-xl shadow-teal-500/20 transition-all text-base flex items-center space-x-3 mx-auto"
              >
                <span>{loading ? 'Initializing Session...' : language === 'hi' ? 'शुरू करें (Start Clinical Intake)' : 'Start Intake Session'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DPDP ACT GRANULAR CONSENT */}
        {step === 'consent' && (
          <div className="py-4 space-y-6 animate-in fade-in duration-300">
            <div className="p-6 bg-slate-950/80 border border-slate-850 rounded-3xl space-y-6">
              <div className="flex items-center justify-between text-teal-300">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-7 h-7 text-teal-400" />
                  <h4 className="font-extrabold text-lg">Module D: DPDP Act 2023 Granular Data Consent</h4>
                </div>
                <span className="px-3 py-1 bg-teal-500/20 text-teal-300 text-xs font-mono font-bold rounded-xl border border-teal-500/30">
                  DPDP-2023 Framework
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Under the Digital Personal Data Protection (DPDP) Act 2023 & ABDM framework, specify your data permissions. Audio explanations are enabled for low-literacy users.
              </p>

              {/* Granular Toggles */}
              <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-xs">
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-900 transition-colors">
                  <span className="text-slate-200 font-semibold">1. Share Clinical History & Voice Responses with Doctor</span>
                  <input
                    type="checkbox"
                    checked={shareHistory}
                    onChange={(e) => setShareHistory(e.target.checked)}
                    className="w-5 h-5 accent-teal-400"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-900 transition-colors">
                  <span className="text-slate-200 font-semibold">2. Share Scanned Prescriptions & Digitized Lab Timeline</span>
                  <input
                    type="checkbox"
                    checked={shareScannedDocs}
                    onChange={(e) => setShareScannedDocs(e.target.checked)}
                    className="w-5 h-5 accent-teal-400"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-900 transition-colors">
                  <span className="text-slate-200 font-semibold">3. Allow Anonymous Quality Improvement Analytics</span>
                  <input
                    type="checkbox"
                    checked={shareAnalytics}
                    onChange={(e) => setShareAnalytics(e.target.checked)}
                    className="w-5 h-5 accent-teal-400"
                  />
                </label>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between px-2">
                  <span className="text-slate-400 font-semibold">Doctor Consent Access Expiry:</span>
                  <select
                    value={accessDurationHours}
                    onChange={(e) => setAccessDurationHours(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200 text-xs focus:outline-none"
                  >
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours (Default)</option>
                    <option value={48}>48 Hours</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <Volume2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>Spoken audio prompt active in {language === 'hi' ? 'Hindi (हिंदी)' : 'English'}. Session wipes automatically upon completion.</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGiveConsent}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 text-slate-950 font-black rounded-xl hover:brightness-110 transition-all text-sm flex items-center space-x-2 shadow-lg"
              >
                <span>{loading ? 'Processing...' : language === 'hi' ? 'सहमति दें (Record Consent)' : 'Confirm DPDP Consent'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONVERSATIONAL HISTORY ENGINE (VOICE + TOUCH) */}
        {step === 'cc' && (
          <div className="py-4 space-y-6 animate-in fade-in duration-300">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>{language === 'hi' ? 'अपनी बीमारी / मुख्य लक्षण बताएं:' : 'Describe your primary complaint or symptoms:'}</span>
                <span className="text-xs text-teal-300 flex items-center space-x-1 font-semibold">
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice & Multi-lingual Active</span>
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
                      ? 'उदा: 2 दिनों से सीने में तेज दर्द और सांस फूलना (Chest pain for 2 days)...'
                      : 'e.g. Sharp chest pain for 2 days radiating to left arm...'
                  }
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                />
                <button
                  onClick={toggleVoiceInput}
                  className={`absolute right-3 bottom-3 p-3.5 rounded-xl transition-all ${
                    isListening ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' : 'bg-slate-900 border border-slate-800 text-teal-400 hover:bg-slate-800'
                  }`}
                  title="Speak in Hindi / English / Regional Language"
                >
                  {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Quick Touch Button Grid for Rural / Elderly Users */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-semibold">Icon-Driven Fast-Touch Selector (Low-Literacy Friendly):</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { title: 'सीने में दर्द (Chest Pain)', en: 'Chest Pain' },
                  { title: 'बुखार और खांसी (Fever & Cough)', en: 'Fever & Cough' },
                  { title: 'सांस लेने में तकलीफ (Shortness of Breath)', en: 'Shortness of Breath' },
                  { title: 'पेट दर्द (Abdominal Pain)', en: 'Abdominal Pain' },
                  { title: 'सिरदर्द व चक्कर (Headache & Giddiness)', en: 'Severe Headache' },
                  { title: 'शुगर / बीपी चेक (Diabetes / BP Check)', en: 'Diabetes Checkup' }
                ].map((sym) => (
                  <button
                    key={sym.en}
                    onClick={() => {
                      resetActivityTimer();
                      setChiefComplaint(sym.title);
                    }}
                    className="p-3 bg-slate-950 hover:bg-teal-500/10 hover:border-teal-500/40 border border-slate-850 rounded-xl text-left transition-all"
                  >
                    <span className="text-xs font-bold text-slate-200 block truncate">{sym.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmitChiefComplaint}
                disabled={loading || !chiefComplaint.trim()}
                className="px-8 py-3 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 text-slate-950 font-black rounded-xl disabled:opacity-50 text-sm flex items-center space-x-2 shadow-lg"
              >
                <span>{loading ? 'Evaluating Symptoms...' : language === 'hi' ? 'अगला सवाल (Next Question)' : 'Evaluate SOCRATES'}</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: ADAPTIVE QUESTIONING (SOCRATES / AYUSH) */}
        {step === 'socrates' && (
          <div className="py-4 space-y-6 animate-in fade-in duration-300">
            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-teal-400 font-black">
                {mode === 'ayush' ? 'AYUSH Dashavidha Pariksha Intake' : 'SOCRATES Adaptive Clinical History Engine'}
              </span>
              <h4 className="text-base font-bold text-slate-100">Patient Complaint: "{chiefComplaint}"</h4>
            </div>

            <div className="space-y-4">
              {adaptiveQuestions.map((q) => (
                <div key={q.id} className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                  <label className="text-sm font-bold text-slate-200 block">{q.question}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          resetActivityTimer();
                          setSocratesAnswers({ ...socratesAnswers, [q.id]: opt });
                        }}
                        className={`p-3 text-xs font-bold rounded-xl border text-center transition-all ${
                          socratesAnswers[q.id] === opt
                            ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 border-teal-300 shadow-md font-extrabold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <button
                onClick={() => setStep('ocr')}
                className="w-full sm:w-auto px-5 py-3 bg-slate-950 hover:bg-slate-900 text-teal-300 border border-teal-500/30 font-bold rounded-xl text-xs flex items-center justify-center space-x-2"
              >
                <Upload className="w-4 h-4 text-teal-400" />
                <span>Upload Old Prescriptions / Lab Docs (Module B)</span>
              </button>

              <button
                onClick={handleCompleteIntake}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:brightness-110"
              >
                {loading ? 'Synthesizing Summary...' : 'Push to Doctor Screen'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: MEDICAL DOCUMENT DIGITIZATION (OCR) */}
        {step === 'ocr' && (
          <div className="py-4 space-y-6 animate-in fade-in duration-300">
            <div className="p-5 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3 text-teal-300">
                <FileText className="w-6 h-6 text-teal-400" />
                <div>
                  <h4 className="font-bold text-base">Module B: Medical Document Digitization Pipeline</h4>
                  <p className="text-xs text-slate-400">OCR on Handwritten Prescriptions & Lab Values with Reference Ranges</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-xl text-xs font-mono font-bold border border-teal-500/30">
                Docling OCR
              </span>
            </div>

            <div className="p-6 bg-slate-950 border border-slate-850 rounded-3xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Document Category:</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none"
                  >
                    <option value="Lab Report">Lab Report (HbA1c, Metabolic Panel)</option>
                    <option value="Prescription">Paper Prescription (Handwritten/Printed)</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Document Filename:</label>
                  <input
                    type="text"
                    value={docFileName}
                    onChange={(e) => setDocFileName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">
                  Multi-Page OCR Input Stream / Raw Text Content:
                </label>
                <textarea
                  value={ocrInputText}
                  onChange={(e) => {
                    resetActivityTimer();
                    setOcrText(e.target.value);
                  }}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setOcrText('Page 1: Prescription Metformin 500mg BD\n--- NEXT PAGE ---\nPage 2: HbA1c 8.4% High, Creatinine 1.5 High')}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-teal-300"
                >
                  Load Sample Lab (HbA1c &gt; 8.0%)
                </button>

                <button
                  onClick={handleRunOcrDigitization}
                  disabled={digitizing}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-2 shadow-lg disabled:opacity-50"
                >
                  <Upload className={`w-4 h-4 ${digitizing ? 'animate-bounce' : ''}`} />
                  <span>{digitizing ? 'Parsing OCR...' : 'Digitize & Parse Document'}</span>
                </button>
              </div>
            </div>

            {/* Render Digitized Artifacts */}
            {scannedDocs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-teal-400" />
                  <span>Parsed Document Artifacts ({scannedDocs.length})</span>
                </h4>
                {scannedDocs.map((doc, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 border border-teal-500/30 rounded-2xl space-y-3 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="font-bold text-teal-300">{doc.fileName} ({doc.docType})</span>
                      <span className="text-slate-500 font-mono">{doc.id}</span>
                    </div>

                    {doc.abnormalLabFlags && doc.abnormalLabFlags.length > 0 && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 font-medium">
                        ⚠️ High Alert: {doc.abnormalLabFlags.join(', ')}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="p-2.5 bg-slate-900 rounded-xl">
                        <span className="text-slate-400 font-bold block mb-1">Diagnosis:</span>
                        <span className="text-teal-300">{doc.extractedDiagnosis || 'None'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl">
                        <span className="text-slate-400 font-bold block mb-1">Medications:</span>
                        <span className="text-slate-200">{doc.extractedMedications?.map((m: any) => m.name).join(', ') || 'None'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl">
                        <span className="text-slate-400 font-bold block mb-1">Labs:</span>
                        <span className="text-slate-200">{doc.extractedLabValues?.map((l: any) => `${l.test}: ${l.result}`).join(', ') || 'None'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setStep('socrates')}
                className="px-5 py-2.5 bg-slate-900 text-slate-300 font-bold rounded-xl text-xs"
              >
                Back to Questions
              </button>

              <button
                onClick={handleCompleteIntake}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 text-slate-950 font-black rounded-xl text-sm shadow-lg"
              >
                {loading ? 'Generating Doctor Summary...' : 'Submit to Doctor Portal'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: MODULE C - BILINGUAL DRAFT SUMMARY FOR DOCTOR */}
        {step === 'summary' && doctorSummary && (
          <div className="py-4 space-y-6 animate-in fade-in duration-300">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-emerald-300">
              <div className="flex items-center space-x-2 text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Intake Complete! Structured Clinical Summary Pushed to Doctor Workspace</span>
              </div>
            </div>

            <div className="p-6 bg-slate-950 border border-slate-850 rounded-3xl space-y-5">
              <h4 className="text-xs uppercase tracking-wider text-teal-300 font-black flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-teal-400" />
                  <span>Structured SOAP Summary (Chief Complaint → HPI → Past Medical → ROS → Investigations)</span>
                </span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-850">
                  <span className="text-teal-400 font-bold block mb-1">1. Chief Complaint:</span>
                  <p className="text-slate-200">{doctorSummary.structuredSOAP.chiefComplaint}</p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-850">
                  <span className="text-teal-400 font-bold block mb-1">2. HPI (SOCRATES):</span>
                  <p className="text-slate-200">{doctorSummary.structuredSOAP.historyOfPresentIllness}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-850">
                    <span className="text-teal-400 font-bold block mb-1">3. Past History:</span>
                    <p className="text-slate-200">{doctorSummary.structuredSOAP.pastMedicalHistory || 'None reported'}</p>
                    <p className="text-rose-400 font-semibold mt-1">Allergies: {doctorSummary.structuredSOAP.allergies || 'NKDA'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-850">
                    <span className="text-teal-400 font-bold block mb-1">4. Review of Systems:</span>
                    <p className="text-slate-200">{doctorSummary.structuredSOAP.reviewOfSystems || 'Negative except CC'}</p>
                  </div>
                </div>
              </div>

              {/* Spoken Audio Banner */}
              <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-teal-300 font-bold">
                  <span className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-teal-400" />
                    <span>Localized Spoken Confirmation (Hindi / Local dialect):</span>
                  </span>
                </div>
                <p className="text-slate-200 italic p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  "{doctorSummary.bilingualAudioConfirmation.patientAudioText}"
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => handleWipeSessionMemory('Intake completed & memory purged.')}
                className="px-8 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-black rounded-xl text-xs border border-rose-500/30 transition-all flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Wipe Session Memory & Reset Kiosk</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
