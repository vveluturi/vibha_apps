import type { SavedProgram } from "../types/program";

export const STATUS_STEPS = ["Exploring", "Contacted", "In Discussion", "Active Partner"] as const;
export type PartnershipStatus = (typeof STATUS_STEPS)[number];

export interface PartnershipInterest {
  contactName: string;
  email: string;
  message: string;
  partnershipType: string;
  submittedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface PartnershipChecklist {
  generatedAt: string;
  items: ChecklistItem[];
}

export interface ActivePartnerDetails {
  startDate: string;
  contactName: string;
  contactEmail: string;
  partnershipType: string;
  notes: string;
}

export const ACTIVE_PARTNERSHIP_TYPE_OPTIONS = [
  "Corporate Giving",
  "Employee Volunteering",
  "Skills-Based",
  "Cause Marketing",
  "Donation Matching",
  "Other",
];

export interface PartnershipRecord {
  status: PartnershipStatus;
  updatedAt: string;
  // Storage keys are lowercased for lookup — these preserve original casing
  // for display (e.g. in the Impact Report, which enumerates all records).
  nonprofitName?: string;
  companyName?: string;
  interest?: PartnershipInterest;
  emailDraft?: string;
  checklist?: PartnershipChecklist;
  activePartnerDetails?: ActivePartnerDetails;
}

const PARTNERSHIP_KEY = "compass_partnership_status_v1";

export function loadPartnerships(): Record<string, PartnershipRecord> {
  try {
    const raw = localStorage.getItem(PARTNERSHIP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePartnerships(data: Record<string, PartnershipRecord>) {
  try { localStorage.setItem(PARTNERSHIP_KEY, JSON.stringify(data)); } catch { /* silent */ }
}

export function partnershipKey(companyName: string, nonprofitName: string): string {
  return `${companyName.trim().toLowerCase()}::${nonprofitName.trim().toLowerCase()}`;
}

// Single-tenant demo app — there's no company auth, so this mirrors the
// hardcoded "Acme Corporation" identity used elsewhere (layout.tsx, dashboard.tsx).
export function resolveCompanyName(programs: SavedProgram[]): string {
  const active = programs.find((p) => p.status !== "Archived");
  return active?.intake?.step1?.companyName?.trim() || "Acme Corporation";
}

export function nextStatus(status: PartnershipStatus): PartnershipStatus | null {
  const idx = STATUS_STEPS.indexOf(status);
  if (idx === -1 || idx === STATUS_STEPS.length - 1) return null;
  return STATUS_STEPS[idx + 1];
}
