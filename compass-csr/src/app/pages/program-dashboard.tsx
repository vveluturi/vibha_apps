import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Pencil,
  CheckCircle2,
  Users,
  Heart,
  CalendarDays,
  CalendarClock,
  ArrowUpRight,
  Sparkles,
  ArrowLeft,
  FileText,
  UserRound,
  Lightbulb,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { usePrograms } from "../context/programs-context";
import { loadPartnerships, partnershipKey } from "../lib/partnership-status";
import { loadTeamMembers, loadCurrentUser, type TeamMember } from "../lib/team";
import { MemberAvatar } from "../components/member-avatar";
import {
  TaskStatusDropdown,
  AssigneeControl,
  DeadlineEditor,
  DeadlineReminderBadge,
  TaskNoteInput,
} from "../components/task-controls";
import {
  getProgramTasks,
  setTaskState,
  generateAiSuggestedDeadlines,
  effectiveDeadline,
  daysFromToday,
  sortByDeadline,
  type TaskState,
  type TaskStatus,
} from "../lib/tasks";

// ─── Role ─────────────────────────────────────────────────────────────────────

type UserRole = "Admin" | "Member";
const USER_ROLE_KEY = "compass_user_role_v1";

function getUserRole(): UserRole {
  try {
    const raw = localStorage.getItem(USER_ROLE_KEY)?.trim().toLowerCase();
    return raw === "member" ? "Member" : "Admin";
  } catch {
    return "Admin";
  }
}

// ─── Custom tasks (Admin-added, live alongside AI-generated tasks) ────────────

interface CustomTask {
  id: string;
  programId: string;
  phaseLabel: string;
  text: string;
  assignedTo: string | null;
  deadline: string | null;
  status: TaskStatus;
  statusNote: string;
  createdAt: string;
}

const CUSTOM_TASKS_KEY = "compass_custom_tasks_v1";
const CUSTOM_TASK_PREFIX = "custom::";

function loadCustomTasksStore(): Record<string, CustomTask[]> {
  try {
    const raw = localStorage.getItem(CUSTOM_TASKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCustomTasksStore(store: Record<string, CustomTask[]>) {
  try {
    localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(store));
  } catch {
    // fail silently
  }
}

function loadCustomTasks(programId: string): CustomTask[] {
  return loadCustomTasksStore()[programId] ?? [];
}

function saveCustomTasks(programId: string, tasks: CustomTask[]) {
  const store = loadCustomTasksStore();
  store[programId] = tasks;
  saveCustomTasksStore(store);
}

function customTaskToTaskState(ct: CustomTask): TaskState {
  return {
    programId: ct.programId,
    taskId: `${CUSTOM_TASK_PREFIX}${ct.id}`,
    phaseLabel: ct.phaseLabel,
    taskText: ct.text,
    assignedTo: ct.assignedTo,
    deadline: ct.deadline,
    aiSuggestedDeadline: null,
    status: ct.status,
    statusNote: ct.statusNote,
  };
}

function isCustomTaskId(taskId: string): boolean {
  return taskId.startsWith(CUSTOM_TASK_PREFIX);
}

// ─── Task suggestions (Member-submitted, Admin-reviewed) ───────────────────────

interface TaskSuggestion {
  id: string;
  programId: string;
  description: string;
  phase: string;
  reason: string;
  suggestedBy: string;
  status: "pending" | "approved" | "dismissed";
  createdAt: string;
}

const SUGGESTIONS_KEY = "compass_task_suggestions_v1";
const SUGGESTION_PHASES = ["Foundation", "Planning", "Launch", "Expand"];

function loadSuggestions(): TaskSuggestion[] {
  try {
    const raw = localStorage.getItem(SUGGESTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSuggestions(list: TaskSuggestion[]) {
  try {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(list));
  } catch {
    // fail silently
  }
}

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  Active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Planning:  "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
  Archived:  "bg-muted text-muted-foreground border-border",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── AI suggestions derived from blueprint (unchanged) ────────────────────────

function getAISuggestions(programTypes: string[]) {
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

  if (programTypes.includes("Environmental Sustainability")) {
    defaults[0] = {
      icon: Heart,
      title: "Partner with an environmental nonprofit",
      desc: "Given your sustainability focus, connecting with a conservation org would strengthen your program's credibility.",
    };
  }
  if (programTypes.includes("Employee Volunteering")) {
    defaults[1] = {
      icon: Users,
      title: "Create a volunteer leaderboard",
      desc: "Friendly competition drives participation — teams with leaderboards log 3× more volunteer hours.",
    };
  }

  return defaults.map((s, i) => ({ ...s, icon: icons[i] }));
}

// ─── Task row (shared by Timeline + Team Tasks tabs) ──────────────────────────

function TaskRow({
  task,
  onUpdate,
  showPhase = false,
  custom = false,
}: {
  task: TaskState;
  onUpdate: (patch: Partial<TaskState>) => void;
  showPhase?: boolean;
  custom?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 transition-colors ${
        task.status === "blocked" ? "border-rose-300 bg-rose-50" : "border-border bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <div className="flex items-center gap-1.5">
          <TaskStatusDropdown value={task.status} onChange={(status) => onUpdate({ status })} />
          {custom && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-200">
              Custom
            </span>
          )}
        </div>
        {showPhase && <span className="text-xs text-muted-foreground">{task.phaseLabel}</span>}
      </div>
      <p className={`text-sm mb-2.5 leading-relaxed ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {task.taskText}
      </p>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <AssigneeControl assignedTo={task.assignedTo} onAssign={(name) => onUpdate({ assignedTo: name })} />
        <DeadlineEditor task={task} onSave={(deadline) => onUpdate({ deadline })} />
      </div>
      <TaskNoteInput value={task.statusNote} onChange={(statusNote) => onUpdate({ statusNote })} />
    </div>
  );
}

// ─── Add custom task inline form (Admin) ───────────────────────────────────────

function AddCustomTaskForm({
  teamMembers,
  onCancel,
  onSave,
}: {
  teamMembers: TeamMember[];
  onCancel: () => void;
  onSave: (fields: { text: string; assignedTo: string | null; deadline: string | null }) => void;
}) {
  const [text, setText] = useState("");
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [deadline, setDeadline] = useState("");

  function handleSave() {
    if (!text.trim()) return;
    onSave({
      text: text.trim(),
      assignedTo: assignedTo === "unassigned" ? null : assignedTo,
      deadline: deadline || null,
    });
  }

  return (
    <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2.5">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Task description"
        className="w-full text-sm px-2 py-1.5 rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger size="sm" className="h-8 text-xs w-auto min-w-[9rem]">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="h-8 text-xs px-2 rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!text.trim()}
          className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 px-3 text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Suggest a Task modal (Member) ─────────────────────────────────────────────

function SuggestTaskModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (fields: { description: string; phase: string; reason: string; suggestedBy: string }) => void;
}) {
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState(SUGGESTION_PHASES[0]);
  const [reason, setReason] = useState("");
  const [suggestedBy, setSuggestedBy] = useState(() => loadCurrentUser() ?? "");

  function handleSubmit() {
    if (!description.trim() || !suggestedBy.trim()) return;
    onSubmit({ description: description.trim(), phase, reason: reason.trim(), suggestedBy: suggestedBy.trim() });
    setDescription("");
    setReason("");
    setPhase(SUGGESTION_PHASES[0]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest a Task</DialogTitle>
          <DialogDescription>Send a task idea to your program Admin for review.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="suggest-desc">Task description</Label>
            <Textarea
              id="suggest-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What task would you suggest adding?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Which phase?</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUGGESTION_PHASES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suggest-reason">Why is this important? (optional)</Label>
            <Textarea
              id="suggest-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Help the Admin understand why this matters…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suggest-name">Your name</Label>
            <Input
              id="suggest-name"
              value={suggestedBy}
              onChange={(e) => setSuggestedBy(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || !suggestedBy.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Review Suggestions modal (Admin) ──────────────────────────────────────────

function ReviewSuggestionsDialog({
  open,
  onOpenChange,
  suggestions,
  onApprove,
  onDismiss,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: TaskSuggestion[];
  onApprove: (s: TaskSuggestion) => void;
  onDismiss: (s: TaskSuggestion) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Suggestions</DialogTitle>
          <DialogDescription>Review task ideas submitted by your team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending suggestions.</p>
          ) : (
            suggestions.map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-3.5 space-y-2">
                <p className="text-sm font-medium text-foreground">{s.description}</p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted font-medium text-foreground">
                    {s.phase}
                  </span>
                  <span>Suggested by {s.suggestedBy}</span>
                </div>
                {s.reason && <p className="text-xs text-muted-foreground italic">"{s.reason}"</p>}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => onApprove(s)}
                    className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Add to Timeline ✓
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDismiss(s)}
                    className="h-7 px-3 text-xs gap-1 text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" /> Dismiss ✗
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Upcoming Deadlines ────────────────────────────────────────────────────────

function UpcomingDeadlines({ tasks }: { tasks: TaskState[] }) {
  const relevant = sortByDeadline(
    tasks.filter((t) => {
      if (t.status === "done") return false;
      const d = effectiveDeadline(t);
      return d != null && daysFromToday(d) <= 7;
    }),
  );

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {relevant.length === 0 ? (
          <p className="text-sm text-muted-foreground py-1">Nothing due in the next 7 days.</p>
        ) : (
          <ul className="divide-y divide-border">
            {relevant.map((t) => (
              <li key={t.taskId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{t.taskText}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.phaseLabel}
                    {t.assignedTo ? ` · ${t.assignedTo}` : ""}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <DeadlineReminderBadge task={t} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Team Tasks tab ────────────────────────────────────────────────────────────

function TeamTasksTab({ tasks, onUpdate }: { tasks: TaskState[]; onUpdate: (task: TaskState, patch: Partial<TaskState>) => void }) {
  const members = loadTeamMembers();
  const unassigned = tasks.filter((t) => !t.assignedTo);

  if (members.length === 0 && unassigned.length === tasks.length) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="py-12 text-center">
          <UserRound className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No team members yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add teammates to assign and track tasks by person.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/team">Go to Team page</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {members.map((member) => {
        const memberTasks = tasks.filter((t) => t.assignedTo === member.name);
        return (
          <Card key={member.id} className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <MemberAvatar member={member} size="sm" />
                <div>
                  <CardTitle className="text-sm">{member.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {memberTasks.length} task{memberTasks.length !== 1 ? "s" : ""} assigned
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {memberTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tasks assigned yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {memberTasks.map((task) => (
                    <TaskRow
                      key={task.taskId}
                      task={task}
                      onUpdate={(patch) => onUpdate(task, patch)}
                      showPhase
                      custom={isCustomTaskId(task.taskId)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Unassigned */}
      <Card className="border-border border-dashed shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">
            Unassigned ({unassigned.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unassigned.length === 0 ? (
            <p className="text-xs text-muted-foreground">Every task has an owner.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unassigned.map((task) => (
                <TaskRow
                  key={task.taskId}
                  task={task}
                  onUpdate={(patch) => onUpdate(task, patch)}
                  showPhase
                  custom={isCustomTaskId(task.taskId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function ProgramDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProgram, updateProgram } = usePrograms();

  const program = id ? getProgram(id) : undefined;
  const role = getUserRole();

  const [tasks, setTasks] = useState<TaskState[]>(() => (program ? getProgramTasks(program) : []));
  const [customTasks, setCustomTasks] = useState<CustomTask[]>(() => (program ? loadCustomTasks(program.id) : []));
  const [generatingDeadlines, setGeneratingDeadlines] = useState(false);
  const [addTaskPhase, setAddTaskPhase] = useState<string | null>(null);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>(() => loadSuggestions());

  // Refresh tasks whenever the underlying program changes (e.g. navigating between programs)
  useEffect(() => {
    setTasks(program ? getProgramTasks(program) : []);
    setCustomTasks(program ? loadCustomTasks(program.id) : []);
  }, [program?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate AI-suggested deadlines once per program, only if any task is missing one
  useEffect(() => {
    if (!program) return;
    const hasMissing = getProgramTasks(program).some((t) => !t.aiSuggestedDeadline);
    if (!hasMissing) return;

    setGeneratingDeadlines(true);
    generateAiSuggestedDeadlines(program)
      .then(() => setTasks(getProgramTasks(program)))
      .catch((err) => {
        console.error("AI deadline suggestion failed:", err);
        toast.error("Couldn't generate AI-suggested deadlines");
      })
      .finally(() => setGeneratingDeadlines(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  const activePartnerNames = useMemo(() => {
    const names = new Set<string>();
    if (!program) return names;
    const all = loadPartnerships();
    const companyName = program.intake.step1.companyName;
    for (const n of program.blueprint.nonprofits) {
      if (all[partnershipKey(companyName, n.name)]?.status === "Active Partner") {
        names.add(n.name);
      }
    }
    return names;
  }, [program]);

  const allTasks = useMemo(
    () => [...tasks, ...customTasks.map(customTaskToTaskState)],
    [tasks, customTasks],
  );

  const teamMembers = useMemo(() => loadTeamMembers(), []);

  const pendingSuggestionsForProgram = useMemo(
    () => suggestions.filter((s) => s.programId === program?.id && s.status === "pending"),
    [suggestions, program?.id],
  );

  // Sync program status against whatever task data is already loaded — not
  // just after a live toggle. Without this, a program whose Planning-phase
  // tasks were already "done" before this page loaded (e.g. checked off via
  // the Blueprint checklist, or from data saved before this auto-status
  // feature existed) would never advance to "Active"/"Completed" until the
  // user happened to toggle some task again.
  useEffect(() => {
    if (!program || allTasks.length === 0) return;
    syncProgramStatus(allTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, program?.id]);

  if (!program) return <NotFound />;

  // Auto-advances the program's overall status based on task completion:
  // finishing every task in the Planning phase means the program is ready to
  // launch ("Active"); finishing every task in every phase means the program
  // is done ("Completed"). Never downgrades a manually-set status like
  // Archived, and never re-completes/re-activates a program that's already
  // past that stage.
  function syncProgramStatus(nextAllTasks: TaskState[]) {
    if (!program || nextAllTasks.length === 0 || program.status === "Archived") return;

    const allDone = nextAllTasks.every((t) => t.status === "done");
    if (allDone) {
      if (program.status !== "Completed") {
        updateProgram(program.id, { status: "Completed" });
      }
      return;
    }

    const planningTasks = nextAllTasks.filter((t) => t.phaseLabel === "Planning");
    const planningDone = planningTasks.length > 0 && planningTasks.every((t) => t.status === "done");
    if (planningDone && program.status === "Planning") {
      updateProgram(program.id, { status: "Active" });
    }
  }

  function handleTaskUpdate(task: TaskState, patch: Partial<TaskState>) {
    setTaskState(program!.id, task.phaseLabel, task.taskText, patch);
    const nextTasks = getProgramTasks(program!);
    setTasks(nextTasks);
    syncProgramStatus([...nextTasks, ...customTasks.map(customTaskToTaskState)]);
  }

  function handleCustomTaskUpdate(customId: string, patch: Partial<Pick<TaskState, "status" | "assignedTo" | "deadline" | "statusNote">>) {
    const updated = customTasks.map((ct) => (ct.id === customId ? { ...ct, ...patch } : ct));
    setCustomTasks(updated);
    saveCustomTasks(program!.id, updated);
    syncProgramStatus([...tasks, ...updated.map(customTaskToTaskState)]);
  }

  function handleAnyTaskUpdate(task: TaskState, patch: Partial<TaskState>) {
    if (isCustomTaskId(task.taskId)) {
      handleCustomTaskUpdate(task.taskId.slice(CUSTOM_TASK_PREFIX.length), patch);
    } else {
      handleTaskUpdate(task, patch);
    }
  }

  function markPhaseComplete(phaseLabel: string) {
    const aiPhaseTasks = tasks.filter((t) => t.phaseLabel === phaseLabel);
    for (const t of aiPhaseTasks) {
      setTaskState(program!.id, t.phaseLabel, t.taskText, { status: "done" });
    }
    const nextTasks = getProgramTasks(program!);
    setTasks(nextTasks);

    const updatedCustom = customTasks.map((ct) =>
      ct.phaseLabel === phaseLabel ? { ...ct, status: "done" as TaskStatus } : ct,
    );
    setCustomTasks(updatedCustom);
    saveCustomTasks(program!.id, updatedCustom);

    syncProgramStatus([...nextTasks, ...updatedCustom.map(customTaskToTaskState)]);

    toast.success(`${phaseLabel} marked complete`);
  }

  function handleAddCustomTask(phaseLabel: string, fields: { text: string; assignedTo: string | null; deadline: string | null }) {
    const newTask: CustomTask = {
      id: crypto.randomUUID(),
      programId: program!.id,
      phaseLabel,
      text: fields.text,
      assignedTo: fields.assignedTo,
      deadline: fields.deadline,
      status: "not_started",
      statusNote: "",
      createdAt: new Date().toISOString(),
    };
    const updated = [...customTasks, newTask];
    setCustomTasks(updated);
    saveCustomTasks(program!.id, updated);
    setAddTaskPhase(null);
  }

  function handleSubmitSuggestion(fields: { description: string; phase: string; reason: string; suggestedBy: string }) {
    const newSuggestion: TaskSuggestion = {
      id: crypto.randomUUID(),
      programId: program!.id,
      description: fields.description,
      phase: fields.phase,
      reason: fields.reason,
      suggestedBy: fields.suggestedBy,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const all = [...loadSuggestions(), newSuggestion];
    saveSuggestions(all);
    setSuggestions(all);
    setSuggestModalOpen(false);
    toast.success("Task suggestion submitted to your program Admin ✓");
  }

  function handleApproveSuggestion(suggestion: TaskSuggestion) {
    const newTask: CustomTask = {
      id: crypto.randomUUID(),
      programId: program!.id,
      phaseLabel: suggestion.phase,
      text: suggestion.description,
      assignedTo: null,
      deadline: null,
      status: "not_started",
      statusNote: "",
      createdAt: new Date().toISOString(),
    };
    const updatedCustom = [...customTasks, newTask];
    setCustomTasks(updatedCustom);
    saveCustomTasks(program!.id, updatedCustom);

    const updatedSuggestions = loadSuggestions().map((s) =>
      s.id === suggestion.id ? { ...s, status: "approved" as const } : s,
    );
    saveSuggestions(updatedSuggestions);
    setSuggestions(updatedSuggestions);

    toast.success(`Task added to ${suggestion.phase} timeline ✓`);
  }

  function handleDismissSuggestion(suggestion: TaskSuggestion) {
    const updatedSuggestions = loadSuggestions().map((s) =>
      s.id === suggestion.id ? { ...s, status: "dismissed" as const } : s,
    );
    saveSuggestions(updatedSuggestions);
    setSuggestions(updatedSuggestions);
    toast.success("Suggestion dismissed");
  }

  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.status === "done").length;

  const currentPhaseIndex = Math.min(
    program.blueprint.phases.length - 1,
    program.blueprint.phases.reduce((max, phase, i) => {
      const phaseTasks = allTasks.filter((t) => t.phaseLabel === phase.label);
      const allDone = phaseTasks.length > 0 && phaseTasks.every((t) => t.status === "done");
      return allDone ? Math.max(max, i) : max;
    }, 0),
  );

  const aiSuggestions = getAISuggestions(program.intake?.step2?.programTypes ?? []);
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
            {role === "Admin" && pendingSuggestionsForProgram.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReviewPanelOpen(true)}
                className="gap-1.5 bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                💡 {pendingSuggestionsForProgram.length} Suggestions Pending
              </Button>
            )}
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

            <Tabs defaultValue="timeline">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <TabsList>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="team-tasks">Team Tasks</TabsTrigger>
                </TabsList>
                {generatingDeadlines && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Suggesting deadlines…
                  </span>
                )}
              </div>

              <TabsContent value="timeline" className="space-y-6 mt-4">
                <UpcomingDeadlines tasks={allTasks} />

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Your 90-Day Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Phase connector */}
                    <div className="hidden md:flex items-center mb-2">
                      {program.blueprint.phases.map((phase, i) => {
                        const phaseTasks = allTasks.filter((t) => t.phaseLabel === phase.label);
                        const allDone = phaseTasks.length > 0 && phaseTasks.every((t) => t.status === "done");
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

                    {/* Phase sections */}
                    {program.blueprint.phases.map((phase) => {
                      const phaseTasks = allTasks.filter((t) => t.phaseLabel === phase.label);
                      const phaseDone = phaseTasks.length > 0 && phaseTasks.every((t) => t.status === "done");
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
                                onClick={() => markPhaseComplete(phase.label)}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                Mark phase complete
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {phaseTasks.map((task) => (
                              <TaskRow
                                key={task.taskId}
                                task={task}
                                onUpdate={(patch) => handleAnyTaskUpdate(task, patch)}
                                custom={isCustomTaskId(task.taskId)}
                              />
                            ))}
                          </div>
                          {role === "Admin" && (
                            addTaskPhase === phase.label ? (
                              <div className="mt-3">
                                <AddCustomTaskForm
                                  teamMembers={teamMembers}
                                  onCancel={() => setAddTaskPhase(null)}
                                  onSave={(fields) => handleAddCustomTask(phase.label, fields)}
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAddTaskPhase(phase.label)}
                                className="w-full mt-3 py-2 border-2 border-dashed border-primary/30 rounded-lg text-sm text-primary hover:border-primary/60 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 font-medium"
                              >
                                + Add Task to {phase.label}
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team-tasks" className="mt-4">
                <TeamTasksTab tasks={allTasks} onUpdate={handleAnyTaskUpdate} />
              </TabsContent>
            </Tabs>
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
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Link
                        to={`/partnerships/${encodeURIComponent(name)}`}
                        state={{ cause }}
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                      >
                        View <ArrowUpRight className="h-3 w-3" />
                      </Link>
                      {activePartnerNames.has(name) && (
                        <Link
                          to={`/partnerships/${encodeURIComponent(name)}?scroll=activity`}
                          className="text-xs text-primary hover:underline"
                        >
                          Log Activity
                        </Link>
                      )}
                    </div>
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
            <ProgramNotesCard programId={program.id} />
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

        {/* ── Suggest a Task (Member) ── */}
        {role === "Member" && (
          <div className="flex justify-center pt-2 pb-4">
            <Button variant="outline" onClick={() => setSuggestModalOpen(true)} className="gap-1.5">
              <Lightbulb className="h-4 w-4" /> Suggest a Task
            </Button>
          </div>
        )}

      </div>

      <SuggestTaskModal open={suggestModalOpen} onOpenChange={setSuggestModalOpen} onSubmit={handleSubmitSuggestion} />
      <ReviewSuggestionsDialog
        open={reviewPanelOpen}
        onOpenChange={setReviewPanelOpen}
        suggestions={pendingSuggestionsForProgram}
        onApprove={handleApproveSuggestion}
        onDismiss={handleDismissSuggestion}
      />
    </div>
  );
}

// ─── Program notes (bullet list, one localStorage entry per program) ──────────

interface ProgramNote {
  id: string;
  text: string;
  createdAt: string;
}

const NOTES_KEY = "compass_notes_v1";

function loadNotesStore(): Record<string, ProgramNote[]> {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveNotesStore(store: Record<string, ProgramNote[]>) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(store));
  } catch { /* silent */ }
}

function loadProgramNotes(programId: string): ProgramNote[] {
  return loadNotesStore()[programId] ?? [];
}

function saveProgramNotes(programId: string, notes: ProgramNote[]) {
  const store = loadNotesStore();
  store[programId] = notes;
  saveNotesStore(store);
}

function ProgramNotesCard({ programId }: { programId: string }) {
  const [notes, setNotes] = useState<ProgramNote[]>(() => loadProgramNotes(programId));
  const [draft, setDraft] = useState("");

  function handleAddNote() {
    if (!draft.trim()) return;
    const newNote: ProgramNote = {
      id: crypto.randomUUID(),
      text: draft.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...notes, newNote];
    setNotes(updated);
    saveProgramNotes(programId, updated);
    setDraft("");
    toast.success("Note added ✓");
  }

  function handleDeleteNote(id: string) {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveProgramNotes(programId, updated);
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Program Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet — add your first note below</p>
        ) : (
          <ul className="space-y-2.5">
            {notes.map((note) => (
              <li key={note.id} className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground break-words">{note.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(note.createdAt).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  aria-label="Delete note"
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <textarea
          rows={2}
          placeholder="Add a note..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-border bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
        />
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={!draft.trim()}
          className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-3"
        >
          Add Note
        </Button>
      </CardContent>
    </Card>
  );
}
