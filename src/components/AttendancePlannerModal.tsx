import React, { useState, useEffect, useMemo, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Info,
  RotateCcw,
  Bot,
  Key,
  Loader2,
  Wand2,
  FlaskConical,
  BookOpen,
} from 'lucide-react';
import type {
  CalendarHoliday,
  ClassSlotType,
  DayOfWeek,
  Semester,
  SemesterAttendanceConfig,
  SubjectAttendanceRecord,
  TimetableSlot,
} from '../types';
import {
  DAYS_OF_WEEK,
  DEFAULT_SUGGESTED_HOLIDAYS,
  STANDARD_TIME_SLOTS,
  PRACTICAL_TIME_SLOTS,
  calculateAllSemesterAttendanceAnalyses,
  calculateWorkingDaysDistribution,
  createDefaultAttendanceConfig,
} from '../utils/attendanceCalculations';
import {
  analyzeAcademicDocumentsWithAI,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  hasGeminiApiKey,
  type AIExtractionResult,
} from '../utils/geminiAnalyzer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  semester?: Semester | null;
  onUpdateSemester: (updated: Semester) => void;
  isGuest?: boolean;
  onRequireAuth?: (reason: string) => void;
}

// Robust fallback error boundary so the modal NEVER crashes the app to a blank screen
interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AttendanceErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Attendance Modal Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Attendance Calculation Error</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            A temporary mismatch occurred while reading your timetable or calendar dates:
            <br />
            <span className="font-mono text-rose-300 mt-1 block">{this.state.error?.message}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-2 mx-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Timetable & Schedule to Default</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AttendancePlannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  semester,
  onUpdateSemester,
  isGuest,
  onRequireAuth,
}) => {
  // Guard against undefined semester
  const safeSemester: Semester = useMemo(() => {
    if (semester && typeof semester === 'object' && Array.isArray(semester.subjects)) {
      return semester;
    }
    return {
      semNumber: semester?.semNumber || 5,
      title: semester?.title || 'Semester 5',
      academicYear: semester?.academicYear || '3rd Year',
      subjects: semester?.subjects || [],
      isCompleted: semester?.isCompleted || false,
    };
  }, [semester]);

  // Clean config with all arrays and objects guaranteed
  const getInitialConfig = (sem: Semester): SemesterAttendanceConfig => {
    if (sem.attendanceConfig && typeof sem.attendanceConfig === 'object') {
      return {
        startDate: sem.attendanceConfig.startDate || '2026-08-03',
        endDate: sem.attendanceConfig.endDate || '2026-12-18',
        workingDays:
          Array.isArray(sem.attendanceConfig.workingDays) &&
          sem.attendanceConfig.workingDays.length > 0
            ? sem.attendanceConfig.workingDays
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        holidays: Array.isArray(sem.attendanceConfig.holidays)
          ? sem.attendanceConfig.holidays
          : [],
        timetable: Array.isArray(sem.attendanceConfig.timetable)
          ? sem.attendanceConfig.timetable
          : [],
        subjectRecords: sem.attendanceConfig.subjectRecords || {},
        targetPercentage: sem.attendanceConfig.targetPercentage || 75,
        calendarFileName: sem.attendanceConfig.calendarFileName,
        calendarFileDataUrl: sem.attendanceConfig.calendarFileDataUrl,
        timetableFileName: sem.attendanceConfig.timetableFileName,
        timetableFileDataUrl: sem.attendanceConfig.timetableFileDataUrl,
      };
    }
    return createDefaultAttendanceConfig(sem);
  };

  const [config, setConfig] = useState<SemesterAttendanceConfig>(() =>
    getInitialConfig(safeSemester)
  );

  // Active Tab
  const [activeTab, setActiveTab] = useState<'tracker' | 'calendar' | 'timetable'>('tracker');

  // Target Attendance (Preset 75, 85, or custom)
  const [targetPreset, setTargetPreset] = useState<'75' | '85' | 'custom'>(() => {
    const t = safeSemester.attendanceConfig?.targetPercentage || 75;
    if (t === 75) return '75';
    if (t === 85) return '85';
    return 'custom';
  });
  const [customTarget, setCustomTarget] = useState<number>(() => {
    return safeSemester.attendanceConfig?.targetPercentage || 80;
  });

  const effectiveTarget = targetPreset === 'custom' ? customTarget : Number(targetPreset);

  // Subject Conducted Override Accordion State
  const [expandedAdjustSubjectId, setExpandedAdjustSubjectId] = useState<string | null>(null);

  // New Holiday Form State
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayTitle, setNewHolidayTitle] = useState('');

  // New Timetable Slot Form State
  const [slotDay, setSlotDay] = useState<DayOfWeek>('Monday');
  const [slotSubjectId, setSlotSubjectId] = useState<string>(
    safeSemester.subjects[0]?.id || ''
  );
  const [slotType, setSlotType] = useState<ClassSlotType>('theory');
  const [slotTime, setSlotTime] = useState<string>(STANDARD_TIME_SLOTS[0]);

  // AI Document Scanning State
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIExtractionResult | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredGeminiApiKey());
  const [hasKey, setHasKey] = useState(() => hasGeminiApiKey());

  // Synchronize local state with props when semester changes or modal opens
  useEffect(() => {
    if (safeSemester.attendanceConfig) {
      setConfig(getInitialConfig(safeSemester));
      const t = safeSemester.attendanceConfig.targetPercentage || 75;
      if (t === 75 || t === 85) {
        setTargetPreset(String(t) as '75' | '85');
      } else {
        setTargetPreset('custom');
        setCustomTarget(t);
      }
    } else {
      const def = createDefaultAttendanceConfig(safeSemester);
      setConfig(def);
    }
    if (safeSemester.subjects.length > 0 && !slotSubjectId) {
      setSlotSubjectId(safeSemester.subjects[0].id);
    }
  }, [safeSemester]);

  // Prevent background scroll while open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save changes to parent semester
  const saveConfig = (newConfig: SemesterAttendanceConfig) => {
    setConfig(newConfig);
    onUpdateSemester({
      ...safeSemester,
      attendanceConfig: newConfig,
    });
  };

  const handleResetToDefaults = () => {
    const fresh = createDefaultAttendanceConfig(safeSemester);
    saveConfig(fresh);
    setTargetPreset('75');
    setCustomTarget(75);
  };

  // AI Scan Trigger
  const handleTriggerAiScan = async () => {
    if (isGuest) {
      onRequireAuth?.('use AI document scanner');
      return;
    }

    if (!config.calendarFileDataUrl && !config.timetableFileDataUrl) {
      alert(
        'Please upload your Academic Calendar and/or Timetable document (PDF or Image) first!'
      );
      return;
    }

    const currentKey = getStoredGeminiApiKey();
    if (!currentKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsAiScanning(true);
    setAiError(null);
    setAiResult(null);

    try {
      const result = await analyzeAcademicDocumentsWithAI({
        calendarFileDataUrl: config.calendarFileDataUrl,
        calendarFileName: config.calendarFileName,
        timetableFileDataUrl: config.timetableFileDataUrl,
        timetableFileName: config.timetableFileName,
        subjects: safeSemester.subjects,
        semNumber: safeSemester.semNumber,
        apiKey: currentKey,
      });
      setAiResult(result);
    } catch (err: any) {
      console.error('AI Scan error:', err);
      setAiError(
        err.message ||
          'AI was unable to extract the schedule. Please check the document format or your API key.'
      );
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleApplyAiResult = () => {
    if (!aiResult) return;

    const updatedConfig: SemesterAttendanceConfig = {
      ...config,
      startDate: aiResult.startDate || config.startDate,
      endDate: aiResult.endDate || config.endDate,
      workingDays:
        aiResult.workingDays.length > 0 ? aiResult.workingDays : config.workingDays,
      holidays: aiResult.holidays.length > 0 ? aiResult.holidays : config.holidays,
      timetable: aiResult.timetable.length > 0 ? aiResult.timetable : config.timetable,
    };

    saveConfig(updatedConfig);
    setAiResult(null);
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredGeminiApiKey(apiKeyInput.trim());
    setHasKey(hasGeminiApiKey());
    setIsApiKeyModalOpen(false);

    if (apiKeyInput.trim() && (config.calendarFileDataUrl || config.timetableFileDataUrl)) {
      // Automatically trigger scan after setting key
      setTimeout(() => {
        handleTriggerAiScan();
      }, 100);
    }
  };

  // Target change handler
  const handleTargetChange = (preset: '75' | '85' | 'custom', customVal?: number) => {
    setTargetPreset(preset);
    const targetVal = preset === 'custom' ? customVal ?? customTarget : Number(preset);
    if (preset === 'custom' && customVal !== undefined) {
      setCustomTarget(customVal);
    }
    saveConfig({
      ...config,
      targetPercentage: targetVal,
    });
  };

  // Calendar dates update
  const handleDateChange = (field: 'startDate' | 'endDate', val: string) => {
    if (isGuest) {
      onRequireAuth?.('customize semester academic calendar');
      return;
    }
    saveConfig({
      ...config,
      [field]: val,
    });
  };

  // Working day toggle
  const handleToggleWorkingDay = (day: DayOfWeek) => {
    if (isGuest) {
      onRequireAuth?.('change weekly working days');
      return;
    }
    const current = [...(config.workingDays || [])];
    const exists = current.includes(day);
    const updated = exists ? current.filter((d) => d !== day) : [...current, day];
    saveConfig({
      ...config,
      workingDays: updated,
    });
  };

  // Holiday management
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      onRequireAuth?.('add academic calendar holidays');
      return;
    }
    if (!newHolidayDate || !newHolidayTitle.trim()) return;

    const newH: CalendarHoliday = {
      id: `hol-${Date.now()}`,
      date: newHolidayDate,
      title: newHolidayTitle.trim(),
    };

    saveConfig({
      ...config,
      holidays: [...(config.holidays || []), newH].sort((a, b) => a.date.localeCompare(b.date)),
    });

    setNewHolidayDate('');
    setNewHolidayTitle('');
  };

  const handleDeleteHoliday = (id: string) => {
    if (isGuest) {
      onRequireAuth?.('remove holidays');
      return;
    }
    saveConfig({
      ...config,
      holidays: (config.holidays || []).filter((h) => h.id !== id),
    });
  };

  const handleImportSuggestedHolidays = () => {
    if (isGuest) {
      onRequireAuth?.('import standard holidays');
      return;
    }
    const existingDates = new Set((config.holidays || []).map((h) => h.date));
    const toAdd = DEFAULT_SUGGESTED_HOLIDAYS.filter(
      (h) => h.date >= config.startDate && h.date <= config.endDate && !existingDates.has(h.date)
    );

    saveConfig({
      ...config,
      holidays: [...(config.holidays || []), ...toAdd].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    });
  };

  // File Upload Handlers (Calendar & Timetable)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'calendar' | 'timetable'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isGuest) {
      onRequireAuth?.('upload academic documents');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'calendar') {
        saveConfig({
          ...config,
          calendarFileName: file.name,
          calendarFileDataUrl: dataUrl,
        });
      } else {
        saveConfig({
          ...config,
          timetableFileName: file.name,
          timetableFileDataUrl: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (type: 'calendar' | 'timetable') => {
    if (type === 'calendar') {
      saveConfig({
        ...config,
        calendarFileName: undefined,
        calendarFileDataUrl: undefined,
      });
    } else {
      saveConfig({
        ...config,
        timetableFileName: undefined,
        timetableFileDataUrl: undefined,
      });
    }
  };

  // Timetable Slot Management
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      onRequireAuth?.('modify weekly timetable');
      return;
    }
    if (!slotSubjectId) return;

    const newSlot: TimetableSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      day: slotDay,
      subjectId: slotSubjectId,
      slotTime,
      type: slotType,
    };

    saveConfig({
      ...config,
      timetable: [...(config.timetable || []), newSlot],
    });
  };

  const handleToggleSlotType = (id: string) => {
    if (isGuest) {
      onRequireAuth?.('modify weekly timetable');
      return;
    }
    saveConfig({
      ...config,
      timetable: (config.timetable || []).map((s) =>
        s.id === id
          ? {
              ...s,
              type: s.type === 'practical' ? 'theory' : 'practical',
              slotTime:
                s.type === 'practical'
                  ? STANDARD_TIME_SLOTS[0]
                  : PRACTICAL_TIME_SLOTS[0],
            }
          : s
      ),
    });
  };

  const handleDeleteSlot = (id: string) => {
    if (isGuest) {
      onRequireAuth?.('remove timetable slot');
      return;
    }
    saveConfig({
      ...config,
      timetable: (config.timetable || []).filter((s) => s.id !== id),
    });
  };

  const handleAutoFillTimetable = () => {
    if (isGuest) {
      onRequireAuth?.('auto-generate timetable');
      return;
    }
    const freshDef = createDefaultAttendanceConfig(safeSemester);
    saveConfig({
      ...config,
      timetable: freshDef.timetable,
    });
  };

  const handleClearTimetable = () => {
    if (isGuest) {
      onRequireAuth?.('clear timetable');
      return;
    }
    if (window.confirm('Clear all timetable slots for this semester?')) {
      saveConfig({
        ...config,
        timetable: [],
      });
    }
  };

  // Attendance Record Updates (key can be sub.id, sub.id__theory, or sub.id__practical)
  const handleUpdateAttended = (analysisId: string, delta: number) => {
    if (isGuest) {
      onRequireAuth?.('record attendance');
      return;
    }
    const targetAnalysis = subjectAnalyses.find((s) => s.id === analysisId);
    if (!targetAnalysis) return;

    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[analysisId] || {
      subjectId: targetAnalysis.subjectId,
      attendedClasses: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const maxLimit = targetAnalysis.conductedClasses || 100;
    const curAttended = currentRecord.attendedClasses ?? targetAnalysis.attendedClasses;
    const newAttended = Math.max(0, Math.min(maxLimit, curAttended + delta));

    const updatedMap: Record<string, SubjectAttendanceRecord> = {
      ...subjectMap,
      [analysisId]: {
        ...currentRecord,
        attendedClasses: newAttended,
      },
    };

    // If this is an integrated item (ends with __theory or __practical),
    // sync the parent subjectRecord[targetAnalysis.subjectId] as well
    if (analysisId.includes('__')) {
      const parentSubId = targetAnalysis.subjectId;
      const thKey = `${parentSubId}__theory`;
      const prKey = `${parentSubId}__practical`;
      const thVal =
        analysisId === thKey
          ? newAttended
          : updatedMap[thKey]?.attendedClasses ?? updatedMap[parentSubId]?.attendedTheory ?? 0;
      const prVal =
        analysisId === prKey
          ? newAttended
          : updatedMap[prKey]?.attendedClasses ?? updatedMap[parentSubId]?.attendedPractical ?? 0;

      updatedMap[parentSubId] = {
        ...(updatedMap[parentSubId] || { subjectId: parentSubId }),
        attendedClasses: thVal + prVal,
        attendedTheory: thVal,
        attendedPractical: prVal,
      };
    }

    saveConfig({
      ...config,
      subjectRecords: updatedMap,
    });
  };

  const handleSetAttendedDirect = (analysisId: string, valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('record attendance');
      return;
    }
    const num = parseInt(valStr, 10);
    const valid = isNaN(num) ? 0 : Math.max(0, num);

    const targetAnalysis = subjectAnalyses.find((s) => s.id === analysisId);
    if (!targetAnalysis) return;

    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[analysisId] || {
      subjectId: targetAnalysis.subjectId,
      attendedClasses: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const maxLimit = targetAnalysis.conductedClasses || 100;
    const finalVal = Math.min(maxLimit, valid);

    const updatedMap: Record<string, SubjectAttendanceRecord> = {
      ...subjectMap,
      [analysisId]: {
        ...currentRecord,
        attendedClasses: finalVal,
      },
    };

    if (analysisId.includes('__')) {
      const parentSubId = targetAnalysis.subjectId;
      const thKey = `${parentSubId}__theory`;
      const prKey = `${parentSubId}__practical`;
      const thVal =
        analysisId === thKey
          ? finalVal
          : updatedMap[thKey]?.attendedClasses ?? updatedMap[parentSubId]?.attendedTheory ?? 0;
      const prVal =
        analysisId === prKey
          ? finalVal
          : updatedMap[prKey]?.attendedClasses ?? updatedMap[parentSubId]?.attendedPractical ?? 0;

      updatedMap[parentSubId] = {
        ...(updatedMap[parentSubId] || { subjectId: parentSubId }),
        attendedClasses: thVal + prVal,
        attendedTheory: thVal,
        attendedPractical: prVal,
      };
    }

    saveConfig({
      ...config,
      subjectRecords: updatedMap,
    });
  };

  // Manual Conducted Override (for cancelled classes / sessions)
  const handleSetConductedOverride = (analysisId: string, valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('override conducted classes');
      return;
    }
    const targetAnalysis = subjectAnalyses.find((s) => s.id === analysisId);
    if (!targetAnalysis) return;

    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[analysisId] || {
      subjectId: targetAnalysis.subjectId,
      attendedClasses: targetAnalysis.attendedClasses,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const overrideVal = valStr.trim() === '' ? null : Math.max(0, parseInt(valStr, 10) || 0);

    saveConfig({
      ...config,
      subjectRecords: {
        ...subjectMap,
        [analysisId]: {
          ...currentRecord,
          manualConductedOverride: overrideVal,
        },
      },
    });
  };

  // Manual Total Planned Classes Override
  const handleSetTotalPlannedOverride = (analysisId: string, valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('override total semester classes');
      return;
    }
    const targetAnalysis = subjectAnalyses.find((s) => s.id === analysisId);
    if (!targetAnalysis) return;

    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[analysisId] || {
      subjectId: targetAnalysis.subjectId,
      attendedClasses: targetAnalysis.attendedClasses,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const overrideVal = valStr.trim() === '' ? null : Math.max(1, parseInt(valStr, 10) || 1);

    saveConfig({
      ...config,
      subjectRecords: {
        ...subjectMap,
        [analysisId]: {
          ...currentRecord,
          manualTotalPlannedOverride: overrideVal,
        },
      },
    });
  };

  // Calculations for all subjects (Theory and Practicals counted as different subjects in attendance!)
  const subjectAnalyses = useMemo(() => {
    return calculateAllSemesterAttendanceAnalyses(
      safeSemester.subjects || [],
      config,
      effectiveTarget
    );
  }, [safeSemester.subjects, config, effectiveTarget]);

  // Aggregate stats
  const totalAttendedAll = subjectAnalyses.reduce((acc, s) => acc + s.attendedClasses, 0);
  const totalConductedAll = subjectAnalyses.reduce((acc, s) => acc + s.conductedClasses, 0);
  const overallPercentage =
    totalConductedAll > 0
      ? Number(((totalAttendedAll / totalConductedAll) * 100).toFixed(1))
      : 100.0;

  const totalBunkableAcross = subjectAnalyses.reduce((acc, s) => acc + s.canBunkMore, 0);
  const shortageSubjectsCount = subjectAnalyses.filter((s) => s.isShortage).length;

  const { totalWorkingDays } = calculateWorkingDaysDistribution(
    config.startDate,
    config.endDate,
    config.workingDays,
    config.holidays
  );

  const hasUploadedDocs = Boolean(config.calendarFileDataUrl || config.timetableFileDataUrl);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-5xl glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 shadow-2xl overflow-hidden bg-[#090e1a]/95 max-h-[94vh] flex flex-col my-auto text-[#F4EDE0]">
        <AttendanceErrorBoundary onReset={handleResetToDefaults}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#F4EDE0]/10 flex items-center justify-between bg-gradient-to-r from-[#14213D]/90 via-[#0d172a] to-[#14213D]/90 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#F4EDE0]/10 border border-[#F4EDE0]/25 flex items-center justify-center text-[#F4EDE0] shadow-lg shadow-[#14213D]/40">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-heading text-[#F4EDE0]">
                    Attendance & Leave Allowance Forecaster
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/25">
                    Sem {safeSemester.semNumber}
                  </span>
                </div>
                <p className="text-xs text-[#F4EDE0]/70 mt-0.5">
                  AI reads your uploaded calendar & timetable, detects cancellations, and computes your safe leave margins!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* AI Scanner Button in Header */}
              <button
                type="button"
                onClick={handleTriggerAiScan}
                disabled={isAiScanning || !hasUploadedDocs}
                className="px-3.5 py-1.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs shadow-md shadow-[#14213D]/40 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title={
                  hasUploadedDocs
                    ? 'Let Gemini AI scan uploaded calendar & timetable'
                    : 'Upload your Academic Calendar or Timetable first to enable AI Scanning'
                }
              >
                {isAiScanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Scanning...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-[#14213D] animate-pulse" />
                    <span>Scan with AI</span>
                  </>
                )}
              </button>

              {/* Gemini Key Settings */}
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                  hasKey
                    ? 'bg-[#F4EDE0]/20 border-[#F4EDE0]/30 text-[#F4EDE0] hover:bg-[#F4EDE0]/30'
                    : 'bg-[#090e1a]/80 border-[#F4EDE0]/10 text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                }`}
                title={hasKey ? 'Gemini AI API Key active' : 'Configure Gemini API Key'}
              >
                <Key className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#F4EDE0]/60 hover:text-[#F4EDE0] hover:bg-[#F4EDE0]/10 transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AI Status Banners */}
          {isAiScanning && (
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-[#14213D]/80 border border-[#F4EDE0]/30 text-[#F4EDE0] text-xs flex items-center gap-3.5 animate-pulse shadow-lg">
              <Loader2 className="w-6 h-6 text-[#F4EDE0] animate-spin shrink-0" />
              <div>
                <h5 className="font-bold text-sm text-[#F4EDE0] mb-0.5">
                  🤖 Gemini AI is reading your uploaded documents...
                </h5>
                <p className="text-[11px] text-[#F4EDE0]/80">
                  Extracting semester dates, identifying holiday lists, and matching timetable class periods to your course cards.
                </p>
              </div>
            </div>
          )}

          {aiError && (
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3 shadow-lg animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-bold text-rose-100 block text-sm">AI Scan Notice:</strong>
                <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">{aiError}</p>
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className="mt-2 text-[11px] underline text-[#F4EDE0] hover:text-white font-semibold"
                >
                  Verify or update your Gemini API Key
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAiError(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* AI Result Review Card */}
          {aiResult && (
            <div className="mx-6 mt-4 p-5 rounded-2xl bg-[#14213D]/70 border border-[#F4EDE0]/30 shadow-2xl animate-fadeIn space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#F4EDE0]/10 text-[#F4EDE0] flex items-center justify-center">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#F4EDE0] flex items-center gap-1.5">
                      <span>AI Document Analysis Complete</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Ready to Apply
                      </span>
                    </h4>
                    <p className="text-xs text-[#F4EDE0]/80 mt-0.5">{aiResult.summary}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAiResult(null)}
                  className="text-[#F4EDE0]/60 hover:text-[#F4EDE0] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15">
                  <span className="text-[10px] text-[#F4EDE0]/60 uppercase font-semibold block">
                    Detected Semester
                  </span>
                  <strong className="text-[#F4EDE0] font-mono text-sm block mt-0.5">
                    {aiResult.startDate} → {aiResult.endDate}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15">
                  <span className="text-[10px] text-[#F4EDE0]/60 uppercase font-semibold block">
                    Holidays Found
                  </span>
                  <strong className="text-[#F4EDE0] font-mono text-sm block mt-0.5">
                    {aiResult.holidays.length} Holidays Detected
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15">
                  <span className="text-[10px] text-[#F4EDE0]/60 uppercase font-semibold block">
                    Timetable Classes
                  </span>
                  <strong className="text-[#F4EDE0] font-mono text-sm block mt-0.5">
                    {aiResult.timetable.length} Class Slots Mapped
                  </strong>
                  <span className="text-[10px] text-[#F4EDE0]/60 block mt-0.5 font-medium">
                    {aiResult.theoryCount ?? aiResult.timetable.filter((s) => s.type !== 'practical').length} Theory •{' '}
                    {aiResult.practicalCount ?? aiResult.timetable.filter((s) => s.type === 'practical').length} Practical/Lab
                  </span>
                </div>
              </div>

              {aiResult.calendarNotes && (
                <div className="text-[11px] text-[#F4EDE0]/80 bg-[#090e1a]/60 p-2.5 rounded-xl border border-[#F4EDE0]/10">
                  💡 <strong>Detected Details:</strong> {aiResult.calendarNotes}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAiResult(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#090e1a]/80 hover:bg-[#090e1a] text-[#F4EDE0]/70 text-xs transition-colors cursor-pointer border border-[#F4EDE0]/10"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleApplyAiResult}
                  className="px-4 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs shadow-lg shadow-[#14213D]/50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply AI Extracted Schedule</span>
                </button>
              </div>
            </div>
          )}

          {/* Global Summary Stats Bar */}
          <div className="px-6 py-3 bg-[#14213D]/50 border-b border-[#F4EDE0]/10 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  overallPercentage >= effectiveTarget
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                %
              </div>
              <div>
                <span className="text-[10px] text-[#F4EDE0]/60 uppercase font-semibold block">
                  Semester Attendance
                </span>
                <span
                  className={`text-base font-extrabold font-heading ${
                    overallPercentage >= effectiveTarget ? 'text-[#F4EDE0]' : 'text-rose-300'
                  }`}
                >
                  {overallPercentage}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F4EDE0]/10 text-[#F4EDE0] border border-[#F4EDE0]/20 flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[#F4EDE0]/60 uppercase font-semibold block">
                  Target Criteria
                </span>
                <span className="text-base font-extrabold font-heading text-[#F4EDE0]">
                  {effectiveTarget}% Minimum
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F4EDE0]/10 text-[#F4EDE0] border border-[#F4EDE0]/20 flex items-center justify-center font-bold text-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[#F4EDE0]/60 uppercase font-semibold block">
                  Total Leaves Margin
                </span>
                <span className="text-base font-extrabold font-heading text-[#F4EDE0]">
                  {totalBunkableAcross} Classes Safe
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  shortageSubjectsCount === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[#F4EDE0]/60 uppercase font-semibold block">
                  Shortage Alerts
                </span>
                <span
                  className={`text-base font-extrabold font-heading ${
                    shortageSubjectsCount === 0
                      ? 'text-[#F4EDE0]'
                      : 'text-rose-300'
                  }`}
                >
                  {shortageSubjectsCount === 0
                    ? 'All Safe'
                    : `${shortageSubjectsCount} Subjects Under ${effectiveTarget}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 pt-3 border-b border-[#F4EDE0]/10 flex items-center justify-between gap-4 bg-[#090e1a]/80 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'tracker'
                    ? 'border-[#F4EDE0] text-[#F4EDE0] bg-[#F4EDE0]/10'
                    : 'border-transparent text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Attendance & Leave Forecaster</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'border-[#F4EDE0] text-[#F4EDE0] bg-[#F4EDE0]/10'
                    : 'border-transparent text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Academic Calendar & Holidays</span>
                {config.calendarFileName && (
                  <span className="w-2 h-2 rounded-full bg-[#F4EDE0] animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timetable')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'timetable'
                    ? 'border-[#F4EDE0] text-[#F4EDE0] bg-[#F4EDE0]/10'
                    : 'border-transparent text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Weekly Timetable</span>
                {config.timetableFileName && (
                  <span className="w-2 h-2 rounded-full bg-[#F4EDE0] animate-pulse" />
                )}
              </button>
            </div>

            {/* Quick Target Attendance Criteria Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 pb-2">
              <span className="text-[11px] text-[#F4EDE0]/70 font-semibold mr-1">Target %:</span>
              <button
                type="button"
                onClick={() => handleTargetChange('75')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  targetPreset === '75'
                    ? 'bg-[#F4EDE0] text-[#14213D] border border-[#F4EDE0] shadow-sm font-bold'
                    : 'bg-[#090e1a]/80 text-[#F4EDE0]/70 hover:text-[#F4EDE0] border border-[#F4EDE0]/15'
                }`}
                title="Standard university mandatory minimum"
              >
                75% (Min)
              </button>
              <button
                type="button"
                onClick={() => handleTargetChange('85')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  targetPreset === '85'
                    ? 'bg-[#F4EDE0] text-[#14213D] border border-[#F4EDE0] shadow-sm font-bold'
                    : 'bg-[#090e1a]/80 text-[#F4EDE0]/70 hover:text-[#F4EDE0] border border-[#F4EDE0]/15'
                }`}
                title="Safe distinction zone without medical certificates"
              >
                85% (Safe)
              </button>
              <button
                type="button"
                onClick={() => handleTargetChange('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  targetPreset === 'custom'
                    ? 'bg-[#F4EDE0] text-[#14213D] border border-[#F4EDE0] shadow-sm font-bold'
                    : 'bg-[#090e1a]/80 text-[#F4EDE0]/70 hover:text-[#F4EDE0] border border-[#F4EDE0]/15'
                }`}
                title="Set custom n% target"
              >
                Custom {targetPreset === 'custom' ? `(${customTarget}%)` : 'n%'}
              </button>
            </div>
          </div>

          {/* Tab 1: Live Tracker & Leave Forecaster */}
          {activeTab === 'tracker' && (
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Target Percentage Slider (if custom) */}
              {targetPreset === 'custom' && (
                <div className="p-4 rounded-2xl bg-[#14213D]/60 border border-[#F4EDE0]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#F4EDE0]/10 text-[#F4EDE0] flex items-center justify-center">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-sm text-[#F4EDE0] block font-bold">
                        Custom Attendance Target: {customTarget}%
                      </strong>
                      <span className="text-xs text-[#F4EDE0]/70">
                        Drag slider or type custom target percentage to recalculate safe leave margins for all subjects.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={50}
                      max={95}
                      step={1}
                      value={customTarget}
                      onChange={(e) => handleTargetChange('custom', parseInt(e.target.value, 10))}
                      className="w-40 accent-[#F4EDE0] cursor-pointer"
                    />
                    <div className="flex items-center gap-1 font-mono font-bold text-[#F4EDE0] bg-[#090e1a] px-3 py-1.5 rounded-xl border border-[#F4EDE0]/15">
                      <input
                        type="number"
                        min={50}
                        max={95}
                        value={customTarget}
                        onChange={(e) =>
                          handleTargetChange(
                            'custom',
                            Math.max(50, Math.min(95, parseInt(e.target.value, 10) || 75))
                          )
                        }
                        className="w-10 bg-transparent text-center focus:outline-none text-[#F4EDE0]"
                      />
                      <span className="text-xs text-[#F4EDE0]/60">%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Subject Attendance Cards Grid */}
              <div className="space-y-4">
                {subjectAnalyses.map((analysis) => {
                  const isAdjustOpen = expandedAdjustSubjectId === analysis.id;
                  const rec =
                    (config.subjectRecords || {})[analysis.id] ||
                    (config.subjectRecords || {})[analysis.subjectId];
                  const hasConductedOverride =
                    rec?.manualConductedOverride !== null && rec?.manualConductedOverride !== undefined;
                  const isLab = analysis.componentType === 'practical';

                  return (
                    <div
                      key={analysis.id}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all glass-card ${
                        analysis.isShortage
                          ? 'border-rose-500/40 bg-gradient-to-br from-[#090e1a]/95 via-rose-950/20 to-[#14213D]/90'
                          : analysis.canBunkMore <= 1
                          ? 'border-amber-500/40 bg-gradient-to-br from-[#090e1a]/95 via-amber-950/15 to-[#14213D]/90'
                          : isLab
                          ? 'border-[#F4EDE0]/20 bg-gradient-to-br from-[#090e1a]/90 via-[#14213D]/40 to-[#090e1a]/90 hover:border-[#F4EDE0]/35'
                          : 'border-[#F4EDE0]/15 hover:border-[#F4EDE0]/35 bg-[#14213D]/40'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Subject Info & Badge */}
                        <div className="space-y-1.5 flex-1 min-w-[240px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#F4EDE0]/10 text-[#F4EDE0] border border-[#F4EDE0]/20 text-xs">
                              {analysis.subjectCode}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#090e1a]/80 text-[#F4EDE0]/60 border border-[#F4EDE0]/10">
                              {analysis.credits} Credits
                            </span>

                            {/* Component Type Badge */}
                            {isLab ? (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-[#F4EDE0]/20 border-[#F4EDE0]/30 text-[#F4EDE0] flex items-center gap-1">
                                <FlaskConical className="w-3 h-3" />
                                <span>Practical / Lab</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-[#14213D] border-[#F4EDE0]/20 text-[#F4EDE0] flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>Theory</span>
                              </span>
                            )}

                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${analysis.statusBadge.color}`}
                            >
                              {analysis.statusBadge.label}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#F4EDE0] tracking-wide">
                            {analysis.subjectName}
                          </h4>
                          <p className="text-xs text-[#F4EDE0]/70">
                            Scheduled: <strong className="text-[#F4EDE0]">{analysis.totalScheduledClasses}</strong> {isLab ? 'lab sessions' : 'classes'} in semester • Conducted so far: <strong className="text-[#F4EDE0]">{analysis.conductedClasses}</strong>
                            {analysis.cancelledClasses > 0 && (
                              <span className="text-[#F4EDE0] font-semibold ml-1">
                                ({analysis.cancelledClasses} cancelled)
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Middle: Attendance Progress & Attended Counter */}
                        <div className="flex items-center gap-5 sm:gap-6 bg-[#090e1a]/80 p-3 rounded-2xl border border-[#F4EDE0]/10 shrink-0">
                          {/* Attendance Percentage Display */}
                          <div className="text-center min-w-[85px]">
                            <span className="text-[10px] uppercase font-bold text-[#F4EDE0]/60 block tracking-wider">
                              Attendance
                            </span>
                            <div
                              className={`text-2xl sm:text-3xl font-black font-heading ${
                                analysis.currentPercentage >= effectiveTarget
                                    ? 'text-[#F4EDE0]'
                                    : 'text-rose-400'
                              }`}
                            >
                              {analysis.currentPercentage}%
                            </div>
                            <span className="text-[10px] text-[#F4EDE0]/60 block font-mono">
                              {analysis.attendedClasses} / {analysis.conductedClasses}
                            </span>
                          </div>

                          {/* Interactive Attended Stepper */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-[#F4EDE0]/60 block font-semibold text-center">
                              {isLab ? 'Lab Sessions Present' : 'Classes Present'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateAttended(analysis.id, -1)}
                                disabled={analysis.attendedClasses <= 0}
                                className="w-8 h-8 rounded-xl bg-[#090e1a]/80 hover:bg-[#14213D] active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-[#F4EDE0] text-base font-bold transition-all flex items-center justify-center border border-[#F4EDE0]/15 cursor-pointer"
                                title={`Decrease 1 ${isLab ? 'lab session' : 'class'}`}
                              >
                                -
                              </button>

                              <input
                                type="number"
                                min={0}
                                max={analysis.conductedClasses || 100}
                                value={analysis.attendedClasses}
                                onChange={(e) =>
                                  handleSetAttendedDirect(analysis.id, e.target.value)
                                }
                                className="w-14 h-8 text-center font-mono font-bold text-sm bg-[#090e1a] rounded-xl border border-[#F4EDE0]/20 text-[#F4EDE0] focus:outline-none focus:border-[#F4EDE0]"
                                title={`Directly enter attended ${isLab ? 'lab sessions' : 'classes'}`}
                              />

                              <button
                                type="button"
                                onClick={() => handleUpdateAttended(analysis.id, 1)}
                                disabled={
                                  analysis.conductedClasses > 0 &&
                                  analysis.attendedClasses >= analysis.conductedClasses
                                }
                                className="w-8 h-8 rounded-xl active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-base font-bold transition-all flex items-center justify-center border cursor-pointer bg-[#F4EDE0] text-[#14213D] border-[#F4EDE0] hover:bg-white"
                                title={`Present today (+1 ${isLab ? 'lab session' : 'class'})`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right: Leave Allowance Forecaster Box */}
                        <div className="p-3.5 rounded-2xl bg-[#090e1a]/80 border border-[#F4EDE0]/10 min-w-[260px] flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#F4EDE0]/60 tracking-wider block">
                              Leave Allowance ({effectiveTarget}% Target)
                            </span>

                            {!analysis.isShortage ? (
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl font-extrabold text-[#F4EDE0] font-heading">
                                    {analysis.canBunkMore} More {isLab ? (analysis.canBunkMore === 1 ? 'Lab' : 'Labs') : (analysis.canBunkMore === 1 ? 'Leave' : 'Leaves')}
                                  </span>
                                  <span className="text-xs text-[#F4EDE0]/70 font-medium">Safe</span>
                                </div>
                                <p className="text-[11px] text-[#F4EDE0]/70 leading-tight">
                                  You can safely take{' '}
                                  <strong className="text-[#F4EDE0]">{analysis.canBunkMore}</strong>{' '}
                                  more {isLab ? (analysis.canBunkMore === 1 ? 'lab session' : 'lab sessions') : (analysis.canBunkMore === 1 ? 'leave' : 'leaves')} across the semester and finish at or above{' '}
                                  {effectiveTarget}%.
                                </p>
                                {analysis.immediateBunkSafe > 0 && (
                                  <p className="text-[10px] text-[#F4EDE0]/80 font-medium pt-0.5">
                                    ⚡ Can skip next {analysis.immediateBunkSafe} {isLab ? 'lab sessions' : 'classes'} right now without falling below {effectiveTarget}% today.
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <span>Shortage: Need Next {analysis.consecutiveClassesNeeded} {isLab ? 'Labs' : 'Classes'}!</span>
                                </div>
                                <p className="text-[11px] text-rose-200/90 leading-tight">
                                  Attend the next{' '}
                                  <strong className="text-rose-100 font-bold">
                                    {analysis.consecutiveClassesNeeded} consecutive {isLab ? (analysis.consecutiveClassesNeeded === 1 ? 'lab session' : 'lab sessions') : (analysis.consecutiveClassesNeeded === 1 ? 'class' : 'classes')}
                                  </strong>{' '}
                                  without missing any to restore {effectiveTarget}%.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Adjust Conducted / Cancellation Toggle */}
                          <div className="pt-2 mt-2 border-t border-[#F4EDE0]/10 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAdjustSubjectId(
                                  isAdjustOpen ? null : analysis.id
                                )
                              }
                              className="text-[11px] text-[#F4EDE0]/80 hover:text-[#F4EDE0] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>
                                {hasConductedOverride
                                  ? `Conducted Overridden (${analysis.conductedClasses})`
                                  : `Faculty cancelled ${isLab ? 'labs' : 'classes'}? Adjust`}
                              </span>
                              {isAdjustOpen ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <span className="text-[10px] text-[#F4EDE0]/50 font-mono">
                              Total: {analysis.totalClassesInSemester} {isLab ? 'labs' : 'classes'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Class Cancellation & Conducted Override Section */}
                      {isAdjustOpen && (
                        <div className="mt-4 pt-4 border-t border-[#F4EDE0]/10 bg-[#090e1a]/90 p-4 rounded-xl space-y-3 animate-fadeIn text-xs">
                          <div className="flex items-center gap-2 text-[#F4EDE0] font-bold">
                            <Info className="w-4 h-4" />
                            <span>
                              {isLab ? 'Lab Session' : 'Class'} Cancellation & Actual Conducted Adjustment
                            </span>
                          </div>
                          <p className="text-[#F4EDE0]/70 text-[11px] leading-relaxed">
                            Timetable scheduled{' '}
                            <strong className="text-[#F4EDE0]">
                              {analysis.scheduledTillToday} {isLab ? 'lab sessions' : 'classes'}
                            </strong>{' '}
                            up to today. If faculty was on leave or {isLab ? 'lab sessions were cancelled' : 'classes were cancelled'}, enter the actual conducted count below. The website will automatically update the total semester count accordingly!
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div>
                              <label className="text-[#F4EDE0]/70 block mb-1 font-semibold text-[11px]">
                                Actual Conducted {isLab ? 'Lab Sessions' : 'Classes'} Till Date:
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder={`Default: ${analysis.scheduledTillToday}`}
                                  value={
                                    rec?.manualConductedOverride !== null &&
                                    rec?.manualConductedOverride !== undefined
                                      ? rec.manualConductedOverride
                                      : ''
                                  }
                                  onChange={(e) =>
                                    handleSetConductedOverride(analysis.id, e.target.value)
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] font-mono focus:outline-none focus:border-[#F4EDE0]"
                                />
                                {hasConductedOverride && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetConductedOverride(analysis.id, '')}
                                    className="px-2 py-1.5 rounded-lg bg-[#14213D] hover:bg-[#14213D]/80 text-[#F4EDE0]/70 hover:text-[#F4EDE0] text-[10px] cursor-pointer"
                                    title="Reset to timetable scheduled"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                              <span className="text-[10px] text-[#F4EDE0]/50 mt-1 block">
                                Leave empty to use automatic schedule count ({analysis.scheduledTillToday}).
                              </span>
                            </div>

                            <div>
                              <label className="text-[#F4EDE0]/70 block mb-1 font-semibold text-[11px]">
                                Total Semester {isLab ? 'Lab Sessions' : 'Classes'} Override (Optional):
                              </label>
                              <input
                                type="number"
                                min={1}
                                placeholder={`Auto: ${analysis.totalClassesInSemester}`}
                                value={rec?.manualTotalPlannedOverride ?? ''}
                                onChange={(e) =>
                                  handleSetTotalPlannedOverride(analysis.id, e.target.value)
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] font-mono focus:outline-none focus:border-[#F4EDE0]"
                              />
                              <span className="text-[10px] text-[#F4EDE0]/50 mt-1 block">
                                Automatically computed as {analysis.totalClassesInSemester} {isLab ? 'sessions' : 'classes'} based on calendar working days minus cancellations.
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {subjectAnalyses.length === 0 && (
                  <div className="p-8 text-center text-[#F4EDE0]/50 text-xs italic bg-[#090e1a]/60 rounded-2xl border border-[#F4EDE0]/10">
                    No subjects found in this semester. Add subjects in the semester dashboard to start tracking attendance.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Academic Calendar & Holidays */}
          {activeTab === 'calendar' && (
            <div className="p-6 overflow-y-auto space-y-6">
              {/* AI Assistant Banner */}
              <div className="p-4 rounded-2xl bg-[#14213D]/60 border border-[#F4EDE0]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F4EDE0]/10 text-[#F4EDE0] flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-[#F4EDE0]">
                      AI Academic Calendar Scanner
                    </h5>
                    <p className="text-xs text-[#F4EDE0]/70">
                      Upload your college's official calendar circular below. Gemini AI will automatically extract the start date, end date, and all holidays!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerAiScan}
                  disabled={isAiScanning || !config.calendarFileDataUrl}
                  className="px-4 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs shadow-md shadow-[#14213D]/40 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#14213D]" />
                  <span>Scan Calendar with AI</span>
                </button>
              </div>

              {/* Academic Calendar Document Attachment / Upload */}
              <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/15 bg-[#14213D]/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#F4EDE0]/10 border border-[#F4EDE0]/25 flex items-center justify-center text-[#F4EDE0]">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F4EDE0]">
                        Upload Academic Calendar Document
                      </h4>
                      <p className="text-xs text-[#F4EDE0]/60">
                        Upload your official college PDF or image calendar for AI to read
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-[#14213D]/40">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{config.calendarFileName ? 'Replace File' : 'Upload File (PDF/Image)'}</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => handleFileUpload(e, 'calendar')}
                        className="hidden"
                      />
                    </label>
                    {config.calendarFileName && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile('calendar')}
                        className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
                        title="Remove uploaded document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {config.calendarFileName && (
                  <div className="p-3.5 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-[#F4EDE0]" />
                      <div>
                        <span className="text-xs font-semibold text-[#F4EDE0] block">
                          {config.calendarFileName}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Ready for AI scanning & date extraction
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerAiScan}
                        disabled={isAiScanning}
                        className="px-3 py-1.5 rounded-lg bg-[#F4EDE0] hover:bg-white text-[#14213D] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#14213D]" />
                        <span>AI Scan</span>
                      </button>
                      {config.calendarFileDataUrl && (
                        <a
                          href={config.calendarFileDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#14213D] hover:bg-[#14213D]/80 text-[#F4EDE0] border border-[#F4EDE0]/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Preview</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Calendar Dates & Working Days Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Semester Date Range */}
                <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/15 bg-[#14213D]/40 space-y-4">
                  <div className="flex items-center gap-2.5 text-[#F4EDE0] font-bold text-sm">
                    <Calendar className="w-4 h-4 text-[#F4EDE0]" />
                    <span>Semester Working Period</span>
                  </div>
                  <p className="text-xs text-[#F4EDE0]/70 leading-relaxed">
                    Start and end dates extracted by AI or entered manually. All working days between these dates are computed automatically.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#F4EDE0]/70 text-xs font-semibold block mb-1">
                        Semester Start Date
                      </label>
                      <input
                        type="date"
                        value={config.startDate}
                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] font-mono text-xs focus:outline-none focus:border-[#F4EDE0]"
                      />
                    </div>

                    <div>
                      <label className="text-[#F4EDE0]/70 text-xs font-semibold block mb-1">
                        Semester End Date
                      </label>
                      <input
                        type="date"
                        value={config.endDate}
                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] font-mono text-xs focus:outline-none focus:border-[#F4EDE0]"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/15 text-xs text-[#F4EDE0] flex items-center justify-between">
                    <span>Total Calculated Working Days in Semester:</span>
                    <strong className="font-mono text-sm">{totalWorkingDays} Days</strong>
                  </div>
                </div>

                {/* Working Days of Week Toggle */}
                <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/15 bg-[#14213D]/40 space-y-4">
                  <div className="flex items-center gap-2.5 text-[#F4EDE0] font-bold text-sm">
                    <Clock className="w-4 h-4 text-[#F4EDE0]" />
                    <span>Weekly Working Days</span>
                  </div>
                  <p className="text-xs text-[#F4EDE0]/70 leading-relaxed">
                    Select active days on which classes are conducted (e.g., Mon–Fri or including Saturdays).
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = (config.workingDays || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleWorkingDay(day)}
                          className={`p-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#F4EDE0] text-[#14213D] border-[#F4EDE0] shadow-sm font-bold'
                              : 'bg-[#090e1a]/80 text-[#F4EDE0]/60 border-[#F4EDE0]/10 hover:text-[#F4EDE0]'
                          }`}
                        >
                          <span>{day}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#14213D]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* University Holidays / Non-Instructional Days List */}
              <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/15 bg-[#14213D]/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#F4EDE0] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#F4EDE0]" />
                      <span>Holidays & University Vacations ({(config.holidays || []).length})</span>
                    </h4>
                    <p className="text-xs text-[#F4EDE0]/70 mt-0.5">
                      Classes falling on holidays are automatically deducted from the total semester class count.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleImportSuggestedHolidays}
                    className="px-3.5 py-1.5 rounded-xl bg-[#14213D] hover:bg-[#14213D]/80 text-[#F4EDE0] border border-[#F4EDE0]/20 text-xs font-semibold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    title="Import known university & festival holidays"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Import Standard Holidays</span>
                  </button>
                </div>

                {/* Add Custom Holiday Row */}
                <form onSubmit={handleAddHoliday} className="flex flex-col sm:flex-row gap-2 pt-2">
                  <input
                    type="date"
                    required
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] font-mono text-xs focus:outline-none focus:border-[#F4EDE0]"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Holiday title (e.g. Gandhi Jayanti, Sports Day)..."
                    value={newHolidayTitle}
                    onChange={(e) => setNewHolidayTitle(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] text-xs focus:outline-none focus:border-[#F4EDE0]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] text-xs font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Holiday
                  </button>
                </form>

                {/* Holiday Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {(config.holidays || []).map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#F4EDE0] block truncate max-w-[180px]">
                          {h.title}
                        </span>
                        <span className="text-[10px] text-[#F4EDE0]/60 font-mono">{h.date}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-[#F4EDE0]/50 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="Remove holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Weekly Timetable */}
          {activeTab === 'timetable' && (
            <div className="p-6 overflow-y-auto space-y-6">
              {/* AI Timetable Assistant Banner */}
              <div className="p-4 rounded-2xl bg-[#14213D]/60 border border-[#F4EDE0]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F4EDE0]/10 text-[#F4EDE0] flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-[#F4EDE0]">
                      AI Timetable Scanner & Subject Mapper
                    </h5>
                    <p className="text-xs text-[#F4EDE0]/70">
                      Upload a photo or PDF of your weekly timetable. Gemini AI will read every period and automatically assign classes to your registered subjects!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerAiScan}
                  disabled={isAiScanning || !config.timetableFileDataUrl}
                  className="px-4 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs shadow-md shadow-[#14213D]/40 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#14213D]" />
                  <span>Scan Timetable with AI</span>
                </button>
              </div>

              {/* Timetable Document Attachment */}
              <div className="p-5 rounded-2xl glass-card border border-[#F4EDE0]/15 bg-[#14213D]/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#F4EDE0]/10 border border-[#F4EDE0]/25 flex items-center justify-center text-[#F4EDE0]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F4EDE0]">
                        Upload Weekly Timetable Document
                      </h4>
                      <p className="text-xs text-[#F4EDE0]/60">
                        Upload your section timetable PDF or image for AI parsing
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-[#14213D]/40">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{config.timetableFileName ? 'Replace File' : 'Upload File (PDF/Image)'}</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => handleFileUpload(e, 'timetable')}
                        className="hidden"
                      />
                    </label>
                    {config.timetableFileName && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile('timetable')}
                        className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
                        title="Remove uploaded timetable"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {config.timetableFileName && (
                  <div className="p-3.5 rounded-xl bg-[#090e1a]/80 border border-[#F4EDE0]/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-[#F4EDE0]" />
                      <div>
                        <span className="text-xs font-semibold text-[#F4EDE0] block">
                          {config.timetableFileName}
                        </span>
                        <span className="text-[10px] text-[#F4EDE0]/80 font-mono">
                          Ready for AI scanning & period mapping
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerAiScan}
                        disabled={isAiScanning}
                        className="px-3 py-1.5 rounded-lg bg-[#F4EDE0] hover:bg-white text-[#14213D] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#14213D]" />
                        <span>AI Scan</span>
                      </button>
                      {config.timetableFileDataUrl && (
                        <a
                          href={config.timetableFileDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#14213D] hover:bg-[#14213D]/80 text-[#F4EDE0] border border-[#F4EDE0]/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Preview</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-[#F4EDE0]/15 bg-[#14213D]/40">
                <div>
                  <h4 className="text-sm font-bold text-[#F4EDE0]">Weekly Timetable Matrix</h4>
                  <p className="text-xs text-[#F4EDE0]/70">
                    Auto-populated by AI from your uploaded timetable or customizable below.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFillTimetable}
                    className="px-3.5 py-1.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Auto assign weekly class frequency based on subject credits"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Fill by Credits</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearTimetable}
                    className="px-3 py-1.5 rounded-xl bg-[#090e1a]/80 hover:bg-[#090e1a] text-[#F4EDE0]/70 hover:text-[#F4EDE0] border border-[#F4EDE0]/10 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Add Class Period Form */}
              <form onSubmit={handleAddSlot} className="p-4 rounded-2xl bg-[#090e1a]/80 border border-[#F4EDE0]/15 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1 font-semibold">Day of Week</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] focus:outline-none focus:border-[#F4EDE0]"
                  >
                    {(config.workingDays || []).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1 font-semibold">Subject (From Cards)</label>
                  <select
                    value={slotSubjectId}
                    onChange={(e) => setSlotSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] focus:outline-none focus:border-[#F4EDE0] truncate"
                  >
                    {safeSemester.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1 font-semibold">Class Type</label>
                  <div className="flex rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSlotType('theory');
                        setSlotTime(STANDARD_TIME_SLOTS[0]);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        slotType === 'theory'
                          ? 'bg-[#F4EDE0] text-[#14213D] shadow'
                          : 'text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Theory</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSlotType('practical');
                        setSlotTime(PRACTICAL_TIME_SLOTS[0]);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        slotType === 'practical'
                          ? 'bg-[#F4EDE0] text-[#14213D] shadow'
                          : 'text-[#F4EDE0]/60 hover:text-[#F4EDE0]'
                      }`}
                    >
                      <FlaskConical className="w-3 h-3" />
                      <span>Lab</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[#F4EDE0]/70 block mb-1 font-semibold">Time Slot</label>
                  <select
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] focus:outline-none focus:border-[#F4EDE0]"
                  >
                    <optgroup label={slotType === 'practical' ? '🧪 Lab Sessions (2-3 Hours)' : '📖 Standard Class Hours'}>
                      {(slotType === 'practical' ? PRACTICAL_TIME_SLOTS : STANDARD_TIME_SLOTS).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={slotType === 'practical' ? '📖 Standard Single Hours' : '🧪 Lab Sessions'}>
                      {(slotType === 'practical' ? STANDARD_TIME_SLOTS : PRACTICAL_TIME_SLOTS).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Slot</span>
                  </button>
                </div>
              </form>

              {/* Timetable Weekly Columns Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {(config.workingDays || []).map((day) => {
                  const daySlots = (config.timetable || []).filter((s) => s && s.day === day);
                  return (
                    <div
                      key={day}
                      className="p-3.5 rounded-2xl bg-[#090e1a]/80 border border-[#F4EDE0]/15 space-y-3 min-h-[160px] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#F4EDE0]/10">
                          <span className="font-heading font-extrabold text-sm text-[#F4EDE0]">
                            {day}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#14213D] text-[#F4EDE0]/80">
                            {daySlots.length} {daySlots.length === 1 ? 'class' : 'classes'}
                          </span>
                        </div>

                        <div className="space-y-2 mt-3">
                          {daySlots.map((slot) => {
                            const sub = safeSemester.subjects.find((s) => s.id === slot.subjectId);
                            const isLab = slot.type === 'practical';
                            return (
                              <div
                                key={slot.id}
                                className="p-2.5 rounded-xl border transition-all group flex items-start justify-between gap-1.5 bg-[#14213D]/50 border-[#F4EDE0]/15 hover:border-[#F4EDE0]/35"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-[#F4EDE0] block truncate">
                                      {sub?.code || 'SUB'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSlotType(slot.id)}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors bg-[#F4EDE0]/15 text-[#F4EDE0] border border-[#F4EDE0]/25 hover:bg-[#F4EDE0]/25"
                                      title="Click to toggle Theory ↔ Practical/Lab"
                                    >
                                      {isLab ? (
                                        <>
                                          <FlaskConical className="w-2.5 h-2.5" />
                                          <span>Lab</span>
                                        </>
                                      ) : (
                                        <>
                                          <BookOpen className="w-2.5 h-2.5" />
                                          <span>Theory</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <span className="text-[10px] text-[#F4EDE0]/70 block truncate mt-0.5">
                                    {sub?.name || 'Subject'}
                                  </span>
                                  {slot.slotTime && (
                                    <span className="text-[9px] font-mono block mt-0.5 text-[#F4EDE0]/80">
                                      {slot.slotTime}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-[#F4EDE0]/40 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer shrink-0"
                                  title="Remove slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}

                          {daySlots.length === 0 && (
                            <div className="text-center py-6 text-[#F4EDE0]/40 text-[11px] italic">
                              No classes
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSlotDay(day);
                        }}
                        className="w-full py-1.5 rounded-lg bg-[#14213D] hover:bg-[#14213D]/80 text-[#F4EDE0]/80 hover:text-[#F4EDE0] text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer border border-[#F4EDE0]/10"
                      >
                        <Plus className="w-3 h-3" /> Add Slot
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#F4EDE0]/10 flex items-center justify-between bg-[#090e1a] shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#F4EDE0]/60 hidden sm:inline">
                All timetable and attendance data auto-saved to your student profile!
              </span>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(true)}
                className="text-xs text-[#F4EDE0]/80 hover:text-[#F4EDE0] flex items-center gap-1 font-medium cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{hasKey ? 'Gemini AI Configured' : 'Set Gemini AI Key'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs transition-all shadow-lg shadow-[#14213D]/50 ml-auto cursor-pointer"
            >
              Done & Save
            </button>
          </div>
        </AttendanceErrorBoundary>

        {/* Gemini API Key Dialog Modal */}
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md glass-panel-deep rounded-3xl border border-[#F4EDE0]/20 p-6 bg-[#090e1a]/95 text-[#F4EDE0] shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F4EDE0]/10 text-[#F4EDE0] flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#F4EDE0]">Google Gemini AI Setup</h4>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      100% Free • Powered by Gemini 2.0 Flash
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="text-[#F4EDE0]/60 hover:text-[#F4EDE0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#F4EDE0]/80 leading-relaxed">
                MarksBoard uses Google Gemini to read your uploaded Academic Calendar & Timetable photos or PDFs, detect semester dates, find holidays, and automatically map class periods to your course cards.
              </p>

              <div className="p-3 rounded-xl bg-[#14213D]/60 border border-[#F4EDE0]/15 text-xs text-[#F4EDE0] space-y-1.5">
                <span className="font-bold block">Don't have a free key yet?</span>
                <p className="text-[11px] text-[#F4EDE0]/70">
                  You can generate a free Gemini API key in 30 seconds with any Google account:
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-[11px] shadow-sm transition-all"
                >
                  <span>Get Free Key at Google AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <form onSubmit={handleSaveApiKey} className="space-y-3 pt-1">
                <div>
                  <label className="text-xs text-[#F4EDE0]/70 block mb-1 font-semibold">
                    Paste Gemini API Key:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090e1a] border border-[#F4EDE0]/15 text-[#F4EDE0] font-mono text-xs focus:outline-none focus:border-[#F4EDE0]"
                  />
                  <span className="text-[10px] text-[#F4EDE0]/50 mt-1 block">
                    Your key is saved locally in this browser and never uploaded anywhere else.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#14213D] hover:bg-[#14213D]/80 text-[#F4EDE0]/70 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#F4EDE0] hover:bg-white text-[#14213D] font-bold text-xs shadow-md shadow-[#14213D]/50"
                  >
                    Save & Activate AI
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
