import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Handshake, Leaf, Users, Heart, Briefcase, Building2, Megaphone, GraduationCap } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { WizardShell } from "../components/wizard-shell";
import { useWizard } from "../context/wizard-context";
import type { Step2Data } from "../context/wizard-context";

const PROGRAM_TYPES = [
  { id: "volunteering",     label: "Employee Volunteering",                   icon: Users       },
  { id: "giving",           label: "Corporate Giving / Donation Matching",     icon: Heart       },
  { id: "environmental",    label: "Environmental Sustainability",             icon: Leaf        },
  { id: "dei",              label: "Diversity, Equity & Inclusion (DEI)",      icon: Handshake   },
  { id: "probono",          label: "Skills-Based Pro Bono Work",               icon: Briefcase   },
  { id: "community",        label: "Community Partnerships",                   icon: Building2   },
  { id: "cause-marketing",  label: "Cause Marketing Campaigns",                icon: Megaphone   },
  { id: "youth",            label: "Youth & Education Programs",               icon: GraduationCap },
];

const GOALS = [
  "Increase employee engagement",
  "Strengthen brand reputation",
  "Meet ESG/investor reporting requirements",
  "Recruit and retain talent",
  "Give back to the local community",
  "Reduce environmental footprint",
  "Build customer loyalty",
];

const EXISTING_OPTIONS = [
  { value: "yes",      label: "Yes"                      },
  { value: "no",       label: "No"                       },
  { value: "informal", label: "We have something informal" },
];

const BUDGETS = [
  "Under $10K", "$10K–$50K", "$50K–$150K", "$150K–$500K", "$500K+", "Not sure yet",
];

const TIMELINES = [
  { label: "Within 1 month", value: "1-month"     },
  { label: "1–3 months",     value: "1-3-months"  },
  { label: "3–6 months",     value: "3-6-months"  },
  { label: "6–12 months",    value: "6-12-months" },
];

function isComplete(d: Step2Data): boolean {
  return (
    d.programTypes.length > 0 &&
    d.goals.length > 0 &&
    d.existingProgram !== "" &&
    d.budget !== "" &&
    d.timeline !== ""
  );
}

function toggleIn(list: string[], id: string, max?: number): string[] {
  if (list.includes(id)) return list.filter((v) => v !== id);
  if (max !== undefined && list.length >= max) return list;
  return [...list, id];
}

export function NewProgramStep2() {
  const navigate = useNavigate();
  const { step2, updateStep2 } = useWizard();
  const complete = isComplete(step2);

  return (
    <WizardShell step={2}>
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">What kind of impact do you want to make?</CardTitle>
          <CardDescription>
            Tell us about the type of programs and goals that matter most to your organization.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-4">

          {/* Program Types */}
          <Field
            label="What type of CSR program are you most interested in?"
            hint={`Select up to 3. ${step2.programTypes.length}/3 selected.`}
            required
          >
            <div className="grid grid-cols-2 gap-3">
              {PROGRAM_TYPES.map(({ id, label, icon: Icon }) => {
                const selected = step2.programTypes.includes(id);
                const disabled = !selected && step2.programTypes.length >= 3;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateStep2({ programTypes: toggleIn(step2.programTypes, id, 3) })}
                    className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all duration-150 ${
                      selected
                        ? "border-primary bg-accent/40 ring-1 ring-primary/20"
                        : disabled
                        ? "border-border bg-muted opacity-40 cursor-not-allowed"
                        : "border-border bg-white hover:border-primary/40 hover:bg-accent/20 cursor-pointer"
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-md ${selected ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-sm font-medium leading-snug ${selected ? "text-primary" : "text-foreground"}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Goals */}
          <Field
            label="What are your primary goals for this program?"
            hint={`Select up to 3. ${step2.goals.length}/3 selected.`}
            required
          >
            <div className="flex flex-col gap-2">
              {GOALS.map((goal) => {
                const selected = step2.goals.includes(goal);
                const disabled = !selected && step2.goals.length >= 3;
                return (
                  <button
                    key={goal}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateStep2({ goals: toggleIn(step2.goals, goal, 3) })}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-all duration-150 ${
                      selected
                        ? "border-primary bg-accent/30"
                        : disabled
                        ? "border-border bg-muted opacity-40 cursor-not-allowed"
                        : "border-border bg-white hover:border-primary/40 hover:bg-accent/10 cursor-pointer"
                    }`}
                  >
                    <Checkbox checked={selected} />
                    <span className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                      {goal}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Existing Program */}
          <Field label="Do you have an existing CSR or giving program?" required>
            <div className="flex gap-3">
              {EXISTING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStep2({ existingProgram: opt.value })}
                  className={`flex-1 px-3 py-2.5 rounded-md border text-sm font-medium transition-all ${
                    step2.existingProgram === opt.value
                      ? "border-primary bg-accent/30 text-primary"
                      : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-accent/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {step2.existingProgram === "yes" && (
              <div className="mt-3">
                <textarea
                  rows={3}
                  placeholder="Briefly describe what your current program looks like…"
                  value={step2.existingDescription}
                  onChange={(e) => updateStep2({ existingDescription: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>
            )}
          </Field>

          {/* Budget */}
          <Field label="Estimated annual budget for CSR" required>
            <select
              value={step2.budget}
              onChange={(e) => updateStep2({ budget: e.target.value })}
              className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              <option value="" disabled>Select a budget range…</option>
              {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>

          {/* Timeline */}
          <Field label="Preferred program launch timeline" required>
            <div className="flex flex-wrap gap-2">
              {TIMELINES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => updateStep2({ timeline: t.value })}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    step2.timeline === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-foreground border-border hover:border-primary/50 hover:bg-accent/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Navigation */}
          <div className="pt-2 flex items-center justify-between border-t border-border">
            <Button
              variant="ghost"
              onClick={() => navigate("/new-program")}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              size="lg"
              disabled={!complete}
              onClick={() => navigate("/new-program/step-3")}
              className={`gap-2 transition-all ${
                complete
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              Continue to Step 3 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

        </CardContent>
      </Card>
    </WizardShell>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
      checked ? "bg-primary border-primary" : "border-muted-foreground/40"
    }`}>
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-semibold text-foreground">
          {label}{required && <span className="text-primary ml-0.5">*</span>}
        </label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
