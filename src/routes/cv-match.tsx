import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Sparkles, FileText, Upload, Square, Copy, Download, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { fetchJobs, isExpired } from "@/lib/jobs";
import { matchInputSchema, readMatchStream, validateCVFile } from "@/lib/cv-match";

export const Route = createFileRoute("/cv-match")({
  validateSearch: (search: Record<string, unknown>): { jobId?: string } => typeof search["jobId"] === "string" ? { jobId: search["jobId"] } : {},
  head: () => ({ meta: [
    { title: "CV Match — Azmera Jobs" },
    { name: "description", content: "Compare your CV with a job listing to find matching skills and tailored application improvements." },
    { property: "og:title", content: "CV Match — Azmera Jobs" },
    { property: "og:description", content: "Find matching skills and strengthen your application with an AI-powered CV review." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CVMatch,
});

function CVMatch() {
  const { jobId } = Route.useSearch();
  const [mode, setMode] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [cv, setCV] = useState("");
  const [job, setJob] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "complete" | "stopped">("idle");
  const abort = useRef<AbortController | null>(null);
  const { data: jobs = [], isError: jobsError } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const openJobs = jobs.filter(j => j.status === "published" && !isExpired(j.deadline));
  const selectedListing = openJobs.find(j => j.id === selectedJob);

  function selectJob(id: string) {
    setSelectedJob(id);
    const found = jobs.find(j => j.id === id);
    if (found) setJob([found.title, found.companies?.name, found.location, found.summary, "Responsibilities:", found.responsibilities, "Qualifications:", found.qualifications, "Experience:", found.experience].filter(Boolean).join("\n"));
  }
  useEffect(() => {
    if (jobId && jobs.length && !selectedJob) {
      const found = jobs.find(j => j.id === jobId);
      if (found) {
        setSelectedJob(jobId);
        setJob([found.title, found.companies?.name, found.location, found.summary, "Responsibilities:", found.responsibilities, "Qualifications:", found.qualifications, "Experience:", found.experience].filter(Boolean).join("\n"));
      }
    }
  }, [jobId, jobs, selectedJob]);
  useEffect(() => () => abort.current?.abort(), []);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (abort.current) return;
    setError("");
    const parsed = matchInputSchema.safeParse({ cv: mode === "text" ? cv : "", job });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your inputs."); return; }
    if (mode === "upload" && !file) { setError("Choose your CV file."); return; }
    if (mode === "text" && cv.trim().length < 30) { setError("Add your CV text (at least 30 characters)."); return; }
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true); setReport(""); setReasoning(""); setState("idle");
    let failed = false;
    try {
      const fd = new FormData();
      fd.set("cv", parsed.data.cv); fd.set("job", parsed.data.job);
      if (mode === "upload" && file) fd.set("file", file);
      const response = await fetch("/api/cv-match", { method: "POST", body: fd, signal: controller.signal });
      if (!response.ok) {
        const body = await response.json() as { message?: string };
        throw new Error(body.message ?? "AI analysis is unavailable.");
      }
      await readMatchStream(response, event => {
        if (event.type === "text") setReport(current => current + (event.text ?? ""));
        if (event.type === "reasoning") setReasoning(current => current + (event.text ?? ""));
        if (event.type === "error") { failed = true; setError(event.text ?? "The analysis could not finish."); }
      });
      if (!failed) setState("complete");
    } catch (err) {
      if (controller.signal.aborted) setState("stopped");
      else setError(err instanceof Error ? err.message : "The analysis could not finish.");
    } finally { setBusy(false); abort.current = null; }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([report], { type: "text/markdown" }));
    const a = document.createElement("a"); a.href = url; a.download = "azmera-cv-match.md"; a.click(); URL.revokeObjectURL(url);
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
    <div className="mb-8 border-b pb-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4 text-brand-gold" /> APPLICATION REVIEW</div>
      <h1 className="text-3xl font-bold sm:text-4xl">CV Match</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Your experience. Your next opportunity.</p>
    </div>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <form onSubmit={analyze} className="min-w-0 space-y-6">
        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold"><FileText className="h-5 w-5 text-primary" /> Your CV</h2>
            <Tabs value={mode} onValueChange={setMode}><TabsList className="w-full"><TabsTrigger value="upload" className="flex-1"><Upload className="mr-2 h-4 w-4" /> Upload file</TabsTrigger><TabsTrigger value="text" className="flex-1"><FileText className="mr-2 h-4 w-4" /> Paste text</TabsTrigger></TabsList></Tabs>
            {mode === "upload" ? <div className="rounded-lg border border-dashed bg-card p-5">
              <Label htmlFor="match-cv">CV / Résumé</Label>
              <Input id="match-cv" type="file" accept=".pdf,.txt,application/pdf,text/plain" className="mt-3 min-w-0" onChange={e => {
                const chosen = e.target.files?.[0];
                setFile(null); setError("");
                if (!chosen) return;
                try { validateCVFile(chosen); setFile(chosen); } catch (err) { setError(err instanceof Error ? err.message : "Invalid file."); e.target.value = ""; }
              }} />
              <p className="mt-2 text-xs text-muted-foreground">PDF or TXT · Up to 10 MB</p>
              {file && <p className="mt-3 break-all text-sm font-medium">{file.name}</p>}
            </div> : <><Label htmlFor="cv-text">CV text</Label><Textarea id="cv-text" value={cv} onChange={e => setCV(e.target.value)} rows={9} maxLength={30000} placeholder="Experience, skills, education and achievements…" /></>}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Target job</h2>
            <Label htmlFor="target-job">Azmera listing (optional)</Label>
            <Select value={selectedJob || "custom"} onValueChange={value => selectJob(value === "custom" ? "" : value)} disabled={busy}>
              <SelectTrigger id="target-job" className="h-auto min-h-14 min-w-0 bg-card py-2 text-left">
                {selectedListing ? <span className="flex min-w-0 items-center gap-3"><CompanyLogo name={selectedListing.companies?.name ?? "Employer"} url={selectedListing.companies?.logo_url} className="h-10 w-10 rounded-md" /><span className="min-w-0 whitespace-normal"><span className="block break-words font-semibold">{selectedListing.title}</span><span className="block text-xs text-muted-foreground">{selectedListing.companies?.name} · {selectedListing.location}</span></span></span> : <span className="whitespace-normal">Choose a listing or paste one below</span>}
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                <SelectItem value="custom">Paste my own listing</SelectItem>
                {openJobs.map(j => <SelectItem value={j.id} key={j.id}><span className="flex items-center gap-3"><CompanyLogo name={j.companies?.name ?? "Employer"} url={j.companies?.logo_url} className="h-10 w-10 rounded-md" /><span className="min-w-0 whitespace-normal"><span className="block break-words font-semibold">{j.title}</span><span className="block text-xs text-muted-foreground">{j.companies?.name} · {j.location}</span></span></span></SelectItem>)}
              </SelectContent>
            </Select>
            {jobsError && <p className="text-xs text-muted-foreground">Listings are unavailable. You can still paste a job below.</p>}
            <Label htmlFor="job-text">Job listing</Label>
            <Textarea id="job-text" value={job} onChange={e => { setJob(e.target.value); }} rows={9} maxLength={30000} placeholder="Job title, responsibilities and required skills…" />
          </section>
        </fieldset>
        <p className="text-xs leading-relaxed text-muted-foreground">Your CV and listing are sent to Lovable AI for analysis. They aren’t saved to your Azmera account. Remove sensitive personal details before submitting.</p>
        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-words">{error}</span></div>}
        {busy ? <Button key="stop" type="button" variant="outline" className="w-full" onClick={() => { abort.current?.abort(); setState("stopped"); setBusy(false); }}><Square className="h-4 w-4" /> Stop analysis</Button> : <Button key="analyze" type="submit" size="lg" className="w-full"><Sparkles className="h-4 w-4" /> {report ? "Analyze again" : "Analyze my match"}</Button>}
      </form>
      <section aria-label="Application review" aria-live="polite" className="min-w-0 border-t pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <h2 className="text-xl font-bold">Your application review</h2>
          {report && <div className="flex gap-1"><Button type="button" size="icon" variant="ghost" title="Copy review" aria-label="Copy review" onClick={async () => { try { await navigator.clipboard.writeText(report); toast.success("Review copied"); } catch { toast.error("Could not copy review"); } }}><Copy className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" title="Download review" aria-label="Download review" onClick={download}><Download className="h-4 w-4" /></Button></div>}
        </div>
        {busy && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> {report ? "Writing your review…" : "Reviewing your CV and job listing…"}</p>}
        {reasoning && <details className="mt-4 text-sm text-muted-foreground"><summary className="cursor-pointer">Analysis notes</summary><p className="mt-2 whitespace-pre-wrap break-words">{reasoning}</p></details>}
        {state === "stopped" && <p className="mt-4 text-sm text-muted-foreground">Analysis stopped. Any partial review is kept below.</p>}
        {state === "complete" && <p className="mt-4 text-xs font-medium text-primary">Review complete · Check suggested edits against your experience.</p>}
        {report ? <div className="mt-6 break-words text-sm leading-7 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-primary [&_h3]:mt-5 [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-2 [&_strong]:font-semibold"><ReactMarkdown>{report}</ReactMarkdown></div> : !busy && state !== "stopped" && <div className="py-16 text-center"><FileText className="mx-auto h-12 w-12 text-brand-gold" /><h3 className="mt-5 text-lg font-semibold">A stronger application starts here</h3><p className="mt-2 text-sm text-muted-foreground">Matching skills · Evidence gaps · Tailored improvements</p></div>}
      </section>
    </div>
  </main>;
}