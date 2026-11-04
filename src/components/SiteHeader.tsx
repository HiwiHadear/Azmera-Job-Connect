import { Link, useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "./BrandLogo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SiteHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  const link = "text-sm font-medium text-muted-foreground hover:text-foreground";
  const active = { className: "text-sm font-semibold text-primary" };
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" aria-label="Azmera Jobs home" className="flex items-center">
          <BrandLogo />
        </Link>
        <nav className="flex flex-wrap items-center gap-3 sm:gap-6">
          <Link to="/" className={link} activeProps={active} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/jobs" className={link} activeProps={active}>
            Find Jobs
          </Link>
          <Link to="/cv-match" className={link} activeProps={active}>CV Match</Link>
          <Link to="/employer" className={link} activeProps={active}>
            {signedIn ? "Dashboard" : "Employers"}
          </Link>
          {signedIn && <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut className="h-4 w-4" /></Button>}
        </nav>
      </div>
    </header>
  );
}
