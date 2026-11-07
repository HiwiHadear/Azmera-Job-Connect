import { supabase } from "@/integrations/supabase/client";

export const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contractual", "Freelance", "Internship"];
export const WORK_MODES = ["On-Site", "Remote", "Hybrid"];
export const EXPERIENCE_LEVELS = ["Fresher", "Beginner", "Intermediate", "Expert"];

export type Job = {
  id: string;
  title: string;
  company_id: string;
  category_id: string | null;
  location: string;
  employment_type: string;
  work_mode: string;
  experience_level: string;
  salary_min: number | null;
  salary_max: number | null;
  deadline: string | null;
  summary: string;
  responsibilities: string;
  qualifications: string;
  experience: string;
  external_url: string | null;
  is_featured: boolean;
  is_urgent: boolean;
  status: string;
  created_at: string;
  companies: { id: string; name: string; logo_url: string | null } | null;
  categories: { id: string; name: string } | null;
};

export const JOB_SELECT = "*, companies(id,name,logo_url), categories(id,name)";

export async function fetchJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Job[];
}

export async function fetchJob(id: string): Promise<Job | null> {
  const { data, error } = await supabase.from("jobs").select(JOB_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Job | null;
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function fetchCompanies() {
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw error;
  return data;
}

export function formatSalary(min: number | null, max: number | null) {
  const k = (n: number) => n.toLocaleString("en-US");
  if (min && max) return `ETB ${k(min)} – ${k(max)} / month`;
  if (max) return `Up to ETB ${k(max)} / month`;
  if (min) return `From ETB ${k(min)} / month`;
  return "Not disclosed by employer";
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return "Posted today";
  if (d === 1) return "Posted 1 day ago";
  return `Posted ${d} days ago`;
}

export function isExpired(deadline: string | null) {
  if (!deadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return deadline < today;
}

export function lines(text: string) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}
