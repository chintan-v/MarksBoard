import type { CalendarHoliday, DayOfWeek, Subject, TimetableSlot } from '../types';

const GEMINI_KEY_STORAGE = 'marksboard_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  try {
    const local = localStorage.getItem(GEMINI_KEY_STORAGE);
    if (local && local.trim()) return local.trim();
  } catch {}
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } else {
      localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    }
  } catch (err) {
    console.error('Failed to save Gemini API key to localStorage', err);
  }
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getStoredGeminiApiKey());
}

export interface AIExtractionResult {
  startDate: string;
  endDate: string;
  workingDays: DayOfWeek[];
  holidays: CalendarHoliday[];
  timetable: TimetableSlot[];
  summary: string;
  calendarNotes?: string;
  modelUsed?: string;
  theoryCount?: number;
  practicalCount?: number;
}

interface FileData {
  mimeType: string;
  base64: string;
}

function parseDataUrl(dataUrl: string, fileName?: string): FileData | null {
  try {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    let mimeType = mimeMatch ? mimeMatch[1] : '';

    // If mimeType is missing or generic octet-stream, infer from filename or base64 signature
    if (!mimeType || mimeType === 'application/octet-stream') {
      const lowerName = (fileName || '').toLowerCase();
      if (lowerName.endsWith('.pdf') || base64.startsWith('JVBERi0')) {
        mimeType = 'application/pdf';
      } else if (lowerName.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (lowerName.endsWith('.webp')) {
        mimeType = 'image/webp';
      } else {
        mimeType = base64.startsWith('JVBERi0') ? 'application/pdf' : 'image/png';
      }
    }
    return { mimeType, base64 };
  } catch {
    return null;
  }
}

/**
 * Score and sort Gemini models so we prefer fast, multimodal Flash models.
 */
function scoreModel(name: string): number {
  let score = 0;
  const lower = name.toLowerCase();

  // Primary preference: gemini models
  if (lower.includes('gemini')) score += 100;

  // Flash models are ideal for student multimodal document extraction (fast + generous limits)
  if (lower.includes('flash')) score += 50;

  // Newer generation preference
  if (lower.includes('2.5')) score += 40;
  else if (lower.includes('2.0')) score += 30;
  else if (lower.includes('1.5')) score += 20;

  // Latest aliases are preferred
  if (lower.includes('latest')) score += 15;

  // Stable over preview/exp, though preview/exp are still scored
  if (lower.includes('exp') || lower.includes('preview')) score -= 5;

  // Pro models are slower but capable
  if (lower.includes('pro')) score += 25;

  return score;
}

interface ModelCandidate {
  model: string;
  apiVersion: 'v1beta' | 'v1';
}

/**
 * Dynamically queries Google AI Studio's ListModels endpoint to get the exact list of
 * available models supported for generateContent with the user's specific API key.
 */
async function discoverSupportedModels(apiKey: string): Promise<ModelCandidate[]> {
  const discovered: ModelCandidate[] = [];
  const versions: Array<'v1beta' | 'v1'> = ['v1beta', 'v1'];

  for (const ver of versions) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data?.models)) {
        for (const m of data.models) {
          const methods = m.supportedGenerationMethods;
          if (Array.isArray(methods) && methods.includes('generateContent')) {
            const cleanName = (m.name || '').replace(/^models\//, '');
            if (cleanName && !discovered.some((d) => d.model === cleanName)) {
              discovered.push({ model: cleanName, apiVersion: ver });
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Model discovery via ${ver} skipped:`, err);
    }
  }

  // Sort discovered models by preference score
  discovered.sort((a, b) => scoreModel(b.model) - scoreModel(a.model));
  return discovered;
}

/**
 * Standard fallback candidate models to try in order if ListModels was unavailable
 */
const FALLBACK_CANDIDATES: ModelCandidate[] = [
  { model: 'gemini-2.5-flash', apiVersion: 'v1beta' },
  { model: 'gemini-2.0-flash', apiVersion: 'v1beta' },
  { model: 'gemini-1.5-flash-latest', apiVersion: 'v1beta' },
  { model: 'gemini-flash-latest', apiVersion: 'v1beta' },
  { model: 'gemini-2.0-flash-exp', apiVersion: 'v1beta' },
  { model: 'gemini-1.5-flash', apiVersion: 'v1' },
  { model: 'gemini-1.5-flash-002', apiVersion: 'v1beta' },
  { model: 'gemini-1.5-flash-001', apiVersion: 'v1beta' },
  { model: 'gemini-1.5-flash', apiVersion: 'v1beta' },
  { model: 'gemini-1.5-pro-latest', apiVersion: 'v1beta' },
  { model: 'gemini-2.5-pro', apiVersion: 'v1beta' },
  { model: 'gemini-pro', apiVersion: 'v1' },
];

/**
 * Cleans markdown code blocks (```json ... ```) or free-form text around JSON
 * and parses it safely.
 */
function cleanAndParseJSON(rawText: string): any {
  let cleaned = rawText.trim();

  // Strip markdown code fences if wrapped entirely
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // If text has embedded markdown fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // Extract from the first '{' to the last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * Normalizes any date string (YYYY-MM-DD or YYYY-M-D or Date string) to YYYY-MM-DD.
 */
function normalizeDateString(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const year = m[1];
    const month = m[2].padStart(2, '0');
    const day = m[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Fuzzy matches a subject reference from AI to an existing registered subject
 */
function resolveSubjectId(rawVal: string, subjects: Subject[]): string | null {
  if (!rawVal || !subjects || subjects.length === 0) return null;
  const clean = rawVal.trim().toLowerCase();

  // 1. Direct match on id
  const directId = subjects.find((s) => s.id === rawVal.trim());
  if (directId) return directId.id;

  // 2. Direct match on code
  const codeMatch = subjects.find((s) => s.code && s.code.trim().toLowerCase() === clean);
  if (codeMatch) return codeMatch.id;

  // 3. Direct match on subject name
  const nameMatch = subjects.find((s) => s.name && s.name.trim().toLowerCase() === clean);
  if (nameMatch) return nameMatch.id;

  // 4. Substring or code containment match
  const partialMatch = subjects.find((s) => {
    const sName = (s.name || '').toLowerCase();
    const sCode = (s.code || '').toLowerCase();
    return (
      (sCode && clean.includes(sCode)) ||
      (sName && (clean.includes(sName) || sName.includes(clean)))
    );
  });
  if (partialMatch) return partialMatch.id;

  return null;
}

function parseAndSanitizeResponse(
  rawText: string,
  subjects: Subject[],
  modelUsed: string
): AIExtractionResult {
  const parsedJson = cleanAndParseJSON(rawText);

  const currentYear = new Date().getFullYear();
  const defaultStart = `${currentYear}-08-03`;
  const defaultEnd = `${currentYear}-12-18`;

  const parsedStart = normalizeDateString(parsedJson.startDate);
  const parsedEnd = normalizeDateString(parsedJson.endDate);

  const startDate = parsedStart || defaultStart;
  const endDate = parsedEnd || defaultEnd;

  const validDays: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const workingDays: DayOfWeek[] = Array.isArray(parsedJson.workingDays)
    ? (parsedJson.workingDays.filter((d: string) =>
        validDays.includes(d as DayOfWeek)
      ) as DayOfWeek[])
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const holidays: CalendarHoliday[] = Array.isArray(parsedJson.holidays)
    ? parsedJson.holidays
        .map((h: any, idx: number) => {
          const normDate = normalizeDateString(h?.date);
          if (!normDate) return null;
          return {
            id: `ai-hol-${Date.now()}-${idx}`,
            date: normDate,
            title: (h?.title || 'University Holiday').trim(),
          };
        })
        .filter((h: any): h is CalendarHoliday => Boolean(h))
    : [];

  const timetable: TimetableSlot[] = Array.isArray(parsedJson.timetable)
    ? parsedJson.timetable
        .map((t: any, idx: number) => {
          if (!t || !t.day || !validDays.includes(t.day as DayOfWeek)) return null;
          const matchedId = resolveSubjectId(t.matchedSubjectId, subjects);
          if (!matchedId) return null;

          const matchedSub = subjects.find((s) => s.id === matchedId);
          const rawType = String(t.type || '').trim().toLowerCase();
          const rawTime = String(t.slotTime || '').toLowerCase();
          const subText = `${matchedSub?.name || ''} ${matchedSub?.code || ''} ${rawTime} ${t.notes || ''}`.toLowerCase();

          // Robust detection for Lab / Practical slots
          const isLab =
            rawType === 'practical' ||
            rawType === 'lab' ||
            rawType === 'laboratory' ||
            rawType === 'workshop' ||
            subText.includes('lab') ||
            subText.includes('practical') ||
            subText.includes('workshop') ||
            rawTime.includes('2 hour') ||
            rawTime.includes('3 hour') ||
            (matchedSub && matchedSub.credits === 2 && subText.includes('lab'));

          const slotType: 'theory' | 'practical' = isLab ? 'practical' : 'theory';

          return {
            id: `ai-slot-${Date.now()}-${idx}`,
            day: t.day as DayOfWeek,
            subjectId: matchedId,
            slotTime: t.slotTime || (slotType === 'practical' ? '02:00 - 04:00 PM' : '09:00 - 10:00 AM'),
            type: slotType,
          };
        })
        .filter((t: any): t is TimetableSlot => Boolean(t))
    : [];

  const theoryCount = timetable.filter((s) => s.type !== 'practical').length;
  const practicalCount = timetable.filter((s) => s.type === 'practical').length;

  return {
    startDate,
    endDate,
    workingDays: workingDays.length > 0 ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    holidays,
    timetable,
    theoryCount,
    practicalCount,
    summary:
      parsedJson.summary ||
      `AI detected ${timetable.length} classes (${theoryCount} Theory + ${practicalCount} Lab/Practical slots) and ${holidays.length} holidays.`,
    calendarNotes: parsedJson.calendarNotes,
    modelUsed,
  };
}

/**
 * Calls Google Gemini Vision/Document API to read and analyze
 * the Academic Calendar circular and/or Weekly Timetable image/PDF.
 */
export async function analyzeAcademicDocumentsWithAI(options: {
  calendarFileDataUrl?: string;
  calendarFileName?: string;
  timetableFileDataUrl?: string;
  timetableFileName?: string;
  subjects: Subject[];
  semNumber: number;
  apiKey?: string;
}): Promise<AIExtractionResult> {
  const apiKey = (options.apiKey || getStoredGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error(
      'Gemini API Key missing. Please provide your free Gemini API key to enable AI document scanning.'
    );
  }

  const parts: any[] = [];

  const subjectRoster = (options.subjects || []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    credits: s.credits,
  }));

  const promptText = `You are an expert academic schedule analyzer for university engineering students.
Examine the attached document(s) (Academic Calendar circular and/or Weekly Timetable sheet) for Semester ${options.semNumber}.

The student has the following registered subjects in their course list:
${JSON.stringify(subjectRoster, null, 2)}

TASK:
1. ACADEMIC CALENDAR:
   - Identify Semester Start Date (Commencement of classes / instruction) in YYYY-MM-DD format.
   - Identify Semester End Date (Last working day / end of term / practical exam start) in YYYY-MM-DD format.
   - Identify Working Days: Array of active class days (e.g., ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] or including "Saturday").
   - Extract ALL official Holidays, non-instructional days, and festival breaks with exact date (YYYY-MM-DD) and descriptive title.

2. WEEKLY TIMETABLE & LAB/PRACTICAL DETECTION:
   - For every class period in the weekly timetable matrix, map each cell to one of the registered subjects by matching its subject code, abbreviation (e.g., "DLD", "DSA", "DBMS", "OS", "Maths"), or title.
   - CRITICAL REQUIREMENT: YOU MUST CAREFULLY DISTINGUISH BETWEEN THEORY CLASSES AND LAB / PRACTICAL CLASSES!
     * How to recognize PRACTICAL / LAB slots:
       - The slot text contains "LAB", "LABORATORY", "PRACTICAL", "PR", "WORKSHOP", "TUTORIAL", or practical batch codes like "BATCH A", "BATCH B", "B1", "B2", "B3" (e.g., "DSA LAB", "DLD LAB", "PHY LAB", "DBMS LAB", "CS LAB 2").
       - Multi-period continuous sessions: Labs in engineering colleges usually run for 2 or 3 hours (e.g., "02:00 - 04:00 PM", "02:00 - 05:00 PM", "09:00 - 11:00 AM", or spanning 2 consecutive timetable columns).
       - The course itself has 2 or 1 credits, or has "Lab" / "Practical" in its name.
     * For each timetable slot, assign:
       - day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday"
       - matchedSubjectId: exact "id" from the student's subject list above (or subject code if id cannot be determined, or "" if unmatchable/recess/lunch)
       - slotTime: e.g. "09:00 - 10:00 AM" for theory, or "02:00 - 04:00 PM" for lab
       - type: "practical" for laboratory, workshop, or practical sessions; "theory" for regular lecture classes. DO NOT classify lab classes as normal theory classes!

Return ONLY a valid JSON object matching this exact schema:
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "holidays": [
    { "date": "YYYY-MM-DD", "title": "Holiday Name" }
  ],
  "timetable": [
    {
      "day": "Monday",
      "matchedSubjectId": "<subject_id_or_code_from_provided_list>",
      "slotTime": "09:00 - 10:00 AM",
      "type": "theory"
    },
    {
      "day": "Tuesday",
      "matchedSubjectId": "<subject_id_or_code_from_provided_list>",
      "slotTime": "02:00 - 04:00 PM",
      "type": "practical"
    }
  ],
  "summary": "Brief 1-2 sentence overview of what was detected (e.g. 18-week semester, 7 holidays, and 24 weekly classes including 4 lab sessions).",
  "calendarNotes": "Any additional detected dates like mid-term exams or revision week."
}`;

  parts.push({ text: promptText });

  let hasAttachment = false;

  if (options.calendarFileDataUrl) {
    const calFile = parseDataUrl(options.calendarFileDataUrl, options.calendarFileName);
    if (calFile) {
      parts.push({
        inlineData: {
          mimeType: calFile.mimeType,
          data: calFile.base64,
        },
      });
      hasAttachment = true;
    }
  }

  if (options.timetableFileDataUrl) {
    const ttFile = parseDataUrl(options.timetableFileDataUrl, options.timetableFileName);
    if (ttFile) {
      parts.push({
        inlineData: {
          mimeType: ttFile.mimeType,
          data: ttFile.base64,
        },
      });
      hasAttachment = true;
    }
  }

  if (!hasAttachment) {
    throw new Error(
      'Please upload at least one document (Academic Calendar or Timetable) for AI to scan.'
    );
  }

  // 1. Discover dynamically supported models for this user's key
  let candidates = await discoverSupportedModels(apiKey);

  // If dynamic discovery returned nothing (e.g. network or permissions), use comprehensive fallbacks
  if (candidates.length === 0) {
    candidates = FALLBACK_CANDIDATES;
  } else {
    // Append any fallback models not already discovered to be maximally resilient
    for (const fb of FALLBACK_CANDIDATES) {
      if (!candidates.some((c) => c.model === fb.model)) {
        candidates.push(fb);
      }
    }
  }

  let lastError: any = null;

  // Try candidate models in order of ranking
  for (const candidate of candidates) {
    const { model, apiVersion } = candidate;
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errMsg = `Gemini API error (${response.status})`;
        try {
          const parsed = JSON.parse(errorBody);
          errMsg = parsed.error?.message || errMsg;
        } catch {}

        // If the model was not found for this apiVersion, try alternate version (v1 <-> v1beta)
        if (
          response.status === 404 ||
          errMsg.includes('not found') ||
          errMsg.includes('not supported')
        ) {
          const altVersion = apiVersion === 'v1beta' ? 'v1' : 'v1beta';
          const altUrl = `https://generativelanguage.googleapis.com/${altVersion}/models/${model}:generateContent?key=${apiKey}`;
          try {
            const altResponse = await fetch(altUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.1,
                },
              }),
            });
            if (altResponse.ok) {
              const altData = await altResponse.json();
              const altText = altData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (altText) {
                return parseAndSanitizeResponse(altText, options.subjects, model);
              }
            }
          } catch {}
        }

        throw new Error(errMsg);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(
          'AI returned an empty response. Please verify the uploaded document image/PDF.'
        );
      }

      return parseAndSanitizeResponse(rawText, options.subjects, model);
    } catch (err: any) {
      lastError = err;
      console.warn(
        `Attempt with ${candidate.apiVersion}/models/${candidate.model} failed:`,
        err.message
      );
      // Continue to next candidate
    }
  }

  throw (
    lastError ||
    new Error(
      'Failed to analyze documents with Gemini AI. Please check your API key and document format.'
    )
  );
}
