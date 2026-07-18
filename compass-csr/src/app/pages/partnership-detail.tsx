import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  ExternalLink,
  Check,
  Mail,
  Award,
  Sparkles,
  Copy,
  Plus,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { usePrograms } from "../context/programs-context";
import { useAuth } from "../context/auth-context";
import supabase from "../../lib/supabase";
import { formatProgramDate } from "../lib/blueprint-data";
import { findNonprofitByName, CAUSE_COLORS, getCorporatePartnershipUrl } from "../lib/nonprofits-data";
import { callClaude, stripCodeFences } from "../lib/claude-client";
import {
  STATUS_STEPS,
  ACTIVE_PARTNERSHIP_TYPE_OPTIONS,
  type PartnershipStatus,
  type PartnershipInterest,
  type PartnershipRecord,
  type ChecklistItem,
  type ActivePartnerDetails,
  loadPartnerships,
  savePartnerships,
  partnershipKey,
  resolveCompanyName,
  nextStatus,
} from "../lib/partnership-status";
import {
  ACTIVITY_TYPES,
  type ActivityType,
  type ActivityLogEntry,
  type ActivityPhoto,
  loadActivityLog,
  saveActivityLog,
  addActivityLogEntry,
  activityTotals,
  resizeImageToDataUrl,
} from "../lib/partnership-activity";

const FALLBACK_PARTNERSHIP_TYPES = [
  "Corporate Giving",
  "Employee Volunteering",
  "Skills-Based Volunteering",
  "Donation Matching",
];

// Maps between the app's Title-Case PartnershipStatus values and the
// lowercase/snake_case values stored in the Supabase `partnerships` table.
const STATUS_TO_DB: Record<PartnershipStatus, string> = {
  Exploring: "exploring",
  Contacted: "contacted",
  "In Discussion": "in_discussion",
  "Active Partner": "active_partner",
};

const STATUS_FROM_DB: Record<string, PartnershipStatus> = {
  exploring: "Exploring",
  contacted: "Contacted",
  in_discussion: "In Discussion",
  active_partner: "Active Partner",
};

// Shape of a row in the Supabase `partnerships` table.
interface SupabasePartnershipRow {
  id: string;
  company_id: string;
  nonprofit_name: string;
  partnership_status: string;
  contact_name: string | null;
  contact_email: string | null;
  partnership_type: string | null;
  start_date: string | null;
  notes: string | null;
}

// Shape of a row in the Supabase `activity_logs` table.
interface SupabaseActivityLogRow {
  id: string;
  partnership_id: string;
  company_id: string;
  activity_date: string;
  activity_type: string;
  description: string | null;
  employees_participated: number | null;
  volunteer_hours: number | null;
  dollars_donated: number | null;
  events_held: number | null;
  photos: ActivityPhoto[] | null;
  created_at?: string;
}

function activityRowToEntry(row: SupabaseActivityLogRow, storageKey: string, nonprofitName: string): ActivityLogEntry {
  return {
    id: row.id,
    partnershipKey: storageKey,
    nonprofitName,
    date: row.activity_date,
    activityType: row.activity_type as ActivityType,
    description: row.description ?? "",
    employeesParticipated: row.employees_participated,
    volunteerHours: row.volunteer_hours,
    dollarsDonated: row.dollars_donated,
    eventsHeld: row.events_held,
    photos: row.photos ?? [],
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

// ─── Active Partner confirmation dialog ────────────────────────────────────────

function ActivePartnerDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultPartnershipType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: ActivePartnerDetails) => void;
  defaultPartnershipType: string;
}) {
  const [startDate, setStartDate] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [partnershipType, setPartnershipType] = useState(defaultPartnershipType);
  const [notes, setNotes] = useState("");

  function handleConfirm() {
    if (!startDate) return;
    onConfirm({
      startDate,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      partnershipType,
      notes: notes.trim(),
    });
    setStartDate("");
    setContactName("");
    setContactEmail("");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Active Partnership</DialogTitle>
          <DialogDescription>
            Add a few details to finalize this partnership. Only the start date is required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ap-start-date">Partnership start date</Label>
            <Input
              id="ap-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-contact-name">Primary contact name (optional)</Label>
            <Input
              id="ap-contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-contact-email">Primary contact email (optional)</Label>
            <Input
              id="ap-contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="jane@nonprofit.org"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Partnership type (optional)</Label>
            <Select value={partnershipType} onValueChange={setPartnershipType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_PARTNERSHIP_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-notes">Notes (optional)</Label>
            <Textarea id="ap-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!startDate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Activity log section (Active Partner stage) ──────────────────────────────

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-accent/20 p-4">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ActivityLogSection({
  storageKey,
  nonprofitName,
  partnershipRowId,
  companyId,
}: {
  storageKey: string;
  nonprofitName: string;
  partnershipRowId: string | null;
  companyId: string | null;
}) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>(() =>
    loadActivityLog().filter((e) => e.partnershipKey === storageKey),
  );
  const [date, setDate] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("Volunteer Event");
  const [description, setDescription] = useState("");
  const [employees, setEmployees] = useState("");
  const [hours, setHours] = useState("");
  const [dollars, setDollars] = useState("");
  const [events, setEvents] = useState("");
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);

  const totals = activityTotals(entries);

  // Load activity logs from Supabase once the partnership row id is known.
  // Falls back to whatever's already in local state (seeded from
  // localStorage) if Supabase fails or there's nothing there yet.
  useEffect(() => {
    let active = true;
    if (!partnershipRowId || !companyId) return;

    supabase
      .from("activity_logs")
      .select("*")
      .eq("partnership_id", partnershipRowId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load activity logs from Supabase:", error);
          return;
        }
        const rows = (data ?? []) as SupabaseActivityLogRow[];
        if (rows.length === 0) return;

        const mapped = rows.map((row) => activityRowToEntry(row, storageKey, nonprofitName));
        setEntries(mapped);
        const others = loadActivityLog().filter((e) => e.partnershipKey !== storageKey);
        saveActivityLog([...mapped, ...others]);
      });

    return () => {
      active = false;
    };
  }, [partnershipRowId, companyId, storageKey, nonprofitName]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setProcessingPhotos(true);
    try {
      const newPhotos = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          dataUrl: await resizeImageToDataUrl(file, 900),
          fileName: file.name,
        })),
      );
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch {
      toast.error("Couldn't process one or more photos");
    } finally {
      setProcessingPhotos(false);
      e.target.value = "";
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      partnershipKey: storageKey,
      nonprofitName,
      date: date || new Date().toISOString().slice(0, 10),
      activityType,
      description: description.trim(),
      employeesParticipated: employees ? Number(employees) : null,
      volunteerHours: hours ? Number(hours) : null,
      dollarsDonated: dollars ? Number(dollars) : null,
      eventsHeld: events ? Number(events) : null,
      photos,
      createdAt: new Date().toISOString(),
    };
    addActivityLogEntry(entry);
    setEntries((prev) => [entry, ...prev]);
    toast.success("Activity logged");
    setDate("");
    setActivityType("Volunteer Event");
    setDescription("");
    setEmployees("");
    setHours("");
    setDollars("");
    setEvents("");
    setPhotos([]);

    if (partnershipRowId && companyId) {
      supabase
        .from("activity_logs")
        .insert({
          id: entry.id,
          partnership_id: partnershipRowId,
          company_id: companyId,
          activity_date: entry.date,
          activity_type: entry.activityType,
          description: entry.description,
          employees_participated: entry.employeesParticipated,
          volunteer_hours: entry.volunteerHours,
          dollars_donated: entry.dollarsDonated,
          events_held: entry.eventsHeld,
          photos: entry.photos,
        })
        .then(({ error }) => {
          if (error) console.error("Failed to save activity log to Supabase:", error);
        });
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Activity Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBlock label="Volunteer Hours" value={totals.volunteerHours} />
          <StatBlock label="Employees Engaged" value={totals.employeesEngaged} />
          <StatBlock label="Dollars Donated" value={`$${totals.dollarsDonated.toLocaleString()}`} />
          <StatBlock label="Events Held" value={totals.eventsHeld} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border-t border-border pt-6">
          <p className="text-sm font-semibold text-foreground">Log a new activity</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-date">Date (optional)</Label>
              <Input id="log-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Activity type</Label>
              <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-desc">Description (optional)</Label>
            <Textarea
              id="log-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened?"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-employees">Employees participated</Label>
              <Input id="log-employees" type="number" min="0" value={employees} onChange={(e) => setEmployees(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-hours">Volunteer hours</Label>
              <Input id="log-hours" type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-dollars">Dollars donated</Label>
              <Input id="log-dollars" type="number" min="0" value={dollars} onChange={(e) => setDollars(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-events">Events held</Label>
              <Input id="log-events" type="number" min="0" value={events} onChange={(e) => setEvents(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-photos">Photos (optional)</Label>
            <Input id="log-photos" type="file" accept="image/*" multiple onChange={handlePhotoChange} disabled={processingPhotos} />
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photos.map((p) => (
                  <div key={p.id} className="relative">
                    <img src={p.dataUrl} alt={p.fileName} className="h-16 w-16 object-cover rounded-md border border-border" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4" /> Log Activity
          </Button>
        </form>

        {entries.length > 0 && (
          <div className="space-y-3 border-t border-border pt-6">
            <p className="text-sm font-semibold text-foreground">Logged activities</p>
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-medium text-foreground">{entry.activityType}</span>
                  <span className="text-xs text-muted-foreground">{formatProgramDate(entry.date)}</span>
                </div>
                {entry.description && <p className="text-sm text-muted-foreground">{entry.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {entry.employeesParticipated != null && <span>{entry.employeesParticipated} employees</span>}
                  {entry.volunteerHours != null && <span>{entry.volunteerHours} volunteer hrs</span>}
                  {entry.dollarsDonated != null && <span>${entry.dollarsDonated.toLocaleString()} donated</span>}
                  {entry.eventsHeld != null && <span>{entry.eventsHeld} events</span>}
                </div>
                {entry.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {entry.photos.map((p) => (
                      <img key={p.id} src={p.dataUrl} alt={p.fileName} className="h-14 w-14 object-cover rounded-md border border-border" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PartnershipDetail() {
  const { nonprofitName } = useParams<{ nonprofitName: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { programs } = usePrograms();
  const { company } = useAuth();

  const navState = (location.state ?? {}) as { cause?: string; desc?: string };
  const directoryEntry = nonprofitName ? findNonprofitByName(nonprofitName) : undefined;

  const companyName = useMemo(() => resolveCompanyName(programs), [programs]);
  const companyProfile = useMemo(() => {
    const active = programs.find((p) => p.status !== "Archived");
    return {
      name: companyName,
      mission: active?.intake?.step1?.missionStatement?.trim() || "",
      programFocus: active?.intake?.step2?.programTypes ?? [],
    };
  }, [programs, companyName]);

  const nonprofit = {
    name: nonprofitName ?? "",
    cause: directoryEntry?.cause ?? navState.cause ?? "General Impact",
    mission:
      directoryEntry?.mission ??
      navState.desc ??
      "Detailed mission information isn't available for this organization yet — reach out directly to learn more about their work.",
    location: directoryEntry?.location ?? null,
    website: directoryEntry?.website ?? null,
    partnershipTypes: directoryEntry?.partnershipTypes ?? FALLBACK_PARTNERSHIP_TYPES,
  };

  const corporatePartnershipUrl = getCorporatePartnershipUrl(nonprofit);
  const causeColor = CAUSE_COLORS[nonprofit.cause] ?? "bg-muted text-muted-foreground border-border";
  const storageKey = partnershipKey(companyName, nonprofit.name);

  const [record, setRecord] = useState<PartnershipRecord>(() => {
    const all = loadPartnerships();
    return (
      all[storageKey] ?? {
        status: "Exploring",
        updatedAt: new Date().toISOString(),
        nonprofitName: nonprofit.name,
        companyName,
      }
    );
  });

  const [partnershipRowId, setPartnershipRowId] = useState<string | null>(null);
  const [partnershipLoading, setPartnershipLoading] = useState(true);

  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [partnershipType, setPartnershipType] = useState(nonprofit.partnershipTypes[0] ?? "");

  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const [generatingChecklist, setGeneratingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  const [activePartnerDialogOpen, setActivePartnerDialogOpen] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const activityLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("scroll") === "activity") {
      activityLogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.search, record.status]);

  // Load (or create) this partnership's Supabase row, matched by
  // nonprofit_name + company_id. Merges the status and Active Partner fields
  // it owns into the local record — checklist/emailDraft/interest stay
  // purely local, since Phase 2 only asked to migrate status + Active
  // Partner fields. Falls back to localStorage-only behavior if Supabase
  // fails or no company is resolved yet.
  useEffect(() => {
    let active = true;
    if (!company?.id || !nonprofit.name) {
      setPartnershipLoading(false);
      return;
    }

    setPartnershipLoading(true);
    supabase
      .from("partnerships")
      .select("*")
      .eq("company_id", company.id)
      .eq("nonprofit_name", nonprofit.name)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load partnership from Supabase:", error);
          setPartnershipLoading(false);
          return;
        }

        if (data) {
          const row = data as SupabasePartnershipRow;
          setPartnershipRowId(row.id);
          mergeIntoRecord({
            status: STATUS_FROM_DB[row.partnership_status] ?? "Exploring",
            ...(row.start_date
              ? {
                  activePartnerDetails: {
                    startDate: row.start_date,
                    contactName: row.contact_name ?? "",
                    contactEmail: row.contact_email ?? "",
                    partnershipType: row.partnership_type ?? "",
                    notes: row.notes ?? "",
                  },
                }
              : {}),
          });
          setPartnershipLoading(false);
          return;
        }

        const { data: created, error: insertError } = await supabase
          .from("partnerships")
          .insert({ company_id: company.id, nonprofit_name: nonprofit.name, partnership_status: "exploring" })
          .select()
          .single();
        if (!active) return;
        if (insertError || !created) {
          console.error("Failed to create partnership in Supabase:", insertError);
        } else {
          setPartnershipRowId((created as SupabasePartnershipRow).id);
        }
        setPartnershipLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id, nonprofit.name]);

  if (!nonprofitName) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Partnership not found</h1>
        <p className="text-muted-foreground mb-6">This nonprofit link is invalid or missing.</p>
        <Button variant="outline" onClick={() => navigate("/nonprofit-partners")}>
          Back to Nonprofit Partners
        </Button>
      </div>
    );
  }

  function persistRecord(next: PartnershipRecord) {
    const all = loadPartnerships();
    all[storageKey] = next;
    savePartnerships(all);
    setRecord(next);
  }

  function mergeIntoRecord(patch: Partial<PartnershipRecord>) {
    const all = loadPartnerships();
    const current = all[storageKey] ?? record;
    const updated = { ...current, ...patch };
    all[storageKey] = updated;
    savePartnerships(all);
    setRecord(updated);
    return updated;
  }

  async function runChecklistGeneration() {
    setGeneratingChecklist(true);
    setChecklistError(null);
    try {
      const system = `You are a corporate CSR partnership specialist. Generate a practical checklist of 3 to 5 short, realistic action items a company should complete while moving from initial discussions to a formalized partnership with a nonprofit. Tailor the items specifically to the nonprofit's cause area and the company's CSR program focus. Each item should be short and concrete, like something you'd put on a to-do list — not vague or overly formal. Good example: "Schedule intro call with nonprofit team". Bad example: "Conduct comprehensive legal review of all partnership agreement clauses". Return ONLY a JSON array of strings — no markdown, no explanation, no numbering. Example: ["First checklist item", "Second checklist item"]`;
      const user = `Company: ${companyProfile.name}
Company's CSR program focus areas: ${companyProfile.programFocus.join(", ") || "General corporate social responsibility"}
Nonprofit partner: ${nonprofit.name}
Nonprofit's cause area: ${nonprofit.cause}
Preferred partnership type: ${partnershipType || nonprofit.partnershipTypes[0] || "Corporate Giving"}

Generate the checklist now.`;

      const text = await callClaude(system, user, 2000);
      const items: string[] = JSON.parse(stripCodeFences(text));
      const checklistItems: ChecklistItem[] = items.map((itemText) => ({
        id: crypto.randomUUID(),
        text: itemText,
        done: false,
      }));
      mergeIntoRecord({ checklist: { generatedAt: new Date().toISOString(), items: checklistItems } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate checklist.";
      setChecklistError(message);
      toast.error(`Couldn't generate checklist: ${message}`);
    } finally {
      setGeneratingChecklist(false);
    }
  }

  async function handleAdvanceStatus() {
    const upcoming = nextStatus(record.status);
    if (!upcoming || upcoming === "Active Partner") return;
    persistRecord({ ...record, status: upcoming, updatedAt: new Date().toISOString() });
    toast.success(`Status updated to "${upcoming}"`);
    if (upcoming === "In Discussion") {
      void runChecklistGeneration();
    }

    if (partnershipRowId) {
      supabase
        .from("partnerships")
        .update({ partnership_status: STATUS_TO_DB[upcoming] })
        .eq("id", partnershipRowId)
        .then(({ error }) => {
          if (error) console.error("Failed to update partnership status in Supabase:", error);
        });
    }
  }

  function toggleChecklistItem(itemId: string) {
    if (!record.checklist) return;
    const updatedItems = record.checklist.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i));
    persistRecord({ ...record, checklist: { ...record.checklist, items: updatedItems } });
  }

  function updateChecklistItemText(itemId: string, text: string) {
    if (!record.checklist) return;
    const updatedItems = record.checklist.items.map((i) => (i.id === itemId ? { ...i, text } : i));
    persistRecord({ ...record, checklist: { ...record.checklist, items: updatedItems } });
  }

  function deleteChecklistItem(itemId: string) {
    if (!record.checklist) return;
    const updatedItems = record.checklist.items.filter((i) => i.id !== itemId);
    persistRecord({ ...record, checklist: { ...record.checklist, items: updatedItems } });
  }

  function addChecklistItem() {
    const newItem: ChecklistItem = { id: crypto.randomUUID(), text: "New checklist item", done: false };
    const items = record.checklist ? [...record.checklist.items, newItem] : [newItem];
    persistRecord({
      ...record,
      checklist: { generatedAt: record.checklist?.generatedAt ?? new Date().toISOString(), items },
    });
    setEditingItemId(newItem.id);
    setEditingText(newItem.text);
  }

  function startEditingItem(itemId: string, text: string) {
    setEditingItemId(itemId);
    setEditingText(text);
  }

  function commitEditingItem(itemId: string) {
    const trimmed = editingText.trim();
    if (trimmed) updateChecklistItemText(itemId, trimmed);
    setEditingItemId(null);
  }

  function handleConfirmActivePartner(details: ActivePartnerDetails) {
    persistRecord({
      ...record,
      status: "Active Partner",
      activePartnerDetails: details,
      updatedAt: new Date().toISOString(),
    });
    setActivePartnerDialogOpen(false);
    toast.success(`🎉 Active Partnership confirmed with ${nonprofit.name}!`);

    if (partnershipRowId) {
      supabase
        .from("partnerships")
        .update({
          partnership_status: STATUS_TO_DB["Active Partner"],
          contact_name: details.contactName || null,
          contact_email: details.contactEmail || null,
          partnership_type: details.partnershipType || null,
          start_date: details.startDate,
          notes: details.notes || null,
        })
        .eq("id", partnershipRowId)
        .then(({ error }) => {
          if (error) console.error("Failed to update partnership in Supabase:", error);
        });
    }
  }

  async function handleGenerateEmail() {
    setGeneratingEmail(true);
    setEmailError(null);
    try {
      const system = `You are a corporate social responsibility professional writing outreach emails to nonprofit partnership teams. Write clear, warm, professional emails. Return ONLY the email body text — no subject line, no markdown formatting, no explanation, no bracketed placeholders beyond what's given.`;
      const user = `Write a partnership outreach email from ${companyProfile.name} to the partnerships team at ${nonprofit.name}, a nonprofit focused on ${nonprofit.cause}.

Company mission: ${companyProfile.mission || "Not specified"}
Company's CSR program focus areas: ${companyProfile.programFocus.join(", ") || "General corporate social responsibility"}
Preferred partnership type: ${partnershipType || nonprofit.partnershipTypes[0] || "Corporate Giving"}

The email should introduce the company, explain why we're interested in partnering with ${nonprofit.name} specifically (tie it to their cause: ${nonprofit.cause}), and propose next steps for a conversation. Keep it under 200 words. Sign off as "The ${companyProfile.name} Team".`;

      const text = await callClaude(system, user, 1000);
      mergeIntoRecord({ emailDraft: text });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate email draft.";
      setEmailError(message);
      toast.error(`Couldn't generate email draft: ${message}`);
    } finally {
      setGeneratingEmail(false);
    }
  }

  async function handleCopyEmail() {
    if (!record.emailDraft) return;
    try {
      await navigator.clipboard.writeText(record.emailDraft);
      toast.success("Email draft copied ✓");
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    } catch {
      toast.error("Couldn't copy — please select and copy manually");
    }
  }

  function handleSubmitInterest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contactName.trim() || !email.trim()) {
      toast.error("Please fill in your name and email");
      return;
    }

    const interest: PartnershipInterest = {
      contactName: contactName.trim(),
      email: email.trim(),
      message: message.trim(),
      partnershipType,
      submittedAt: new Date().toISOString(),
    };

    const wasExploring = record.status === "Exploring";
    const updatedStatus: PartnershipStatus = wasExploring ? "Contacted" : record.status;
    persistRecord({ ...record, status: updatedStatus, updatedAt: new Date().toISOString(), interest });

    toast.success("Interest logged ✓");
    setContactName("");
    setEmail("");
    setMessage("");

    if (partnershipRowId && wasExploring) {
      supabase
        .from("partnerships")
        .update({ partnership_status: STATUS_TO_DB[updatedStatus] })
        .eq("id", partnershipRowId)
        .then(({ error }) => {
          if (error) console.error("Failed to update partnership status in Supabase:", error);
        });
    }
  }

  const currentStepIndex = STATUS_STEPS.indexOf(record.status);
  const allChecklistItemsDone =
    !!record.checklist && record.checklist.items.length > 0 && record.checklist.items.every((i) => i.done);
  const doneCount = record.checklist?.items.filter((i) => i.done).length ?? 0;
  const totalCount = record.checklist?.items.length ?? 0;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Header */}
      <div className="space-y-4">
        <div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium mb-3 ${causeColor}`}
          >
            {nonprofit.cause}
          </span>
          <h1 className="text-3xl font-semibold text-foreground leading-tight">{nonprofit.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          {nonprofit.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {nonprofit.location}
            </span>
          )}
          {nonprofit.website ? (
            <a
              href={`https://${nonprofit.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" /> {nonprofit.website}
            </a>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground/70">
              <ExternalLink className="h-4 w-4" /> Website not available
            </span>
          )}
        </div>
      </div>

      {/* Status progression bar */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base">Partnership Status</CardTitle>
          {partnershipLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Syncing…
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-start">
            {STATUS_STEPS.map((step, i) => {
              const isDone = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex-1 flex items-center last:flex-none last:w-auto">
                  <div className="flex flex-col items-center gap-2 flex-shrink-0 w-24">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isDone || isCurrent
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-white border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="text-xs font-semibold">{i + 1}</span>}
                    </div>
                    <span
                      className={`text-xs font-medium text-center leading-tight ${
                        isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-5 ${i < currentStepIndex ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border flex flex-col items-center gap-2">
            {record.status === "Active Partner" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 px-3 py-1.5 text-sm font-semibold">
                <Award className="h-4 w-4" /> Active Partnership ✓
              </span>
            ) : record.status === "Exploring" ? (
              <p className="text-xs text-muted-foreground text-center">
                Use the form below to send a partnership email and start this partnership.
              </p>
            ) : record.status === "In Discussion" ? (
              <>
                {!allChecklistItemsDone && (
                  <p className="text-xs text-muted-foreground text-center">
                    Complete the partnership checklist below to unlock this step.
                  </p>
                )}
                <Button
                  onClick={() => setActivePartnerDialogOpen(true)}
                  disabled={!allChecklistItemsDone}
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Mark as Active Partner
                </Button>
              </>
            ) : (
              <Button
                onClick={() => void handleAdvanceStatus()}
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Mark as {nextStatus(record.status)}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mission */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mission</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">{nonprofit.mission}</p>
        </CardContent>
      </Card>

      {/* Partnership types */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Partnership Types They Accept</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {nonprofit.partnershipTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium"
              >
                {type}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI-generated partnership checklist */}
      {(record.status === "In Discussion" || record.status === "Active Partner") && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Partnership Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {record.checklist ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {doneCount} of {totalCount} items completed
                </p>
                <ul className="space-y-2">
                  {record.checklist.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          item.done ? "bg-primary border-primary" : "border-muted-foreground/40 bg-white"
                        }`}
                      >
                        {item.done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      </button>
                      {editingItemId === item.id ? (
                        <input
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={() => commitEditingItem(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEditingItem(item.id);
                            } else if (e.key === "Escape") {
                              setEditingItemId(null);
                            }
                          }}
                          className="flex-1 text-sm px-1.5 py-0.5 rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingItem(item.id, item.text)}
                          className={`flex-1 text-left text-sm leading-relaxed hover:underline decoration-dotted underline-offset-2 ${
                            item.done ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {item.text}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteChecklistItem(item.id)}
                        className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete item"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addChecklistItem}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> Add custom item
                </Button>
              </div>
            ) : generatingChecklist ? (
              <p className="text-sm text-muted-foreground">Generating your partnership checklist…</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{checklistError ?? "No checklist yet."}</p>
                <Button variant="outline" size="sm" onClick={() => void runChecklistGeneration()}>
                  Generate Checklist
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reach out / send partnership email (pre-active-partner) */}
      {record.status !== "Active Partner" && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reach Out to This Nonprofit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI email draft */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label>AI-drafted outreach email</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleGenerateEmail()}
                  disabled={generatingEmail}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {generatingEmail ? "Generating…" : record.emailDraft ? "Regenerate" : "Generate Email Draft"}
                </Button>
              </div>
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              {record.emailDraft && (
                <div className="space-y-2">
                  <div className="relative">
                    <Textarea readOnly value={record.emailDraft} className="min-h-40 text-sm pr-28" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyEmail()}
                      className="absolute top-2 right-2 gap-1.5 text-xs bg-white"
                    >
                      {copiedDraft ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Copied! ✓
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy Email Draft
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy this email and send it from your own email client (Gmail, Outlook, Yahoo, etc.) to the
                    nonprofit's partnerships team.
                  </p>
                </div>
              )}
              {corporatePartnershipUrl ? (
                <p className="text-xs text-muted-foreground">
                  Send it to {nonprofit.name}'s partnerships team via their{" "}
                  <a
                    href={corporatePartnershipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    corporate partnerships page <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Corporate partnerships page not available — reach out via their general contact info.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <form onSubmit={handleSubmitInterest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Contact name</Label>
                    <Input
                      id="contact-name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partnership-type">Preferred partnership type</Label>
                  <Select value={partnershipType} onValueChange={setPartnershipType}>
                    <SelectTrigger id="partnership-type">
                      <SelectValue placeholder="Select a partnership type" />
                    </SelectTrigger>
                    <SelectContent>
                      {nonprofit.partnershipTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Tell ${nonprofit.name} about your company and what you're hoping to build together…`}
                    className="min-h-28"
                  />
                </div>
                <Button
                  type="submit"
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Mail className="h-4 w-4" /> Send Partnership Email
                </Button>
              </form>

              {record.interest && (
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-sm text-foreground">
                      📋 Your email draft is ready — copy it above and send it from your own email
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                      Last Submitted
                    </p>
                    <p className="text-sm text-foreground">
                      {record.interest.contactName} ({record.interest.email}) reached out about{" "}
                      <strong>{record.interest.partnershipType}</strong> partnership on{" "}
                      {formatProgramDate(record.interest.submittedAt)}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Partner details + activity log */}
      {record.status === "Active Partner" && (
        <>
          {record.activePartnerDetails && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Partnership Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Start Date</p>
                    <p className="text-foreground">{formatProgramDate(record.activePartnerDetails.startDate)}</p>
                  </div>
                  {record.activePartnerDetails.contactName && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Primary Contact</p>
                      <p className="text-foreground">{record.activePartnerDetails.contactName}</p>
                    </div>
                  )}
                  {record.activePartnerDetails.contactEmail && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Contact Email</p>
                      <p className="text-foreground">{record.activePartnerDetails.contactEmail}</p>
                    </div>
                  )}
                  {record.activePartnerDetails.partnershipType && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Partnership Type</p>
                      <p className="text-foreground">{record.activePartnerDetails.partnershipType}</p>
                    </div>
                  )}
                  {record.activePartnerDetails.notes && (
                    <div className="md:col-span-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-foreground">{record.activePartnerDetails.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div ref={activityLogRef}>
            <ActivityLogSection
              storageKey={storageKey}
              nonprofitName={nonprofit.name}
              partnershipRowId={partnershipRowId}
              companyId={company?.id ?? null}
            />
          </div>
        </>
      )}

      <ActivePartnerDialog
        open={activePartnerDialogOpen}
        onOpenChange={setActivePartnerDialogOpen}
        onConfirm={handleConfirmActivePartner}
        defaultPartnershipType={partnershipType || nonprofit.partnershipTypes[0] || ""}
      />
    </div>
  );
}
