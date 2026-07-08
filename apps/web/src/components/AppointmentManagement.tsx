import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Briefcase, PlusCircle, AlertTriangle, HelpCircle, RefreshCw, XCircle, CheckCircle } from 'lucide-react';

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  department: string;
  availability: string[];
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  hospitalId: string;
  phone: string;
}

interface Appointment {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    hospitalId: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  appointmentType: string;
  status: 'requested' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  createdAt: string;
}

export default function AppointmentManagement() {
  // Data State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Selection state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [appointmentType, setAppointmentType] = useState('consultation');
  const [urgency, setUrgency] = useState('low');

  // AI slot recommendation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Double-booking & Reschedule suggestion state
  const [doubleBookingAlternatives, setDoubleBookingAlternatives] = useState<string[]>([]);
  const [rescheduleRecommendations, setRescheduleRecommendations] = useState<any[]>([]);

  // Reschedule state
  const [reschedulingApptId, setReschedulingApptId] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState('');

  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch initial datasets
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [doctorsRes, patientsRes, apptsRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/doctors'),
        fetch('http://localhost:5000/api/v1/patients'),
        fetch('http://localhost:5000/api/v1/appointments')
      ]);

      const doctorsData = await doctorsRes.json();
      const patientsData = await patientsRes.json();
      const apptsData = await apptsRes.json();

      if (doctorsData.success) setDoctors(doctorsData.data);
      if (patientsData.success) setPatients(patientsData.data);
      if (apptsData.success) setAppointments(apptsData.data);
    } catch (err) {
      setError("Failed to fetch initial doctor, patient, or appointment records. Please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Consult FastAPI Reception Agent for Slot Suggestions
  const handleConsultAI = async () => {
    if (!selectedDoctorId || !selectedDate) {
      setError("Please select a doctor and date first to consult the AI Advisor.");
      return;
    }

    setAiLoading(true);
    setError(null);
    setAiRecommendation(null);
    setSuggestedSlots([]);
    setBookedSlots([]);
    setSelectedTime('');
    setDoubleBookingAlternatives([]);

    try {
      const response = await fetch('http://localhost:5000/api/v1/appointments/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          date: selectedDate,
          urgency,
          reason: reason.trim(),
          appointmentType
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuggestedSlots(result.data.availableSlots || []);
        setBookedSlots(result.data.bookedSlots || []);
        setAiRecommendation(result.data.recommendation || '');
      } else {
        setError(result.error?.message || "Failed to retrieve slot recommendations.");
      }
    } catch (err) {
      setError("Could not reach AI Service for suggestions. Local scheduling fallback initialized.");
    } finally {
      setAiLoading(false);
    }
  };

  // Submit appointment booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDoubleBookingAlternatives([]);

    if (!selectedPatientId || !selectedDoctorId || !selectedDate || !selectedTime) {
      setError("Please fill out all required fields and select an appointment time slot.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          doctorId: selectedDoctorId,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          reason: reason.trim() || undefined,
          appointmentType
        })
      });

      const result = await response.json();

      if (response.status === 201) {
        setSuccessMessage("Appointment booked successfully!");
        // Reset selections
        setSelectedTime('');
        setReason('');
        setAiRecommendation(null);
        setSuggestedSlots([]);
        setDoubleBookingAlternatives([]);
        // Reload appointments list
        fetchData();
      } else {
        if (result.error?.code === 'DOUBLE_BOOKING' && result.error.alternatives) {
          setDoubleBookingAlternatives(result.error.alternatives);
        }
        setError(result.error?.message || "Booking request failed.");
      }
    } catch (err) {
      setError("Express backend unreachable. Failed to save appointment.");
    } finally {
      setLoading(false);
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (id: string) => {
    setError(null);
    setSuccessMessage(null);
    setRescheduleRecommendations([]);
    try {
      const response = await fetch(`http://localhost:5000/api/v1/appointments/${id}/cancel`, {
        method: 'PATCH'
      });
      const result = await response.json();
      if (response.status === 200) {
        setSuccessMessage("Appointment cancelled successfully. Time slot has been freed.");
        if (result.rescheduleRecommendations && result.rescheduleRecommendations.length > 0) {
          setRescheduleRecommendations(result.rescheduleRecommendations);
        }
        fetchData();
      } else {
        setError(result.error?.message || "Cancellation request failed.");
      }
    } catch (err) {
      setError("Failed to process cancellation request.");
    }
  };

  // Submit Reschedule
  const handleReschedule = async (id: string) => {
    if (!rescheduleTime) {
      setError("Please select a time slot to reschedule.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    try {
      const appt = appointments.find(a => a._id === id);
      if (!appt) return;

      const response = await fetch(`http://localhost:5000/api/v1/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentDate: appt.appointmentDate,
          appointmentTime: rescheduleTime
        })
      });

      const result = await response.json();

      if (response.status === 200) {
        setSuccessMessage("Appointment rescheduled successfully!");
        setReschedulingApptId(null);
        setRescheduleTime('');
        fetchData();
      } else {
        setError(result.error?.message || "Rescheduling failed.");
      }
    } catch (err) {
      setError("Failed to process reschedule request.");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Double booking alternatives warning */}
      {error && doubleBookingAlternatives.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-450 flex flex-col gap-2 text-sm">
          <span className="font-semibold flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            Double-booking conflict. Doctor has other available slots on this day:
          </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {doubleBookingAlternatives.map((slot) => (
              <button
                key={slot}
                onClick={() => {
                  setSelectedTime(slot);
                  setDoubleBookingAlternatives([]);
                  setError(null);
                }}
                className="py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/25 font-mono text-xs font-semibold transition-colors"
              >
                {slot} (Select Slot)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reschedule Recommendations Alert */}
      {rescheduleRecommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex flex-col gap-2 text-sm">
          <span className="font-semibold flex items-center gap-2 text-indigo-400">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            Reschedule Recommendations (Earlier slot became available):
          </span>
          <p className="text-xs text-slate-450">
            The following patients are booked later today. You can contact them to move them to the newly freed slot:
          </p>
          <div className="space-y-3 mt-1">
            {rescheduleRecommendations.map((rec, idx) => (
              <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="text-xs text-slate-300">
                  <span className="font-semibold">{rec.patientName}</span> is currently booked at <span className="font-mono text-amber-400 font-semibold">{rec.currentTime}</span>.
                  <div className="text-[10px] text-slate-500 mt-0.5">{rec.reason}</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`http://localhost:5000/api/v1/appointments/${rec.appointmentId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          appointmentDate: selectedDate || new Date().toISOString().split('T')[0],
                          appointmentTime: rec.recommendedTime
                        })
                      });
                      if (response.ok) {
                        setSuccessMessage(`Successfully rescheduled ${rec.patientName} to ${rec.recommendedTime}!`);
                        setRescheduleRecommendations(prev => prev.filter(r => r.appointmentId !== rec.appointmentId));
                        fetchData();
                      } else {
                        setError("Failed to reschedule patient.");
                      }
                    } catch (err) {
                      setError("Network error rescheduling patient.");
                    }
                  }}
                  className="py-1.5 px-3 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 border border-indigo-500/25 text-xs font-semibold transition-colors flex-shrink-0"
                >
                  Reschedule to {rec.recommendedTime}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Scheduling Form */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Step 1: Options Form */}
        <div className="lg:col-span-2 glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-sky-400" /> Book Appointment
            </h2>
            <p className="text-xs text-slate-400">
              Select doctor and patient details, Pick a date and consult the AI Receptionist to suggest optimal conflict-free slots.
            </p>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              {/* Select Patient */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" /> Select Patient *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                >
                  <option value="">Choose Patient</option>
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
                  <Briefcase className="w-3 h-3 text-slate-500" /> Select Doctor *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    setAiRecommendation(null);
                    setSuggestedSlots([]);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                >
                  <option value="">Choose Doctor</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.lastName} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Date */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 text-slate-500" /> Appointment Date *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setAiRecommendation(null);
                    setSuggestedSlots([]);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none transition-colors"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Reason for Visit</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Heart pressure, follow-up"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              </div>

              {/* Appointment Type */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Appointment Type</label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none transition-colors"
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="emergency">Emergency</option>
                  <option value="routine">Routine Check</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Urgency Level</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none transition-colors"
                >
                  <option value="low">Low (Routine)</option>
                  <option value="medium">Medium (Moderate Symptoms)</option>
                  <option value="high">High (Urgent Consultation)</option>
                </select>
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-900 flex gap-3">
            <button
              onClick={handleConsultAI}
              disabled={aiLoading || !selectedDoctorId || !selectedDate}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-slate-200 text-xs font-semibold text-sky-400 transition-all disabled:opacity-50"
            >
              {aiLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5" />
              )}
              Consult AI Advisor
            </button>

            <button
              onClick={handleBookAppointment}
              disabled={loading || !selectedTime}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/15 disabled:opacity-50"
            >
              Book Selected Slot
            </button>
          </div>
        </div>

        {/* Step 2: AI Advisor Results & Slots Selection */}
        <div className="lg:col-span-3 glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> AI Slot Recommendations
            </h2>

            {/* Reception Agent Message */}
            {aiRecommendation ? (
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 text-slate-300 text-xs flex gap-3 leading-relaxed animate-in slide-in-from-top-3 duration-250">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 h-fit">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-indigo-400 block mb-1">Reception Agent Recommendations:</span>
                  {aiRecommendation}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-600 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                Fill in the doctor and date, then click "Consult AI Advisor" to see slot recommendations.
              </div>
            )}

            {/* Slots Grid */}
            {suggestedSlots.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Available Time Slot:</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {suggestedSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-mono font-semibold transition-all border ${selectedTime === slot ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md shadow-indigo-500/5' : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Display booked conflict slots if any */}
            {bookedSlots.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Booked Slots (Unavailable):</h3>
                <div className="flex flex-wrap gap-2">
                  {bookedSlots.map((slot) => (
                    <span
                      key={slot}
                      className="py-1 px-3.5 rounded-lg bg-slate-950 border border-slate-900/80 text-slate-600 text-xs font-mono line-through flex items-center gap-1.5"
                    >
                      <XCircle className="w-3 h-3 text-slate-700" /> {slot}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedTime && (
            <div className="mt-8 p-3.5 rounded-xl bg-slate-900/60 border border-slate-850 flex items-center justify-between text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span className="text-slate-400">Selected Appointment Slot:</span>
                <span className="font-mono font-bold text-sky-400">{selectedTime}</span>
              </div>
              <span className="text-[10px] uppercase text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">Available</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Existing Bookings List */}
      <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-6">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-6">
          <CalendarIcon className="w-5 h-5 text-indigo-400" /> Active Appointment Schedule
        </h2>

        {appointments.length === 0 ? (
          <div className="text-center py-12 text-slate-600 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
            No appointments scheduled in the system yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {appointments.map((appt) => (
              <div
                key={appt._id}
                className={`p-5 rounded-2xl border ${appt.status === 'cancelled' ? 'border-slate-950/60 bg-slate-950/20 opacity-60' : 'border-slate-900 bg-slate-950/40'} flex flex-col justify-between space-y-4`}
              >
                {/* Header Info */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      {appt.patientId?.firstName} {appt.patientId?.lastName}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {appt.patientId?.hospitalId}</p>
                  </div>
                  <div>
                    {appt.status === 'cancelled' ? (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">Cancelled</span>
                    ) : (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Confirmed</span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-900/40 p-3 rounded-xl border border-slate-900/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Consultant Doctor</span>
                    <span className="font-semibold text-slate-300 mt-0.5 block">Dr. {appt.doctorId?.lastName}</span>
                    <span className="text-[9px] text-sky-400">{appt.doctorId?.specialization}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Date & Time</span>
                    <span className="font-semibold text-slate-300 mt-0.5 block">{appt.appointmentDate}</span>
                    <span className="font-mono text-xs text-indigo-400 font-bold">{appt.appointmentTime}</span>
                  </div>
                </div>

                {/* Actions row */}
                {appt.status !== 'cancelled' && (
                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-900/60">
                    {reschedulingApptId === appt._id ? (
                      <div className="flex items-center gap-2 w-full justify-between animate-in slide-in-from-right-3 duration-200">
                        {/* Inline Reschedule Selector */}
                        <select
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="">Select Time</option>
                          {/* Standard slots */}
                          {["09:00", "10:00", "11:00", "14:00", "15:00"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReschedule(appt._id)}
                            className="py-1 px-3 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setReschedulingApptId(null);
                              setRescheduleTime('');
                            }}
                            className="py-1 px-2 rounded-lg border border-slate-800 text-slate-500 text-xs hover:text-slate-300 hover:border-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setReschedulingApptId(appt._id)}
                          className="py-1.5 px-3 rounded-lg border border-slate-800 text-slate-400 text-xs font-medium hover:text-slate-200 hover:border-slate-700 transition-all"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancelAppointment(appt._id)}
                          className="py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-all"
                        >
                          Cancel Appointment
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
