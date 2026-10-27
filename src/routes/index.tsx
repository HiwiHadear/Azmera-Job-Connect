import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, MapPin, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/JobCard";
import { CompanyLogo } from "@/components/CompanyLogo";
import { fetchJobs, fetchCategories, isExpired } from "@/lib/jobs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jobify — Find your dream job" },
      { name: "description", content: "Search featured, latest and urgent vacancies from top employers and apply online." },
      { property: "og:title", content: "Jobify — Find your dream job" },
      { property: "og:description", content: "Search featured, latest and urgent vacancies and apply online." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const open = jobs.filter((j) => j.status === "published" && !isExpired(j.deadline));
  const featured = open.filter((j) => j.is_featured).slice(0, 6);
  const urgent = open.filter((j) => j.is_urgent).slice(0, 3);
  const latest = open.slice(0, 6);

  const employers = Object.values(
    open.reduce<Record<string, { id: string; name: string; logo: string | null; count: number }>>((acc, j) => {
      if (!j.companies) return acc;
      acc[j.company_id] ??= { id: j.company_id, name: j.companies.name, logo: j.companies.logo_url, count: 0 };
      acc[j.company_id].count++;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  return (
    <main>
      <section className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <p className="mb-3 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            {open.length} open positions
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Find your <span className="text-primary">dream job</span> here
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Explore the newest opportunities from top employers and apply in minutes.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/jobs", search: { q: q || undefined, location: loc || undefined } });
            }}
            className="mx-auto mt-8 flex max-w-3xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm md:flex-row"
          >
            <label className="flex flex-1 items-center gap-2 px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, company or keyword" className="h-11 w-full bg-transparent outline-none" />
            </label>
            <label className="flex flex-1 items-center gap-2 border-t px-3 md:border-l md:border-t-0">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City, country or Remote" className="h-11 w-full bg-transparent outline-none" />
            </label>
            <Button type="submit" size="lg" className="h-11 px-8">Search</Button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12">
        {urgent.length > 0 && (
          <Section title="Urgent vacancies" subtitle="Apply soon — these close quickly">
            <div className="grid gap-4 md:grid-cols-3">{urgent.map((j) => <JobCard key={j.id} job={j} />)}</div>
          </Section>
        )}

        <Section title="Featured jobs" subtitle="Hand-picked roles from our partners">
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{featured.map((j) => <JobCard key={j.id} job={j} />)}</div>
          )}
        </Section>

        <Section title="Browse by category">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => {
              const count = open.filter((j) => j.category_id === c.id).length;
              return (
                <Link key={c.id} to="/jobs" search={{ category: c.id }} className="rounded-2xl border bg-card p-4 transition hover:border-primary/40">
                  <Briefcase className="mb-3 h-5 w-5 text-primary" />
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{count} jobs</p>
                </Link>
              );
            })}
          </div>
        </Section>

        <Section title="Latest jobs" action={<Link to="/jobs" className="flex items-center gap-1 text-sm font-semibold text-primary">View all <ArrowRight className="h-4 w-4" /></Link>}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{latest.map((j) => <JobCard key={j.id} job={j} />)}</div>
        </Section>

        <Section title="Popular employers">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {employers.map((e) => (
              <Link key={e.id} to="/jobs" search={{ company: e.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40">
                <CompanyLogo name={e.name} url={e.logo} className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.count} open</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      </div>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Jobify</footer>
    </main>
  );
}

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
