import { useState, useEffect } from 'react';
import { BarChart3, Users, Calendar, AlertTriangle, DollarSign, TrendingUp, RefreshCw, Activity, ShieldAlert } from 'lucide-react';

interface DashboardMetrics {
  totalPatients: number;
  totalAppointments: number;
  activeConsultations: number;
  completedConsultations: number;
  financials: {
    totalRevenue: number;
    paidRevenue: number;
    unpaidCount: number;
  };
}

interface Bottleneck {
  stage: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
}

interface PatientFlow {
  waitingQueueCount: number;
  inProgressCount: number;
  emergencyPriorityCount: number;
  bottlenecks: Bottleneck[];
}

interface PerformanceReport {
  reportGeneratedAt: string;
  summary: {
    appointments: {
      total: number;
      completed: number;
      cancelled: number;
      completionRate: string;
    };
    consultations: {
      total: number;
    };
    billing: {
      totalBillsGenerated: number;
    };
  };
}

export default function HospitalAnalytics() {
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [patientFlow, setPatientFlow] = useState<PatientFlow | null>(null);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, flowRes, reportRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/analytics/dashboard'),
        fetch('http://localhost:5000/api/v1/analytics/patient-flow'),
        fetch('http://localhost:5000/api/v1/analytics/performance-report')
      ]);

      const dashData = await dashRes.json();
      const flowData = await flowRes.json();
      const reportData = await reportRes.json();

      if (dashData.success) setDashboard(dashData.data);
      if (flowData.success) setPatientFlow(flowData.data);
      if (reportData.success) setReport(reportData.data);
    } catch (err) {
      setError("Failed to fetch analytics from API server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" /> Hospital Operational Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time patient flow metrics, queue bottlenecks, and financial performance</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Row 1: KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glow-card rounded-2xl bg-slate-950/60 border border-slate-900 p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Total Patients</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{dashboard?.totalPatients ?? 0}</p>
          <span className="text-[10px] text-slate-500 block">Registered Profiles</span>
        </div>

        <div className="glow-card rounded-2xl bg-slate-950/60 border border-slate-900 p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Appointments</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{dashboard?.totalAppointments ?? 0}</p>
          <span className="text-[10px] text-slate-500 block">Total Scheduled</span>
        </div>

        <div className="glow-card rounded-2xl bg-slate-950/60 border border-slate-900 p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Active Queue</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{dashboard?.activeConsultations ?? 0}</p>
          <span className="text-[10px] text-slate-500 block">Waiting & In-Progress</span>
        </div>

        <div className="glow-card rounded-2xl bg-slate-950/60 border border-slate-900 p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Hospital Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">${(dashboard?.financials?.totalRevenue ?? 0).toFixed(2)}</p>
          <span className="text-[10px] text-slate-500 block">Paid: ${(dashboard?.financials?.paidRevenue ?? 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Row 2: Queue Bottlenecks & Patient Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Flow Status */}
        <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-5">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-900 pb-3">
            <Activity className="w-4 h-4 text-sky-400" /> Patient Flow & Queue Status
          </h3>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Waiting</span>
              <span className="text-xl font-bold text-sky-400">{patientFlow?.waitingQueueCount ?? 0}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">In Consultation</span>
              <span className="text-xl font-bold text-indigo-400">{patientFlow?.inProgressCount ?? 0}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Emergency Alerts</span>
              <span className="text-xl font-bold text-rose-400">{patientFlow?.emergencyPriorityCount ?? 0}</span>
            </div>
          </div>

          {/* Bottlenecks list */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-400 block">Operational Bottlenecks Detected</span>
            {(!patientFlow?.bottlenecks || patientFlow.bottlenecks.length === 0) ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Patient flow is smooth. No queue bottlenecks detected.
              </div>
            ) : (
              patientFlow.bottlenecks.map((b, i) => (
                <div key={i} className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${b.level === 'critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{b.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Operational Performance Summary */}
        <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-5">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-900 pb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Operational Performance Report
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 font-semibold mb-1">
                <span>Appointment Completion Rate</span>
                <span className="text-sky-400">{report?.summary?.appointments?.completionRate ?? '0%'}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: report?.summary?.appointments?.completionRate ?? '0%' }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Completed Appointments</span>
                <span className="text-lg font-bold text-slate-200">{report?.summary?.appointments?.completed ?? 0}</span>
              </div>
              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Cancelled Appointments</span>
                <span className="text-lg font-bold text-rose-400">{report?.summary?.appointments?.cancelled ?? 0}</span>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-600 font-mono text-right">
              Generated at: {report?.reportGeneratedAt ? new Date(report.reportGeneratedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
