import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, Briefcase, DollarSign, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Tag } from "@/components/JobCard";
import { fetchJob, formatSalary, isExpired, lines, timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/jobs/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Job details — Azmera Jobs" },
      { name: "description", content: "View job responsibilities, qualifications and apply online." },
      { property: "og:title", content: "Job details — Azmera Jobs" },
      { property: "og:description", content: "View job responsibilities, qualifications and apply online." },
    ],
  }),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { data: job, isLoading } = useQuery({ queryKey: ["job", id], queryFn: () => fetchJob(id) });

  if (isLoading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!job) return (
    <div className="p-16 text-center">
      <p className="text-lg font-semibold">This job is no longer available.</p>
      <Link to="/jobs" className="mt-4 inline-block text-primary">Browse jobs</Link>
    </div>
  );

  const expired = isExpired(job.deadline);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All jobs</Link>
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-start gap-4">
            <CompanyLogo name={job.companies?.name ?? "?"} url={job.companies?.logo_url} className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <p className="text-muted-foreground">{job.companies?.name} · {timeAgo(job.created_at)}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Tag tone="blue">{job.employment_type}</Tag>
                <Tag tone="purple">{job.work_mode}</Tag>
                <Tag tone="amber">{job.experience_level}</Tag>
                {job.is_urgent && <Tag tone="red">Urgent</Tag>}
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 md:grid-cols-4">
            <Fact icon={MapPin} label="Location" value={job.location} />
            <Fact icon={DollarSign} label="Salary" value={formatSalary(job.salary_min, job.salary_max)} />
            <Fact icon={Briefcase} label="Type" value={job.employment_type} />
            <Fact icon={Calendar} label="Deadline" value={job.deadline ? new Date(job.deadline).toLocaleDateString() : "Open"} />
          </div>
        </div>
        <div className="space-y-6 rounded-2xl border bg-card p-6">
          {job.summary && <p className="text-muted-foreground">{job.summary}</p>}
          <List title="Responsibilities" items={lines(job.responsibilities)} />
          <List title="Qualifications" items={lines(job.qualifications)} />
          <List title="Experience" items={lines(job.experience)} />
        </div>
      </div>

      <aside className="h-fit lg:sticky lg:top-6 lg:mt-10">
        {expired ? (
          <div className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">Applications for this job are closed.</div>
        ) : job.external_url ? (
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-bold">Apply for this job</h2>
            <p className="mt-1 text-sm text-muted-foreground">This employer accepts applications on their own site.</p>
            <Button asChild className="mt-4 w-full"><a href={job.external_url} target="_blank" rel="noreferrer">Apply Now <ExternalLink className="h-4 w-4" /></a></Button>
          </div>
        ) : (
          <ApplyForm jobId={job.id} jobTitle={job.title} />
        )}
      </aside>
    </main>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      <ul className="space-y-1.5">
        {items.map((i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{i}</li>)}
      </ul>
    </div>
  );
}

const schema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional(),
  cover_letter: z.string().trim().max(5000).optional(),
});

const ALLOWED = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
const MAX = 10 * 1024 * 1024;

function ApplyForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function upload(file: File) {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(ext)) throw new Error(`${file.name}: unsupported file type`);
    if (file.size > MAX) throw new Error(`${file.name}: file must be under 10MB`);
    const path = `${jobId}/${crypto.randomUUID()}${ext}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file);
    if (error) throw error;
    return path;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    const cv = fd.get("cv") as File | null;
    if (!cv || !cv.size) { toast.error("Please attach your CV / résumé"); return; }
    const docs = (fd.getAll("docs") as File[]).filter((f) => f.size);
    if (docs.length > 5) { toast.error("Up to 5 supporting documents"); return; }

    setSubmitting(true);
    try {
      const cv_path = await upload(cv);
      const document_paths = await Promise.all(docs.map(upload));
      const id = crypto.randomUUID();
      const { error } = await supabase.from("applications").insert({
        id, job_id: jobId, ...parsed.data,
        phone: parsed.data.phone || null,
        cover_letter: parsed.data.cover_letter || null,
        cv_path, document_paths,
      });
      if (error) throw error;
      setDone(id.slice(0, 8).toUpperCase());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return (
    <div className="rounded-2xl border bg-card p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
      <h2 className="mt-3 text-xl font-bold">Application submitted!</h2>
      <p className="mt-1 text-sm text-muted-foreground">Thanks for applying to <strong>{jobTitle}</strong>. The employer will review your application and contact you.</p>
      <p className="mt-4 rounded-lg bg-secondary p-2 text-sm">Reference: <strong>{done}</strong></p>
      <Link to="/jobs" className="mt-4 inline-block text-sm font-semibold text-primary">Browse more jobs</Link>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-bold">Apply for this job</h2>
      <div className="space-y-1.5"><Label htmlFor="full_name">Full name *</Label><Input id="full_name" name="full_name" required maxLength={120} /></div>
      <div className="space-y-1.5"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" required maxLength={255} /></div>
      <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" maxLength={40} /></div>
      <div className="space-y-1.5"><Label htmlFor="cv">CV / Résumé * <span className="text-xs text-muted-foreground">(PDF, DOC, max 10MB)</span></Label><Input id="cv" name="cv" type="file" accept={ALLOWED.join(",")} required /></div>
      <div className="space-y-1.5"><Label htmlFor="docs">Supporting documents <span className="text-xs text-muted-foreground">(optional, up to 5)</span></Label><Input id="docs" name="docs" type="file" multiple accept={ALLOWED.join(",")} /></div>
      <div className="space-y-1.5"><Label htmlFor="cover_letter">Cover letter</Label><Textarea id="cover_letter" name="cover_letter" rows={4} maxLength={5000} /></div>
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>{submitting ? "Submitting…" : "Submit application"}</Button>
    </form>
  );
}
