import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Award } from 'lucide-react';
import type { Semester, StudentProfile } from '../types';
import {
  calculateCGPA,
  calculateSemesterResult,
  calculateSubjectMarks,
} from '../utils/gradeCalculations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  activeSemester: Semester;
}

export const GradeCardReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profile,
  activeSemester,
}) => {
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

  const semResult = calculateSemesterResult(activeSemester.subjects);
  const globalCGPA = calculateCGPA(profile.semesters, profile.currentSemester);

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${profile.usn}_MarksBoard_Backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 shadow-2xl overflow-hidden bg-[#090e1a]/95 max-h-[92vh] flex flex-col my-auto text-[#F4EDE0] print:border-none print:shadow-none print:max-h-none print:bg-white print:text-black">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-[#F4EDE0]/10 flex items-center justify-between bg-gradient-to-r from-[#14213D]/90 via-[#0d172a] to-[#14213D]/90 print:hidden">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F4EDE0] font-heading">
            <Award className="w-5 h-5 text-[#F4EDE0]" />
            Official Grade Card & Transcript Preview
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl bg-[#F4EDE0]/10 hover:bg-[#F4EDE0]/20 text-[#F4EDE0] text-xs font-semibold border border-[#F4EDE0]/20 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Backup JSON
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F4EDE0]/60 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Transcript Document */}
        <div className="p-8 overflow-y-auto space-y-6 text-[#F4EDE0]/90 print:text-black print:p-6 print:space-y-4">
          {/* Institutional Header */}
          <div className="text-center border-b border-[#F4EDE0]/15 pb-6 print:border-black/20 space-y-1">
            <div className="text-xl md:text-2xl font-black font-heading tracking-wider uppercase text-[#F4EDE0] print:text-black">
              {profile.college}
            </div>
            <div className="text-xs uppercase tracking-widest text-[#F4EDE0]/70 print:text-gray-600 font-semibold">
              School of Engineering • CBCS Performance Grade Sheet
            </div>
            <div className="text-xs text-[#F4EDE0]/80 print:text-black font-mono">
              Academic Assessment Report: {activeSemester.title} ({activeSemester.academicYear})
            </div>
          </div>

          {/* Student Bio Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#14213D]/50 border border-[#F4EDE0]/15 print:bg-gray-100 print:border-gray-300 print:text-black text-xs">
            <div>
              <span className="text-[#F4EDE0]/60 print:text-gray-500 block">Student Name</span>
              <strong className="text-[#F4EDE0] print:text-black text-sm">{profile.name}</strong>
            </div>
            <div>
              <span className="text-[#F4EDE0]/60 print:text-gray-500 block">USN Number</span>
              <strong className="text-[#F4EDE0] print:text-black font-mono text-sm">{profile.usn}</strong>
            </div>
            <div>
              <span className="text-[#F4EDE0]/60 print:text-gray-500 block">Department</span>
              <strong className="text-[#F4EDE0] print:text-black">{profile.branch}</strong>
            </div>
            <div>
              <span className="text-[#F4EDE0]/60 print:text-gray-500 block">Campus Vibe</span>
              <strong className="text-[#F4EDE0] print:text-black">{profile.bio}</strong>
            </div>
          </div>

          {/* Grades Table */}
          <div className="overflow-x-auto rounded-xl border border-[#F4EDE0]/15 print:border-gray-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#14213D]/60 print:bg-gray-200 border-b border-[#F4EDE0]/15 print:border-gray-300 text-[#F4EDE0]/80 print:text-gray-800 font-semibold">
                  <th className="p-3">Course Code</th>
                  <th className="p-3">Course Title</th>
                  <th className="p-3 text-center">Credits</th>
                  <th className="p-3 text-center">MSE (30)</th>
                  <th className="p-3 text-center">CIA (30)</th>
                  <th className="p-3 text-center">SEE (40)</th>
                  <th className="p-3 text-center">Total (100)</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3 text-center">GP</th>
                  <th className="p-3 text-center">Credit Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE0]/10 print:divide-gray-200">
                {activeSemester.subjects.map((sub) => {
                  const calc = calculateSubjectMarks(sub);
                  return (
                    <tr key={sub.id} className="hover:bg-[#F4EDE0]/[0.03]">
                      <td className="p-3 font-mono font-medium text-[#F4EDE0] print:text-black">{sub.code}</td>
                      <td className="p-3 font-medium text-[#F4EDE0] print:text-black">{sub.name}</td>
                      <td className="p-3 text-center font-mono font-bold">{sub.credits}</td>
                      <td className="p-3 text-center font-mono text-[#F4EDE0]/80 print:text-black">
                        {sub.hasMSE ? `${calc.mseScaled}` : '—'}
                      </td>
                      <td className="p-3 text-center font-mono text-[#F4EDE0]/80 print:text-black">
                        {calc.ciaScaled}
                      </td>
                      <td className="p-3 text-center font-mono text-[#F4EDE0]/80 print:text-black">
                        {sub.hasSEE ? `${calc.seeScaled}` : '—'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-[#F4EDE0] print:text-black">
                        {calc.totalMarks}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          calc.grade === 'O' ? 'bg-[#F4EDE0] text-[#14213D] print:text-black' :
                          calc.grade === 'A+' ? 'bg-[#F4EDE0]/30 text-[#F4EDE0] border border-[#F4EDE0]/30 print:text-black' :
                          calc.grade === 'F' ? 'bg-rose-500/20 text-rose-300 print:text-black' :
                          'text-[#F4EDE0] bg-[#14213D] border border-[#F4EDE0]/20 print:text-black'
                        }`}>
                          {calc.grade}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-[#F4EDE0]">{calc.gradePoint}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#F4EDE0] print:text-black">
                        {calc.creditPoints}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Results Summary Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#14213D]/50 border border-[#F4EDE0]/15 print:bg-gray-100 print:border-gray-300 text-center text-xs">
            <div>
              <span className="text-[#F4EDE0]/60 print:text-gray-500">Credits Registered</span>
              <div className="text-xl font-bold font-mono text-[#F4EDE0] print:text-black">{semResult.totalCredits}</div>
            </div>
            <div>
              <span className="text-[#F4EDE0]/60 print:text-gray-500">Semester SGPA</span>
              <div className="text-2xl font-black font-heading text-[#F4EDE0] print:text-black">{semResult.sgpa}</div>
            </div>
            <div>
              <span className="text-[#F4EDE0]/60 print:text-gray-500">Percentage Equivalent</span>
              <div className="text-xl font-bold font-mono text-[#F4EDE0]/90 print:text-black">{semResult.percentage}%</div>
            </div>
            <div>
              <span className="text-[#F4EDE0]/60 print:text-gray-500">Cumulative CGPA</span>
              <div className="text-2xl font-black font-heading text-[#F4EDE0] print:text-black">{globalCGPA.cgpa}</div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F4EDE0]/10 print:border-gray-300 text-[11px] text-[#F4EDE0]/50 print:text-gray-500 flex justify-between items-center">
            <span>Generated via MarksBoard Engineering System • Verified CBCS Scheme</span>
            <span>Status: {semResult.hasBacklogs ? 'Backlogs Pending' : 'Clear & In Good Standing ✅'}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
