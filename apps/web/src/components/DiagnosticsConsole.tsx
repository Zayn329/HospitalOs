import React, { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, RefreshCw, AlertCircle, Eye, ShieldAlert, Users, Award } from 'lucide-react';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  hospitalId: string;
  phone: string;
}

interface LabReport {
  _id: string;
  patientId: string;
  testName: string;
  rawText: string;
  isAbnormal: boolean;
  aiSummary: string;
  status: 'pending_review' | 'reviewed';
  createdAt: string;
}

export default function DiagnosticsConsole() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [reports, setReports] = useState<LabReport[]>([]);
  
  // Upload form state
  const [testName, setTestName] = useState('');
  const [rawText, setRawText] = useState('');

  // General state
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/patients');
      const result = await res.json();
      if (res.ok && result.success) {
        setPatients(result.data);
      }
    } catch (err) {
      setError("Failed to fetch patients list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchReports = async (patientId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/diagnostics/patient/${patientId}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setReports(result.data);
      }
    } catch (err) {
      setError("Failed to fetch diagnostic reports.");
    }
  };

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setReports([]);
    setTestName('');
    setRawText('');
    setError(null);
    setSuccess(null);
    fetchReports(p._id);
  };

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if (!testName.trim() || !rawText.trim()) {
      setError("Please fill out both test name and raw results text.");
      return;
    }

    setUploadLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('http://localhost:5000/api/v1/diagnostics/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          testName: testName.trim(),
          rawText: rawText.trim()
        })
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccess("Lab report uploaded and analyzed successfully.");
        setTestName('');
        setRawText('');
        fetchReports(selectedPatient._id);
      } else {
        setError(result.error?.message || "Failed to upload report.");
      }
    } catch (err) {
      setError("Express backend is unreachable.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleReviewReport = async (reportId: string) => {
    if (!selectedPatient) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/diagnostics/${reportId}/review`, {
        method: 'POST'
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccess("Report signed off and marked reviewed.");
        fetchReports(selectedPatient._id);
      } else {
        setError(result.error?.message || "Failed to review report.");
      }
    } catch (err) {
      setError("Error signing off report.");
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
        
        {/* Patient Selection list */}
        <div className="lg:col-span-1 glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> Patients Directory
            </h2>
            <button onClick={fetchPatients} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12 text-slate-650 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20 text-xs">
              No patients registered.
            </div>
          ) : (
            <div className="space-y-3">
              {patients.map((p) => (
                <div
                  key={p._id}
                  onClick={() => handleSelectPatient(p)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${selectedPatient?._id === p._id ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'}`}
                >
                  <span className="font-semibold text-slate-200 block text-xs">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-[10px] text-slate-550 block mt-1">ID: {p.hospitalId}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Central Display: Reports lists and Upload panel */}
        <div className="lg:col-span-3">
          {selectedPatient ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Reports Dashboard */}
              <div className="md:col-span-2 space-y-6">
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 space-y-6">
                  <div className="border-b border-slate-900 pb-4">
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">Diagnostics Dashboard</span>
                    <h2 className="text-lg font-bold text-slate-100 mt-1">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h2>
                    <p className="text-xs text-slate-555 mt-0.5">Clinical diagnostics and laboratory feed history</p>
                  </div>

                  {reports.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20 text-xs">
                      No laboratory reports exist for this patient record.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reports.map((r) => (
                        <div
                          key={r._id}
                          className={`p-4 rounded-2xl border text-left space-y-3 transition-colors ${r.isAbnormal ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/30 border-slate-900'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-sky-400" /> {r.testName}
                            </span>
                            
                            <div className="flex gap-2 items-center">
                              {r.isAbnormal && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] font-bold text-rose-400 uppercase tracking-wider">
                                  <ShieldAlert className="w-3 h-3" /> Abnormal findings
                                </span>
                              )}
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${r.status === 'reviewed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                {r.status}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-350 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                            <span className="text-[9px] text-slate-500 font-bold block uppercase mb-1">AI clinical summary</span>
                            <p className="leading-relaxed">{r.aiSummary}</p>
                          </div>

                          <div className="text-xs text-slate-400">
                            <span className="text-[9px] text-slate-550 block font-mono">Raw data findings:</span>
                            <pre className="font-mono text-[10px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">
                              {r.rawText}
                            </pre>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                            <span className="text-[9px] text-slate-600 font-mono">
                              Report Date: {new Date(r.createdAt).toLocaleString()}
                            </span>

                            {r.status === 'pending_review' && (
                              <button
                                onClick={() => handleReviewReport(r._id)}
                                className="py-1 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> Sign Off Review
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Report Panel */}
              <div className="space-y-6">
                <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
                  <span className="text-[10px] text-slate-550 font-bold uppercase block border-b border-slate-900 pb-2">
                    Upload Laboratory Report
                  </span>

                  <form onSubmit={handleUploadReport} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Test Name *</label>
                      <input
                        type="text"
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        placeholder="e.g. CBC Panel, Lipid profile"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Raw Report Data *</label>
                      <textarea
                        rows={6}
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Paste blood values test text, ranges..."
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploadLoading || !testName || !rawText}
                      className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {uploadLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      Upload & Run AI Check
                    </button>
                  </form>
                </div>
              </div>

            </div>
          ) : (
            <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-16 text-center text-slate-500 flex flex-col items-center justify-center min-h-[450px]">
              <Award className="w-12 h-12 text-slate-700 mb-3" />
              <span className="font-bold text-slate-400 block">Diagnostics Console</span>
              <p className="text-xs text-slate-600 max-w-sm mt-1">
                Select a patient profile from the directory registry on the left to read lab histories, check abnormal parameters warnings, or upload new reports.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
