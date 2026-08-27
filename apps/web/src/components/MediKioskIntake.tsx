import React, { useState } from 'react';
import { Mic, MicOff, AlertTriangle, ShieldCheck, Heart, Sparkles, Send, Volume2, Globe, Stethoscope } from 'lucide-react';

export const MediKioskIntake: React.FC = () => {
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [mode, setMode] = useState<'allopathy' | 'ayush'>('allopathy');
  const [isListening, setIsListening] = useState(false);
  const [step, setStep] = useState<'welcome' | 'consent' | 'cc' | 'socrates' | 'summary'>('welcome');
  const [sessionId, setSessionId] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<Array<{ id: string; question: string; options: string[] }>>([]);
  const [socratesAnswers, setSocratesAnswers] = useState<Record<string, string>>({});
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorSummary, setDoctorSummary] = useState<any>(null);

  // Start Session
  const handleStartSession = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/medikiosk/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, mode })
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setStep('consent');
      }
    } catch (err) {
      console.error('Error starting session:', err);
    } finally {
      setLoading(false);
    }
  };

  // Give Consent
  const handleGiveConsent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/medikiosk/session/${sessionId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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

  // Submit Chief Complaint & Get Adaptive Questions
  const handleSubmitChiefComplaint = async () => {
    if (!chiefComplaint.trim()) return;
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

  // Submit Socrates Answers & Get Summary
  const handleCompleteIntake = async () => {
    setLoading(true);
    try {
      // Save answers
      await fetch(`http://localhost:5000/api/v1/medikiosk/session/${sessionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chiefComplaint, socrates: socratesAnswers })
      });

      // Get summary
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
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-2xl my-4">
      {/* Kiosk Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              MediKiosk • Module A Intake Engine
            </h2>
            <p className="text-xs text-slate-400">Conversational Voice & Touch Pre-Consultation History Engine</p>
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

      {/* Red Flags Alert Header */}
      {redFlags.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-3 text-rose-300 animate-pulse">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-400" />
          <div className="text-sm">
            <span className="font-bold">TRIAGE ALERT DETECTED:</span> {redFlags.join(' | ')}
          </div>
        </div>
      )}

      {/* Step 1: Welcome & Mode Selection */}
      {step === 'welcome' && (
        <div className="py-10 text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Sparkles className="w-10 h-10 text-slate-950" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold">
              {language === 'hi' ? 'नमस्कार! कृपया अपनी स्वास्थ्य जानकारी दर्ज करें' : 'Welcome! Self-record your history'}
            </h3>
            <p className="text-sm text-slate-400">
              {language === 'hi'
                ? 'डॉक्टर से परामर्श करने से पहले अपनी परेशानी बोलकर या छूकर बताएं।'
                : 'Speak or tap answers to push a pre-consultation summary directly to your doctor.'}
            </p>
          </div>
          <button
            onClick={handleStartSession}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg hover:brightness-110 transition-all text-sm"
          >
            {loading ? 'Initializing Session...' : language === 'hi' ? 'शुरू करें (Start Intake)' : 'Start Intake Session'}
          </button>
        </div>
      )}

      {/* Step 2: DPDP & ABDM Audio Consent */}
      {step === 'consent' && (
        <div className="py-8 space-y-6">
          <div className="p-6 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-4">
            <div className="flex items-center space-x-3 text-teal-400">
              <ShieldCheck className="w-6 h-6" />
              <h4 className="font-bold text-lg">DPDP Act 2023 & ABDM Consent Prompt</h4>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {language === 'hi'
                ? 'क्या आप अपने स्वास्थ्य इतिहास और पुराने पर्चों की जानकारी डॉक्टर के साथ सुरक्षित रूप से साझा करने की सहमति देते हैं?'
                : 'Do you consent to securely recording and sharing your clinical history and uploaded documents with your treating doctor under ABDM frameworks?'}
            </p>
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
              {loading ? 'Processing...' : language === 'hi' ? 'सहमति देता हूँ (I Agree)' : 'I Consent & Accept'}
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
                onChange={(e) => setChiefComplaint(e.target.value)}
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
                  onClick={() => setChiefComplaint(sym)}
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
                      onClick={() => setSocratesAnswers({ ...socratesAnswers, [q.id]: opt })}
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

          <div className="flex justify-end">
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

      {/* Step 5: Draft Summary View */}
      {step === 'summary' && doctorSummary && (
        <div className="py-6 space-y-6">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-300">
            <div className="flex items-center space-x-2 text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Intake Complete! Pre-consultation summary sent to Doctor Workspace.</span>
            </div>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
            <h4 className="text-sm uppercase tracking-wider text-teal-400 font-bold flex items-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>Generated Pre-Consultation SOAP Draft</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Chief Complaint:</span>
                <p className="text-slate-200">{doctorSummary.structuredSOAP.chiefComplaint}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">History of Present Illness (HPI):</span>
                <p className="text-slate-200">{doctorSummary.structuredSOAP.historyOfPresentIllness}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1 text-xs">
              <span className="text-teal-400 font-semibold block">Patient Local Language Confirmation:</span>
              <p className="text-slate-300 italic">{doctorSummary.bilingualAudioConfirmation.patientAudioText}</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setStep('welcome');
                setChiefComplaint('');
                setSocratesAnswers({});
                setDoctorSummary(null);
                setRedFlags([]);
              }}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
            >
              Start New Patient Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
