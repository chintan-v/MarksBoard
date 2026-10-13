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
      <div className="relative w-full max-w-3xl glass-panel rounded-2xl border border-fuchsia-500/25 shadow-2xl overflow-hidden bg-slate-900/95 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-fuchsia-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  {subject.code}
                </span>
                <span className="text-xs text-slate-400">{subject.credits} Credits</span>
              </div>
              <h3 className="text-xl font-bold font-heading text-white">
                {subject.name} – SEE Predictor & Buffer Analyzer
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Current Internals Locked In */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 font-medium">Internals Locked In (CIE):</span>
              <div className="text-2xl font-black font-heading text-white flex items-baseline gap-2 mt-0.5">
                <span>{currentCalc.totalInternals}</span>
                <span className="text-sm font-normal text-slate-400">/ {subject.hasSEE ? 60 : 100} Marks</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-slate-400">MSE (Raw {subject.mseRawMarks ?? 0}/40): </span>
                <strong className="text-purple-300">{currentCalc.mseScaled}/{currentCalc.mseMaxScale} M</strong>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-slate-400">CIA (Continuous): </span>
                <strong className="text-cyan-300">{currentCalc.ciaScaled}/{currentCalc.ciaMax} M</strong>
              </div>
            </div>
          </div>

          {/* Section 1: Favoured Grade & How Much Can I Afford to Lose */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Select Your Target Grade & Calculate Buffer
              </h4>
              <span className="text-xs text-fuchsia-400 font-medium">
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
                        ? 'bg-gradient-to-b from-fuchsia-600 to-purple-700 text-white border-fuchsia-400 shadow-lg shadow-fuchsia-500/25 scale-105'
                        : 'bg-slate-900/60 text-slate-300 border-white/10 hover:border-white/20 hover:bg-slate-800'
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
                : affordToLose.canAffordToLoseOutOf80 >= 20
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Buffer Analysis for Grade {selectedGrade}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/10 border border-white/10">
                      {affordToLose.vibeTag}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Target: <strong>{affordToLose.targetMinMarks}/100 total marks</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Risk Assessment</div>
                  <div className="text-sm font-bold text-white">{affordToLose.riskLevel}</div>
                </div>
              </div>

              {affordToLose.isAchievable ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
                    <span className="text-xs text-slate-400">Required in SEE (Exam out of 80):</span>
                    <div className="text-3xl font-black font-heading text-amber-300">
                      {affordToLose.requiredRawSEE} <span className="text-sm font-normal text-slate-400">/ 80 Marks</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Converts to {affordToLose.requiredScaledSEE}/40 marks for final result. (Min 28/80 required to pass external).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                    <span className="text-xs text-emerald-300 font-medium">Marks You Can Afford to Lose:</span>
                    <div className="text-3xl font-black font-heading text-emerald-400 flex items-center gap-2">
                      <span>{affordToLose.canAffordToLoseOutOf80}</span>
                      <span className="text-sm font-normal text-slate-400">Marks buffer</span>
                    </div>
                    <p className="text-[11px] text-emerald-300/80">
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
              <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-slate-300 flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Tactical Module Strategy:</strong> Each SEE module offers 16 marks. If you need {affordToLose.requiredRawSEE} marks, thoroughly mastering {Math.min(5, Math.ceil(affordToLose.requiredRawSEE / 16))} of the 5 modules will comfortably get you past the finish line!
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: SEE Prediction based on MSE */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Predicted SEE Score (Extrapolated From MSE)
              </h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Confidence: {prediction.confidence}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              MSE tests ~2 to 2.5 modules (20 marks/module). SEE covers all 5 modules (16 marks/module).
            </p>

            {/* Booster Slider */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Study Momentum Factor:
                </span>
                <span className={`font-bold ${
                  prepBooster > 0 ? 'text-emerald-400' : prepBooster < 0 ? 'text-rose-400' : 'text-slate-300'
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
                className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>😴 Minimal Effort (-20%)</span>
                <span>Normal Pace (0%)</span>
                <span>⚡ Clutch Academic Weapon (+25%)</span>
              </div>
            </div>

            {/* Prediction Output */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-purple-950/30 border border-cyan-500/30 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                <div className="text-xs text-slate-400 mb-1">Predicted Raw SEE</div>
                <div className="text-2xl font-black font-heading text-cyan-300">
                  {prediction.predictedRawSEE} <span className="text-xs font-normal text-slate-400">/ 80 M</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  ({prediction.predictedScaledSEE} / 40 scaled)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                <div className="text-xs text-slate-400 mb-1">Projected Total Marks</div>
                <div className="text-2xl font-black font-heading text-fuchsia-300">
                  {prediction.predictedTotalMarks} <span className="text-xs font-normal text-slate-400">/ 100 M</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  CIE ({currentCalc.totalInternals}) + SEE ({prediction.predictedScaledSEE})
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                <div className="text-xs text-slate-400 mb-1">Projected Grade</div>
                <div className="text-2xl font-black font-heading text-emerald-400 flex items-center justify-center gap-1.5">
                  <Award className="w-5 h-5 text-emerald-400" />
                  {prediction.predictedGrade} ({prediction.predictedGradePoint} GP)
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5">
                  {prediction.predictedGradePoint >= 9 ? 'On track for Distinction! 🏆' : 'Safe passing trajectory'}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic bg-white/[0.02] p-3 rounded-xl border border-white/5">
              💡 {prediction.rationale}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-medium text-xs transition-all shadow-lg shadow-fuchsia-600/30"
          >
            Understood, Let's Secure This! 🎯
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
