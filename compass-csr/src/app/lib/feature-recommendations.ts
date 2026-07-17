import type { Step3Data } from "../context/wizard-context";
import type { SavedProgram } from "../types/program";

const PROGRAMS_KEY = "compass_programs_v1";

export type RecommendationFeature =
  | "weekly-digest"
  | "my-tasks"
  | "team-inbox"
  | "impact-report"
  | "nonprofit-partners"
  | "slack-teams";

export interface FeatureRecommendation {
  feature: RecommendationFeature;
  title: string;
  desc: string;
  icon: string;
  dismissKey: string;
  link?: string;
  externalLinks?: { label: string; url: string }[];
}

// Keys the dismiss button on each recommendation/banner writes to localStorage.
export const DISMISS_KEYS: Record<RecommendationFeature, string> = {
  "my-tasks": "compass_dismissed_my_tasks",
  "weekly-digest": "compass_dismissed_weekly_digest",
  "team-inbox": "compass_dismissed_team_inbox",
  "slack-teams": "compass_dismissed_slack_teams",
  "impact-report": "compass_dismissed_impact_report",
  "nonprofit-partners": "compass_dismissed_nonprofit_partners",
};

// Ordered by priority: task assignment, then check-ins, then communication,
// then reporting, then external. Array order doubles as sort order for
// getActiveRecommendations() since filter() preserves it.
const RECOMMENDATION_DEFS: (FeatureRecommendation & { matches: (step3: Step3Data) => boolean })[] = [
  {
    feature: "my-tasks",
    title: "Assign your first task",
    desc: "Your team wants task assignments — get your team moving by assigning tasks in your program dashboard.",
    link: "/my-tasks",
    icon: "CheckSquare",
    dismissKey: DISMISS_KEYS["my-tasks"],
    matches: (s) => s.collabStyles.includes("assign-tasks"),
  },
  {
    feature: "weekly-digest",
    title: "Set up your Weekly Digest",
    desc: "Your team prefers regular check-ins — send a weekly CSR update to keep everyone aligned.",
    link: "/weekly-digest",
    icon: "Calendar",
    dismissKey: DISMISS_KEYS["weekly-digest"],
    matches: (s) => s.workStyles.includes("check-ins"),
  },
  {
    feature: "team-inbox",
    title: "Check your Team Inbox",
    desc: "Your team wants to communicate — encourage them to submit questions and feedback.",
    link: "/team-inbox",
    icon: "MessageSquare",
    dismissKey: DISMISS_KEYS["team-inbox"],
    matches: (s) => s.collabStyles.includes("comment"),
  },
  {
    feature: "slack-teams",
    title: "Share updates via Slack or Teams",
    desc: "Your team uses Slack or Teams — copy your Weekly Digest and share it there directly.",
    externalLinks: [
      { label: "Open Slack", url: "https://slack.com" },
      { label: "Open Teams", url: "https://teams.microsoft.com" },
    ],
    icon: "MessageCircle",
    dismissKey: DISMISS_KEYS["slack-teams"],
    matches: (s) => s.commsChannels.includes("slack"),
  },
  {
    feature: "impact-report",
    title: "Share your Impact Report",
    desc: "Your leadership team is waiting for a progress update — your Impact Report is ready to share.",
    link: "/impact-report",
    icon: "BarChart",
    dismissKey: DISMISS_KEYS["impact-report"],
    matches: (s) => s.collabStyles.includes("reports"),
  },
  {
    feature: "nonprofit-partners",
    title: "Connect with nonprofit partners",
    desc: "Browse verified nonprofits that match your CSR program focus and express interest in partnerships.",
    link: "/nonprofit-partners",
    icon: "Heart",
    dismissKey: DISMISS_KEYS["nonprofit-partners"],
    matches: (s) => s.collabStyles.includes("invite-nonprofits"),
  },
];

function loadMostRecentProgram(): SavedProgram | null {
  try {
    const raw = localStorage.getItem(PROGRAMS_KEY);
    if (!raw) return null;
    const programs = JSON.parse(raw) as SavedProgram[];
    if (!Array.isArray(programs)) return null;
    const active = programs.filter((p) => p.status !== "Archived");
    if (active.length === 0) return null;
    return active.reduce((latest, p) => (p.createdAt > latest.createdAt ? p : latest), active[0]);
  } catch {
    return null;
  }
}

function isDismissed(dismissKey: string): boolean {
  try {
    return localStorage.getItem(dismissKey) !== null;
  } catch {
    return false;
  }
}

export function dismissRecommendation(dismissKey: string): void {
  try {
    localStorage.setItem(dismissKey, "true");
  } catch {
    // fail silently
  }
}

// Reads the most recent saved program's Step 3 answers and returns feature
// recommendations, filtered by dismissal and sorted by priority.
export function getActiveRecommendations(): FeatureRecommendation[] {
  const program = loadMostRecentProgram();
  const step3 = program?.intake?.step3;
  if (!step3) return [];

  return RECOMMENDATION_DEFS.filter((def) => def.matches(step3) && !isDismissed(def.dismissKey)).map(
    ({ matches, ...rec }) => rec,
  );
}

// Used by contextual banners on feature pages — checks whether a single
// feature's recommendation is currently active, ignoring priority ordering.
export function shouldShowFeatureBanner(feature: RecommendationFeature): boolean {
  const program = loadMostRecentProgram();
  const step3 = program?.intake?.step3;
  if (!step3) return false;

  const def = RECOMMENDATION_DEFS.find((d) => d.feature === feature);
  if (!def) return false;

  return def.matches(step3) && !isDismissed(def.dismissKey);
}
