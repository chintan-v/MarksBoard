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
      <div className="relative w-full max-w-4xl glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 shadow-2xl overflow-hidden bg-[#090e1a]/95 max-h-[92vh] flex flex-col my-auto text-[#F4EDE0]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F4EDE0]/10 flex items-center justify-between bg-gradient-to-r from-[#14213D]/90 via-[#0d172a] to-[#14213D]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F4EDE0]/10 border border-[#F4EDE0]/25 flex items-center justify-center text-[#F4EDE0]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/25">
                  Table 1 Scheme
                </span>
                <span className="text-xs text-[#F4EDE0]/70 font-medium">
                  {collegeName}
                </span>
              </div>
              <h3 className="text-xl font-bold font-heading text-[#F4EDE0]">
                Grade Distribution & Points System
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
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Quick Notice Banner */}
          <div className="p-4 rounded-2xl bg-[#14213D]/60 border border-[#F4EDE0]/15 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-[#F4EDE0] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[#F4EDE0] font-medium">Evaluation Breakdown for 100 Marks Engineering Course:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#F4EDE0]/90 pt-1">
                <div className="bg-[#090e1a]/80 p-2.5 rounded-xl border border-[#F4EDE0]/10">
                  <span className="font-semibold text-[#F4EDE0]">Continuous Assessment (60 M CIE):</span>
                  <div className="text-[#F4EDE0]/70 mt-0.5">MSE (40 M scaled to 30 or 20) + CIA (30 or 40 M)</div>
                </div>
                <div className="bg-[#090e1a]/80 p-2.5 rounded-xl border border-[#F4EDE0]/10">
                  <span className="font-semibold text-[#F4EDE0]">Semester End Exam (40 M):</span>
                  <div className="text-[#F4EDE0]/70 mt-0.5">SEE written for 80 M scaled to 40 M</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table 1: Official Sheet Reproduction */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#F4EDE0] text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#F4EDE0]" />
                Table 1: Grade, Points, Grade Description and % of marks
              </h4>
              <span className="text-[11px] font-mono text-[#F4EDE0]/80">
                Official University Scheme
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#F4EDE0]/15 bg-[#090e1a]/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#F4EDE0]/15 bg-[#14213D]/60 text-xs font-semibold text-[#F4EDE0]/80 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center">GRADE</th>
                    <th className="py-3 px-4 text-center">GRADE POINTS</th>
                    <th className="py-3 px-4">DESCRIPTION</th>
                    <th className="py-3 px-4 font-mono">% MARKS</th>
                    <th className="py-3 px-4">CAMPUS VIBE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EDE0]/10 text-[#F4EDE0]/90 text-xs">
                  {DSU_GRADE_THRESHOLDS.map((row) => (
                    <tr key={row.grade} className="hover:bg-[#F4EDE0]/[0.03] transition-colors">
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-bold font-mono text-xs border ${row.badgeColor}`}>
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-base text-[#F4EDE0]">
                        {row.gradePoint}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#F4EDE0]">
                        {row.description}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#F4EDE0]/90">
                        {row.minMarks === 90 ? '90 to 100' :
                         row.minMarks === 80 ? '80 to 89' :
                         row.minMarks === 70 ? '70 to 79' :
                         row.minMarks === 60 ? '60 to 69' :
                         row.minMarks === 55 ? '55 to 59' :
                         row.minMarks === 50 ? '50 to 54' :
                         row.minMarks === 40 ? '40 to 49' : '< 40'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {row.gradePoint === 10 && <span className="text-[#F4EDE0] font-semibold">Untouchable Aura 👑</span>}
                        {row.gradePoint === 9 && <span className="text-[#F4EDE0]/90">Academic Weapon ⚡</span>}
                        {row.gradePoint === 8 && <span className="text-[#F4EDE0]/90">Clean Cooking 🔥</span>}
                        {row.gradePoint === 7 && <span className="text-[#F4EDE0]/80">Solid Flex 🚀</span>}
                        {row.gradePoint === 6 && <span className="text-[#F4EDE0]/80">Cruising 🤙</span>}
                        {row.gradePoint === 5 && <span className="text-[#F4EDE0]/70">Border Patrol ⚠️</span>}
                        {row.gradePoint === 4 && <span className="text-[#F4EDE0]/70">Clutch Pass 🛡️</span>}
                        {row.gradePoint === 0 && <span className="text-rose-400">Cooked 💀</span>}
                      </td>
                    </tr>
                  ))}

                  {/* Special Non-Letter Grades from Table 1 */}
                  {DSU_SPECIAL_GRADES.map((row) => (
                    <tr key={row.grade} className="hover:bg-[#F4EDE0]/[0.03] transition-colors bg-[#F4EDE0]/[0.01]">
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold font-mono text-xs border ${row.badgeColor}`}>
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#F4EDE0]/70">
                        {row.gradePoint}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#F4EDE0]/90">
                        {row.description}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#F4EDE0]/70">
                        {row.percentageMarks}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#F4EDE0]/70">
                        {row.grade === 'AP' ? <span className="text-emerald-300">Audit Passed ✅ (0-Credit)</span> :
                         row.grade === 'AF' ? <span className="text-rose-300">Audit Reappear ⚠️</span> :
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
            <div className="p-4 rounded-2xl bg-[#14213D]/50 border border-[#F4EDE0]/15 space-y-2">
              <h4 className="text-xs font-bold text-[#F4EDE0] uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F4EDE0]" />
                Passing Conditions & Audit Courses
              </h4>
              <ul className="text-xs text-[#F4EDE0]/80 space-y-1.5 list-disc list-inside">
                <li>Aggregate Course Marks: Minimum 40 marks out of 100 for credit courses (Grade P).</li>
                <li>SEE Minimum Requirement: Minimum 28 marks out of 80 (35%) in the external exam.</li>
                <li><strong>Audit & Non-Credit Courses (0 Credits):</strong> Awarded <strong>AP (Audit Pass)</strong> when clearing 40% or <strong>AF (Audit Fail)</strong>. They do not factor into the SGPA denominator.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[#14213D]/50 border border-[#F4EDE0]/15 space-y-2">
              <h4 className="text-xs font-bold text-[#F4EDE0] uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F4EDE0]" />
                SGPA Calculation Formula
              </h4>
              <p className="text-xs text-[#F4EDE0]/80">
                Weighted average of earned grade points across credit courses:
              </p>
              <div className="p-2.5 rounded-xl bg-[#090e1a]/80 font-mono text-[11px] text-[#F4EDE0] text-center border border-[#F4EDE0]/15">
                SGPA = Σ (Course Credits × Grade Points) / Σ (Total Credits)
              </div>
              <p className="text-[11px] text-[#F4EDE0]/60">
                Courses with 0 credits and grades AP, AF, IC, NE, W carry no grade points in the SGPA denominator.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F4EDE0]/10 bg-[#090e1a] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs transition-all shadow-lg shadow-[#14213D]/50"
          >
            Confirmed, Let's Cook! 🔥
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
