import { Link } from "@tanstack/react-router";
import { BrandLogo } from "./BrandLogo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  const link = "text-sm font-medium text-muted-foreground hover:text-foreground";
  const active = { className: "text-sm font-semibold text-primary" };
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" aria-label="Azmera Jobs home" className="flex items-center">
          <BrandLogo />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link to="/" className={link} activeProps={active} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/jobs" className={link} activeProps={active}>
            Find Jobs
          </Link>
          <Link to="/admin" className={link} activeProps={active}>
            {signedIn ? "Dashboard" : "Employers"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
