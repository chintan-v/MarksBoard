import React from 'react';
import {
  Award,
  Layers,
  FileText,
  Calendar,
  Lock,
  Cloud,
  CloudOff,
  RefreshCw,
  Sun,
  Moon,
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
  onOpenAttendance?: () => void;
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'guest';
  onManualSync?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
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
  onOpenAttendance,
  syncStatus = 'synced',
  onManualSync,
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[#F4EDE0]/15 bg-[#14213D]/80 backdrop-blur-2xl">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-14 h-20 flex items-center justify-between gap-4">
        {/* Left: Brand & Institution */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSelectOverview}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#14213D] via-[#243864] to-[#F4EDE0]/40 p-0.5 shadow-lg shadow-black/40 group-hover:scale-105 transition-transform shrink-0 border border-[#F4EDE0]/20">
              <div className="w-full h-full bg-[#14213D] rounded-[14px] flex items-center justify-center font-bold text-lg text-[#F4EDE0] font-heading shadow-inner">
                ⚡
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight font-heading text-[#F4EDE0] group-hover:text-white transition-colors">
                  MarksBoard
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/30 shadow-xs">
                  ENGG
                </span>
              </div>
              <div className="text-[11px] text-[#F4EDE0]/65 truncate max-w-[180px] sm:max-w-none font-medium">
                {profile.college}
              </div>
            </div>
          </button>
        </div>

        {/* Center: Interactive Semester Quick-Jump Navigation */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-[#090e1a]/70 border border-[#F4EDE0]/12 backdrop-blur-md overflow-x-auto shadow-inner">
          <button
            type="button"
            onClick={onSelectOverview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isOverviewActive
                ? 'bg-[#F4EDE0] text-[#14213D] font-bold shadow-md shadow-black/30'
                : 'text-[#F4EDE0]/70 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <div className="h-4 w-px bg-[#F4EDE0]/15 mx-1" />

          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
            const isActive = !isOverviewActive && activeSemesterNum === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelectSemester(num)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#F4EDE0] text-[#14213D] shadow-md shadow-black/30 scale-105'
                    : 'text-[#F4EDE0]/70 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/10'
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#F4EDE0]/8 hover:bg-[#F4EDE0]/16 text-[#F4EDE0] transition-all border border-[#F4EDE0]/15 cursor-pointer backdrop-blur-sm shadow-xs"
            title="View DSU 10-Point CBCS Grading Scale"
          >
            <Award className="w-3.5 h-3.5 text-[#F4EDE0]" />
            <span className="hidden sm:inline">Grading Scale</span>
          </button>

          {/* Transcript / Grade Card */}
          <button
            type="button"
            onClick={onOpenGradeCard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#F4EDE0]/8 hover:bg-[#F4EDE0]/16 text-[#F4EDE0] transition-all border border-[#F4EDE0]/15 cursor-pointer backdrop-blur-sm shadow-xs"
            title="Print Official Grade Card & Summary"
          >
            <FileText className="w-3.5 h-3.5 text-[#F4EDE0]" />
            <span className="hidden sm:inline">Grade Sheet</span>
          </button>

          {/* Attendance & Leave Forecaster */}
          <button
            type="button"
            onClick={onOpenAttendance}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#F4EDE0]/16 hover:bg-[#F4EDE0]/26 text-[#F4EDE0] transition-all border border-[#F4EDE0]/30 cursor-pointer shadow-sm shadow-black/20"
            title="Attendance, Weekly Timetable & Leave Forecaster"
          >
            <Calendar className="w-3.5 h-3.5 text-[#F4EDE0]" />
            <span className="hidden sm:inline">Attendance</span>
          </button>

          {/* Cloud Database Sync Status */}
          {syncStatus === 'syncing' ? (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/30 animate-pulse"
              title="Syncing latest marks & semester changes to Supabase Cloud..."
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#F4EDE0] animate-spin" />
              <span className="hidden md:inline">Syncing...</span>
            </div>
          ) : syncStatus === 'synced' ? (
            <button
              type="button"
              onClick={onManualSync}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-[#F4EDE0]/12 hover:bg-[#F4EDE0]/22 text-[#F4EDE0] border border-[#F4EDE0]/25 transition-all cursor-pointer shadow-xs"
              title="All semester marks saved to Supabase Cloud database! Click to re-check latest data."
            >
              <Cloud className="w-3.5 h-3.5 text-[#F4EDE0]" />
              <span className="hidden md:inline">Cloud Synced</span>
            </button>
          ) : syncStatus === 'offline' ? (
            <button
              type="button"
              onClick={onManualSync}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/35 transition-all cursor-pointer"
              title="Cloud sync unreachable. Click to retry connecting to Supabase."
            >
              <CloudOff className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Retry Sync</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-[#F4EDE0]/8 hover:bg-[#F4EDE0]/16 text-[#F4EDE0]/70 hover:text-[#F4EDE0] border border-[#F4EDE0]/15 transition-all cursor-pointer"
              title="Guest Mode: Saved on this device only. Sign in to sync across other devices!"
            >
              <CloudOff className="w-3.5 h-3.5 text-[#F4EDE0]/70" />
              <span className="hidden md:inline">Local Only</span>
            </button>
          )}

          {/* Theme Switcher: Dark (Navy & Cream) <-> Light (Antique Gold & Deep Violet 7:3) */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-medium bg-[#F4EDE0]/12 hover:bg-[#F4EDE0]/22 text-[#F4EDE0] border border-[#F4EDE0]/25 transition-all cursor-pointer shadow-xs hover:scale-[1.03] active:scale-[0.97]"
            title={
              theme === 'light'
                ? 'Switch to Dark Theme (Navy #14213D & Cream #F4EDE0)'
                : 'Switch to Light Theme (Antique Gold #B9A38B & Deep Violet #2C1F33)'
            }
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[#2C1F33]" />
                <span className="hidden sm:inline font-bold">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline font-bold">Light Mode</span>
              </>
            )}
          </button>

          {/* Profile & Avatar */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-[#F4EDE0]/8 hover:bg-[#F4EDE0]/16 border border-[#F4EDE0]/15 hover:border-[#F4EDE0]/35 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#14213D] border border-[#F4EDE0]/25 flex items-center justify-center text-lg overflow-hidden shrink-0 shadow-inner">
              {profile.avatar.startsWith('http') ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{profile.avatar}</span>
              )}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-[#F4EDE0] group-hover:text-white transition-colors leading-tight">
                {profile.name}
              </div>
              <div className="text-[10px] font-mono text-[#F4EDE0]/60 leading-tight">
                {profile.usn}
              </div>
            </div>
          </button>

          {/* Switch Account */}
          <button
            type="button"
            onClick={onOpenAuth}
            className="p-2 rounded-xl bg-[#F4EDE0]/8 hover:bg-[#F4EDE0]/16 text-[#F4EDE0]/70 hover:text-[#F4EDE0] border border-[#F4EDE0]/15 transition-colors cursor-pointer"
            title="Switch Account / Sign In with USN"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
