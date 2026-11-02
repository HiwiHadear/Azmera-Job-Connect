// @ts-nocheck -- admin form handlers use loose form data typing
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Star, Flame, FileText, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchJobs, fetchCategories, fetchCompanies, EMPLOYMENT_TYPES, WORK_MODES, EXPERIENCE_LEVELS, isExpired, type Job } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Admin dashboard — Azmera Jobs" },
      { name: "description", content: "Manage vacancies, companies, categories and applications." },
      { property: "og:title", content: "Admin dashboard — Azmera Jobs" },
      { property: "og:description", content: "Manage vacancies, companies, categories and applications." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return !!data;
    },
  });

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  if (isLoading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!isAdmin) return (
    <div className="p-16 text-center">
      <p className="text-lg font-semibold">You don't have admin access.</p>
      <Button variant="outline" className="mt-4" onClick={signOut}>Sign out</Button>
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin dashboard</h1>
        <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
      </div>
      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Vacancies</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs"><JobsTab /></TabsContent>
        <TabsContent value="applications"><ApplicationsTab /></TabsContent>
        <TabsContent value="companies"><CompaniesTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
      </Tabs>
    </main>
  );
}

/* ---------------- Jobs ---------------- */
function JobsTab() {
  const qc = useQueryClient();
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const [editing, setEditing] = useState<Partial<Job> | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["jobs"] });

  async function patch(id: string, values: Partial<Job>) {
    const { error } = await supabase.from("jobs").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this vacancy and its applications?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Vacancy removed"); refresh();
  }

  return (
    <div className="mt-4 rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <p className="font-semibold">{jobs.length} vacancies</p>
        <Button onClick={() => setEditing({ status: "draft", employment_type: "Full-Time", work_mode: "On-Site", experience_level: "Intermediate" })}><Plus className="h-4 w-4" /> Post vacancy</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr className="border-b">
            <th className="p-3">Title</th><th className="p-3">Company</th><th className="p-3">Deadline</th><th className="p-3">Published</th><th className="p-3">Featured</th><th className="p-3">Urgent</th><th className="p-3" />
          </tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{j.title}</td>
                <td className="p-3">{j.companies?.name}</td>
                <td className={`p-3 ${isExpired(j.deadline) ? "text-destructive" : ""}`}>{j.deadline ?? "—"}</td>
                <td className="p-3"><Switch checked={j.status === "published"} onCheckedChange={(v) => patch(j.id, { status: v ? "published" : "draft" })} /></td>
                <td className="p-3"><button onClick={() => patch(j.id, { is_featured: !j.is_featured })}><Star className={`h-4 w-4 ${j.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button></td>
                <td className="p-3"><button onClick={() => patch(j.id, { is_urgent: !j.is_urgent })}><Flame className={`h-4 w-4 ${j.is_urgent ? "text-tag-red-foreground" : "text-muted-foreground"}`} /></button></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(j)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <JobDialog job={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

function JobDialog({ job, onClose, onSaved }: { job: Partial<Job>; onClose: () => void; onSaved: () => void }) {
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!f.title?.trim() || !f.company_id) return toast.error("Title and company are required");
    const values = {
      title: f.title.trim(),
      company_id: f.company_id,
      category_id: f.category_id || null,
      location: f.location ?? "",
      employment_type: f.employment_type,
      work_mode: f.work_mode,
      experience_level: f.experience_level,
      salary_min: f.salary_min ? Number(f.salary_min) : null,
      salary_max: f.salary_max ? Number(f.salary_max) : null,
      deadline: f.deadline || null,
      summary: f.summary ?? "",
      responsibilities: f.responsibilities ?? "",
      qualifications: f.qualifications ?? "",
      experience: f.experience ?? "",
      external_url: f.external_url?.trim() || null,
      status: f.status,
    };
    setBusy(true);
    const { error } = job.id
      ? await supabase.from("jobs").update(values).eq("id", job.id)
      : await supabase.from("jobs").insert(values);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Vacancy saved"); onSaved();
  }

  const sel = "h-10 w-full rounded-md border bg-background px-2 text-sm";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{job.id ? "Edit vacancy" : "Post vacancy"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <F label="Job title *" full><Input name="title" defaultValue={job.title} required /></F>
          <F label="Company *"><select name="company_id" defaultValue={job.company_id ?? ""} className={sel} required><option value="">Select…</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          <F label="Category"><select name="category_id" defaultValue={job.category_id ?? ""} className={sel}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          <F label="Location"><Input name="location" defaultValue={job.location} /></F>
          <F label="Employment type"><select name="employment_type" defaultValue={job.employment_type} className={sel}>{EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></F>
          <F label="Work location"><select name="work_mode" defaultValue={job.work_mode} className={sel}>{WORK_MODES.map((t) => <option key={t}>{t}</option>)}</select></F>
          <F label="Experience level"><select name="experience_level" defaultValue={job.experience_level} className={sel}>{EXPERIENCE_LEVELS.map((t) => <option key={t}>{t}</option>)}</select></F>
          <F label="Salary min (yearly)"><Input name="salary_min" type="number" min={0} defaultValue={job.salary_min ?? ""} /></F>
          <F label="Salary max (yearly)"><Input name="salary_max" type="number" min={0} defaultValue={job.salary_max ?? ""} /></F>
          <F label="Application deadline"><Input name="deadline" type="date" defaultValue={job.deadline ?? ""} /></F>
          <F label="Status"><select name="status" defaultValue={job.status} className={sel}><option value="draft">Draft</option><option value="published">Published</option></select></F>
          <F label="Summary" full><Textarea name="summary" rows={2} defaultValue={job.summary} /></F>
          <F label="Responsibilities (one per line)" full><Textarea name="responsibilities" rows={3} defaultValue={job.responsibilities} /></F>
          <F label="Qualifications (one per line)" full><Textarea name="qualifications" rows={3} defaultValue={job.qualifications} /></F>
          <F label="Experience requirements (one per line)" full><Textarea name="experience" rows={2} defaultValue={job.experience} /></F>
          <F label="External application link (optional)" full><Input name="external_url" type="url" defaultValue={job.external_url ?? ""} placeholder="https://…" /></F>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={`space-y-1 ${full ? "col-span-2" : ""}`}><Label>{label}</Label>{children}</div>;
}

/* ---------------- Applications ---------------- */
function ApplicationsTab() {
  const qc = useQueryClient();
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const [jobFilter, setJobFilter] = useState("");
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*, jobs(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const list = jobFilter ? apps.filter((a) => a.job_id === jobFilter) : apps;

  async function open(path: string) {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["applications"] });
  }

  return (
    <div className="mt-4 rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <p className="font-semibold">{list.length} applications</p>
        <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">All vacancies</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>
      {isLoading ? <p className="p-6 text-muted-foreground">Loading…</p> : list.length === 0 ? <p className="p-6 text-muted-foreground">No applications yet.</p> : (
        <div className="divide-y">
          {list.map((a) => (
            <div key={a.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold">{a.full_name} <span className="font-normal text-muted-foreground">· {a.jobs?.title}</span></p>
                <p className="text-sm text-muted-foreground">{a.email}{a.phone ? ` · ${a.phone}` : ""} · {new Date(a.created_at).toLocaleDateString()}</p>
                {a.cover_letter && <p className="mt-2 whitespace-pre-line text-sm">{a.cover_letter}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => open(a.cv_path)}><FileText className="h-4 w-4" /> CV</Button>
                  {a.document_paths.map((p, i) => <Button key={p} size="sm" variant="ghost" onClick={() => open(p)}><FileText className="h-4 w-4" /> Doc {i + 1}</Button>)}
                </div>
              </div>
              <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                {["new", "reviewing", "shortlisted", "rejected", "hired"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Companies ---------------- */
function CompaniesTab() {
  const qc = useQueryClient();
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const [editing, setEditing] = useState<{ id?: string; name?: string; logo_url?: string | null; website?: string | null; description?: string | null } | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!f.name?.trim()) return toast.error("Name is required");
    const values = { name: f.name.trim(), logo_url: f.logo_url || null, website: f.website || null, description: f.description || null };
    const { error } = editing?.id ? await supabase.from("companies").update(values).eq("id", editing.id) : await supabase.from("companies").insert(values);
    if (error) return toast.error(error.message);
    setEditing(null); qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["jobs"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this company and all its vacancies?")) return;
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["jobs"] });
  }

  return (
    <div className="mt-4 rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <p className="font-semibold">{companies.length} companies</p>
        <Button onClick={() => setEditing({})}><Plus className="h-4 w-4" /> Add company</Button>
      </div>
      <div className="divide-y">
        {companies.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div><p className="font-medium">{c.name}</p><p className="text-sm text-muted-foreground">{c.website}</p></div>
            <div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit company" : "Add company"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <F label="Name *"><Input name="name" defaultValue={editing.name} required /></F>
              <F label="Logo URL"><Input name="logo_url" type="url" defaultValue={editing.logo_url ?? ""} /></F>
              <F label="Website"><Input name="website" type="url" defaultValue={editing.website ?? ""} /></F>
              <F label="Description"><Textarea name="description" defaultValue={editing.description ?? ""} /></F>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit">Save</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ---------------- Categories ---------------- */
function CategoriesTab() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const [name, setName] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    setName(""); qc.invalidateQueries({ queryKey: ["categories"] });
  }
  async function rename(id: string, current: string) {
    const n = prompt("Category name", current)?.trim();
    if (!n) return;
    const { error } = await supabase.from("categories").update({ name: n }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["categories"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["jobs"] });
  }

  return (
    <div className="mt-4 rounded-2xl border bg-card">
      <form onSubmit={add} className="flex gap-2 border-b p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" maxLength={60} />
        <Button type="submit"><Plus className="h-4 w-4" /> Add</Button>
      </form>
      <div className="divide-y">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <p className="font-medium">{c.name}</p>
            <div>
              <Button size="icon" variant="ghost" onClick={() => rename(c.id, c.name)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
