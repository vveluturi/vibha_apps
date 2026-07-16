import { useMemo, useRef } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Mail, Download, CheckCircle2, AlertTriangle, Handshake, TrendingUp, Trophy, CalendarClock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { usePrograms } from "../context/programs-context";
import { loadTeamMembers } from "../lib/team";
import { NameAvatar } from "../components/member-avatar";
import { useCompanyName } from "../lib/settings";
import { exportElementToPdf } from "../lib/pdf-export";
import { loadPartnerships, type PartnershipRecord } from "../lib/partnership-status";
import { loadActivityLog } from "../lib/partnership-activity";
import {
  getAllProgramTasks,
  getProgramTasks,
  effectiveDeadline,
  daysFromToday,
  isDueThisWeek,
  sortByDeadline,
  todayISO,
} from "../lib/tasks";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Planning: "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
  Archived: "bg-muted text-muted-foreground border-border",
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfWeek(dateISO: string): Date {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isInRange(dateISO: string | undefined, startISO: string, endISO: string): boolean {
  if (!dateISO) return false;
  const d = dateISO.slice(0, 10);
  return d >= startISO && d <= endISO;
}

function formatWeekRange(startISO: string, endISO: string): string {
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const endStr = sameMonth
    ? end.toLocaleDateString("en-US", { day: "numeric" })
    : end.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${startStr} - ${endStr}, ${end.getFullYear()}`;
}

function formatShort(dateISO: string): string {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Small UI pieces ────────────────────────────────────────────────────────

function StatPill({ label, value, tone }: { label: string; value: number; tone: "neutral" | "rose" | "emerald" | "amber" }) {
  const toneClass = {
    neutral: "text-foreground",
    rose: "text-rose-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  }[tone];
  return (
    <div className="flex-1 min-w-[120px] rounded-lg border border-border bg-white px-4 py-3">
      <p className={`text-2xl font-semibold leading-none ${toneClass}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function WeeklyDigest() {
  const { programs } = usePrograms();
  const companyName = useCompanyName();
  const digestRef = useRef<HTMLDivElement>(null);

  const today = todayISO();
  const weekStartISO = useMemo(() => toISO(startOfWeek(today)), [today]);
  const weekEndISO = useMemo(() => toISO(addDays(startOfWeek(today), 6)), [today]);

  const allTasks = useMemo(() => getAllProgramTasks(programs), [programs]);
  const partnerships = useMemo(() => loadPartnerships(), []);
  const activityLog = useMemo(() => loadActivityLog(), []);

  const tasksCompletedThisWeek = useMemo(
    () =>
      allTasks.filter((t) => {
        const d = effectiveDeadline(t);
        return t.status === "done" && d && isInRange(d, weekStartISO, weekEndISO);
      }),
    [allTasks, weekStartISO, weekEndISO],
  );

  const tasksBecameOverdueThisWeek = useMemo(
    () =>
      allTasks.filter((t) => {
        const d = effectiveDeadline(t);
        return t.status !== "done" && d && isInRange(d, weekStartISO, weekEndISO) && daysFromToday(d) < 0;
      }),
    [allTasks, weekStartISO, weekEndISO],
  );

  const blockedTasks = useMemo(() => allTasks.filter((t) => t.status === "blocked"), [allTasks]);

  const partnershipList = useMemo(() => Object.values(partnerships), [partnerships]);

  const newPartnershipsThisWeek = useMemo(
    () => partnershipList.filter((p) => p.activePartnerDetails?.startDate && isInRange(p.activePartnerDetails.startDate, weekStartISO, weekEndISO)),
    [partnershipList, weekStartISO, weekEndISO],
  );

  const changedStatusThisWeek = useMemo(
    () => partnershipList.filter((p) => isInRange(p.updatedAt, weekStartISO, weekEndISO)),
    [partnershipList, weekStartISO, weekEndISO],
  );

  const activePartnershipsWithRecentActivity = useMemo(() => {
    const activeKeys = new Set(
      Object.entries(partnerships)
        .filter(([, r]) => r.status === "Active Partner")
        .map(([k]) => k),
    );
    const recentEntries = activityLog.filter((e) => isInRange(e.date, weekStartISO, weekEndISO) && activeKeys.has(e.partnershipKey));
    const byKey = new Map<string, { record: PartnershipRecord; count: number }>();
    for (const entry of recentEntries) {
      const record = partnerships[entry.partnershipKey];
      if (!record) continue;
      const existing = byKey.get(entry.partnershipKey);
      if (existing) existing.count++;
      else byKey.set(entry.partnershipKey, { record, count: 1 });
    }
    return Array.from(byKey.values());
  }, [activityLog, partnerships, weekStartISO, weekEndISO]);

  const teamSpotlight = useMemo(() => {
    const members = loadTeamMembers();
    const counts = new Map<string, number>();
    for (const t of tasksCompletedThisWeek) {
      if (!t.assignedTo) continue;
      counts.set(t.assignedTo, (counts.get(t.assignedTo) ?? 0) + 1);
    }
    let top: { name: string; count: number } | null = null;
    for (const [name, count] of counts) {
      if (!top || count > top.count) top = { name, count };
    }
    return { top, members };
  }, [tasksCompletedThisWeek]);

  const upcomingByProgram = useMemo(() => {
    return programs
      .map((program) => ({
        program,
        tasks: sortByDeadline(getProgramTasks(program).filter((t) => isDueThisWeek(t))),
      }))
      .filter((g) => g.tasks.length > 0);
  }, [programs]);

  const activePrograms = useMemo(() => programs.filter((p) => p.status === "Active"), [programs]);

  function handleSendEmail() {
    const subject = `Compass CSR Weekly Digest — Week of ${formatShort(weekStartISO)}`;
    const bodyLines = [
      `Compass CSR Weekly Digest — ${formatWeekRange(weekStartISO, weekEndISO)}`,
      "",
      "THIS WEEK'S SUMMARY",
      `- Tasks completed: ${tasksCompletedThisWeek.length}`,
      `- Tasks became overdue: ${tasksBecameOverdueThisWeek.length}`,
      `- New partnerships started: ${newPartnershipsThisWeek.length}`,
      `- Currently blocked: ${blockedTasks.length}`,
      "",
      "BY PROGRAM",
      ...(activePrograms.length === 0
        ? ["No active programs."]
        : activePrograms.flatMap((p) => {
            const tasks = getProgramTasks(p);
            const done = tasks.filter((t) => t.status === "done").length;
            const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
            return [`- ${p.name} (${pct}% complete)`];
          })),
      "",
      "TEAM SPOTLIGHT",
      teamSpotlight.top
        ? `- ${teamSpotlight.top.name} completed ${teamSpotlight.top.count} task${teamSpotlight.top.count === 1 ? "" : "s"} this week`
        : "- No task completions logged this week yet.",
      "",
      "UPCOMING NEXT WEEK",
      ...(upcomingByProgram.length === 0
        ? ["Nothing due in the next 7 days."]
        : upcomingByProgram.flatMap((g) => [
            `- ${g.program.name}:`,
            ...g.tasks.map((t) => `   • ${t.taskText}${t.assignedTo ? ` (${t.assignedTo})` : ""} — ${effectiveDeadline(t) ? formatShort(effectiveDeadline(t)!) : ""}`),
          ])),
      "",
      "NONPROFIT PARTNERSHIPS UPDATE",
      `- ${changedStatusThisWeek.length} partnership record(s) changed status this week`,
      `- ${activePartnershipsWithRecentActivity.length} active partnership(s) with recent activity`,
    ];
    const body = bodyLines.join("\n");
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    localStorage.setItem("compass_digest_sent_v1", "true");
  }

  async function handleDownloadPdf() {
    if (!digestRef.current) return;
    await toast.promise(
      exportElementToPdf(digestRef.current, `Compass-Weekly-Digest-${today}.pdf`),
      { loading: "Generating PDF…", success: "PDF downloaded", error: "Failed to generate PDF" },
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8" ref={digestRef}>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary mb-1">{companyName}</p>
            <h1 className="text-2xl font-semibold text-foreground leading-tight">Weekly Digest</h1>
            <p className="text-sm text-muted-foreground mt-1">{formatWeekRange(weekStartISO, weekEndISO)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSendEmail}>
              <Mail className="h-4 w-4" /> Send via Email
            </Button>
            <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => void handleDownloadPdf()}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>

        {/* This Week's Summary */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">This Week's Summary</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatPill label="Tasks completed" value={tasksCompletedThisWeek.length} tone="emerald" />
            <StatPill label="Became overdue" value={tasksBecameOverdueThisWeek.length} tone="rose" />
            <StatPill label="New partnerships" value={newPartnershipsThisWeek.length} tone="neutral" />
            <StatPill label="Currently blocked" value={blockedTasks.length} tone="amber" />
          </div>
        </section>

        {/* By Program */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">By Program</h2>
          {activePrograms.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No active programs this week.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activePrograms.map((program) => {
                const tasks = getProgramTasks(program);
                const done = tasks.filter((t) => t.status === "done").length;
                const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
                const dueThisWeek = sortByDeadline(tasks.filter((t) => isDueThisWeek(t)));
                const blocked = tasks.filter((t) => t.status === "blocked");
                return (
                  <Card key={program.id} className="border-border shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{program.name}</CardTitle>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[program.status]}`}>
                          {program.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <ProgressBar percent={pct} />
                        <span className="text-xs text-muted-foreground flex-shrink-0">{pct}%</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dueThisWeek.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Due this week</p>
                          <ul className="space-y-1">
                            {dueThisWeek.map((t) => (
                              <li key={t.taskId} className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-foreground truncate">{t.taskText}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {t.assignedTo ?? "Unassigned"} · {formatShort(effectiveDeadline(t)!)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {blocked.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Blocked
                          </p>
                          {blocked.map((t) => (
                            <div key={t.taskId} className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-sm text-foreground">
                              {t.taskText}
                              {t.statusNote && <p className="text-xs text-rose-600 mt-0.5">{t.statusNote}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      {dueThisWeek.length === 0 && blocked.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nothing due this week, no blockers.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Team Spotlight */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Team Spotlight</h2>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="py-5">
              {teamSpotlight.top ? (
                <div className="flex items-center gap-3">
                  <NameAvatar name={teamSpotlight.top.name} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{teamSpotlight.top.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Completed {teamSpotlight.top.count} task{teamSpotlight.top.count === 1 ? "" : "s"} this week — great momentum! 🎉
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No task completions logged yet this week.</p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Upcoming Next Week */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Upcoming Next Week</h2>
          </div>
          {upcomingByProgram.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nothing due in the next 7 days.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingByProgram.map(({ program, tasks }) => (
                <Card key={program.id} className="border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{program.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {tasks.map((t) => (
                        <li key={t.taskId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-foreground truncate">{t.taskText}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {t.assignedTo ?? "Unassigned"} · {formatShort(effectiveDeadline(t)!)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Nonprofit Partnerships Update */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Handshake className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Nonprofit Partnerships Update</h2>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="py-5 space-y-4">
              {changedStatusThisWeek.length === 0 && activePartnershipsWithRecentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No partnership changes or activity logged this week.</p>
              ) : (
                <>
                  {changedStatusThisWeek.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Changed status this week</p>
                      <ul className="space-y-1.5">
                        {changedStatusThisWeek.map((p, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-foreground">{p.nonprofitName ?? "Unknown"}</span>
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {p.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activePartnershipsWithRecentActivity.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Active partnerships with recent activity</p>
                      <ul className="space-y-1.5">
                        {activePartnershipsWithRecentActivity.map(({ record, count }, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-foreground">{record.nonprofitName ?? "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">
                              {count} activity log{count === 1 ? "" : "s"} this week
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <div className="pt-1">
                <Link to="/nonprofit-partners" className="text-xs text-primary hover:underline font-medium">
                  View all nonprofit partners →
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
