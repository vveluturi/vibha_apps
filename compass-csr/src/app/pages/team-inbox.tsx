import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  Inbox,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  CheckCircle2,
  Trash2,
  ArrowUpRight,
  X,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  loadFeedback,
  markFeedbackRead,
  replyToFeedback,
  resolveFeedback,
  deleteFeedback,
  FEEDBACK_TYPE_STYLES,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_STATUS_STYLES,
  FEEDBACK_STATUS_LABELS,
  type FeedbackItem,
  type FeedbackType,
} from "../lib/feedback";
import { shouldShowFeatureBanner, dismissRecommendation, DISMISS_KEYS } from "../lib/feature-recommendations";

// ─── Role (matches the local pattern used by dashboard.tsx / program-dashboard.tsx) ─

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

const FEEDBACK_TYPE_ICONS: Record<FeedbackType, React.ElementType> = {
  question: HelpCircle,
  suggestion: Lightbulb,
  feedback: MessageCircle,
};

// ─── Filters ────────────────────────────────────────────────────────────────

type FilterKey = "all" | "unread" | "question" | "suggestion" | "feedback" | "resolved";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "question", label: "Questions" },
  { key: "suggestion", label: "Suggestions" },
  { key: "feedback", label: "Feedback" },
  { key: "resolved", label: "Resolved" },
];

function matchesFilter(item: FeedbackItem, filter: FilterKey): boolean {
  switch (filter) {
    case "all": return true;
    case "unread": return item.status === "unread";
    case "resolved": return item.status === "resolved";
    default: return item.type === filter;
  }
}

// ─── Inbox item ───────────────────────────────────────────────────────────────

function InboxItem({
  item,
  isAdmin,
  onExpand,
  onReply,
  onResolve,
  onDelete,
}: {
  item: FeedbackItem;
  isAdmin: boolean;
  onExpand: (id: string) => void;
  onReply: (id: string, reply: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const Icon = FEEDBACK_TYPE_ICONS[item.type];

  function handleCardClick() {
    onExpand(item.id);
    setExpanded((v) => !v);
  }

  function handleSendReply() {
    if (!replyText.trim()) return;
    onReply(item.id, replyText.trim());
    setReplyText("");
    setReplying(false);
  }

  function handleDelete() {
    if (confirm("Delete this feedback item? This cannot be undone.")) {
      onDelete(item.id);
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 space-y-2.5 cursor-pointer" onClick={handleCardClick}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${FEEDBACK_TYPE_STYLES[item.type]}`}>
              <Icon className="h-3 w-3" /> {FEEDBACK_TYPE_LABELS[item.type]}
            </span>
            {item.programId ? (
              <Link
                to={`/programs/${item.programId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                {item.programName ?? "Program"} <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">General</span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${FEEDBACK_STATUS_STYLES[item.status]}`}>
            {item.status === "unread" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
            {FEEDBACK_STATUS_LABELS[item.status]}
          </span>
        </div>

        <p className={`text-sm text-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {item.message}
        </p>

        <p className="text-xs text-muted-foreground">
          {item.submittedBy} ·{" "}
          {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>

        {item.adminReply && (
          <div className="ml-3 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-md py-2 px-3">
            <p className="text-xs font-medium text-primary mb-0.5">Admin reply</p>
            <p className="text-sm text-foreground">{item.adminReply}</p>
          </div>
        )}

        {isAdmin && (
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            {replying ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply…"
                  rows={2}
                  className="text-sm"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Send Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setReplying(false); setReplyText(""); }}
                    className="h-7 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setReplying(true)} className="h-7 px-3 text-xs">
                  Reply
                </Button>
                {item.status !== "resolved" && (
                  <Button size="sm" variant="outline" onClick={() => onResolve(item.id)} className="h-7 px-3 text-xs gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="h-7 px-3 text-xs gap-1 text-muted-foreground hover:text-destructive ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TeamInbox() {
  const role = getUserRole();
  const [items, setItems] = useState<FeedbackItem[]>(() =>
    loadFeedback().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showBanner, setShowBanner] = useState(() => shouldShowFeatureBanner("team-inbox"));

  function handleDismissBanner() {
    dismissRecommendation(DISMISS_KEYS["team-inbox"]);
    setShowBanner(false);
  }

  function refresh() {
    setItems(loadFeedback().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  function handleExpand(id: string) {
    markFeedbackRead(id);
    refresh();
  }

  function handleReply(id: string, reply: string) {
    replyToFeedback(id, reply);
    refresh();
    toast.success("Reply sent ✓");
  }

  function handleResolve(id: string) {
    resolveFeedback(id);
    refresh();
    toast.success("Marked resolved ✓");
  }

  function handleDelete(id: string) {
    deleteFeedback(id);
    refresh();
    toast.success("Feedback deleted");
  }

  const filtered = items.filter((item) => matchesFilter(item, filter));
  const filterLabel = FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? filter;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Contextual banner */}
      {showBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-start gap-3">
          <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground flex-1">
            Your team wants to communicate — share the Inbox link with your team members so they can submit questions.
          </p>
          <button
            type="button"
            onClick={handleDismissBanner}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-1">Team Inbox</h1>
        <p className="text-muted-foreground">
          All feedback, questions, and suggestions from your team across all programs
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-border pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feedback list */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            No feedback yet — your team hasn't submitted any questions or suggestions
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">No {filterLabel} items found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <InboxItem
              key={item.id}
              item={item}
              isAdmin={role === "Admin"}
              onExpand={handleExpand}
              onReply={handleReply}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
