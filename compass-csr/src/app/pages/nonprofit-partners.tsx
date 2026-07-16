import { useState, useMemo } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Heart,
  Search,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Plus,
  Award,
  ClipboardList,
} from "lucide-react";
import { usePrograms } from "../context/programs-context";
import {
  CAUSE_AREAS,
  CAUSE_COLORS,
  NONPROFITS,
  loadConnected,
  saveConnected,
  type Nonprofit,
} from "../lib/nonprofits-data";
import { loadPartnerships, partnershipKey, resolveCompanyName } from "../lib/partnership-status";

// ─── Nonprofit Card ───────────────────────────────────────────────────────────

function NonprofitCard({
  nonprofit,
  connected,
  onConnect,
  featured = false,
  isActivePartner = false,
  highlighted = false,
}: {
  nonprofit: Nonprofit;
  connected: boolean;
  onConnect: (id: string) => void;
  featured?: boolean;
  isActivePartner?: boolean;
  highlighted?: boolean;
}) {
  const causeColor = CAUSE_COLORS[nonprofit.cause] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Card
      className={`border-border shadow-sm hover:shadow-md transition-all duration-200 ${
        highlighted ? "ring-2 ring-amber-300" : featured ? "ring-2 ring-primary/20" : ""
      }`}
    >
      <CardContent className={`flex flex-col h-full ${highlighted ? "p-6" : "p-5"}`}>
        {featured && (
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="h-3 w-3 text-primary fill-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">Suggested for you</span>
          </div>
        )}

        {/* Name + cause */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={`font-semibold text-foreground leading-snug ${highlighted ? "text-lg" : "text-base"}`}>{nonprofit.name}</h3>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium flex-shrink-0 ${causeColor}`}>
            {nonprofit.cause}
          </span>
        </div>

        {/* Mission */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1">
          {nonprofit.mission}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          {nonprofit.location}
        </div>

        {/* Partnership types */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {nonprofit.partnershipTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium"
            >
              {type}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          {connected ? (
            isActivePartner ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 flex-1"
                  onClick={() => onConnect(nonprofit.id)}
                >
                  <Award className="h-4 w-4" /> Active Partner ⭐
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                  <Link to={`/partnerships/${encodeURIComponent(nonprofit.name)}?scroll=activity`}>
                    <ClipboardList className="h-4 w-4" /> Log Activity
                  </Link>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex-1"
                onClick={() => onConnect(nonprofit.id)}
              >
                <CheckCircle2 className="h-4 w-4" /> Connected
              </Button>
            )
          ) : (
            <Button size="sm" className="gap-1.5 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onConnect(nonprofit.id)}>
              <Plus className="h-4 w-4" /> Connect
            </Button>
          )}
          <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground px-2" asChild>
            <a href={`https://${nonprofit.website}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function NonprofitPartners() {
  const { programs } = usePrograms();
  const [search, setSearch] = useState("");
  const [activeCause, setActiveCause] = useState("All");
  const [connected, setConnected] = useState<string[]>(loadConnected);

  // Derive suggested nonprofits from the most recent program's focus areas
  const suggestedIds = useMemo(() => {
    const latest = programs.find((p) => p.status !== "Archived");
    if (!latest) return [];
    const programTypes = latest.intake?.step2?.programTypes ?? [];
    const suggested: string[] = [];
    if (programTypes.some((t) => t.toLowerCase().includes("environment"))) suggested.push("3", "12");
    if (programTypes.some((t) => t.toLowerCase().includes("volunteer"))) suggested.push("10", "4");
    if (programTypes.some((t) => t.toLowerCase().includes("giving") || t.toLowerCase().includes("donation"))) suggested.push("1", "8");
    if (programTypes.some((t) => t.toLowerCase().includes("skills") || t.toLowerCase().includes("pro bono"))) suggested.push("2", "7");
    if (programTypes.some((t) => t.toLowerCase().includes("dei") || t.toLowerCase().includes("diversity"))) suggested.push("9", "11");
    if (programTypes.some((t) => t.toLowerCase().includes("youth") || t.toLowerCase().includes("education"))) suggested.push("5", "4");
    return [...new Set(suggested)].slice(0, 3);
  }, [programs]);

  // Nonprofits that have reached "Active Partner" status for the current company
  const activePartnerIds = useMemo(() => {
    const companyName = resolveCompanyName(programs);
    const all = loadPartnerships();
    const ids = new Set<string>();
    for (const n of NONPROFITS) {
      if (all[partnershipKey(companyName, n.name)]?.status === "Active Partner") {
        ids.add(n.id);
      }
    }
    return ids;
  }, [programs]);

  const activePartnerNonprofits = useMemo(
    () => NONPROFITS.filter((n) => activePartnerIds.has(n.id)),
    [activePartnerIds],
  );

  // Active partners get their own highlighted section above, so exclude them
  // from Suggested and the main directory to avoid showing them twice.
  const suggestedNonprofits = NONPROFITS.filter((n) => suggestedIds.includes(n.id) && !activePartnerIds.has(n.id));

  // Filter by search + cause
  const filtered = useMemo(() => {
    return NONPROFITS.filter((n) => {
      if (activePartnerIds.has(n.id)) return false;
      const matchesCause = activeCause === "All" || n.cause === activeCause;
      const matchesSearch =
        search.trim() === "" ||
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.mission.toLowerCase().includes(search.toLowerCase()) ||
        n.cause.toLowerCase().includes(search.toLowerCase());
      return matchesCause && matchesSearch;
    });
  }, [search, activeCause, activePartnerIds]);

  function handleConnect(id: string) {
    const nonprofit = NONPROFITS.find((n) => n.id === id);
    const isConnecting = !connected.includes(id);
    const updated = isConnecting
      ? [...connected, id]
      : connected.filter((c) => c !== id);
    setConnected(updated);
    saveConnected(updated);

    if (!nonprofit) return;
    if (isConnecting) {
      toast.success(`Connected with ${nonprofit.name} ✓`);
    } else {
      toast(`Disconnected from ${nonprofit.name}`);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Nonprofit Partners</h1>
        <p className="text-muted-foreground">
          Connect with verified nonprofit organizations for your CSR programs
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{NONPROFITS.length}</p>
          <p className="text-xs text-muted-foreground">Organizations</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{connected.length}</p>
          <p className="text-xs text-muted-foreground">Connected</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{CAUSE_AREAS.length - 1}</p>
          <p className="text-xs text-muted-foreground">Cause Areas</p>
        </div>
      </div>

      {/* Active Partners — highlighted section, always at the top */}
      {activePartnerNonprofits.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-amber-600" /> Active Partners
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activePartnerNonprofits.map((n) => (
              <NonprofitCard
                key={n.id}
                nonprofit={n}
                connected
                onConnect={handleConnect}
                isActivePartner
                highlighted
              />
            ))}
          </div>
          <div className="mt-6 border-t border-border" />
        </section>
      )}

      {/* Suggested section — only shows if there's a saved program */}
      {suggestedNonprofits.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Suggested for Your Program
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {suggestedNonprofits.map((n) => (
              <NonprofitCard
                key={n.id}
                nonprofit={n}
                connected={connected.includes(n.id)}
                onConnect={handleConnect}
                featured
                isActivePartner={activePartnerIds.has(n.id)}
              />
            ))}
          </div>
          <div className="mt-6 border-t border-border" />
        </section>
      )}

      {/* Search + filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nonprofits by name, mission, or cause…"
            className="pl-9"
          />
        </div>

        {/* Cause filter pills */}
        <div className="flex flex-wrap gap-2">
          {CAUSE_AREAS.map((cause) => (
            <button
              key={cause}
              onClick={() => setActiveCause(cause)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                activeCause === cause
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-foreground border-border hover:border-primary/50 hover:bg-accent/30"
              }`}
            >
              {cause}
            </button>
          ))}
        </div>
      </div>

      {/* Directory */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {activeCause === "All" ? "All Organizations" : activeCause}
          </h2>
          <span className="text-xs text-muted-foreground">{filtered.length} results</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Heart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No results found</p>
            <p className="text-sm text-muted-foreground">Try a different search term or cause area</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((n) => (
              <NonprofitCard
                key={n.id}
                nonprofit={n}
                connected={connected.includes(n.id)}
                onConnect={handleConnect}
                isActivePartner={activePartnerIds.has(n.id)}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}