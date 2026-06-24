import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ─── Data shapes ──────────────────────────────────────────────────────────────

export interface Step1Data {
  companyName: string;
  industry: string;
  companySize: string;
  missionStatement: string;
  coreValues: string[];
  primaryAudience: string;
}

export interface Step2Data {
  programTypes: string[];
  goals: string[];
  existingProgram: string;
  existingDescription: string;
  budget: string;
  timeline: string;
}

export interface Step3Data {
  programLeader: string;
  teamSize: string;
  workStyles: string[];
  collabStyles: string[];
  commsChannels: string[];
}

export interface WizardState {
  highestStep: number;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
}

interface WizardContextValue extends WizardState {
  updateStep1: (patch: Partial<Step1Data>) => void;
  updateStep2: (patch: Partial<Step2Data>) => void;
  updateStep3: (patch: Partial<Step3Data>) => void;
  advanceTo: (step: number) => void;
  resetWizard: () => void;
  restoreIntake: (intake: Pick<WizardState, "step1" | "step2" | "step3">) => void;
  buildPromptPayload: () => object;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STEP1: Step1Data = {
  companyName: "",
  industry: "",
  companySize: "",
  missionStatement: "",
  coreValues: [],
  primaryAudience: "",
};

const DEFAULT_STEP2: Step2Data = {
  programTypes: [],
  goals: [],
  existingProgram: "",
  existingDescription: "",
  budget: "",
  timeline: "",
};

const DEFAULT_STEP3: Step3Data = {
  programLeader: "",
  teamSize: "",
  workStyles: [],
  collabStyles: [],
  commsChannels: [],
};

const DEFAULT_STATE: WizardState = {
  highestStep: 1,
  step1: DEFAULT_STEP1,
  step2: DEFAULT_STEP2,
  step3: DEFAULT_STEP3,
};

// ─── localStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "compass_wizard_v1";

function loadSaved(): WizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return {
      highestStep: parsed.highestStep ?? 1,
      step1: { ...DEFAULT_STEP1, ...(parsed.step1 ?? {}) },
      step2: { ...DEFAULT_STEP2, ...(parsed.step2 ?? {}) },
      step3: { ...DEFAULT_STEP3, ...(parsed.step3 ?? {}) },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(state: WizardState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — fail silently
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(loadSaved);

  useEffect(() => {
    save(state);
  }, [state]);

  const updateStep1 = useCallback((patch: Partial<Step1Data>) => {
    setState((prev) => ({ ...prev, step1: { ...prev.step1, ...patch } }));
  }, []);

  const updateStep2 = useCallback((patch: Partial<Step2Data>) => {
    setState((prev) => ({ ...prev, step2: { ...prev.step2, ...patch } }));
  }, []);

  const updateStep3 = useCallback((patch: Partial<Step3Data>) => {
    setState((prev) => ({ ...prev, step3: { ...prev.step3, ...patch } }));
  }, []);

  const advanceTo = useCallback((step: number) => {
    setState((prev) =>
      prev.highestStep >= step ? prev : { ...prev, highestStep: step }
    );
  }, []);

  // Clears all wizard state so "New Program" always starts fresh
  const resetWizard = useCallback(() => {
    setState(DEFAULT_STATE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // fail silently
    }
  }, []);

  const restoreIntake = useCallback((intake: Pick<WizardState, "step1" | "step2" | "step3">) => {
    setState((prev) => ({
      ...prev,
      highestStep: 4,
      step1: intake.step1,
      step2: intake.step2,
      step3: intake.step3,
    }));
  }, []);

  const buildPromptPayload = useCallback(() => ({
    generatedAt: new Date().toISOString(),
    companyProfile: {
      companyName: state.step1.companyName,
      industry: state.step1.industry,
      companySize: state.step1.companySize,
      missionStatement: state.step1.missionStatement,
      coreValues: state.step1.coreValues,
      primaryAudience: state.step1.primaryAudience,
    },
    programFocus: {
      programTypes: state.step2.programTypes,
      goals: state.step2.goals,
      existingProgram: state.step2.existingProgram,
      existingDescription: state.step2.existingDescription,
      annualBudget: state.step2.budget,
      launchTimeline: state.step2.timeline,
    },
    teamCollaboration: {
      programLeader: state.step3.programLeader,
      teamSize: Number(state.step3.teamSize) || null,
      workStyles: state.step3.workStyles,
      collabPreferences: state.step3.collabStyles,
      employeeCommsChannels: state.step3.commsChannels,
    },
  }), [state]);

  return (
    <WizardContext.Provider
      value={{ ...state, updateStep1, updateStep2, updateStep3, advanceTo, resetWizard, restoreIntake, buildPromptPayload }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside <WizardProvider>");
  return ctx;
}