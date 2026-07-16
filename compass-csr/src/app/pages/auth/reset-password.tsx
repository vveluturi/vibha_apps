import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Compass as CompassIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import supabase from "../../../lib/supabase";

export function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mismatchError, setMismatchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setStatus(session ? "valid" : "invalid");
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMismatchError(false);
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setMismatchError(true);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setUpdated(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/signin"), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update your password");
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
              This reset link is invalid or has expired.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/signin">Back to Sign In</Link>
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
          <h1 className="text-lg font-semibold text-foreground">Set a new password</h1>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rp-new">New password</Label>
              <div className="relative">
                <Input
                  id="rp-new"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-confirm">Confirm password</Label>
              <div className="relative">
                <Input
                  id="rp-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mismatchError && <p className="text-xs text-destructive">Passwords don't match</p>}
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={submitting || updated}
            >
              {submitting ? "Updating…" : updated ? "Password updated ✓" : "Update Password"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-2">
            <Link to="/signin" className="text-primary hover:underline font-medium">
              Back to Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
