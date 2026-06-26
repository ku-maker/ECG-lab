"use client";

import { Stethoscope } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ECG_CASES } from "@/data/ecgCases";
import { cn } from "@/lib/utils";

interface CaseSelectorProps {
  selectedCaseId: string | null;
  onCaseChange: (caseId: string) => void;
}

const severityDot: Record<string, string> = {
  normal: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-rose-500",
};

export function CaseSelector({
  selectedCaseId,
  onCaseChange,
}: CaseSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Stethoscope className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          症例プリセット
        </span>
      </div>

      <Select
        value={selectedCaseId ?? ""}
        onValueChange={(v) => {
          if (v) onCaseChange(v);
        }}
      >
        <SelectTrigger
          id="case-selector"
          className="h-11 w-full rounded-xl border-border bg-card text-sm shadow-sm"
          aria-label="症例を選択"
        >
          <SelectValue placeholder="— 症例を選択してください —" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {ECG_CASES.map((c) => (
            <SelectItem
              key={c.id}
              value={c.id}
              className="cursor-pointer rounded-lg py-2.5"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    severityDot[c.severity]
                  )}
                  aria-hidden
                />
                <span className="font-medium">{c.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {c.abbr}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
