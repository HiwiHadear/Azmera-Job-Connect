import { cn } from "@/lib/utils";

export function CompanyLogo({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
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
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
