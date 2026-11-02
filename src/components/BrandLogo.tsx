import logo from "@/assets/azmera_jobs_logo.jpg.asset.json";
import symbol from "@/assets/azmera_jobs_symbol.jpg.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({ full = false, className }: { full?: boolean; className?: string }) {
  if (full) return <img src={logo.url} alt="Azmera Jobs — Your trusted partner in jobs" className={cn("mx-auto h-48 w-48 object-contain", className)} />;
  return (
    <span className={cn("flex shrink-0 items-center gap-2", className)}>
      <img src={symbol.url} alt="" className="h-10 w-14 object-contain sm:h-12 sm:w-16" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold text-primary sm:text-xl">AZMERA</span>
        <span className="mt-1 text-sm font-extrabold text-brand-gold">JOBS</span>
      </span>
    </span>
  );
}