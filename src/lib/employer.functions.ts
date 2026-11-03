import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { employerProfileSchema, employerVacancySchema } from "./employer";
import { z } from "zod";

export const getEmployerWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [profile, company, categories, role] = await Promise.all([
      db.from("profiles").select("contact_name").eq("id", context.userId).maybeSingle(),
      db.from("companies").select("*").eq("owner_id", context.userId).maybeSingle(),
      db.from("categories").select("id,name").order("name"),
      db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    for (const result of [profile, company, categories, role]) if (result.error) throw new Error("Could not load employer workspace");
    const jobs = company.data ? await db.from("jobs").select("*").eq("company_id", company.data.id).order("created_at", { ascending: false }) : { data: [], error: null };
    if (jobs.error) throw new Error("Could not load vacancies");
    return { profile: profile.data, company: company.data, jobs: jobs.data ?? [], categories: categories.data ?? [], isAdmin: Boolean(role.data) };
  });

export const saveEmployerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => employerProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { contact_name, ...company } = data;
    const existing = await context.supabase.from("companies").select("id").eq("owner_id", context.userId).maybeSingle();
    if (existing.error) throw new Error("Could not load company profile");
    const values = { ...company, website: company.website || null, owner_id: context.userId };
    const result = existing.data
      ? await context.supabase.from("companies").update(values).eq("id", existing.data.id).eq("owner_id", context.userId)
      : await context.supabase.from("companies").insert(values);
    if (result.error) throw new Error("Could not save company profile");
    const profile = await context.supabase.from("profiles").upsert({ id: context.userId, contact_name });
    if (profile.error) throw new Error("Could not save contact name");
    return { saved: true };
  });

export const saveEmployerVacancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => employerVacancySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: company, error } = await context.supabase.from("companies").select("id").eq("owner_id", context.userId).maybeSingle();
    if (error || !company) throw new Error("Save your employer profile first");
    const { id, ...values } = data;
    const result = id
      ? await context.supabase.from("jobs").update({ ...values, company_id: company.id }).eq("id", id).eq("company_id", company.id).select("id").single()
      : await context.supabase.from("jobs").insert({ ...values, company_id: company.id }).select("id").single();
    if (result.error) throw new Error("Could not save vacancy. Check that it belongs to your company.");
    return result.data;
  });

export const deleteEmployerVacancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const company = await context.supabase.from("companies").select("id").eq("owner_id", context.userId).single();
    if (!company.data) throw new Error("Employer profile not found");
    const result = await context.supabase.from("jobs").delete().eq("id", data.id).eq("company_id", company.data.id).select("id").single();
    if (result.error) throw new Error("Could not delete vacancy");
    return { deleted: true };
  });