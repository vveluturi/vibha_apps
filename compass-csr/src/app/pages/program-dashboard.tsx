import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  Pencil,
  CheckCircle2,
  Circle,
  Users,
  Heart,
  CalendarDays,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Clock,
  Check,
  MessageSquare,
  FileEdit,
  UserPlus,
  Handshake,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { usePrograms } from "../context/programs-context";
import type { SavedProgram, BlueprintPhase } from "../types/program";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  phaseIndex: number;
  phaseLabel: string;
  label: string;
  done: boolean;
  dueDate: string;
}

// ─── Storage for task state ───────────────────────────────────────────────────

function loadTaskState(programId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`compass_tasks_${programId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveTaskState(programId: string, state: Record<string, boolean>) {
  try {
    localStorage.setItem(`compass_tasks_${programId}`, JSON.stringify(state));
  } catch { /* silent */ }
}

function loadNotes(programId: string): string {
  try {
    return localStorage.getItem(`compass_notes_${programId}`) ?? "";
  } catch { return ""; }
}

function saveNotes(programId: string, notes: string) {
  try {
    localStorage.setItem(`compass_notes_${programId}`, notes);
  } catch { /* silent */ }
}

// ─── Build tasks from blueprint phases ───────────────────────────────────────

function buildTasks(phases: BlueprintPhase[]): Task[] {
  const tasks: Task[] = [];
  phases.forEach((phase, phaseIndex) => {
    phase.tasks.forEach((label, taskIndex) => {
      tasks.push({
        id: `${phaseIndex}-${taskIndex}`,
        phaseIndex,
        phaseLabel: phase.label,
        label,
        done: false,
        dueDate: "",
      });
    });
  });
  return tasks;
}

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  Active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Planning:  "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
  Archived:  "bg-muted text-muted-foreground border-border",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TaskCheckbox({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
        done
          ? "bg-primary border-primary"
          : "border-muted-foreground/40 bg-white hover:border-primary/60"
      }`}
    >
      {done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
    </button>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <div className="p-1.5 bg-muted rounded-md">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
        <p className="text-2xl font-semibold text-foreground leading-none mb-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Not found screen ─────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Program not found</h1>
      <p className="text-muted-foreground mb-6">
        This program may have been deleted or the link is invalid.
      </p>
      <Button asChild variant="outline">
        <Link to="/my-programs">Back to My Programs</Link>
      </Button>
    </div>
  );
}

// ─── AI suggestions derived from blueprint ────────────────────────────────────

function getAISuggestions(program: SavedProgram) {
  const icons = [Heart, Users, Sparkles];
  const defaults = [
    {
      icon: Heart,
      title: "Add a third nonprofit partner",
      desc: "Diversifying your nonprofit partnerships increases employee engagement and community reach.",
    },
    {
      icon: Users,
      title: "Launch a peer-to-peer fundraising campaign",
      desc: "Teams that add employee-led fundraising see 2.4× more engagement in months 2 and 3.",
    },
    {
      icon: Sparkles,
      title: "Set up your ESG reporting dashboard",
      desc: "You're collecting data that qualifies for GRI standards. Start tracking now for your first impact report.",
    },
  ];

  // Personalise slightly based on program types
  const types = program.intake?.step2?.programTypes ?? [];
  if (types.includes("Environmental Sustainability")) {
    defaults[0] = {
      icon: Heart,
      title: "Partner with an environmental nonprofit",
      desc: "Given your sustainability focus, connecting with a conservation org would strengthen your program's credibility.",
    };
  }
  if (types.includes("Employee Volunteering")) {
    defaults[1] = {
      icon: Users,
      title: "Create a volunteer leaderboard",
      desc: "Friendly competition drives participation — teams with leaderboards log 3× more volunteer hours.",
    };
  }

  return defaults.map((s, i) => ({ ...s, icon: icons[i] }));
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function ProgramDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProgram, updateProgram } = usePrograms();

  const program = id ? getProgram(id) : undefined;

  // Task state — persisted per program
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>(() =>
    id ? loadTaskState(id) : {}
  );
  const [notes, setNotes] = useState(() => (id ? loadNotes(id) : ""));

  useEffect(() => {
    if (id) saveTaskState(id, taskDone);
  }, [id, taskDone]);

  if (!program) return <NotFound />;

  const tasks = buildTasks(program.blueprint.phases);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => taskDone[t.id]).length;

  const currentPhaseIndex = Math.min(
    program.blueprint.phases.length - 1,
    tasks.reduce((max, t) => (taskDone[t.id] ? Math.max(max, t.phaseIndex) : max), 0)
  );

  const upcomingTasks = tasks.filter((t) => !taskDone[t.id]).slice(0, 5);

  function toggleTask(id: string) {
    setTaskDone((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function markPhaseComplete(phaseIndex: number) {
    const updates: Record<string, boolean> = { ...taskDone };
    tasks.filter((t) => t.phaseIndex === phaseIndex).forEach((t) => {
      updates[t.id] = true;
    });
    setTaskDone(updates);
  }

  function handleSaveNotes() {
    if (id) saveNotes(id, notes);
  }

  const aiSuggestions = getAISuggestions(program);
  const statusStyle = STATUS_STYLES[program.status] ?? STATUS_STYLES.Planning;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate("/my-programs")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> My Programs
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground leading-tight">
                {program.name}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle}`}>
                {program.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {program.intake.step1.companyName} · Created{" "}
              {new Date(program.createdAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start">
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={`/programs/${program.id}/blueprint`}>
                <FileText className="h-4 w-4" /> View Blueprint
              </Link>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => updateProgram(program.id, {
                status: program.status === "Planning" ? "Active" : program.status,
              })}
            >
              <Pencil className="h-4 w-4" /> Edit Program
            </Button>
          </div>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Timeline Progress"
            value={`Phase ${currentPhaseIndex + 1} of ${program.blueprint.phases.length}`}
            sub={program.blueprint.phases[currentPhaseIndex]?.label}
            icon={CalendarDays}
          />
          <MetricCard
            label="Tasks Completed"
            value={`${doneTasks} of ${totalTasks}`}
            sub={`${totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% complete`}
            icon={CheckCircle2}
          />
          <MetricCard
            label="Program Focus"
            value={String(program.intake.step2.programTypes.length)}
            sub={program.intake.step2.programTypes[0] ?? "No focus selected"}
            icon={Users}
          />
          <MetricCard
            label="Nonprofit Partners"
            value={String(program.blueprint.nonprofits.length)}
            sub="recommended partners"
            icon={Heart}
          />
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* LEFT */}
          <div className="space-y-6">

            {/* 90-Day Timeline */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your 90-Day Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phase connector */}
                <div className="hidden md:flex items-center mb-2">
                  {program.blueprint.phases.map((phase, i) => {
                    const phaseTasks = tasks.filter((t) => t.phaseIndex === i);
                    const allDone = phaseTasks.length > 0 && phaseTasks.every((t) => taskDone[t.id]);
                    return (
                      <div key={phase.label} className="flex-1 flex items-center">
                        <div className="flex-1 flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ring-4 ring-white z-10 transition-all ${allDone ? phase.dot : "bg-border"}`} />
                          <p className="text-xs font-semibold text-foreground mt-1.5">{phase.label}</p>
                          <p className="text-xs text-muted-foreground">{phase.range}</p>
                        </div>
                        {i < program.blueprint.phases.length - 1 && (
                          <div className="flex-1 h-px bg-border -mx-1" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Phase blocks */}
                {program.blueprint.phases.map((phase, phaseIndex) => {
                  const phaseTasks = tasks.filter((t) => t.phaseIndex === phaseIndex);
                  const phaseDone = phaseTasks.every((t) => taskDone[t.id]);
                  return (
                    <div key={phase.label} className={`rounded-lg border p-4 ${phase.color}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-xs font-semibold text-foreground">{phase.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{phase.range}</span>
                        </div>
                        {phaseDone ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                          </span>
                        ) : (
                          <button
                            onClick={() => markPhaseComplete(phaseIndex)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Mark phase complete
                          </button>
                        )}
                      </div>
                      <ul className="space-y-2">
                        {phaseTasks.map((task) => (
                          <li key={task.id} className="flex items-center gap-2.5">
                            <TaskCheckbox
                              done={!!taskDone[task.id]}
                              onClick={() => toggleTask(task.id)}
                            />
                            <span className={`text-sm flex-1 leading-relaxed ${taskDone[task.id] ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {task.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Upcoming Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length === 0 ? (
                  <div className="py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">All tasks complete!</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {upcomingTasks.map((task) => (
                      <li key={task.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <TaskCheckbox done={!!taskDone[task.id]} onClick={() => toggleTask(task.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{task.label}</p>
                          <p className="text-xs text-muted-foreground">{task.phaseLabel}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Clock className="h-3 w-3" />
                          {task.phaseLabel}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-5">

            {/* Nonprofit Partners from blueprint */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Nonprofit Partners</CardTitle>
                  <Link to="/nonprofit-partners" className="text-xs text-primary hover:underline">
                    Browse more
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {program.blueprint.nonprofits.map(({ name, cause, color }) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${color}`}>
                        {cause}
                      </span>
                    </div>
                    <button className="text-xs text-primary hover:underline flex-shrink-0 flex items-center gap-0.5">
                      View <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Program Details */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Program Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Industry</span>
                    <span className="font-medium text-foreground text-right">{program.intake.step1.industry}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Company size</span>
                    <span className="font-medium text-foreground text-right">{program.intake.step1.companySize}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium text-foreground text-right">{program.intake.step2.budget || "Not set"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Timeline</span>
                    <span className="font-medium text-foreground text-right">{program.intake.step2.timeline || "Not set"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Program lead</span>
                    <span className="font-medium text-foreground text-right">{program.intake.step3.programLeader || "Not set"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Program Notes */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Program Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  rows={5}
                  placeholder="Add notes for your team — strategy decisions, reminders, open questions…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
                {notes.length > 0 && (
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-3"
                    >
                      Save Note
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Expand Your Program ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Expand Your Program</h2>
            <span className="text-xs text-muted-foreground">— AI-suggested next steps</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiSuggestions.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-border shadow-sm hover:border-primary/30 transition-colors group">
                <CardContent className="pt-5 space-y-3">
                  <div className="p-2 bg-primary/10 rounded-md w-fit">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                  <button className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                    Learn more <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}