import { z } from "zod";

export const CV_MAX_BYTES = 10 * 1024 * 1024;
export const MATCH_TEXT_MAX = 30000;

export const matchInputSchema = z.object({
  cv: z.string().trim().max(MATCH_TEXT_MAX),
  job: z.string().trim().min(30, "Add the full job listing (at least 30 characters).").max(MATCH_TEXT_MAX),
});

export function validateCVFile(file: Pick<File, "name" | "size" | "type">) {
  if (!file.size) throw new Error("The CV file is empty.");
  if (file.size > CV_MAX_BYTES) throw new Error("The CV must be 10 MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" && extension !== "txt") throw new Error("Choose a PDF or TXT CV.");
  if (file.type && !["application/pdf", "text/plain"].includes(file.type)) throw new Error("Choose a PDF or TXT CV.");
  return extension;
}

export type MatchEvent = { type: "text" | "reasoning" | "error" | "done"; text?: string };

export async function readMatchStream(response: Response, onEvent: (event: MatchEvent) => void) {
  if (!response.body) throw new Error("The analysis stream could not be opened.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.trim()) continue;
        const event = JSON.parse(part) as MatchEvent;
        if (event.type === "done" || event.type === "error") completed = true;
        onEvent(event);
      }
      if (done) break;
    }
    if (!completed) throw new Error("The analysis was interrupted. Your partial results are preserved.");
  } finally { reader.releaseLock(); }
}