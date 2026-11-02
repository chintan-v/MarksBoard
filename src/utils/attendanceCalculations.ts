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

/**
 * Creates default attendance configuration for a semester, automatically
 * scheduling timetable slots for existing subjects based on credit weights.
 */
export function createDefaultAttendanceConfig(semester: Semester): SemesterAttendanceConfig {
  const isOddSem = semester.semNumber % 2 !== 0;
  const currentYear = new Date().getFullYear();

  // Typical semester timeline:
  // Odd: August to mid-December (~19 weeks)
  // Even: mid-January to end-May (~19 weeks)
  const startDate = isOddSem ? `${currentYear}-08-03` : `${currentYear}-01-18`;
  const endDate = isOddSem ? `${currentYear}-12-18` : `${currentYear}-05-28`;

  const workingDays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Relevant holidays falling within the semester period
  const holidays = DEFAULT_SUGGESTED_HOLIDAYS.filter((h) => {
    return h.date >= startDate && h.date <= endDate;
  });

  // Auto-generate realistic weekly timetable slots from subjects in this semester
  const timetable: TimetableSlot[] = [];
  const subjects = semester.subjects || [];

  // Distribution map across week days for classes
  const daySlotPlan: Record<DayOfWeek, string[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };

  subjects.forEach((sub, subIdx) => {
    const weeklyFreq = Math.max(1, Math.min(5, sub.credits || 3));
    const targetDays: DayOfWeek[] = [];

    if (weeklyFreq >= 4) {
      targetDays.push('Monday', 'Tuesday', 'Wednesday', 'Thursday');
    } else if (weeklyFreq === 3) {
      targetDays.push('Monday', 'Wednesday', 'Friday');
    } else if (weeklyFreq === 2) {
      targetDays.push('Tuesday', 'Thursday');
    } else {
      // 1 or 0 credit
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

      daySlotPlan[day].push(sub.code);
    });
  });

  // Initialize records for each subject
  const subjectRecords: Record<string, SubjectAttendanceRecord> = {};
  subjects.forEach((sub) => {
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
 */
export function calculateWorkingDaysDistribution(
  startDateStr: string,
  endDateStr: string,
  workingDays: DayOfWeek[],
  holidays: CalendarHoliday[],
  asOfDateStr?: string
) {
  const holidayDateSet = new Set(holidays.map((h) => h.date));
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

  const current = new Date(startDateStr);
  const end = new Date(endDateStr);

  // If start is after end, return zeros
  if (current > end) {
    return {
      totalWorkingDays: 0,
      elapsedWorkingDays: 0,
      daysByWeekday,
      elapsedByWeekday,
    };
  }

  // Iterate day by day
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const dayNum = current.getDay(); // 0 is Sunday, 1 is Monday... 6 is Saturday
    const weekdayMap: Record<number, DayOfWeek | null> = {
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
      0: null, // Sunday
    };

    const weekday = weekdayMap[dayNum];

    if (weekday && workingDays.includes(weekday) && !holidayDateSet.has(dateStr)) {
      totalWorkingDays++;
      daysByWeekday[weekday]++;

      if (dateStr <= todayStr) {
        elapsedWorkingDays++;
        elapsedByWeekday[weekday]++;
      }
    }

    current.setDate(current.getDate() + 1);
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
  config: SemesterAttendanceConfig,
  customTarget?: number,
  asOfDateStr?: string
): SubjectAttendanceAnalysis {
  const targetPercentage = customTarget || config.targetPercentage || 75;

  const { daysByWeekday, elapsedByWeekday } = calculateWorkingDaysDistribution(
    config.startDate,
    config.endDate,
    config.workingDays,
    config.holidays,
    asOfDateStr
  );

  // Count scheduled classes in the timetable for this subject
  const subjectSlots = (config.timetable || []).filter((slot) => slot.subjectId === subject.id);

  let totalScheduledClasses = 0;
  let scheduledTillToday = 0;

  subjectSlots.forEach((slot) => {
    const totalDayCount = daysByWeekday[slot.day] || 0;
    const elapsedDayCount = elapsedByWeekday[slot.day] || 0;

    totalScheduledClasses += totalDayCount;
    scheduledTillToday += elapsedDayCount;
  });

  // Fallback: if no slots configured yet, estimate by credits & working weeks
  if (totalScheduledClasses === 0) {
    const weeklyFreq = Math.max(1, Math.min(5, subject.credits || 3));
    // Average 16 teaching weeks in a university semester
    totalScheduledClasses = weeklyFreq * 16;
    // Estimate 8 weeks elapsed if today is within semester, else 0
    scheduledTillToday = Math.floor(totalScheduledClasses * 0.45);
  }

  const record: SubjectAttendanceRecord = config.subjectRecords?.[subject.id] || {
    subjectId: subject.id,
    attendedClasses: 0,
    manualConductedOverride: null,
    manualTotalPlannedOverride: null,
  };

  // User specification:
  // "if the student think number of total classes is wrong cuz of any previous class cancellation,
  // ask the user to manually enter how many classes were conducted till date. later, update it for the total number of classes."
  const hasConductedOverride =
    record.manualConductedOverride !== null &&
    record.manualConductedOverride !== undefined &&
    record.manualConductedOverride >= 0;

  const conductedClasses = hasConductedOverride
    ? Math.max(0, record.manualConductedOverride!)
    : scheduledTillToday;

  // Calculate cancelled classes (difference between scheduled till date vs actual conducted)
  const cancelledClasses = hasConductedOverride
    ? Math.max(0, scheduledTillToday - conductedClasses)
    : 0;

  // Total classes across the semester dynamically adjusted for cancellations:
  let totalClassesInSemester: number;
  if (
    record.manualTotalPlannedOverride !== null &&
    record.manualTotalPlannedOverride !== undefined &&
    record.manualTotalPlannedOverride > 0
  ) {
    totalClassesInSemester = record.manualTotalPlannedOverride;
  } else {
    // If classes were cancelled, the total planned classes for the semester drops accordingly
    totalClassesInSemester = Math.max(
      conductedClasses,
      totalScheduledClasses - cancelledClasses
    );
  }

  // Attended classes entered by the student (cannot exceed conducted)
  const rawAttended = Math.max(0, record.attendedClasses || 0);
  const attendedClasses = conductedClasses > 0 ? Math.min(conductedClasses, rawAttended) : 0;
  const missedClasses = Math.max(0, conductedClasses - attendedClasses);

  // Current Attendance Percentage
  const currentPercentage =
    conductedClasses > 0 ? Number(((attendedClasses / conductedClasses) * 100).toFixed(1)) : 100.0;

  // Bunk Forecaster (how many more classes they can take leave of across the entire semester)
  // To finish semester with >= targetPercentage:
  const minAttendedNeededInSemester = Math.ceil((targetPercentage / 100) * totalClassesInSemester);
  const maxTotalLeavesInSemester = Math.max(0, totalClassesInSemester - minAttendedNeededInSemester);
  const canBunkMore = Math.max(0, maxTotalLeavesInSemester - missedClasses);

  // Immediate Safe Bunk (how many consecutive upcoming classes can be skipped RIGHT NOW without dropping below target today)
  let immediateBunkSafe = 0;
  if (currentPercentage >= targetPercentage && conductedClasses > 0) {
    immediateBunkSafe = Math.floor(
      (100 * attendedClasses - targetPercentage * conductedClasses) / targetPercentage
    );
    if (immediateBunkSafe < 0) immediateBunkSafe = 0;
  }

  // Consecutive classes needed to attend if currently below target:
  let consecutiveClassesNeeded = 0;
  const isShortage = currentPercentage < targetPercentage;
  if (isShortage && conductedClasses > 0) {
    consecutiveClassesNeeded = Math.ceil(
      (targetPercentage * conductedClasses - 100 * attendedClasses) / (100 - targetPercentage)
    );
    if (consecutiveClassesNeeded < 0) consecutiveClassesNeeded = 0;
  }

  // Status & Badges
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
    subjectCode: subject.code,
    subjectName: subject.name,
    credits: subject.credits,
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
