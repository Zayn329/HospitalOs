import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, RefreshCw, Cpu, Database, Activity, Terminal, UserPlus, Users, LogOut, Key, Calendar, FileText, CreditCard } from 'lucide-react';
import PatientRegistration from './components/PatientRegistration.tsx';
import Login from './components/Login.tsx';
import AppointmentManagement from './components/AppointmentManagement.tsx';
import PatientCheckin from './components/PatientCheckin.tsx';
import PatientTriage from './components/PatientTriage.tsx';
import DoctorWorkspace from './components/DoctorWorkspace.tsx';
import MedicalDocumentation from './components/MedicalDocumentation.tsx';
import DiagnosticsConsole from './components/DiagnosticsConsole.tsx';
import BillingConsole from './components/BillingConsole.tsx';
import DischargeWorkspace from './components/DischargeWorkspace.tsx';
import HospitalAnalytics from './components/HospitalAnalytics.tsx';
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

interface Patient {
  hospitalId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  status: string;
  createdAt: string;
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

  // Navigation State
  const [activeTab, setActiveTab] = useState<'health' | 'registration' | 'appointments' | 'checkin' | 'triage' | 'consultation' | 'documentation' | 'diagnostics' | 'billing' | 'discharge' | 'analytics' | 'medikiosk'>('medikiosk');

  // Diagnostics State
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentPayload, setAgentPayload] = useState<any>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // RBAC Admin endpoint testing state
  const [adminResult, setAdminResult] = useState<any>(null);
  const [adminTesting, setAdminTesting] = useState(false);

  // Patients list state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const addLog = (msg: string) => {
    setConsoleLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const fetchHealth = async () => {
    setError(null);
    addLog("Polling Express API health status...");
    try {
      const res = await fetch('http://localhost:5000/api/v1/health');
      const data = await res.json();
      setHealth(data);
      if (data.status === 'UP') {
        addLog("System Health Check: ALL SYSTEMS OPERATIONAL");
      } else {
        addLog(`System Health Check: PARTIAL OUTAGE (DB: ${data.details.mongodb}, AI: ${data.details.aiService})`);
      }
    } catch (err) {
      setError("Cannot reach Express API server at http://localhost:5000");
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
      addLog("System Health Check: API SERVER UNREACHABLE");
    }
  };

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/patients');
      const result = await res.json();
      if (result.success) {
        setPatients(result.data);
      }
    } catch (err) {
      console.error("Failed to load patients list", err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const testAIService = async () => {
    setAgentRunning(true);
    addLog("Sending payload through Express backend to FastAPI AI Agent service...");
    try {
      const response = await fetch('http://localhost:5000/api/v1/health');
      if (!response.ok && response.status !== 503) {
        throw new Error("Express backend is offline");
      }
      
      addLog("Validating connection to FastAPI /api/v1/agent/run...");
      
      const payload = {
        test: true,
        message: "Scaffolding connection validation",
        timestamp: new Date().toISOString()
      };
      
      const aiResponse = await fetch('http://localhost:8000/api/v1/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!aiResponse.ok) {
        throw new Error(`AI service returned HTTP ${aiResponse.status}`);
      }
      
      const result = await aiResponse.json();
      setAgentPayload(result);
      addLog("Successfully completed round-trip to FastAPI AI Service!");
    } catch (err) {
      addLog(`AI service integration test failed: ${(err as Error).message}`);
      setAgentPayload({ error: (err as Error).message });
    } finally {
      setAgentRunning(false);
    }
  };

  const testAdminRestricted = async () => {
    if (!token) return;
    setAdminTesting(true);
    setAdminResult(null);
    addLog(`Invoking Admin-restricted API (authenticated as ${user?.role})...`);
    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/debug-restricted', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      setAdminResult(result);
      
      if (response.status === 200) {
        addLog("Access check: SUCCESS (Admin permission validated!)");
      } else if (response.status === 403) {
        addLog("Access check: BLOCKED (403 Forbidden - RBAC enforced!)");
      } else {
        addLog(`Access check: FAILED with status ${response.status}`);
      }
    } catch (err) {
      addLog(`Restricted test failed: ${(err as Error).message}`);
    } finally {
      setAdminTesting(false);
    }
  };

  const handleLoginSuccess = (userProfile: UserProfile, jwtToken: string) => {
    setUser(userProfile);
    setToken(jwtToken);
    localStorage.setItem('hospitalos_user', JSON.stringify(userProfile));
    localStorage.setItem('hospitalos_token', jwtToken);
    addLog(`User authenticated successfully: ${userProfile.firstName} (${userProfile.role})`);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hospitalos_user');
    localStorage.removeItem('hospitalos_token');
    addLog("Session closed. User signed out.");
  };

  // Restore session
  useEffect(() => {
    const savedUser = localStorage.getItem('hospitalos_user');
    const savedToken = localStorage.getItem('hospitalos_token');
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

  useEffect(() => {
    if (activeTab === 'registration' && token) {
      fetchPatients();
    }
  }, [activeTab, token]);

  // View 1: Logged Out (Login view)
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // View 2: Logged In (Dashboard portal)
  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col p-6 relative selection:bg-indigo-500 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto z-10 flex-1 flex flex-col justify-between">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 pb-6 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/10">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                HospitalOS
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-sky-400 font-medium uppercase tracking-wider">Internal Operating Portal</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-500 border border-slate-850">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 max-w-full overflow-x-auto">
            {/* Navigation Tabs */}
            <div className="flex bg-slate-950 border border-slate-850 rounded-xl p-1 overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'appointments' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <Calendar className="w-4 h-4" />
                Appointments
              </button>
              <button
                onClick={() => setActiveTab('registration')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'registration' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <UserPlus className="w-4 h-4" />
                Patient Registration
              </button>
              <button
                onClick={() => setActiveTab('checkin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'checkin' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <Users className="w-4 h-4" />
                Patient Check-In
              </button>
              <button
                onClick={() => setActiveTab('triage')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'triage' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <Activity className="w-4 h-4" />
                Patient Triage
              </button>
              <button
                onClick={() => setActiveTab('consultation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'consultation' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <Activity className="w-4 h-4" />
                Consultation Workspace
              </button>
              <button
                onClick={() => setActiveTab('documentation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'documentation' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <FileText className="w-4 h-4" />
                Medical Documentation
              </button>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'diagnostics' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <FileText className="w-4 h-4" />
                Diagnostics Console
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'billing' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <CreditCard className="w-4 h-4" />
                Billing Console
              </button>
              <button
                onClick={() => setActiveTab('discharge')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'discharge' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <LogOut className="w-4 h-4" />
                Patient Discharge
              </button>
              <button
                onClick={() => setActiveTab('medikiosk')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'medikiosk' ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <Cpu className="w-4 h-4 text-teal-400" />
                MediKiosk Intake
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <Activity className="w-4 h-4" />
                Hospital Analytics
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'health' ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                <Activity className="w-4 h-4" />
                System Diagnostics
              </button>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-sm font-medium transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Tab 1: Patient Registration */}
        {activeTab === 'registration' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <PatientRegistration />

            {/* List of patients */}
            <div className="glow-card rounded-3xl bg-slate-950/60 backdrop-blur-md border border-slate-900 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> Registered Patient Profiles
                </h3>
                <button
                  onClick={fetchPatients}
                  disabled={loadingPatients}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Reload list"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingPatients ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {patients.length === 0 ? (
                <div className="text-center py-12 text-slate-600 border border-dashed border-slate-900 rounded-2xl bg-slate-950/30">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  No patients registered in the system yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-900 rounded-2xl bg-slate-950/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-950 text-slate-400 text-xs font-semibold uppercase">
                        <th className="px-6 py-4">Hospital ID</th>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Gender</th>
                        <th className="px-6 py-4">Date of Birth</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-sm text-slate-300">
                      {patients.map((patient) => (
                        <tr key={patient.hospitalId} className="hover:bg-slate-900/20 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-sky-400">{patient.hospitalId}</td>
                          <td className="px-6 py-4 font-medium text-slate-200">{patient.firstName} {patient.lastName}</td>
                          <td className="px-6 py-4 capitalize">{patient.gender}</td>
                          <td className="px-6 py-4">{new Date(patient.dateOfBirth).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-mono">{patient.phone}</td>
                          <td className="px-6 py-4 text-slate-500">{new Date(patient.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1.5: Appointment Management */}
        {activeTab === 'appointments' && (
          <AppointmentManagement />
        )}

        {/* Tab 1.6: Patient Check-In */}
        {activeTab === 'checkin' && (
          <PatientCheckin />
        )}

        {/* Tab 1.7: Patient Triage */}
        {activeTab === 'triage' && (
          <PatientTriage />
        )}

        {/* Tab 1.8: Consultation Workspace */}
        {activeTab === 'consultation' && (
          <DoctorWorkspace />
        )}

        {/* Tab 1.9: Medical Documentation */}
        {activeTab === 'documentation' && (
          <MedicalDocumentation />
        )}

        {/* Tab 1.10: Diagnostics Console */}
        {activeTab === 'diagnostics' && (
          <DiagnosticsConsole />
        )}

        {/* Tab 1.11: Billing Console */}
        {activeTab === 'billing' && (
          <BillingConsole token={token} addLog={addLog} />
        )}

        {/* Tab 1.12: Patient Discharge */}
        {activeTab === 'discharge' && (
          <DischargeWorkspace token={token} addLog={addLog} />
        )}

        {/* Tab 1.13: MediKiosk Intake */}
        {activeTab === 'medikiosk' && (
          <MediKioskIntake />
        )}

        {/* Tab 1.14: Hospital Analytics */}
        {activeTab === 'analytics' && (
          <HospitalAnalytics />
        )}

        {/* Tab 2: System Diagnostics */}
        {activeTab === 'health' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Dashboard Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Express API card */}
              <div className="glow-card rounded-2xl p-6 bg-slate-950/60 backdrop-blur-md flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-slate-400">Express API</span>
                  <Activity className="w-5 h-5 text-sky-400" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Port 5000</p>
                    <p className="text-lg font-semibold mt-0.5">http://localhost:5000</p>
                  </div>
                  {health?.details.api === 'UP' ? (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> UP
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> DOWN
                    </span>
                  )}
                </div>
              </div>

              {/* MongoDB card */}
              <div className="glow-card rounded-2xl p-6 bg-slate-950/60 backdrop-blur-md flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-slate-400">MongoDB Connection</span>
                  <Database className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Mongoose Client</p>
                    <p className="text-lg font-semibold mt-0.5">Connected State</p>
                  </div>
                  {health?.details.mongodb === 'UP' ? (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> CONNECTED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> DOWN
                    </span>
                  )}
                </div>
              </div>

              {/* FastAPI AI Service card */}
              <div className="glow-card rounded-2xl p-6 bg-slate-950/60 backdrop-blur-md flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-slate-400">FastAPI AI Service</span>
                  <Cpu className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Port 8000</p>
                    <p className="text-lg font-semibold mt-0.5">http://localhost:8000</p>
                  </div>
                  {health?.details.aiService === 'UP' ? (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> UP
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> DOWN
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Test Integrations: AI & Admin-Restricted RBAC */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Box 1: FastAPI AI Agent */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" /> AI Connection Validator
                  </h2>
                  <p className="text-sm text-slate-400 mb-6">
                    Run a round-trip connection test. The frontend will trigger a request to the FastAPI AI service to verify CORS, middleware routing, and response capabilities.
                  </p>
                </div>
                <div>
                  <button
                    onClick={testAIService}
                    disabled={agentRunning}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/15 disabled:opacity-50"
                  >
                    {agentRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Testing AI Connection...
                      </>
                    ) : (
                      "Run AI Connection Test"
                    )}
                  </button>

                  {agentPayload && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">AI Response Payload</p>
                      <pre className="p-4 bg-slate-950 border border-slate-900 rounded-xl text-xs font-mono overflow-auto max-h-[140px] text-sky-400">
                        {JSON.stringify(agentPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: RBAC Validator */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" /> Role-Based Access (RBAC) Inspector
                  </h2>
                  <p className="text-sm text-slate-400 mb-6">
                    Test backend permission security. Receptionists should be blocked from administrator endpoints, while Administrators should pass successfully.
                  </p>
                </div>
                <div>
                  <button
                    onClick={testAdminRestricted}
                    disabled={adminTesting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-500/15 disabled:opacity-50"
                  >
                    {adminTesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Invoking Secure API...
                      </>
                    ) : (
                      `Verify Admin Authorization (${user.role})`
                    )}
                  </button>

                  {adminResult && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">API Response Status</span>
                        {adminResult.success ? (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            200 OK - GRANTED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/25">
                            403 FORBIDDEN - BLOCKED
                          </span>
                        )}
                      </div>
                      <pre className="p-4 bg-slate-950 border border-slate-900 rounded-xl text-xs font-mono overflow-auto max-h-[140px] text-emerald-400">
                        {JSON.stringify(adminResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Console / Log Terminal */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6 flex flex-col">
              <h2 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" /> Developer Log Terminal
              </h2>
              <p className="text-sm text-slate-400 mb-4">Real-time scaffolding activity log.</p>
              <div className="flex-1 min-h-[200px] bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-y-auto space-y-1.5 shadow-inner">
                {error && <div className="text-rose-400 font-bold">{error}</div>}
                {consoleLogs.map((log, idx) => (
                  <div key={idx} className={log.includes("operational") || log.includes("round-trip") || log.includes("SUCCESS") ? "text-emerald-400" : log.includes("OUTAGE") || log.includes("BLOCKED") ? "text-amber-400" : "text-slate-400"}>
                    {log}
                  </div>
                ))}
                {consoleLogs.length === 0 && <div className="text-slate-600">Console is idle. Status checks will print here.</div>}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 mt-12 py-4 border-t border-slate-900/60">
          HospitalOS Internal Portal • Connected to MongoDB and FastAPI AI Services.
        </footer>
      </div>
    </div>
  );
}
