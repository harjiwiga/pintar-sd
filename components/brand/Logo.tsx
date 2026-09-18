import { cn } from "@/lib/utils";

export function Logo({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold tracking-tight shadow-sm",
          inverted
            ? "bg-white/15 text-white ring-1 ring-white/20"
            : "bg-primary text-primary-foreground"
        )}
      >
        SP
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block text-[15px] font-semibold tracking-tight",
            inverted ? "text-white" : "text-foreground"
          )}
        >
          SoalPintar
        </span>
        <span
          className={cn(
            "block text-[11px] font-medium",
            inverted ? "text-sidebar-muted" : "text-muted-foreground"
          )}
        >
          Latihan SD · Kurikulum Merdeka
        </span>
      </span>
    </div>
  );
}
