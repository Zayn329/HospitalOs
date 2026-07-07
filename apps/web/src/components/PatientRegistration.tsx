import React, { useState } from 'react';
import { User, Phone, Mail, MapPin, Heart, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface ValidationError {
  field: string;
  message: string;
}

interface ExistingPatientInfo {
  hospitalId: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export default function PatientRegistration() {
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    bloodGroup: '',
    allergies: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    medicalHistory: ''
  });

  // UI State
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [successPatient, setSuccessPatient] = useState<any | null>(null);
  const [duplicatePatient, setDuplicatePatient] = useState<ExistingPatientInfo | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    setErrors((prev) => prev.filter((err) => err.field !== name));
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    if (!formData.firstName.trim()) newErrors.push({ field: 'firstName', message: 'First name is required' });
    if (!formData.lastName.trim()) newErrors.push({ field: 'lastName', message: 'Last name is required' });
    if (!formData.gender) newErrors.push({ field: 'gender', message: 'Gender selection is required' });
    if (!formData.dateOfBirth) newErrors.push({ field: 'dateOfBirth', message: 'Date of birth is required' });
    if (!formData.phone.trim()) newErrors.push({ field: 'phone', message: 'Phone number is required' });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const getFieldError = (fieldName: string) => {
    return errors.find((err) => err.field === fieldName)?.message;
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      phone: '',
      email: '',
      address: '',
      bloodGroup: '',
      allergies: '',
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelationship: '',
      medicalHistory: ''
    });
    setErrors([]);
    setSuccessPatient(null);
    setDuplicatePatient(null);
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessPatient(null);
    setDuplicatePatient(null);
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Build request body matching patient.yaml structure
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        emergencyContact: formData.emergencyName ? {
          name: formData.emergencyName.trim(),
          phone: formData.emergencyPhone.trim(),
          relationship: formData.emergencyRelationship.trim()
        } : undefined,
        medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      const response = await fetch('http://localhost:5000/api/v1/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.status === 201) {
        setSuccessPatient(result.data);
        addRegisteredPatientToLocalList(result.data);
      } else if (response.status === 409 && result.error?.code === 'DUPLICATE_PATIENT') {
        setDuplicatePatient(result.error.existingPatient);
      } else if (result.error?.code === 'VALIDATION_ERROR') {
        setErrors(result.error.details || []);
      } else {
        setServerError(result.error?.message || 'An unexpected error occurred during registration.');
      }
    } catch (err) {
      setServerError('Cannot connect to Express server. Please verify the API backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to store in localStorage just to demonstrate listed state instantly on screen
  const addRegisteredPatientToLocalList = (patient: any) => {
    const list = JSON.parse(localStorage.getItem('hospitalos_registered_patients') || '[]');
    localStorage.setItem('hospitalos_registered_patients', JSON.stringify([patient, ...list]));
  };

  return (
    <div className="space-y-6 relative max-w-4xl mx-auto">
      {/* Registration Form Card */}
      <div className="glow-card rounded-3xl bg-slate-950/60 backdrop-blur-md border border-slate-900 p-8">
        <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-sky-400" /> Patient Registration Form
        </h2>
        <p className="text-sm text-slate-400 mb-8">
          Enter new patient details. Required fields are indicated with an asterisk (*). Double-registration is automatically blocked.
        </p>

        {serverError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Demographics */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-4 pb-1 border-b border-slate-900">
              1. Patient Demographics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="e.g. John"
                  className={`w-full bg-slate-900/60 border ${getFieldError('firstName') ? 'border-rose-500/50 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'} rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors`}
                />
                {getFieldError('firstName') && (
                  <p className="text-xs text-rose-400 mt-1">{getFieldError('firstName')}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="e.g. Doe"
                  className={`w-full bg-slate-900/60 border ${getFieldError('lastName') ? 'border-rose-500/50 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'} rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors`}
                />
                {getFieldError('lastName') && (
                  <p className="text-xs text-rose-400 mt-1">{getFieldError('lastName')}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`w-full bg-slate-900/60 border ${getFieldError('gender') ? 'border-rose-500/50 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'} rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-colors`}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {getFieldError('gender') && (
                  <p className="text-xs text-rose-400 mt-1">{getFieldError('gender')}</p>
                )}
              </div>

              {/* DOB */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Date of Birth *</label>
                <div className="relative">
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-900/60 border ${getFieldError('dateOfBirth') ? 'border-rose-500/50 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'} rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-colors`}
                  />
                </div>
                {getFieldError('dateOfBirth') && (
                  <p className="text-xs text-rose-400 mt-1">{getFieldError('dateOfBirth')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Contact Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-4 pb-1 border-b border-slate-900">
              2. Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone Number *
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. 9876543210"
                  className={`w-full bg-slate-900/60 border ${getFieldError('phone') ? 'border-rose-500/50 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'} rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors`}
                />
                {getFieldError('phone') && (
                  <p className="text-xs text-rose-400 mt-1">{getFieldError('phone')}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g. patient@example.com"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> Home Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street Address, City, ZIP Code"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Clinical & Emergency Details */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-4 pb-1 border-b border-slate-900">
              3. Clinical & Emergency Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Blood Group */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-colors"
                >
                  <option value="">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Allergies (comma-separated)</label>
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  placeholder="e.g. Penicillin, Peanuts"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
                />
              </div>

              {/* Medical History */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-2">Pre-existing Medical Conditions</label>
                <textarea
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleInputChange}
                  placeholder="e.g. Hypertension, Diabetes (comma-separated)"
                  rows={2}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Emergency Name */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Emergency Contact Name</label>
                  <input
                    type="text"
                    name="emergencyName"
                    value={formData.emergencyName}
                    onChange={handleInputChange}
                    placeholder="e.g. Mary Doe"
                    className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Emergency Phone</label>
                  <input
                    type="text"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    placeholder="e.g. 9876543211"
                    className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Relationship</label>
                  <input
                    type="text"
                    name="emergencyRelationship"
                    value={formData.emergencyRelationship}
                    onChange={handleInputChange}
                    placeholder="e.g. Spouse"
                    className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end pt-4 border-t border-slate-900">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-sm font-medium hover:text-slate-300 hover:border-slate-700 transition-colors"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/10 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>

      {/* SUCCESS POPUP MODAL */}
      {successPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Patient Registered</h3>
              <p className="text-sm text-slate-400 mt-1">Profile created successfully inside HospitalOS.</p>
              
              <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 my-6 text-left">
                <div className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Hospital ID</div>
                <div className="text-2xl font-mono font-bold text-slate-200 tracking-wider mt-0.5">{successPatient.hospitalId}</div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Patient Name</div>
                    <div className="text-sm font-semibold text-slate-300 mt-0.5">{successPatient.firstName} {successPatient.lastName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Phone</div>
                    <div className="text-sm font-semibold text-slate-300 mt-0.5">{successPatient.phone}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={resetForm}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 text-slate-300 text-sm font-medium transition-all"
              >
                Close & Clear Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE SUGGESTION MODAL */}
      {duplicatePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-rose-500/30 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 mb-4">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Duplicate Record Detected</h3>
              <p className="text-sm text-slate-400 mt-1">A patient profile with this phone number is already in the system.</p>

              <div className="w-full bg-slate-900/60 border border-slate-850 rounded-xl p-4 my-6 text-left">
                <div className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-2">Existing Patient Details</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Name:</span>
                    <span className="text-xs font-semibold text-slate-300">{duplicatePatient.firstName} {duplicatePatient.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Hospital ID:</span>
                    <span className="text-xs font-mono font-semibold text-sky-400">{duplicatePatient.hospitalId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Phone:</span>
                    <span className="text-xs font-mono text-slate-300">{duplicatePatient.phone}</span>
                  </div>
                </div>
              </div>

              <div className="w-full flex gap-3">
                <button
                  onClick={() => setDuplicatePatient(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-sm font-medium hover:text-slate-300 hover:border-slate-700 transition-colors"
                >
                  Edit Information
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 hover:bg-rose-500/25 text-rose-400 text-sm font-medium transition-all"
                >
                  Clear & Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
