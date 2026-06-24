import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
import { Building2, Bell, User, ChevronDown, Eye, EyeOff, Camera } from "lucide-react";
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
interface CompanyProfile {
  companyName: string;
  industry: string;
  companySize: string;
  missionStatement: string;
  logoUrl: string | null;
}
 
interface NotificationPrefs {
  taskReminders: boolean;
  weeklyProgress: boolean;
  nonprofitSuggestions: boolean;
  teamActivity: boolean;
}
 
interface AccountInfo {
  name: string;
  email: string;
}
 
// ─── Storage ──────────────────────────────────────────────────────────────────
 
const SETTINGS_KEY = "compass_settings_v1";
 
interface SettingsStore {
  company: CompanyProfile;
  notifications: NotificationPrefs;
  account: AccountInfo;
}
 
const DEFAULT_SETTINGS: SettingsStore = {
  company: {
    companyName: "",
    industry: "",
    companySize: "",
    missionStatement: "",
    logoUrl: null,
  },
  notifications: {
    taskReminders: true,
    weeklyProgress: true,
    nonprofitSuggestions: false,
    teamActivity: true,
  },
  account: {
    name: "",
    email: "",
  },
};
 
function loadSettings(): SettingsStore {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SettingsStore>;
    return {
      company: { ...DEFAULT_SETTINGS.company, ...(parsed.company ?? {}) },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications ?? {}) },
      account: { ...DEFAULT_SETTINGS.account, ...(parsed.account ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
 
function persistSettings(s: SettingsStore) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // fail silently
  }
}
 
// ─── Toggle switch ────────────────────────────────────────────────────────────
 
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
 
// ─── Toast ────────────────────────────────────────────────────────────────────
 
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
 
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background text-sm px-4 py-2.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
      {message}
    </div>
  );
}
 
// ─── Section wrapper ──────────────────────────────────────────────────────────
 
function Section({
  icon: Icon,
  title,
  children,
  onSave,
  saveLabel = "Save Changes",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {children}
        {onSave && (
          <div className="pt-2">
            <Button onClick={onSave}>{saveLabel}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
 
// ─── Main page ────────────────────────────────────────────────────────────────
 
const INDUSTRIES = [
  "Technology", "Retail", "Financial Services", "Healthcare",
  "Manufacturing", "Professional Services", "Food & Beverage",
  "Education", "Other",
];
 
const COMPANY_SIZES = [
  "1–50", "51–200", "201–1,000", "1,001–5,000", "5,000+",
];
 
export function Settings() {
  const stored = loadSettings();
 
  // Company profile state
  const [company, setCompany] = useState<CompanyProfile>(stored.company);
 
  // Notifications state
  const [notifs, setNotifs] = useState<NotificationPrefs>(stored.notifications);
 
  // Account state
  const [account, setAccount] = useState<AccountInfo>(stored.account);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
 
  // Danger zone
  const [dangerOpen, setDangerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
 
  // Toast
  const [toast, setToast] = useState<string | null>(null);
 
  const logoRef = useRef<HTMLInputElement>(null);
 
  const showToast = (msg: string) => setToast(msg);
 
  const saveCompany = () => {
    const current = loadSettings();
    persistSettings({ ...current, company });
    showToast("Company profile saved ✓");
  };
 
  const saveNotifs = (updated: NotificationPrefs) => {
    const current = loadSettings();
    persistSettings({ ...current, notifications: updated });
    showToast("Notification preferences saved ✓");
  };
 
  const saveAccount = () => {
    const current = loadSettings();
    persistSettings({ ...current, account });
    showToast("Account info saved ✓");
  };
 
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setCompany((c) => ({ ...c, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };
 
  const toggleNotif = (key: keyof NotificationPrefs) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    saveNotifs(updated);
  };
 
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-semibold text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your company profile and preferences</p>
      </div>
 
      {/* ── Section 1: Company Profile ── */}
      <Section icon={Building2} title="Company Profile" onSave={saveCompany}>
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt="Company logo"
                className="h-16 w-16 rounded-xl object-contain border border-border bg-muted"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center border border-border">
                <Building2 className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <button
              onClick={() => logoRef.current?.click()}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow"
              aria-label="Upload logo"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Company Logo</p>
            <p className="text-xs text-muted-foreground">PNG or JPG, used across your programs</p>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
 
        {/* Company name */}
        <div className="space-y-1.5">
          <Label htmlFor="s-company-name">Company Name</Label>
          <Input
            id="s-company-name"
            value={company.companyName}
            onChange={(e) => setCompany((c) => ({ ...c, companyName: e.target.value }))}
            placeholder="Acme Corp"
          />
        </div>
 
        {/* Industry */}
        <div className="space-y-1.5">
          <Label>Industry</Label>
          <Select
            value={company.industry}
            onValueChange={(v) => setCompany((c) => ({ ...c, industry: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
 
        {/* Company size */}
        <div className="space-y-1.5">
          <Label>Company Size</Label>
          <Select
            value={company.companySize}
            onValueChange={(v) => setCompany((c) => ({ ...c, companySize: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s} value={s}>{s} employees</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
 
        {/* Mission statement */}
        <div className="space-y-1.5">
          <Label htmlFor="s-mission">Brand Mission Statement</Label>
          <Textarea
            id="s-mission"
            value={company.missionStatement}
            onChange={(e) => setCompany((c) => ({ ...c, missionStatement: e.target.value }))}
            placeholder="What is your company's mission or purpose?"
            rows={3}
          />
        </div>
      </Section>
 
      {/* ── Section 2: Notifications ── */}
      <Section icon={Bell} title="Notifications">
        {(
          [
            { key: "taskReminders", label: "Task reminders", desc: "Get reminded about upcoming program tasks" },
            { key: "weeklyProgress", label: "Weekly progress summary", desc: "A summary of your program's activity each week" },
            { key: "nonprofitSuggestions", label: "New nonprofit suggestions", desc: "Discover new partners aligned to your program focus" },
            { key: "teamActivity", label: "Team member activity", desc: "See when teammates complete tasks or add notes" },
          ] as { key: keyof NotificationPrefs; label: string; desc: string }[]
        ).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Toggle checked={notifs[key]} onChange={() => toggleNotif(key)} />
          </div>
        ))}
      </Section>
 
      {/* ── Section 3: Account ── */}
      <Section icon={User} title="Account" onSave={saveAccount}>
        <div className="space-y-1.5">
          <Label htmlFor="s-name">Your Name</Label>
          <Input
            id="s-name"
            value={account.name}
            onChange={(e) => setAccount((a) => ({ ...a, name: e.target.value }))}
            placeholder="Jane Smith"
          />
        </div>
 
        <div className="space-y-1.5">
          <Label htmlFor="s-email">Email Address</Label>
          <Input
            id="s-email"
            type="email"
            value={account.email}
            onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
            placeholder="jane@company.com"
          />
        </div>
 
        {/* Password */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-foreground">Change Password</p>
          <div className="space-y-1.5">
            <Label htmlFor="s-current-pw">Current Password</Label>
            <div className="relative">
              <Input
                id="s-current-pw"
                type={showCurrentPw ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Toggle password visibility"
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-new-pw">New Password</Label>
            <div className="relative">
              <Input
                id="s-new-pw"
                type={showNewPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Toggle password visibility"
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </Section>
 
      {/* ── Danger Zone ── */}
      <Card className="border-destructive/30">
        <CardContent className="p-5">
          <button
            onClick={() => setDangerOpen((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-destructive">Danger Zone</span>
            <ChevronDown
              className={`h-4 w-4 text-destructive transition-transform ${dangerOpen ? "rotate-180" : ""}`}
            />
          </button>
 
          {dangerOpen && (
            <div className="mt-4 space-y-3 border-t border-destructive/20 pt-4">
              <p className="text-sm text-muted-foreground">
                Deleting your account will permanently remove all your programs, team members, and settings. This cannot be undone.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="s-delete-confirm" className="text-sm">
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm
                </Label>
                <Input
                  id="s-delete-confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <Button
                variant="destructive"
                disabled={deleteConfirm !== "DELETE"}
                onClick={() => {
                  localStorage.clear();
                  showToast("Account deleted. Goodbye!");
                }}
              >
                Delete Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
 
      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
 