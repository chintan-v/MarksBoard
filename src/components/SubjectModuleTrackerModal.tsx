import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, RotateCcw, BookOpen, AlertCircle } from 'lucide-react';
import type { ModuleStatus, Subject, SubjectModule } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
  onUpdateSubject: (updated: Subject) => void;
  isGuest?: boolean;
  onRequireAuth?: (reason: string) => void;
}

export const SubjectModuleTrackerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  subject,
  onUpdateSubject,
  isGuest,
  onRequireAuth,
}) => {
  const [modules, setModules] = useState<SubjectModule[]>(subject.modules);

  if (!isOpen) return null;

  const completedCount = modules.filter(
    (m) => m.status === 'mastered' || m.status === 'pyq_solved'
  ).length;

  const revisedCount = modules.filter((m) => m.revisionCount >= 1).length;
  const deepRevisedCount = modules.filter((m) => m.revisionCount >= 2).length;

  // Preparedness Score: 50% coverage + 50% revision
  const completionPercentage = Math.round((completedCount / 5) * 100);
  const revisionPercentage = Math.round((revisedCount / 5) * 100);
  const preparednessScore = Math.round((completionPercentage * 0.55) + (revisionPercentage * 0.45));

  const handleStatusChange = (moduleId: number, status: ModuleStatus) => {
    const updated = modules.map((m) => (m.id === moduleId ? { ...m, status } : m));
    setModules(updated);
  };

  const handleRevisionToggle = (moduleId: number, targetCount: number) => {
    const updated = modules.map((m) => {
      if (m.id === moduleId) {
        const newCount = m.revisionCount === targetCount ? targetCount - 1 : targetCount;
        return { ...m, revisionCount: Math.max(0, newCount) };
      }
      return m;
    });
    setModules(updated);
  };

  const handleNoteChange = (moduleId: number, note: string) => {
    const updated = modules.map((m) => (m.id === moduleId ? { ...m, notes: note } : m));
    setModules(updated);
  };

  const handleSave = () => {
    if (isGuest) {
      onClose();
      onRequireAuth?.('save module completion checklist and revision notes');
      return;
    }
    onUpdateSubject({
      ...subject,
      modules,
    });
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel rounded-2xl border border-cyan-500/25 shadow-2xl overflow-hidden bg-slate-900/95 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {subject.code}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {subject.credits} Credits • 5 Modules Scheme
              </span>
            </div>
            <h3 className="text-xl font-bold font-heading text-white">
              {subject.name} – Module & Revision Tracker
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Bar */}
        <div className="p-6 border-b border-white/5 bg-slate-950/40 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Syllabus Covered</span>
              <span className="font-bold text-cyan-300">{completedCount}/5 Modules ({completionPercentage}%)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Revision Progress</span>
              <span className="font-bold text-fuchsia-300 font-mono">
                {revisedCount}/5 Revised{deepRevisedCount > 0 ? ` (${deepRevisedCount} R2+)` : ''}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-fuchsia-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${revisionPercentage}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Exam Preparedness</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-bold font-mono ${
                    preparednessScore >= 80
                      ? 'text-emerald-300'
                      : preparednessScore >= 50
                      ? 'text-amber-300'
                      : 'text-rose-300'
                  }`}
                >
                  {preparednessScore}%
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    preparednessScore >= 80
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : preparednessScore >= 50
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {preparednessScore >= 80 ? 'SEE Ready' : preparednessScore >= 50 ? 'In Progress' : 'Needs Focus'}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  preparednessScore >= 80
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : preparednessScore >= 50
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                    : 'bg-gradient-to-r from-rose-500 to-red-400'
                }`}
                style={{ width: `${preparednessScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="text-xs text-slate-400 flex items-center gap-2 p-3 rounded-lg bg-blue-950/20 border border-blue-500/20">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Engineering Weightage Guide:</strong> MSE covers Modules 1 & 2 (20 marks/module, total 40 marks converted to 20 or 30). SEE includes all 5 Modules (16 marks each, total 80 converted to 40).
            </span>
          </div>

          {modules.map((mod) => {
            return (
              <div
                key={mod.id}
                className="p-4 rounded-xl glass-card border border-white/10 hover:border-cyan-500/30 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-white/5 font-mono font-bold text-xs flex items-center justify-center text-cyan-300 border border-white/10">
                      M{mod.id}
                    </span>
                    <div>
                      <h4 className="font-semibold text-slate-100 text-sm">{mod.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {mod.isMSECoverage ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                            MSE (20 M) + SEE (16 M)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                            SEE Exclusive (16 Marks)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> 16 Marks in External
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stage Status Selector */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(mod.id, 'not_started')}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        mod.status === 'not_started'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      😴 Not Started
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(mod.id, 'notes_ready')}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        mod.status === 'notes_ready'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      📝 Notes Ready
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(mod.id, 'pyq_solved')}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        mod.status === 'pyq_solved'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      ✍️ PYQ Solved
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(mod.id, 'mastered')}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        mod.status === 'mastered'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      🧠 Mastered
                    </button>
                  </div>
                </div>

                {/* Revision & Quick Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      <RotateCcw className="w-3.5 h-3.5 text-fuchsia-400" /> Revision Rounds:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRevisionToggle(mod.id, 1)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        mod.revisionCount >= 1
                          ? 'bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-500/50 font-bold'
                          : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Round 1 🔁
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevisionToggle(mod.id, 2)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        mod.revisionCount >= 2
                          ? 'bg-purple-500/30 text-purple-200 border-purple-500/50 font-bold'
                          : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Round 2 ⚡
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevisionToggle(mod.id, 3)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        mod.revisionCount >= 3
                          ? 'bg-cyan-500/30 text-cyan-200 border-cyan-500/50 font-bold'
                          : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      Final Blitz 🏆
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Notes, key derivations, question numbers..."
                      value={mod.notes}
                      onChange={(e) => handleNoteChange(mod.id, e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Progress updates save instantly to your semester profile.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Save Module Progress
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
