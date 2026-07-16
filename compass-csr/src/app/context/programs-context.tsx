import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProgramIntake, SavedProgram } from "../types/program";
 
const STORAGE_KEY = "compass_programs_v1";
 
interface SaveProgramInput {
  name: string;
  intake: ProgramIntake;
  blueprint: SavedProgram["blueprint"];
}
 
interface ProgramsContextValue {
  programs: SavedProgram[];
  saveProgram: (input: SaveProgramInput) => SavedProgram;
  getProgram: (id: string) => SavedProgram | undefined;
  duplicateProgram: (id: string) => SavedProgram | undefined;
  archiveProgram: (id: string) => void;
  unarchiveProgram: (id: string) => void;
  deleteProgram: (id: string) => void;
  pinProgram: (id: string) => void;
  updateProgram: (id: string, patch: Partial<Pick<SavedProgram, "name" | "status">>) => void;
}
 
function loadPrograms(): SavedProgram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProgram[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
 
function persistPrograms(programs: SavedProgram[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
  } catch {
    // quota exceeded — fail silently
  }
}
 
function createProgramId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `program-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
 
const ProgramsContext = createContext<ProgramsContextValue | null>(null);
 
export function ProgramsProvider({ children }: { children: ReactNode }) {
  const [programs, setPrograms] = useState<SavedProgram[]>(loadPrograms);
 
  useEffect(() => {
    persistPrograms(programs);
  }, [programs]);
 
  const saveProgram = useCallback((input: SaveProgramInput): SavedProgram => {
    const program: SavedProgram = {
      id: createProgramId(),
      name: input.name.trim(),
      createdAt: new Date().toISOString(),
      status: "Planning",
      pinned: false,
      intake: input.intake,
      blueprint: input.blueprint,
    };
    setPrograms((prev) => [program, ...prev]);
    return program;
  }, []);
 
  const getProgram = useCallback(
    (id: string) => programs.find((p) => p.id === id),
    [programs],
  );
 
  const duplicateProgram = useCallback((id: string): SavedProgram | undefined => {
    const source = programs.find((p) => p.id === id);
    if (!source) return undefined;
    const duplicate: SavedProgram = {
      ...source,
      id: createProgramId(),
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      status: "Planning",
      pinned: false,
      blueprint: {
        ...source.blueprint,
        generatedAt: new Date().toISOString(),
      },
    };
    setPrograms((prev) => [duplicate, ...prev]);
    return duplicate;
  }, [programs]);
 
  const archiveProgram = useCallback((id: string) => {
    setPrograms((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: "Archived", pinned: false } : p),
    );
  }, []);

  const unarchiveProgram = useCallback((id: string) => {
    setPrograms((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: "Planning" } : p),
    );
  }, []);

  // Permanently removes a program
  const deleteProgram = useCallback((id: string) => {
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  }, []);
 
  // Toggles pin — pinned programs float to the top of My Programs
  const pinProgram = useCallback((id: string) => {
    setPrograms((prev) =>
      prev.map((p) => p.id === id ? { ...p, pinned: !p.pinned } : p),
    );
  }, []);
 
  const updateProgram = useCallback(
    (id: string, patch: Partial<Pick<SavedProgram, "name" | "status">>) => {
      setPrograms((prev) =>
        prev.map((p) => p.id === id ? { ...p, ...patch } : p),
      );
    },
    [],
  );
 
  const value = useMemo(
    () => ({
      programs,
      saveProgram,
      getProgram,
      duplicateProgram,
      archiveProgram,
      unarchiveProgram,
      deleteProgram,
      pinProgram,
      updateProgram,
    }),
    [programs, saveProgram, getProgram, duplicateProgram, archiveProgram, unarchiveProgram, deleteProgram, pinProgram, updateProgram],
  );
 
  return (
    <ProgramsContext.Provider value={value}>{children}</ProgramsContext.Provider>
  );
}
 
export function usePrograms(): ProgramsContextValue {
  const ctx = useContext(ProgramsContext);
  if (!ctx) throw new Error("usePrograms must be used inside <ProgramsProvider>");
  return ctx;
}