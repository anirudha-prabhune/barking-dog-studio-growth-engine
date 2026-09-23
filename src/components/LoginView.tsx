import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@barkingdog.studio');
  const [password, setPassword] = useState('BarkingDog2026!Secure');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your studio email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setEmail('admin@barkingdog.studio');
    setPassword('BarkingDog2026!Secure');
  };

  return (
    <div id="login-page" className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-2xl shadow-inner mx-auto">
            BD
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Studio Barking Dog
            </h1>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mt-0.5">
              Growth Engine • Pass 1
            </p>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-6 shadow-xl backdrop-blur-xs space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Sign In to Internal Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized access for Studio Barking Dog team members
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-md text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Studio Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@barkingdog.studio"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <button
              id="button-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-md text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-xs"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>

          {/* Seed/Default Credentials helper */}
          <div className="pt-3 border-t border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
              <span>Development Seed Credentials:</span>
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="text-amber-400 hover:text-amber-300 underline font-medium"
              >
                Auto-fill
              </button>
            </div>
            <div className="p-2.5 rounded bg-slate-900/60 border border-slate-700 font-mono text-[10px] text-slate-400 space-y-0.5">
              <div>Email: <span className="text-slate-200">admin@barkingdog.studio</span></div>
              <div>Password: <span className="text-slate-200">BarkingDog2026!Secure</span></div>
            </div>
          </div>
        </div>

        {/* Security / Architecture Footer */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PBKDF2 Password Hashing & Authenticated Session Tokens</span>
        </div>
      </div>
    </div>
  );
};
