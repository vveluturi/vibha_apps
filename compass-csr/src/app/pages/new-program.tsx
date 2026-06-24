import { useNavigate } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { WizardShell } from "../components/wizard-shell";
import { useWizard } from "../context/wizard-context";
import type { Step1Data } from "../context/wizard-context";

const INDUSTRIES = [
  "Technology", "Retail", "Financial Services", "Healthcare",
  "Manufacturing", "Professional Services", "Food & Beverage", "Education", "Other",
];

const COMPANY_SIZES = [
  { label: "1–50", value: "1-50" },
  { label: "51–200", value: "51-200" },
  { label: "201–1,000", value: "201-1000" },
  { label: "1,001–5,000", value: "1001-5000" },
  { label: "5,000+", value: "5000+" },
];

const CORE_VALUES = [
  "Innovation", "Community", "Sustainability", "Diversity & Inclusion",
  "Integrity", "Health & Wellbeing", "Education", "Economic Empowerment",
  "Environmental Stewardship",
];

const AUDIENCES = [
  { label: "Customers", value: "customers" },
  { label: "Employees", value: "employees" },
  { label: "Local Community", value: "local-community" },
  { label: "All of the above", value: "all" },
];

function isComplete(d: Step1Data): boolean {
  return (
    d.companyName.trim().length > 0 &&
    d.industry !== "" &&
    d.companySize !== "" &&
    d.missionStatement.trim().length > 0 &&
    d.coreValues.length > 0 &&
    d.primaryAudience !== ""
  );
}

export function NewProgram() {
  const navigate = useNavigate();
  const { step1, updateStep1 } = useWizard();

  function toggleCoreValue(value: string) {
    const already = step1.coreValues.includes(value);
    if (already) {
      updateStep1({ coreValues: step1.coreValues.filter((v) => v !== value) });
    } else if (step1.coreValues.length < 5) {
      updateStep1({ coreValues: [...step1.coreValues, value] });
    }
  }

  const complete = isComplete(step1);

  return (
    <WizardShell step={1}>
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Tell us about your company</CardTitle>
          <CardDescription>
            This helps us tailor your CSR program recommendations to fit your brand and audience.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-7 pt-4">

          <Field label="Company name" required>
            <input
              type="text"
              placeholder="Acme Corporation"
              value={step1.companyName}
              onChange={(e) => updateStep1({ companyName: e.target.value })}
              className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </Field>

          <Field label="Industry" required>
            <select
              value={step1.industry}
              onChange={(e) => updateStep1({ industry: e.target.value })}
              className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              <option value="" disabled>Select an industry…</option>
              {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </Field>

          <Field label="Company size" required>
            <div className="flex flex-wrap gap-2">
              {COMPANY_SIZES.map((size) => (
                <RadioPill
                  key={size.value}
                  label={size.label}
                  selected={step1.companySize === size.value}
                  onClick={() => updateStep1({ companySize: size.value })}
                />
              ))}
            </div>
          </Field>

          <Field
            label="What is your company's mission or purpose?"
            hint="This helps us tailor your CSR program to feel authentic to your brand."
            required
          >
            <textarea
              rows={4}
              placeholder="We exist to empower small businesses with tools that were once only available to large enterprises…"
              value={step1.missionStatement}
              onChange={(e) => updateStep1({ missionStatement: e.target.value })}
              className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
          </Field>

          <Field
            label="Core values"
            hint={`Select up to 5 values that define your company culture. ${step1.coreValues.length}/5 selected.`}
            required
          >
            <div className="flex flex-wrap gap-2">
              {CORE_VALUES.map((value) => {
                const selected = step1.coreValues.includes(value);
                const disabled = !selected && step1.coreValues.length >= 5;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleCoreValue(value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : disabled
                        ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                        : "bg-white text-foreground border-border hover:border-primary/50 hover:bg-accent/40 cursor-pointer"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    {value}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Primary audience for your CSR program" required>
            <div className="space-y-2">
              {AUDIENCES.map((aud) => (
                <label
                  key={aud.value}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md border cursor-pointer transition-all ${
                    step1.primaryAudience === aud.value
                      ? "border-primary bg-accent/30"
                      : "border-border bg-white hover:border-primary/40 hover:bg-accent/10"
                  }`}
                >
                  <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    step1.primaryAudience === aud.value ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {step1.primaryAudience === aud.value && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="primaryAudience"
                    value={aud.value}
                    checked={step1.primaryAudience === aud.value}
                    onChange={() => updateStep1({ primaryAudience: aud.value })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-foreground">{aud.label}</span>
                </label>
              ))}
            </div>
          </Field>

          <div className="pt-2 flex justify-end border-t border-border">
            <Button
              size="lg"
              disabled={!complete}
              onClick={() => navigate("/new-program/step-2")}
              className={`gap-2 transition-all ${
                complete
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              Continue to Step 2
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

        </CardContent>
      </Card>
    </WizardShell>
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

function RadioPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white text-foreground border-border hover:border-primary/50 hover:bg-accent/30"
      }`}
    >
      {label}
    </button>
  );
}
