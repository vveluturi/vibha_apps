import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  Download,
  ImagePlus,
  TrendingUp,
  Heart,
  Users,
  DollarSign,
  CalendarDays,
  Award,
  FileText,
  ExternalLink,
  Plus,
  X,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
import { useCompanyName } from "../lib/settings";
import { formatProgramDate } from "../lib/blueprint-data";
import { countCompletedTasks } from "../lib/blueprint-tasks";
import { CAUSE_COLORS, findNonprofitByName } from "../lib/nonprofits-data";
import { loadPartnerships, type PartnershipRecord } from "../lib/partnership-status";
import {
  loadActivityLog,
  activityTotals,
  resizeImageToDataUrl,
  type ActivityLogEntry,
  type ActivityType,
  type ActivityPhoto,
} from "../lib/partnership-activity";
import { loadGalleryPhotos, addGalleryPhotos, type GalleryPhoto } from "../lib/company-gallery";
import { exportElementToPdf, buildPdfFilename } from "../lib/pdf-export";
import { shouldShowFeatureBanner, dismissRecommendation, DISMISS_KEYS } from "../lib/feature-recommendations";
import { PROGRAM_STATUS_STYLES } from "../types/program";

// ─── Derived types ──────────────────────────────────────────────────────────

interface ResolvedPartnership {
  key: string;
  nonprofitName: string;
  cause: string;
  record: PartnershipRecord;
}

interface GalleryItem {
  id: string;
  dataUrl: string;
  caption: string;
}

function resolvePartnerships(): ResolvedPartnership[] {
  const all = loadPartnerships();
  return Object.entries(all).map(([key, record]) => {
    const name = record.nonprofitName ?? key.split("::")[1] ?? "Unknown";
    const cause = findNonprofitByName(name)?.cause ?? "General Impact";
    return { key, nonprofitName: name, cause, record };
  });
}

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

// Only the "Active Partner" rows are kept — matches this page's only use of
// resolved partnerships (the Active Partnerships section + cause areas).
function activePartnershipRowToResolved(row: SupabasePartnershipRow): ResolvedPartnership {
  const cause = findNonprofitByName(row.nonprofit_name)?.cause ?? "General Impact";
  return {
    key: row.id,
    nonprofitName: row.nonprofit_name,
    cause,
    record: {
      status: "Active Partner",
      updatedAt: new Date().toISOString(),
      nonprofitName: row.nonprofit_name,
      activePartnerDetails: row.start_date
        ? {
            startDate: row.start_date,
            contactName: row.contact_name ?? "",
            contactEmail: row.contact_email ?? "",
            partnershipType: row.partnership_type ?? "",
            notes: row.notes ?? "",
          }
        : undefined,
    },
  };
}

function activityRowToEntry(row: SupabaseActivityLogRow, nonprofitName: string): ActivityLogEntry {
  return {
    id: row.id,
    partnershipKey: row.partnership_id,
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

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

// ─── Add Photos modal ───────────────────────────────────────────────────────

function AddPhotosDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (photos: GalleryPhoto[]) => void;
}) {
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<GalleryPhoto[]>([]);
  const [processing, setProcessing] = useState(false);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const newPhotos = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          dataUrl: await resizeImageToDataUrl(file, 1000),
          fileName: file.name,
          caption: "",
          addedAt: new Date().toISOString(),
        })),
      );
      setPending((prev) => [...prev, ...newPhotos]);
    } catch {
      toast.error("Couldn't process one or more photos");
    } finally {
      setProcessing(false);
      e.target.value = "";
    }
  }

  function removePending(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  function handleAdd() {
    if (pending.length === 0) return;
    const withCaption = pending.map((p) => ({ ...p, caption: caption.trim() }));
    onAdded(withCaption);
    setPending([]);
    setCaption("");
    onOpenChange(false);
    toast.success(`${withCaption.length} photo${withCaption.length === 1 ? "" : "s"} added to the gallery`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Photos</DialogTitle>
          <DialogDescription>Add photos to your company's general impact gallery.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="gallery-photos">Photos</Label>
            <Input id="gallery-photos" type="file" accept="image/*" multiple onChange={(e) => void handleFiles(e)} disabled={processing} />
          </div>
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((p) => (
                <div key={p.id} className="relative">
                  <img src={p.dataUrl} alt={p.fileName} className="h-16 w-16 object-cover rounded-md border border-border" />
                  <button
                    type="button"
                    onClick={() => removePending(p.id)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="gallery-caption">Caption (optional, applies to all)</Label>
            <Input id="gallery-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Team volunteer day" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={pending.length === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Add {pending.length > 0 ? `${pending.length} Photo${pending.length === 1 ? "" : "s"}` : "Photos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ImpactReport() {
  const { programs } = usePrograms();
  const { company } = useAuth();
  const companyName = useCompanyName();
  const reportRef = useRef<HTMLDivElement>(null);

  const [addPhotosOpen, setAddPhotosOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(() => loadGalleryPhotos());
  // Seeded from localStorage as the fallback; overwritten by Supabase data
  // once that fetch resolves (see effect below).
  const [partnerships, setPartnerships] = useState<ResolvedPartnership[]>(() =>
    resolvePartnerships().filter((p) => p.record.status === "Active Partner"),
  );
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>(() => loadActivityLog());
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [showBanner, setShowBanner] = useState(() => shouldShowFeatureBanner("impact-report"));

  function handleDismissBanner() {
    dismissRecommendation(DISMISS_KEYS["impact-report"]);
    setShowBanner(false);
  }

  // Load partnerships + activity logs from Supabase, company-scoped. Falls
  // back to the localStorage-seeded state above if Supabase fails or no
  // company is resolved yet.
  useEffect(() => {
    let active = true;
    if (!company?.id) {
      setMetricsLoading(false);
      return;
    }

    setMetricsLoading(true);
    Promise.all([
      supabase.from("partnerships").select("*").eq("company_id", company.id),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false }),
    ]).then(([partnershipsRes, activityRes]) => {
      if (!active) return;
      if (partnershipsRes.error || activityRes.error) {
        console.error(
          "Failed to load impact report data from Supabase:",
          partnershipsRes.error ?? activityRes.error,
        );
        setMetricsLoading(false);
        return;
      }

      const partnershipRows = (partnershipsRes.data ?? []) as SupabasePartnershipRow[];
      const nameById = new Map(partnershipRows.map((row) => [row.id, row.nonprofit_name]));

      setPartnerships(
        partnershipRows
          .filter((row) => row.partnership_status === "active_partner")
          .map(activePartnershipRowToResolved),
      );

      const activityRows = (activityRes.data ?? []) as SupabaseActivityLogRow[];
      setActivityEntries(
        activityRows.map((row) => activityRowToEntry(row, nameById.get(row.partnership_id) ?? "Unknown")),
      );

      setMetricsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [company?.id]);

  const activePrograms = useMemo(() => programs.filter((p) => p.status !== "Archived"), [programs]);
  const activePartnerships = useMemo(
    () => partnerships.filter((p) => p.record.status === "Active Partner"),
    [partnerships],
  );
  const totals = useMemo(() => activityTotals(activityEntries), [activityEntries]);

  const dateRangeStart = useMemo(() => {
    if (activePrograms.length === 0) return null;
    return activePrograms.reduce((min, p) => (p.createdAt < min ? p.createdAt : min), activePrograms[0].createdAt);
  }, [activePrograms]);

  const causeAreas = useMemo(() => {
    const causes = new Set<string>();
    for (const p of activePrograms) {
      for (const n of p.blueprint.nonprofits) causes.add(n.cause);
    }
    for (const ap of activePartnerships) causes.add(ap.cause);
    return [...causes];
  }, [activePrograms, activePartnerships]);

  const galleryItems: GalleryItem[] = useMemo(() => {
    const fromGallery: GalleryItem[] = galleryPhotos.map((p) => ({
      id: p.id,
      dataUrl: p.dataUrl,
      caption: p.caption || formatProgramDate(p.addedAt),
    }));
    const fromActivity: GalleryItem[] = activityEntries.flatMap((entry) =>
      entry.photos.map((photo) => ({
        id: photo.id,
        dataUrl: photo.dataUrl,
        caption: `${entry.nonprofitName} — ${formatProgramDate(entry.date)}`,
      })),
    );
    return [...fromGallery, ...fromActivity];
  }, [galleryPhotos, activityEntries]);

  function handlePhotosAdded(newPhotos: GalleryPhoto[]) {
    const all = addGalleryPhotos(newPhotos);
    setGalleryPhotos(all);
  }

  async function handleDownloadPdf() {
    if (!reportRef.current) return;
    localStorage.setItem("compass_impact_downloaded_v1", "true");
    await toast.promise(
      exportElementToPdf(reportRef.current, buildPdfFilename("Compass-Impact-Report", companyName)),
      { loading: "Generating PDF…", success: "PDF downloaded", error: "Failed to generate PDF" },
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10" ref={reportRef}>
      {/* Contextual banner */}
      {showBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-start gap-3">
          <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground flex-1">
            Your leadership team expects updates — download your Impact Report as PDF and share it with them today.
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
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary mb-1">{companyName}</p>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Impact Report</h1>
          <p className="text-sm text-muted-foreground">
            {dateRangeStart ? formatProgramDate(dateRangeStart) : "—"} to {formatProgramDate(new Date().toISOString())}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddPhotosOpen(true)}>
            <ImagePlus className="h-4 w-4" /> Add Photos
          </Button>
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => void handleDownloadPdf()}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Summary metrics */}
      {metricsLoading && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground -mb-6">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Loading impact data…
        </span>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Active Programs" value={activePrograms.length} icon={TrendingUp} />
        <StatCard label="Total Volunteer Hours" value={totals.volunteerHours} icon={CalendarDays} />
        <StatCard label="Total Employees Engaged" value={totals.employeesEngaged} icon={Users} />
        <StatCard label="Total Dollars Donated" value={`$${totals.dollarsDonated.toLocaleString()}`} icon={DollarSign} />
        <StatCard label="Total Events Held" value={totals.eventsHeld} icon={Award} />
        <StatCard label="Active Nonprofit Partners" value={activePartnerships.length} icon={Heart} />
      </div>

      {/* By Program */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">By Program</h2>
        {activePrograms.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No active programs yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activePrograms.map((program) => {
              const { done, total } = countCompletedTasks(program.id, program.blueprint);
              const linkedPartnerships = activePartnerships.filter((ap) =>
                program.blueprint.nonprofits.some((n) => n.name.toLowerCase() === ap.nonprofitName.toLowerCase()),
              );
              return (
                <Card key={program.id} className="border-border shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-semibold text-foreground">{program.name}</h3>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                              PROGRAM_STATUS_STYLES[program.status as keyof typeof PROGRAM_STATUS_STYLES] ??
                              "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {program.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Created {formatProgramDate(program.createdAt)}</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <Link to={`/programs/${program.id}/blueprint`}>
                          <FileText className="h-3.5 w-3.5" /> View Blueprint
                        </Link>
                      </Button>
                    </div>

                    {program.intake?.step2?.programTypes && program.intake.step2.programTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {program.intake.step2.programTypes.map((type) => (
                          <span key={type} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                            {type}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{done} of {total}</span> tasks completed
                    </div>

                    {program.blueprint.nonprofits.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nonprofit Partners</p>
                        <div className="flex flex-wrap gap-1.5">
                          {program.blueprint.nonprofits.map((n) => (
                            <span key={n.name} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${n.color}`}>
                              {n.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {linkedPartnerships.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Active Partnerships</p>
                        <div className="flex flex-wrap gap-1.5">
                          {linkedPartnerships.map((ap) => (
                            <span key={ap.key} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-medium">
                              <Award className="h-3 w-3" /> {ap.nonprofitName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Partnerships */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Active Partnerships</h2>
        {activePartnerships.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No active nonprofit partnerships yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePartnerships.map((ap) => {
              const entries = activityEntries.filter((e) => e.partnershipKey === ap.key);
              const partnerTotals = activityTotals(entries);
              const causeColor = CAUSE_COLORS[ap.cause] ?? "bg-muted text-muted-foreground border-border";
              const photos = entries.flatMap((e) => e.photos).slice(0, 6);
              return (
                <Card key={ap.key} className="border-border shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground">{ap.nonprofitName}</h3>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${causeColor}`}>
                        {ap.cause}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {ap.record.activePartnerDetails?.partnershipType && (
                        <p>Type: {ap.record.activePartnerDetails.partnershipType}</p>
                      )}
                      {ap.record.activePartnerDetails?.startDate && (
                        <p>Since {formatProgramDate(ap.record.activePartnerDetails.startDate)}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-accent/20 border border-border px-2 py-1.5">
                        <span className="font-semibold text-foreground">{partnerTotals.volunteerHours}</span> volunteer hrs
                      </div>
                      <div className="rounded-md bg-accent/20 border border-border px-2 py-1.5">
                        <span className="font-semibold text-foreground">{partnerTotals.employeesEngaged}</span> employees
                      </div>
                      <div className="rounded-md bg-accent/20 border border-border px-2 py-1.5">
                        <span className="font-semibold text-foreground">${partnerTotals.dollarsDonated.toLocaleString()}</span> donated
                      </div>
                      <div className="rounded-md bg-accent/20 border border-border px-2 py-1.5">
                        <span className="font-semibold text-foreground">{partnerTotals.eventsHeld}</span> events
                      </div>
                    </div>
                    {photos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {photos.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setLightboxItem({ id: p.id, dataUrl: p.dataUrl, caption: ap.nonprofitName })}
                          >
                            <img src={p.dataUrl} alt={p.fileName} className="h-12 w-12 object-cover rounded-md border border-border" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/partnerships/${encodeURIComponent(ap.nonprofitName)}`}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View partnership <ExternalLink className="h-3 w-3" />
                      </Link>
                      <Link
                        to={`/partnerships/${encodeURIComponent(ap.nonprofitName)}?scroll=activity`}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Entry
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Cause areas */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Cause Areas Covered</h2>
        {causeAreas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cause areas recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {causeAreas.map((cause) => (
              <span
                key={cause}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${
                  CAUSE_COLORS[cause] ?? "bg-muted text-muted-foreground border-border"
                }`}
              >
                {cause}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Company photo gallery */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Company Photo Gallery</h2>
        {galleryItems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No photos yet. Log activities with photos or use "Add Photos" above.
            </CardContent>
          </Card>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 gap-3 [column-fill:_balance]">
            {galleryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightboxItem(item)}
                className="mb-3 block w-full break-inside-avoid rounded-lg overflow-hidden border border-border group relative"
              >
                <img src={item.dataUrl} alt={item.caption} className="w-full h-auto object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                  {item.caption}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <AddPhotosDialog open={addPhotosOpen} onOpenChange={setAddPhotosOpen} onAdded={handlePhotosAdded} />

      {/* Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-8"
          onClick={() => setLightboxItem(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxItem(null)}
            className="absolute top-6 right-6 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxItem.dataUrl}
            alt={lightboxItem.caption}
            className="max-h-[80vh] max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-white text-sm mt-4">{lightboxItem.caption}</p>
        </div>
      )}
    </div>
  );
}
