import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { Building2, Plus, Pencil, Trash2, ExternalLink, LogOut, Briefcase, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyLogo } from "@/components/CompanyLogo";
import { supabase } from "@/integrations/supabase/client";
import { getEmployerWorkspace, saveEmployerProfile, saveEmployerVacancy, deleteEmployerVacancy } from "@/lib/employer.functions";
import { employerProfileSchema, employerVacancySchema } from "@/lib/employer";
import { EMPLOYMENT_TYPES, WORK_MODES, EXPERIENCE_LEVELS } from "@/lib/jobs";

const workspaceOptions = () => ({ queryKey: ["employer-workspace"], queryFn: () => getEmployerWorkspace() });
type Workspace = Awaited<ReturnType<typeof getEmployerWorkspace>>;
type Vacancy = Workspace["jobs"][number];

export const Route = createFileRoute("/_authenticated/employer")({
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceOptions()),
  head: () => ({ meta: [
    { title: "Employer workspace — Azmera Jobs" },
    { name: "description", content: "Manage your company profile and vacancies with your own application form." },
    { property: "og:title", content: "Employer workspace — Azmera Jobs" },
    { property: "og:description", content: "Publish your company’s vacancies on Azmera Jobs." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: EmployerPage,
});

function EmployerPage() {
  const { data } = useSuspenseQuery(workspaceOptions());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const saveProfile = useServerFn(saveEmployerProfile);
  const remove = useServerFn(deleteEmployerVacancy);
  const [editing, setEditing] = useState<Partial<Vacancy> | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(data.company ? "vacancies" : "profile");
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["employer-workspace"] });
    await qc.invalidateQueries({ queryKey: ["jobs"] });
    await qc.invalidateQueries({ queryKey: ["job"] });
  };
  async function profileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = employerProfileSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your profile details"); return; }
    setBusy(true);
    try { await saveProfile({ data: parsed.data }); await refresh(); toast.success("Employer profile saved"); setTab("vacancies"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not save profile"); }
    finally { setBusy(false); }
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true });
  }
  async function deleteJob(id: string) {
    if (!window.confirm("Delete this vacancy?")) return;
    try { await remove({ data: { id } }); await refresh(); toast.success("Vacancy deleted"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not delete vacancy"); }
  }
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        {data.company ? <CompanyLogo name={data.company.name} url={data.company.logo_url} className="h-16 w-16" /> : <Building2 className="h-12 w-12 text-primary" />}
        <div><p className="mb-1 text-sm font-semibold text-primary">Employer workspace</p><h1 className="break-words text-3xl font-bold">{data.company?.name ?? "Your employer profile"}</h1>{data.profile?.contact_name && <p className="mt-1 text-muted-foreground">{data.profile.contact_name}</p>}</div>
      </div>
      <div className="flex gap-2">{data.isAdmin && <Button asChild variant="outline"><Link to="/admin">Admin dashboard</Link></Button>}<Button variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button></div>
    </div>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-6"><TabsTrigger value="vacancies"><Briefcase className="mr-2 h-4 w-4" />Vacancies</TabsTrigger><TabsTrigger value="profile"><Building2 className="mr-2 h-4 w-4" />Company profile</TabsTrigger></TabsList>
      <TabsContent value="profile">
        <form onSubmit={profileSubmit} className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Field label="Company name" name="name"><Input id="name" name="name" required maxLength={160} defaultValue={data.company?.name} /></Field>
          <Field label="Contact person" name="contact_name"><Input id="contact_name" name="contact_name" required maxLength={120} defaultValue={data.profile?.contact_name} /></Field>
          <Field label="Company website" name="website" full><Input id="website" name="website" type="url" maxLength={2048} defaultValue={data.company?.website ?? ""} placeholder="https://" /></Field>
          <Field label="About your company" name="description" full><Textarea id="description" name="description" rows={5} maxLength={3000} defaultValue={data.company?.description ?? ""} /></Field>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy}><Save className="h-4 w-4" />{busy ? "Saving…" : "Save profile"}</Button></div>
        </form>
      </TabsContent>
      <TabsContent value="vacancies">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Your vacancies <span className="ml-2 text-base font-normal text-muted-foreground">{data.jobs.length}</span></h2><Button disabled={!data.company} onClick={() => setEditing({})}><Plus className="h-4 w-4" />Post vacancy</Button></div>
        {!data.company ? <div className="border-y py-12"><h3 className="text-lg font-semibold">Create your company profile first</h3><Button variant="outline" className="mt-4" onClick={() => setTab("profile")}>Company profile</Button></div> : data.jobs.length === 0 ? <div className="border-y py-12"><Briefcase className="mb-4 h-8 w-8 text-primary" /><h3 className="text-lg font-semibold">No vacancies yet</h3></div> : <div className="divide-y border-y">
          {data.jobs.map((job) => <article key={job.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h3 className="break-words text-lg font-semibold">{job.title}</h3><span className={`rounded px-2 py-1 text-xs font-semibold ${job.status === "published" ? "bg-tag-blue text-tag-blue-foreground" : "bg-secondary text-secondary-foreground"}`}>{job.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{job.location || "Location not specified"} · {job.employment_type}{job.deadline ? ` · Closes ${job.deadline}` : ""}</p></div>
            <div className="flex gap-1">{job.status === "published" && <Button asChild variant="ghost" size="icon" title="View vacancy"><Link to="/jobs/$id" params={{ id: job.id }} aria-label={`View ${job.title}`}><ExternalLink className="h-4 w-4" /></Link></Button>}<Button variant="ghost" size="icon" title="Edit vacancy" aria-label={`Edit ${job.title}`} onClick={() => setEditing(job)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Delete vacancy" aria-label={`Delete ${job.title}`} onClick={() => deleteJob(job.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
          </article>)}
        </div>}
      </TabsContent>
    </Tabs>
    {editing && <VacancyDialog job={editing} categories={data.categories} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}
  </main>;
}

function Field({ label, name, full, children }: { label: string; name: string; full?: boolean; children: ReactNode }) {
  return <div className={`min-w-0 space-y-2 ${full ? "sm:col-span-2" : ""}`}><Label htmlFor={name}>{label}</Label>{children}</div>;
}

function VacancyDialog({ job, categories, onClose, onSaved }: { job: Partial<Vacancy>; categories: Workspace["categories"]; onClose: () => void; onSaved: () => Promise<void> }) {
  const save = useServerFn(saveEmployerVacancy);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = employerVacancySchema.safeParse({ ...values, ...(job.id ? { id: job.id } : {}) });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check the vacancy details"); return; }
    setBusy(true);
    try { await save({ data: { ...values, ...(job.id ? { id: job.id } : {}) } }); toast.success(parsed.data.status === "published" ? "Vacancy published" : "Vacancy saved"); await onSaved(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not save vacancy"); }
    finally { setBusy(false); }
  }
  const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{job.id ? "Edit vacancy" : "Post vacancy"}</DialogTitle></DialogHeader>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Job title" name="title" full><Input id="title" name="title" required maxLength={160} defaultValue={job.title} /></Field>
      <Field label="Application form link" name="external_url" full><Input id="external_url" name="external_url" type="url" required maxLength={2048} placeholder="https://" defaultValue={job.external_url ?? ""} /></Field>
      <Field label="Location" name="location"><Input id="location" name="location" maxLength={160} defaultValue={job.location ?? ""} /></Field>
      <Field label="Category" name="category_id"><select id="category_id" name="category_id" defaultValue={job.category_id ?? ""} className={selectClass}><option value="">Select category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      {[{ name: "employment_type", label: "Employment type", choices: EMPLOYMENT_TYPES, value: job.employment_type ?? "Full-Time" }, { name: "work_mode", label: "Work mode", choices: WORK_MODES, value: job.work_mode ?? "On-Site" }, { name: "experience_level", label: "Experience level", choices: EXPERIENCE_LEVELS, value: job.experience_level ?? "Intermediate" }].map((f) => <Field key={f.name} label={f.label} name={f.name}><select id={f.name} name={f.name} defaultValue={f.value} className={selectClass}>{f.choices.map((choice) => <option key={choice}>{choice}</option>)}</select></Field>)}
      <Field label="Application deadline" name="deadline"><Input id="deadline" name="deadline" type="date" defaultValue={job.deadline ?? ""} /></Field>
      <Field label="Minimum salary (yearly)" name="salary_min"><Input id="salary_min" name="salary_min" type="number" min={0} defaultValue={job.salary_min ?? ""} /></Field>
      <Field label="Maximum salary (yearly)" name="salary_max"><Input id="salary_max" name="salary_max" type="number" min={0} defaultValue={job.salary_max ?? ""} /></Field>
      {[{ name: "summary", label: "Job description", max: 10000, value: job.summary, required: true }, { name: "responsibilities", label: "Responsibilities", max: 10000, value: job.responsibilities }, { name: "qualifications", label: "Required skills and qualifications", max: 10000, value: job.qualifications }, { name: "experience", label: "Experience requirements", max: 5000, value: job.experience }].map((f) => <Field key={f.name} label={f.label} name={f.name} full><Textarea id={f.name} name={f.name} required={f.required} maxLength={f.max} rows={3} defaultValue={f.value ?? ""} /></Field>)}
      <Field label="Status" name="status" full><select id="status" name="status" defaultValue={job.status ?? "draft"} className={selectClass}><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></Field>
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save vacancy"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}