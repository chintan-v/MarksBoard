import type { Semester, StudentProfile, Subject, SubjectModule } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export function createDefaultModules(isCompleted = true, isGeneric = false): SubjectModule[] {
  if (isGeneric) {
    return [
      {
        id: 1,
        title: 'Module 1',
        isMSECoverage: true,
        seeMarksWeightage: 16,
        mseMarksWeightage: 20,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
      {
        id: 2,
        title: 'Module 2',
        isMSECoverage: true,
        seeMarksWeightage: 16,
        mseMarksWeightage: 20,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
      {
        id: 3,
        title: 'Module 3',
        isMSECoverage: false,
        seeMarksWeightage: 16,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
      {
        id: 4,
        title: 'Module 4',
        isMSECoverage: false,
        seeMarksWeightage: 16,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
      {
        id: 5,
        title: 'Module 5',
        isMSECoverage: false,
        seeMarksWeightage: 16,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
    ];
  }

  if (!isCompleted) {
    return [
      {
        id: 1,
        title: 'Module 1: Foundations & Core Architecture',
        isMSECoverage: true,
        seeMarksWeightage: 16,
        mseMarksWeightage: 20,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
      {
        id: 2,
        title: 'Module 2: Advanced Mechanics & Analysis',
        isMSECoverage: true,
        seeMarksWeightage: 16,
        mseMarksWeightage: 20,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
      {
        id: 3,
        title: 'Module 3: Optimization & System Design',
        isMSECoverage: true,
        seeMarksWeightage: 16,
        mseMarksWeightage: 20,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
      {
        id: 4,
        title: 'Module 4: Distributed Protocols & Applications',
        isMSECoverage: false,
        seeMarksWeightage: 16,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
      {
        id: 5,
        title: 'Module 5: Emerging Tech & Future Horizons',
        isMSECoverage: false,
        seeMarksWeightage: 16,
        status: 'not_started',
        revisionCount: 0,
        notes: '',
      },
    ];
  }

  return [
    {
      id: 1,
      title: 'Module 1: Foundations & Core Architecture',
      isMSECoverage: true,
      seeMarksWeightage: 16,
      mseMarksWeightage: 20,
      status: 'mastered',
      revisionCount: 2,
      notes: 'Formulas and derivation memorized. Solved previous year questions.',
    },
    {
      id: 2,
      title: 'Module 2: Advanced Mechanics & Analysis',
      isMSECoverage: true,
      seeMarksWeightage: 16,
      mseMarksWeightage: 20,
      status: 'pyq_solved',
      revisionCount: 1,
      notes: 'Focus on boundary conditions and state diagrams.',
    },
    {
      id: 3,
      title: 'Module 3: Optimization & System Design',
      isMSECoverage: true,
      seeMarksWeightage: 16,
      mseMarksWeightage: 20,
      status: 'notes_ready',
      revisionCount: 1,
      notes: 'Part A included in MSE. Part B is for SEE.',
    },
    {
      id: 4,
      title: 'Module 4: Distributed Protocols & Applications',
      isMSECoverage: false,
      seeMarksWeightage: 16,
      status: 'notes_ready',
      revisionCount: 0,
      notes: 'SEE exclusive module. Review case study 4.',
    },
    {
      id: 5,
      title: 'Module 5: Emerging Tech & Future Horizons',
      isMSECoverage: false,
      seeMarksWeightage: 16,
      status: 'not_started',
      revisionCount: 0,
      notes: 'SEE exclusive module. Review 2024 model question paper.',
    },
  ];
}

interface CourseConfig {
  code: string;
  name: string;
  credits: number;
  hasSEE: boolean;
  hasMSE: boolean;
  mseMaxScale?: number;
  mseRawMarks: number | null;
  ciaMarks: number | null;
  internalDirectMarks?: number | null;
  seeRawMarks: number | null;
}

export function createDefaultSemesterSubjects(semNum: number): Subject[] {
  // 8 Engineering subjects per semester matching prompt credit rule:
  // At most 3 with 4 credits, 2 with 3 credits, 1 with 2 credits, 1 with 1 credit, 1 with 0 credit
  const semesterConfigs: Record<number, CourseConfig[]> = {
    // Semester 1 (1st Year) - SGPA ~8.85
    1: [
      { code: '22MAT101', name: 'Calculus & Linear Algebra', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 36, ciaMarks: 28, seeRawMarks: 72 },
      { code: '22PHY102', name: 'Engineering Physics', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 33, ciaMarks: 26, seeRawMarks: 66 },
      { code: '22ELE103', name: 'Basic Electrical Engineering', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 30, ciaMarks: 25, seeRawMarks: 62 },
      { code: '22CIV104', name: 'Elements of Civil Engineering', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 35, ciaMarks: 27, seeRawMarks: 68 },
      { code: '22CSE105', name: 'Problem Solving with Python', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 37, ciaMarks: 29, seeRawMarks: 76 },
      { code: '22PHL106', name: 'Engineering Physics Lab', credits: 2, hasSEE: true, hasMSE: false, mseRawMarks: null, ciaMarks: 56, internalDirectMarks: 56, seeRawMarks: 72 },
      { code: '22ENG107', name: 'Communicative English', credits: 1, hasSEE: false, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: 88, seeRawMarks: null },
      { code: '22CIP108', name: 'Constitution of India & Human Rights', credits: 0, hasSEE: true, hasMSE: true, mseRawMarks: 32, ciaMarks: 24, seeRawMarks: 60 },
    ],

    // Semester 2 (1st Year) - SGPA ~8.15
    2: [
      { code: '22MAT201', name: 'Differential Equations & Transforms', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 32, ciaMarks: 25, seeRawMarks: 62 },
      { code: '22CHE202', name: 'Engineering Chemistry', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 29, ciaMarks: 23, seeRawMarks: 56 },
      { code: '22ECN203', name: 'Basic Electronics & Communication', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 28, ciaMarks: 22, seeRawMarks: 54 },
      { code: '22MEC204', name: 'Elements of Mechanical Engineering', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 26, ciaMarks: 21, seeRawMarks: 52 },
      { code: '22CSE205', name: 'Problem Solving with C', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 35, ciaMarks: 27, seeRawMarks: 68 },
      { code: '22CHL206', name: 'Engineering Chemistry Lab', credits: 2, hasSEE: true, hasMSE: false, mseRawMarks: null, ciaMarks: 52, internalDirectMarks: 52, seeRawMarks: 66 },
      { code: '22ENG207', name: 'Professional Communication Skills', credits: 1, hasSEE: false, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: 84, seeRawMarks: null },
      { code: '22EVS208', name: 'Environmental Studies & Sustainability', credits: 0, hasSEE: true, hasMSE: true, mseRawMarks: 29, ciaMarks: 22, seeRawMarks: 58 },
    ],

    // Semester 3 (2nd Year) - SGPA ~9.40
    3: [
      { code: '22MAT301', name: 'Discrete Mathematical Structures', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 37, ciaMarks: 29, seeRawMarks: 74 },
      { code: '22CS302', name: 'Data Structures & Applications', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 38, ciaMarks: 30, seeRawMarks: 76 },
      { code: '22CS303', name: 'Computer Organization & Architecture', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 35, ciaMarks: 27, seeRawMarks: 68 },
      { code: '22CS304', name: 'Object Oriented Programming with Java', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 36, ciaMarks: 28, seeRawMarks: 72 },
      { code: '22CS305', name: 'Digital Design & Computer Systems', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 32, ciaMarks: 25, seeRawMarks: 62 },
      { code: '22CSL36', name: 'Data Structures Laboratory', credits: 2, hasSEE: true, hasMSE: false, mseRawMarks: null, ciaMarks: 58, internalDirectMarks: 58, seeRawMarks: 76 },
      { code: '22SCR37', name: 'Social Connect & Responsibility', credits: 1, hasSEE: false, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: 94, seeRawMarks: null },
      { code: '22KAN38', name: 'Samskrutika Kannada / Balake Kannada', credits: 0, hasSEE: true, hasMSE: true, mseRawMarks: 33, ciaMarks: 26, seeRawMarks: 66 },
    ],

    // Semester 4 (2nd Year) - SGPA ~8.60
    4: [
      { code: '22MAT401', name: 'Complex Analysis & Numerical Methods', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 33, ciaMarks: 26, seeRawMarks: 64 },
      { code: '22CS402', name: 'Design & Analysis of Algorithms', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 36, ciaMarks: 28, seeRawMarks: 70 },
      { code: '22CS403', name: 'Operating Systems Principles', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 32, ciaMarks: 24, seeRawMarks: 60 },
      { code: '22CS404', name: 'Microprocessors & Microcontrollers', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 28, ciaMarks: 22, seeRawMarks: 54 },
      { code: '22CS405', name: 'Theory of Computation & Automata', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 32, ciaMarks: 25, seeRawMarks: 62 },
      { code: '22CSL46', name: 'OS & Microprocessor Lab', credits: 2, hasSEE: true, hasMSE: false, mseRawMarks: null, ciaMarks: 54, internalDirectMarks: 54, seeRawMarks: 68 },
      { code: '22DTK47', name: 'Design Thinking & Innovation', credits: 1, hasSEE: false, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: 86, seeRawMarks: null },
      { code: '22UHV48', name: 'Universal Human Values', credits: 0, hasSEE: true, hasMSE: true, mseRawMarks: 30, ciaMarks: 23, seeRawMarks: 58 },
    ],

    // Semester 5 (3rd Year - Active Semester) - SGPA ~9.10
    5: [
      { code: '22CS501', name: 'Analysis & Design of Algorithms', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 35, ciaMarks: 27, seeRawMarks: 68 },
      { code: '22CS502', name: 'Database Management Systems', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 37, ciaMarks: 28, seeRawMarks: 72 },
      { code: '22CS503', name: 'Computer Networks & Security', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 32, ciaMarks: 25, seeRawMarks: 64 },
      { code: '22CS504', name: 'Software Engineering & Agile', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 33, ciaMarks: 26, seeRawMarks: 66 },
      { code: '22CS505', name: 'Artificial Intelligence & Machine Learning', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 36, ciaMarks: 29, seeRawMarks: 74 },
      { code: '22CSL56', name: 'Full-Stack Development Lab', credits: 2, hasSEE: true, hasMSE: false, mseRawMarks: null, ciaMarks: 56, internalDirectMarks: 56, seeRawMarks: 72 },
      { code: '22CSP57', name: 'Research Methodology & IPR', credits: 1, hasSEE: false, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: 90, seeRawMarks: null },
      { code: '22CIV58', name: 'Constitution of India & Cyber Ethics', credits: 0, hasSEE: true, hasMSE: true, mseRawMarks: 32, ciaMarks: 25, seeRawMarks: 62 },
    ],

    // Semester 6 (3rd Year) - SGPA ~8.45
    6: [
      { code: '22CS601', name: 'Compiler Design & Language Processors', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 31, ciaMarks: 24, seeRawMarks: 58 },
      { code: '22CS602', name: 'Cloud Computing & Virtualization', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 35, ciaMarks: 27, seeRawMarks: 66 },
      { code: '22CS603', name: 'Cryptography & Network Security', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: 33, ciaMarks: 26, seeRawMarks: 62 },
      { code: '22CS604', name: 'Full-Stack Web Architecture', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 36, ciaMarks: 28, seeRawMarks: 70 },
      { code: '22CS605', name: 'Data Science & Big Data Analytics', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: 32, ciaMarks: 25, seeRawMarks: 64 },
      { code: '22CSL66', name: 'Cloud & Network Security Lab', credits: 2, hasSEE: true, hasMSE: false, mseRawMarks: null, ciaMarks: 52, internalDirectMarks: 52, seeRawMarks: 68 },
      { code: '22TKS67', name: 'Technical Seminar & Paper Presentation', credits: 1, hasSEE: false, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: 88, seeRawMarks: null },
      { code: '22INT68', name: 'Innovation & Technical Entrepreneurship', credits: 0, hasSEE: true, hasMSE: true, mseRawMarks: 31, ciaMarks: 24, seeRawMarks: 60 },
    ],

    // Semester 7 (4th Year) - NO DATA, ALL MARKS NULL
    7: [
      { code: '22CS701', name: 'Deep Learning & Neural Architectures', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CS702', name: 'Internet of Things & Embedded Systems', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CS703', name: 'High Performance Computing', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CSO74', name: 'Open Elective - Renewable Energy & Grids', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CSE75', name: 'Professional Elective - Cyber Forensics', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CSL76', name: 'Deep Learning & AI Laboratory', credits: 2, hasSEE: true, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: null, seeRawMarks: null },
      { code: '22PRJ77', name: 'Major Project Phase-I', credits: 1, hasSEE: false, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: null, seeRawMarks: null },
      { code: '22INT78', name: 'Industrial Internship / Summer Training', credits: 0, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
    ],

    // Semester 8 (4th Year) - NO DATA, ALL MARKS NULL
    8: [
      { code: '22CS801', name: 'Distributed Systems & Blockchain', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CS802', name: 'DevSecOps & Site Reliability Engineering', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CS803', name: 'Quantum Computing & Future Technologies', credits: 4, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CSO84', name: 'Open Elective - FinTech & Algorithms', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22CSE85', name: 'Professional Elective - Natural Language NLP', credits: 3, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
      { code: '22PRJ86', name: 'Major Project Phase-II & Capstone', credits: 2, hasSEE: true, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: null, seeRawMarks: null },
      { code: '22SEM87', name: 'Technical Seminar & Final Defense', credits: 1, hasSEE: false, hasMSE: false, mseRawMarks: null, ciaMarks: null, internalDirectMarks: null, seeRawMarks: null },
      { code: '22ETH88', name: 'Professional Ethics & Cyber Law', credits: 0, hasSEE: true, hasMSE: true, mseRawMarks: null, ciaMarks: null, seeRawMarks: null },
    ],
  };

  const selectedList = semesterConfigs[semNum] || semesterConfigs[5];
  const isFourthYear = semNum >= 7;

  return selectedList.map((item, index) => {
    return {
      id: `sem-${semNum}-sub-${index + 1}`,
      code: item.code,
      name: item.name,
      credits: item.credits,
      hasSEE: item.hasSEE,
      hasMSE: item.hasMSE,
      mseMaxScale: item.mseMaxScale ?? 30,
      mseRawMarks: item.mseRawMarks,
      ciaMarks: item.ciaMarks,
      internalDirectMarks: item.internalDirectMarks ?? null,
      seeRawMarks: item.seeRawMarks,
      favouredGrade: index < 3 ? 'O' : 'A+',
      modules: createDefaultModules(!isFourthYear),
    };
  });
}

export function createEmptySemesterSubjects(semNum: number): Subject[] {
  // Brand new student accounts: 4 clean starter subjects titled "Subject 1", "Subject 2", "Subject 3", "Subject 4".
  // Completely empty marks (null) and no preloaded course names/data.
  return [
    {
      id: `sem-${semNum}-sub-1`,
      code: 'SUB 1',
      name: 'Subject 1',
      credits: 4,
      hasSEE: true,
      hasMSE: true,
      mseMaxScale: 30,
      mseRawMarks: null,
      ciaMarks: null,
      internalDirectMarks: null,
      seeRawMarks: null,
      favouredGrade: 'O',
      modules: createDefaultModules(false, true),
    },
    {
      id: `sem-${semNum}-sub-2`,
      code: 'SUB 2',
      name: 'Subject 2',
      credits: 4,
      hasSEE: true,
      hasMSE: true,
      mseMaxScale: 30,
      mseRawMarks: null,
      ciaMarks: null,
      internalDirectMarks: null,
      seeRawMarks: null,
      favouredGrade: 'O',
      modules: createDefaultModules(false, true),
    },
    {
      id: `sem-${semNum}-sub-3`,
      code: 'SUB 3',
      name: 'Subject 3',
      credits: 3,
      hasSEE: true,
      hasMSE: true,
      mseMaxScale: 30,
      mseRawMarks: null,
      ciaMarks: null,
      internalDirectMarks: null,
      seeRawMarks: null,
      favouredGrade: 'A+',
      modules: createDefaultModules(false, true),
    },
    {
      id: `sem-${semNum}-sub-4`,
      code: 'SUB 4',
      name: 'Subject 4',
      credits: 3,
      hasSEE: true,
      hasMSE: true,
      mseMaxScale: 30,
      mseRawMarks: null,
      ciaMarks: null,
      internalDirectMarks: null,
      seeRawMarks: null,
      favouredGrade: 'A+',
      modules: createDefaultModules(false, true),
    },
  ];
}

export function createDefaultSemesters(): Semester[] {
  const semesters: Semester[] = [];
  for (let i = 1; i <= 8; i++) {
    semesters.push({
      semNumber: i,
      title: `Semester ${i}`,
      academicYear: i <= 2 ? '1st Year' : i <= 4 ? '2nd Year' : i <= 6 ? '3rd Year' : '4th Year',
      subjects: createDefaultSemesterSubjects(i),
      isCompleted: i < 5,
    });
  }
  return semesters;
}

export function createEmptySemesters(): Semester[] {
  const semesters: Semester[] = [];
  for (let i = 1; i <= 8; i++) {
    semesters.push({
      semNumber: i,
      title: `Semester ${i}`,
      academicYear: i <= 2 ? '1st Year' : i <= 4 ? '2nd Year' : i <= 6 ? '3rd Year' : '4th Year',
      subjects: createEmptySemesterSubjects(i),
      isCompleted: false,
    });
  }
  return semesters;
}

const GUEST_STORAGE_KEY = 'marksboard_guest_profile_v2';
const STORAGE_KEY_PREFIX = 'marksboard_user_';
const ACTIVE_USER_KEY = 'marksboard_active_usn_v2';

export function getOrCreateGuestProfile(): StudentProfile {
  try {
    const existing = localStorage.getItem(GUEST_STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed.name === 'string' && /^Guest\d{4}$/.test(parsed.name)) {
        return parsed;
      }
    }
  } catch {}

  const random4Digit = Math.floor(1000 + Math.random() * 9000);
  const guestProfile: StudentProfile = {
    usn: `1DS22CS${random4Digit}`,
    name: `Guest${random4Digit}`,
    password: 'guest',
    college: 'Dayananda Sagar University',
    branch: 'Computer Science and Engineering',
    avatar: '👾',
    bio: 'Guest Student Explorer 😎',
    targetCGPA: 9.0,
    currentSemester: 5,
    isGuest: true,
    semesters: createDefaultSemesters(),
  };

  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestProfile));
  } catch {}

  return guestProfile;
}

export function getActiveUSN(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    return saved || 'GUEST';
  } catch {
    return 'GUEST';
  }
}

export function setActiveUSN(usn: string): void {
  try {
    localStorage.setItem(ACTIVE_USER_KEY, usn);
  } catch (err) {
    console.error('Error saving active USN', err);
  }
}

export function findStudentProfile(usn: string): StudentProfile | null {
  if (!usn || !usn.trim()) return null;
  const clean = usn.trim().toUpperCase();
  if (clean === 'GUEST') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + clean);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.usn) {
        return JSON.parse(JSON.stringify(parsed));
      }
    }
  } catch (err) {
    console.error('Failed to find student profile from localStorage', err);
  }
  return null;
}

export function loadStudentProfile(usn?: string): StudentProfile {
  const targetUSN = (usn || getActiveUSN()).trim().toUpperCase();

  // If target is GUEST, return fresh copy of guest profile
  if (!targetUSN || targetUSN === 'GUEST') {
    return getOrCreateGuestProfile();
  }

  const existing = findStudentProfile(targetUSN);
  if (existing) {
    return existing;
  }

  // Fallback to guest if account not found
  return getOrCreateGuestProfile();
}

export function saveStudentProfile(profile: StudentProfile): void {
  try {
    if (profile.isGuest) {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
      setActiveUSN('GUEST');
    } else {
      const cleanUSN = profile.usn.trim().toUpperCase();
      localStorage.setItem(STORAGE_KEY_PREFIX + cleanUSN, JSON.stringify(profile));
      setActiveUSN(cleanUSN);
    }
  } catch (err) {
    console.error('Failed to save profile to localStorage', err);
  }
}

export function getAvailableAccounts(): { usn: string; name: string; avatar: string; college: string; isGuest?: boolean }[] {
  const accounts: { usn: string; name: string; avatar: string; college: string; isGuest?: boolean }[] = [];
  const seenUSNs = new Set<string>();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            const upperUSN = (parsed.usn || '').trim().toUpperCase();
            if (upperUSN && upperUSN !== 'GUEST' && !seenUSNs.has(upperUSN)) {
              seenUSNs.add(upperUSN);
              accounts.push({
                usn: upperUSN,
                name: parsed.name,
                avatar: parsed.avatar || '👨‍💻',
                college: parsed.college || 'Dayananda Sagar University',
                isGuest: false,
              });
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('Failed to list accounts', err);
  }

  return accounts;
}

export function deleteSavedAccount(usn: string): void {
  try {
    const cleanUSN = usn.trim().toUpperCase();
    localStorage.removeItem(STORAGE_KEY_PREFIX + cleanUSN);
    const active = getActiveUSN();
    if (active.trim().toUpperCase() === cleanUSN) {
      setActiveUSN('GUEST');
    }
  } catch (err) {
    console.error('Failed to remove account from localStorage', err);
  }
}

export async function findStudentProfileAsync(usn: string): Promise<StudentProfile | null> {
  if (!usn || !usn.trim()) return null;
  const clean = usn.trim().toUpperCase();
  if (clean === 'GUEST') return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('usn', clean)
        .maybeSingle();

      if (error) {
        console.error('Supabase profile fetch error:', error);
        throw new Error(error.message);
      }

      if (data) {
        const profile: StudentProfile = {
          usn: data.usn,
          name: data.name,
          password: data.password,
          college: data.college || 'Dayananda Sagar University',
          branch: data.branch || 'Computer Science and Engineering',
          avatar: data.avatar || '👨‍💻',
          bio: data.bio || 'Engineering Student 🚀',
          targetCGPA: Number(data.target_cgpa) || 9.0,
          currentSemester: Number(data.current_semester) || 5,
          semesters: data.semesters,
          isGuest: false,
        };
        // Cache to localStorage
        saveStudentProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('Supabase profile fetch error, checking local storage', err);
      const local = findStudentProfile(clean);
      if (local) return local;
      throw err;
    }
  }

  return findStudentProfile(clean);
}

export async function saveStudentProfileAsync(profile: StudentProfile): Promise<void> {
  // Always save to localStorage first for instant response
  saveStudentProfile(profile);

  if (isSupabaseConfigured && supabase && !profile.isGuest) {
    try {
      const cleanUSN = profile.usn.trim().toUpperCase();
      const { error } = await supabase.from('student_profiles').upsert({
        usn: cleanUSN,
        name: profile.name,
        password: profile.password || '',
        college: profile.college,
        branch: profile.branch,
        avatar: profile.avatar,
        bio: profile.bio,
        target_cgpa: profile.targetCGPA,
        current_semester: profile.currentSemester,
        semesters: profile.semesters,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error('Supabase upsert error:', error);
        throw new Error(error.message || 'Failed to save to Supabase cloud');
      }
    } catch (err) {
      console.error('Failed to sync profile to Supabase', err);
      throw err;
    }
  }
}

export async function deleteSavedAccountAsync(usn: string): Promise<void> {
  deleteSavedAccount(usn);

  if (isSupabaseConfigured && supabase) {
    try {
      const cleanUSN = usn.trim().toUpperCase();
      await supabase.from('student_profiles').delete().eq('usn', cleanUSN);
    } catch (err) {
      console.error('Failed to delete profile from Supabase', err);
    }
  }
}

export async function getAvailableAccountsAsync(): Promise<{ usn: string; name: string; avatar: string; college: string; isGuest?: boolean }[]> {
  const localAccounts = getAvailableAccounts();
  const seenUSNs = new Set<string>(localAccounts.map((a) => a.usn));

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('usn, name, avatar, college')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const merged = [...localAccounts];
        data.forEach((row) => {
          const upper = (row.usn || '').trim().toUpperCase();
          if (upper && !seenUSNs.has(upper)) {
            seenUSNs.add(upper);
            merged.push({
              usn: upper,
              name: row.name,
              avatar: row.avatar || '👨‍💻',
              college: row.college || 'Dayananda Sagar University',
              isGuest: false,
            });
          }
        });
        return merged;
      }
    } catch (err) {
      console.warn('Failed to load accounts from Supabase, returning local', err);
    }
  }

  return localAccounts;
}

export async function getAdminAccountsListAsync(): Promise<{
  isCloud: boolean;
  totalCount: number;
  accounts: { usn: string; name: string; branch?: string; currentSemester?: number; createdAt?: string }[];
  errorMessage?: string;
}> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('usn, name, branch, current_semester, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin accounts list from Supabase:', error);
        const local = getAvailableAccounts();
        return {
          isCloud: false,
          totalCount: local.length,
          accounts: local.map((l) => ({
            usn: l.usn,
            name: l.name,
          })),
          errorMessage: error.message || error.hint || 'Database table error',
        };
      }

      if (Array.isArray(data)) {
        return {
          isCloud: true,
          totalCount: data.length,
          accounts: data.map((d) => ({
            usn: d.usn,
            name: d.name,
            branch: d.branch,
            currentSemester: d.current_semester,
            createdAt: d.created_at,
          })),
        };
      }
    } catch (err: any) {
      console.error('Error fetching admin accounts list from Supabase', err);
      const local = getAvailableAccounts();
      return {
        isCloud: false,
        totalCount: local.length,
        accounts: local.map((l) => ({
          usn: l.usn,
          name: l.name,
        })),
        errorMessage: err?.message || 'Connection error',
      };
    }
  }

  // Fallback to local accounts
  const local = getAvailableAccounts();
  return {
    isCloud: false,
    totalCount: local.length,
    accounts: local.map((l) => ({
      usn: l.usn,
      name: l.name,
    })),
  };
}
