'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Key, User, Terminal, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('vanta2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 font-mono select-none relative overflow-hidden">
      {/* Background Matrix/Subtle Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Terminal Auth Card */}
      <div className="relative w-full max-w-md bg-vanta-950 border border-vanta-border rounded-lg shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-vanta-border pb-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-vanta-green shadow-[0_0_8px_#00ff66]" />
            <span className="font-bold tracking-widest text-sm text-white">
              CHADI0X <span className="text-vanta-green">VANTA</span>
            </span>
          </div>
          <span className="text-[10px] text-vanta-cyan border border-vanta-cyan/40 px-2 py-0.5 rounded uppercase font-bold">
            GATEWAY 2026
          </span>
        </div>

        {/* Security Prompt */}
        <div className="mb-6">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Shield className="w-4 h-4 text-vanta-green" />
            <span>INSTITUTIONAL ACCESS PORTAL</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Restricted terminal environment. All telemetry, orders, and sessions are cryptographic JWT audited.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 bg-vanta-red/10 border border-vanta-red text-vanta-red p-3 rounded text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-neutral-400 text-xs uppercase mb-1 font-semibold">
              OPERATOR ID / USERNAME
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-vanta-900 border border-vanta-border rounded pl-10 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-vanta-green transition-colors"
                placeholder="Operator ID"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 text-xs uppercase mb-1 font-semibold">
              SECURITY CIPHER / PASSWORD
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-vanta-900 border border-vanta-border rounded pl-10 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-vanta-green transition-colors"
                placeholder="Access Password"
              />
            </div>
          </div>

          <div className="bg-black/80 border border-neutral-800 p-2.5 rounded text-[11px] text-neutral-400">
            <div className="text-vanta-yellow font-bold mb-0.5">DEFAULT SEED CREDENTIALS:</div>
            <div>User: <span className="text-white font-mono">admin</span></div>
            <div>Password: <span className="text-white font-mono">vanta2026</span></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vanta-green hover:bg-vanta-green/90 text-black font-bold py-2.5 px-4 rounded text-xs tracking-wider transition-all transform active:scale-95 disabled:opacity-50 mt-2 shadow-[0_0_15px_rgba(0,255,102,0.3)]"
          >
            {loading ? 'AUTHENTICATING CIPHER...' : 'AUTHORIZE & INITIALIZE TERMINAL'}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-vanta-border flex items-center justify-between text-[10px] text-neutral-500">
          <span className="flex items-center space-x-1">
            <Terminal className="w-3 h-3 text-vanta-muted" />
            <span>SOCKET STREAM V1</span>
          </span>
          <span>CHADI0X SECURE NET</span>
        </div>
      </div>
    </div>
  );
}
