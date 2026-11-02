import { createFileRoute } from "@tanstack/react-router";
import { handleCVMatch } from "@/lib/cv-match.server";

export const Route = createFileRoute("/api/cv-match")({
  server: { handlers: { POST: ({ request }) => handleCVMatch(request) } },
});