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
  const globalCGPA = calculateCGPA(profile.semesters, profile.currentSemester);
  const prevProgress = getPreviousSemestersProgress(profile.semesters, profile.currentSemester);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Main Top Card - Full Width, High-Impact & Spacious */}
      <div className="w-full glass-panel rounded-3xl border border-[#F4EDE0]/16 p-6 sm:p-8 bg-gradient-to-br from-[#14213D]/90 via-[#1a2b4f]/75 to-[#14213D]/90 relative overflow-hidden shadow-2xl space-y-6">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F4EDE0]/8 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#14213D]/80 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header Row: Greeting & Bio with dedicated room */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-[#F4EDE0]/12 pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={onOpenProfile}
                title="Edit Profile & Bio"
                className="w-12 h-12 rounded-2xl bg-[#F4EDE0]/10 hover:bg-[#F4EDE0]/20 cursor-pointer border border-[#F4EDE0]/15 hover:border-[#F4EDE0]/40 shadow-sm shrink-0 transition-all flex items-center justify-center text-3xl overflow-hidden"
              >
                {profile.avatar?.startsWith('http') ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.avatar || '👨‍💻'}</span>
                )}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#F4EDE0] tracking-tight">
                    {(() => {
                      const hour = new Date().getHours();
                      if (hour >= 5 && hour < 12) return `Rise & grind, ${profile.name.split(' ')[0]} ☕`;
                      if (hour >= 12 && hour < 17) return `What's poppin', ${profile.name.split(' ')[0]} 🔥`;
                      if (hour >= 17 && hour < 22) return `Evening locked in, ${profile.name.split(' ')[0]} 💻`;
                      return `Midnight oil burning, ${profile.name.split(' ')[0]} 🌙`;
                    })()}
                  </h1>
                  {profile.isGuest && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/30 shrink-0">
                      DEMO ACCOUNT
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#F4EDE0]/65 font-medium mt-1">
                  {profile.branch} • <span className="font-mono text-[#F4EDE0] font-bold">{profile.usn}</span> • {profile.college}
                </div>
              </div>
            </div>

            {/* Dedicated Bio Banner with roomy spacing */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {profile.bio && (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F4EDE0]/12 text-[#F4EDE0] border border-[#F4EDE0]/25 text-xs font-medium shadow-xs backdrop-blur-sm">
                  <span>{profile.bio}</span>
                </span>
              )}

              {profile.isGuest && (
                <button
                  type="button"
                  onClick={() => onRequireAuth?.('customize profile or save changes')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#14213D]" />
                  <span>Create Account to Save Marks</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 self-start md:self-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/30 flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#F4EDE0]" />
                DEGREE OVERVIEW
              </span>
              <span className="font-heading font-extrabold text-[#F4EDE0] text-lg">
                8 Semesters Scheme
              </span>
            </div>
            <span className="text-[#F4EDE0]/65 text-xs">
              Choice Based Credit System (CBCS) • DSU Bengaluru
            </span>
          </div>
        </div>

        {/* Bottom Metrics: Full-Width 4-Box Cohesive Grid */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Card 1: Cumulative CGPA */}
          <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all text-center flex flex-col justify-between shadow-lg">
            <span className="text-[11px] font-semibold text-[#F4EDE0]/70 uppercase tracking-wider block">
              Cumulative CGPA
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-[#F4EDE0] my-1.5">
              {globalCGPA.cgpa > 0 ? globalCGPA.cgpa : '—'}
            </div>
            <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">
              Target Goal: <span className="font-mono text-[#F4EDE0] font-bold">{profile.targetCGPA}</span>
            </span>
          </div>

          {/* Card 2: Percentage */}
          <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all text-center flex flex-col justify-between shadow-lg">
            <span className="text-[11px] font-semibold text-[#F4EDE0]/70 uppercase tracking-wider block">
              Degree Percentage
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-[#F4EDE0] my-1.5">
              {globalCGPA.percentage > 0 ? `${globalCGPA.percentage}%` : '—'}
            </div>
            <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">
              Standard University CBCS
            </span>
          </div>

          {/* Card 3: Total Credits */}
          <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all text-center flex flex-col justify-between shadow-lg">
            <span className="text-[11px] font-semibold text-[#F4EDE0]/70 uppercase tracking-wider block">
              Earned Degree Credits
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-[#F4EDE0] my-1.5">
              {globalCGPA.totalCredits} <span className="text-base font-normal text-[#F4EDE0]/65">Credits</span>
            </div>
            <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">
              {globalCGPA.completedSemestersCount > 0
                ? `Across ${globalCGPA.completedSemestersCount} Completed ${
                    globalCGPA.completedSemestersCount === 1 ? 'Semester' : 'Semesters'
                  }`
                : 'Across Completed Semesters'}
            </span>
          </div>

          {/* Card 4: Degree Standing */}
          <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all text-center flex flex-col justify-between shadow-lg">
            <span className="text-[11px] font-semibold text-[#F4EDE0]/70 uppercase tracking-wider block">
              Academic Standing
            </span>
            <div className="text-xl sm:text-2xl font-black font-heading text-[#F4EDE0] my-1.5 truncate">
              {globalCGPA.totalCredits === 0 ? 'AWAITING MARKS ⏳' :
               globalCGPA.cgpa >= 10.0 ? 'UNTOUCHABLE AURA 👑' :
               globalCGPA.cgpa >= 9.0 ? 'DISTINCTION 🏆' :
               globalCGPA.cgpa >= 7.5 ? 'FIRST CLASS ⭐' :
               globalCGPA.cgpa >= 6.0 ? 'GOOD STANDING 🤙' : 'IN RECOVERY 🔒'}
            </div>
            <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">
              {globalCGPA.totalCredits === 0
                ? 'Enter marks below to calculate standing 📈'
                : globalCGPA.cgpa >= 10.0
                ? 'Flawless 10.0 CGPA! Outstanding performance! ⚡'
                : globalCGPA.cgpa >= profile.targetCGPA
                ? 'Exceeding target goal! 📈'
                : 'Consistent performance grind'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Semester Onboarding & Previous Semesters Completion Banner */}
      {prevProgress.total > 0 && (
        <div className={`w-full rounded-3xl p-6 sm:p-7 border transition-all duration-300 relative overflow-hidden shadow-2xl backdrop-blur-md glass-panel ${
          prevProgress.isComplete
            ? 'border-[#F4EDE0]/25 bg-gradient-to-r from-[#14213D]/95 via-[#1a2b4f]/80 to-[#14213D]/95'
            : 'border-[#F4EDE0]/20 bg-gradient-to-r from-[#14213D]/95 via-[#182747]/85 to-[#14213D]/95 shadow-black/30'
        }`}>
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none bg-[#F4EDE0]/8" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border bg-[#F4EDE0]/12 text-[#F4EDE0] border-[#F4EDE0]/25 shadow-xs">
                  {prevProgress.isComplete ? <CheckCircle2 className="w-5 h-5 text-[#F4EDE0]" /> : <AlertTriangle className="w-5 h-5 text-[#F4EDE0]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold font-heading text-[#F4EDE0]">
                      {prevProgress.isComplete
                        ? 'All Previous Semesters Recorded'
                        : `Active Semester ${profile.currentSemester}: Complete Previous Semesters History`}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/30">
                      Sem 1 to {profile.currentSemester - 1}
                    </span>
                  </div>
                  <p className="text-xs text-[#F4EDE0]/70 mt-0.5">
                    {prevProgress.isComplete
                      ? `All marks up to Semester ${profile.currentSemester - 1} are saved. Cumulative CGPA (${globalCGPA.cgpa}) is fully verified!`
                      : `You selected Semester ${profile.currentSemester} as your active semester. Insert marks for Semesters 1 to ${profile.currentSemester - 1} to calculate your true cumulative CGPA (${profile.targetCGPA} target).`}
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="shrink-0 self-start sm:self-auto">
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 bg-[#F4EDE0]/15 text-[#F4EDE0] border-[#F4EDE0]/30 shadow-xs">
                  <span>{prevProgress.completed} of {prevProgress.total} Semesters ({prevProgress.percent}%)</span>
                </span>
              </div>
            </div>

            {/* Glowing Gradient Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-[#090e1a]/80 border border-[#F4EDE0]/12 p-0.5 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#F4EDE0]/40 via-[#F4EDE0]/80 to-[#F4EDE0] shadow-md shadow-[#F4EDE0]/25"
                  style={{ width: `${Math.max(5, prevProgress.percent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#F4EDE0]/65 font-medium">
                <span>Degree History Prior to S{profile.currentSemester}</span>
                <span>{prevProgress.percent}% Completed</span>
              </div>
            </div>

            {/* Interactive Previous Semester Jump Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-[#F4EDE0]/70 font-semibold mr-1">Quick Actions:</span>
              {prevProgress.previousSemesters.map((s) => {
                const complete = isSemesterComplete(s);
                return (
                  <button
                    key={s.semNumber}
                    type="button"
                    onClick={() => onSelectSemester(s.semNumber)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 group cursor-pointer ${
                      complete
                        ? 'bg-[#F4EDE0]/15 text-[#F4EDE0] border-[#F4EDE0]/30 hover:bg-[#F4EDE0]/25'
                        : 'bg-[#F4EDE0] text-[#14213D] font-bold border-[#F4EDE0] hover:bg-white shadow-md'
                    }`}
                  >
                    <span>S{s.semNumber}: {complete ? 'Completed' : 'Enter Marks'}</span>
                    {complete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#F4EDE0]" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-[#14213D] group-hover:translate-x-0.5 transition-transform" />
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
            <GraduationCap className="w-5 h-5 text-[#F4EDE0]" />
            <h3 className="text-xl font-bold font-heading text-[#F4EDE0]">
              All Semester Performance Cards
            </h3>
          </div>
          <span className="text-xs text-[#F4EDE0]/60">
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
                className={`group cursor-pointer rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden glass-card glass-card-hover ${
                  isCurrent
                    ? 'border-[#F4EDE0]/45 shadow-xl shadow-black/40 bg-gradient-to-br from-[#14213D]/95 via-[#1a2b4f]/85 to-[#14213D]/95'
                    : isDone
                    ? 'border-[#F4EDE0]/25 bg-gradient-to-br from-[#14213D]/85 via-[#182747]/75 to-[#14213D]/85 shadow-lg'
                    : 'border-[#F4EDE0]/12 bg-gradient-to-br from-[#14213D]/70 via-[#182747]/60 to-[#14213D]/70 hover:border-[#F4EDE0]/35'
                }`}
              >
                {/* Subtle Ambient Glow for completed or active card */}
                {isCurrent ? (
                  <div className="absolute top-0 right-0 w-36 h-36 bg-[#F4EDE0]/10 rounded-full blur-2xl pointer-events-none" />
                ) : isDone ? (
                  <div className="absolute top-0 right-0 w-36 h-36 bg-[#F4EDE0]/6 rounded-full blur-2xl pointer-events-none" />
                ) : null}

                {/* Active or Prior Status Pill */}
                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                  {isDone ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F4EDE0]/20 text-[#F4EDE0] border border-[#F4EDE0]/35 flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3 h-3 text-[#F4EDE0]" />
                      <span>{isCurrent ? 'ACTIVE • COMPLETED' : `S${sem.semNumber} DONE`}</span>
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F4EDE0] text-[#14213D] shadow-md animate-pulse">
                      🎯 ACTIVE SEM
                    </span>
                  ) : sem.semNumber < profile.currentSemester ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/30">
                      ⚠️ S{sem.semNumber} FILL MARKS
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#090e1a]/60 text-[#F4EDE0]/50 border border-[#F4EDE0]/10">
                      ⏳ UPCOMING
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-[#F4EDE0]/60 mb-1">
                    <span>{sem.academicYear}</span>
                    <span>•</span>
                    <span>{sem.subjects.length} Subjects</span>
                  </div>

                  <h4 className="text-lg font-bold font-heading text-[#F4EDE0] group-hover:text-white transition-colors">
                    {sem.title}
                  </h4>

                  {/* SGPA & Percentage Meter */}
                  <div className="my-4 p-3 rounded-2xl border flex items-center justify-between transition-colors bg-[#090e1a]/70 border-[#F4EDE0]/10 shadow-inner">
                    <div>
                      <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">Semester SGPA</span>
                      <div className="text-2xl font-black font-heading text-[#F4EDE0]">
                        {hasMarks ? result.sgpa : '—'}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">Credits</span>
                      <div className="text-sm font-bold font-mono text-[#F4EDE0]">
                        {result.totalCredits} Cr
                      </div>
                    </div>
                  </div>

                  {/* Vibe badge */}
                  {hasMarks ? (
                    <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-[#F4EDE0]/15 text-[#F4EDE0] border-[#F4EDE0]/25 shadow-xs">
                        {result.statusBadge.label}
                      </span>
                      {isDone && (
                        <span className="text-[10px] text-[#F4EDE0] font-semibold bg-[#F4EDE0]/15 border border-[#F4EDE0]/30 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#F4EDE0]" /> Completed
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mb-3">
                      <span className="text-[10px] text-[#F4EDE0]/50 bg-[#090e1a]/50 px-2 py-0.5 rounded border border-[#F4EDE0]/10">
                        Marks Pending Entry
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#F4EDE0]/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSimulateSemester(sem.semNumber);
                      }}
                      className="text-[#F4EDE0] hover:text-white text-[11px] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-[#F4EDE0]" /> Simulate
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
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                          sem.isCompleted
                            ? 'bg-[#F4EDE0]/20 text-[#F4EDE0] border-[#F4EDE0]/35 hover:bg-[#F4EDE0]/30'
                            : 'bg-[#F4EDE0]/8 text-[#F4EDE0]/70 border-[#F4EDE0]/15 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/15'
                        }`}
                        title={sem.isCompleted ? 'Click to unmark semester' : 'Click to mark semester as done'}
                      >
                        <CheckCircle2 className="w-3 h-3 text-[#F4EDE0]" />
                        <span>{sem.isCompleted ? 'Done' : 'Mark Done'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center text-[#F4EDE0]/70 group-hover:text-[#F4EDE0] group-hover:translate-x-1 transition-all">
                    <span className="font-medium text-[11px]">Manage</span>
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
