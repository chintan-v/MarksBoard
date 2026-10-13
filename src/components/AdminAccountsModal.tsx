import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  Search,
  Database,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { getAdminAccountsListAsync } from '../utils/storage';
import { isSupabaseConfigured } from '../utils/supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminAccountsModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<{
    isCloud: boolean;
    totalCount: number;
    errorMessage?: string;
    accounts: {
      usn: string;
      name: string;
      branch?: string;
      currentSemester?: number;
      createdAt?: string;
    }[];
  }>({
    isCloud: isSupabaseConfigured,
    totalCount: 0,
    accounts: [],
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const result = await getAdminAccountsListAsync();
      setData(result);
    } catch (err) {
      console.error('Failed to load accounts list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      fetchAccounts();
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAccounts = data.accounts.filter(
    (acc) =>
      acc.usn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.branch && acc.branch.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopyAllUsns = () => {
    if (data.accounts.length === 0) return;
    const usnList = data.accounts.map((a) => a.usn).join(', ');
    navigator.clipboard.writeText(usnList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden bg-slate-900/95 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-heading text-white">
                  Student Accounts Directory
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                View total accounts created and registered student USNs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Stats Bar */}
        <div className="px-6 py-4 bg-black/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            {/* Total Accounts Count Badge */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Total Accounts:</span>
              <span className="text-base font-bold font-mono text-cyan-400 px-2.5 py-0.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                {data.totalCount}
              </span>
            </div>

            {/* Storage Mode */}
            <div className="flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              {data.isCloud ? (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Supabase Cloud (Multi-device)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Local Device Storage
                </span>
              )}
            </div>
          </div>

          {/* Action buttons: Copy & Refresh */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllUsns}
              disabled={data.accounts.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-40"
              title="Copy all USNs to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy USNs</span>
                </>
              )}
            </button>

            <button
              onClick={fetchAccounts}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-semibold transition-all"
              title="Refresh accounts list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Supabase Error / Status Notice */}
        {data.errorMessage && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-3 shadow-lg animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold text-rose-100 flex items-center gap-2">
                <span>Supabase Database Error:</span>
                <span className="font-mono text-[11px] text-rose-300 px-2 py-0.5 rounded bg-black/40 border border-rose-500/30">
                  {data.errorMessage}
                </span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                {data.errorMessage.toLowerCase().includes('student_profiles') ||
                data.errorMessage.toLowerCase().includes('does not exist')
                  ? 'Your Supabase project is connected, but the "student_profiles" table has NOT been created yet! Please go to your Supabase Dashboard → SQL Editor, paste the code from "supabase-schema.sql", and click Run.'
                  : 'Unable to query Supabase cloud. Showing accounts saved locally on this browser.'}
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b border-white/5 bg-slate-900/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student USN or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Accounts List Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Loading registered student accounts...</span>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">
                {searchQuery ? 'No matching student accounts found' : 'No registered accounts yet'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'Try searching with a different USN or name.'
                  : 'Accounts created by students will automatically show up here with their USN numbers.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-12 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="col-span-4">Student USN</span>
                <span className="col-span-4">Name</span>
                <span className="col-span-2">Branch / Sem</span>
                <span className="col-span-2 text-right">Created</span>
              </div>

              {filteredAccounts.map((acc, idx) => (
                <div
                  key={acc.usn}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-2 sm:gap-4 transition-all"
                >
                  {/* USN with Monospace chip */}
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[11px] w-5 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 tracking-wider">
                      {acc.usn}
                    </span>
                  </div>

                  {/* Student Name */}
                  <div className="sm:col-span-4">
                    <span className="font-semibold text-xs text-white block truncate">
                      {acc.name}
                    </span>
                  </div>

                  {/* Branch & Semester */}
                  <div className="sm:col-span-2 text-[11px] text-slate-400">
                    {acc.currentSemester ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono mr-1.5">
                        Sem {acc.currentSemester}
                      </span>
                    ) : null}
                    <span className="truncate block sm:inline text-[10px] text-slate-400">
                      {acc.branch ? acc.branch.split(' ')[0] : 'Engineering'}
                    </span>
                  </div>

                  {/* Date Created */}
                  <div className="sm:col-span-2 text-right text-[10px] text-slate-500 font-mono w-full sm:w-auto">
                    {acc.createdAt
                      ? new Date(acc.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Saved'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info notice */}
        <div className="p-4 bg-black/40 border-t border-white/10 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Student passwords and personal marks are securely managed and isolated per account.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors ml-auto"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
