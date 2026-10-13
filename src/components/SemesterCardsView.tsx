import React from 'react';
import {
  GraduationCap,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { StudentProfile, Semester } from '../types';
import {
  calculateCGPA,
  calculateSemesterResult,
  isSemesterComplete,
  getPreviousSemestersProgress,
} from '../utils/gradeCalculations';

interface Props {
  profile: StudentProfile;
  onSelectSemester: (semNumber: number) => void;
  onSimulateSemester: (semNumber: number) => void;
  onOpenProfile?: () => void;
  onRequireAuth?: (reason: string) => void;
  onUpdateSemester?: (updated: Semester) => void;
}

export const SemesterCardsView: React.FC<Props> = ({
  profile,
  onSelectSemester,
  onSimulateSemester,
  onOpenProfile,
  onRequireAuth,
  onUpdateSemester,
}) => {
  const globalCGPA = calculateCGPA(profile.semesters);
  const prevProgress = getPreviousSemestersProgress(profile.semesters, profile.currentSemester);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Main Top Card - Full Width, High-Impact & Spacious */}
      <div className="w-full glass-panel rounded-3xl border border-fuchsia-500/25 p-6 sm:p-8 bg-gradient-to-br from-slate-900/95 via-purple-950/20 to-slate-900/95 relative overflow-hidden shadow-2xl space-y-6">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header Row: Greeting & Bio with dedicated room */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/10 pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={onOpenProfile}
                title="Edit Profile & Bio"
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/10 hover:border-purple-500/40 shadow-sm shrink-0 transition-all flex items-center justify-center text-3xl overflow-hidden"
              >
                {profile.avatar?.startsWith('http') ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.avatar || '👨‍💻'}</span>
                )}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                    {(() => {
                      const hour = new Date().getHours();
                      if (hour >= 5 && hour < 12) return `Rise & grind, ${profile.name.split(' ')[0]} ☕`;
                      if (hour >= 12 && hour < 17) return `What's poppin', ${profile.name.split(' ')[0]} 🔥`;
                      if (hour >= 17 && hour < 22) return `Evening locked in, ${profile.name.split(' ')[0]} 💻`;
                      return `Midnight oil burning, ${profile.name.split(' ')[0]} 🌙`;
                    })()}
                  </h1>
                  {profile.isGuest && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      DEMO ACCOUNT
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  {profile.branch} • <span className="font-mono text-cyan-300 font-bold">{profile.usn}</span> • {profile.college}
                </div>
              </div>
            </div>

            {/* Dedicated Bio Banner with roomy spacing (no sticky-sticky!) */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {profile.bio && (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-200 border border-purple-500/30 text-xs font-medium shadow-sm">
                  <span>{profile.bio}</span>
                </span>
              )}

              {profile.isGuest && (
                <button
                  type="button"
                  onClick={() => onRequireAuth?.('customize profile or save changes')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Create Account to Save Marks</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 self-start md:self-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                DEGREE OVERVIEW
              </span>
              <span className="font-heading font-extrabold text-white text-lg">
                8 Semesters Scheme
              </span>
            </div>
            <span className="text-slate-400 text-xs">
              Choice Based Credit System (CBCS) • DSU Bengaluru
            </span>
          </div>
        </div>

        {/* Bottom Metrics: Full-Width 4-Box Cohesive Grid */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Card 1: Cumulative CGPA */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-purple-500/30 transition-all text-center backdrop-blur-md shadow-lg flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Cumulative CGPA
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-purple-300 my-1.5">
              {globalCGPA.cgpa > 0 ? globalCGPA.cgpa : '—'}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Target Goal: <span className="font-mono text-purple-300 font-bold">{profile.targetCGPA}</span>
            </span>
          </div>

          {/* Card 2: Percentage */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/30 transition-all text-center backdrop-blur-md shadow-lg flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Degree Percentage
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-cyan-300 my-1.5">
              {globalCGPA.percentage > 0 ? `${globalCGPA.percentage}%` : '—'}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Standard University CBCS
            </span>
          </div>

          {/* Card 3: Total Credits */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/30 transition-all text-center backdrop-blur-md shadow-lg flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Earned Degree Credits
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-emerald-300 my-1.5">
              {globalCGPA.totalCredits} <span className="text-base font-normal text-slate-400">Credits</span>
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Across Completed Semesters
            </span>
          </div>

          {/* Card 4: Degree Standing */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-500/30 transition-all text-center backdrop-blur-md shadow-lg flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Academic Standing
            </span>
            <div className="text-xl sm:text-2xl font-black font-heading text-amber-300 my-1.5 truncate">
              {globalCGPA.totalCredits === 0 ? 'AWAITING MARKS ⏳' :
               globalCGPA.cgpa >= 9.0 ? 'DISTINCTION 🏆' :
               globalCGPA.cgpa >= 7.5 ? 'FIRST CLASS ⭐' :
               globalCGPA.cgpa >= 6.0 ? 'GOOD STANDING 🤙' : 'IN RECOVERY 🔒'}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {globalCGPA.totalCredits === 0
                ? 'Enter marks below to calculate standing 📈'
                : globalCGPA.cgpa >= profile.targetCGPA
                ? 'Exceeding target goal! 📈'
                : 'Consistent performance grind'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Semester Onboarding & Previous Semesters Completion Banner */}
      {prevProgress.total > 0 && (
        <div className={`w-full rounded-3xl p-6 sm:p-7 border transition-all duration-300 relative overflow-hidden shadow-2xl backdrop-blur-md ${
          prevProgress.isComplete
            ? 'glass-panel border-emerald-500/30 bg-gradient-to-r from-slate-900/90 via-emerald-950/20 to-slate-900/90'
            : 'glass-panel border-amber-500/40 bg-gradient-to-r from-slate-900/95 via-amber-950/25 to-slate-900/95 shadow-amber-500/5'
        }`}>
          {/* Subtle Ambient Glow */}
          <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none ${
            prevProgress.isComplete ? 'bg-emerald-500/10' : 'bg-amber-500/10'
          }`} />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  prevProgress.isComplete
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}>
                  {prevProgress.isComplete ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold font-heading text-white">
                      {prevProgress.isComplete
                        ? 'All Previous Semesters Recorded'
                        : `Active Semester ${profile.currentSemester}: Complete Previous Semesters History`}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Sem 1 to {profile.currentSemester - 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {prevProgress.isComplete
                      ? `All marks up to Semester ${profile.currentSemester - 1} are saved. Cumulative CGPA (${globalCGPA.cgpa}) is fully verified!`
                      : `You selected Semester ${profile.currentSemester} as your active semester. Insert marks for Semesters 1 to ${profile.currentSemester - 1} to calculate your true cumulative CGPA (${profile.targetCGPA} target).`}
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="shrink-0 self-start sm:self-auto">
                <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                  prevProgress.isComplete
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  <span>{prevProgress.completed} of {prevProgress.total} Semesters ({prevProgress.percent}%)</span>
                </span>
              </div>
            </div>

            {/* Glowing Gradient Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-black/50 border border-white/10 p-0.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    prevProgress.isComplete
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-lg shadow-emerald-500/50'
                      : 'bg-gradient-to-r from-amber-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-amber-500/50'
                  }`}
                  style={{ width: `${Math.max(5, prevProgress.percent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Degree History Prior to S{profile.currentSemester}</span>
                <span>{prevProgress.percent}% Completed</span>
              </div>
            </div>

            {/* Interactive Previous Semester Jump Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 font-semibold mr-1">Quick Actions:</span>
              {prevProgress.previousSemesters.map((s) => {
                const complete = isSemesterComplete(s);
                return (
                  <button
                    key={s.semNumber}
                    type="button"
                    onClick={() => onSelectSemester(s.semNumber)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 group cursor-pointer ${
                      complete
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-400 shadow-sm'
                    }`}
                  >
                    <span>S{s.semNumber}: {complete ? 'Completed' : 'Enter Marks'}</span>
                    {complete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 8 Semester Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-400" />
            <h3 className="text-xl font-bold font-heading text-white">
              All Semester Performance Cards
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Click any semester to manage subjects, marks, and modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {profile.semesters.map((sem) => {
            const result = calculateSemesterResult(sem.subjects);
            const isCurrent = sem.semNumber === profile.currentSemester;
            const isDone = isSemesterComplete(sem);
            const hasMarks = sem.subjects.some(
              (s) => s.mseRawMarks !== null || s.ciaMarks !== null || s.seeRawMarks !== null || s.internalDirectMarks !== null
            );

            return (
              <div
                key={sem.semNumber}
                onClick={() => onSelectSemester(sem.semNumber)}
                className={`group cursor-pointer rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                  isDone
                    ? 'glass-panel border-emerald-500/50 bg-gradient-to-br from-slate-900/95 via-emerald-950/30 to-slate-900/95 shadow-xl shadow-emerald-500/15 hover:border-emerald-400'
                    : isCurrent
                    ? 'glass-panel border-purple-500/50 shadow-xl shadow-purple-500/10 hover:border-purple-400'
                    : 'glass-card border-white/10 hover:border-white/20 hover:bg-slate-800/40'
                }`}
              >
                {/* Subtle Ambient Glow for completed or active card */}
                {isDone ? (
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                ) : isCurrent ? (
                  <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                ) : null}

                {/* Active or Prior Status Pill */}
                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                  {isDone ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/45 flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{isCurrent ? 'ACTIVE • COMPLETED' : `S${sem.semNumber} DONE`}</span>
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                      🎯 ACTIVE SEM
                    </span>
                  ) : sem.semNumber < profile.currentSemester ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚠️ S{sem.semNumber} FILL MARKS
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
                      ⏳ UPCOMING
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span>{sem.academicYear}</span>
                    <span>•</span>
                    <span>{sem.subjects.length} Subjects</span>
                  </div>

                  <h4 className={`text-lg font-bold font-heading transition-colors ${
                    isDone ? 'text-white group-hover:text-emerald-300' : 'text-white group-hover:text-purple-300'
                  }`}>
                    {sem.title}
                  </h4>

                  {/* SGPA & Percentage Meter */}
                  <div className={`my-4 p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    isDone
                      ? 'bg-black/50 border-emerald-500/25'
                      : 'bg-black/40 border-white/5'
                  }`}>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Semester SGPA</span>
                      <div className={`text-2xl font-black font-heading ${
                        isDone && hasMarks ? 'text-emerald-300' : 'text-white'
                      }`}>
                        {hasMarks ? result.sgpa : '—'}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Credits</span>
                      <div className={`text-sm font-bold font-mono ${isDone ? 'text-emerald-400' : 'text-cyan-300'}`}>
                        {result.totalCredits} Cr
                      </div>
                    </div>
                  </div>

                  {/* Vibe badge */}
                  {hasMarks ? (
                    <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        result.sgpa >= 9.0
                          ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
                          : result.sgpa >= 8.0
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : result.sgpa >= 7.0
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {result.statusBadge.label}
                      </span>
                      {isDone && (
                        <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Completed
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mb-3">
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        Marks Pending Entry
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                  isDone ? 'border-emerald-500/20' : 'border-white/5'
                }`}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSimulateSemester(sem.semNumber);
                      }}
                      className="text-purple-400 hover:text-purple-300 text-[11px] font-medium flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" /> Simulate
                    </button>

                    {onUpdateSemester && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (profile.isGuest) {
                            onRequireAuth?.('toggle semester completion status');
                            return;
                          }
                          onUpdateSemester({
                            ...sem,
                            isCompleted: !sem.isCompleted,
                          });
                        }}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                          sem.isCompleted
                            ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/35'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                        title={sem.isCompleted ? 'Click to unmark semester' : 'Click to mark semester as done'}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{sem.isCompleted ? 'Done' : 'Mark Done'}</span>
                      </button>
                    )}
                  </div>

                  <div className={`flex items-center group-hover:translate-x-1 transition-all ${
                    isDone ? 'text-emerald-300 group-hover:text-emerald-200' : 'text-slate-400 group-hover:text-white'
                  }`}>
                    <span>Manage</span>
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
