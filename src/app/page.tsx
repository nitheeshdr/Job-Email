'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Settings, CheckCircle2, AlertCircle, Loader2, Upload, FileText, Send, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EmailEditorPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testingSMTP, setTestingSMTP] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [feedback, setFeedback] = useState({ type: '' as 'success' | 'error' | '', message: '' });

  // Preview lead loaded dynamically from the Excel cache list
  const [previewLead, setPreviewLead] = useState<any>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);

  const mockCompany = {
    name: 'Stripe',
    role: 'Frontend Developer',
    email: 'hiring@stripe.com',
    customFields: {} as any
  };

  useEffect(() => {
    const saved = localStorage.getItem('jobmail_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSubject(parsed.subject || '');
        setBody(parsed.body || '');
      } catch (err) {
        console.error(err);
      }
    } else {
      setSubject('Application for {{role}} position at {{company}}');
      setBody('Dear Hiring Team,\n\nI am writing to express my interest in the {{role}} role at {{company}}.\n\nBest regards,\nJob Seeker');
    }

    fetchResumeStatus();
    fetchPreviewLead(0);
  }, []);

  const fetchPreviewLead = async (index: number) => {
    try {
      const res = await fetch(`/api/companies/excel?page=${index + 1}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.leads && data.leads.length > 0) {
          setPreviewLead(data.leads[0]);
          setExcelHeaders(data.headers || []);
          setTotalLeads(data.total || 0);
        }
      }
    } catch (err) {
      console.error(err);
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

  const saveTemplateLocal = (newSubject: string, newBody: string) => {
    localStorage.setItem('jobmail_templates', JSON.stringify({ subject: newSubject, body: newBody }));
  };

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    saveTemplateLocal(val, body);
  };

  const handleBodyChange = (val: string) => {
    setBody(val);
    saveTemplateLocal(subject, val);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFeedback({ type: '', message: '' });
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHasResume(true);
        setResumeName(data.resumeName);
        setFeedback({ type: 'success', message: 'Resume uploaded successfully!' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to upload resume.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error uploading file.' });
    } finally {
      setUploading(false);
    }
  };

  const getSMTPConfig = () => {
    const saved = localStorage.getItem('jobmail_smtp_config');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (err) {
      return null;
    }
  };

  const handleTestSMTP = async () => {
    const smtpConfig = getSMTPConfig();
    if (!smtpConfig) {
      setFeedback({ type: 'error', message: 'SMTP is not configured. Please complete the setup in SMTP Config tab.' });
      return;
    }

    setTestingSMTP(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig)
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Server returned status ${res.status}: ${res.statusText || 'Internal Server Error'}`);
      }
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: 'SMTP credentials verified successfully!' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'SMTP Connection failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error testing SMTP.' });
    } finally {
      setTestingSMTP(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const smtpConfig = getSMTPConfig();
    if (!smtpConfig) {
      setFeedback({ type: 'error', message: 'SMTP is not configured. Setup credentials first.' });
      setShowTestEmailModal(false);
      return;
    }

    setSendingTest(true);
    setFeedback({ type: '', message: '' });

    const interpolatedSubject = interpolate(subject);
    const interpolatedBody = interpolate(body);

    try {
      const res = await fetch('/api/smtp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig,
          to: testEmailRecipient,
          subject: interpolatedSubject,
          text: interpolatedBody,
          attachResume: hasResume
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: `Test email successfully sent to ${testEmailRecipient}!` });
        setShowTestEmailModal(false);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to deliver test email.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error sending test email.' });
    } finally {
      setSendingTest(false);
    }
  };

  const interpolate = (text: string) => {
    let result = text;
    const target = previewLead || mockCompany;
    
    // Resolve company name fallback
    const compName = target.name && target.name.trim() !== '' && target.name.toLowerCase() !== 'unknown' && target.name.toLowerCase() !== 'false'
      ? target.name
      : 'Your Company';

    // Standard placeholders
    result = result.replace(/\{\{companyName\}\}/g, compName);
    result = result.replace(/\{\{company\}\}/g, compName);
    result = result.replace(/\{\{role\}\}/g, target.role || '');
    result = result.replace(/\{\{email\}\}/g, target.email || '');

    // Custom Excel columns placeholders
    if (target.customFields) {
      Object.keys(target.customFields).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, target.customFields[key] || '');
      });
    }
    
    // Clean remaining unresolved tags
    result = result.replace(/\{\{[^}]+\}\}/g, '');
    return result;
  };

  const variables = [
    '{{company}}',
    '{{role}}',
    '{{email}}',
    ...excelHeaders.map(h => `{{${h}}}`)
  ];

  return (
    <div className="space-y-8 pb-12 bg-white text-[#171717]">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#171717]">
          Email Template Workspace
        </h1>
        <p className="text-sm text-[#8f8f8f]">Design cover letters, upload resume attachments, and test connection utilities.</p>
      </div>

      {feedback.message && (
        <div
          className={`rounded-[6px] p-4 text-sm border ${
            feedback.type === 'success'
              ? 'border-[#b9f5bc] bg-[#ecfdec] text-[#28a948]'
              : 'border-[#ffd7d6] bg-[#ffeeef] text-[#fc0035]'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4.5 w-4.5" />
            ) : (
              <AlertCircle className="h-4.5 w-4.5" />
            )}
            <span>{feedback.type === 'success' ? 'Task Completed' : 'Task Error'}</span>
          </div>
          <p className="mt-1">{feedback.message}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-raised space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#171717] flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#006bff]" /> Editor Pane
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestSMTP}
                disabled={testingSMTP}
                className="flex items-center gap-1.5 rounded-[6px] border border-[#eaeaea] bg-white hover:bg-[#fafafa] px-3 py-1.5 text-xs font-semibold text-[#171717] transition-all shadow-sm disabled:opacity-50"
              >
                {testingSMTP ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Settings className="h-3.5 w-3.5" />
                )}
                Test SMTP
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeedback({ type: '', message: '' });
                  setShowTestEmailModal(true);
                }}
                className="flex items-center gap-1.5 rounded-[6px] bg-[#171717] hover:bg-[#4d4d4d] px-3 py-1.5 text-xs font-semibold text-white shadow-sm active:scale-99 transition-all"
              >
                <Send className="h-3.5 w-3.5" /> Test Email
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                placeholder="Application for {{role}} position at {{company}}"
                className="w-full h-10 rounded-[6px] border border-[#eaeaea] bg-white px-4 text-sm text-[#171717] placeholder-gray-400 outline-none focus:border-[#006bff]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">Body</label>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-[#8f8f8f] max-w-[70%]">
                  Placeholders (click to copy):
                  {variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(v);
                      }}
                      className="font-mono text-[#006bff] hover:underline"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={12}
                required
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Dear Hiring Team,..."
                className="w-full rounded-[6px] border border-[#eaeaea] bg-white p-4 text-sm text-[#171717] placeholder-gray-400 outline-none focus:border-[#006bff]"
              />
            </div>

            <div className="border border-[#eaeaea] bg-[#fafafa] rounded-[6px] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-[#006bff]" />
                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    {hasResume ? resumeName || 'resume.pdf' : 'No resume uploaded'}
                  </p>
                  <p className="text-xs text-[#8f8f8f]">
                    {hasResume ? 'Successfully attached' : 'Attach PDF to outgoing job mails'}
                  </p>
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-[#eaeaea] bg-white hover:bg-[#fafafa] px-3.5 py-2 text-xs font-semibold text-[#171717] shadow-sm transition-all">
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Upload PDF
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-raised flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-[#8f8f8f] uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-[#006bff]" /> 
              {previewLead ? (
                <span>Live Preview (Lead: <span className="text-[#171717] font-semibold">{previewLead.name}</span>)</span>
              ) : (
                <span>Live Preview Pane (Mock Template)</span>
              )}
            </h2>
            
            {totalLeads > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={previewIndex <= 0}
                  onClick={() => {
                    const nextIdx = previewIndex - 1;
                    setPreviewIndex(nextIdx);
                    fetchPreviewLead(nextIdx);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[#eaeaea] bg-white text-[#4d4d4d] hover:text-[#171717] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-bold text-[#4d4d4d] select-none">
                  {previewIndex + 1} / {totalLeads}
                </span>
                <button
                  type="button"
                  disabled={previewIndex >= totalLeads - 1}
                  onClick={() => {
                    const nextIdx = previewIndex + 1;
                    setPreviewIndex(nextIdx);
                    fetchPreviewLead(nextIdx);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[#eaeaea] bg-white text-[#4d4d4d] hover:text-[#171717] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 rounded-[6px] border border-[#eaeaea] bg-[#fafafa] p-4 overflow-y-auto space-y-4 font-sans text-xs text-[#171717]">
            <div className="border-b border-[#eaeaea] pb-3">
              <p className="text-[#8f8f8f] font-semibold font-mono uppercase tracking-wide">Subject Line:</p>
              <p className="text-[#171717] mt-1 font-bold text-sm">
                {subject ? interpolate(subject) : 'Enter template subject to preview…'}
              </p>
            </div>
            <div>
              <p className="text-[#8f8f8f] font-semibold font-mono uppercase tracking-wide">Message Content:</p>
              <p className="text-[#4d4d4d] mt-2 whitespace-pre-wrap leading-relaxed">
                {body ? interpolate(body) : 'Enter template body to preview…'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showTestEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm" onClick={() => setShowTestEmailModal(false)} />
          <div className="relative w-full max-w-md rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-modal z-10 text-[#171717]">
            <h3 className="text-lg font-bold text-[#171717] mb-2">Send Test Email</h3>
            <p className="text-xs text-[#8f8f8f] mb-4">
              Enter an email address to test the SMTP configurations and template layout.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">Recipient Email</label>
                <input
                  type="email"
                  required
                  placeholder="your-email@example.com"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="w-full h-10 rounded-[6px] border border-[#eaeaea] bg-white px-4 text-sm text-[#171717] placeholder-gray-400 outline-none focus:border-[#006bff]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestEmailModal(false)}
                  className="rounded-[6px] border border-[#eaeaea] bg-white px-4 py-2 text-xs font-semibold text-[#171717] hover:bg-[#fafafa] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="flex items-center gap-1.5 rounded-[6px] bg-[#171717] hover:bg-[#4d4d4d] px-4 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
                >
                  {sendingTest && <Loader2 className="h-3 w-3 animate-spin" />}
                  Send Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
