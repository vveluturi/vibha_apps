import type { SavedProgram } from "../types/program";
import { callClaude, stripCodeFences } from "./claude-client";

export type TaskStatus = "not_started" | "in_progress" | "blocked" | "done";

export interface TaskState {
  programId: string;
  taskId: string; // `${phaseLabel}::${taskText}` — stable within a program
  phaseLabel: string;
  taskText: string;
  assignedTo: string | null;
  deadline: string | null; // ISO date (yyyy-mm-dd), user-edited
  aiSuggestedDeadline: string | null; // ISO date (yyyy-mm-dd), AI-generated
  status: TaskStatus;
  statusNote: string;
}

const TASKS_KEY = "compass_tasks_v1";

export function getTaskId(phaseLabel: string, taskText: string): string {
  return `${phaseLabel}::${taskText}`;
}

export function taskStorageKey(programId: string, taskId: string): string {
  return `${programId}::${taskId}`;
}

export function loadAllTaskStates(): Record<string, TaskState> {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAllTaskStates(states: Record<string, TaskState>) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(states));
  } catch {
    // fail silently
  }
}

function defaultTaskState(programId: string, phaseLabel: string, taskText: string): TaskState {
  return {
    programId,
    taskId: getTaskId(phaseLabel, taskText),
    phaseLabel,
    taskText,
    assignedTo: null,
    deadline: null,
    aiSuggestedDeadline: null,
    status: "not_started",
    statusNote: "",
  };
}

export function getTaskState(programId: string, phaseLabel: string, taskText: string): TaskState {
  const all = loadAllTaskStates();
  const key = taskStorageKey(programId, getTaskId(phaseLabel, taskText));
  return all[key] ?? defaultTaskState(programId, phaseLabel, taskText);
}

export function setTaskState(
  programId: string,
  phaseLabel: string,
  taskText: string,
  patch: Partial<Omit<TaskState, "programId" | "taskId" | "phaseLabel" | "taskText">>,
): TaskState {
  const all = loadAllTaskStates();
  const taskId = getTaskId(phaseLabel, taskText);
  const key = taskStorageKey(programId, taskId);
  const current = all[key] ?? defaultTaskState(programId, phaseLabel, taskText);
  const updated: TaskState = { ...current, ...patch };
  all[key] = updated;
  saveAllTaskStates(all);
  return updated;
}

export function getProgramTasks(program: SavedProgram): TaskState[] {
  const result: TaskState[] = [];
  for (const phase of program.blueprint.phases) {
    for (const taskText of phase.tasks) {
      result.push(getTaskState(program.id, phase.label, taskText));
    }
  }
  return result;
}

export interface ProgramTaskGroup {
  program: SavedProgram;
  tasks: TaskState[];
}

export function getAllProgramTasks(programs: SavedProgram[]): TaskState[] {
  return programs.flatMap((p) => getProgramTasks(p));
}

export function getTasksGroupedByProgram(programs: SavedProgram[]): ProgramTaskGroup[] {
  return programs.map((program) => ({ program, tasks: getProgramTasks(program) }));
}

export function getTasksForPerson(programs: SavedProgram[], personName: string): TaskState[] {
  return getAllProgramTasks(programs).filter((t) => t.assignedTo === personName);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysFromToday(dateISO: string): number {
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(dateISO + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// The deadline actually used for reminders/sorting — an explicit user-set
// deadline always wins; otherwise fall back to the AI suggestion so
// suggestions are useful for planning even before anyone confirms them.
export function effectiveDeadline(task: TaskState): string | null {
  return task.deadline ?? task.aiSuggestedDeadline;
}

export function isOverdue(task: TaskState): boolean {
  const d = effectiveDeadline(task);
  if (!d || task.status === "done") return false;
  return daysFromToday(d) < 0;
}

export function isDueToday(task: TaskState): boolean {
  const d = effectiveDeadline(task);
  if (!d || task.status === "done") return false;
  return daysFromToday(d) === 0;
}

// Inclusive of today, up to 7 days out.
export function isDueThisWeek(task: TaskState): boolean {
  const d = effectiveDeadline(task);
  if (!d || task.status === "done") return false;
  const diff = daysFromToday(d);
  return diff >= 0 && diff <= 7;
}

export function sortByDeadline(tasks: TaskState[]): TaskState[] {
  return [...tasks].sort((a, b) => {
    const da = effectiveDeadline(a);
    const db = effectiveDeadline(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });
}

// ─── Team stats ───────────────────────────────────────────────────────────────

export interface PersonTaskStats {
  name: string;
  total: number;
  overdue: number;
  inProgress: number;
  done: number;
  blocked: number;
}

export function getTeamTaskStats(programs: SavedProgram[], teamNames: string[]): PersonTaskStats[] {
  const all = getAllProgramTasks(programs);
  return teamNames.map((name) => {
    const mine = all.filter((t) => t.assignedTo === name);
    return {
      name,
      total: mine.length,
      overdue: mine.filter(isOverdue).length,
      inProgress: mine.filter((t) => t.status === "in_progress").length,
      done: mine.filter((t) => t.status === "done").length,
      blocked: mine.filter((t) => t.status === "blocked").length,
    };
  });
}

// ─── AI-suggested deadlines ─────────────────────────────────────────────────────

const PHASE_DAY_RANGES: Record<string, string> = {
  Foundation: "Days 1-14",
  Planning: "Days 15-30",
  Launch: "Days 31-60",
  Expand: "Days 61-90",
};

// Populates aiSuggestedDeadline for any task in the program that doesn't have
// one yet. No-ops (and makes no API call) if every task already has one.
export async function generateAiSuggestedDeadlines(program: SavedProgram): Promise<void> {
  const tasks = getProgramTasks(program);
  const missing = tasks.filter((t) => !t.aiSuggestedDeadline);
  if (missing.length === 0) return;

  const system = `You are a CSR program planning assistant. Given a 90-day program timeline with phases and tasks, suggest a realistic deadline date for each task based on which phase it belongs to. Today is Day 1 of the program. Phase day ranges: Foundation = Days 1-14, Planning = Days 15-30, Launch = Days 31-60, Expand = Days 61-90. Spread task deadlines reasonably across their phase's day range rather than clustering them all on the same day. Return ONLY a JSON array of objects — no markdown, no explanation. Example: [{"taskId": "Foundation::Finalize program charter and goals", "suggestedDeadline": "2026-07-10"}]`;

  const userMessage = `Today's date: ${todayISO()}

Tasks (grouped by phase, with each phase's day range):
${JSON.stringify(
  missing.map((t) => ({
    taskId: t.taskId,
    phase: t.phaseLabel,
    phaseDayRange: PHASE_DAY_RANGES[t.phaseLabel] ?? "",
    task: t.taskText,
  })),
  null,
  2,
)}

Generate the suggested deadlines now.`;

  const text = await callClaude(system, userMessage, 2000);
  const suggestions = JSON.parse(stripCodeFences(text)) as { taskId: string; suggestedDeadline: string }[];

  const all = loadAllTaskStates();
  for (const s of suggestions) {
    const match = missing.find((t) => t.taskId === s.taskId);
    if (!match || !s.suggestedDeadline) continue;
    const key = taskStorageKey(program.id, s.taskId);
    const current = all[key] ?? match;
    all[key] = { ...current, aiSuggestedDeadline: s.suggestedDeadline };
  }
  saveAllTaskStates(all);
}

export function formatShortDate(dateISO: string): string {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
