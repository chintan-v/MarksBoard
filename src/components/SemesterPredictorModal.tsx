import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  TrendingUp,
  Zap,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Subject } from '../types';
import {
  calculateSemesterResult,
  calculateSubjectMarks,
} from '../utils/gradeCalculations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  semNumber: number;
  subjects: Subject[];
  onApplyExpectedMarks: (updatedSubjects: Subject[]) => void;
}

export const SemesterPredictorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  semNumber,
  subjects,
  onApplyExpectedMarks,
}) => {
  // Initialize simulated expected SEE scores
  const [expectedSEE, setExpectedSEE] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    subjects.forEach((s) => {
      if (s.hasSEE) {
        if (s.seeRawMarks !== null) {
          map[s.id] = s.seeRawMarks;
        } else if (s.mseRawMarks !== null) {
          // Extrapolate MSE fraction to 80 (MSE is out of 40)
          map[s.id] = Math.min(80, Math.round((s.mseRawMarks / 40) * 80));
        } else {
          map[s.id] = 65; // default reasonable estimate
        }
      }
    });
    return map;
  });

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSliderChange = (subjectId: string, val: number) => {
    setExpectedSEE((prev) => ({
      ...prev,
      [subjectId]: val,
    }));
  };

  // Generate simulated subjects
  const simulatedSubjects: Subject[] = subjects.map((sub) => {
    if (!sub.hasSEE) return sub;
    const expected = expectedSEE[sub.id] ?? 60;
    return {
      ...sub,
      seeRawMarks: expected,
    };
  });

  const simResult = calculateSemesterResult(simulatedSubjects);

  // Quick Preset Handlers
  const handleExtrapolateFromMSE = () => {
    const map: Record<string, number> = {};
    subjects.forEach((s) => {
      if (s.hasSEE) {
        if (s.mseRawMarks !== null) {
          map[s.id] = Math.min(80, Math.round((s.mseRawMarks / 40) * 80));
        } else {
          map[s.id] = 64;
        }
      }
    });
    setExpectedSEE(map);
  };

  const handleAllMax = () => {
    const map: Record<string, number> = {};
    subjects.forEach((s) => {
      if (s.hasSEE) map[s.id] = 80;
    });
    setExpectedSEE(map);
    triggerConfetti();
  };

  const handleMinimumPassing = () => {
    const map: Record<string, number> = {};
    subjects.forEach((s) => {
      if (s.hasSEE) map[s.id] = 28; // 28/80 is external passing threshold
    });
    setExpectedSEE(map);
  };

  const handleRealistic80 = () => {
    const map: Record<string, number> = {};
    subjects.forEach((s) => {
      if (s.hasSEE) map[s.id] = s.credits >= 4 ? 68 : 72;
    });
    setExpectedSEE(map);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // fallback
    }
  };

  const handleApplyToRealData = () => {
    onApplyExpectedMarks(simulatedSubjects);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 shadow-2xl overflow-hidden bg-[#090e1a]/95 max-h-[92vh] flex flex-col my-auto text-[#F4EDE0]">
        {/* Header - Compact */}
        <div className="px-6 py-4 border-b border-[#F4EDE0]/10 flex items-center justify-between bg-gradient-to-r from-[#14213D]/90 via-[#0d172a] to-[#14213D]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F4EDE0]/10 border border-[#F4EDE0]/25 flex items-center justify-center text-[#F4EDE0]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/25">
                  Semester {semNumber}
                </span>
                <span className="text-[11px] text-[#F4EDE0]/70">Interactive "What-If" Engine</span>
              </div>
              <h3 className="text-lg font-bold font-heading text-[#F4EDE0]">
                Semester Result Predictor (SEE Simulator)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F4EDE0]/60 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Projected Stats Banner - Tracker Cards Pattern */}
        <div className="p-4 sm:p-5 border-b border-[#F4EDE0]/10 bg-[#14213D]/50 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Projected SGPA */}
            <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F4EDE0]/70 font-medium">Projected SGPA</span>
                <span className="font-extrabold font-mono text-sm text-[#F4EDE0]">
                  {simResult.sgpa} <span className="text-[10px] text-[#F4EDE0]/50 font-normal">/ 10</span>
                </span>
              </div>
              <div className="w-full bg-[#14213D] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#F4EDE0]/60 to-[#F4EDE0] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, simResult.sgpa * 10))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#F4EDE0]/60 pt-0.5">
                <span>{simResult.totalCredits} Total Credits</span>
                <span className="text-[#F4EDE0] font-medium">{simResult.statusBadge.label}</span>
              </div>
            </div>

            {/* Card 2: Percentage */}
            <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F4EDE0]/70 font-medium">Equivalent Percentage</span>
                <span className="font-extrabold font-mono text-sm text-[#F4EDE0]">
                  {simResult.percentage}%
                </span>
              </div>
              <div className="w-full bg-[#14213D] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#F4EDE0]/60 to-[#F4EDE0] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, simResult.percentage))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#F4EDE0]/60 pt-0.5">
                <span>{simResult.totalGradePoints} Total Points</span>
                <span className="text-[#F4EDE0] font-medium">CBCS Scale</span>
              </div>
            </div>

            {/* Card 3: Clearance Status */}
            <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F4EDE0]/70 font-medium">Clearance Status</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    simResult.hasBacklogs
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {simResult.hasBacklogs ? 'Backlog Alert 🚨' : 'All Cleared ✅'}
                </span>
              </div>
              <div className="w-full bg-[#14213D] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    simResult.hasBacklogs
                      ? 'bg-gradient-to-r from-rose-500 to-red-400'
                      : 'bg-gradient-to-r from-[#F4EDE0]/60 to-[#F4EDE0]'
                  }`}
                  style={{
                    width: `${
                      simResult.totalSubjects > 0
                        ? (simResult.passedSubjects / simResult.totalSubjects) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#F4EDE0]/60 pt-0.5">
                <span>{simResult.passedSubjects} of {simResult.totalSubjects} Passed</span>
                <span className={simResult.hasBacklogs ? 'text-rose-400' : 'text-[#F4EDE0]'}>
                  {simResult.hasBacklogs ? 'Min 28 in SEE required' : 'All Passing'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Scenario Buttons - Slim Single-Line Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F4EDE0]/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#F4EDE0]/70 font-medium mr-1">Quick Presets:</span>
              <button
                type="button"
                onClick={handleExtrapolateFromMSE}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#14213D] text-[#F4EDE0] hover:bg-[#F4EDE0] hover:text-[#14213D] border border-[#F4EDE0]/20 transition-colors flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3 h-3" /> Extrapolate MSE
              </button>
              <button
                type="button"
                onClick={handleAllMax}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#14213D] text-[#F4EDE0] hover:bg-[#F4EDE0] hover:text-[#14213D] border border-[#F4EDE0]/20 transition-colors flex items-center gap-1 font-medium"
              >
                <Zap className="w-3 h-3" /> All 80/80 (Max)
              </button>
              <button
                type="button"
                onClick={handleRealistic80}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#14213D] text-[#F4EDE0] hover:bg-[#F4EDE0] hover:text-[#14213D] border border-[#F4EDE0]/20 transition-colors flex items-center gap-1 font-medium"
              >
                <TrendingUp className="w-3 h-3" /> Target 70/80
              </button>
              <button
                type="button"
                onClick={handleMinimumPassing}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#14213D] text-[#F4EDE0] hover:bg-[#F4EDE0] hover:text-[#14213D] border border-[#F4EDE0]/20 transition-colors flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Passing Only (28/80)
              </button>
            </div>
            <span className="text-[10px] text-[#F4EDE0]/60 hidden md:inline">
              Drag sliders below to simulate marks
            </span>
          </div>
        </div>

        {/* Sliders List - Majority Height Available */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="space-y-3">
            {simulatedSubjects.map((sub) => {
              const calc = calculateSubjectMarks(sub);
              const hasExternal = sub.hasSEE;
              const currentVal = expectedSEE[sub.id] ?? 60;

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl glass-card border border-[#F4EDE0]/15 hover:border-[#F4EDE0]/35 bg-[#14213D]/40 transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F4EDE0]/10 border border-[#F4EDE0]/20 text-[#F4EDE0]">
                        {sub.code}
                      </span>
                      <span className="font-semibold text-[#F4EDE0] text-sm">{sub.name}</span>
                      <span className="text-xs text-[#F4EDE0]/60">({sub.credits} Credits)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#F4EDE0]/70">Total:</span>
                      <span className="font-black font-mono text-sm text-[#F4EDE0]">
                        {calc.totalMarks}/100
                      </span>
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                        calc.grade === 'O' ? 'bg-[#F4EDE0] text-[#14213D] border-[#F4EDE0]' :
                        calc.grade === 'A+' ? 'bg-[#F4EDE0]/20 text-[#F4EDE0] border-[#F4EDE0]/40' :
                        calc.grade === 'F' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                        'bg-[#14213D] text-[#F4EDE0] border-[#F4EDE0]/30'
                      }`}>
                        Grade: {calc.grade} ({calc.gradePoint} GP)
                      </span>
                    </div>
                  </div>

                  {hasExternal ? (
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[#F4EDE0]/80">
                          Expected SEE: <strong className="text-[#F4EDE0]">{currentVal} / 80 Marks</strong>
                          <span className="text-[#F4EDE0]/60 text-[11px] ml-2">
                            (Converted: {(currentVal / 2).toFixed(1)} / 40)
                          </span>
                        </span>
                        <span className="text-[11px] text-[#F4EDE0]/60">
                          {currentVal < 28 ? '⚠️ Below 28 passing mark' : '✅ Clear'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="1"
                        value={currentVal}
                        onChange={(e) => handleSliderChange(sub.id, Number(e.target.value))}
                        className="w-full accent-[#F4EDE0] h-2 bg-[#090e1a] rounded-lg cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-[#F4EDE0]/60 italic pt-1">
                      No SEE exam for this course (100% Internals).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F4EDE0]/10 bg-[#090e1a] flex items-center justify-between">
          <div className="text-xs text-[#F4EDE0]/80">
            Projected SGPA: <strong className="text-[#F4EDE0] font-mono text-sm">{simResult.sgpa}</strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[#F4EDE0]/70 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/10 transition-colors"
            >
              Close Simulation
            </button>
            <button
              onClick={handleApplyToRealData}
              className="px-5 py-2.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs transition-all shadow-lg shadow-[#14213D]/50 flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Save Expected Marks to Semester
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
