import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Employer sign in — Azmera Jobs" },
      { name: "description", content: "Sign in to manage vacancies and review applications." },
      { property: "og:title", content: "Employer sign in — Azmera Jobs" },
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
    const parsed = z.object({ email: z.string().trim().email().max(255), password: z.string().min(6).max(128) }).safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your email and password"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/employer" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/employer" });
      else toast.success("Check your email to confirm your account.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <BrandLogo full className="mb-6" />
      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-bold">{mode === "in" ? "Employer sign in" : "Create employer account"}</h1>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={6} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
        <Button variant="ghost" type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-primary">
          {mode === "in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </Button>
      </form>
    </main>
  );
}
