export const ACTIVITY_TYPES = [
  "Volunteer Event",
  "Donation Drive",
  "Fundraiser",
  "Meeting",
  "Workshop",
  "Other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityPhoto {
  id: string;
  dataUrl: string;
  fileName: string;
}

export interface ActivityLogEntry {
  id: string;
  partnershipKey: string;
  nonprofitName: string;
  date: string;
  activityType: ActivityType;
  description: string;
  employeesParticipated: number | null;
  volunteerHours: number | null;
  dollarsDonated: number | null;
  eventsHeld: number | null;
  photos: ActivityPhoto[];
  createdAt: string;
}

const ACTIVITY_KEY = "compass_partnership_activity_v1";

export function loadActivityLog(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveActivityLog(entries: ActivityLogEntry[]) {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(entries));
  } catch {
    // localStorage quota exceeded (large base64 photos) — fail silently
  }
}

export function addActivityLogEntry(entry: ActivityLogEntry) {
  const all = loadActivityLog();
  all.unshift(entry);
  saveActivityLog(all);
}

export interface ActivityTotals {
  volunteerHours: number;
  employeesEngaged: number;
  dollarsDonated: number;
  eventsHeld: number;
}

export function activityTotals(entries: ActivityLogEntry[]): ActivityTotals {
  return entries.reduce(
    (acc, e) => ({
      volunteerHours: acc.volunteerHours + (e.volunteerHours ?? 0),
      employeesEngaged: acc.employeesEngaged + (e.employeesParticipated ?? 0),
      dollarsDonated: acc.dollarsDonated + (e.dollarsDonated ?? 0),
      eventsHeld: acc.eventsHeld + (e.eventsHeld ?? 0),
    }),
    { volunteerHours: 0, employeesEngaged: 0, dollarsDonated: 0, eventsHeld: 0 },
  );
}

// Downscales an uploaded image before storing it as base64 in localStorage —
// full-resolution photos would exhaust the ~5-10MB quota after just a few uploads.
export function resizeImageToDataUrl(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
