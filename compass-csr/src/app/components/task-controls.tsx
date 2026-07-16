import { useState } from "react";
import { Link } from "react-router";
import { Circle, RotateCw, AlertTriangle, CheckCircle2, UserPlus, X, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { MemberAvatar, NameAvatar } from "./member-avatar";
import { loadTeamMembers } from "../lib/team";
import {
  effectiveDeadline,
  isOverdue,
  isDueToday,
  formatShortDate,
  type TaskState,
  type TaskStatus,
} from "../lib/tasks";

// ─── Status ───────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Circle; className: string }> = {
  not_started: { label: "Not Started", icon: Circle, className: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: RotateCw, className: "text-blue-600" },
  blocked: { label: "Blocked", icon: AlertTriangle, className: "text-rose-600" },
  done: { label: "Done", icon: CheckCircle2, className: "text-emerald-600" },
};

const STATUS_ORDER: TaskStatus[] = ["not_started", "in_progress", "blocked", "done"];

export function TaskStatusDropdown({ value, onChange }: { value: TaskStatus; onChange: (s: TaskStatus) => void }) {
  const config = STATUS_CONFIG[value];
  const Icon = config.icon;
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TaskStatus)}>
      <SelectTrigger size="sm" className={`h-7 gap-1.5 px-2 text-xs w-auto border-transparent bg-transparent hover:bg-muted ${config.className}`}>
        <span className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {config.label}
        </span>
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => {
          const c = STATUS_CONFIG[s];
          const I = c.icon;
          return (
            <SelectItem key={s} value={s}>
              <span className={`inline-flex items-center gap-1.5 ${c.className}`}>
                <I className="h-3.5 w-3.5" /> {c.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const c = STATUS_CONFIG[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.className}`}>
      <Icon className="h-3.5 w-3.5" /> {c.label}
    </span>
  );
}

// ─── Assignee ─────────────────────────────────────────────────────────────────

export function AssigneeControl({
  assignedTo,
  onAssign,
}: {
  assignedTo: string | null;
  onAssign: (name: string | null) => void;
}) {
  const [members] = useState(() => loadTeamMembers());
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {assignedTo ? (
            <>
              <NameAvatar name={assignedTo} size="xs" />
              <span className="text-foreground">{assignedTo}</span>
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" /> Assign
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        {members.length === 0 ? (
          <div className="text-center py-2 space-y-1.5">
            <p className="text-xs text-muted-foreground">No team members yet</p>
            <Link to="/team" className="text-xs text-primary hover:underline font-medium">
              Add team members first
            </Link>
          </div>
        ) : (
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {assignedTo && (
              <button
                type="button"
                onClick={() => {
                  onAssign(null);
                  setOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted flex items-center gap-1.5"
              >
                <X className="h-3 w-3" /> Unassign
              </button>
            )}
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onAssign(m.name);
                  setOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 hover:bg-muted transition-colors ${
                  m.name === assignedTo ? "bg-accent/40 font-medium text-foreground" : "text-foreground"
                }`}
              >
                <MemberAvatar member={m} size="xs" /> {m.name}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Deadline ─────────────────────────────────────────────────────────────────

// Inline click-to-edit deadline. AI-suggested-only deadlines render gray with
// a sparkles icon; once a user sets/edits one it renders in primary color.
export function DeadlineEditor({ task, onSave }: { task: TaskState; onSave: (dateISO: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const effective = effectiveDeadline(task);
  const isAiOnly = !task.deadline && !!task.aiSuggestedDeadline;

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={effective ?? ""}
        onBlur={(e) => {
          setEditing(false);
          onSave(e.target.value || null);
        }}
        className="text-xs border border-border rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
    );
  }

  if (!effective) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground hover:text-primary underline decoration-dotted underline-offset-2"
      >
        Set deadline
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`inline-flex items-center gap-1 text-xs hover:underline underline-offset-2 ${
        isAiOnly ? "text-muted-foreground" : "text-primary font-medium"
      }`}
      title={isAiOnly ? "AI-suggested deadline — click to set your own" : "Click to edit deadline"}
    >
      {isAiOnly && <Sparkles className="h-3 w-3" />}
      {formatShortDate(effective)}
    </button>
  );
}

// Read-only reminder pill for lists (Upcoming Deadlines, My Tasks, Weekly Digest).
export function DeadlineReminderBadge({ task }: { task: TaskState }) {
  const d = effectiveDeadline(task);
  if (!d) return <span className="text-xs text-muted-foreground">No deadline</span>;

  if (isOverdue(task)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
        Overdue · {formatShortDate(d)}
      </span>
    );
  }
  if (isDueToday(task)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        Due Today
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{formatShortDate(d)}</span>;
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export function TaskNoteInput({
  value,
  onChange,
  placeholder = "Add a note…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-xs px-2 py-1 rounded border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition"
    />
  );
}
