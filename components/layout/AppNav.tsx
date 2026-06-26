"use client";

import { BookOpen, LayoutDashboard, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    id: "simulator",
    label: "シミュレーター",
    icon: LayoutDashboard,
    active: true,
  },
  {
    id: "cases",
    label: "症例ライブラリ",
    icon: Stethoscope,
    active: false,
  },
  {
    id: "learn",
    label: "学習ガイド",
    icon: BookOpen,
    active: false,
  },
] as const;

export function AppNav() {
  return (
    <nav
      aria-label="メインナビゲーション"
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/40 px-4 py-2 md:px-6"
    >
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <Button
            key={item.id}
            variant={item.active ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "shrink-0 gap-2",
              item.active && "pointer-events-none"
            )}
            aria-current={item.active ? "page" : undefined}
            disabled={!item.active}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
