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
  TimetableSlot,
} from '../types';
import {
  DAYS_OF_WEEK,
  DEFAULT_SUGGESTED_HOLIDAYS,
  STANDARD_TIME_SLOTS,
  PRACTICAL_TIME_SLOTS,
  calculateSubjectAttendanceAnalysis,
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

  // Attendance Record Updates
  const handleUpdateAttended = (subjectId: string, delta: number) => {
    if (isGuest) {
      onRequireAuth?.('record attendance');
      return;
    }
    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[subjectId] || {
      subjectId,
      attendedClasses: 0,
      attendedTheory: 0,
      attendedPractical: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const targetSub = safeSemester.subjects.find((s) => s.id === subjectId);
    if (!targetSub) return;

    const currentAnalysis = calculateSubjectAttendanceAnalysis(
      targetSub,
      config,
      effectiveTarget
    );

    const maxLimit = currentAnalysis.conductedClasses || 100;
    const newAttended = Math.max(
      0,
      Math.min(maxLimit, (currentRecord.attendedClasses || 0) + delta)
    );

    let curTh = currentRecord.attendedTheory;
    let curPr = currentRecord.attendedPractical;
    if (currentAnalysis.courseCategory === 'theory_only') {
      curTh = newAttended;
      curPr = 0;
    } else if (currentAnalysis.courseCategory === 'practical_only') {
      curTh = 0;
      curPr = newAttended;
    }

    saveConfig({
      ...config,
      subjectRecords: {
        ...subjectMap,
        [subjectId]: {
          ...currentRecord,
          attendedClasses: newAttended,
          attendedTheory: curTh,
          attendedPractical: curPr,
        },
      },
    });
  };

  const handleUpdateAttendedType = (
    subjectId: string,
    type: 'theory' | 'practical',
    delta: number
  ) => {
    if (isGuest) {
      onRequireAuth?.('record attendance');
      return;
    }
    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[subjectId] || {
      subjectId,
      attendedClasses: 0,
      attendedTheory: 0,
      attendedPractical: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const targetSub = safeSemester.subjects.find((s) => s.id === subjectId);
    if (!targetSub) return;

    const currentAnalysis = calculateSubjectAttendanceAnalysis(
      targetSub,
      config,
      effectiveTarget
    );

    let curTh = currentRecord.attendedTheory ?? currentAnalysis.theoryAttended;
    let curPr = currentRecord.attendedPractical ?? currentAnalysis.practicalAttended;

    if (type === 'theory') {
      const maxTh = currentAnalysis.theoryConducted || 100;
      curTh = Math.max(0, Math.min(maxTh, curTh + delta));
    } else {
      const maxPr = currentAnalysis.practicalConducted || 100;
      curPr = Math.max(0, Math.min(maxPr, curPr + delta));
    }

    const totalAttended = curTh + curPr;

    saveConfig({
      ...config,
      subjectRecords: {
        ...subjectMap,
        [subjectId]: {
          ...currentRecord,
          attendedTheory: curTh,
          attendedPractical: curPr,
          attendedClasses: totalAttended,
        },
      },
    });
  };

  const handleSetAttendedTypeDirect = (
    subjectId: string,
    type: 'theory' | 'practical',
    valStr: string
  ) => {
    if (isGuest) {
      onRequireAuth?.('record attendance');
      return;
    }
    const num = parseInt(valStr, 10);
    const valid = isNaN(num) ? 0 : Math.max(0, num);

    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[subjectId] || {
      subjectId,
      attendedClasses: 0,
      attendedTheory: 0,
      attendedPractical: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const targetSub = safeSemester.subjects.find((s) => s.id === subjectId);
    if (!targetSub) return;

    const currentAnalysis = calculateSubjectAttendanceAnalysis(
      targetSub,
      config,
      effectiveTarget
    );

    let curTh = currentRecord.attendedTheory ?? currentAnalysis.theoryAttended;
    let curPr = currentRecord.attendedPractical ?? currentAnalysis.practicalAttended;

    if (type === 'theory') {
      const maxTh = currentAnalysis.theoryConducted || 100;
      curTh = Math.max(0, Math.min(maxTh, valid));
    } else {
      const maxPr = currentAnalysis.practicalConducted || 100;
      curPr = Math.max(0, Math.min(maxPr, valid));
    }

    const totalAttended = curTh + curPr;

    saveConfig({
      ...config,
      subjectRecords: {
        ...subjectMap,
        [subjectId]: {
          ...currentRecord,
          attendedTheory: curTh,
          attendedPractical: curPr,
          attendedClasses: totalAttended,
        },
      },
    });
  };

  const handleSetAttendedDirect = (subjectId: string, valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('record attendance');
      return;
    }
    const num = parseInt(valStr, 10);
    const valid = isNaN(num) ? 0 : Math.max(0, num);

    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[subjectId] || {
      subjectId,
      attendedClasses: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    saveConfig({
      ...config,
      subjectRecords: {
        ...subjectMap,
        [subjectId]: {
          ...currentRecord,
          attendedClasses: valid,
        },
      },
    });
  };

  // Manual Conducted Override (for cancelled classes)
  const handleSetConductedOverride = (subjectId: string, valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('override conducted classes');
      return;
    }
    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[subjectId] || {
      subjectId,
      attendedClasses: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const overrideVal = valStr.trim() === '' ? null : Math.max(0, parseInt(valStr, 10) || 0);

    saveConfig({
      ...config,
      subjectRecords: {
        ...subjectMap,
        [subjectId]: {
          ...currentRecord,
          manualConductedOverride: overrideVal,
        },
      },
    });
  };

  // Manual Total Planned Classes Override
  const handleSetTotalPlannedOverride = (subjectId: string, valStr: string) => {
    if (isGuest) {
      onRequireAuth?.('override total semester classes');
      return;
    }
    const subjectMap = config.subjectRecords || {};
    const currentRecord = subjectMap[subjectId] || {
      subjectId,
      attendedClasses: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
    };

    const overrideVal = valStr.trim() === '' ? null : Math.max(1, parseInt(valStr, 10) || 1);

    saveConfig({
      ...config,
      subjectRecords: {
        ...subjectMap,
        [subjectId]: {
          ...currentRecord,
          manualTotalPlannedOverride: overrideVal,
        },
      },
    });
  };

  // Calculations for all subjects (guarded against corrupt data)
  const subjectAnalyses = useMemo(() => {
    return (safeSemester.subjects || [])
      .filter((sub) => sub && sub.id)
      .map((sub) => calculateSubjectAttendanceAnalysis(sub, config, effectiveTarget));
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
      <div className="relative w-full max-w-5xl glass-panel rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden bg-slate-900/95 max-h-[94vh] flex flex-col my-auto">
        <AttendanceErrorBoundary onReset={handleResetToDefaults}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/10">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-heading text-white">
                    Attendance & Leave Allowance Forecaster
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Sem {safeSemester.semNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
                    <Wand2 className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
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
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                title={hasKey ? 'Gemini AI API Key active' : 'Configure Gemini API Key'}
              >
                <Key className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AI Status Banners */}
          {isAiScanning && (
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/70 to-purple-950/70 border border-cyan-400/40 text-cyan-200 text-xs flex items-center gap-3.5 animate-pulse shadow-lg">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin shrink-0" />
              <div>
                <h5 className="font-bold text-sm text-white mb-0.5">
                  🤖 Gemini AI is reading your uploaded documents...
                </h5>
                <p className="text-[11px] text-cyan-300/80">
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
                  className="mt-2 text-[11px] underline text-rose-300 hover:text-white font-semibold"
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
            <div className="mx-6 mt-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-cyan-950/80 to-slate-900 border border-cyan-400/50 shadow-2xl animate-fadeIn space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>AI Document Analysis Complete</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Ready to Apply
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">{aiResult.summary}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAiResult(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Detected Semester
                  </span>
                  <strong className="text-cyan-300 font-mono text-sm block mt-0.5">
                    {aiResult.startDate} → {aiResult.endDate}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Holidays Found
                  </span>
                  <strong className="text-amber-300 font-mono text-sm block mt-0.5">
                    {aiResult.holidays.length} Holidays Detected
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Timetable Classes
                  </span>
                  <strong className="text-purple-300 font-mono text-sm block mt-0.5">
                    {aiResult.timetable.length} Class Slots Mapped
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                    {aiResult.theoryCount ?? aiResult.timetable.filter((s) => s.type !== 'practical').length} Theory •{' '}
                    {aiResult.practicalCount ?? aiResult.timetable.filter((s) => s.type === 'practical').length} Practical/Lab
                  </span>
                </div>
              </div>

              {aiResult.calendarNotes && (
                <div className="text-[11px] text-slate-300 bg-white/5 p-2.5 rounded-lg border border-white/5">
                  💡 <strong>Detected Details:</strong> {aiResult.calendarNotes}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAiResult(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleApplyAiResult}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply AI Extracted Schedule</span>
                </button>
              </div>
            </div>
          )}

          {/* Global Summary Stats Bar */}
          <div className="px-6 py-3 bg-slate-950/60 border-b border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
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
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Semester Attendance
                </span>
                <span
                  className={`text-base font-extrabold font-heading ${
                    overallPercentage >= effectiveTarget ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {overallPercentage}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Target Criteria
                </span>
                <span className="text-base font-extrabold font-heading text-purple-200">
                  {effectiveTarget}% Minimum
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Total Leaves Margin
                </span>
                <span className="text-base font-extrabold font-heading text-cyan-200">
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
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Shortage Alerts
                </span>
                <span
                  className={`text-base font-extrabold font-heading ${
                    shortageSubjectsCount === 0
                      ? 'All Safe'
                      : `${shortageSubjectsCount} Subjects Under ${effectiveTarget}%`
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
          <div className="px-6 pt-3 border-b border-white/10 flex items-center justify-between gap-4 bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'tracker'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
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
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Academic Calendar & Holidays</span>
                {config.calendarFileName && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timetable')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'timetable'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Weekly Timetable</span>
                {config.timetableFileName && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>
            </div>

            {/* Quick Target Attendance Criteria Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 pb-2">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Target %:</span>
              <button
                type="button"
                onClick={() => handleTargetChange('75')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  targetPreset === '75'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
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
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
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
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
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
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-sm text-cyan-200 block font-bold">
                        Custom Attendance Target: {customTarget}%
                      </strong>
                      <span className="text-xs text-slate-400">
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
                      className="w-40 accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex items-center gap-1 font-mono font-bold text-white bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
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
                        className="w-10 bg-transparent text-center focus:outline-none text-cyan-300"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Subject Attendance Cards Grid */}
              <div className="space-y-4">
                {subjectAnalyses.map((analysis) => {
                  const isAdjustOpen = expandedAdjustSubjectId === analysis.subjectId;
                  const rec = (config.subjectRecords || {})[analysis.subjectId];
                  const hasConductedOverride =
                    rec?.manualConductedOverride !== null && rec?.manualConductedOverride !== undefined;

                  return (
                    <div
                      key={analysis.subjectId}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all glass-card ${
                        analysis.isShortage
                          ? 'border-rose-500/40 bg-gradient-to-br from-slate-900/90 via-rose-950/20 to-slate-900/90'
                          : analysis.canBunkMore <= 1
                          ? 'border-amber-500/40 bg-gradient-to-br from-slate-900/90 via-amber-950/15 to-slate-900/90'
                          : 'border-white/10 hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Subject Info & Badge */}
                        <div className="space-y-1.5 flex-1 min-w-[240px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs">
                              {analysis.subjectCode}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                              {analysis.credits} Credits
                            </span>

                            {/* Theory vs Practical / Lab Badging */}
                            {analysis.courseCategory === 'integrated' ? (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-purple-500/15 border-purple-500/30 text-purple-300 flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-cyan-300" />
                                <span>Theory</span>
                                <span className="text-white/40">+</span>
                                <FlaskConical className="w-3 h-3 text-amber-300" />
                                <span>Lab</span>
                              </span>
                            ) : analysis.courseCategory === 'practical_only' ? (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/15 border-amber-500/30 text-amber-300 flex items-center gap-1">
                                <FlaskConical className="w-3 h-3" />
                                <span>Practical / Lab</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-cyan-500/15 border-cyan-500/30 text-cyan-300 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>Theory Course</span>
                              </span>
                            )}

                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${analysis.statusBadge.color}`}
                            >
                              {analysis.statusBadge.label}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white tracking-wide">
                            {analysis.subjectName}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Scheduled: <strong className="text-slate-200">{analysis.totalScheduledClasses}</strong> classes in semester • Conducted so far: <strong className="text-slate-200">{analysis.conductedClasses}</strong>
                            {analysis.cancelledClasses > 0 && (
                              <span className="text-amber-400 font-semibold ml-1">
                                ({analysis.cancelledClasses} cancelled)
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Middle: Attendance Progress & Attended Counter */}
                        <div className="flex items-center gap-5 sm:gap-6 bg-slate-950/40 p-3 rounded-2xl border border-white/5 shrink-0">
                          {/* Attendance Percentage Display */}
                          <div className="text-center min-w-[85px]">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Attendance
                            </span>
                            <div
                              className={`text-2xl sm:text-3xl font-black font-heading ${
                                analysis.currentPercentage >= effectiveTarget
                                    ? 'text-emerald-300'
                                    : 'text-rose-400'
                              }`}
                            >
                              {analysis.currentPercentage}%
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {analysis.attendedClasses} / {analysis.conductedClasses}
                            </span>
                          </div>

                          {/* Interactive Attended Stepper */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 block font-semibold text-center">
                              {analysis.courseCategory === 'practical_only'
                                ? 'Lab Sessions'
                                : analysis.courseCategory === 'integrated'
                                ? 'Total Classes'
                                : 'Classes Present'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateAttended(analysis.subjectId, -1)}
                                disabled={analysis.attendedClasses <= 0}
                                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white text-base font-bold transition-all flex items-center justify-center border border-white/10 cursor-pointer"
                                title="Decrease 1 class"
                              >
                                -
                              </button>

                              <input
                                type="number"
                                min={0}
                                max={analysis.conductedClasses || 100}
                                value={analysis.attendedClasses}
                                onChange={(e) =>
                                  handleSetAttendedDirect(analysis.subjectId, e.target.value)
                                }
                                className="w-14 h-8 text-center font-mono font-bold text-sm bg-black/60 rounded-xl border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                                title="Directly enter number of attended classes"
                              />

                              <button
                                type="button"
                                onClick={() => handleUpdateAttended(analysis.subjectId, 1)}
                                disabled={
                                  analysis.attendedClasses >= analysis.conductedClasses &&
                                  analysis.conductedClasses > 0
                                }
                                className="w-8 h-8 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-cyan-200 text-base font-bold transition-all flex items-center justify-center border border-cyan-500/40 cursor-pointer"
                                title="Present today (+1 class)"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right: Leave Allowance Forecaster Box */}
                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 min-w-[260px] flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                              Leave Allowance ({effectiveTarget}% Target)
                            </span>

                            {!analysis.isShortage ? (
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl font-extrabold text-emerald-300 font-heading">
                                    {analysis.canBunkMore} More {analysis.canBunkMore === 1 ? 'Leave' : 'Leaves'}
                                  </span>
                                  <span className="text-xs text-emerald-400/80 font-medium">Safe</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-tight">
                                  You can safely take{' '}
                                  <strong className="text-emerald-300">{analysis.canBunkMore}</strong>{' '}
                                  more leaves across the semester and finish at or above{' '}
                                  {effectiveTarget}%.
                                </p>
                                {analysis.immediateBunkSafe > 0 && (
                                  <p className="text-[10px] text-cyan-300/90 font-medium pt-0.5">
                                    ⚡ Can skip next {analysis.immediateBunkSafe} classes right now without falling below {effectiveTarget}% today.
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <span>Shortage: Need Next {analysis.consecutiveClassesNeeded} Classes!</span>
                                </div>
                                <p className="text-[11px] text-rose-200/90 leading-tight">
                                  Attend the next{' '}
                                  <strong className="text-rose-100 font-bold">
                                    {analysis.consecutiveClassesNeeded} consecutive classes
                                  </strong>{' '}
                                  without missing any to restore {effectiveTarget}%.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Adjust Conducted / Cancellation Toggle */}
                          <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAdjustSubjectId(
                                  isAdjustOpen ? null : analysis.subjectId
                                )
                              }
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>
                                {hasConductedOverride
                                  ? `Conducted Overridden (${analysis.conductedClasses})`
                                  : 'Teacher cancelled classes? Adjust'}
                              </span>
                              {isAdjustOpen ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <span className="text-[10px] text-slate-500 font-mono">
                              Total: {analysis.totalClassesInSemester} classes
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Integrated Subject: Theory vs Lab Interactive Breakdown */}
                      {analysis.courseCategory === 'integrated' && (
                        <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Theory Breakdown Box */}
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/20 flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Theory Classes</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Conducted: <strong className="text-white">{analysis.theoryConducted}</strong> • Attended:{' '}
                                <strong className="text-cyan-300">{analysis.theoryAttended}</strong>
                              </p>
                              <div className="text-[11px] font-mono font-bold mt-1">
                                <span className={analysis.theoryPercentage >= effectiveTarget ? 'text-emerald-300' : 'text-rose-400'}>
                                  {analysis.theoryPercentage}% Attendance
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateAttendedType(analysis.subjectId, 'theory', -1)}
                                disabled={analysis.theoryAttended <= 0}
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold flex items-center justify-center border border-white/10 cursor-pointer"
                                title="Decrease theory class"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={analysis.theoryConducted || 100}
                                value={analysis.theoryAttended}
                                onChange={(e) =>
                                  handleSetAttendedTypeDirect(analysis.subjectId, 'theory', e.target.value)
                                }
                                className="w-11 h-7 text-center font-mono font-bold text-xs bg-black/60 rounded-lg border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                                title="Directly enter attended theory classes"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateAttendedType(analysis.subjectId, 'theory', 1)}
                                disabled={
                                  analysis.theoryAttended >= analysis.theoryConducted &&
                                  analysis.theoryConducted > 0
                                }
                                className="w-7 h-7 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-cyan-200 text-xs font-bold flex items-center justify-center border border-cyan-500/40 cursor-pointer"
                                title="Add attended theory class"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Practical / Lab Breakdown Box */}
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                <FlaskConical className="w-3.5 h-3.5" />
                                <span>Practical / Lab Sessions</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Conducted: <strong className="text-white">{analysis.practicalConducted}</strong> • Attended:{' '}
                                <strong className="text-amber-300">{analysis.practicalAttended}</strong>
                              </p>
                              <div className="text-[11px] font-mono font-bold mt-1">
                                <span className={analysis.practicalPercentage >= effectiveTarget ? 'text-emerald-300' : 'text-rose-400'}>
                                  {analysis.practicalPercentage}% Attendance
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateAttendedType(analysis.subjectId, 'practical', -1)}
                                disabled={analysis.practicalAttended <= 0}
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold flex items-center justify-center border border-white/10 cursor-pointer"
                                title="Decrease lab session"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={analysis.practicalConducted || 100}
                                value={analysis.practicalAttended}
                                onChange={(e) =>
                                  handleSetAttendedTypeDirect(analysis.subjectId, 'practical', e.target.value)
                                }
                                className="w-11 h-7 text-center font-mono font-bold text-xs bg-black/60 rounded-lg border border-white/20 text-white focus:outline-none focus:border-amber-400"
                                title="Directly enter attended practical sessions"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateAttendedType(analysis.subjectId, 'practical', 1)}
                                disabled={
                                  analysis.practicalAttended >= analysis.practicalConducted &&
                                  analysis.practicalConducted > 0
                                }
                                className="w-7 h-7 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-amber-200 text-xs font-bold flex items-center justify-center border border-amber-500/40 cursor-pointer"
                                title="Add attended lab session"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expandable Class Cancellation & Conducted Override Section */}
                      {isAdjustOpen && (
                        <div className="mt-4 pt-4 border-t border-white/10 bg-slate-950/70 p-4 rounded-xl space-y-3 animate-fadeIn text-xs">
                          <div className="flex items-center gap-2 text-cyan-300 font-bold">
                            <Info className="w-4 h-4" />
                            <span>Class Cancellation & Actual Conducted Classes Adjustment</span>
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed">
                            Timetable scheduled{' '}
                            <strong className="text-slate-200">
                              {analysis.scheduledTillToday} classes
                            </strong>{' '}
                            up to today. If faculty was on leave or classes were cancelled, enter the actual conducted count below. The website will automatically update the total semester classes accordingly!
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div>
                              <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                                Actual Conducted Classes Till Date:
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
                                    handleSetConductedOverride(analysis.subjectId, e.target.value)
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
                                />
                                {hasConductedOverride && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetConductedOverride(analysis.subjectId, '')}
                                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                                    title="Reset to timetable scheduled"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                Leave empty to use automatic schedule count ({analysis.scheduledTillToday}).
                              </span>
                            </div>

                            <div>
                              <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                                Total Semester Classes Override (Optional):
                              </label>
                              <input
                                type="number"
                                min={1}
                                placeholder={`Auto: ${analysis.totalClassesInSemester}`}
                                value={rec?.manualTotalPlannedOverride ?? ''}
                                onChange={(e) =>
                                  handleSetTotalPlannedOverride(analysis.subjectId, e.target.value)
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
                              />
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                Automatically computed as {analysis.totalClassesInSemester} classes based on calendar working days minus cancellations.
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {subjectAnalyses.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-xs italic bg-black/30 rounded-2xl border border-white/5">
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
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-cyan-950/60 to-slate-900 border border-cyan-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">
                      AI Academic Calendar Scanner
                    </h5>
                    <p className="text-xs text-slate-300">
                      Upload your college's official calendar circular below. Gemini AI will automatically extract the start date, end date, and all holidays!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerAiScan}
                  disabled={isAiScanning || !config.calendarFileDataUrl}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Scan Calendar with AI</span>
                </button>
              </div>

              {/* Academic Calendar Document Attachment / Upload */}
              <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Upload Academic Calendar Document
                      </h4>
                      <p className="text-xs text-slate-400">
                        Upload your official college PDF or image calendar for AI to read
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-cyan-600/20">
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
                  <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <div>
                        <span className="text-xs font-semibold text-white block">
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
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>AI Scan</span>
                      </button>
                      {config.calendarFileDataUrl && (
                        <a
                          href={config.calendarFileDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors"
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
                <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-4">
                  <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>Semester Working Period</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Start and end dates extracted by AI or entered manually. All working days between these dates are computed automatically.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 text-xs font-semibold block mb-1">
                        Semester Start Date
                      </label>
                      <input
                        type="date"
                        value={config.startDate}
                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 text-xs font-semibold block mb-1">
                        Semester End Date
                      </label>
                      <input
                        type="date"
                        value={config.endDate}
                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between">
                    <span>Total Calculated Working Days in Semester:</span>
                    <strong className="font-mono text-sm">{totalWorkingDays} Days</strong>
                  </div>
                </div>

                {/* Working Days of Week Toggle */}
                <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-4">
                  <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>Weekly Working Days</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
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
                              ? 'bg-purple-600/25 text-purple-200 border-purple-500/40 shadow-sm'
                              : 'bg-white/5 text-slate-500 border-white/5 hover:text-white'
                          }`}
                        >
                          <span>{day}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* University Holidays / Non-Instructional Days List */}
              <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Holidays & University Vacations ({(config.holidays || []).length})</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Classes falling on holidays are automatically deducted from the total semester class count.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleImportSuggestedHolidays}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
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
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Holiday title (e.g. Gandhi Jayanti, Sports Day)..."
                    value={newHolidayTitle}
                    onChange={(e) => setNewHolidayTitle(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Holiday
                  </button>
                </form>

                {/* Holiday Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {(config.holidays || []).map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-slate-950/50 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white block truncate max-w-[180px]">
                          {h.title}
                        </span>
                        <span className="text-[10px] text-amber-300 font-mono">{h.date}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
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
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-fuchsia-950/60 to-slate-900 border border-purple-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">
                      AI Timetable Scanner & Subject Mapper
                    </h5>
                    <p className="text-xs text-slate-300">
                      Upload a photo or PDF of your weekly timetable. Gemini AI will read every period and automatically assign classes to your registered subjects!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerAiScan}
                  disabled={isAiScanning || !config.timetableFileDataUrl}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Scan Timetable with AI</span>
                </button>
              </div>

              {/* Timetable Document Attachment */}
              <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Upload Weekly Timetable Document
                      </h4>
                      <p className="text-xs text-slate-400">
                        Upload your section timetable PDF or image for AI parsing
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20">
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
                  <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          {config.timetableFileName}
                        </span>
                        <span className="text-[10px] text-purple-300 font-mono">
                          Ready for AI scanning & period mapping
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerAiScan}
                        disabled={isAiScanning}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>AI Scan</span>
                      </button>
                      {config.timetableFileDataUrl && (
                        <a
                          href={config.timetableFileDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1 transition-colors"
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
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white">Weekly Timetable Matrix</h4>
                  <p className="text-xs text-slate-400">
                    Auto-populated by AI from your uploaded timetable or customizable below.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFillTimetable}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Auto assign weekly class frequency based on subject credits"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Fill by Credits</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearTimetable}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Add Class Period Form */}
              <form onSubmit={handleAddSlot} className="p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Day of Week</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {(config.workingDays || []).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Subject (From Cards)</label>
                  <select
                    value={slotSubjectId}
                    onChange={(e) => setSlotSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-400 truncate"
                  >
                    {safeSemester.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Class Type</label>
                  <div className="flex rounded-xl bg-slate-900 border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSlotType('theory');
                        setSlotTime(STANDARD_TIME_SLOTS[0]);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        slotType === 'theory'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                          : 'text-slate-400 hover:text-white'
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
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FlaskConical className="w-3 h-3" />
                      <span>Lab</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Time Slot</label>
                  <select
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
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
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
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
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3 min-h-[160px] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <span className="font-heading font-extrabold text-sm text-cyan-300">
                            {day}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
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
                                className={`p-2.5 rounded-xl border transition-all group flex items-start justify-between gap-1.5 ${
                                  isLab
                                    ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400/50'
                                    : 'bg-slate-900 border-white/10 hover:border-cyan-500/40'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-white block truncate">
                                      {sub?.code || 'SUB'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSlotType(slot.id)}
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors ${
                                        isLab
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                                          : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/25'
                                      }`}
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
                                  <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                                    {sub?.name || 'Subject'}
                                  </span>
                                  {slot.slotTime && (
                                    <span
                                      className={`text-[9px] font-mono block mt-0.5 ${
                                        isLab ? 'text-amber-400/90' : 'text-cyan-400/90'
                                      }`}
                                    >
                                      {slot.slotTime}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-slate-600 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer shrink-0"
                                  title="Remove slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}

                          {daySlots.length === 0 && (
                            <div className="text-center py-6 text-slate-600 text-[11px] italic">
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
                        className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/80 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline">
                All timetable and attendance data auto-saved to your student profile!
              </span>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{hasKey ? 'Gemini AI Configured' : 'Set Gemini AI Key'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-600/20 ml-auto cursor-pointer"
            >
              Done & Save
            </button>
          </div>
        </AttendanceErrorBoundary>

        {/* Gemini API Key Dialog Modal */}
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md glass-panel rounded-3xl border border-cyan-500/40 p-6 bg-slate-900 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Google Gemini AI Setup</h4>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      100% Free • Powered by Gemini Vision
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                MarksBoard uses Google Gemini to read your uploaded Academic Calendar & Timetable photos or PDFs, detect semester dates, find holidays, and automatically map class periods to your course cards.
              </p>

              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200 space-y-1.5">
                <span className="font-bold block">Don't have a free key yet?</span>
                <p className="text-[11px] text-slate-300">
                  You can generate a free Gemini API key in 30 seconds with any Google account:
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] shadow-sm transition-all"
                >
                  <span>Get Free Key at Google AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <form onSubmit={handleSaveApiKey} className="space-y-3 pt-1">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">
                    Paste Gemini API Key:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Your key is saved locally in this browser and never uploaded anywhere else.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md"
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
