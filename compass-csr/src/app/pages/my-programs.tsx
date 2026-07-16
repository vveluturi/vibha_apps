import { useNavigate } from "react-router";
import { FolderKanban, Pin, PlusCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ProgramCard } from "../components/program-card";
import { usePrograms } from "../context/programs-context";
import { useWizard } from "../context/wizard-context";
import type { SavedProgram } from "../types/program";

type UserRole = "Admin" | "Member";
const USER_ROLE_KEY = "compass_user_role_v1";

function getUserRole(): UserRole {
  try {
    const raw = localStorage.getItem(USER_ROLE_KEY);
    return raw === "Member" ? "Member" : "Admin";
  } catch {
    return "Admin";
  }
}

export function MyPrograms() {
  const navigate = useNavigate();
  const { programs } = usePrograms();
  const { restoreIntake, resetWizard } = useWizard();
  const role = getUserRole();

  // Split programs into groups
  const pinnedPrograms = programs.filter((p) => p.pinned && p.status !== "Archived");
  const activePrograms = programs.filter((p) => !p.pinned && p.status !== "Archived");
  const archivedPrograms = programs.filter((p) => p.status === "Archived");

  function handleEdit(program: SavedProgram) {
    restoreIntake(program.intake);
    navigate("/new-program");
  }

  // Reset wizard state so new program always starts blank
  function handleNewProgram() {
    resetWizard();
    navigate("/new-program");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">My Programs</h1>
          <p className="text-muted-foreground">
            View and manage all your CSR programs in one place
          </p>
        </div>
        {role === "Admin" && (
          <Button onClick={handleNewProgram} className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="h-4 w-4" /> New Program
          </Button>
        )}
      </div>

      {/* Empty state */}
      {programs.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FolderKanban className="h-6 w-6 text-primary" />
              <CardTitle>Program List</CardTitle>
            </div>
            <CardDescription>
              All your active and completed CSR programs
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-4">No programs to display</p>
            <Button variant="outline" onClick={handleNewProgram}>
              Create your first program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">

          {/* ── Pinned section ── */}
          {pinnedPrograms.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Pin className="h-4 w-4 text-primary fill-primary" />
                <h2 className="text-sm font-semibold text-primary uppercase tracking-widest">
                  Pinned
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pinnedPrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onEdit={handleEdit}
                    pinned={true}
                  />
                ))}
              </div>

              {/* Divider between pinned and regular */}
              {activePrograms.length > 0 && (
                <div className="mt-8 border-t border-border" />
              )}
            </section>
          )}

          {/* ── Active programs ── */}
          {activePrograms.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Programs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activePrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onEdit={handleEdit}
                    pinned={false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Archived ── */}
          {archivedPrograms.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Archived
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {archivedPrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onEdit={handleEdit}
                    pinned={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}