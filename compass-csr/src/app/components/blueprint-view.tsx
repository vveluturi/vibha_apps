import { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  Download,
  Share2,
  Users,
  Heart,
  Sparkles,
  Check,
  Globe,
  Megaphone,
  FileText,
  ChevronRight,
  Calendar,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { BlueprintData, BlueprintIcon } from "../types/program";
import { formatProgramDate } from "../lib/blueprint-data";
import { exportElementToPdf, buildPdfFilename } from "../lib/pdf-export";
import { loadCheckedTasks, saveCheckedTasks } from "../lib/blueprint-tasks";

const ICON_MAP = {
  Users,
  Heart,
  Sparkles,
  Globe,
  Megaphone,
  FileText,
} satisfies Record<BlueprintIcon, typeof Users>;

interface BlueprintViewProps {
  programName: string;
  companyName: string;
  blueprint: BlueprintData;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  showFooterActions?: boolean;
  // When provided (a saved program's id), task checkbox state persists to
  // localStorage so the Impact Report can read completion counts. Omitted
  // for the in-wizard preview, where the blueprint hasn't been saved yet.
  storageKey?: string;
}

export interface BlueprintViewHandle {
  downloadPdf: (filename: string) => Promise<void>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground mb-3">{children}</h2>;
}

export const BlueprintView = forwardRef<BlueprintViewHandle, BlueprintViewProps>(function BlueprintView({
  programName,
  companyName,
  blueprint,
  headerActions,
  footer,
  showFooterActions = true,
  storageKey,
}, ref) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    storageKey ? loadCheckedTasks(storageKey) : {},
  );
  const displayName = companyName.trim() || "Your Company";
  const generatedDate = formatProgramDate(blueprint.generatedAt);
  const contentRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    downloadPdf: async (filename: string) => {
      if (!contentRef.current) return;
      await toast.promise(exportElementToPdf(contentRef.current, filename), {
        loading: "Generating PDF…",
        success: "PDF downloaded",
        error: "Failed to generate PDF",
      });
    },
  }));

  function toggleTask(key: string) {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (storageKey) saveCheckedTasks(storageKey, next);
      return next;
    });
  }

  async function handleDefaultDownload() {
    if (!contentRef.current) return;
    await toast.promise(
      exportElementToPdf(contentRef.current, buildPdfFilename("Compass-Blueprint", programName)),
      { loading: "Generating PDF…", success: "PDF downloaded", error: "Failed to generate PDF" },
    );
  }

  return (
    <div ref={contentRef} className="space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-primary mb-3">
            <SparklesIcon className="h-3.5 w-3.5" /> AI-Generated Blueprint
          </div>
          <h1 className="text-3xl font-semibold text-foreground leading-tight mb-2">
            {programName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tailored to {displayName} &nbsp;·&nbsp; Generated {generatedDate}
          </p>
        </div>
        {headerActions ?? (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 text-sm" onClick={() => void handleDefaultDownload()}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-sm">
              <Share2 className="h-4 w-4" /> Share with Team
            </Button>
          </div>
        )}
      </div>

      <section>
        <SectionLabel>Program Overview</SectionLabel>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-foreground leading-relaxed">
              {blueprint.overview}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {blueprint.pillars.map(({ icon, title, desc }) => {
                const Icon = ICON_MAP[icon];
                return (
                  <div
                    key={title}
                    className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-accent/20"
                  >
                    <div className="p-2 bg-primary/10 rounded-md w-fit">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionLabel>90-Day Launch Timeline</SectionLabel>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="hidden md:flex items-center mb-6">
              {blueprint.phases.map((phase, i) => (
                <div key={phase.label} className="flex-1 flex items-center">
                  <div className="flex-1 flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${phase.dot} ring-4 ring-white z-10`} />
                    <p className="text-xs font-semibold text-foreground mt-2">{phase.label}</p>
                    <p className="text-xs text-muted-foreground">{phase.range}</p>
                  </div>
                  {i < blueprint.phases.length - 1 && (
                    <div className="flex-1 h-px bg-border -mx-1" />
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {blueprint.phases.map((phase) => (
                <div key={phase.label} className={`rounded-lg border p-4 ${phase.color}`}>
                  <p className="text-xs font-semibold text-foreground mb-1 md:hidden">
                    {phase.label}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3 md:hidden">{phase.range}</p>
                  <ul className="space-y-2">
                    {phase.tasks.map((task) => {
                      const key = `${phase.label}::${task}`;
                      const done = !!checked[key];
                      return (
                        <li key={task} className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTask(key)}
                            className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              done
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/40 bg-white"
                            }`}
                          >
                            {done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </button>
                          <span
                            className={`text-xs leading-relaxed ${
                              done ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {task}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionLabel>Recommended Nonprofit Partners</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {blueprint.nonprofits.map(({ name, cause, desc, color }) => (
            <Card key={name} className="border-border shadow-sm flex flex-col">
              <CardHeader className="pb-2">
                <div
                  className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-medium border ${color} mb-2`}
                >
                  {cause}
                </div>
                <CardTitle className="text-base">{name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                <Button asChild variant="outline" size="sm" className="gap-1.5 w-full text-xs">
                  <Link to={`/partnerships/${encodeURIComponent(name)}`} state={{ cause, desc }}>
                    Explore Partnership <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Brand & Website Positioning</SectionLabel>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {blueprint.positioning.map(({ icon, channel, suggestion }) => {
                const Icon = ICON_MAP[icon];
                return (
                  <div key={channel} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-muted rounded-md">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{channel}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{suggestion}</p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border pt-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Sample Website Copy
              </p>
              <div className="bg-muted/50 rounded-lg p-5 border border-border">
                <p className="text-lg font-semibold text-foreground mb-2 leading-snug">
                  {blueprint.sampleWebsiteCopy.headline}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {blueprint.sampleWebsiteCopy.body}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionLabel>Team Roles & Responsibilities</SectionLabel>
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Responsibility
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    Time Commitment
                  </th>
                </tr>
              </thead>
              <tbody>
                {blueprint.roles.map((row, i) => (
                  <tr
                    key={row.role}
                    className={`border-b border-border last:border-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-muted/20"
                    }`}
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap align-top">
                      {row.role}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground leading-relaxed align-top">
                      {row.responsibility}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap align-top">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-accent/40 border border-primary/20 rounded-full px-2.5 py-1">
                        <Calendar className="h-3 w-3" /> {row.time}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {footer ??
        (showFooterActions && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-10 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Save this blueprint to <span className="font-medium text-foreground">My Programs</span>{" "}
              to return and manage it later.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void handleDefaultDownload()}>
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
});
