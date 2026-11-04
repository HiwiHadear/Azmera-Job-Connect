import { describe, expect, it } from "vitest";
import { employerProfileSchema, employerVacancySchema, webLink } from "@/lib/employer";

const vacancy = { title: "Software engineer", category_id: "", location: "Nairobi", employment_type: "Full-Time", work_mode: "Hybrid", experience_level: "Intermediate", salary_min: "", salary_max: "", deadline: "", summary: "Build web applications", responsibilities: "Develop software", qualifications: "TypeScript", experience: "Two years", external_url: "https://example.org/apply", status: "published" };
describe("Employer requirements", () => {
  it("stores company and contact person independently", () => {
    expect(employerProfileSchema.parse({ name: "Acme", contact_name: "Jane Doe", website: "", description: "Hiring engineers" })).toMatchObject({ name: "Acme", contact_name: "Jane Doe" });
    expect(employerProfileSchema.safeParse({ name: "Acme", contact_name: "", website: "", description: "" }).success).toBe(false);
  });
  it("requires the employer application form link", () => {
    expect(employerVacancySchema.parse(vacancy).external_url).toBe("https://example.org/apply");
    expect(employerVacancySchema.safeParse({ ...vacancy, external_url: "" }).success).toBe(false);
  });
  it("rejects unsafe or credential-bearing application links", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,hello", "https://user:password@example.org"]) expect(webLink.safeParse(url).success).toBe(false);
  });
  it("supports draft, published and closed vacancies, not arbitrary status", () => {
    for (const status of ["draft", "published", "closed"]) expect(employerVacancySchema.safeParse({ ...vacancy, status }).success).toBe(true);
    expect(employerVacancySchema.safeParse({ ...vacancy, status: "featured" }).success).toBe(false);
  });
  it("rejects reversed salary ranges", () => {
    expect(employerVacancySchema.safeParse({ ...vacancy, salary_min: "500", salary_max: "400" }).success).toBe(false);
    expect(employerVacancySchema.parse({ ...vacancy, salary_min: "400", salary_max: "500" }).salary_max).toBe(500);
  });
});