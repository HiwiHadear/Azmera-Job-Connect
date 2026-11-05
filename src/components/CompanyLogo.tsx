import { cn } from "@/lib/utils";
import { useState } from "react";

export function CompanyLogo({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null | undefined;
  className?: string | undefined;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-secondary text-sm font-bold text-secondary-foreground",
        className,
      )}
    >
      {url && failedUrl !== url ? <img src={url} alt={name} loading="lazy" width={64} height={64} onError={() => setFailedUrl(url)} className="h-full w-full bg-card object-contain" /> : initials}
    </div>
  );
}
