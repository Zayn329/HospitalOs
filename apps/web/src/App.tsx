import { useState, useEffect } from 'react';
import { Shield, Sparkles, LogOut, Stethoscope, User } from 'lucide-react';
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
  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Streamlined Navigation: Toggle between Patient Intake Kiosk & Doctor Consultation Portal
  const [activeTab, setActiveTab] = useState<'intake' | 'doctor'>('intake');

  // Diagnostics State
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

  // Restore session
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

  // View 1: Logged Out (Login view)
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-teal-500 selection:text-white">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // View 2: Logged In (Streamlined Aethera Intake & Doctor Portal)
  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col p-4 md:p-6 relative selection:bg-teal-500 selection:text-white font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto z-10 flex-1 flex flex-col justify-between">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 pb-5 border-b border-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-teal-500 via-cyan-500 to-indigo-600 rounded-xl shadow-lg shadow-teal-500/10">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-white bg-clip-text text-transparent">
                  Aethera
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 border border-teal-500/20 text-teal-400">
                  AI Clinical Intake Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Pre-consultation clinical history, document scanning & triage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Streamlined View Switcher (Intake Kiosk vs Doctor View) */}
            <div className="flex bg-slate-950 border border-slate-850 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setActiveTab('intake')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'intake'
                    ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 border border-teal-500/30 shadow'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <User className="w-4 h-4 text-teal-400" />
                Patient Intake Kiosk
              </button>
              <button
                onClick={() => setActiveTab('doctor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'doctor'
                    ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-cyan-400" />
                Doctor Workspace
              </button>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* View 1: Patient Intake Kiosk */}
        {activeTab === 'intake' && (
          <div className="animate-in fade-in duration-200 flex-1">
            <MediKioskIntake />
          </div>
        )}

        {/* View 2: Doctor Portal Workspace */}
        {activeTab === 'doctor' && (
          <div className="animate-in fade-in duration-200 flex-1">
            <DoctorWorkspace />
          </div>
        )}

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 mt-10 py-4 border-t border-slate-900/60 gap-2">
          <p>Aethera - AI Clinical Intake Platform • DPDP Act 2023 & ABDM FHIR Compliant</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API Status: {health?.status === 'UP' ? 'Operational' : 'Partial Outage'}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
