import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import supabase from "../../lib/supabase";
import { useAuth } from "./auth-context";
import type { ProgramIntake, SavedProgram } from "../types/program";

const STORAGE_KEY = "compass_programs_v1";

interface SaveProgramInput {
  name: string;
  intake: ProgramIntake;
  blueprint: SavedProgram["blueprint"];
}

interface ProgramsContextValue {
  programs: SavedProgram[];
  loading: boolean;
  saveProgram: (input: SaveProgramInput) => SavedProgram;
  getProgram: (id: string) => SavedProgram | undefined;
  duplicateProgram: (id: string) => SavedProgram | undefined;
  archiveProgram: (id: string) => void;
  unarchiveProgram: (id: string) => void;
  deleteProgram: (id: string) => void;
  pinProgram: (id: string) => void;
  updateProgram: (id: string, patch: Partial<Pick<SavedProgram, "name" | "status" | "notes">>) => void;
}

// ─── localStorage fallback (Phase 2 tables still live here; also the
// fallback for programs whenever a Supabase call fails or no company is
// resolved yet) ──────────────────────────────────────────────────────────────

function loadLocalPrograms(): SavedProgram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProgram[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalPrograms(programs: SavedProgram[]) {
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

// Maps a Supabase `programs` row onto the app's existing SavedProgram shape.
interface ProgramRow {
  id: string;
  name: string;
  created_at: string;
  status: SavedProgram["status"];
  pinned: boolean;
  intake: ProgramIntake;
  blueprint: SavedProgram["blueprint"];
  notes?: SavedProgram["notes"] | null;
}

function rowToProgram(row: ProgramRow): SavedProgram {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    status: row.status,
    pinned: row.pinned,
    intake: row.intake,
    blueprint: row.blueprint,
    notes: row.notes ?? [],
  };
}

const ProgramsContext = createContext<ProgramsContextValue | null>(null);

export function ProgramsProvider({ children }: { children: ReactNode }) {
  const { company } = useAuth();
  const [programs, setPrograms] = useState<SavedProgram[]>([]);
  const [loading, setLoading] = useState(true);

  // Load this company's programs from Supabase on mount and whenever the
  // resolved company changes (e.g. right after sign-in). Fresh-start: we
  // never seed Supabase from whatever's already sitting in localStorage —
  // that fallback is read-only, used only when the fetch itself fails or no
  // company is resolved yet.
  useEffect(() => {
    let active = true;

    if (!company?.id) {
      setPrograms(loadLocalPrograms());
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from("programs")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load programs from Supabase:", error);
          setPrograms(loadLocalPrograms());
        } else {
          setPrograms(((data ?? []) as ProgramRow[]).map(rowToProgram));
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [company?.id]);

  // Keep a localStorage mirror of whatever's currently in state — this is
  // what the app falls back to reading whenever a Supabase call fails.
  useEffect(() => {
    persistLocalPrograms(programs);
  }, [programs]);

  const saveProgram = useCallback(
    (input: SaveProgramInput): SavedProgram => {
      const optimistic: SavedProgram = {
        id: createProgramId(),
        name: input.name.trim(),
        createdAt: new Date().toISOString(),
        status: "Planning",
        pinned: false,
        intake: input.intake,
        blueprint: input.blueprint,
      };

      // Optimistic update — callers use the synchronous return value and
      // never await this, so local state (and the value we hand back) must
      // be correct immediately regardless of the network round trip.
      setPrograms((prev) => [optimistic, ...prev]);

      if (!company?.id) {
        return optimistic;
      }

      supabase
        .from("programs")
        .insert({
          name: optimistic.name,
          status: optimistic.status,
          pinned: optimistic.pinned,
          intake: optimistic.intake,
          blueprint: optimistic.blueprint,
          company_id: company.id,
        })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            console.error("Failed to save program to Supabase:", error);
            toast.error("Failed to save program");
            return;
          }
          // Reconcile the optimistic row with the real one now that it's
          // known (real id, real created_at) — keeps future updates/deletes
          // targeting the actual Supabase row instead of the temp id.
          const saved = rowToProgram(data as ProgramRow);
          setPrograms((prev) => prev.map((p) => (p.id === optimistic.id ? saved : p)));
        });

      return optimistic;
    },
    [company?.id],
  );

  const getProgram = useCallback((id: string) => programs.find((p) => p.id === id), [programs]);

  const duplicateProgram = useCallback(
    (id: string): SavedProgram | undefined => {
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

      if (!company?.id) return duplicate;

      supabase
        .from("programs")
        .insert({
          name: duplicate.name,
          status: duplicate.status,
          pinned: duplicate.pinned,
          intake: duplicate.intake,
          blueprint: duplicate.blueprint,
          company_id: company.id,
        })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            console.error("Failed to duplicate program in Supabase:", error);
            toast.error("Failed to save program");
            return;
          }
          const saved = rowToProgram(data as ProgramRow);
          setPrograms((prev) => prev.map((p) => (p.id === duplicate.id ? saved : p)));
        });

      return duplicate;
    },
    [programs, company?.id],
  );

  // Shared helper for the small status/pinned patches below: applies the
  // patch to local state immediately (optimistic), then best-effort mirrors
  // it to Supabase in the background.
  const patchProgram = useCallback(
    (id: string, patch: Record<string, unknown>, localPatch: Partial<SavedProgram>) => {
      setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, ...localPatch } : p)));

      if (!company?.id) return;

      supabase
        .from("programs")
        .update(patch)
        .eq("id", id)
        .eq("company_id", company.id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to update program in Supabase:", error);
          }
        });
    },
    [company?.id],
  );

  const archiveProgram = useCallback(
    (id: string) => {
      patchProgram(id, { status: "Archived", pinned: false }, { status: "Archived", pinned: false });
    },
    [patchProgram],
  );

  const unarchiveProgram = useCallback(
    (id: string) => {
      patchProgram(id, { status: "Planning" }, { status: "Planning" });
    },
    [patchProgram],
  );

  const deleteProgram = useCallback(
    (id: string) => {
      setPrograms((prev) => prev.filter((p) => p.id !== id));

      if (!company?.id) return;

      supabase
        .from("programs")
        .delete()
        .eq("id", id)
        .eq("company_id", company.id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to delete program in Supabase:", error);
          }
        });
    },
    [company?.id],
  );

  const pinProgram = useCallback(
    (id: string) => {
      const target = programs.find((p) => p.id === id);
      const nextPinned = !target?.pinned;
      patchProgram(id, { pinned: nextPinned }, { pinned: nextPinned });
    },
    [programs, patchProgram],
  );

  const updateProgram = useCallback(
    (id: string, patch: Partial<Pick<SavedProgram, "name" | "status" | "notes">>) => {
      patchProgram(id, patch, patch);
    },
    [patchProgram],
  );

  const value = useMemo(
    () => ({
      programs,
      loading,
      saveProgram,
      getProgram,
      duplicateProgram,
      archiveProgram,
      unarchiveProgram,
      deleteProgram,
      pinProgram,
      updateProgram,
    }),
    [
      programs,
      loading,
      saveProgram,
      getProgram,
      duplicateProgram,
      archiveProgram,
      unarchiveProgram,
      deleteProgram,
      pinProgram,
      updateProgram,
    ],
  );

  return <ProgramsContext.Provider value={value}>{children}</ProgramsContext.Provider>;
}

export function usePrograms(): ProgramsContextValue {
  const ctx = useContext(ProgramsContext);
  if (!ctx) throw new Error("usePrograms must be used inside <ProgramsProvider>");
  return ctx;
}
