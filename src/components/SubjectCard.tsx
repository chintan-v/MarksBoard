import React, { useState } from 'react';
import {
  Trash2,
  Edit2,
  Sparkles,
  Shield,
  Layers,
  SlidersHorizontal,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { Subject } from '../types';
import { calculateSubjectMarks } from '../utils/gradeCalculations';

interface Props {
  subject: Subject;
  onUpdate: (updated: Subject) => void;
  onDelete: (id: string) => void;
  onOpenModuleTracker: (subject: Subject) => void;
  onOpenTargetPredictor: (subject: Subject) => void;
  isGuest?: boolean;
  onRequireAuth?: (reason: string) => void;
}

export const SubjectCard: React.FC<Props> = ({
  subject,
  onUpdate,
  onDelete,
  onOpenModuleTracker,
  onOpenTargetPredictor,
  isGuest,
  onRequireAuth,
}) => {
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editName, setEditName] = useState(subject.name);
  const [editCode, setEditCode] = useState(subject.code);
  const [editCredits, setEditCredits] = useState(subject.credits);
  const [hasSEE, setHasSEE] = useState(subject.hasSEE);
  const [hasMSE, setHasMSE] = useState(subject.hasMSE);
  const [editMseMaxScale, setEditMseMaxScale] = useState<number>(
    subject.mseMaxScale === 20 ? 20 : 30
  );

  const calc = calculateSubjectMarks(subject);
  const currentMseScale = subject.mseMaxScale === 20 ? 20 : 30;

  const completedModules = subject.modules.filter(
    (m) => m.status === 'mastered' || m.status === 'pyq_solved'
  ).length;
  const revisedModules = subject.modules.filter((m) => m.revisionCount >= 1).length;

  const handleMSEChange = (valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('enter or edit MSE examination marks');
      return;
    }
    const val = valStr === '' ? null : Math.min(40, Math.max(0, Number(valStr)));
    onUpdate({ ...subject, mseRawMarks: val });
  };

  const handleCIAChange = (valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('enter or edit CIA continuous assessment marks');
      return;
    }
    const maxVal = calc.ciaMax;
    const val = valStr === '' ? null : Math.min(maxVal, Math.max(0, Number(valStr)));
    onUpdate({ ...subject, ciaMarks: val, internalDirectMarks: val });
  };

  const handleSEEChange = (valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('enter or edit Semester End Exam (SEE) marks');
      return;
    }
    const val = valStr === '' ? null : Math.min(80, Math.max(0, Number(valStr)));
    onUpdate({ ...subject, seeRawMarks: val });
  };

  const handleToggleMseScale = () => {
    if (isGuest) {
      onRequireAuth?.('change MSE conversion scheme');
      return;
    }
    const nextScale = currentMseScale === 20 ? 30 : 20;
    onUpdate({
      ...subject,
      mseMaxScale: nextScale,
    });
  };

  const handleStartEditMeta = () => {
    if (isGuest) {
      onRequireAuth?.('edit subject course details, code, or credit scheme');
      return;
    }
    setEditName(subject.name);
    setEditCode(subject.code);
    setEditCredits(subject.credits);
    setHasSEE(subject.hasSEE);
    setHasMSE(subject.hasMSE);
    setEditMseMaxScale(subject.mseMaxScale === 20 ? 20 : 30);
    setIsEditingMeta(!isEditingMeta);
  };

  const handleDeleteClick = () => {
    if (isGuest) {
      onRequireAuth?.('delete subjects from this semester');
      return;
    }
    onDelete(subject.id);
  };

  const handleSaveMeta = () => {
    if (isGuest) {
      onRequireAuth?.('save subject course details');
      return;
    }
    onUpdate({
      ...subject,
      name: editName.trim() || subject.name,
      code: editCode.trim().toUpperCase() || subject.code,
      credits: editCredits,
      hasSEE,
      hasMSE,
      mseMaxScale: editMseMaxScale,
    });
    setIsEditingMeta(false);
  };

  return (
    <div className="glass-card glass-card-hover rounded-3xl border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 transition-all p-5 sm:p-6 flex flex-col justify-between group shadow-xl bg-gradient-to-br from-[#14213D]/80 via-[#182747]/65 to-[#14213D]/80 relative">
      <div>
        {/* Top Header Row: Badges & Action Buttons */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {/* Subject Code */}
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-[#F4EDE0]/15 border border-[#F4EDE0]/25 text-[#F4EDE0] shrink-0 shadow-xs">
              {subject.code}
            </span>

            {/* Credit Badge */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border shrink-0 bg-[#F4EDE0]/10 text-[#F4EDE0] border-[#F4EDE0]/20 shadow-xs">
              {subject.credits} {subject.credits === 1 ? 'Credit' : 'Credits'}
            </span>

            {/* Quick 1-Click MSE Scheme Toggle Button */}
            {subject.hasMSE && (
              <button
                type="button"
                onClick={handleToggleMseScale}
                title={`Click to switch MSE conversion scheme (Current: Max ${currentMseScale}). ${
                  subject.hasSEE
                    ? 'Max 30 = 30+30 CIA, Max 20 = 20+40 CIA.'
                    : 'Max 30 = 30+70 CIA, Max 20 = 20+80 CIA.'
                }`}
                className="text-xs font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 bg-[#F4EDE0]/12 text-[#F4EDE0] border-[#F4EDE0]/25 hover:bg-[#F4EDE0]/22 hover:border-[#F4EDE0]/40 shadow-xs"
              >
                <SlidersHorizontal className="w-3 h-3 text-[#F4EDE0] shrink-0" />
                <span>MSE: {currentMseScale}M</span>
              </button>
            )}

            {!subject.hasSEE && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-xl bg-[#F4EDE0]/10 text-[#F4EDE0] border border-[#F4EDE0]/20 shrink-0">
                100% CIE
              </span>
            )}

            {!subject.hasMSE && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-xl bg-[#F4EDE0]/10 text-[#F4EDE0] border border-[#F4EDE0]/20 shrink-0">
                No MSE
              </span>
            )}
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 text-[#F4EDE0]/60 shrink-0">
            <button
              type="button"
              onClick={handleStartEditMeta}
              className="p-1.5 hover:bg-[#F4EDE0]/15 rounded-lg hover:text-[#F4EDE0] transition-colors cursor-pointer"
              title="Edit Subject Course Details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-1.5 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
              title="Delete Subject"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Edit Subject Meta Modal/Panel */}
        {isEditingMeta ? (
          <div className="space-y-3 my-3 p-4 bg-[#14213D]/95 rounded-2xl border border-[#F4EDE0]/25 shadow-xl glass-panel animate-fadeIn">
            <div className="font-semibold text-xs text-[#F4EDE0] border-b border-[#F4EDE0]/12 pb-2">
              Edit Subject Configuration
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#F4EDE0]/70 block mb-1">Subject Code</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="e.g. 22CS701"
                  className="w-full text-xs font-mono uppercase px-2.5 py-1.5 rounded-xl glass-input"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#F4EDE0]/70 block mb-1">Credits</label>
                <select
                  value={editCredits}
                  onChange={(e) => setEditCredits(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl glass-input bg-[#090e1a]"
                >
                  <option value={4}>4 Credits</option>
                  <option value={3}>3 Credits</option>
                  <option value={2}>2 Credits</option>
                  <option value={1}>1 Credit</option>
                  <option value={0}>0 Credits</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#F4EDE0]/70 block mb-1">Subject Title</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Subject Name"
                className="w-full text-xs px-2.5 py-1.5 rounded-xl glass-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[#F4EDE0]/80">
              <label className="flex items-center gap-1.5 cursor-pointer bg-[#090e1a]/60 p-2 rounded-xl border border-[#F4EDE0]/10">
                <input
                  type="checkbox"
                  checked={hasMSE}
                  onChange={(e) => setHasMSE(e.target.checked)}
                  className="accent-[#F4EDE0]"
                />
                <span className="text-[11px]">Has MSE Exam (40 M)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-[#090e1a]/60 p-2 rounded-xl border border-[#F4EDE0]/10">
                <input
                  type="checkbox"
                  checked={hasSEE}
                  onChange={(e) => setHasSEE(e.target.checked)}
                  className="accent-[#F4EDE0]"
                />
                <span className="text-[11px]">Has SEE Exam</span>
              </label>
            </div>

            {/* MSE Conversion Target Selector */}
            {hasMSE && (
              <div className="pt-1">
                <label className="text-[11px] font-semibold text-[#F4EDE0]/80 block mb-1.5">
                  MSE Conversion Scale Scheme:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMseMaxScale(30)}
                    className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      editMseMaxScale === 30
                        ? 'bg-[#F4EDE0]/20 border-[#F4EDE0]/50 text-[#F4EDE0] shadow-md'
                        : 'bg-[#090e1a]/60 border-[#F4EDE0]/10 text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Convert to 30 Marks</div>
                    <div className="text-[10px] text-[#F4EDE0]/60 mt-0.5">
                      {hasSEE ? '30 MSE + 30 CIA' : '30 MSE + 70 CIA'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditMseMaxScale(20)}
                    className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      editMseMaxScale === 20
                        ? 'bg-[#F4EDE0]/20 border-[#F4EDE0]/50 text-[#F4EDE0] shadow-md'
                        : 'bg-[#090e1a]/60 border-[#F4EDE0]/10 text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                    }`}
                  >
                    <div className="font-bold text-[11px] text-[#F4EDE0]">Convert to 20 Marks</div>
                    <div className="text-[10px] text-[#F4EDE0]/60 mt-0.5">
                      {hasSEE ? '20 MSE + 40 CIA' : '20 MSE + 80 CIA'}
                    </div>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F4EDE0]/12">
              <button
                type="button"
                onClick={() => setIsEditingMeta(false)}
                className="text-xs px-3 py-1.5 text-[#F4EDE0]/70 hover:text-[#F4EDE0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMeta}
                className="text-xs px-4 py-1.5 bg-[#F4EDE0] hover:bg-white text-[#14213D] rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>
        ) : (
          /* Subject Title */
          <div
            onClick={handleStartEditMeta}
            className="cursor-pointer group/title flex items-start justify-between gap-2 min-h-[2.85rem] mb-3 select-none"
            title="Click to rename subject, edit code or credits"
          >
            <h3 className="font-bold text-base sm:text-lg text-[#F4EDE0] leading-snug line-clamp-2 group-hover/title:text-white transition-colors">
              {subject.name}
            </h3>
            {subject.name.toLowerCase().startsWith('subject') && (
              <span className="shrink-0 text-[10px] font-medium text-[#F4EDE0] bg-[#F4EDE0]/15 border border-[#F4EDE0]/30 px-2 py-0.5 rounded-lg flex items-center gap-1 mt-0.5 group-hover/title:bg-[#F4EDE0]/25">
                <Edit2 className="w-2.5 h-2.5" /> Rename
              </span>
            )}
          </div>
        )}

        {/* Clean, Perfectly Aligned Assessment Entry Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 my-3.5">
          {/* MSE Input Column */}
          {subject.hasMSE ? (
            <div className="p-3 rounded-2xl bg-[#090e1a]/70 border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 flex flex-col justify-between transition-colors shadow-sm">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-[#F4EDE0]">MSE</span>
                <span className="text-[10px] font-mono text-[#F4EDE0]/60 bg-[#F4EDE0]/10 px-1.5 py-0.5 rounded">
                  /40
                </span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={subject.mseRawMarks ?? ''}
                  onClick={() => {
                    if (isGuest) onRequireAuth?.('enter or edit MSE examination marks');
                  }}
                  onChange={(e) => handleMSEChange(e.target.value)}
                  placeholder="0 - 40"
                  className="w-full text-center text-base sm:text-lg font-bold font-mono py-1 rounded-xl glass-input text-[#F4EDE0] placeholder:text-[#F4EDE0]/30"
                />
              </div>
              <div className="mt-2 pt-1.5 border-t border-[#F4EDE0]/10 flex items-center justify-between text-[11px] font-mono whitespace-nowrap">
                <span className="text-[#F4EDE0]/60 text-[10px]">Scaled:</span>
                <span className="font-bold text-[#F4EDE0]">
                  {calc.mseScaled}
                  <span className="text-[#F4EDE0]/50 text-[10px]">/{currentMseScale}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[#090e1a]/40 border border-[#F4EDE0]/8 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-[#F4EDE0]/60">MSE</span>
              <span className="text-[10px] text-[#F4EDE0]/40 mt-1">No Exam</span>
            </div>
          )}

          {/* CIA Input Column */}
          <div className="p-3 rounded-2xl bg-[#090e1a]/70 border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 flex flex-col justify-between transition-colors shadow-sm">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#F4EDE0]">CIA</span>
              <span className="text-[10px] font-mono text-[#F4EDE0]/60 bg-[#F4EDE0]/10 px-1.5 py-0.5 rounded">
                /{calc.ciaMax}
              </span>
            </div>
            <div>
              <input
                type="number"
                min="0"
                max={calc.ciaMax}
                value={subject.ciaMarks ?? ''}
                onClick={() => {
                  if (isGuest)
                    onRequireAuth?.('enter or edit CIA continuous assessment marks');
                }}
                onChange={(e) => handleCIAChange(e.target.value)}
                placeholder={`0 - ${calc.ciaMax}`}
                className="w-full text-center text-base sm:text-lg font-bold font-mono py-1 rounded-xl glass-input text-[#F4EDE0] placeholder:text-[#F4EDE0]/30"
              />
            </div>
            <div className="mt-2 pt-1.5 border-t border-[#F4EDE0]/10 flex items-center justify-between text-[11px] font-mono whitespace-nowrap">
              <span className="text-[#F4EDE0]/60 text-[10px]">Score:</span>
              <span className="font-bold text-[#F4EDE0]">
                {calc.ciaScaled}
                <span className="text-[#F4EDE0]/50 text-[10px]">/{calc.ciaMax}</span>
              </span>
            </div>
          </div>

          {/* SEE Input Column */}
          {subject.hasSEE ? (
            <div className="p-3 rounded-2xl bg-[#090e1a]/70 border border-[#F4EDE0]/12 hover:border-[#F4EDE0]/35 flex flex-col justify-between transition-colors shadow-sm">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-[#F4EDE0]">SEE</span>
                <span className="text-[10px] font-mono text-[#F4EDE0]/60 bg-[#F4EDE0]/10 px-1.5 py-0.5 rounded">
                  /80
                </span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={subject.seeRawMarks ?? ''}
                  onClick={() => {
                    if (isGuest)
                      onRequireAuth?.('enter or edit Semester End Exam (SEE) marks');
                  }}
                  onChange={(e) => handleSEEChange(e.target.value)}
                  placeholder="0 - 80"
                  className="w-full text-center text-base sm:text-lg font-bold font-mono py-1 rounded-xl glass-input text-[#F4EDE0] placeholder:text-[#F4EDE0]/30"
                />
              </div>
              <div className="mt-2 pt-1.5 border-t border-[#F4EDE0]/10 flex items-center justify-between text-[11px] font-mono whitespace-nowrap">
                <span className="text-[#F4EDE0]/60 text-[10px]">Scaled:</span>
                <span className="font-bold text-[#F4EDE0]">
                  {calc.seeScaled}
                  <span className="text-[#F4EDE0]/50 text-[10px]">/40</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[#090e1a]/40 border border-[#F4EDE0]/8 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-[#F4EDE0]/60">SEE</span>
              <span className="text-[10px] text-[#F4EDE0]/40 mt-1">100% CIE</span>
            </div>
          )}
        </div>

        {/* Unified Internals Summary Strip */}
        <div className="px-3.5 py-2 rounded-xl bg-[#090e1a]/55 border border-[#F4EDE0]/10 flex items-center justify-between text-xs mb-3.5">
          <div className="flex items-center gap-1.5 text-[#F4EDE0]/70">
            <span className="text-[11px]">Total Internals (CIE):</span>
          </div>
          <div className="font-mono font-bold text-[#F4EDE0]">
            {calc.totalInternals}{' '}
            <span className="text-[#F4EDE0]/50 text-[11px]">
              / {subject.hasSEE ? 60 : 100} Marks
            </span>
          </div>
        </div>

        {/* Score & CBCS Grade Result Card */}
        <div className="p-3.5 rounded-2xl bg-[#090e1a]/85 border border-[#F4EDE0]/14 flex items-center justify-between gap-3 shadow-inner">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#F4EDE0]/60">
              Total Score
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-heading text-[#F4EDE0]">
                {calc.totalMarks}
              </span>
              <span className="text-xs font-mono text-[#F4EDE0]/50">/ 100</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-xs font-bold text-[#F4EDE0] font-mono">
                {calc.gradePoint} GP
              </div>
              <div className="text-[10px] font-mono text-[#F4EDE0]/60">
                {calc.creditPoints} CP
              </div>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-black font-heading text-base border shadow-md ${
                calc.grade === 'F'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-[#F4EDE0]/20 text-[#F4EDE0] border-[#F4EDE0]/35'
              }`}
            >
              {calc.grade}
            </div>
          </div>
        </div>

        {/* SEE Pass Alert */}
        {subject.hasSEE && subject.seeRawMarks !== null && subject.seeRawMarks < 28 && (
          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span>External passing requires minimum 28/80 in SEE exam!</span>
          </div>
        )}
      </div>

      {/* Action Buttons & Module Mini Progress */}
      <div className="mt-4 pt-3 border-t border-[#F4EDE0]/10 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Module Tracker Button */}
          <button
            type="button"
            onClick={() => onOpenModuleTracker(subject)}
            className="px-3 py-2 rounded-xl bg-[#F4EDE0]/10 hover:bg-[#F4EDE0]/20 text-[#F4EDE0] border border-[#F4EDE0]/15 hover:border-[#F4EDE0]/35 transition-all text-xs font-semibold flex items-center justify-between cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Layers className="w-3.5 h-3.5 text-[#F4EDE0] shrink-0" />
              <span className="truncate">5 Modules</span>
            </div>
            <span className="text-[10px] font-mono bg-[#F4EDE0]/20 px-1.5 py-0.5 rounded text-[#F4EDE0] shrink-0 ml-1">
              {completedModules}/5{revisedModules > 0 ? ` (${revisedModules}r)` : ''}
            </span>
          </button>

          {/* Afford to Lose & SEE Predictor Button */}
          <button
            type="button"
            onClick={() => onOpenTargetPredictor(subject)}
            className="px-3 py-2 rounded-xl bg-[#F4EDE0]/10 hover:bg-[#F4EDE0]/20 text-[#F4EDE0] border border-[#F4EDE0]/15 hover:border-[#F4EDE0]/35 transition-all text-xs font-semibold flex items-center justify-between cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Shield className="w-3.5 h-3.5 text-[#F4EDE0] shrink-0" />
              <span className="truncate">Afford to Lose</span>
            </div>
            <Sparkles className="w-3 h-3 text-[#F4EDE0] animate-pulse shrink-0 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
