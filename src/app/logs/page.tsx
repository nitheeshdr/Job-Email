'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Search, Filter, Trash2, CheckCircle2, XCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [search, statusFilter]);

  const fetchLogs = () => {
    setLoading(true);
    const saved = localStorage.getItem('jobmail_logs');
    if (!saved) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      let list = JSON.parse(saved);

      if (search) {
        const query = search.toLowerCase();
        list = list.filter(
          (l: any) =>
            (l.companyName && l.companyName.toLowerCase().includes(query)) ||
            (l.email && l.email.toLowerCase().includes(query)) ||
            (l.subject && l.subject.toLowerCase().includes(query))
        );
      }

      if (statusFilter) {
        list = list.filter((l: any) => l.status === statusFilter);
      }

      setLogs(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = () => {
    if (!confirm('Are you sure you want to clear all execution logs? This cannot be undone.')) return;
    localStorage.removeItem('jobmail_logs');
    setLogs([]);
    setSelectedLog(null);
  };

  return (
    <div className="space-y-8 pb-12 bg-white text-[#171717]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#171717]">
            Email Delivery Logs
          </h1>
          <p className="text-sm text-[#8f8f8f]">Track granular details of sent, pending, and failed application letters.</p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 rounded-[6px] border border-[#ffd7d6] bg-white px-4 py-2.5 text-sm font-semibold text-[#fc0035] hover:bg-[#ffeeef] active:bg-[#ffe8ea] transition-all shadow-sm"
          >
            <Trash2 className="h-4 w-4" /> Clear Logs
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#8f8f8f]" />
          <input
            type="text"
            placeholder="Search logs by company, email or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-[6px] border border-[#eaeaea] bg-white py-2 pl-9 pr-4 text-sm text-[#171717] placeholder-gray-400 outline-none focus:border-[#006bff]"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-3 h-4 w-4 text-[#8f8f8f]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 appearance-none rounded-[6px] border border-[#eaeaea] bg-white py-2 pl-9 pr-4 text-sm text-[#171717] outline-none focus:border-[#006bff] cursor-pointer"
          >
            <option value="">All Logs</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-raised">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#8f8f8f]">
            <Loader2 className="h-8 w-8 animate-spin text-[#006bff] mb-2" />
            <p className="text-sm">Loading delivery logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#8f8f8f]">
            <FileText className="h-10 w-10 text-[#c9c9c9] mb-2" />
            <p className="text-sm">No email logs found matching search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-[#171717]">
              <thead className="border-b border-[#eaeaea] bg-[#fafafa] text-xs font-semibold text-[#8f8f8f]">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Recipient Email</th>
                  <th className="px-4 py-3">Email Subject</th>
                  <th className="px-4 py-3">Time Sent</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eaeaea]">
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-[#fafafa] cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 text-[#28a948] font-semibold text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#fc0035] font-semibold text-xs">
                          <XCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#171717]">{log.companyName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#4d4d4d]">{log.email}</td>
                    <td className="px-4 py-3 text-[#4d4d4d] max-w-xs truncate">{log.subject}</td>
                    <td className="px-4 py-3 text-[#4d4d4d] text-xs whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight className="h-4 w-4 text-[#8f8f8f] group-hover:text-[#006bff] group-hover:translate-x-1 transition-all inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl rounded-[12px] border border-[#eaeaea] bg-white p-6 shadow-geist-modal overflow-y-auto max-h-[85vh] z-10 text-[#171717]"
            >
              <div className="flex items-center justify-between border-b border-[#eaeaea] pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#171717]">Email Details</h3>
                  <p className="text-xs text-[#8f8f8f] mt-1">
                    Sent to: <span className="font-mono text-[#006bff] font-semibold">{selectedLog.email}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-[6px] border border-[#eaeaea] bg-white hover:bg-[#fafafa] active:bg-[#f2f2f2] px-3 py-1.5 text-xs font-semibold text-[#171717] transition-all shadow-sm"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#8f8f8f] font-semibold uppercase tracking-wider block font-mono">Company Name</span>
                    <span className="text-[#171717] font-semibold block mt-0.5">{selectedLog.companyName}</span>
                  </div>
                  <div>
                    <span className="text-[#8f8f8f] font-semibold uppercase tracking-wider block font-mono">Time Sent</span>
                    <span className="text-[#171717] font-semibold block mt-0.5">
                      {new Date(selectedLog.sentAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedLog.status === 'failed' && (
                  <div className="rounded-[6px] border border-[#ffd7d6] bg-[#ffeeef] p-4 text-xs text-[#fc0035]">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <AlertCircle className="h-4 w-4 shrink-0 text-[#ea001d]" />
                      SMTP Error Code / Cause:
                    </div>
                    <p className="font-mono">{selectedLog.error || 'SMTP delivery failed.'}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-[#8f8f8f] uppercase tracking-wider font-mono">Subject Line</span>
                  <div className="rounded-[6px] border border-[#eaeaea] bg-[#fafafa] p-3 text-sm text-[#171717] font-medium">
                    {selectedLog.subject}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-[#8f8f8f] uppercase tracking-wider font-mono">Message Content</span>
                  <div className="rounded-[6px] border border-[#eaeaea] bg-[#fafafa] p-4 text-sm text-[#4d4d4d] font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                    {selectedLog.body}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
