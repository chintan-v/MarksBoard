import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Award, CheckCircle2, AlertTriangle, BookOpen, FileSpreadsheet } from 'lucide-react';
import { DSU_GRADE_THRESHOLDS, DSU_SPECIAL_GRADES } from '../utils/gradeCalculations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collegeName?: string;
}

export const GradingScaleModal: React.FC<Props> = ({ isOpen, onClose, collegeName = 'Dayananda Sagar University' }) => {
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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel rounded-3xl border border-fuchsia-500/25 shadow-2xl overflow-hidden bg-slate-900/95 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  Table 1 Scheme
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {collegeName}
                </span>
              </div>
              <h3 className="text-xl font-bold font-heading text-white">
                Grade Distribution & Points System
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
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Quick Notice Banner */}
          <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-slate-200 font-medium">Evaluation Breakdown for 100 Marks Engineering Course:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-white/5">
                  <span className="font-semibold text-fuchsia-300">Continuous Assessment (60 M CIE):</span>
                  <div className="text-slate-400 mt-0.5">MSE (40 M scaled to 30 or 20) + CIA (30 or 40 M)</div>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-white/5">
                  <span className="font-semibold text-cyan-300">Semester End Exam (40 M):</span>
                  <div className="text-slate-400 mt-0.5">SEE written for 80 M scaled to 40 M</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table 1: Official Sheet Reproduction */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                Table 1: Grade, Points, Grade Description and % of marks
              </h4>
              <span className="text-[11px] font-mono text-fuchsia-400">
                Official University Scheme
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04] text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center">GRADE</th>
                    <th className="py-3 px-4 text-center">GRADE POINTS</th>
                    <th className="py-3 px-4">DESCRIPTION</th>
                    <th className="py-3 px-4 font-mono">% MARKS</th>
                    <th className="py-3 px-4">CAMPUS VIBE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200 text-xs">
                  {DSU_GRADE_THRESHOLDS.map((row) => (
                    <tr key={row.grade} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-bold font-mono text-xs border ${row.badgeColor}`}>
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-base text-white">
                        {row.gradePoint}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {row.description}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-cyan-300">
                        {row.minMarks === 90 ? '90 to 100' :
                         row.minMarks === 80 ? '80 to 89' :
                         row.minMarks === 70 ? '70 to 79' :
                         row.minMarks === 60 ? '60 to 69' :
                         row.minMarks === 55 ? '55 to 59' :
                         row.minMarks === 50 ? '50 to 54' :
                         row.minMarks === 40 ? '40 to 49' : '< 40'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {row.gradePoint === 10 && <span className="text-emerald-400">Untouchable Aura 👑</span>}
                        {row.gradePoint === 9 && <span className="text-cyan-400">Academic Weapon ⚡</span>}
                        {row.gradePoint === 8 && <span className="text-blue-400">Clean Cooking 🔥</span>}
                        {row.gradePoint === 7 && <span className="text-indigo-400">Solid Flex 🚀</span>}
                        {row.gradePoint === 6 && <span className="text-violet-400">Cruising 🤙</span>}
                        {row.gradePoint === 5 && <span className="text-amber-400">Border Patrol ⚠️</span>}
                        {row.gradePoint === 4 && <span className="text-orange-400">Clutch Pass 🛡️</span>}
                        {row.gradePoint === 0 && <span className="text-rose-400">Cooked 💀</span>}
                      </td>
                    </tr>
                  ))}

                  {/* Special Non-Letter Grades from Table 1 */}
                  {DSU_SPECIAL_GRADES.map((row) => (
                    <tr key={row.grade} className="hover:bg-white/[0.02] transition-colors bg-white/[0.01]">
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold font-mono text-xs border ${row.badgeColor}`}>
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                        {row.gradePoint}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-300">
                        {row.description}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-400">
                        {row.percentageMarks}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {row.grade === 'AP' ? <span className="text-emerald-400">Audit Passed ✅ (0-Credit)</span> :
                         row.grade === 'AF' ? <span className="text-rose-400">Audit Reappear ⚠️</span> :
                         'Special Status'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pass Rules & SGPA Formula */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Passing Conditions & Audit Courses
              </h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Aggregate Course Marks: Minimum 40 marks out of 100 for credit courses (Grade P).</li>
                <li>SEE Minimum Requirement: Minimum 28 marks out of 80 (35%) in the external exam.</li>
                <li><strong>Audit & Non-Credit Courses (0 Credits):</strong> Awarded <strong>AP (Audit Pass)</strong> when clearing 40% or <strong>AF (Audit Fail)</strong>. They do not factor into the SGPA denominator.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                SGPA Calculation Formula
              </h4>
              <p className="text-xs text-slate-400">
                Weighted average of earned grade points across credit courses:
              </p>
              <div className="p-2.5 rounded-xl bg-black/40 font-mono text-[11px] text-cyan-300 text-center border border-white/5">
                SGPA = Σ (Course Credits × Grade Points) / Σ (Total Credits)
              </div>
              <p className="text-[11px] text-slate-500">
                Courses with 0 credits and grades AP, AF, IC, NE, W carry no grade points in the SGPA denominator.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium text-xs transition-all shadow-lg shadow-fuchsia-600/30"
          >
            Confirmed, Let's Cook! 🔥
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
