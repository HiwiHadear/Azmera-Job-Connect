import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </span>
          Jobify
        </Link>
        <nav className="flex items-center gap-6">
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
