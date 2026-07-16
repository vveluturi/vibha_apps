import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronDown, ClipboardList, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { usePrograms } from "../context/programs-context";
import { loadTeamMembers, loadCurrentUser, saveCurrentUser } from "../lib/team";
import { MemberAvatar, NameAvatar } from "../components/member-avatar";
import { TaskStatusDropdown, DeadlineReminderBadge, TaskNoteInput } from "../components/task-controls";
import {
  getTasksGroupedByProgram,
  getTeamTaskStats,
  setTaskState,
  sortByDeadline,
  isOverdue,
  isDueThisWeek,
  type TaskState,
} from "../lib/tasks";

type Filter = "all" | "overdue" | "due_this_week" | "blocked" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_this_week", label: "Due This Week" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
];

function matchesFilter(task: TaskState, filter: Filter): boolean {
  switch (filter) {
    case "overdue": return isOverdue(task);
    case "due_this_week": return isDueThisWeek(task);
    case "blocked": return task.status === "blocked";
    case "done": return task.status === "done";
    default: return true;
  }
}

export function MyTasks() {
  const { programs } = usePrograms();
  const [members] = useState(() => loadTeamMembers());
  const [currentUser, setCurrentUser] = useState<string | null>(() => loadCurrentUser());
  const [filter, setFilter] = useState<Filter>("all");
  const [, forceRefresh] = useState(0);

  const groups = useMemo(() => getTasksGroupedByProgram(programs), [programs]);

  const myTasksByProgram = useMemo(() => {
    if (!currentUser) return [];
    return groups
      .map((g) => ({ program: g.program, tasks: sortByDeadline(g.tasks.filter((t) => t.assignedTo === currentUser)) }))
      .filter((g) => g.tasks.length > 0);
  }, [groups, currentUser]);

  const allMyTasks = useMemo(() => myTasksByProgram.flatMap((g) => g.tasks), [myTasksByProgram]);

  const summary = useMemo(() => ({
    total: allMyTasks.length,
    overdue: allMyTasks.filter(isOverdue).length,
    dueThisWeek: allMyTasks.filter(isDueThisWeek).length,
    inProgress: allMyTasks.filter((t) => t.status === "in_progress").length,
  }), [allMyTasks]);

  const teamStats = useMemo(
    () => getTeamTaskStats(programs, members.map((m) => m.name)),
    [programs, members],
  );

  function handleSelectUser(name: string) {
    setCurrentUser(name);
    saveCurrentUser(name);
  }

  function handleUpdate(programId: string, task: TaskState, patch: Partial<TaskState>) {
    setTaskState(programId, task.phaseLabel, task.taskText, patch);
    forceRefresh((n) => n + 1);
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground leading-tight">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Everything assigned to you, across every program.
            </p>
          </div>

          {members.length === 0 ? (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Add yourself to the Team page first</p>
              <Link to="/team" className="text-sm text-primary hover:underline font-medium">
                Go to Team →
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Who are you?</span>
              <Select value={currentUser ?? undefined} onValueChange={handleSelectUser}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      <span className="inline-flex items-center gap-2">
                        <MemberAvatar member={m} size="xs" /> {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Personal task view */}
        {!currentUser ? (
          <Card className="border-border shadow-sm">
            <CardContent className="py-12 text-center">
              <UserRound className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Select who you are to see your tasks</p>
              <p className="text-sm text-muted-foreground">
                Use the dropdown above to pick your name from the team.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-foreground">
                You have <span className="font-semibold">{summary.total}</span> task{summary.total !== 1 ? "s" : ""} —{" "}
                <span className="font-semibold text-rose-600">{summary.overdue} overdue</span>,{" "}
                <span className="font-semibold text-amber-600">{summary.dueThisWeek} due this week</span>,{" "}
                <span className="font-semibold text-blue-600">{summary.inProgress} in progress</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filter === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {myTasksByProgram.length === 0 ? (
              <Card className="border-border shadow-sm">
                <CardContent className="py-10 text-center">
                  <ClipboardList className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tasks assigned to you yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myTasksByProgram.map(({ program, tasks }) => {
                  const filtered = tasks.filter((t) => matchesFilter(t, filter));
                  if (filtered.length === 0) return null;
                  return (
                    <Collapsible key={program.id} defaultOpen>
                      <Card className="border-border shadow-sm">
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center justify-between px-6 py-4 text-left">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{program.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {filtered.length} task{filtered.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-2.5">
                            {filtered.map((task) => (
                              <div
                                key={task.taskId}
                                className={`rounded-md border p-3 ${
                                  task.status === "blocked" ? "border-rose-300 bg-rose-50" : "border-border bg-white"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                  <TaskStatusDropdown
                                    value={task.status}
                                    onChange={(status) => handleUpdate(program.id, task, { status })}
                                  />
                                  <span className="text-xs text-muted-foreground">{task.phaseLabel}</span>
                                </div>
                                <p className={`text-sm mb-2 leading-relaxed ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {task.taskText}
                                </p>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <DeadlineReminderBadge task={task} />
                                </div>
                                <TaskNoteInput
                                  value={task.statusNote}
                                  onChange={(statusNote) => handleUpdate(program.id, task, { statusNote })}
                                />
                              </div>
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Team Overview */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Team Overview</h2>
          <Card className="border-border shadow-sm overflow-hidden">
            {teamStats.length === 0 ? (
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No team members yet. <Link to="/team" className="text-primary hover:underline font-medium">Add your team</Link> to see task distribution.
                </p>
              </CardContent>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Team Member</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Tasks Assigned</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Overdue</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">In Progress</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map((stat) => (
                    <tr
                      key={stat.name}
                      onClick={() => handleSelectUser(stat.name)}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 font-medium text-foreground">
                          <NameAvatar name={stat.name} size="xs" /> {stat.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{stat.total}</td>
                      <td className="px-4 py-2.5">
                        <span className={stat.overdue > 0 ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                          {stat.overdue}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-blue-600">{stat.inProgress}</td>
                      <td className="px-4 py-2.5 text-emerald-600">{stat.done}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
