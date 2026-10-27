import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Flame } from "lucide-react";
import { CompanyLogo } from "./CompanyLogo";
import { formatSalary, timeAgo, type Job } from "@/lib/jobs";

export function Tag({ children, tone }: { children: React.ReactNode; tone: "blue" | "purple" | "amber" | "red" }) {
  const cls = {
    blue: "bg-tag-blue text-tag-blue-foreground",
    purple: "bg-tag-purple text-tag-purple-foreground",
    amber: "bg-tag-amber text-tag-amber-foreground",
    red: "bg-tag-red text-tag-red-foreground",
  }[tone];
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function JobCard({ job }: { job: Job }) {
  return (
    <Link
      to="/jobs/$id"
      params={{ id: job.id }}
      className="group flex flex-col rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <CompanyLogo name={job.companies?.name ?? "?"} url={job.companies?.logo_url} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold group-hover:text-primary">{job.title}</h3>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {job.companies?.name} <span>·</span> <MapPin className="h-3 w-3" /> {job.location}
          </p>
        </div>
        {job.is_urgent && <Flame className="h-4 w-4 text-tag-red-foreground" aria-label="Urgent" />}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Tag tone="blue">{job.employment_type}</Tag>
        <Tag tone="purple">{job.work_mode}</Tag>
        <Tag tone="amber">{job.experience_level}</Tag>
        {job.is_urgent && <Tag tone="red">Urgent</Tag>}
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.summary}</p>
      <div className="mt-auto flex items-center justify-between border-t pt-3 mt-4">
        <span className="text-base font-bold">{formatSalary(job.salary_min, job.salary_max)}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {timeAgo(job.created_at)}
        </span>
      </div>
    </Link>
  );
}
