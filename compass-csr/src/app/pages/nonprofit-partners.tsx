import { useState, useMemo } from "react";
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
} from "lucide-react";
import { usePrograms } from "../context/programs-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Nonprofit {
  id: string;
  name: string;
  mission: string;
  cause: string;
  location: string;
  website: string;
  size: string; // e.g. "Large", "Mid-size", "Small"
  partnershipTypes: string[];
}

// ─── Cause areas ──────────────────────────────────────────────────────────────

const CAUSE_AREAS = [
  "All",
  "Education",
  "Environment",
  "Food Security",
  "Workforce Development",
  "Health & Wellbeing",
  "Diversity & Inclusion",
  "Community Development",
  "Youth & Families",
];

const CAUSE_COLORS: Record<string, string> = {
  "Education":             "bg-blue-50 text-blue-700 border-blue-200",
  "Environment":           "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Food Security":         "bg-orange-50 text-orange-700 border-orange-200",
  "Workforce Development": "bg-violet-50 text-violet-700 border-violet-200",
  "Health & Wellbeing":    "bg-rose-50 text-rose-700 border-rose-200",
  "Diversity & Inclusion": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Community Development": "bg-teal-50 text-teal-700 border-teal-200",
  "Youth & Families":      "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Nonprofit directory (placeholder data) ───────────────────────────────────

const NONPROFITS: Nonprofit[] = [
  {
    id: "1",
    name: "Feeding America",
    mission: "Advance change in America by ensuring equitable access to nutritious food for all.",
    cause: "Food Security",
    location: "Chicago, IL (National)",
    website: "feedingamerica.org",
    size: "Large",
    partnershipTypes: ["Corporate Giving", "Employee Volunteering", "Donation Matching"],
  },
  {
    id: "2",
    name: "Year Up",
    mission: "Closing the opportunity divide by providing young adults with skills, experience, and support.",
    cause: "Workforce Development",
    location: "Boston, MA (National)",
    website: "yearup.org",
    size: "Large",
    partnershipTypes: ["Skills-Based Volunteering", "Internship Programs", "Corporate Giving"],
  },
  {
    id: "3",
    name: "The Nature Conservancy",
    mission: "Conserving the lands and waters on which all life depends.",
    cause: "Environment",
    location: "Arlington, VA (Global)",
    website: "nature.org",
    size: "Large",
    partnershipTypes: ["Corporate Giving", "Employee Volunteering", "Cause Marketing"],
  },
  {
    id: "4",
    name: "Boys & Girls Clubs of America",
    mission: "Enable all young people, especially those who need us most, to reach their full potential.",
    cause: "Youth & Families",
    location: "Atlanta, GA (National)",
    website: "bgca.org",
    size: "Large",
    partnershipTypes: ["Employee Volunteering", "Corporate Giving", "Mentorship"],
  },
  {
    id: "5",
    name: "Khan Academy",
    mission: "Providing a free, world-class education for anyone, anywhere.",
    cause: "Education",
    location: "Mountain View, CA (Global)",
    website: "khanacademy.org",
    size: "Mid-size",
    partnershipTypes: ["Corporate Giving", "Skills-Based Volunteering"],
  },
  {
    id: "6",
    name: "American Red Cross",
    mission: "Preventing and alleviating human suffering in the face of emergencies.",
    cause: "Health & Wellbeing",
    location: "Washington, DC (National)",
    website: "redcross.org",
    size: "Large",
    partnershipTypes: ["Employee Volunteering", "Disaster Relief Giving", "Blood Drives"],
  },
  {
    id: "7",
    name: "Urban Alliance",
    mission: "Bridging the gap between underserved youth and meaningful employment.",
    cause: "Workforce Development",
    location: "Washington, DC",
    website: "theurbanalliance.org",
    size: "Mid-size",
    partnershipTypes: ["Internship Programs", "Mentorship", "Skills-Based Volunteering"],
  },
  {
    id: "8",
    name: "Meals on Wheels America",
    mission: "Empowering local community programs to improve the health and quality of life of seniors.",
    cause: "Food Security",
    location: "Arlington, VA (National)",
    website: "mealsonwheelsamerica.org",
    size: "Large",
    partnershipTypes: ["Employee Volunteering", "Corporate Giving", "Donation Matching"],
  },
  {
    id: "9",
    name: "National Urban League",
    mission: "Empowering African Americans and other underserved communities to achieve economic self-reliance.",
    cause: "Diversity & Inclusion",
    location: "New York, NY (National)",
    website: "nul.org",
    size: "Large",
    partnershipTypes: ["Corporate Giving", "Skills-Based Volunteering", "Sponsorship"],
  },
  {
    id: "10",
    name: "Habitat for Humanity",
    mission: "Seeking to put God's love into action, bringing people together to build homes and hope.",
    cause: "Community Development",
    location: "Americus, GA (Global)",
    website: "habitat.org",
    size: "Large",
    partnershipTypes: ["Employee Volunteering", "Corporate Giving", "Team Build Events"],
  },
  {
    id: "11",
    name: "Girls Who Code",
    mission: "Closing the gender gap in technology and supporting women in computing fields.",
    cause: "Diversity & Inclusion",
    location: "New York, NY (National)",
    website: "girlswhocode.com",
    size: "Mid-size",
    partnershipTypes: ["Skills-Based Volunteering", "Corporate Giving", "Mentorship"],
  },
  {
    id: "12",
    name: "Sierra Club Foundation",
    mission: "Protecting and restoring the wild places and wild things upon which all life depends.",
    cause: "Environment",
    location: "Oakland, CA (National)",
    website: "sierraclubfoundation.org",
    size: "Mid-size",
    partnershipTypes: ["Corporate Giving", "Cause Marketing", "Employee Volunteering"],
  },
];

// ─── Storage for connected partners ──────────────────────────────────────────

const CONNECTED_KEY = "compass_connected_nonprofits_v1";

function loadConnected(): string[] {
  try {
    const raw = localStorage.getItem(CONNECTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConnected(ids: string[]) {
  try { localStorage.setItem(CONNECTED_KEY, JSON.stringify(ids)); } catch { /* silent */ }
}

// ─── Nonprofit Card ───────────────────────────────────────────────────────────

function NonprofitCard({
  nonprofit,
  connected,
  onConnect,
  featured = false,
}: {
  nonprofit: Nonprofit;
  connected: boolean;
  onConnect: (id: string) => void;
  featured?: boolean;
}) {
  const causeColor = CAUSE_COLORS[nonprofit.cause] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Card className={`border-border shadow-sm hover:shadow-md transition-all duration-200 ${featured ? "ring-2 ring-primary/20" : ""}`}>
      <CardContent className="p-5 flex flex-col h-full">
        {featured && (
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="h-3 w-3 text-primary fill-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">Suggested for you</span>
          </div>
        )}

        {/* Name + cause */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-foreground leading-snug">{nonprofit.name}</h3>
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
            <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex-1" disabled>
              <CheckCircle2 className="h-4 w-4" /> Connected
            </Button>
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

  const suggestedNonprofits = NONPROFITS.filter((n) => suggestedIds.includes(n.id));

  // Filter by search + cause
  const filtered = useMemo(() => {
    return NONPROFITS.filter((n) => {
      const matchesCause = activeCause === "All" || n.cause === activeCause;
      const matchesSearch =
        search.trim() === "" ||
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.mission.toLowerCase().includes(search.toLowerCase()) ||
        n.cause.toLowerCase().includes(search.toLowerCase());
      return matchesCause && matchesSearch;
    });
  }, [search, activeCause]);

  function handleConnect(id: string) {
    const updated = connected.includes(id)
      ? connected.filter((c) => c !== id)
      : [...connected, id];
    setConnected(updated);
    saveConnected(updated);
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
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}