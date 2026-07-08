import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, UserCheck, Users, CheckCircle, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  hospitalId: string;
  phone: string;
}

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string;
}

interface Appointment {
  _id: string;
  patientId: Patient;
  doctorId: Doctor;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  reason?: string;
}

interface Consultation {
  _id: string;
  appointmentId?: string;
  patientId: Patient;
  doctorId: Doctor;
  status: 'open' | 'in_progress' | 'completed';
  createdAt: string;
}

export default function PatientCheckin() {
  // Data list states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [waitQueue, setWaitQueue] = useState<Consultation[]>([]);

  // Walk-in form states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [walkinSymptoms, setWalkinSymptoms] = useState('');

  // AI Late Arrival options state
  const [evaluatingLateAppt, setEvaluatingLateAppt] = useState<Appointment | null>(null);
  const [aiAdvice, setAiAdvice] = useState<{ recommendedAction: string; explanation: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // General states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [apptsRes, patientsRes, doctorsRes, queueRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/appointments'),
        fetch('http://localhost:5000/api/v1/patients'),
        fetch('http://localhost:5000/api/v1/doctors'),
        fetch('http://localhost:5000/api/v1/consultations/queue')
      ]);

      const apptsResult = await apptsRes.json();
      const patientsResult = await patientsRes.json();
      const doctorsResult = await doctorsRes.json();
      const queueResult = await queueRes.json();

      if (apptsResult.success) {
        // Filter appointments scheduled for today
        const todayAppts = apptsResult.data.filter((appt: Appointment) => appt.appointmentDate === todayStr);
        setAppointments(todayAppts);
      }
      if (patientsResult.success) setPatients(patientsResult.data);
      if (doctorsResult.success) setDoctors(doctorsResult.data);
      if (queueResult.success) setWaitQueue(queueResult.data);
    } catch (err) {
      setError("Failed to connect to Express backend. Please make sure the server is online.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Standard patient check-in trigger
  const handleCheckin = async (appt: Appointment) => {
    setError(null);
    setSuccess(null);
    
    // Check if patient is late (appointment start time has passed)
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const [apptHour, apptMin] = appt.appointmentTime.split(':').map(Number);
    const [currHour, currMin] = currentHHMM.split(':').map(Number);
    const delayMinutes = (currHour - apptHour) * 60 + (currMin - apptMin);

    if (delayMinutes > 15) {
      // Patient is late - consult AI for check-in action advice
      setEvaluatingLateAppt(appt);
      setAiLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/v1/appointments/${appt._id}/late-options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arrivalTime: currentHHMM })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setAiAdvice(result.data);
        } else {
          setError(result.error?.message || "Failed to analyze late check-in.");
          setEvaluatingLateAppt(null);
        }
      } catch (err) {
        setError("AI Advisor unreachable for late arrival check.");
        setEvaluatingLateAppt(null);
      } finally {
        setAiLoading(false);
      }
      return;
    }

    // Proceed with normal check-in
    submitCheckin(appt._id);
  };

  const submitCheckin = async (apptId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/appointments/${apptId}/checkin`, {
        method: 'POST'
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccess("Patient checked in successfully! Doctor has been notified.");
        setEvaluatingLateAppt(null);
        setAiAdvice(null);
        fetchData();
      } else {
        setError(result.error?.message || "Failed to process check-in.");
      }
    } catch (err) {
      setError("Error calling check-in endpoint.");
    } finally {
      setLoading(false);
    }
  };

  // Submit walk-in consultation
  const handleWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedPatientId || !selectedDoctorId) {
      setError("Please select both a patient and an on-duty doctor for walk-in.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/consultations/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          doctorId: selectedDoctorId,
          symptoms: walkinSymptoms ? walkinSymptoms.split(',').map(s => s.trim()) : []
        })
      });
      const result = await res.json();

      if (res.status === 201) {
        setSuccess("Walk-in patient added to waiting queue successfully.");
        setSelectedPatientId('');
        setSelectedDoctorId('');
        setWalkinSymptoms('');
        fetchData();
      } else {
        setError(result.error?.message || "Walk-in registration failed.");
      }
    } catch (err) {
      setError("Express backend unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Alert Messages */}
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

      {/* Main Sections grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Section 1: Today's Appointments & Check-in */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-sky-400" /> Today's Scheduled Appointments
              </h2>
              <button onClick={fetchData} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-12 text-slate-600 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
                No appointments scheduled for today.
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt._id} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">
                          {appt.patientId?.firstName} {appt.patientId?.lastName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                          {appt.patientId?.hospitalId}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-4">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-400" /> {appt.appointmentTime}</span>
                        <span>Dr. {appt.doctorId?.lastName} ({appt.doctorId?.specialization})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {appt.status === 'checked_in' ? (
                        <span className="text-xs font-semibold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" /> Checked In
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCheckin(appt)}
                          className="py-1.5 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/25 text-sky-400 text-xs font-semibold transition-all"
                        >
                          Check In Patient
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wait Queue List */}
          <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-indigo-400" /> Clinic Waiting Queue
            </h2>

            {waitQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-600 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
                Wait queue is currently empty. Patients will appear here once checked in.
              </div>
            ) : (
              <div className="space-y-4">
                {waitQueue.map((item, idx) => (
                  <div key={item._id} className="p-4 rounded-2xl bg-slate-900/30 border border-slate-900 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-slate-200">
                          {item.patientId?.firstName} {item.patientId?.lastName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Assigned: Dr. {item.doctorId?.lastName} • Status: <span className="font-semibold text-sky-400">{item.status}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Queue entry: {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Walk-In consultations */}
        <div className="space-y-6">
          <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" /> Walk-In Consultation
            </h2>
            <p className="text-xs text-slate-450 mb-6">
              Create a direct consultation for walk-in patients who do not have an active appointment scheduled.
            </p>

            <form onSubmit={handleWalkin} className="space-y-4">
              {/* Select Patient */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" /> Select Registered Patient *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                >
                  <option value="">Select Patient</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.firstName} {p.lastName} ({p.hospitalId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Doctor */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-500" /> Assign Doctor *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                >
                  <option value="">Select On-Duty Doctor</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.lastName} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Symptoms (comma-separated)</label>
                <input
                  type="text"
                  value={walkinSymptoms}
                  onChange={(e) => setWalkinSymptoms(e.target.value)}
                  placeholder="e.g. Cough, Fever, Headache"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-500/15 transition-all"
              >
                Add to Waiting Queue
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* LATE CHECK-IN OPTIONS / AI ADVISOR MODAL */}
      {evaluatingLateAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-amber-500/30 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-400 mb-4 animate-pulse">
                <Clock className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Late Arrival Analysis</h3>
              <p className="text-sm text-slate-400 mt-1">
                Patient is checking in past their scheduled appointment time.
              </p>

              {aiLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                  <span className="text-xs text-slate-500">Consulting AI Reception Agent...</span>
                </div>
              ) : aiAdvice ? (
                <div className="w-full space-y-4 my-6 text-left">
                  <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-4">
                    <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block mb-1">
                      AI Advisory Recommendation:
                    </span>
                    <span className="text-sm font-semibold text-slate-200 block capitalize mb-2">
                      Action: {aiAdvice.recommendedAction.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {aiAdvice.explanation}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {aiAdvice.recommendedAction === 'proceed' && (
                      <button
                        onClick={() => submitCheckin(evaluatingLateAppt._id)}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-450 text-white text-xs font-bold transition-colors"
                      >
                        Check In Patient Now
                      </button>
                    )}
                    {aiAdvice.recommendedAction === 'queue_as_walkin' && (
                      <button
                        onClick={async () => {
                          // Check in as walk-in: create walk-in consultation
                          setLoading(true);
                          try {
                            await fetch('http://localhost:5000/api/v1/consultations/walkin', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                patientId: evaluatingLateAppt.patientId._id,
                                doctorId: evaluatingLateAppt.doctorId._id,
                                symptoms: ['Late arrival queue adjustment']
                              })
                            });
                            // Cancel original appointment to mark completed/closed
                            await fetch(`http://localhost:5000/api/v1/appointments/${evaluatingLateAppt._id}/cancel`, { method: 'PATCH' });
                            
                            setSuccess("Patient converted to Walk-in consultation queue successfully.");
                            setEvaluatingLateAppt(null);
                            setAiAdvice(null);
                            fetchData();
                          } catch (err) {
                            setError("Failed to convert late check-in to walk-in.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-450 text-white text-xs font-bold transition-colors"
                      >
                        Convert to Walk-In wait queue
                      </button>
                    )}
                    {aiAdvice.recommendedAction === 'reschedule' && (
                      <button
                        onClick={() => {
                          setEvaluatingLateAppt(null);
                          setAiAdvice(null);
                          setSuccess("Please reschedule the patient using the scheduling portal.");
                        }}
                        className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-450 text-white text-xs font-bold transition-colors"
                      >
                        Reschedule Appointment
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEvaluatingLateAppt(null);
                        setAiAdvice(null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold"
                    >
                      Dismiss Advisor
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
