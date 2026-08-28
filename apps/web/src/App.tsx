import { useState, useEffect } from 'react';
import {
  Shield, Sparkles, LogOut, Stethoscope, User, Activity, Heart,
  CheckCircle2, Lock, HelpCircle, ArrowUpRight
} from 'lucide-react';
import Login from './components/Login.tsx';
import DoctorWorkspace from './components/DoctorWorkspace.tsx';
import { MediKioskIntake } from './components/MediKioskIntake.tsx';

interface HealthDetails {
  api: 'UP' | 'DOWN';
  mongodb: 'UP' | 'DOWN';
  aiService: 'UP' | 'DOWN';
  aiServiceError: string | null;
}

interface HealthResponse {
  status: 'UP' | 'DOWN';
  timestamp: string;
  details: HealthDetails;
}

interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Active view toggle: Intake Kiosk vs Doctor Workspace vs Platform Showcase
  const [activeTab, setActiveTab] = useState<'intake' | 'doctor' | 'overview'>('intake');
  const [purposeSpecialty, setPurposeSpecialty] = useState<'cardiology' | 'endocrinology'>('cardiology');

  const [health, setHealth] = useState<HealthResponse | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        details: {
          api: 'DOWN',
          mongodb: 'DOWN',
          aiService: 'DOWN',
          aiServiceError: 'Express API Unreachable'
        }
      });
    }
  };

  const handleLoginSuccess = (userProfile: UserProfile, jwtToken: string) => {
    setUser(userProfile);
    setToken(jwtToken);
    localStorage.setItem('aethera_user', JSON.stringify(userProfile));
    localStorage.setItem('aethera_token', jwtToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('aethera_user');
    localStorage.removeItem('aethera_token');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('aethera_user');
    const savedToken = localStorage.getItem('aethera_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-teal-500 selection:text-white">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col p-4 md:p-6 relative selection:bg-teal-500 selection:text-white font-sans">
      {/* Background radial glows matching Aethera branding */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto z-10 flex-1 flex flex-col justify-between space-y-8">
        {/* Top Navbar */}
        <header className="flex flex-col sm:flex-row justify-between items-center pb-5 border-b border-slate-850/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-teal-400 via-cyan-400 to-indigo-500 rounded-2xl shadow-xl shadow-teal-500/10 text-slate-950">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-white bg-clip-text text-transparent">
                  AETHERA
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  AI Clinical Intake Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Sovereign clinical data operating fabric & self-service history intake
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <div className="flex bg-slate-950/90 border border-slate-800 rounded-2xl p-1 shadow-inner">
              <button
                onClick={() => setActiveTab('intake')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'intake'
                    ? 'bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                Patient Intake Kiosk
              </button>
              <button
                onClick={() => setActiveTab('doctor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'doctor'
                    ? 'bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Doctor Workspace
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-4 h-4" />
                Platform Overview
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Hero Banner (Matching aetheraa.vercel.app aesthetic) */}
        <div className="relative bg-gradient-to-r from-slate-950 via-[#090d1f] to-slate-950 border border-slate-850 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-extrabold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>YOUR HEALTH, CONNECTED</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white">
                Every report. Every prescription. One intelligent profile.
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aethera transforms paper documents and conversational voice history into structured clinical intelligence before consultation.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-center">
                <span className="text-xl font-black text-teal-300">98.4</span>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Health Score</span>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-center">
                <span className="text-xl font-black text-cyan-300">100%</span>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Traceable OCR</span>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-center">
                <span className="text-xl font-black text-emerald-300">DPDP</span>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Consent Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: PATIENT INTAKE KIOSK */}
        {activeTab === 'intake' && (
          <div className="animate-in fade-in duration-300">
            <MediKioskIntake />
          </div>
        )}

        {/* TAB 2: DOCTOR WORKSPACE */}
        {activeTab === 'doctor' && (
          <div className="animate-in fade-in duration-300">
            <DoctorWorkspace />
          </div>
        )}

        {/* TAB 3: PLATFORM OVERVIEW (Matching aetheraa.vercel.app Feature Sections) */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Feature Transformation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-950/80 border border-slate-850 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">From: Static Medical Records</span>
                  <span className="text-xs font-bold text-teal-400 flex items-center gap-1">To: Living Intelligence <ArrowUpRight className="w-4 h-4" /></span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Raw medical documents, lab PDFs, and handwritten prescriptions are automatically extracted into structured clinical intelligence available anytime.
                </p>
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-mono text-teal-300 flex items-center justify-between">
                  <span>Docling OCR + Groq LLM Extraction</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              <div className="p-6 bg-slate-950/80 border border-slate-850 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">From: Full Records Request</span>
                  <span className="text-xs font-bold text-teal-400 flex items-center gap-1">To: Purpose-Specific Sharing <ArrowUpRight className="w-4 h-4" /></span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Eliminate data over-sharing. Only purpose-specific medical parameters requested by authorized healthcare providers are retrieved.
                </p>
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-mono text-teal-300 flex items-center justify-between">
                  <span>DPDP Act 2023 Granular Keys</span>
                  <Lock className="w-4 h-4 text-teal-400" />
                </div>
              </div>
            </div>

            {/* Interactive Purpose-Specific Sharing Showcase */}
            <div className="p-6 bg-slate-950/90 border border-slate-850 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-teal-400" />
                    Interactive Purpose-Specific Sharing Demonstration
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Select specialty request to view authorized data vs redacted private data</p>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setPurposeSpecialty('cardiology')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      purposeSpecialty === 'cardiology' ? 'bg-teal-500 text-slate-950 font-extrabold shadow' : 'text-slate-400'
                    }`}
                  >
                    Cardiology Request
                  </button>
                  <button
                    onClick={() => setPurposeSpecialty('endocrinology')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      purposeSpecialty === 'endocrinology' ? 'bg-cyan-500 text-slate-950 font-extrabold shadow' : 'text-slate-400'
                    }`}
                  >
                    Endocrinology Request
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Authorized Data Shared */}
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/30 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                    <CheckCircle2 className="w-4 h-4" /> Authorized Data Shared ({purposeSpecialty})
                  </span>
                  <div className="space-y-2 text-xs">
                    {purposeSpecialty === 'cardiology' ? (
                      <>
                        <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between font-mono"><span>Blood Pressure History</span><span className="text-emerald-300 font-bold">120/80 mmHg</span></div>
                        <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between font-mono"><span>Lipid Panel / Cholesterol</span><span className="text-emerald-300 font-bold">185 mg/dL</span></div>
                        <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between font-mono"><span>ECG Diagnostic Trace</span><span className="text-emerald-300 font-bold">Normal Sinus</span></div>
                      </>
                    ) : (
                      <>
                        <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between font-mono"><span>HbA1c Blood Test</span><span className="text-emerald-300 font-bold">8.4% (Elevated)</span></div>
                        <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between font-mono"><span>Fasting Plasma Glucose</span><span className="text-emerald-300 font-bold">142 mg/dL</span></div>
                        <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between font-mono"><span>Diabetes Medications</span><span className="text-emerald-300 font-bold">Metformin 500mg</span></div>
                      </>
                    )}
                  </div>
                </div>

                {/* Private Medical Data Protected */}
                <div className="p-5 bg-rose-500/5 border border-rose-500/30 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase">
                    <Lock className="w-4 h-4" /> Private Medical Data Protected (Redacted)
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-900/60 rounded-xl flex justify-between font-mono text-slate-500"><span>Unrelated Prescriptions</span><span className="text-rose-400 font-bold">[REDACTED]</span></div>
                    <div className="p-2.5 bg-slate-900/60 rounded-xl flex justify-between font-mono text-slate-500"><span>Unrelated Surgical Notes</span><span className="text-rose-400 font-bold">[REDACTED]</span></div>
                    <div className="p-2.5 bg-slate-900/60 rounded-xl flex justify-between font-mono text-slate-500"><span>Full PDF Document Archive</span><span className="text-rose-400 font-bold">[REDACTED]</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Trust FAQ Section */}
            <div className="p-6 bg-slate-950/80 border border-slate-850 rounded-3xl space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-teal-400" />
                Security & Architecture FAQs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="font-bold text-teal-300 block">How does Aethera enforce DPDP & ABDM compliance?</span>
                  <p className="text-slate-400 leading-relaxed">
                    Aethera decouples Personal Identifying Information (PII) from clinical parameters. Granular consent keys ensure patients maintain total control.
                  </p>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="font-bold text-teal-300 block">How are documents converted into structured intelligence?</span>
                  <p className="text-slate-400 leading-relaxed">
                    Docling OCR extracts text from multi-page PDFs or photos, while Groq LLM synthesizes structured SOAP summaries with abnormal lab flags.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer (Matching aetheraa.vercel.app footer statement) */}
        <footer className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 py-6 border-t border-slate-850/80 gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <p>© 2026 Aethera Technologies. Sovereign clinical data operating fabric.</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400">
            <span>DPDP Act 2023 Compliant</span>
            <span>ABDM FHIR Standards</span>
            <span>API: {health?.status === 'UP' ? 'Operational' : 'Fallback Mode'}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
