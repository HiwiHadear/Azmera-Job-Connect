import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { z } from "zod";
import { Search, MapPin } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { Checkbox } from "@/components/ui/checkbox";
import {
  fetchJobs, fetchCategories, fetchCompanies, isExpired,
  EMPLOYMENT_TYPES, WORK_MODES, EXPERIENCE_LEVELS,
} from "@/lib/jobs";

const searchSchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  company: z.string().optional(),
  types: z.array(z.string()).optional(),
  modes: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  minSalary: z.number().optional(),
  sort: z.enum(["newest", "salary", "az"]).optional(),
});

export const Route = createFileRoute("/jobs/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Find Jobs — Jobify" },
      { name: "description", content: "Filter jobs by location, category, salary and employment type." },
      { property: "og:title", content: "Find Jobs — Jobify" },
      { property: "og:description", content: "Filter jobs by location, category, salary and employment type." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/jobs/" });
  const set = (patch: Partial<typeof s>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const toggle = (key: "types" | "modes" | "levels", v: string) => {
    const cur = s[key] ?? [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    set({ [key]: next.length ? next : undefined });
  };

  const { data: jobs = [], isLoading } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });

  const results = useMemo(() => {
    const q = s.q?.toLowerCase().trim();
    const loc = s.location?.toLowerCase().trim();
    let r = jobs.filter((j) => j.status === "published" && !isExpired(j.deadline));
    if (q) r = r.filter((j) => `${j.title} ${j.companies?.name} ${j.summary} ${j.categories?.name}`.toLowerCase().includes(q));
    if (loc) r = r.filter((j) => `${j.location} ${j.work_mode}`.toLowerCase().includes(loc));
    if (s.category) r = r.filter((j) => j.category_id === s.category);
    if (s.company) r = r.filter((j) => j.company_id === s.company);
    if (s.types?.length) r = r.filter((j) => s.types!.includes(j.employment_type));
    if (s.modes?.length) r = r.filter((j) => s.modes!.includes(j.work_mode));
    if (s.levels?.length) r = r.filter((j) => s.levels!.includes(j.experience_level));
    if (s.minSalary) r = r.filter((j) => (j.salary_max ?? j.salary_min ?? 0) >= s.minSalary!);
    if (s.sort === "salary") r = [...r].sort((a, b) => (b.salary_max ?? 0) - (a.salary_max ?? 0));
    if (s.sort === "az") r = [...r].sort((a, b) => a.title.localeCompare(b.title));
    return r;
  }, [jobs, s]);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit space-y-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-bold">Filter</h2>
          <button onClick={() => navigate({ search: {} })} className="text-sm text-primary">Reset</button>
        </div>
        <Group title="Category">
          <select value={s.category ?? ""} onChange={(e) => set({ category: e.target.value || undefined })} className="h-10 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Group>
        <Group title="Company">
          <select value={s.company ?? ""} onChange={(e) => set({ company: e.target.value || undefined })} className="h-10 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">All companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Group>
        <Group title="Minimum salary">
          <input type="range" min={0} max={150000} step={10000} value={s.minSalary ?? 0}
            onChange={(e) => set({ minSalary: Number(e.target.value) || undefined })} className="w-full accent-primary" />
          <p className="text-sm text-muted-foreground">${Math.round((s.minSalary ?? 0) / 1000)}k / year +</p>
        </Group>
        <Checks title="Job Type" options={EMPLOYMENT_TYPES} value={s.types} onToggle={(v) => toggle("types", v)} />
        <Checks title="Work Location" options={WORK_MODES} value={s.modes} onToggle={(v) => toggle("modes", v)} />
        <Checks title="Experience Level" options={EXPERIENCE_LEVELS} value={s.levels} onToggle={(v) => toggle("levels", v)} />
      </aside>

      <section className="space-y-5">
        <div className="rounded-2xl border bg-card p-5">
          <h1 className="text-2xl font-bold">Find your dream job here!</h1>
          <p className="text-sm text-muted-foreground">Explore the newest opportunities and apply for top positions today.</p>
          <div className="mt-4 flex flex-col gap-2 rounded-xl border md:flex-row">
            <label className="flex flex-1 items-center gap-2 px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input defaultValue={s.q} onChange={(e) => set({ q: e.target.value || undefined })} placeholder="Search job title or company" className="h-11 w-full bg-transparent outline-none" />
            </label>
            <label className="flex flex-1 items-center gap-2 border-t px-3 md:border-l md:border-t-0">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <input defaultValue={s.location} onChange={(e) => set({ location: e.target.value || undefined })} placeholder="Country, city or Remote" className="h-11 w-full bg-transparent outline-none" />
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-lg">Showing <span className="font-bold text-primary">{results.length}</span> available jobs</p>
          <select value={s.sort ?? "newest"} onChange={(e) => set({ sort: e.target.value as "newest" })} className="h-9 rounded-lg border bg-card px-2 text-sm">
            <option value="newest">Newest</option>
            <option value="salary">Top salary</option>
            <option value="az">A–Z</option>
          </select>
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading jobs…</p> : results.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">No jobs match your filters.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{results.map((j) => <JobCard key={j.id} job={j} />)}</div>
        )}
      </section>
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><h3 className="font-semibold">{title}</h3>{children}</div>;
}

function Checks({ title, options, value = [], onToggle }: { title: string; options: string[]; value?: string[] | undefined; onToggle: (v: string) => void }) {
  return (
    <Group title={title}>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={value.includes(o)} onCheckedChange={() => onToggle(o)} /> {o}
          </label>
        ))}
      </div>
    </Group>
  );
}
