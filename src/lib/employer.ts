import { z } from "zod";
import { EMPLOYMENT_TYPES, WORK_MODES, EXPERIENCE_LEVELS } from "./jobs";

export const webLink = z.string().trim().max(2048).url("Enter a valid application form link").refine((value) => {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}, "Use an http or https link without embedded credentials");

export const employerProfileSchema = z.object({
  contact_name: z.string().trim().min(1, "Contact name is required").max(120),
  name: z.string().trim().min(1, "Company name is required").max(160),
  website: z.union([z.literal(""), webLink]),
  description: z.string().trim().max(3000),
});

const salary = z.preprocess((v) => v === "" || v === null ? null : Number(v), z.number().int().min(0).max(2147483647).nullable());
export const employerVacancySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Job title is required").max(160),
  category_id: z.union([z.string().uuid(), z.literal("")]).transform((v) => v || null),
  location: z.string().trim().max(160),
  employment_type: z.string().refine((v) => EMPLOYMENT_TYPES.includes(v), "Invalid employment type"),
  work_mode: z.string().refine((v) => WORK_MODES.includes(v), "Invalid work mode"),
  experience_level: z.string().refine((v) => EXPERIENCE_LEVELS.includes(v), "Invalid experience level"),
  salary_min: salary,
  salary_max: salary,
  deadline: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => { const d = new Date(v); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; }, "Invalid deadline")]).transform((v) => v || null),
  summary: z.string().trim().min(1, "Job description is required").max(10000),
  responsibilities: z.string().trim().max(10000),
  qualifications: z.string().trim().max(10000),
  experience: z.string().trim().max(5000),
  external_url: webLink,
  status: z.enum(["draft", "published", "closed"]),
}).refine((v) => v.salary_min === null || v.salary_max === null || v.salary_min <= v.salary_max, { message: "Maximum salary must be at least the minimum", path: ["salary_max"] });