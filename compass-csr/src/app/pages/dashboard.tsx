import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Sparkles, TrendingUp, Heart, Users, FileText, Pin, PlusCircle, AlertTriangle, CalendarClock, MessageSquare, Calendar, CheckSquare, BarChart, MessageCircle } from "lucide-react";
import { usePrograms } from "../context/programs-context";
import { useWizard } from "../context/wizard-context";
import { useNavigate } from "react-router";
import { PROGRAM_STATUS_STYLES } from "../types/program";
import { formatProgramDate } from "../lib/blueprint-data";
import { loadConnected } from "../lib/nonprofits-data";
import { useAuth } from "../context/auth-context";
import supabase from "../../lib/supabase";
import { loadTeamMembers } from "../lib/team";
import { NameAvatar } from "../components/member-avatar";
import {
  getAllProgramTasks,
  isOverdue,
  isDueThisWeek,
  sortByDeadline,
  effectiveDeadline,
  loadAllTaskStates,
} from "../lib/tasks";
import { useUnreadFeedbackCount } from "../lib/feedback";
import { OnboardingModal } from "../components/onboarding-modal";
import { getActiveRecommendations, dismissRecommendation, type RecommendationFeature } from "../lib/feature-recommendations";
import type { SavedProgram } from "../types/program";

const RECOMMENDATION_ICONS: Record<string, React.ElementType> = {
  Calendar,
  CheckSquare,
  MessageSquare,
  BarChart,
  Heart,
  MessageCircle,
};

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

// ─── Contextual "Next Step" prompt ─────────────────────────────────────────────

const DIGEST_SENT_KEY = "compass_digest_sent_v1";
const IMPACT_DOWNLOADED_KEY = "compass_impact_downloaded_v1";

interface NextStepPrompt {
  icon?: React.ElementType;
  emoji?: string;
  title: string;
  subtitle?: string;
  extraLine?: string;
  buttonText?: string;
  buttonTo?: string;
  slackLine?: boolean;
  dismissKey?: string;
  externalLinks?: { label: string; url: string }[];
}

const RECOMMENDATION_BUTTON_LABELS: Record<RecommendationFeature, string> = {
  "my-tasks": "Assign a Task →",
  "weekly-digest": "Set Up Weekly Digest →",
  "team-inbox": "View Inbox →",
  "impact-report": "View Impact Report →",
  "nonprofit-partners": "Browse Nonprofits →",
  "slack-teams": "",
};

// Walks the onboarding checklist in priority order and returns the first
// unmet step — re-evaluated fresh on every render (no memoization) so each
// prompt auto-dismisses the moment its underlying localStorage state changes.
// Unread team feedback takes priority over the onboarding checklist below —
// it's time-sensitive and independent of which onboarding stage the company
// is at, so an Admin should see it first regardless.
function getNextStepPrompt(programs: SavedProgram[], role: UserRole, unreadFeedback: number): NextStepPrompt | null {
  if (role === "Admin" && unreadFeedback > 0) {
    return {
      icon: MessageSquare,
      title: `You have ${unreadFeedback} unread feedback item${unreadFeedback !== 1 ? "s" : ""} from your team`,
      buttonText: "View Inbox →",
      buttonTo: "/team-inbox",
    };
  }

  if (programs.length === 0) return null;

  const teamMembers = loadTeamMembers();
  if (teamMembers.length === 0) {
    return {
      emoji: "👥",
      title: "Add your team",
      subtitle: "Assign tasks and collaborate by adding your first team member",
      buttonText: "Add Team Members →",
      buttonTo: "/team",
    };
  }

  const mostRecentProgram = programs[0];
  const step3 = mostRecentProgram?.intake?.step3;

  const allTaskStates = loadAllTaskStates();
  const hasAssignedTask = Object.values(allTaskStates).some((t) => !!t.assignedTo);
  if (!hasAssignedTask) {
    const prefersAssignment = step3?.collabStyles?.includes("assign-tasks") ?? false;
    return {
      emoji: "✅",
      title: "Assign your first task",
      subtitle: "Get your team moving by assigning a task in your program dashboard",
      extraLine: prefersAssignment ? "Your team prefers task assignments — start here" : undefined,
      buttonText: "Go to Program Dashboard →",
      buttonTo: `/programs/${mostRecentProgram.id}`,
    };
  }

  const connected = loadConnected();
  if (connected.length === 0) {
    return {
      emoji: "🤝",
      title: "Connect a nonprofit partner",
      subtitle: "Browse verified organizations that match your CSR focus",
      buttonText: "Browse Nonprofits →",
      buttonTo: "/nonprofit-partners",
    };
  }

  const digestSent = localStorage.getItem(DIGEST_SENT_KEY) === "true";
  if (!digestSent) {
    return {
      emoji: "📬",
      title: "Send your first Weekly Digest",
      subtitle: "Keep your team aligned with a weekly CSR update",
      buttonText: "Set Up Weekly Digest →",
      buttonTo: "/weekly-digest",
      slackLine: step3?.commsChannels?.includes("slack") ?? false,
    };
  }

  const wantsLeadershipReports = step3?.collabStyles?.includes("reports") ?? false;
  const impactDownloaded = localStorage.getItem(IMPACT_DOWNLOADED_KEY) === "true";
  if (wantsLeadershipReports && !impactDownloaded) {
    return {
      emoji: "📊",
      title: "Share your Impact Report with leadership",
      subtitle: "Your program data is ready to present",
      buttonText: "View Impact Report →",
      buttonTo: "/impact-report",
    };
  }

  const recommendations = getActiveRecommendations();
  if (recommendations.length > 0) {
    const rec = recommendations[0];
    return {
      icon: RECOMMENDATION_ICONS[rec.icon] ?? Sparkles,
      title: rec.title,
      subtitle: rec.desc,
      buttonText: rec.link ? RECOMMENDATION_BUTTON_LABELS[rec.feature] : undefined,
      buttonTo: rec.link,
      externalLinks: rec.externalLinks,
      dismissKey: rec.dismissKey,
    };
  }

  return null;
}

export function Dashboard() {
  const { programs, loading: programsLoading } = usePrograms();
  const { resetWizard } = useWizard();
  const navigate = useNavigate();
  const [connectedCount] = useState(() => loadConnected().length);
  const [teamCount, setTeamCount] = useState(() => loadTeamMembers().length);
  const { company } = useAuth();
  const companyName = company?.name?.trim() || "Your Company";
  const role = getUserRole();

  // "Team Members Engaged" reflects real signed-up teammates (user_profiles
  // rows in this company) rather than the local task-assignment roster.
  // Falls back to the local roster count if the Supabase query fails.
  useEffect(() => {
    if (!company?.id) return;
    let active = true;
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .then(({ count, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load team member count from Supabase:", error);
          setTeamCount(loadTeamMembers().length);
        } else {
          setTeamCount(count ?? 0);
        }
      });
    return () => {
      active = false;
    };
  }, [company?.id]);

  const activePrograms = programs.filter((p) => p.status !== "Archived");
  const pinnedPrograms = activePrograms.filter((p) => p.pinned);
  const recentPrograms = activePrograms.filter((p) => !p.pinned).slice(0, 3);
  const displayPrograms = [...pinnedPrograms, ...recentPrograms].slice(0, 3);

  const allTasks = useMemo(() => getAllProgramTasks(programs), [programs]);
  const overdueTasks = useMemo(() => allTasks.filter(isOverdue), [allTasks]);
  const overdueProgramCount = useMemo(
    () => new Set(overdueTasks.map((t) => t.programId)).size,
    [overdueTasks],
  );
  const dueThisWeekTasks = useMemo(
    () => sortByDeadline(allTasks.filter((t) => isDueThisWeek(t))).slice(0, 5),
    [allTasks],
  );
  const programNameById = useMemo(
    () => new Map(programs.map((p) => [p.id, p.name])),
    [programs],
  );

  const unreadFeedback = useUnreadFeedbackCount();
  // Forces a re-render so getNextStepPrompt (unmemoized, re-evaluated fresh
  // every render) picks up the dismissal from localStorage immediately.
  const [, setDismissTick] = useState(0);
  const nextStep = getNextStepPrompt(programs, role, unreadFeedback);

  function handleNewProgram() {
    resetWizard();
    navigate("/new-program");
  }

  function handleDismissNextStep() {
    if (!nextStep?.dismissKey) return;
    dismissRecommendation(nextStep.dismissKey);
    setDismissTick((t) => t + 1);
  }

  const stats = [
    {
      label: "Active Programs",
      value: String(activePrograms.length),
      icon: TrendingUp,
      description: "CSR programs running",
    },
    {
      label: "Nonprofit Partners",
      value: String(connectedCount),
      icon: Heart,
      description: "Organizations connected",
    },
    {
      label: "Team Members Engaged",
      value: String(teamCount),
      icon: Users,
      description: "Employees participating",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      <OnboardingModal isInvitedMember={role === "Member"} />

      {/* Overdue Tasks Banner */}
      {overdueTasks.length > 0 && (
        <Link
          to="/my-tasks"
          className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 hover:bg-rose-100 transition-colors"
        >
          <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <p className="text-sm text-rose-700 flex-1">
            You have <span className="font-semibold">{overdueTasks.length}</span> overdue task
            {overdueTasks.length !== 1 ? "s" : ""} across <span className="font-semibold">{overdueProgramCount}</span> program
            {overdueProgramCount !== 1 ? "s" : ""}.
          </p>
          <span className="text-xs font-medium text-rose-700 flex-shrink-0">View in My Tasks →</span>
        </Link>
      )}

      {/* Member role banner */}
      {role === "Member" && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            You're viewing as a <span className="font-medium text-foreground">Member</span>. Contact your Admin to make program changes.
          </p>
        </div>
      )}

      {/* Welcome Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-accent/30 to-card">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              {programs.length === 0 ? (
                <>
                  <CardTitle className="text-2xl mb-2">Welcome to Compass CSR</CardTitle>
                  <CardDescription className="text-base text-muted-foreground mb-4">
                    Let's build your first CSR program. It only takes a few minutes to get started.
                  </CardDescription>
                  {role === "Admin" && (
                    <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={handleNewProgram}>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Start a New Program
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl mb-2">Welcome back, {companyName}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Your CSR program is taking shape. Let's make an impact together.
                  </CardDescription>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contextual Next Step prompt */}
      {nextStep && (
        <div className="relative rounded-lg border-l-4 border-primary bg-primary/5 p-4">
          {nextStep.dismissKey && (
            <button
              type="button"
              onClick={handleDismissNextStep}
              aria-label="Dismiss"
              className="absolute top-2.5 right-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕ Dismiss
            </button>
          )}
          <div className="flex items-center justify-between gap-4 flex-wrap pr-16">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                {nextStep.icon ? (
                  <nextStep.icon className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  nextStep.emoji
                )}
                {nextStep.title}
              </p>
              {nextStep.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{nextStep.subtitle}</p>
              )}
              {nextStep.extraLine && (
                <p className="text-xs text-muted-foreground mt-0.5">{nextStep.extraLine}</p>
              )}
            </div>
            {nextStep.externalLinks ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                {nextStep.externalLinks.map((link) => (
                  <Button key={link.url} asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  </Button>
                ))}
              </div>
            ) : (
              nextStep.buttonTo && (
                <Button
                  asChild
                  size="sm"
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                >
                  <Link to={nextStep.buttonTo}>{nextStep.buttonText}</Link>
                </Button>
              )
            )}
          </div>
          {nextStep.slackLine && (
            <p className="text-xs text-muted-foreground mt-2">
              💬 Also consider sharing updates via Slack (
              <a
                href="https://slack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                slack.com
              </a>
              ) or Teams (
              <a
                href="https://teams.microsoft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                teams.microsoft.com
              </a>
              )
            </p>
          )}
        </div>
      )}

      {/* This Week's Focus */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">This Week's Focus</CardTitle>
            </div>
            <Link to="/my-tasks" className="text-xs text-primary hover:underline font-medium">
              View All Tasks →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {dueThisWeekTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">Nothing due this week. You're all caught up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {dueThisWeekTasks.map((task) => (
                <li key={`${task.programId}::${task.taskId}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex items-center gap-2.5">
                    {task.assignedTo && <NameAvatar name={task.assignedTo} size="xs" />}
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{task.taskText}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {programNameById.get(task.programId) ?? "Unknown program"}
                        {task.assignedTo ? ` · ${task.assignedTo}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {effectiveDeadline(task) ? new Date(effectiveDeadline(task)! + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-3xl font-semibold text-foreground">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA Section */}
      {role === "Admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Design and launch your first CSR program with AI-powered guidance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={handleNewProgram}>
              <Sparkles className="h-5 w-5 mr-2" />
              Start a New Program
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── My Programs Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">My Programs</h2>
            <p className="text-sm text-muted-foreground">
              Your most recent CSR programs
            </p>
          </div>
          {activePrograms.length > 0 && (
            <div className="flex items-center gap-3">
              <Link
                to="/my-programs"
                className="text-sm text-primary hover:underline font-medium"
              >
                View all →
              </Link>
              {role === "Admin" && (
                <Button size="sm" variant="outline" onClick={handleNewProgram} className="gap-1.5">
                  <PlusCircle className="h-4 w-4" /> New Program
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {programsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="border-border shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                  <div className="h-8 w-full rounded bg-muted animate-pulse mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : /* Empty state */
        activePrograms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted rounded-full mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No programs yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                You haven't created any CSR programs yet. Start by launching your
                first program to make a positive impact.
              </p>
              <Button variant="outline" onClick={handleNewProgram}>
                Create Your First Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Program cards grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayPrograms.map((program) => (
              <Card
                key={program.id}
                className={`border-border shadow-sm hover:shadow-md transition-shadow ${
                  program.pinned ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <CardContent
                  className="p-5 cursor-pointer"
                  onClick={() => navigate(`/programs/${program.id}`)}
                >
                  {/* Pin indicator */}
                  {program.pinned && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Pin className="h-3 w-3 text-primary fill-primary" />
                      <span className="text-xs font-medium text-primary uppercase tracking-wide">
                        Pinned
                      </span>
                    </div>
                  )}

                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base font-semibold text-foreground leading-snug">
                      {program.name}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                        PROGRAM_STATUS_STYLES[
                          program.status as keyof typeof PROGRAM_STATUS_STYLES
                        ] ?? "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {program.status}
                    </span>
                  </div>

                  {/* Date */}
                  <p className="text-sm text-muted-foreground mb-4">
                    Created {formatProgramDate(program.createdAt)}
                  </p>

                  {/* Action */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button asChild size="sm" variant="outline" className="gap-1.5 w-full">
                      <Link to={`/programs/${program.id}/blueprint`}>
                        <FileText className="h-4 w-4" /> View Blueprint
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* "View all" card if there are more than 3 */}
            {activePrograms.length > 3 && (
              <Card className="border-dashed border-border shadow-none hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[160px] text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    +{activePrograms.length - 3} more program{activePrograms.length - 3 !== 1 ? "s" : ""}
                  </p>
                  <Link
                    to="/my-programs"
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    View all in My Programs →
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}