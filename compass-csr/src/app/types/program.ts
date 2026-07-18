import type { Step1Data, Step2Data, Step3Data } from "../context/wizard-context";

export type ProgramStatus = "Planning" | "Active" | "Completed" | "Archived";

export type BlueprintIcon =
  | "Users"
  | "Heart"
  | "Sparkles"
  | "Globe"
  | "Megaphone"
  | "FileText";

export interface BlueprintPillar {
  icon: BlueprintIcon;
  title: string;
  desc: string;
}

export interface BlueprintPhase {
  label: string;
  range: string;
  color: string;
  dot: string;
  tasks: string[];
}

export interface BlueprintNonprofit {
  name: string;
  cause: string;
  desc: string;
  color: string;
}

export interface BlueprintPositioning {
  icon: BlueprintIcon;
  channel: string;
  suggestion: string;
}

export interface BlueprintRole {
  role: string;
  responsibility: string;
  time: string;
}

export interface BlueprintData {
  generatedAt: string;
  overview: string;
  pillars: BlueprintPillar[];
  phases: BlueprintPhase[];
  nonprofits: BlueprintNonprofit[];
  positioning: BlueprintPositioning[];
  sampleWebsiteCopy: {
    headline: string;
    body: string;
  };
  roles: BlueprintRole[];
}

export interface ProgramIntake {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
}

export interface ProgramNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface SavedProgram {
  id: string;
  name: string;
  createdAt: string;
  status: ProgramStatus;
  pinned: boolean;
  intake: ProgramIntake;
  blueprint: BlueprintData;
  notes?: ProgramNote[];
}

export const PROGRAM_STATUS_STYLES: Record<
  Exclude<ProgramStatus, "Archived">,
  string
> = {
  Planning: "bg-amber-50 text-amber-700 border-amber-200",
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
};