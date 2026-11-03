export type LetterGrade =
  | 'O'
  | 'A+'
  | 'A'
  | 'B+'
  | 'B'
  | 'C'
  | 'P'
  | 'F'
  | 'AP'
  | 'AF'
  | 'IC'
  | 'NE'
  | 'W';

export interface GradeThreshold {
  grade: LetterGrade;
  minMarks: number;
  maxMarks: number;
  gradePoint: number;
  description: string;
  badgeColor: string;
}

export interface SpecialGrade {
  grade: LetterGrade;
  gradePoint: string;
  description: string;
  percentageMarks: string;
  badgeColor: string;
}

export type ModuleStatus = 'not_started' | 'notes_ready' | 'pyq_solved' | 'mastered';

export interface SubjectModule {
  id: number; // 1 to 5
  title: string;
  isMSECoverage: boolean; // Modules 1, 2 & part of 3 (covered in MSE)
  seeMarksWeightage: number; // 16 marks per module for SEE (total 80)
  mseMarksWeightage?: number; // 20 marks per module for MSE (total 40)
  status: ModuleStatus;
  revisionCount: number; // 0, 1, 2, 3+
  notes: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number; // 4, 3, 2, 1, or 0
  hasSEE: boolean; // default true, some subjects are 100% internals
  hasMSE: boolean; // default true, some subjects don't have MSE
  mseMaxScale?: number; // 30 (default) or 20 (for subjects where MSE converts to 20)

  // Internals (Total 60 max, or 100 if no SEE)
  mseRawMarks: number | null; // Raw MSE out of 40 (converted to max 30 or 20)
  ciaMarks: number | null; // CIA out of 30 or 40 (quizzes, assignments, open book, CAT, labs)
  internalDirectMarks?: number | null; // For subjects without MSE or 100% internals

  // Externals (Max 80, converted to 40)
  seeRawMarks: number | null; // Raw SEE out of 80 (converted to max 40)

  // Module Tracker (5 modules)
  modules: SubjectModule[];

  // Target Grade setting
  favouredGrade?: LetterGrade;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface CalendarHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
}

export type ClassSlotType = 'theory' | 'practical';

export interface TimetableSlot {
  id: string;
  day: DayOfWeek;
  subjectId: string;
  slotTime?: string;
  type?: ClassSlotType; // 'theory' | 'practical'
}

export interface SubjectAttendanceRecord {
  subjectId: string;
  attendedClasses: number;
  attendedTheory?: number; // specific theory classes attended
  attendedPractical?: number; // specific practical/lab classes attended
  manualConductedOverride?: number | null; // User override if classes were cancelled
  manualTotalPlannedOverride?: number | null;
  notes?: string;
}

export interface SemesterAttendanceConfig {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingDays: DayOfWeek[];
  holidays: CalendarHoliday[];
  timetable: TimetableSlot[];
  subjectRecords: Record<string, SubjectAttendanceRecord>;
  targetPercentage: number; // e.g. 75, 85, or n
  calendarFileName?: string;
  calendarFileDataUrl?: string;
  timetableFileName?: string;
  timetableFileDataUrl?: string;
}

export interface SubjectAttendanceAnalysis {
  id: string; // unique item id (sub.id or `${sub.id}__theory` / `${sub.id}__practical`)
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  componentType: ClassSlotType; // 'theory' | 'practical'
  totalScheduledClasses: number;
  scheduledTillToday: number;
  conductedClasses: number;
  attendedClasses: number;
  missedClasses: number;
  cancelledClasses: number;
  totalClassesInSemester: number;
  currentPercentage: number;
  targetPercentage: number;
  canBunkMore: number;
  immediateBunkSafe: number;
  consecutiveClassesNeeded: number;
  isShortage: boolean;
  status: 'safe' | 'warning' | 'danger' | 'critical';
  statusBadge: {
    label: string;
    color: string;
    message: string;
  };

  // Optional categorization references
  courseCategory?: 'theory_only' | 'practical_only' | 'integrated';
  hasTheory?: boolean;
  hasPractical?: boolean;
  theoryScheduled?: number;
  theoryScheduledTillToday?: number;
  theoryConducted?: number;
  theoryAttended?: number;
  theoryPercentage?: number;
  practicalScheduled?: number;
  practicalScheduledTillToday?: number;
  practicalConducted?: number;
  practicalAttended?: number;
  practicalPercentage?: number;
}

export interface Semester {
  semNumber: number; // 1 to 8
  title: string;
  academicYear: string;
  subjects: Subject[];
  isCompleted?: boolean;
  attendanceConfig?: SemesterAttendanceConfig;
}

export interface StudentProfile {
  usn: string;
  name: string;
  password?: string;
  college: string; // default: "Dayananda Sagar University"
  branch: string; // e.g. "Computer Science & Engineering"
  avatar: string; // emoji or image URL
  bio: string; // e.g. "Member Of Student affairs 😎"
  targetCGPA: number;
  currentSemester: number; // default 5 or active
  isGuest?: boolean;
  semesters: Semester[];
}

export interface CalculatedSubjectMarks {
  mseScaled: number; // max 30 or 20
  ciaScaled: number; // max 30 or 40
  totalInternals: number; // max 60 (or 100)
  seeScaled: number; // max 40
  totalMarks: number; // max 100
  grade: LetterGrade;
  gradePoint: number;
  passed: boolean;
  creditPoints: number; // credits * gradePoint
  isExternalPassed: boolean;
  mseMaxScale: number; // 30 or 20
  ciaMax: number; // 30, 40, 60, 70, 80 or 100
}

export interface SemesterResult {
  totalCredits: number;
  earnedCredits: number;
  totalGradePoints: number;
  sgpa: number;
  percentage: number;
  totalSubjects: number;
  passedSubjects: number;
  hasBacklogs: boolean;
  statusBadge: {
    label: string;
    color: string;
    tagline: string;
  };
}

export interface SEEPrediction {
  predictedRawSEE: number; // out of 80
  predictedScaledSEE: number; // out of 40
  predictedTotalMarks: number; // out of 100
  predictedGrade: LetterGrade;
  predictedGradePoint: number;
  confidence: 'High' | 'Moderate' | 'Provisional';
  rationale: string;
}

export interface AffordToLoseResult {
  targetGrade: LetterGrade;
  targetMinMarks: number;
  currentInternals: number;
  requiredScaledSEE: number; // out of 40
  requiredRawSEE: number; // out of 80
  canAffordToLoseOutOf80: number; // 80 - requiredRawSEE
  isAchievable: boolean;
  statusMessage: string;
  vibeTag: string;
  riskLevel: 'Super Safe 🛡️' | 'Comfortable 😎' | 'Clutch Needed ⚡' | 'Extreme Grind 🚨' | 'Mission Impossible 💀';
}

export interface EngineeringBranch {
  id: number;
  name: string;
  shortName: string;
}

export const ENGINEERING_BRANCHES: EngineeringBranch[] = [
  { id: 1, name: 'Computer Science and Engineering', shortName: 'CSE' },
  { id: 2, name: 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)', shortName: 'CSE (AI & ML)' },
  { id: 3, name: 'Computer Science and Engineering (AI and Data Science)', shortName: 'CSE (AI & DS)' },
  { id: 4, name: 'Computer Science and Engineering (Data Science)', shortName: 'CSE (DS)' },
  { id: 5, name: 'Computer Science and Engineering (Cyber Security)', shortName: 'CSE (Cyber Security)' },
  { id: 6, name: 'Computer Science and Engineering (Artificial Intelligence)', shortName: 'CSE (AI)' },
  { id: 7, name: 'Computer Science and Technology', shortName: 'CST' },
  { id: 8, name: 'Artificial Intelligence and Robotics', shortName: 'AI & Robotics' },
  { id: 9, name: 'Computer Science and Medical Engineering', shortName: 'CSME' },
  { id: 10, name: 'Electronics and Communication Engineering', shortName: 'ECE' },
  { id: 11, name: 'Mechanical Engineering', shortName: 'ME' },
  { id: 12, name: 'Aerospace Engineering', shortName: 'AE' },
];
