import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Search,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import type { LetterGrade, Semester, StudentProfile, Subject } from '../types';
import { calculateSemesterResult } from '../utils/gradeCalculations';
import { createDefaultModules, createEmptySemesterSubjects } from '../utils/storage';
import { SubjectCard } from './SubjectCard';
import { SubjectModuleTrackerModal } from './SubjectModuleTrackerModal';
import { TargetGradePredictorModal } from './TargetGradePredictorModal';
import { SemesterPredictorModal } from './SemesterPredictorModal';
import { AttendancePlannerModal } from './AttendancePlannerModal';

interface Props {
  profile: StudentProfile;
  semester: Semester;
  onUpdateSemester: (updated: Semester) => void;
  onBackToOverview: () => void;
  onSelectSemester: (semNum: number) => void;
  allSemesters: Semester[];
  onRequireAuth?: (reason: string) => void;
}

export const SemesterDetail: React.FC<Props> = ({
  profile,
  semester,
  onUpdateSemester,
  onBackToOverview,
  onSelectSemester,
  allSemesters,
  onRequireAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCredits, setNewCredits] = useState<number>(4);
  const [newHasSEE, setNewHasSEE] = useState<boolean>(true);
  const [newHasMSE, setNewHasMSE] = useState<boolean>(true);
  const [newMseMaxScale, setNewMseMaxScale] = useState<number>(30);

  // Active sub-modals
  const [activeModuleTrackerSubject, setActiveModuleTrackerSubject] = useState<Subject | null>(null);
  const [activeTargetPredictorSubject, setActiveTargetPredictorSubject] = useState<Subject | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);

  const semResult = calculateSemesterResult(semester.subjects);

  const handleUpdateSubject = (updated: Subject) => {
    if (profile.isGuest) {
      onRequireAuth?.('update subject examination marks or curriculum details');
      return;
    }
    const updatedSubjects = semester.subjects.map((s) => (s.id === updated.id ? updated : s));
    onUpdateSemester({
      ...semester,
      subjects: updatedSubjects,
    });
  };

  const handleDeleteSubject = (id: string) => {
    if (profile.isGuest) {
      onRequireAuth?.('delete subjects from this semester');
      return;
    }
    const updatedSubjects = semester.subjects.filter((s) => s.id !== id);
    onUpdateSemester({
      ...semester,
      subjects: updatedSubjects,
    });
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.isGuest) {
      onRequireAuth?.('add new custom engineering subjects');
      return;
    }
    if (!newName.trim() && !newCode.trim()) return;
    const nextIdx = semester.subjects.length + 1;

    const newSub: Subject = {
      id: `custom-sub-${Date.now()}`,
      code: newCode.trim().toUpperCase() || `SUB ${nextIdx}`,
      name: newName.trim() || `Subject ${nextIdx}`,
      credits: newCredits,
      hasSEE: newHasSEE,
      hasMSE: newHasMSE,
      mseMaxScale: newMseMaxScale,
      mseRawMarks: null,
      ciaMarks: null,
      seeRawMarks: null,
      favouredGrade: 'O',
      modules: createDefaultModules(false, true),
    };

    onUpdateSemester({
      ...semester,
      subjects: [...semester.subjects, newSub],
    });

    setNewCode('');
    setNewName('');
    setNewCredits(4);
    setNewHasSEE(true);
    setNewHasMSE(true);
    setNewMseMaxScale(30);
    setIsAddModalOpen(false);
  };

  const handleResetToDefault = () => {
    if (profile.isGuest) {
      onRequireAuth?.('reset this semester to default scheme');
      return;
    }
    if (window.confirm('Reset this semester to 4 clean starter subjects (Subject 1, Subject 2, Subject 3, Subject 4)?')) {
      const defaultSubs = createEmptySemesterSubjects(semester.semNumber);
      onUpdateSemester({
        ...semester,
        subjects: defaultSubs,
      });
    }
  };

  const handleApplySimulatedMarks = (updatedSubjects: Subject[]) => {
    if (profile.isGuest) {
      onRequireAuth?.('save simulated marks to your semester scorecard');
      return;
    }
    onUpdateSemester({
      ...semester,
      subjects: updatedSubjects,
    });
  };

  const filteredSubjects = semester.subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Navigation & Semester Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={onBackToOverview}
          className="inline-flex items-center gap-2 text-sm text-[#F4EDE0]/70 hover:text-[#F4EDE0] transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Semesters Overview</span>
        </button>

        {/* Semester Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {allSemesters.map((s) => (
            <button
              key={s.semNumber}
              onClick={() => onSelectSemester(s.semNumber)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                s.semNumber === semester.semNumber
                  ? 'bg-[#F4EDE0] text-[#14213D] font-bold shadow-md shadow-black/30'
                  : 'bg-[#F4EDE0]/8 text-[#F4EDE0]/70 hover:bg-[#F4EDE0]/16 hover:text-[#F4EDE0] border border-[#F4EDE0]/10'
              }`}
            >
              Sem {s.semNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Previous Semester Context Banner */}
      {semester.semNumber < profile.currentSemester && (
        <div className="p-4 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg border transition-all duration-300 glass-panel border-[#F4EDE0]/20 bg-gradient-to-r from-[#14213D]/95 via-[#182747]/85 to-[#14213D]/95 text-[#F4EDE0]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold border bg-[#F4EDE0]/15 border-[#F4EDE0]/30 text-[#F4EDE0]">
              S{semester.semNumber}
            </div>
            <div>
              <strong className="font-bold block text-sm text-[#F4EDE0]">
                {semester.isCompleted
                  ? `Semester ${semester.semNumber} Marked as Complete ✅`
                  : `Past Semester Marks Entry (Active Semester is S${profile.currentSemester})`}
              </strong>
              <span className="text-[11px] text-[#F4EDE0]/70">
                {semester.isCompleted
                  ? 'All course marks and SGPA for this semester are recorded into your degree calculation.'
                  : 'Enter your MSE, CIA & SEE scores below to accurately compute your historic SGPA and cumulative CGPA.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (profile.isGuest) {
                onRequireAuth?.('mark semester completion status');
                return;
              }
              onUpdateSemester({ ...semester, isCompleted: !semester.isCompleted });
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all border cursor-pointer ${
              semester.isCompleted
                ? 'bg-[#F4EDE0]/20 text-[#F4EDE0] border-[#F4EDE0]/35 hover:bg-[#F4EDE0]/30'
                : 'bg-[#F4EDE0] hover:bg-white text-[#14213D] border-[#F4EDE0] shadow-md'
            }`}
          >
            {semester.isCompleted ? 'Marked Complete ✅' : 'Mark Semester as Done'}
          </button>
        </div>
      )}

      {/* Main Top Card - Full Width, High-Impact & Spacious */}
      <div className="w-full glass-panel rounded-3xl border border-[#F4EDE0]/16 p-6 sm:p-8 relative overflow-hidden shadow-2xl space-y-6 transition-all duration-300 bg-gradient-to-br from-[#14213D]/90 via-[#1a2b4f]/75 to-[#14213D]/90">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none bg-[#F4EDE0]/8" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#14213D]/80 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header Row: Greeting & Bio with dedicated breathing space */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-[#F4EDE0]/12 pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-[#F4EDE0]/10 border border-[#F4EDE0]/15 shadow-sm shrink-0 flex items-center justify-center text-3xl overflow-hidden">
                {profile.avatar?.startsWith('http') ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.avatar || '👨‍💻'}</span>
                )}
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#F4EDE0] tracking-tight">
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour >= 5 && hour < 12) return `Rise & grind, ${profile.name.split(' ')[0]} ☕`;
                    if (hour >= 12 && hour < 17) return `What's poppin', ${profile.name.split(' ')[0]} 🔥`;
                    if (hour >= 17 && hour < 22) return `Evening locked in, ${profile.name.split(' ')[0]} 💻`;
                    return `Midnight oil burning, ${profile.name.split(' ')[0]} 🌙`;
                  })()}
                </h1>
                <div className="text-xs text-[#F4EDE0]/65 font-medium mt-1">
                  {profile.branch} • <span className="font-mono text-[#F4EDE0] font-bold">{profile.usn}</span> • {profile.college}
                </div>
              </div>
            </div>

            {/* Dedicated Bio Banner with roomy spacing */}
            {profile.bio && (
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F4EDE0]/12 text-[#F4EDE0] border border-[#F4EDE0]/25 text-xs font-medium shadow-xs backdrop-blur-sm">
                  <span>{profile.bio}</span>
                </span>
              </div>
            )}
          </div>

          {/* Semester Badge & Scheme */}
          <div className="flex flex-col sm:items-end gap-1.5 self-start md:self-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold px-3 py-1 rounded-full bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/30 text-xs">
                {semester.academicYear}
              </span>
              <span className="font-heading font-extrabold text-[#F4EDE0] text-lg">
                {semester.title} Dashboard
              </span>
              <button
                type="button"
                onClick={() => {
                  if (profile.isGuest) {
                    onRequireAuth?.('mark semester completion status');
                    return;
                  }
                  onUpdateSemester({ ...semester, isCompleted: !semester.isCompleted });
                }}
                className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all border cursor-pointer ${
                  semester.isCompleted
                    ? 'bg-[#F4EDE0]/20 text-[#F4EDE0] border-[#F4EDE0]/35 hover:bg-[#F4EDE0]/30'
                    : 'bg-[#F4EDE0]/8 text-[#F4EDE0]/70 border-[#F4EDE0]/15 hover:bg-[#F4EDE0]/15 hover:text-[#F4EDE0]'
                }`}
                title={semester.isCompleted ? 'Click to unmark semester' : 'Click to mark semester as done'}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${semester.isCompleted ? 'text-[#F4EDE0]' : 'text-[#F4EDE0]/50'}`} />
                <span>{semester.isCompleted ? 'Done ✅' : 'Mark as Done'}</span>
              </button>
            </div>
            <span className="text-[#F4EDE0]/65 text-xs">
              CBCS Scheme: Standard 30 MSE + 30 CIA (or 20+40) + 40 SEE (100 Max)
            </span>
          </div>
        </div>

        {/* Bottom Metrics: Full-Width 4-Box Grid Spanning Edge-to-Edge */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Card 1: SGPA */}
          <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all text-center flex flex-col justify-between shadow-lg">
            <span className="text-[11px] font-semibold text-[#F4EDE0]/70 uppercase tracking-wider block">
              Semester SGPA
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-[#F4EDE0] my-1.5">
              {semResult.sgpa}
            </div>
            <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">
              {semResult.totalGradePoints} Total Credit Points
            </span>
          </div>

          {/* Card 2: Percentage */}
          <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all text-center flex flex-col justify-between shadow-lg">
            <span className="text-[11px] font-semibold text-[#F4EDE0]/70 uppercase tracking-wider block">
              Equivalent Percentage
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-[#F4EDE0] my-1.5">
              {semResult.percentage}%
            </div>
            <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">
              Standard University CBCS
            </span>
          </div>

          {/* Card 3: Credits */}
          <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all text-center flex flex-col justify-between shadow-lg">
            <span className="text-[11px] font-semibold text-[#F4EDE0]/70 uppercase tracking-wider block">
              Credits Cleared
            </span>
            <div className="text-3xl sm:text-4xl font-black font-heading text-[#F4EDE0] my-1.5">
              {semResult.earnedCredits} <span className="text-base font-normal text-[#F4EDE0]/65">/ {semResult.totalCredits}</span>
            </div>
            <span className="text-[11px] text-[#F4EDE0]/65 block font-medium">
              {semester.subjects.length} Registered Courses
            </span>
          </div>

          {/* Card 4: Academic Vibe */}
          <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all text-center flex flex-col justify-between shadow-lg">
            <span className="text-[11px] font-semibold text-[#F4EDE0]/70 uppercase tracking-wider block">
              Academic Standing
            </span>
            <div className="my-1.5">
              <span className="inline-flex items-center text-xs font-bold font-heading px-3 py-1 rounded-lg border bg-[#F4EDE0]/15 text-[#F4EDE0] border-[#F4EDE0]/30 shadow-xs">
                {semResult.statusBadge.label}
              </span>
            </div>
            <span className="text-[11px] text-[#F4EDE0]/65 truncate block font-medium">
              {semResult.statusBadge.tagline}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Add Subject, Reset, Simulate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-[#F4EDE0]/12">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#F4EDE0]/50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subjects by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl glass-input placeholder:text-[#F4EDE0]/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAttendanceModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#F4EDE0]/15 hover:bg-[#F4EDE0]/25 text-[#F4EDE0] text-xs font-medium transition-all border border-[#F4EDE0]/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-[#F4EDE0]" /> Attendance & Leaves
          </button>

          <button
            type="button"
            onClick={() => setIsSimulateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#F4EDE0]/15 hover:bg-[#F4EDE0]/25 text-[#F4EDE0] text-xs font-medium transition-all border border-[#F4EDE0]/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F4EDE0]" /> Predict Sem Result
          </button>

          <button
            type="button"
            onClick={() => {
              if (profile.isGuest) {
                onRequireAuth?.('add custom engineering subjects');
                return;
              }
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs transition-all shadow-md shadow-black/25 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#14213D]" /> Add Subject
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 rounded-xl bg-[#F4EDE0]/8 hover:bg-[#F4EDE0]/16 text-[#F4EDE0]/70 hover:text-[#F4EDE0] text-xs font-medium transition-colors border border-[#F4EDE0]/12 flex items-center gap-1.5 cursor-pointer"
            title="Reset to 8 default engineering subjects matching credit scheme"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default Scheme
          </button>
        </div>
      </div>

      {/* Subjects Grid - Comfortable Breathing Room and Optimal Width */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSubjects.map((sub) => (
          <SubjectCard
            key={sub.id}
            subject={sub}
            onUpdate={handleUpdateSubject}
            onDelete={handleDeleteSubject}
            onOpenModuleTracker={(s) => setActiveModuleTrackerSubject(s)}
            onOpenTargetPredictor={(s) => setActiveTargetPredictorSubject(s)}
            isGuest={profile.isGuest}
            onRequireAuth={onRequireAuth}
          />
        ))}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="text-center py-12 glass-card rounded-2xl border border-[#F4EDE0]/12 space-y-3">
          <BookOpen className="w-8 h-8 text-[#F4EDE0]/40 mx-auto" />
          <h4 className="text-sm font-semibold text-[#F4EDE0]">No Subjects Found</h4>
          <p className="text-xs text-[#F4EDE0]/60">
            {searchQuery ? 'Try clearing your search term.' : 'Click "Add Subject" or "Reset Default Scheme" to populate subjects.'}
          </p>
        </div>
      )}

      {/* Add Subject Modal */}
      {isAddModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="relative w-full max-w-md glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 shadow-2xl overflow-hidden bg-[#14213D]/95 p-6 space-y-4 my-auto">
              <h3 className="text-lg font-bold font-heading text-[#F4EDE0]">
                Add New Engineering Subject
              </h3>

              <form onSubmit={handleAddSubject} className="space-y-3 text-xs">
                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1">Subject Code</label>
                  <input
                    type="text"
                    placeholder={`e.g. SUB ${semester.subjects.length + 1} or Course Code`}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1">Subject Title / Course Name *</label>
                  <input
                    type="text"
                    placeholder={`e.g. Subject ${semester.subjects.length + 1} or Course Title`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>

                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1">Credits Assigned</label>
                  <select
                    value={newCredits}
                    onChange={(e) => setNewCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl glass-input bg-[#090e1a]"
                  >
                    <option value={4}>4 Credits</option>
                    <option value={3}>3 Credits</option>
                    <option value={2}>2 Credits</option>
                    <option value={1}>1 Credit</option>
                    <option value={0}>0 Credits</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-[#090e1a]/60 border border-[#F4EDE0]/10 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[#F4EDE0]/80">
                    <input
                      type="checkbox"
                      checked={newHasSEE}
                      onChange={(e) => setNewHasSEE(e.target.checked)}
                      className="accent-[#F4EDE0]"
                    />
                    Has Semester End Exam (SEE - 80 M)?
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[#F4EDE0]/80">
                    <input
                      type="checkbox"
                      checked={newHasMSE}
                      onChange={(e) => setNewHasMSE(e.target.checked)}
                      className="accent-[#F4EDE0]"
                    />
                    Has Mid Semester Exam (MSE - 40 M)?
                  </label>
                </div>

                {/* MSE Conversion Scale Scheme in Add Modal */}
                {newHasMSE && (
                  <div className="p-3 rounded-xl bg-[#090e1a]/60 border border-[#F4EDE0]/10 space-y-1.5">
                    <label className="text-[#F4EDE0]/80 block font-semibold text-[11px]">
                      MSE Conversion Scale Scheme:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewMseMaxScale(30)}
                        className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                          newMseMaxScale === 30
                            ? 'bg-[#F4EDE0]/20 border-[#F4EDE0]/50 text-[#F4EDE0] shadow-md'
                            : 'bg-[#090e1a]/70 border-[#F4EDE0]/10 text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                        }`}
                      >
                        <div className="font-bold text-[11px]">Convert to 30 M</div>
                        <div className="text-[10px] text-[#F4EDE0]/60 mt-0.5">
                          {newHasSEE ? '30 MSE + 30 CIA (Standard)' : '30 MSE + 70 CIA (100% CIE)'}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewMseMaxScale(20)}
                        className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                          newMseMaxScale === 20
                            ? 'bg-[#F4EDE0]/20 border-[#F4EDE0]/50 text-[#F4EDE0] shadow-md'
                            : 'bg-[#090e1a]/70 border-[#F4EDE0]/10 text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                        }`}
                      >
                        <div className="font-bold text-[11px] text-[#F4EDE0]">Convert to 20 M</div>
                        <div className="text-[10px] text-[#F4EDE0]/60 mt-0.5">
                          {newHasSEE ? '20 MSE + 40 CIA (Special)' : '20 MSE + 80 CIA (100% CIE)'}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[#F4EDE0]/70 hover:text-[#F4EDE0] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold shadow-lg shadow-black/30 cursor-pointer"
                  >
                    Add Course
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Module Tracker Modal */}
      {activeModuleTrackerSubject && (
        <SubjectModuleTrackerModal
          isOpen={true}
          onClose={() => setActiveModuleTrackerSubject(null)}
          subject={activeModuleTrackerSubject}
          onUpdateSubject={handleUpdateSubject}
          isGuest={profile.isGuest}
          onRequireAuth={onRequireAuth}
        />
      )}

      {/* Target Grade & SEE Predictor Modal */}
      {activeTargetPredictorSubject && (
        <TargetGradePredictorModal
          isOpen={true}
          onClose={() => setActiveTargetPredictorSubject(null)}
          subject={activeTargetPredictorSubject}
          onSelectFavouredGrade={(grade: LetterGrade) => {
            if (profile.isGuest) {
              onRequireAuth?.('save favoured grade to this subject');
              return;
            }
            handleUpdateSubject({
              ...activeTargetPredictorSubject,
              favouredGrade: grade,
            });
          }}
          isGuest={profile.isGuest}
          onRequireAuth={onRequireAuth}
        />
      )}

      {/* Attendance & Leave Planner Modal */}
      {isAttendanceModalOpen && semester && (
        <AttendancePlannerModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          semester={semester}
          onUpdateSemester={onUpdateSemester}
          isGuest={profile.isGuest}
          onRequireAuth={onRequireAuth}
        />
      )}

      {/* Semester What-If Predictor Modal */}
      <SemesterPredictorModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        semNumber={semester.semNumber}
        subjects={semester.subjects}
        onApplyExpectedMarks={handleApplySimulatedMarks}
      />
    </div>
  );
};
