'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0, sending: 0, verified: 0, invalid: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [hasResume, setHasResume] = useState(false);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [feedback, setFeedback] = useState({ type: '' as 'success' | 'error' | '', message: '' });

  const isRunningRef = useRef(false);

  useEffect(() => {
    loadLocalData();
    fetchResumeStatus();
  }, []);

  const loadLocalData = async () => {
    try {
      // Query server for the total count of Excel leads quickly
      const res = await fetch('/api/companies/excel?limit=1');
      if (!res.ok) {
        throw new Error('Excel server not reachable.');
      }
      const data = await res.json();
      const total = data.total;

      const selectedSet = new Set(JSON.parse(localStorage.getItem('jobmail_selected_leads') || '[]'));
      const statusMap = JSON.parse(localStorage.getItem('jobmail_leads_status') || '{}');
      const statusValues = Object.values(statusMap) as any[];

      const sent = statusValues.filter(s => s.status === 'sent').length;
      const failed = statusValues.filter(s => s.status === 'failed').length;
      const invalid = statusValues.filter(s => s.status === 'invalid').length;
      const verified = statusValues.filter(s => s.status === 'verified').length;
      const sending = statusValues.filter(s => s.status === 'sending').length;

      // Campaign target calculations (selected targets only, unchecked by default)
      const totalSelected = selectedSet.size;
      const pending = Math.max(0, totalSelected - sent - failed - invalid);

      setStats({
        total,
        sent,
        failed,
        pending,
        verified,
        invalid,
        sending
      });
    } catch (err) {
      console.error(err);
    }

    const savedLogs = localStorage.getItem('jobmail_logs');
    if (savedLogs) {
      try {
        const logs = JSON.parse(savedLogs);
        setRecentLogs(logs.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchResumeStatus = async () => {
    try {
      const res = await fetch('/api/resume/upload');
      if (res.ok) {
        const data = await res.json();
        setHasResume(data.hasResume);
        setResumeName(data.resumeName);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const startQueue = async () => {
    if (isRunning) return;

    const smtpSaved = localStorage.getItem('jobmail_smtp_config');
    if (!smtpSaved) {
      setFeedback({ type: 'error', message: 'SMTP is not configured. Please complete configurations in the SMTP Config page first.' });
      return;
    }
    const smtpConfig = JSON.parse(smtpSaved);

    const templateSaved = localStorage.getItem('jobmail_templates');
    if (!templateSaved) {
      setFeedback({ type: 'error', message: 'No email template found. Please create one on the Email Editor page first.' });
      return;
    }
    const template = JSON.parse(templateSaved);

    setFeedback({ type: '', message: '' });
    setCurrentEmail('Fetching campaign leads…');

    try {
      // Fetch full campaign list from server
      const leadsRes = await fetch('/api/companies/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (!leadsRes.ok) {
        throw new Error('Failed to load list from Excel spreadsheet.');
      }
      const data = await leadsRes.json();
      const rawLeads = data.leads || [];

      if (rawLeads.length === 0) {
        setFeedback({ type: 'error', message: 'Excel spreadsheet leads list is empty.' });
        setCurrentEmail(null);
        return;
      }

      setIsRunning(true);
      isRunningRef.current = true;
      setCurrentEmail(null);

      for (let i = 0; i < rawLeads.length; i++) {
        if (!isRunningRef.current) break;

        const lead = rawLeads[i];
        
        // Compute active selection and status from client diffs
        const selectedSet = new Set(JSON.parse(localStorage.getItem('jobmail_selected_leads') || '[]'));
        const statusMap = JSON.parse(localStorage.getItem('jobmail_leads_status') || '{}');
        
        const isSelected = selectedSet.has(lead.email); // true only if explicitly checked
        const status = statusMap[lead.email]?.status || 'pending';

        if (isSelected && (status === 'pending' || status === 'verified')) {
          setCurrentEmail(lead.email);
          
          // Mark as sending
          statusMap[lead.email] = { status: 'sending' };
          localStorage.setItem('jobmail_leads_status', JSON.stringify(statusMap));
          await loadLocalData();

          const interpolatedSubject = interpolate(template.subject, lead);
          const interpolatedBody = interpolate(template.body, lead);

          try {
            const sendRes = await fetch('/api/smtp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                smtpConfig,
                to: lead.email,
                subject: interpolatedSubject,
                text: interpolatedBody,
                attachResume: hasResume,
              }),
            });
            const sendData = await sendRes.json();

            const currentStatusMap = JSON.parse(localStorage.getItem('jobmail_leads_status') || '{}');
            if (sendRes.ok && sendData.success) {
              currentStatusMap[lead.email] = { status: 'sent', sentAt: new Date().toISOString() };
              writeLog(lead.name, lead.email, interpolatedSubject, interpolatedBody, 'sent');
            } else {
              currentStatusMap[lead.email] = { status: 'failed', error: sendData.error || 'SMTP delivery failed.' };
              writeLog(lead.name, lead.email, interpolatedSubject, interpolatedBody, 'failed', sendData.error);
            }
            localStorage.setItem('jobmail_leads_status', JSON.stringify(currentStatusMap));
          } catch (err: any) {
            const currentStatusMap = JSON.parse(localStorage.getItem('jobmail_leads_status') || '{}');
            currentStatusMap[lead.email] = { status: 'failed', error: err.message || 'Network error.' };
            localStorage.setItem('jobmail_leads_status', JSON.stringify(currentStatusMap));
            writeLog(lead.name, lead.email, interpolatedSubject, interpolatedBody, 'failed', err.message);
          }

          await loadLocalData();
          setCurrentEmail(null);

          if (isRunningRef.current) {
            await sleep(delaySeconds * 1000);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Error executing queue.' });
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
      setCurrentEmail(null);
    }
  };

  const pauseQueue = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setCurrentEmail(null);
  };

  const retryFailed = async () => {
    try {
      const statusMap = JSON.parse(localStorage.getItem('jobmail_leads_status') || '{}');
      Object.keys(statusMap).forEach((email) => {
        if (statusMap[email].status === 'failed') {
          delete statusMap[email];
        }
      });
      localStorage.setItem('jobmail_leads_status', JSON.stringify(statusMap));
      await loadLocalData();
      startQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const interpolate = (text: string, company: any) => {
    let result = text;
    
    // Resolve company name fallback
    const compName = company.name && company.name.trim() !== '' && company.name.toLowerCase() !== 'unknown' && company.name.toLowerCase() !== 'false'
      ? company.name
      : 'Your Company';

    // Standard properties
    result = result.replace(/\{\{company\}\}/g, compName);
    result = result.replace(/\{\{companyName\}\}/g, compName);
    result = result.replace(/\{\{email\}\}/g, company.email || '');
    result = result.replace(/\{\{role\}\}/g, company.role || '');
    // Custom spreadsheet columns
    if (company.customFields) {
      Object.keys(company.customFields).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, company.customFields[key] || '');
      });
    }
    result = result.replace(/\{\{[^}]+\}\}/g, '');
    return result;
  };

  const writeLog = (companyName: string, email: string, subject: string, body: string, status: 'sent' | 'failed', error?: string) => {
    const logsSaved = localStorage.getItem('jobmail_logs');
    let logs = [];
    if (logsSaved) {
      try {
        logs = JSON.parse(logsSaved);
      } catch (err) {
        logs = [];
      }
    }
    const newLog = {
      _id: Date.now().toString(),
      companyName,
      email,
      subject,
      body,
      status,
      error,
      sentAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem('jobmail_logs', JSON.stringify(logs));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setHasResume(true);
        setResumeName(data.resumeName);
      } else {
        alert('Failed to upload resume');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingResume(false);
    }
  };

  const progressPercentage = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

  return (
    <div className="space-y-8 pb-12 bg-white text-[#171717]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#171717]">
            Cockpit Dashboard
          </h1>
          <p className="text-sm text-[#8f8f8f]">Monitor and control your job applications pipeline.</p>
        </div>
        <button
          onClick={loadLocalData}
          className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#eaeaea] bg-white hover:bg-[#fafafa] active:bg-[#f2f2f2] transition-all text-[#4d4d4d] hover:text-[#171717] shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {feedback.message && (
        <div className="rounded-[6px] border border-[#ffd7d6] bg-[#ffeeef] p-4 text-xs text-[#fc0035] flex items-center gap-1.5 font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#ea001d]" />
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'Total Leads', value: stats.total, color: 'text-[#171717]' },
          { label: 'Verified MX', value: stats.verified, color: 'text-[#28a948]' },
          { label: 'Sent', value: stats.sent, color: 'text-[#006bff]' },
          { label: 'Failed', value: stats.failed, color: 'text-[#fc0035]' },
          { label: 'Pending', value: stats.pending, color: 'text-[#ffa600]' },
          { label: 'Invalid Syntax/MX', value: stats.invalid, color: 'text-[#8f8f8f]' },
        ].map((stat, i) => (
          <div key={i} className="rounded-[12px] border border-[#eaeaea] bg-white p-4 shadow-geist-raised">
            <p className="text-xs font-semibold text-[#8f8f8f] uppercase tracking-wider">{stat.label}</p>
            <p className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-raised">
            <h2 className="text-lg font-bold text-[#171717] mb-4">Pipeline Queue Controls</h2>
            
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-[#28a948] animate-pulse' : 'bg-[#ffa600]'}`} />
                  <span className="text-sm font-semibold text-[#171717]">
                    Queue Status: {isRunning ? 'Processing…' : 'Paused'}
                  </span>
                </div>
                {currentEmail && (
                  <p className="text-xs text-[#8f8f8f] mt-1 font-medium">
                    Sending to: <span className="text-[#006bff] font-mono font-semibold">{currentEmail}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#4d4d4d]">Delay (seconds):</label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={delaySeconds}
                  disabled={isRunning}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-20 h-10 rounded-[6px] border border-[#eaeaea] bg-white text-center text-sm text-[#171717] outline-none focus:border-[#006bff] disabled:opacity-50"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {!isRunning ? (
                  <button
                    onClick={startQueue}
                    disabled={stats.pending === 0}
                    className="flex items-center gap-2 rounded-[6px] bg-[#171717] hover:bg-[#4d4d4d] px-4 py-2.5 text-sm font-medium text-white shadow-sm active:scale-99 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Play className="h-4 w-4" /> Start Queue
                  </button>
                ) : (
                  <button
                    onClick={pauseQueue}
                    className="flex items-center gap-2 rounded-[6px] border border-[#eaeaea] bg-white px-4 py-2.5 text-sm font-medium text-[#171717] shadow-sm hover:bg-[#fafafa] active:bg-[#f2f2f2] transition-all"
                  >
                    <Pause className="h-4 w-4" /> Pause Queue
                  </button>
                )}

                <button
                  onClick={retryFailed}
                  disabled={stats.failed === 0 || isRunning}
                  className="flex items-center gap-2 rounded-[6px] border border-[#eaeaea] bg-white hover:bg-[#fafafa] px-4 py-2.5 text-sm font-medium text-[#4d4d4d] hover:text-[#171717] transition-all active:scale-99 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Retry Failed
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs text-[#8f8f8f] font-semibold">
                <span>Sending Progress</span>
                <span>{stats.sent} / {stats.total} Sent ({progressPercentage}%)</span>
              </div>
              <div className="h-2 w-full bg-[#f2f2f2] border border-[#eaeaea] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-[#006bff] rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-raised">
            <h2 className="text-lg font-bold text-[#171717] mb-4">Recent Delivery Activity</h2>
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-[#8f8f8f]">
                <p className="text-sm italic">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f2f2f2]">
                {recentLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">{log.companyName}</p>
                      <p className="text-xs text-[#8f8f8f] mt-0.5">{log.email} • {log.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#8f8f8f]">
                        {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {log.status === 'sent' ? (
                        <CheckCircle2 className="h-4 w-4 text-[#28a948]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#fc0035]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-raised">
            <h2 className="text-lg font-bold text-[#171717] mb-4">Resume Asset</h2>
            <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#c9c9c9] bg-[#fafafa] p-6 text-center">
              {hasResume ? (
                <>
                  <FileText className="h-10 w-10 text-[#006bff] mb-2" />
                  <p className="text-sm font-semibold text-[#171717] max-w-full truncate px-2">
                    {resumeName || 'resume.pdf'}
                  </p>
                  <p className="text-xs text-[#28a948] font-semibold mt-1">Ready to attach</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-[#8f8f8f] mb-2" />
                  <p className="text-sm font-semibold text-[#4d4d4d]">No resume uploaded</p>
                  <p className="text-xs text-[#8f8f8f] mt-1">Upload PDF for application attachments</p>
                </>
              )}

              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#eaeaea] bg-white hover:bg-[#fafafa] active:bg-[#f2f2f2] px-4 py-2 text-xs font-semibold text-[#171717] transition-all shadow-sm">
                {uploadingResume ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {hasResume ? 'Replace PDF' : 'Upload Resume'}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  disabled={uploadingResume}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-raised">
            <h2 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-[#006bff]" />
              Quick Setup Guide
            </h2>
            <ul className="text-xs text-[#4d4d4d] space-y-2.5 list-disc pl-4 leading-relaxed">
              <li>Configure credentials in **SMTP Config** page using a Gmail App Password.</li>
              <li>Write a template with placeholders like {"`{{companyName}}`"} in **Templates**.</li>
              <li>Go to **Companies** and see the parsed Excel sheet.</li>
              <li>Once verified, click **Start Queue** here in the dashboard to begin automated sequences!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
