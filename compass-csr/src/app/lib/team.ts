export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  note: string;
  skills: string[];
  avatarUrl: string | null; // base64 or null
}

const STORAGE_KEY = "compass_team_v1";

export function loadTeamMembers(): TeamMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTeamMembers(members: TeamMember[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    // quota exceeded — fail silently
  }
}

export function createTeamMemberId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `member-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

export const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-indigo-500",
];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─── Current user (My Tasks "who are you?") ────────────────────────────────────

const CURRENT_USER_KEY = "compass_current_user_v1";

export function loadCurrentUser(): string | null {
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch {
    return null;
  }
}

export function saveCurrentUser(name: string | null) {
  try {
    if (name) localStorage.setItem(CURRENT_USER_KEY, name);
    else localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    // fail silently
  }
}
