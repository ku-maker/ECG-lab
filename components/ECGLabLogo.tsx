import { Activity } from "lucide-react";

import { cn } from "@/lib/utils";

type ECGLabLogoProps = {
  className?: string;
  iconClassName?: string;
};

export function ECGLabLogo({ className, iconClassName }: ECGLabLogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
      aria-hidden
    >
      <Activity className={cn("size-5", iconClassName)} />
    </div>
  );
}
