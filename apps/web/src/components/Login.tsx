import React, { useState } from 'react';
import { Shield, Mail, Lock, LogIn, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick fill helper for review demo accounts
  const handleQuickFill = (role: 'receptionist' | 'admin') => {
    setError(null);
    if (role === 'receptionist') {
      setEmail('receptionist@hospitalos.com');
      setPassword('receptionist123');
    } else {
      setEmail('admin@hospitalos.com');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const result = await response.json();

      if (response.status === 200) {
        onLoginSuccess(result.data.user, result.data.token);
      } else {
        setError(result.error?.message || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setError('Cannot connect to Express server. Please verify the API backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative animate-in fade-in zoom-in-95 duration-300">
      {/* Background glow behind card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-3xl blur-xl opacity-20 pointer-events-none"></div>

      <div className="relative bg-slate-950/70 border border-slate-900 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/10">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-slate-100 bg-gradient-to-r from-teal-300 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
          Sign In to Aethera
        </h2>
        <p className="text-xs text-center text-slate-500 mt-1 mb-8">Aethera - AI Clinical Intake Platform</p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. receptionist@hospitalos.com"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/15 disabled:opacity-50 mt-6"
          >
            {loading ? (
              'Authenticating...'
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Fills */}
        <div className="mt-8 pt-6 border-t border-slate-900/80">
          <div className="flex items-center gap-1 text-xs text-sky-400 font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Demo Quick Login
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickFill('receptionist')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 font-medium transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-400" /> Receptionist
            </button>
            <button
              onClick={() => handleQuickFill('admin')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 font-medium transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Administrator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
