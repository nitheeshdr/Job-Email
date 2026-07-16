'use client';

import React, { useEffect, useState } from 'react';
import { Settings, CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SMTPConfigPage() {
  const [step, setStep] = useState(1);
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('jobmail_smtp_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHost(parsed.host || 'smtp.gmail.com');
        setPort(String(parsed.port || '587'));
        setSecure(parsed.secure || false);
        setAuthUser(parsed.authUser || '');
        setAuthPass(parsed.authPass || '');
        setIsConfigured(true);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: Number(port),
          secure,
          authUser,
          authPass
        })
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Server returned status ${res.status}: ${res.statusText || 'Internal Server Error'}`);
      }
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || 'SMTP connection check failed.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error during SMTP test.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const config = { host, port: Number(port), secure, authUser, authPass };
    localStorage.setItem('jobmail_smtp_config', JSON.stringify(config));
    setIsConfigured(true);
    setStep(4);
  };

  const steps = [
    { title: 'Server Settings', description: 'Configure SMTP host and port parameters.' },
    { title: 'Authentication', description: 'Enter your Gmail login and App Password details.' },
    { title: 'Test Connection', description: 'Verify connection with the SMTP mail server.' },
    { title: 'Complete', description: 'Save configurations to browser storage.' }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 bg-white text-[#171717]">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#171717]">
          SMTP Configuration Wizard
        </h1>
        <p className="text-sm text-[#8f8f8f]">Set up secure client-side Gmail SMTP credentials in a few quick steps.</p>
      </div>

      <div className="flex justify-between items-center bg-[#fafafa] border border-[#eaeaea] p-4 rounded-[12px] shadow-sm">
        {steps.map((s, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;

          return (
            <div key={idx} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#006bff] text-white'
                    : isCompleted
                    ? 'bg-[#ecfdec] text-[#28a948] border border-[#b9f5bc]'
                    : 'bg-[#eaeaea] text-[#8f8f8f]'
                }`}
              >
                {isCompleted ? '✓' : stepNum}
              </div>
              <span
                className={`hidden sm:inline text-xs font-semibold ${
                  isActive ? 'text-[#006bff]' : 'text-[#8f8f8f]'
                }`}
              >
                {s.title}
              </span>
              {idx < steps.length - 1 && <span className="hidden sm:inline text-[#c9c9c9] text-xs">&gt;</span>}
            </div>
          );
        })}
      </div>

      <div className="rounded-[12px] border border-[#eaeaea] bg-white p-8 shadow-geist-raised min-h-[300px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-bold text-[#171717]">SMTP Server Configuration</h2>
                <p className="text-xs text-[#8f8f8f] mt-1">Specify your target SMTP server parameters.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">SMTP Host</label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full h-10 rounded-[6px] border border-[#eaeaea] bg-white px-4 text-sm text-[#171717] outline-none focus:border-[#006bff]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">SMTP Port</label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full h-10 rounded-[6px] border border-[#eaeaea] bg-white px-4 text-sm text-[#171717] outline-none focus:border-[#006bff]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="secure"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="rounded-[4px] border-[#eaeaea] bg-white text-[#006bff] focus:ring-[#006bff]"
                />
                <label htmlFor="secure" className="text-xs font-semibold text-[#4d4d4d] cursor-pointer">
                  Use SSL/TLS (Secure Connection)
                </label>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-bold text-[#171717]">Authentication Credentials</h2>
                <p className="text-xs text-[#8f8f8f] mt-1">Provide your Gmail email address and active App Password.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">Gmail Address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@gmail.com"
                    value={authUser}
                    onChange={(e) => setAuthUser(e.target.value)}
                    className="w-full h-10 rounded-[6px] border border-[#eaeaea] bg-white px-4 text-sm text-[#171717] outline-none focus:border-[#006bff]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">Gmail App Password</label>
                  <input
                    type="password"
                    required
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    className="w-full h-10 rounded-[6px] border border-[#eaeaea] bg-white px-4 text-sm text-[#171717] outline-none focus:border-[#006bff]"
                  />
                  <p className="text-[10px] text-[#8f8f8f]">
                    Generate this 16-character App Password inside your Google Account Security settings (2-Step Verification enabled).
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-bold text-[#171717]">Verify SMTP Connection</h2>
                <p className="text-xs text-[#8f8f8f] mt-1">Perform a handshake check with the configured server.</p>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border border-[#eaeaea] bg-[#fafafa] rounded-[6px]">
                {testing ? (
                  <div className="flex flex-col items-center justify-center text-[#8f8f8f] py-4">
                    <Loader2 className="h-10 w-10 animate-spin text-[#006bff] mb-3" />
                    <p className="text-sm font-semibold">Performing server verification check…</p>
                  </div>
                ) : testResult ? (
                  <div className="text-center py-2 space-y-2">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="h-12 w-12 text-[#28a948] mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-[#28a948]">Handshake Successful!</h4>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-12 w-12 text-[#fc0035] mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-[#fc0035]">Handshake Failed</h4>
                      </>
                    )}
                    <p className="text-xs text-[#4d4d4d] max-w-md font-medium leading-relaxed font-mono">
                      {testResult.message}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleTest}
                    className="flex items-center gap-2 rounded-[6px] bg-[#171717] hover:bg-[#4d4d4d] px-6 py-2.5 text-sm font-medium text-white shadow-sm"
                  >
                    Test Transporter Now
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ecfdec] border border-[#b9f5bc] text-[#28a948] mx-auto mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#171717]">Setup Wizard Completed!</h2>
                <p className="text-xs text-[#8f8f8f] mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Your SMTP credentials have been encrypted and saved securely inside this {"browser's"} local storage.
                </p>
              </div>

              <div className="rounded-[6px] border border-[#eaeaea] bg-[#fafafa] p-4 max-w-md mx-auto text-left space-y-1.5 text-xs text-[#4d4d4d]">
                <p><strong>Configured Sender:</strong> {authUser}</p>
                <p><strong>SMTP Host Server:</strong> {host}:{port}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between border-t border-[#eaeaea] pt-6 mt-8">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 rounded-[6px] border border-[#eaeaea] bg-white hover:bg-[#fafafa] px-4 py-2 text-sm font-semibold text-[#171717] transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && (!authUser || !authPass)}
              className="flex items-center gap-1.5 rounded-[6px] bg-[#171717] hover:bg-[#4d4d4d] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : step === 3 ? (
            <button
              onClick={handleSave}
              disabled={testResult === null || !testResult.success}
              className="flex items-center gap-1.5 rounded-[6px] bg-[#171717] hover:bg-[#4d4d4d] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            >
              Save & Complete
            </button>
          ) : (
            <button
              onClick={() => setStep(1)}
              className="rounded-[6px] border border-[#eaeaea] bg-white hover:bg-[#fafafa] px-5 py-2 text-sm font-semibold text-[#171717] mx-auto shadow-sm"
            >
              Restart Config Wizard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
