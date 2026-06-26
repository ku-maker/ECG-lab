import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { ECGWorkspace } from "@/components/ECGWorkspace";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader />
      <AppNav />
      <ECGWorkspace />
    </div>
  );
}
