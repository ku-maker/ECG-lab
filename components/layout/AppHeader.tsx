import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function AppHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight md:text-lg">
            ECG Lab
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            リアルタイム心電図シミュレーター
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="hidden sm:inline-flex">
          学習モード
        </Badge>
        <Badge variant="outline" className="font-mono text-xs">
          Phase 3
        </Badge>
      </div>
    </header>
  );
}
