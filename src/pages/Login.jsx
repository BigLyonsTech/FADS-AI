import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-mint/30">
      {/* Slim dark navy branded header */}
      <header className="bg-brand-navy px-4 sm:px-6 py-3 flex items-center gap-2.5">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-teal">
          <span className="text-base font-bold text-brand-navy">F</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white text-sm font-semibold tracking-tight">FADS AI</span>
          <span className="text-brand-teal/80 text-[11px] font-medium">Business Suite</span>
        </div>
      </header>

      {/* Compact login card */}
      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-6 sm:pt-10 pb-8">
        <div className="w-full max-w-[560px] bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
          {/* Brand + heading */}
          <div className="mb-5">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-sm font-semibold text-brand-navy tracking-tight">FADS AI</span>
              <span className="text-xs text-muted-foreground">Business Suite</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-brand-navy">Sign in to your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Access your FADS AI organisation workspace.</p>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-[54px]"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-[54px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end -mt-1">
              <Link to="/forgot-password" className="text-xs text-brand-teal hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full h-[52px] font-medium bg-brand-navy hover:bg-brand-navy/90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  LOG IN
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Don't have an account?{" "}
            <Link
              to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
              className="text-brand-teal font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}