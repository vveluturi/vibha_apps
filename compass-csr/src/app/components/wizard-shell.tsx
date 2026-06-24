import { useEffect, type ReactNode } from "react";
import { useWizard } from "../context/wizard-context";

// ─── Label maps (mirrors the option lists in each step) ───────────────────────

const PROGRAM_TYPE_LABELS: Record<string, string> = {
  volunteering: "Employee Volunteering",
  giving: "Corporate Giving",
  environmental: "Environmental Sustainability",
  dei: "DEI",
  probono: "Skills-Based Pro Bono",
  community: "Community Partnerships",
  "cause-marketing": "Cause Marketing",
  youth: "Youth & Education",
};

const AUDIENCE_LABELS: Record<string, string> = {
  customers: "Customers",
  employees: "Employees",
  "local-community": "Local Community",
  all: "All of the above",
};

const TIMELINE_LABELS: Record<string, string> = {
  "1-month": "Within 1 month",
  "1-3-months": "1–3 months",
  "3-6-months": "3–6 months",
  "6-12-months": "6–12 months",
};

const LEADER_LABELS: Record<string, string> = {
  hr: "HR / People team",
  marketing: "Marketing / Comms",
  executive: "Executive team",
  "csr-team": "Dedicated CSR team",
  undecided: "Not decided yet",
};

const STEP_NAMES = [
  "About Your Company",
  "Program Focus & Goals",
  "Team & Collaboration",
  "Your Blueprint",
];

// ─── Progress header ──────────────────────────────────────────────────────────

function ProgressHeader({ currentStep }: { currentStep: number }) {
  const { highestStep } = useWizard();
  const pct = Math.round((highestStep / 4) * 100);

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary">
            Step {currentStep} of 4 — {STEP_NAMES[currentStep - 1]}
          </p>
          <span className="text-xs text-muted-foreground">{pct}% complete</span>
        </div>

        {/* Bar */}
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-0">
          {STEP_NAMES.map((name, i) => {
            const stepNum = i + 1;
            const isCompleted = highestStep >= stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <div key={name} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
                      isCompleted
                        ? "bg-primary border-primary"
                        : "bg-background border-border"
                    } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
                  />
                  <span
                    className={`text-xs mt-1 whitespace-nowrap ${
                      isCurrent
                        ? "text-primary font-medium"
                        : isCompleted
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {name}
                  </span>
                </div>
                {i < STEP_NAMES.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 mb-4 transition-colors ${
                      highestStep > stepNum ? "bg-primary/40" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step summary sidebar ─────────────────────────────────────────────────────

function SummaryTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-accent/50 text-accent-foreground border border-primary/10">
      {label}
    </span>
  );
}

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground leading-snug">{value || "—"}</p>
    </div>
  );
}

function StepSummarySidebar({ currentStep }: { currentStep: number }) {
  const { step1, step2, step3 } = useWizard();

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-4 space-y-5 bg-card border border-border rounded-lg p-4">
        <p className="text-xs font-semibold text-foreground">Your answers so far</p>

        {/* Step 1 summary — always shown on steps 2-4 */}
        <SummarySection title="About Your Company">
          {step1.companyName && <SummaryRow label="Company" value={step1.companyName} />}
          {step1.industry && <SummaryRow label="Industry" value={step1.industry} />}
          {step1.companySize && <SummaryRow label="Size" value={step1.companySize} />}
          {step1.primaryAudience && (
            <SummaryRow label="Audience" value={AUDIENCE_LABELS[step1.primaryAudience] ?? step1.primaryAudience} />
          )}
          {step1.coreValues.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Values</p>
              <div className="flex flex-wrap gap-1">
                {step1.coreValues.map((v) => <SummaryTag key={v} label={v} />)}
              </div>
            </div>
          )}
          {step1.missionStatement && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Mission</p>
              <p className="text-xs text-foreground leading-relaxed line-clamp-3 italic">
                "{step1.missionStatement}"
              </p>
            </div>
          )}
        </SummarySection>

        {/* Step 2 summary — shown on steps 3-4 */}
        {currentStep >= 3 && (
          <>
            <div className="border-t border-border" />
            <SummarySection title="Program Focus">
              {step2.programTypes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Program types</p>
                  <div className="flex flex-wrap gap-1">
                    {step2.programTypes.map((id) => (
                      <SummaryTag key={id} label={PROGRAM_TYPE_LABELS[id] ?? id} />
                    ))}
                  </div>
                </div>
              )}
              {step2.goals.length > 0 && (
                <SummaryRow label="Goals" value={`${step2.goals.length} selected`} />
              )}
              {step2.budget && <SummaryRow label="Budget" value={step2.budget} />}
              {step2.timeline && (
                <SummaryRow label="Timeline" value={TIMELINE_LABELS[step2.timeline] ?? step2.timeline} />
              )}
              {step2.existingProgram && (
                <SummaryRow
                  label="Existing program"
                  value={step2.existingProgram === "yes" ? "Yes" : step2.existingProgram === "no" ? "No" : "Informal"}
                />
              )}
            </SummarySection>
          </>
        )}

        {/* Step 3 summary — shown on step 4 */}
        {currentStep >= 4 && (
          <>
            <div className="border-t border-border" />
            <SummarySection title="Team & Collaboration">
              {step3.programLeader && (
                <SummaryRow label="Led by" value={LEADER_LABELS[step3.programLeader] ?? step3.programLeader} />
              )}
              {step3.teamSize && (
                <SummaryRow label="Team size" value={`${step3.teamSize} members`} />
              )}
              {step3.workStyles.length > 0 && (
                <SummaryRow label="Work style" value={`${step3.workStyles.length} preference${step3.workStyles.length !== 1 ? "s" : ""}`} />
              )}
              {step3.commsChannels.length > 0 && (
                <SummaryRow label="Comms channels" value={`${step3.commsChannels.length} selected`} />
              )}
            </SummarySection>
          </>
        )}
      </div>
    </aside>
  );
}

// ─── WizardShell ──────────────────────────────────────────────────────────────

interface WizardShellProps {
  step: number;
  children: ReactNode;
}

export function WizardShell({ step, children }: WizardShellProps) {
  const { advanceTo } = useWizard();

  // Record that the user has reached this step
  useEffect(() => {
    advanceTo(step);
  }, [step, advanceTo]);

  const hasSidebar = step >= 2;

  return (
    <div className="min-h-full bg-background">
      <ProgressHeader currentStep={step} />

      <div className={`mx-auto px-6 py-8 ${hasSidebar ? "max-w-5xl" : "max-w-2xl"}`}>
        {hasSidebar ? (
          <div className="flex gap-6 items-start">
            <StepSummarySidebar currentStep={step} />
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
