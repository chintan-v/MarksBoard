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
}

interface FileData {
  mimeType: string;
  base64: string;
}

function parseDataUrl(dataUrl: string): FileData | null {
  try {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    return { mimeType, base64 };
  } catch {
    return null;
  }
}

/**
 * Calls Google Gemini Vision/Document API to read and analyze
 * the Academic Calendar circular and/or Weekly Timetable image/PDF.
 */
export async function analyzeAcademicDocumentsWithAI(options: {
  calendarFileDataUrl?: string;
  timetableFileDataUrl?: string;
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

2. WEEKLY TIMETABLE:
   - For every class period in the weekly timetable matrix, map each cell to one of the registered subjects by matching its subject code, abbreviation (e.g., "DLD", "DSA", "DBMS", "OS", "Maths"), or title.
   - For each period, assign:
     - day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday"
     - matchedSubjectId: exact "id" from the student's subject list above (or "" if unmatchable/recess/lunch)
     - slotTime: e.g. "09:00 - 10:00 AM", "10:00 - 11:00 AM", etc. (if visible in timetable header, else estimate standard period)

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
      "matchedSubjectId": "<subject_id_from_provided_list>",
      "slotTime": "09:00 - 10:00 AM"
    }
  ],
  "summary": "Brief 1-2 sentence overview of what was detected (e.g. 18-week semester from Aug to Dec, 7 holidays, and 26 weekly classes).",
  "calendarNotes": "Any additional detected dates like mid-term exams or revision week."
}`;

  parts.push({ text: promptText });

  let hasAttachment = false;

  if (options.calendarFileDataUrl) {
    const calFile = parseDataUrl(options.calendarFileDataUrl);
    if (calFile) {
      parts.push({
        inline_data: {
          mime_type: calFile.mimeType,
          data: calFile.base64,
        },
      });
      hasAttachment = true;
    }
  }

  if (options.timetableFileDataUrl) {
    const ttFile = parseDataUrl(options.timetableFileDataUrl);
    if (ttFile) {
      parts.push({
        inline_data: {
          mime_type: ttFile.mimeType,
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

  // Model hierarchy: try gemini-2.0-flash first, fallback to gemini-1.5-flash
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
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
              response_mime_type: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        let errMsg = `Gemini API error (${response.status})`;
        try {
          const parsed = JSON.parse(errorBody);
          errMsg = parsed.error?.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('AI returned an empty response. Please verify the uploaded document image/PDF.');
      }

      const parsedJson = JSON.parse(rawText);

      // Sanitize and validate extracted response
      const currentYear = new Date().getFullYear();
      const defaultStart = `${currentYear}-08-03`;
      const defaultEnd = `${currentYear}-12-18`;

      const validDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const startDate =
        parsedJson.startDate && validDateRegex.test(parsedJson.startDate)
          ? parsedJson.startDate
          : defaultStart;
      const endDate =
        parsedJson.endDate && validDateRegex.test(parsedJson.endDate)
          ? parsedJson.endDate
          : defaultEnd;

      const workingDays: DayOfWeek[] = Array.isArray(parsedJson.workingDays)
        ? (parsedJson.workingDays.filter((d: string) =>
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(d)
          ) as DayOfWeek[])
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

      const validSubjectIds = new Set(options.subjects.map((s) => s.id));

      const holidays: CalendarHoliday[] = Array.isArray(parsedJson.holidays)
        ? parsedJson.holidays
            .filter((h: any) => h && h.date && validDateRegex.test(h.date))
            .map((h: any, idx: number) => ({
              id: `ai-hol-${Date.now()}-${idx}`,
              date: h.date,
              title: h.title || 'University Holiday',
            }))
        : [];

      const timetable: TimetableSlot[] = Array.isArray(parsedJson.timetable)
        ? parsedJson.timetable
            .filter(
              (t: any) =>
                t &&
                t.day &&
                t.matchedSubjectId &&
                validSubjectIds.has(t.matchedSubjectId)
            )
            .map((t: any, idx: number) => ({
              id: `ai-slot-${Date.now()}-${idx}`,
              day: t.day as DayOfWeek,
              subjectId: t.matchedSubjectId,
              slotTime: t.slotTime || '09:00 - 10:00 AM',
            }))
        : [];

      return {
        startDate,
        endDate,
        workingDays: workingDays.length > 0 ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        holidays,
        timetable,
        summary: parsedJson.summary || 'AI successfully analyzed your schedule document(s)!',
        calendarNotes: parsedJson.calendarNotes,
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`Attempt with ${model} failed:`, err);
      // If error is 404 or model not found, loop to next model
    }
  }

  throw lastError || new Error('Failed to analyze documents with Gemini AI.');
}
