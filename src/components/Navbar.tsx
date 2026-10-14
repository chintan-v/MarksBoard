import React from 'react';
import {
  Award,
  Layers,
  FileText,
  Lock,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import type { StudentProfile } from '../types';

interface Props {
  profile: StudentProfile;
  activeSemesterNum: number;
  isOverviewActive: boolean;
  onSelectOverview: () => void;
  onSelectSemester: (semNum: number) => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onOpenGradingScale: () => void;
  onOpenGradeCard: () => void;
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'guest';
  onManualSync?: () => void;
}

export const Navbar: React.FC<Props> = ({
  profile,
  activeSemesterNum,
  isOverviewActive,
  onSelectOverview,
  onSelectSemester,
  onOpenProfile,
  onOpenAuth,
  onOpenGradingScale,
  onOpenGradeCard,
  syncStatus = 'synced',
  onManualSync,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-14 h-20 flex items-center justify-between gap-4">
        {/* Left: Brand & Institution */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSelectOverview}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 font-heading">
                ⚡
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight font-heading text-white group-hover:text-purple-300 transition-colors">
                  MarksBoard
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  ENGG
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-none font-medium">
                {profile.college}
              </div>
            </div>
          </button>
        </div>

        {/* Center: Interactive Semester Quick-Jump Navigation (No greetings clutter!) */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md overflow-x-auto">
          <button
            type="button"
            onClick={onSelectOverview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isOverviewActive
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
            const isActive = !isOverviewActive && activeSemesterNum === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelectSemester(num)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-600/30 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                S{num}
              </button>
            );
          })}
        </div>

        {/* Right: Tools & Profile Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Grading Scale */}
          <button
            type="button"
            onClick={onOpenGradingScale}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5"
            title="View DSU 10-Point CBCS Grading Scale"
          >
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Grading Scale</span>
          </button>

          {/* Transcript / Grade Card */}
          <button
            type="button"
            onClick={onOpenGradeCard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5"
            title="Print Official Grade Card & Summary"
          >
            <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="hidden sm:inline">Grade Sheet</span>
          </button>

          {/* Cloud Database Sync Status */}
          {syncStatus === 'syncing' ? (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 animate-pulse"
              title="Syncing latest marks & semester changes to Supabase Cloud..."
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="hidden md:inline">Syncing...</span>
            </div>
          ) : syncStatus === 'synced' ? (
            <button
              type="button"
              onClick={onManualSync}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
              title="All semester marks saved to Supabase Cloud database! Click to re-check latest data."
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Cloud Synced</span>
            </button>
          ) : syncStatus === 'offline' ? (
            <button
              type="button"
              onClick={onManualSync}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
              title="Cloud sync unreachable. Click to retry connecting to Supabase."
            >
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Retry Sync</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
              title="Guest Mode: Saved on this device only. Sign in to sync across other devices!"
            >
              <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Local Only</span>
            </button>
          )}

          {/* Profile & Avatar */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-lg overflow-hidden shrink-0">
              {profile.avatar.startsWith('http') ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{profile.avatar}</span>
              )}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors leading-tight">
                {profile.name}
              </div>
              <div className="text-[10px] font-mono text-slate-400 leading-tight">
                {profile.usn}
              </div>
            </div>
          </button>

          {/* Switch Account */}
          <button
            type="button"
            onClick={onOpenAuth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Switch Account / Sign In with USN"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
