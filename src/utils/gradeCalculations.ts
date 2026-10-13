import type {
  AffordToLoseResult,
  CalculatedSubjectMarks,
  GradeThreshold,
  LetterGrade,
  SEEPrediction,
  Semester,
  SemesterResult,
  SpecialGrade,
  Subject,
} from '../types';

export const DSU_GRADE_THRESHOLDS: GradeThreshold[] = [
  { grade: 'O', minMarks: 90, maxMarks: 100, gradePoint: 10, description: 'Outstanding', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { grade: 'A+', minMarks: 80, maxMarks: 89.99, gradePoint: 9, description: 'Excellent', badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { grade: 'A', minMarks: 70, maxMarks: 79.99, gradePoint: 8, description: 'Very Good', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { grade: 'B+', minMarks: 60, maxMarks: 69.99, gradePoint: 7, description: 'Good', badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { grade: 'B', minMarks: 55, maxMarks: 59.99, gradePoint: 6, description: 'Above Average', badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { grade: 'C', minMarks: 50, maxMarks: 54.99, gradePoint: 5, description: 'Average', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { grade: 'P', minMarks: 40, maxMarks: 49.99, gradePoint: 4, description: 'Pass', badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { grade: 'F', minMarks: 0, maxMarks: 39.99, gradePoint: 0, description: 'Fail', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
];

export const DSU_SPECIAL_GRADES: SpecialGrade[] = [
  { grade: 'AP', gradePoint: '-', description: 'Audit Pass (Non-Credit Cleared)', percentageMarks: '≥ 40%', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { grade: 'AF', gradePoint: '-', description: 'Audit Fail (Non-Credit Unsuccessful)', percentageMarks: '< 40%', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { grade: 'IC', gradePoint: '-', description: 'In Complete', percentageMarks: '-', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { grade: 'NE', gradePoint: '-', description: 'Not Eligible (Attendance/CIE Shortage)', percentageMarks: '-', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { grade: 'W', gradePoint: '-', description: 'Withdrawn', percentageMarks: '-', badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
];

export function getGradeFromMarks(marks: number): { grade: LetterGrade; gradePoint: number; threshold: GradeThreshold } {
  const rounded = Math.round(marks * 100) / 100;
  for (const t of DSU_GRADE_THRESHOLDS) {
    if (rounded >= t.minMarks) {
      return { grade: t.grade, gradePoint: t.gradePoint, threshold: t };
    }
  }
  const last = DSU_GRADE_THRESHOLDS[DSU_GRADE_THRESHOLDS.length - 1];
  return { grade: last.grade, gradePoint: last.gradePoint, threshold: last };
}

export function calculateSubjectMarks(subject: Subject): CalculatedSubjectMarks {
  const mseMaxScale = subject.mseMaxScale === 20 ? 20 : 30;
  let mseScaled = 0;
  let ciaScaled = 0;
  let totalInternals = 0;
  let seeScaled = 0;
  let ciaMax = 30;

  if (subject.hasSEE) {
    // Total Internals = 60 (MSE + CIA), Externals = 40 (SEE converted from 80)
    if (subject.hasMSE) {
      const rawMSE = subject.mseRawMarks ?? 0;
      if (mseMaxScale === 20) {
        // Converted to max 20 marks: (rawMSE / 40) * 20 = rawMSE / 2
        mseScaled = Math.min(20, Math.max(0, (rawMSE / 40) * 20));
        ciaMax = 40; // 20 MSE + 40 CIA = 60 Internals
      } else {
        // Standard: Converted to max 30 marks: (rawMSE / 40) * 30
        mseScaled = Math.min(30, Math.max(0, (rawMSE / 40) * 30));
        ciaMax = 30; // 30 MSE + 30 CIA = 60 Internals
      }
      ciaScaled = Math.min(ciaMax, Math.max(0, subject.ciaMarks ?? 0));
      totalInternals = mseScaled + ciaScaled;
    } else {
      // No MSE, internals out of 60
      ciaMax = 60;
      totalInternals = Math.min(60, Math.max(0, subject.ciaMarks ?? subject.internalDirectMarks ?? 0));
      ciaScaled = totalInternals;
      mseScaled = 0;
    }

    const rawSEE = subject.seeRawMarks ?? 0;
    seeScaled = Math.min(40, Math.max(0, rawSEE / 2));
  } else {
    // 100% Internals, no SEE exam
    if (subject.hasMSE) {
      const rawMSE = subject.mseRawMarks ?? 0;
      if (mseMaxScale === 20) {
        mseScaled = Math.min(20, Math.max(0, (rawMSE / 40) * 20));
        ciaMax = 80;
        ciaScaled = Math.min(80, Math.max(0, subject.ciaMarks ?? 0));
      } else {
        mseScaled = Math.min(30, Math.max(0, (rawMSE / 40) * 30));
        ciaMax = 70;
        ciaScaled = Math.min(70, Math.max(0, subject.ciaMarks ?? 0));
      }
      totalInternals = mseScaled + ciaScaled;
    } else {
      ciaMax = 100;
      totalInternals = Math.min(100, Math.max(0, subject.internalDirectMarks ?? subject.ciaMarks ?? 0));
      ciaScaled = totalInternals;
      mseScaled = 0;
    }
    seeScaled = 0;
  }

  const totalMarks = Math.round((totalInternals + seeScaled) * 100) / 100;
  const isExternalPassed = !subject.hasSEE || (subject.seeRawMarks === null || subject.seeRawMarks >= 28);
  const passed = totalMarks >= 40 && isExternalPassed;
  const { grade, gradePoint } = getGradeFromMarks(totalMarks);

  // If 0-credit course, it is an Audit Course: AP (Audit Pass) or AF (Audit Fail)
  let finalGrade: LetterGrade = passed ? grade : 'F';
  let finalGradePoint = passed ? gradePoint : 0;

  if (subject.credits === 0) {
    finalGrade = passed ? 'AP' : 'AF';
    finalGradePoint = 0; // Audit courses carry no grade points in CBCS
  }

  return {
    mseScaled: Math.round(mseScaled * 10) / 10,
    ciaScaled: Math.round(ciaScaled * 10) / 10,
    totalInternals: Math.round(totalInternals * 10) / 10,
    seeScaled: Math.round(seeScaled * 10) / 10,
    totalMarks,
    grade: finalGrade,
    gradePoint: finalGradePoint,
    passed,
    creditPoints: subject.credits * finalGradePoint,
    isExternalPassed,
    mseMaxScale,
    ciaMax,
  };
}

export function calculateSemesterResult(subjects: Subject[]): SemesterResult {
  let totalCredits = 0;
  let earnedCredits = 0;
  let totalGradePoints = 0;
  let passedSubjects = 0;
  let hasBacklogs = false;

  for (const sub of subjects) {
    const calc = calculateSubjectMarks(sub);
    
    // Only courses with credits > 0 count into SGPA credit denominator
    if (sub.credits > 0) {
      totalCredits += sub.credits;
      if (calc.passed) {
        earnedCredits += sub.credits;
      }
      totalGradePoints += sub.credits * calc.gradePoint;
    }

    if (calc.passed) {
      passedSubjects++;
    } else {
      hasBacklogs = true;
    }
  }

  const sgpa = totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;
  // Standard university percentage conversion: SGPA * 10 (or (SGPA - 0.75) * 10 depending on VTU/DSU)
  const percentage = Math.round(sgpa * 10 * 10) / 10;

  // Gen-Z vibe status badge
  let statusBadge = {
    label: 'COOKING 🔥',
    color: 'from-amber-500 to-orange-500 text-amber-200 border-amber-500/30',
    tagline: 'Solid grind, keep pushing!',
  };

  if (sgpa >= 9.0) {
    statusBadge = {
      label: 'ACADEMIC WEAPON ⚡',
      color: 'from-fuchsia-500 to-purple-600 text-fuchsia-200 border-fuchsia-500/30',
      tagline: 'Untouchable aura! Absolute 10/10 demon!',
    };
  } else if (sgpa >= 8.0) {
    statusBadge = {
      label: 'TOP TIER VIBES 🚀',
      color: 'from-cyan-500 to-blue-600 text-cyan-200 border-cyan-500/30',
      tagline: 'Big brain energy. Keep this streak alive!',
    };
  } else if (sgpa >= 7.0) {
    statusBadge = {
      label: 'WE ARE COOKING 📈',
      color: 'from-emerald-500 to-teal-600 text-emerald-200 border-emerald-500/30',
      tagline: 'Above average, safely in the green zone!',
    };
  } else if (sgpa >= 6.0) {
    statusBadge = {
      label: 'WE MOVE 🤙',
      color: 'from-yellow-500 to-amber-600 text-yellow-200 border-yellow-500/30',
      tagline: 'Passing through! A little boost and you fly!',
    };
  } else {
    statusBadge = {
      label: 'TIME TO LOCK IN 🔒',
      color: 'from-rose-500 to-red-600 text-rose-200 border-rose-500/30',
      tagline: 'Put the phone down, clutch semester starts now.',
    };
  }

  return {
    totalCredits,
    earnedCredits,
    totalGradePoints,
    sgpa,
    percentage,
    totalSubjects: subjects.length,
    passedSubjects,
    hasBacklogs,
    statusBadge,
  };
}

export function calculateCGPA(semesters: Semester[]): { cgpa: number; totalCredits: number; percentage: number } {
  let totalCreditsAll = 0;
  let totalGradePointsAll = 0;

  for (const sem of semesters) {
    // Only include semesters that have at least one subject with entered marks
    const hasAnyMarks = sem.subjects.some(
      (s) => s.mseRawMarks !== null || s.ciaMarks !== null || s.seeRawMarks !== null || s.internalDirectMarks !== null
    );

    if (hasAnyMarks) {
      const res = calculateSemesterResult(sem.subjects);
      if (res.totalCredits > 0) {
        totalCreditsAll += res.totalCredits;
        totalGradePointsAll += res.totalGradePoints;
      }
    }
  }

  const cgpa = totalCreditsAll > 0 ? Math.round((totalGradePointsAll / totalCreditsAll) * 100) / 100 : 0;
  const percentage = Math.round(cgpa * 10 * 10) / 10;

  return {
    cgpa,
    totalCredits: totalCreditsAll,
    percentage,
  };
}

export function isSemesterComplete(sem: Semester): boolean {
  if (sem.isCompleted) return true;
  // A semester is completed if all subjects with credits > 0 have final marks entered
  const gradedSubjects = sem.subjects.filter((s) => s.credits > 0);
  if (gradedSubjects.length === 0) return false;
  return gradedSubjects.every((s) => {
    if (s.hasSEE) {
      const internalsDone = s.hasMSE
        ? s.mseRawMarks !== null && s.ciaMarks !== null
        : (s.ciaMarks !== null || s.internalDirectMarks !== null);
      const externalsDone = s.seeRawMarks !== null;
      return internalsDone && externalsDone;
    } else {
      return s.internalDirectMarks !== null || (s.mseRawMarks !== null && s.ciaMarks !== null);
    }
  });
}

export function getPreviousSemestersProgress(semesters: Semester[], activeSemNum: number) {
  const previousSemesters = semesters.filter((s) => s.semNumber < activeSemNum);
  const total = previousSemesters.length;
  const completed = previousSemesters.filter(isSemesterComplete).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 100;
  return {
    previousSemesters,
    total,
    completed,
    percent,
    isComplete: total === 0 || completed === total,
  };
}

/**
 * Predict SEE marks based on MSE score:
 * MSE covers ~2 to 2.5 modules (20 marks per module, max 40).
 * SEE covers all 5 modules (16 marks each, max 80).
 */
export function predictSEEMarks(subject: Subject, prepBoostPercent: number = 0): SEEPrediction {
  const mseRaw = subject.mseRawMarks ?? 0;
  const mseFraction = Math.min(1, Math.max(0, mseRaw / 40));
  
  // Baseline prediction: extrapolate MSE mastery to SEE 80
  let predictedRawSEE = Math.round(mseFraction * 80);
  
  // Apply study/prep booster (e.g. +10% if student intends to clutch)
  if (prepBoostPercent !== 0) {
    predictedRawSEE = Math.min(80, Math.max(0, Math.round(predictedRawSEE * (1 + prepBoostPercent / 100))));
  }

  const predictedScaledSEE = Math.round((predictedRawSEE / 2) * 10) / 10;
  const currentInternals = calculateSubjectMarks(subject).totalInternals;
  const predictedTotalMarks = Math.min(100, Math.round((currentInternals + predictedScaledSEE) * 10) / 10);
  const { grade, gradePoint } = getGradeFromMarks(predictedTotalMarks);

  let confidence: 'High' | 'Moderate' | 'Provisional' = 'Moderate';
  let rationale = `Based on your MSE of ${mseRaw}/40 across Modules 1-2, your concept conversion rate is ${(mseFraction * 100).toFixed(0)}%. Extrapolating to all 5 modules (16 marks each) gives an estimated ${predictedRawSEE}/80.`;

  if (subject.mseRawMarks === null) {
    confidence = 'Provisional';
    rationale = 'MSE marks not entered yet! Using default 75% baseline assumption.';
  } else if (subject.mseRawMarks >= 32) {
    confidence = 'High';
    rationale = `Demonstrated high mastery (${mseRaw}/40) in early modules! On track for ${predictedRawSEE}/80 in SEE.`;
  }

  return {
    predictedRawSEE,
    predictedScaledSEE,
    predictedTotalMarks,
    predictedGrade: grade,
    predictedGradePoint: gradePoint,
    confidence,
    rationale,
  };
}

/**
 * How much marks can the student afford to lose in SEE for their favoured grade?
 * Target Grade min marks - Current Internals = Required Scaled SEE.
 * Required Raw SEE = Required Scaled SEE * 2.
 * Can afford to lose = 80 - Required Raw SEE.
 */
export function calculateAffordToLose(subject: Subject, targetGrade: LetterGrade): AffordToLoseResult {
  const targetThreshold = DSU_GRADE_THRESHOLDS.find((t) => t.grade === targetGrade) || DSU_GRADE_THRESHOLDS[0];
  const targetMinMarks = targetThreshold.minMarks;

  const currentInternals = calculateSubjectMarks(subject).totalInternals; // Max 60 (or 100)
  
  if (!subject.hasSEE) {
    const isAchieved = currentInternals >= targetMinMarks;
    return {
      targetGrade,
      targetMinMarks,
      currentInternals,
      requiredScaledSEE: 0,
      requiredRawSEE: 0,
      canAffordToLoseOutOf80: 0,
      isAchievable: isAchieved,
      statusMessage: isAchieved
        ? `You already secured ${targetGrade} with ${currentInternals}/100 internal marks! 🎉`
        : `Subject has no SEE! Internals stand at ${currentInternals}/100. Target was ${targetMinMarks}.`,
      vibeTag: isAchieved ? 'GRADE SECURED 🏆' : 'INTERNALS SEALED 🔒',
      riskLevel: isAchieved ? 'Super Safe 🛡️' : 'Mission Impossible 💀',
    };
  }

  const requiredScaledSEE = Math.max(0, targetMinMarks - currentInternals);
  const requiredRawSEE = Math.ceil(requiredScaledSEE * 2);

  // If requiredRawSEE > 80, student cannot achieve targetGrade even with 80/80 SEE
  if (requiredRawSEE > 80) {
    const maxPossibleTotal = currentInternals + 40;
    const { grade: bestPossibleGrade } = getGradeFromMarks(maxPossibleTotal);

    return {
      targetGrade,
      targetMinMarks,
      currentInternals,
      requiredScaledSEE,
      requiredRawSEE,
      canAffordToLoseOutOf80: 0,
      isAchievable: false,
      statusMessage: `Even with a perfect 80/80 in SEE, your maximum score is ${maxPossibleTotal}/100. Target ${targetGrade} needs ${targetMinMarks}. Best achievable grade: ${bestPossibleGrade} ✨`,
      vibeTag: 'GO FOR ' + bestPossibleGrade + ' INSTEAD 🎯',
      riskLevel: 'Mission Impossible 💀',
    };
  }

  // Passing threshold requires at least 28 out of 80 in SEE!
  const effectiveMinRawSEE = Math.max(requiredRawSEE, 28);
  const canAffordToLoseOutOf80 = Math.max(0, 80 - effectiveMinRawSEE);

  let riskLevel: AffordToLoseResult['riskLevel'] = 'Comfortable 😎';
  let vibeTag = 'CHILL VIBES 😎';

  if (canAffordToLoseOutOf80 >= 35) {
    riskLevel = 'Super Safe 🛡️';
    vibeTag = 'MASSIVE BUFFER 🛡️';
  } else if (canAffordToLoseOutOf80 >= 20) {
    riskLevel = 'Comfortable 😎';
    vibeTag = 'EASY MONEY 🤙';
  } else if (canAffordToLoseOutOf80 >= 10) {
    riskLevel = 'Clutch Needed ⚡';
    vibeTag = 'CONCENTRATE & CLUTCH ⚡';
  } else if (canAffordToLoseOutOf80 > 0) {
    riskLevel = 'Extreme Grind 🚨';
    vibeTag = 'HIGH STAKES 🎯';
  } else {
    riskLevel = 'Extreme Grind 🚨';
    vibeTag = 'NEED FULL 80/80 💀';
  }

  const statusMessage =
    canAffordToLoseOutOf80 > 0
      ? `You need ${effectiveMinRawSEE}/80 in SEE to secure ${targetGrade}. You have a generous cushion of ${canAffordToLoseOutOf80} marks to lose! 🛡️`
      : `You need a full ${effectiveMinRawSEE}/80 in SEE to touch ${targetGrade}. Zero room for errors! ⚡`;

  return {
    targetGrade,
    targetMinMarks,
    currentInternals,
    requiredScaledSEE,
    requiredRawSEE: effectiveMinRawSEE,
    canAffordToLoseOutOf80,
    isAchievable: true,
    statusMessage,
    vibeTag,
    riskLevel,
  };
}
