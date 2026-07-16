import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Compass as CompassIcon, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useAuth } from "../../context/auth-context";
import supabase from "../../../lib/supabase";

export function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign in");
    } finally {
      setSubmitting(false);
    }
  }

  function cancelForgotPassword() {
    setShowForgotPassword(false);
    setResetEmail("");
    setResetSent(false);
  }

  async function handleSendResetLink() {
    if (!resetEmail.trim()) return;
    setResetSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send reset link");
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 via-background to-background p-4">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="items-center text-center pb-2">
          <div className="flex items-center gap-2 mb-3">
            <CompassIcon className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold text-foreground">Compass</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your CSR workspace</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="si-email">Email</Label>
              <Input
                id="si-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="si-password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="si-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
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
              {submitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          {showForgotPassword && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              {resetSent ? (
                <p className="text-sm text-emerald-700">
                  Check your email — we've sent a password reset link
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="jane@acme.com"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSendResetLink()}
                      disabled={!resetEmail.trim() || resetSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {resetSubmitting ? "Sending…" : "Send Reset Link"}
                    </Button>
                    <button
                      type="button"
                      onClick={cancelForgotPassword}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground pt-2">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
