import type { AvailabilitySlot, Doctor, StatusType } from '../types';

export const STATUS_COLORS: Record<StatusType, string> = {
  Available: '#2e7d32',
  Tentative: '#00796b',
  Booked: '#1565c0',
  Away: '#757575',
  Holiday: '#f9a825',
  Sick: '#c62828',
  Unavailable: '#424242',
};

// Date utilities
export function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

export function dateToIso(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const date = isoToDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIso(date);
}

export function diffDays(iso1: string, iso2: string): number {
  const d1 = isoToDate(iso1).getTime();
  const d2 = isoToDate(iso2).getTime();
  return Math.round((d1 - d2) / (24 * 3600 * 1000));
}

export function formatDateAU(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function parseDateAU(str: string): Date | null {
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const dd = +m[1];
  const mm = +m[2];
  let yyyy = +m[3];
  if (m[3].length === 2) yyyy += 2000;
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

// Heatmap calculations
export function getMonthRange(date: Date): { start: string; endEx: string; name: string } {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const start = dateToIso(new Date(Date.UTC(y, m, 1)));
  const endEx = dateToIso(new Date(Date.UTC(y, m + 1, 1)));
  const name = new Date(Date.UTC(y, m, 1)).toLocaleString('en-AU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return { start, endEx, name };
}

export function getWeekRange(date: Date): { start: string; endEx: string } {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (utc.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const mon = new Date(utc);
  mon.setUTCDate(mon.getUTCDate() - dow);
  const start = dateToIso(mon);
  const sun = new Date(mon);
  sun.setUTCDate(sun.getUTCDate() + 7);
  const endEx = dateToIso(sun);
  return { start, endEx };
}

export type DayStatus = 'blank' | 'booked' | 'available' | 'tentative' | 'other';

export function getAvailabilityStatus(
  availability: AvailabilitySlot[],
  ahpraId: string,
  dateIso: string
): DayStatus {
  const slots = availability.filter(
    (s) => s.ahpraId === ahpraId && s.date <= dateIso && (s.endDate || s.date) >= dateIso
  );

  if (slots.length === 0) return 'blank';
  if (slots.some((s) => s.status === 'Booked')) return 'booked';
  if (slots.some((s) => s.status === 'Available')) return 'available';
  if (slots.some((s) => s.status === 'Tentative')) return 'tentative';
  return 'other';
}

// CSV Parsing
export function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseAvailabilityCSV(
  text: string,
  existingDoctors: Doctor[]
): { doctors: Partial<Doctor>[]; availability: Partial<AvailabilitySlot>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 1) return { doctors: [], availability: [] };

  const header = splitCSVLine(lines[0]).map((h) => h.trim());
  const headerLower = header.map((h) => h.toLowerCase());

  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headerLower.findIndex((h) => h === n.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  const iAhpra = col('ahpra_id', 'ahpra', 'registration');
  const iName = col('doctor', 'doctor_name', 'name');
  const iStart = col('start', 'start_date', 'from');
  const iEnd = col('end', 'end_date', 'to');
  const iStatus = col('status');
  const iNotes = col('notes', 'note', 'reason');
  const iLocation = col('location', 'where', 'site');

  if (iAhpra < 0 || iStart < 0 || iEnd < 0) {
    throw new Error('CSV must include: AHPRA_ID, Start, End columns');
  }

  const doctorMap = new Map<string, Partial<Doctor>>(
    existingDoctors.map((d) => [d.ahpraId, d])
  );
  const availability: Partial<AvailabilitySlot>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const ahpra = (cols[iAhpra] || '').trim();
    if (!ahpra) continue;

    const name = iName >= 0 ? (cols[iName] || '').trim() : '';
    const startDate = parseDateAU(cols[iStart]);
    const endDate = parseDateAU(cols[iEnd]);
    if (!startDate || !endDate) continue;

    if (!doctorMap.has(ahpra)) {
      doctorMap.set(ahpra, {
        ahpraId: ahpra,
        name: name || ahpra,
      } as Partial<Doctor>);
    }

    const status = (iStatus >= 0 ? (cols[iStatus] || '').trim() : 'Available') as StatusType;
    const notes = iNotes >= 0 ? (cols[iNotes] || '').trim() : '';
    const location = iLocation >= 0 ? (cols[iLocation] || '').trim() : '';

    availability.push({
      ahpraId: ahpra,
      date: dateToIso(startDate),
      endDate: dateToIso(endDate),
      status,
      notes,
      location,
    });
  }

  return {
    doctors: Array.from(doctorMap.values()),
    availability,
  };
}

export function parseClickUpDoctorsCSV(
  text: string
): { ahpraId: string; name: string; prefs?: string; level?: string; pgy?: string; tags?: string[] }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 1) return [];

  const header = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  const col = (...names: string[]) => {
    for (const n of names) {
      const idx = header.findIndex((h) => h.includes(n.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const iName = col('task', 'name');
  const iAhpra = col('med', 'reg');
  const iPrefs = col('desired', 'special');
  const iLevel = col('grade', 'level');
  const iPgy = col('pgy');
  const iTags = col('tags');

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    let ahpra = (cols[iAhpra] || '').trim();
    if (!ahpra) {
      ahpra = `TEMP_${Math.random().toString(16).slice(2)}`;
    }

    const name = (cols[iName] || '').trim();
    if (!name) continue;

    const prefs = (cols[iPrefs] || '').trim();
    let level = (cols[iLevel] || '').trim();
    if (level.toLowerCase() === 'consultant') level = 'Specialist';

    const pgy = (cols[iPgy] || '').trim();
    const tagsStr = (cols[iTags] || '').trim();
    const tags = tagsStr ? tagsStr.split(',').map((s) => s.trim()).filter(Boolean) : [];

    out.push({ ahpraId: ahpra, name, prefs, level, pgy, tags });
  }
  return out;
}

export function uid(): string {
  return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);
}
