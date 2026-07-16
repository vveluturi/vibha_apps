import type { BlueprintData } from "../types/program";
import { loadAllTaskStates, saveAllTaskStates, taskStorageKey, getTaskId, type TaskState } from "./tasks";

// Thin compatibility layer over the unified task store (lib/tasks.ts) — kept so
// blueprint-view.tsx and impact-report.tsx (which only care about "checked or
// not") don't need to change. A task counts as "checked" when its status is
// "done", so completion here always matches status shown everywhere else
// (Program Dashboard, My Tasks, Weekly Digest).
export function loadCheckedTasks(storageKey: string): Record<string, boolean> {
  const all = loadAllTaskStates();
  const result: Record<string, boolean> = {};
  for (const key in all) {
    const state = all[key];
    if (state.programId === storageKey) {
      result[state.taskId] = state.status === "done";
    }
  }
  return result;
}

export function saveCheckedTasks(storageKey: string, checked: Record<string, boolean>) {
  const all = loadAllTaskStates();
  for (const taskId in checked) {
    const key = taskStorageKey(storageKey, taskId);
    const current = all[key];
    const [phaseLabel, ...rest] = taskId.split("::");
    const taskText = rest.join("::");
    const base: TaskState = current ?? {
      programId: storageKey,
      taskId: getTaskId(phaseLabel, taskText),
      phaseLabel,
      taskText,
      assignedTo: null,
      deadline: null,
      aiSuggestedDeadline: null,
      status: "not_started",
      statusNote: "",
    };
    all[key] = { ...base, status: checked[taskId] ? "done" : "not_started" };
  }
  saveAllTaskStates(all);
}

export function countCompletedTasks(storageKey: string, blueprint: BlueprintData): { done: number; total: number } {
  const checked = loadCheckedTasks(storageKey);
  let total = 0;
  let done = 0;
  for (const phase of blueprint.phases) {
    for (const task of phase.tasks) {
      total++;
      if (checked[`${phase.label}::${task}`]) done++;
    }
  }
  return { done, total };
}
