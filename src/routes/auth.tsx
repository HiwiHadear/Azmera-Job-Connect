import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Employer sign in — Jobify" },
      { name: "description", content: "Sign in to manage vacancies and review applications." },
      { property: "og:title", content: "Employer sign in — Jobify" },
      { property: "og:description", content: "Sign in to manage vacancies and review applications." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/admin" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/admin" });
      else toast.success("Check your email to confirm your account.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-bold">{mode === "in" ? "Admin sign in" : "Create admin account"}</h1>
        <p className="text-sm text-muted-foreground">The first account created becomes the site administrator.</p>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-primary">
          {mode === "in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
