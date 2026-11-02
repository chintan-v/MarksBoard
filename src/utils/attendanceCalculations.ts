import type {
  CalendarHoliday,
  DayOfWeek,
  Semester,
  SemesterAttendanceConfig,
  Subject,
  SubjectAttendanceAnalysis,
  SubjectAttendanceRecord,
  TimetableSlot,
} from '../types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const STANDARD_TIME_SLOTS = [
  '09:00 - 10:00 AM',
  '10:00 - 11:00 AM',
  '11:15 - 12:15 PM',
  '12:15 - 01:15 PM',
  '02:00 - 03:00 PM',
  '03:00 - 04:00 PM',
  '04:00 - 05:00 PM',
];

export const DEFAULT_SUGGESTED_HOLIDAYS: CalendarHoliday[] = [
  { id: 'h-1', date: '2026-08-15', title: 'Independence Day 🇮🇳' },
  { id: 'h-2', date: '2026-09-04', title: 'Ganesh Chaturthi 🐘' },
  { id: 'h-3', date: '2026-10-02', title: 'Mahatma Gandhi Jayanti 🕊️' },
  { id: 'h-4', date: '2026-10-20', title: 'Mahanavami / Ayudha Puja 🌸' },
  { id: 'h-5', date: '2026-10-21', title: 'Vijayadashami (Dussehra) 🏹' },
  { id: 'h-6', date: '2026-11-01', title: 'Karnataka Rajyotsava 💛❤️' },
  { id: 'h-7', date: '2026-11-08', title: 'Naraka Chaturdashi (Diwali) 🪔' },
  { id: 'h-8', date: '2026-11-10', title: 'Balipadyami (Deepavali) ✨' },
  { id: 'h-9', date: '2026-12-25', title: 'Christmas Holiday 🎄' },
  { id: 'h-10', date: '2027-01-26', title: 'Republic Day 🇮🇳' },
  { id: 'h-11', date: '2027-03-08', title: 'Maha Shivaratri 🕉️' },
  { id: 'h-12', date: '2027-04-14', title: 'Dr. B.R. Ambedkar Jayanti 📜' },
  { id: 'h-13', date: '2027-05-01', title: 'May Day (Labor Day) 🛠️' },
];

function parseDateParts(dateStr: string): [number, number, number] | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return [y, m, d];
}

/**
 * Creates default attendance configuration for a semester, automatically
 * scheduling timetable slots for existing subjects based on credit weights.
 */
export function createDefaultAttendanceConfig(semester?: Semester | null): SemesterAttendanceConfig {
  const semNum = semester?.semNumber || 5;
  const isOddSem = semNum % 2 !== 0;
  const currentYear = new Date().getFullYear();

  // Typical semester timeline:
  // Odd: August to mid-December (~19 weeks)
  // Even: mid-January to end-May (~19 weeks)
  const startDate = isOddSem ? `${currentYear}-08-03` : `${currentYear}-01-18`;
  const endDate = isOddSem ? `${currentYear}-12-18` : `${currentYear}-05-28`;

  const workingDays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const holidays = DEFAULT_SUGGESTED_HOLIDAYS.filter((h) => {
    return h.date >= startDate && h.date <= endDate;
  });

  const timetable: TimetableSlot[] = [];
  const subjects = (semester?.subjects || []).filter(Boolean);

  const subjectRecords: Record<string, SubjectAttendanceRecord> = {};

  subjects.forEach((sub, subIdx) => {
    if (!sub || !sub.id) return;
    const weeklyFreq = Math.max(1, Math.min(5, sub.credits || 3));
    const targetDays: DayOfWeek[] = [];

    if (weeklyFreq >= 4) {
      targetDays.push('Monday', 'Tuesday', 'Wednesday', 'Thursday');
    } else if (weeklyFreq === 3) {
      targetDays.push('Monday', 'Wednesday', 'Friday');
    } else if (weeklyFreq === 2) {
      targetDays.push('Tuesday', 'Thursday');
    } else {
      const daysPool: DayOfWeek[] = ['Friday', 'Wednesday', 'Monday', 'Tuesday', 'Thursday'];
      targetDays.push(daysPool[subIdx % daysPool.length]);
    }

    targetDays.forEach((day, dayIndex) => {
      const slotTimeIndex = (subIdx + dayIndex) % STANDARD_TIME_SLOTS.length;
      const slotTime = STANDARD_TIME_SLOTS[slotTimeIndex];

      timetable.push({
        id: `slot-${sub.id}-${day}-${slotTimeIndex}`,
        day,
        subjectId: sub.id,
        slotTime,
      });
    });

    subjectRecords[sub.id] = {
      subjectId: sub.id,
      attendedClasses: 0,
      manualConductedOverride: null,
      manualTotalPlannedOverride: null,
      notes: '',
    };
  });

  return {
    startDate,
    endDate,
    workingDays,
    holidays,
    timetable,
    subjectRecords,
    targetPercentage: 75,
  };
}

/**
 * Calculates total working days and occurrences of each weekday in the semester
 * using safe UTC millisecond stepping (immune to timezone/DST shifts).
 */
export function calculateWorkingDaysDistribution(
  startDateStr?: string,
  endDateStr?: string,
  workingDays?: DayOfWeek[],
  holidays?: CalendarHoliday[],
  asOfDateStr?: string
) {
  const safeHolidays = Array.isArray(holidays) ? holidays : [];
  const safeWorkingDays =
    Array.isArray(workingDays) && workingDays.length > 0
      ? workingDays
      : (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as DayOfWeek[]);

  const holidayDateSet = new Set(
    safeHolidays.map((h) => (h && h.date ? h.date.trim() : '')).filter(Boolean)
  );

  const todayStr = asOfDateStr || new Date().toISOString().split('T')[0];

  const daysByWeekday: Record<DayOfWeek, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  const elapsedByWeekday: Record<DayOfWeek, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  let totalWorkingDays = 0;
  let elapsedWorkingDays = 0;

  const currentYear = new Date().getFullYear();
  const startParts = parseDateParts(startDateStr || '') || [currentYear, 8, 3];
  const endParts = parseDateParts(endDateStr || '') || [currentYear, 12, 18];

  const tStart = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
  const tEnd = Date.UTC(endParts[0], endParts[1] - 1, endParts[2]);

  if (tStart > tEnd) {
    return {
      totalWorkingDays: 0,
      elapsedWorkingDays: 0,
      daysByWeekday,
      elapsedByWeekday,
    };
  }

  const weekdayNames: (DayOfWeek | null)[] = [
    null, // 0 = Sunday
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const oneDayMs = 24 * 60 * 60 * 1000;
  const maxDays = 366; // Safety ceiling to guarantee no runaway loop
  let daysCount = 0;

  for (let t = tStart; t <= tEnd && daysCount < maxDays; t += oneDayMs, daysCount++) {
    const d = new Date(t);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const dayNum = d.getUTCDay();
    const weekday = weekdayNames[dayNum];

    if (weekday && safeWorkingDays.includes(weekday) && !holidayDateSet.has(dateStr)) {
      totalWorkingDays++;
      daysByWeekday[weekday] = (daysByWeekday[weekday] || 0) + 1;

      if (dateStr <= todayStr) {
        elapsedWorkingDays++;
        elapsedByWeekday[weekday] = (elapsedByWeekday[weekday] || 0) + 1;
      }
    }
  }

  return {
    totalWorkingDays,
    elapsedWorkingDays,
    daysByWeekday,
    elapsedByWeekday,
  };
}

/**
 * Calculates complete attendance status, bunk allowance margin,
 * class cancellation adjustments, and recovery targets for a subject.
 */
export function calculateSubjectAttendanceAnalysis(
  subject: Subject,
  config?: SemesterAttendanceConfig | null,
  customTarget?: number,
  asOfDateStr?: string
): SubjectAttendanceAnalysis {
  if (!subject) {
    return {
      subjectId: 'unknown',
      subjectCode: 'SUB',
      subjectName: 'Subject',
      credits: 3,
      totalScheduledClasses: 0,
      scheduledTillToday: 0,
      conductedClasses: 0,
      attendedClasses: 0,
      missedClasses: 0,
      cancelledClasses: 0,
      totalClassesInSemester: 0,
      currentPercentage: 100,
      targetPercentage: customTarget || 75,
      canBunkMore: 0,
      immediateBunkSafe: 0,
      consecutiveClassesNeeded: 0,
      isShortage: false,
      status: 'safe',
      statusBadge: {
        label: 'Safe Margin',
        color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
        message: 'No data',
      },
    };
  }

  const safeConfig: SemesterAttendanceConfig =
    config && typeof config === 'object'
      ? {
          startDate: config.startDate || '2026-08-03',
          endDate: config.endDate || '2026-12-18',
          workingDays:
            Array.isArray(config.workingDays) && config.workingDays.length > 0
              ? config.workingDays
              : (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as DayOfWeek[]),
          holidays: Array.isArray(config.holidays) ? config.holidays : [],
          timetable: Array.isArray(config.timetable) ? config.timetable : [],
          subjectRecords: config.subjectRecords || {},
          targetPercentage: config.targetPercentage || 75,
          calendarFileName: config.calendarFileName,
          calendarFileDataUrl: config.calendarFileDataUrl,
          timetableFileName: config.timetableFileName,
          timetableFileDataUrl: config.timetableFileDataUrl,
        }
      : createDefaultAttendanceConfig(null);

  const targetPercentage = Math.max(
    50,
    Math.min(100, customTarget || safeConfig.targetPercentage || 75)
  );

  const { daysByWeekday, elapsedByWeekday } = calculateWorkingDaysDistribution(
    safeConfig.startDate,
    safeConfig.endDate,
    safeConfig.workingDays,
    safeConfig.holidays,
    asOfDateStr
  );

  const subjectSlots = (safeConfig.timetable || []).filter(
    (slot) => slot && slot.subjectId === subject.id
  );

  let totalScheduledClasses = 0;
  let scheduledTillToday = 0;

  subjectSlots.forEach((slot) => {
    if (!slot || !slot.day) return;
    const totalDayCount = daysByWeekday[slot.day] || 0;
    const elapsedDayCount = elapsedByWeekday[slot.day] || 0;

    totalScheduledClasses += totalDayCount;
    scheduledTillToday += elapsedDayCount;
  });

  if (totalScheduledClasses === 0) {
    const weeklyFreq = Math.max(1, Math.min(5, subject.credits || 3));
    totalScheduledClasses = weeklyFreq * 16;
    scheduledTillToday = Math.floor(totalScheduledClasses * 0.45);
  }

  const record: SubjectAttendanceRecord = safeConfig.subjectRecords?.[subject.id] || {
    subjectId: subject.id,
    attendedClasses: 0,
    manualConductedOverride: null,
    manualTotalPlannedOverride: null,
  };

  const hasConductedOverride =
    record.manualConductedOverride !== null &&
    record.manualConductedOverride !== undefined &&
    !isNaN(Number(record.manualConductedOverride)) &&
    Number(record.manualConductedOverride) >= 0;

  const conductedClasses = hasConductedOverride
    ? Math.max(0, Number(record.manualConductedOverride))
    : scheduledTillToday;

  const cancelledClasses = hasConductedOverride
    ? Math.max(0, scheduledTillToday - conductedClasses)
    : 0;

  let totalClassesInSemester: number;
  if (
    record.manualTotalPlannedOverride !== null &&
    record.manualTotalPlannedOverride !== undefined &&
    !isNaN(Number(record.manualTotalPlannedOverride)) &&
    Number(record.manualTotalPlannedOverride) > 0
  ) {
    totalClassesInSemester = Number(record.manualTotalPlannedOverride);
  } else {
    totalClassesInSemester = Math.max(conductedClasses, totalScheduledClasses - cancelledClasses);
  }

  const rawAttended = Math.max(0, Number(record.attendedClasses) || 0);
  const attendedClasses = conductedClasses > 0 ? Math.min(conductedClasses, rawAttended) : 0;
  const missedClasses = Math.max(0, conductedClasses - attendedClasses);

  const currentPercentage =
    conductedClasses > 0 ? Number(((attendedClasses / conductedClasses) * 100).toFixed(1)) : 100.0;

  const minAttendedNeededInSemester = Math.ceil((targetPercentage / 100) * totalClassesInSemester);
  const maxTotalLeavesInSemester = Math.max(0, totalClassesInSemester - minAttendedNeededInSemester);
  const canBunkMore = Math.max(0, maxTotalLeavesInSemester - missedClasses);

  let immediateBunkSafe = 0;
  if (currentPercentage >= targetPercentage && conductedClasses > 0) {
    immediateBunkSafe = Math.floor(
      (100 * attendedClasses - targetPercentage * conductedClasses) / targetPercentage
    );
    if (immediateBunkSafe < 0) immediateBunkSafe = 0;
  }

  let consecutiveClassesNeeded = 0;
  const isShortage = currentPercentage < targetPercentage;
  if (isShortage && conductedClasses > 0) {
    const denom = Math.max(1, 100 - targetPercentage);
    consecutiveClassesNeeded = Math.ceil(
      (targetPercentage * conductedClasses - 100 * attendedClasses) / denom
    );
    if (consecutiveClassesNeeded < 0) consecutiveClassesNeeded = 0;
  }

  let status: 'safe' | 'warning' | 'danger' | 'critical' = 'safe';
  let badgeLabel = 'Safe Margin';
  let badgeColor = 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
  let badgeMessage = `You can bunk ${canBunkMore} more ${canBunkMore === 1 ? 'class' : 'classes'} and maintain ${targetPercentage}% attendance.`;

  if (isShortage) {
    if (currentPercentage < targetPercentage - 15) {
      status = 'critical';
      badgeLabel = 'Critical Shortage';
      badgeColor = 'text-rose-400 bg-rose-500/20 border-rose-500/40';
      badgeMessage = `🚨 Severe attendance shortage! Must attend next ${consecutiveClassesNeeded} consecutive classes to reach ${targetPercentage}%.`;
    } else {
      status = 'danger';
      badgeLabel = 'Attendance Deficit';
      badgeColor = 'text-red-400 bg-red-500/15 border-red-500/30';
      badgeMessage = `⚠️ Below ${targetPercentage}%! Attend next ${consecutiveClassesNeeded} classes continuously to recover.`;
    }
  } else if (canBunkMore === 0) {
    status = 'warning';
    badgeLabel = 'Zero Leaves Left';
    badgeColor = 'text-amber-300 bg-amber-500/15 border-amber-500/30';
    badgeMessage = `You cannot afford any more leaves. Attend every class to stay at or above ${targetPercentage}%.`;
  } else if (canBunkMore <= 2) {
    status = 'warning';
    badgeLabel = 'Borderline Safe';
    badgeColor = 'text-amber-300 bg-amber-500/15 border-amber-500/30';
    badgeMessage = `Only ${canBunkMore} more ${canBunkMore === 1 ? 'leave' : 'leaves'} remaining before dropping below ${targetPercentage}%.`;
  } else if (currentPercentage >= 90) {
    status = 'safe';
    badgeLabel = 'Untouchable Aura';
    badgeColor = 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30';
    badgeMessage = `Elite attendance! You can bunk ${canBunkMore} classes throughout the semester and stay safe.`;
  }

  return {
    subjectId: subject.id,
    subjectCode: subject.code || 'SUB',
    subjectName: subject.name || 'Subject',
    credits: subject.credits || 0,
    totalScheduledClasses,
    scheduledTillToday,
    conductedClasses,
    attendedClasses,
    missedClasses,
    cancelledClasses,
    totalClassesInSemester,
    currentPercentage,
    targetPercentage,
    canBunkMore,
    immediateBunkSafe,
    consecutiveClassesNeeded,
    isShortage,
    status,
    statusBadge: {
      label: badgeLabel,
      color: badgeColor,
      message: badgeMessage,
    },
  };
}
