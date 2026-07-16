import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Download, Share2, Save, ChevronRight, Sparkles, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { WizardShell } from "../components/wizard-shell";
import { BlueprintView, type BlueprintViewHandle } from "../components/blueprint-view";
import { SaveProgramDialog } from "../components/save-program-dialog";
import { useWizard } from "../context/wizard-context";
import { usePrograms } from "../context/programs-context";
import { suggestProgramName } from "../lib/blueprint-data";
import { buildPdfFilename } from "../lib/pdf-export";
import type { BlueprintData } from "../types/program";

// ─── Status messages shown during loading ─────────────────────────────────────

const STATUS_MESSAGES = [
  "Analyzing your brand values…",
  "Matching nonprofit partners…",
  "Building your program timeline…",
  "Preparing your blueprint…",
  "Almost there…",
];

// ─── System prompt sent to Claude ─────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an expert CSR (Corporate Social Responsibility) strategist with deep knowledge of nonprofit partnerships, employee engagement programs, ESG reporting, and cause marketing. You help mid-market companies design authentic, effective CSR programs.

When given a company's profile and preferences, you generate a complete, tailored CSR program blueprint.

You MUST respond with ONLY a valid JSON object — no markdown, no backticks, no preamble, no explanation. Just raw JSON.

The JSON must match this exact shape:
{
  "generatedAt": "<ISO date string>",
  "overview": "<2-3 sentence summary of the recommended program tailored to this specific company>",
  "pillars": [
    { "icon": "<one of: Users|Heart|Sparkles|Globe|Megaphone|FileText>", "title": "<pillar name>", "desc": "<1-2 sentence description>" },
    { "icon": "...", "title": "...", "desc": "..." },
    { "icon": "...", "title": "...", "desc": "..." }
  ],
  "phases": [
    {
      "label": "Foundation",
      "range": "Days 1–14",
      "color": "bg-teal-50 border-teal-200",
      "dot": "bg-teal-500",
      "tasks": ["<task 1>", "<task 2>", "<task 3>", "<task 4>"]
    },
    {
      "label": "Planning",
      "range": "Days 15–30",
      "color": "bg-emerald-50 border-emerald-200",
      "dot": "bg-emerald-500",
      "tasks": ["<task 1>", "<task 2>", "<task 3>", "<task 4>"]
    },
    {
      "label": "Launch",
      "range": "Days 31–60",
      "color": "bg-cyan-50 border-cyan-200",
      "dot": "bg-cyan-500",
      "tasks": ["<task 1>", "<task 2>", "<task 3>", "<task 4>"]
    },
    {
      "label": "Expand",
      "range": "Days 61–90",
      "color": "bg-blue-50 border-blue-200",
      "dot": "bg-blue-500",
      "tasks": ["<task 1>", "<task 2>", "<task 3>", "<task 4>"]
    }
  ],
  "nonprofits": [
    {
      "name": "<real nonprofit name>",
      "cause": "<cause area>",
      "desc": "<1-2 sentence description of the nonprofit and why it fits this company>",
      "color": "<one of: bg-orange-50 text-orange-700 border-orange-200 | bg-violet-50 text-violet-700 border-violet-200 | bg-teal-50 text-teal-700 border-teal-200 | bg-blue-50 text-blue-700 border-blue-200 | bg-emerald-50 text-emerald-700 border-emerald-200 | bg-rose-50 text-rose-700 border-rose-200>"
    },
    { "name": "...", "cause": "...", "desc": "...", "color": "..." },
    { "name": "...", "cause": "...", "desc": "...", "color": "..." }
  ],
  "positioning": [
    { "icon": "Globe", "channel": "Website Page", "suggestion": "<specific suggestion for this company>" },
    { "icon": "Megaphone", "channel": "Social Media", "suggestion": "<specific suggestion>" },
    { "icon": "FileText", "channel": "Press Release", "suggestion": "<specific suggestion>" }
  ],
  "sampleWebsiteCopy": {
    "headline": "<a compelling headline for this specific company's CSR page>",
    "body": "<2-3 sentences of sample website copy mentioning the company name and their specific program focus>"
  },
  "roles": [
    { "role": "<role title>", "responsibility": "<what they own>", "time": "<e.g. 4-6 hrs/week>" },
    { "role": "...", "responsibility": "...", "time": "..." },
    { "role": "...", "responsibility": "...", "time": "..." },
    { "role": "...", "responsibility": "...", "time": "..." },
    { "role": "...", "responsibility": "...", "time": "..." }
  ]
}

Make every field specific to the company's industry, mission, values, goals, and budget. Do not use generic placeholder text. The overview, tasks, nonprofit choices, and website copy should all feel tailored to this exact company.`;
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen({ progress }: { progress: number }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-24 px-6">
      <div className="relative w-24 h-24 mb-10">
        <div className="absolute inset-0 rounded-full border-4 border-border" />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
          style={{ animation: "spin 1s linear infinite" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">
        Generating your CSR program…
      </h2>
      <p
        key={msgIndex}
        className="text-sm text-muted-foreground mb-8 text-center"
        style={{ animation: "fadeIn 0.4s ease" }}
      >
        {STATUS_MESSAGES[msgIndex]}
      </p>
      <div className="w-72 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-3">{progress}%</p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-24 px-6 text-center">
      <div className="p-4 bg-destructive/10 rounded-full mb-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{message}</p>
      <Button onClick={onRetry} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        Try Again
      </Button>
    </div>
  );
}

// ─── Blueprint page ───────────────────────────────────────────────────────────

function BlueprintPage({
  blueprint,
  suggestedName,
}: {
  blueprint: BlueprintData;
  suggestedName: string;
}) {
  const navigate = useNavigate();
  const { step1, step2, step3 } = useWizard();
  const { saveProgram } = usePrograms();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const blueprintRef = useRef<BlueprintViewHandle>(null);

  function handleSave(name: string) {
    saveProgram({
      name,
      intake: { step1, step2, step3 },
      blueprint,
    });
    toast.success("Program saved to My Programs ✓");
    navigate("/my-programs");
  }

  function handleDownloadPdf() {
    void blueprintRef.current?.downloadPdf(buildPdfFilename("Compass-Blueprint", suggestedName));
  }

  return (
    <>
      <BlueprintView
        ref={blueprintRef}
        programName={suggestedName}
        companyName={step1.companyName}
        blueprint={blueprint}
        headerActions={
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 text-sm" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-sm">
              <Share2 className="h-4 w-4" /> Share with Team
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setSaveDialogOpen(true)}
            >
              <Save className="h-4 w-4" /> Save Program
            </Button>
          </div>
        }
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-10 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Save this blueprint to{" "}
              <span className="font-medium text-foreground">My Programs</span> to
              return and manage it at any time.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                onClick={() => setSaveDialogOpen(true)}
              >
                Save Program <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      />
      <SaveProgramDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        suggestedName={suggestedName}
        onSave={handleSave}
      />
    </>
  );
}

// ─── Main step 4 component ────────────────────────────────────────────────────

export function NewProgramStep4() {
  const { buildPromptPayload, step1 } = useWizard();
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const suggestedName = suggestProgramName(step1.companyName);

  async function generateBlueprint() {
    setBlueprint(null);
    setError(null);
    setProgress(0);

    const startTime = Date.now();
    const estimatedDuration = 15000;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(90, Math.round((elapsed / estimatedDuration) * 90));
      setProgress(pct);
    }, 300);

    try {
      const payload = buildPromptPayload();

      const userMessage = `Please generate a CSR program blueprint for this company:

${JSON.stringify(payload, null, 2)}

Return ONLY the JSON blueprint object. No explanation, no markdown, no backticks.`;

      const response = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: buildSystemPrompt(),
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message ?? `API error: ${response.status}`
        );
      }

      const data = await response.json();

      const rawText = data.content
        ?.filter((block: { type: string }) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("") ?? "";

      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as BlueprintData;

      if (!parsed.generatedAt) {
        parsed.generatedAt = new Date().toISOString();
      }

      setProgress(100);
      setTimeout(() => setBlueprint(parsed), 400);

    } catch (err) {
      clearInterval(progressInterval);
      console.error("Blueprint generation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate blueprint. Please try again."
      );
    }
  }

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      generateBlueprint();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WizardShell step={4}>
      {error ? (
        <ErrorScreen
          message={error}
          onRetry={() => {
            hasFetched.current = false;
            generateBlueprint();
          }}
        />
      ) : !blueprint ? (
        <LoadingScreen progress={progress} />
      ) : (
        <div>
          <button
            type="button"
            onClick={() => navigate("/new-program/step-3")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 3
          </button>
          <BlueprintPage blueprint={blueprint} suggestedName={suggestedName} />
        </div>
      )}
    </WizardShell>
  );
}