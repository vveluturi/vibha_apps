import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Compass as CompassIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  Building2,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useAuth } from "../../context/auth-context";
import supabase from "../../../lib/supabase";

// Supabase throws plain objects (PostgrestError, AuthError) that don't all
// extend the native Error class — `instanceof Error` alone silently drops
// their `.message` and falls back to a generic string. Duck-type check for
// `.message` too so the exact Supabase error always reaches the toast.
function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

// ─── Page entry: routes to the invite flow or the "choose a path" screen ──────

export function SignUp() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  if (token) {
    return <InviteSignUpForm token={token} />;
  }

  return <ChoosePath />;
}

// ─── No token: "create a company" vs "join via invite" ────────────────────────

function ChoosePath() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <CreateCompanyForm onBack={() => setShowForm(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 via-background to-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CompassIcon className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold text-foreground">Compass</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Get started with Compass</h1>
          <p className="text-sm text-muted-foreground">Choose how you'd like to sign up</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Create a new company account</h2>
              <p className="text-sm text-muted-foreground">
                Start a brand-new CSR workspace for your company.
              </p>
              <Button
                className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setShowForm(true)}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Join an existing workspace</h2>
              <p className="text-sm text-muted-foreground">
                Ask your Admin for an invite link — it will take you directly to your team's workspace.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/signin" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── "Create a new company account" form (unchanged behavior) ─────────────────

function CreateCompanyForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !companyName.trim() || !email.trim() || !password) return;
    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        password,
      });
      if (needsEmailConfirmation) {
        toast.success("Account created — check your email to confirm before signing in");
        navigate("/signin");
      } else {
        toast.success("Account created ✓");
        navigate("/");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't create your account"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 via-background to-background p-4">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="items-center text-center pb-2">
          <button
            type="button"
            onClick={onBack}
            className="self-start flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-2 mb-3">
            <CompassIcon className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold text-foreground">Compass</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start building your CSR program today</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="su-name">Full name</Label>
              <Input
                id="su-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-company">Company name</Label>
              <Input
                id="su-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corporation"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-email">Email</Label>
              <Input
                id="su-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-password">Password</Label>
              <div className="relative">
                <Input
                  id="su-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={submitting}
            >
              {submitting ? "Creating account…" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link to="/signin" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Token present: accept an invite ───────────────────────────────────────────

interface InviteRow {
  id: string;
  company_id: string;
  email: string;
  role: string;
  token: string;
  accepted: boolean;
}

interface InviteCompany {
  id: string;
  name: string;
}

function InviteSignUpForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [company, setCompany] = useState<InviteCompany | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: inviteRow } = await supabase
        .from("invites")
        .select("*")
        .eq("token", token)
        .eq("accepted", false)
        .maybeSingle();

      if (!active) return;
      if (!inviteRow) {
        setStatus("invalid");
        return;
      }

      const { data: companyRow } = await supabase
        .from("companies")
        .select("*")
        .eq("id", inviteRow.company_id)
        .maybeSingle();

      if (!active) return;
      setInvite(inviteRow as InviteRow);
      setCompany((companyRow as InviteCompany) ?? null);
      setStatus("valid");
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invite || !fullName.trim() || !password) return;
    setSubmitting(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;
      const newUser = signUpData.user;
      if (!newUser) throw new Error("Sign up did not return a user");

      const { error: profileError } = await supabase.from("user_profiles").insert({
        id: newUser.id,
        full_name: fullName.trim(),
        email: invite.email,
        company_id: invite.company_id,
        role: invite.role,
      });
      if (profileError) throw profileError;

      const { error: acceptError } = await supabase
        .from("invites")
        .update({ accepted: true })
        .eq("id", invite.id);
      if (acceptError) throw acceptError;

      toast.success(`Welcome to ${company?.name ?? "your team"}'s workspace!`);
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't accept this invite"));
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 via-background to-background p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 via-background to-background p-4">
        <Card className="w-full max-w-md border-border shadow-sm">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <CompassIcon className="h-7 w-7 text-primary" />
              <span className="text-xl font-semibold text-foreground">Compass</span>
            </div>
            <p className="text-sm text-destructive font-medium">
              This invite link is invalid or has already been used.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/signup">Back to Sign Up</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 via-background to-background p-4">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="items-center text-center pb-2">
          <div className="flex items-center gap-2 mb-3">
            <CompassIcon className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold text-foreground">Compass</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Join your team</h1>
          <p className="text-sm text-muted-foreground">
            You've been invited to join {company?.name ?? "your team"}'s CSR workspace
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Full name</Label>
              <Input
                id="inv-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" value={invite?.email ?? ""} readOnly disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-password">Password</Label>
              <div className="relative">
                <Input
                  id="inv-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={submitting}
            >
              {submitting ? "Joining…" : "Join Workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
