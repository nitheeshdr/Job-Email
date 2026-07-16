'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function LockGate({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jobmail_site_unlocked');
      setIsUnlocked(saved === 'true');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === 'emailjob') {
      localStorage.setItem('jobmail_site_unlocked', 'true');
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (isUnlocked === null) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center font-sans">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans text-[#171717]">
        <div className="w-full max-w-md space-y-8 rounded-[12px] border border-[#eaeaea] bg-white p-8 shadow-geist-raised">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f2f2] border border-[#eaeaea]">
              <Lock className="h-5 w-5 text-[#171717]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
              Workspace Locked
            </h2>
            <p className="text-xs text-[#8f8f8f] max-w-xs">
              This campaign workspace is private. Enter the secret access code to unlock.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4d4d4d] uppercase tracking-wider">Access Code</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError(false);
                  }}
                  placeholder="••••••••"
                  className={`w-full h-11 rounded-[6px] border bg-white px-4 pr-12 text-sm text-[#171717] placeholder-gray-300 outline-none transition-all ${
                    error ? 'border-[#fc0035] focus:border-[#fc0035]' : 'border-[#eaeaea] focus:border-[#171717]'
                  }`}
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#171717] hover:bg-[#4d4d4d] text-white transition-all active:scale-95"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-[6px] border border-[#ffd7d6] bg-[#ffeeef] p-3 text-xs text-[#fc0035] flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#ea001d]" />
                <span>Incorrect access code. Try again.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
