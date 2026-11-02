import { describe, expect, it } from "vitest";
import { matchInputSchema, readMatchStream, validateCVFile } from "@/lib/cv-match";

describe("CV analysis inputs", () => {
  it("rejects a missing job listing", () => {
    expect(matchInputSchema.safeParse({ cv: "An experienced applicant", job: "" }).success).toBe(false);
  });
  it("accepts PDF uploads and rejects unsupported files", () => {
    expect(validateCVFile({ name: "cv.pdf", size: 100, type: "application/pdf" })).toBe("pdf");
    expect(() => validateCVFile({ name: "cv.exe", size: 100, type: "application/octet-stream" })).toThrow();
  });
  it("preserves split streaming events and reports completion", async () => {
    const encoder = new TextEncoder();
    const chunks = ['{"type":"reasoning","text":"Review', 'ing"}\n{"type":"text","text":"Matching skills"}\n', '{"type":"done"}\n'];
    const body = new ReadableStream({ start(controller) { chunks.forEach(c => controller.enqueue(encoder.encode(c))); controller.close(); } });
    const events: string[] = [];
    await readMatchStream(new Response(body), e => events.push(e.type));
    expect(events).toEqual(["reasoning", "text", "done"]);
  });
  it("does not treat interrupted output as successful", async () => {
    await expect(readMatchStream(new Response('{"type":"text","text":"Partial"}\n'), () => {})).rejects.toThrow("interrupted");
  });
});