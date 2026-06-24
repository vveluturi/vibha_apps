import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Users, UserCheck, Megaphone, Crown, HelpCircle, ClipboardList, Shuffle, FileText, Zap, Bell, ListTodo, MessageSquare, BarChart2, HandshakeIcon, Mail, Hash, Globe, Mic, Lightbulb } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { WizardShell } from "../components/wizard-shell";
import { useWizard } from "../context/wizard-context";
import type { Step3Data } from "../context/wizard-context";

const PROGRAM_LEADERS = [
  { value: "hr",        label: "HR / People team",                    icon: Users      },
  { value: "marketing", label: "Marketing / Communications",           icon: Megaphone  },
  { value: "executive", label: "Executive / Leadership team",          icon: Crown      },
  { value: "csr-team",  label: "Dedicated CSR or Sustainability team", icon: UserCheck  },
  { value: "undecided", label: "We haven't decided yet",               icon: HelpCircle },
];

const WORK_STYLES = [
  { id: "step-by-step", label: "We like detailed step-by-step plans",                    icon: ClipboardList },
  { id: "flexible",     label: "We prefer flexibility to adapt as we go",                icon: Shuffle       },
  { id: "documented",   label: "We need everything documented for internal sign-off",     icon: FileText      },
  { id: "fast",         label: "We like to move fast and iterate",                        icon: Zap           },
  { id: "check-ins",    label: "We want regular check-ins and reminders",                 icon: Bell          },
];

const COLLAB_STYLES = [
  { id: "assign-tasks",      label: "Assign tasks to team members",                            icon: ListTodo      },
  { id: "comment",           label: "Comment and discuss within the platform",                  icon: MessageSquare },
  { id: "reports",           label: "Share progress reports with leadership",                    icon: BarChart2     },
  { id: "invite-nonprofits", label: "Invite external nonprofit partners to view our plan",       icon: HandshakeIcon },
];

const COMMS_CHANNELS = [
  { id: "email",     label: "Internal email newsletter",      icon: Mail      },
  { id: "slack",     label: "Slack / Teams messages",          icon: Hash      },
  { id: "intranet",  label: "Company intranet",                icon: Globe     },
  { id: "townhall",  label: "Town halls / all-hands",          icon: Mic       },
  { id: "undecided", label: "We haven't thought about this yet", icon: Lightbulb },
];

function isComplete(d: Step3Data): boolean {
  const size = parseInt(d.teamSize, 10);
  return (
    d.programLeader !== "" &&
    d.teamSize !== "" &&
    !isNaN(size) &&
    size >= 1 &&
    size <= 100 &&
    d.workStyles.length > 0 &&
    d.collabStyles.length > 0 &&
    d.commsChannels.length > 0
  );
}

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
}

export function NewProgramStep3() {
  const navigate = useNavigate();
  const { step3, updateStep3 } = useWizard();

  const teamSizeNum = parseInt(step3.teamSize, 10);
  const teamSizeValid =
    step3.teamSize === "" || (!isNaN(teamSizeNum) && teamSizeNum >= 1 && teamSizeNum <= 100);
  const complete = isComplete(step3);

  return (
    <WizardShell step={3}>
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">How will your team work together?</CardTitle>
          <CardDescription>
            Help us understand your team structure and collaboration preferences so we can recommend the right setup.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-4">

          {/* Program Leader */}
          <Field label="Who will lead this program?" required>
            <div className="space-y-2">
              {PROGRAM_LEADERS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateStep3({ programLeader: value })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-all ${
                    step3.programLeader === value
                      ? "border-primary bg-accent/30"
                      : "border-border bg-white hover:border-primary/40 hover:bg-accent/10"
                  }`}
                >
                  <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    step3.programLeader === value ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {step3.programLeader === value && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <Icon className={`h-4 w-4 flex-shrink-0 ${step3.programLeader === value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${step3.programLeader === value ? "text-primary" : "text-foreground"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          {/* Team Size */}
          <Field
            label="How many team members will be involved in running the program?"
            hint="Enter a number between 1 and 100."
            required
          >
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={100}
                placeholder="e.g. 8"
                value={step3.teamSize}
                onChange={(e) => updateStep3({ teamSize: e.target.value })}
                className={`w-32 px-3 py-2.5 rounded-md border bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition ${
                  !teamSizeValid ? "border-destructive" : "border-border"
                }`}
              />
              <span className="text-sm text-muted-foreground">team members</span>
            </div>
            {!teamSizeValid && (
              <p className="text-xs text-destructive mt-1">Please enter a number between 1 and 100.</p>
            )}
          </Field>

          {/* Work Styles */}
          <Field label="How does your team prefer to work?" hint="Select all that apply." required>
            <MultiSelectList
              items={WORK_STYLES}
              selected={step3.workStyles}
              onToggle={(id) => updateStep3({ workStyles: toggleIn(step3.workStyles, id) })}
            />
          </Field>

          {/* Collab Styles */}
          <Field label="How would you like to collaborate on this platform?" hint="Select all that apply." required>
            <MultiSelectList
              items={COLLAB_STYLES}
              selected={step3.collabStyles}
              onToggle={(id) => updateStep3({ collabStyles: toggleIn(step3.collabStyles, id) })}
            />
          </Field>

          {/* Comms Channels */}
          <Field label="How should we communicate progress with your employees?" hint="Select all that apply." required>
            <MultiSelectList
              items={COMMS_CHANNELS}
              selected={step3.commsChannels}
              onToggle={(id) => updateStep3({ commsChannels: toggleIn(step3.commsChannels, id) })}
            />
          </Field>

          {/* Navigation */}
          <div className="pt-2 flex items-center justify-between border-t border-border">
            <Button
              variant="ghost"
              onClick={() => navigate("/new-program/step-2")}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              size="lg"
              disabled={!complete}
              onClick={() => navigate("/new-program/step-4")}
              className={`gap-2 transition-all ${
                complete
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              Continue to Step 4 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

        </CardContent>
      </Card>
    </WizardShell>
  );
}

function MultiSelectList({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; label: string; icon: React.ElementType }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map(({ id, label, icon: Icon }) => {
        const isSelected = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-all ${
              isSelected
                ? "border-primary bg-accent/30"
                : "border-border bg-white hover:border-primary/40 hover:bg-accent/10"
            }`}
          >
            <Checkbox checked={isSelected} />
            <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
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
