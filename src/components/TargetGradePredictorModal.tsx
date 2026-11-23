import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Target,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Award,
  BookOpen,
} from 'lucide-react';
import type { LetterGrade, Subject } from '../types';
import {
  calculateAffordToLose,
  calculateSubjectMarks,
  DSU_GRADE_THRESHOLDS,
  predictSEEMarks,
} from '../utils/gradeCalculations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
  onSelectFavouredGrade?: (grade: LetterGrade) => void;
  isGuest?: boolean;
  onRequireAuth?: (reason: string) => void;
}

export const TargetGradePredictorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  subject,
  onSelectFavouredGrade,
  isGuest,
  onRequireAuth,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<LetterGrade>(subject.favouredGrade || 'O');
  const [prepBooster, setPrepBooster] = useState<number>(0); // -20 to +25%

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

  const currentCalc = calculateSubjectMarks(subject);
  const affordToLose = calculateAffordToLose(subject, selectedGrade);
  const prediction = predictSEEMarks(subject, prepBooster);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 shadow-2xl overflow-hidden bg-[#090e1a]/95 max-h-[92vh] flex flex-col my-auto text-[#F4EDE0]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F4EDE0]/10 flex items-center justify-between bg-gradient-to-r from-[#14213D]/90 via-[#0d172a] to-[#14213D]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4EDE0]/10 border border-[#F4EDE0]/25 flex items-center justify-center text-[#F4EDE0]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/25">
                  {subject.code}
                </span>
                <span className="text-xs text-[#F4EDE0]/70">{subject.credits} Credits</span>
              </div>
              <h3 className="text-xl font-bold font-heading text-[#F4EDE0]">
                {subject.name} – SEE Predictor & Buffer Analyzer
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Current Internals Locked In */}
          <div className="p-4 rounded-2xl bg-[#14213D]/50 border border-[#F4EDE0]/15 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[#F4EDE0]/70 font-medium">Internals Locked In (CIE):</span>
              <div className="text-2xl font-black font-heading text-[#F4EDE0] flex items-baseline gap-2 mt-0.5">
                <span>{currentCalc.totalInternals}</span>
                <span className="text-sm font-normal text-[#F4EDE0]/60">/ {subject.hasSEE ? 60 : 100} Marks</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/10">
                <span className="text-[#F4EDE0]/60">MSE (Raw {subject.mseRawMarks ?? 0}/40): </span>
                <strong className="text-[#F4EDE0] font-mono">{currentCalc.mseScaled}/{currentCalc.mseMaxScale} M</strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/10">
                <span className="text-[#F4EDE0]/60">CIA (Continuous): </span>
                <strong className="text-[#F4EDE0] font-mono">{currentCalc.ciaScaled}/{currentCalc.ciaMax} M</strong>
              </div>
            </div>
          </div>

          {/* Section 1: Favoured Grade & How Much Can I Afford to Lose */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#F4EDE0] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F4EDE0]" />
                Select Your Target Grade & Calculate Buffer
              </h4>
              <span className="text-xs text-[#F4EDE0]/80 font-medium">
                "How much marks can I afford to lose in SEE?"
              </span>
            </div>

            {/* Target Grade Pills */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DSU_GRADE_THRESHOLDS.filter((t) => t.grade !== 'F').map((t) => {
                const isSelected = selectedGrade === t.grade;
                return (
                  <button
                    key={t.grade}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(t.grade);
                      if (onSelectFavouredGrade) {
                        if (isGuest) {
                          onRequireAuth?.('save favoured target grade');
                          return;
                        }
                        onSelectFavouredGrade(t.grade);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-[#F4EDE0] text-[#14213D] border-[#F4EDE0] shadow-lg shadow-[#14213D]/50 scale-105 font-bold'
                        : 'bg-[#14213D]/70 text-[#F4EDE0]/80 border-[#F4EDE0]/15 hover:border-[#F4EDE0]/35 hover:bg-[#14213D]'
                    }`}
                  >
                    <div className="text-base font-bold font-mono">{t.grade}</div>
                    <div className="text-[10px] opacity-80">{t.minMarks}+ Marks</div>
                  </button>
                );
              })}
            </div>

            {/* Afford to Lose Card */}
            <div className={`p-5 rounded-2xl border ${
              !affordToLose.isAchievable
                ? 'bg-rose-950/20 border-rose-500/30'
                : 'bg-[#14213D]/50 border-[#F4EDE0]/20'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F4EDE0]/70">
                      Buffer Analysis for Grade {selectedGrade}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/20">
                      {affordToLose.vibeTag}
                    </span>
                  </div>
                  <div className="text-xs text-[#F4EDE0]/90 mt-1">
                    Target: <strong>{affordToLose.targetMinMarks}/100 total marks</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#F4EDE0]/60">Risk Assessment</div>
                  <div className="text-sm font-bold text-[#F4EDE0]">{affordToLose.riskLevel}</div>
                </div>
              </div>

              {affordToLose.isAchievable ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15 space-y-1">
                    <span className="text-xs text-[#F4EDE0]/70">Required in SEE (Exam out of 80):</span>
                    <div className="text-3xl font-black font-heading text-[#F4EDE0]">
                      {affordToLose.requiredRawSEE} <span className="text-sm font-normal text-[#F4EDE0]/60">/ 80 Marks</span>
                    </div>
                    <p className="text-[11px] text-[#F4EDE0]/60">
                      Converts to {affordToLose.requiredScaledSEE}/40 marks for final result. (Min 28/80 required to pass external).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15 space-y-1">
                    <span className="text-xs text-[#F4EDE0]/80 font-medium">Marks You Can Afford to Lose:</span>
                    <div className="text-3xl font-black font-heading text-[#F4EDE0] flex items-center gap-2">
                      <span>{affordToLose.canAffordToLoseOutOf80}</span>
                      <span className="text-sm font-normal text-[#F4EDE0]/60">Marks buffer</span>
                    </div>
                    <p className="text-[11px] text-[#F4EDE0]/70">
                      You can drop up to {affordToLose.canAffordToLoseOutOf80} marks in the 80-mark SEE paper and still lock in {selectedGrade}! 🛡️
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm mb-1">Target Not Feasible With Current Internals</div>
                    <p>{affordToLose.statusMessage}</p>
                  </div>
                </div>
              )}

              {/* Tactical Advice */}
              <div className="mt-4 p-3 rounded-xl bg-[#090e1a]/60 border border-[#F4EDE0]/10 text-xs text-[#F4EDE0]/80 flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[#F4EDE0] shrink-0" />
                <span>
                  <strong>Tactical Module Strategy:</strong> Each SEE module offers 16 marks. If you need {affordToLose.requiredRawSEE} marks, thoroughly mastering {Math.min(5, Math.ceil(affordToLose.requiredRawSEE / 16))} of the 5 modules will comfortably get you past the finish line!
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: SEE Prediction based on MSE */}
          <div className="space-y-3 pt-2 border-t border-[#F4EDE0]/10">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#F4EDE0] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F4EDE0]" />
                Predicted SEE Score (Extrapolated From MSE)
              </h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/25">
                Confidence: {prediction.confidence}
              </span>
            </div>

            <p className="text-xs text-[#F4EDE0]/70">
              MSE tests ~2 to 2.5 modules (20 marks/module). SEE covers all 5 modules (16 marks/module).
            </p>

            {/* Booster Slider */}
            <div className="p-4 rounded-xl bg-[#14213D]/50 border border-[#F4EDE0]/15 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F4EDE0]/80 font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#F4EDE0]" /> Study Momentum Factor:
                </span>
                <span className={`font-bold ${
                  prepBooster > 0 ? 'text-[#F4EDE0]' : prepBooster < 0 ? 'text-rose-300' : 'text-[#F4EDE0]/70'
                }`}>
                  {prepBooster > 0 ? `+${prepBooster}% (Academic Weapon Boost)` : prepBooster < 0 ? `${prepBooster}% (Minimal Cramming)` : '0% (Standard Pace)'}
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="25"
                step="5"
                value={prepBooster}
                onChange={(e) => setPrepBooster(Number(e.target.value))}
                className="w-full accent-[#F4EDE0] h-2 bg-[#090e1a] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#F4EDE0]/50">
                <span>😴 Minimal Effort (-20%)</span>
                <span>Normal Pace (0%)</span>
                <span>⚡ Clutch Academic Weapon (+25%)</span>
              </div>
            </div>

            {/* Prediction Output */}
            <div className="p-5 rounded-2xl bg-[#14213D]/60 border border-[#F4EDE0]/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/10">
                <div className="text-xs text-[#F4EDE0]/60 mb-1">Predicted Raw SEE</div>
                <div className="text-2xl font-black font-heading text-[#F4EDE0]">
                  {prediction.predictedRawSEE} <span className="text-xs font-normal text-[#F4EDE0]/60">/ 80 M</span>
                </div>
                <div className="text-[10px] text-[#F4EDE0]/50 mt-0.5">
                  ({prediction.predictedScaledSEE} / 40 scaled)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/10">
                <div className="text-xs text-[#F4EDE0]/60 mb-1">Projected Total Marks</div>
                <div className="text-2xl font-black font-heading text-[#F4EDE0]">
                  {prediction.predictedTotalMarks} <span className="text-xs font-normal text-[#F4EDE0]/60">/ 100 M</span>
                </div>
                <div className="text-[10px] text-[#F4EDE0]/50 mt-0.5">
                  CIE ({currentCalc.totalInternals}) + SEE ({prediction.predictedScaledSEE})
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/10">
                <div className="text-xs text-[#F4EDE0]/60 mb-1">Projected Grade</div>
                <div className="text-2xl font-black font-heading text-[#F4EDE0] flex items-center justify-center gap-1.5">
                  <Award className="w-5 h-5 text-[#F4EDE0]" />
                  {prediction.predictedGrade} ({prediction.predictedGradePoint} GP)
                </div>
                <div className="text-[10px] text-[#F4EDE0]/70 mt-0.5">
                  {prediction.predictedGradePoint >= 9 ? 'On track for Distinction! 🏆' : 'Safe passing trajectory'}
                </div>
              </div>
            </div>

            <p className="text-xs text-[#F4EDE0]/70 italic bg-[#090e1a]/50 p-3 rounded-xl border border-[#F4EDE0]/10">
              💡 {prediction.rationale}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F4EDE0]/10 bg-[#090e1a] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs transition-all shadow-lg shadow-[#14213D]/50"
          >
            Understood, Let's Secure This! 🎯
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
