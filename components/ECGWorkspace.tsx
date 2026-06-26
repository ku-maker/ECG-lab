"use client";

import { useCallback, useState } from "react";

import { CaseExplanationCard } from "@/components/CaseExplanationCard";
import { CaseSelector } from "@/components/CaseSelector";
import { ParameterDashboard } from "@/components/dashboard/ParameterDashboard";
import { HybridLayout } from "@/components/layout/HybridLayout";
import { ECG_CASES, findCaseById, type ECGCase } from "@/data/ecgCases";
import { DEFAULT_ECG_PARAMS } from "@/lib/ecg/defaults";
import type { ECGParameters } from "@/lib/ecg/types";

export function ECGWorkspace() {
  const [params, setParams] = useState<ECGParameters>(DEFAULT_ECG_PARAMS);
  const [selectedCase, setSelectedCase] = useState<ECGCase | null>(null);

  // 症例選択ハンドラー: paramsを一括でその症例のものに切り替える
  const onCaseChange = useCallback((caseId: string) => {
    const ecgCase = findCaseById(caseId);
    if (!ecgCase) return;
    setSelectedCase(ecgCase);
    setParams(ecgCase.params);
  }, []);

  // スライダー操作: 手動変更時は症例選択を解除しない（選択済みのまま上書き）
  const onHeartRateChange = useCallback((heartRate: number) => {
    setParams((prev) => ({
      ...prev,
      global: { ...prev.global, heartRate },
    }));
  }, []);

  const onQrsWidthChange = useCallback((width: number) => {
    setParams((prev) => ({
      ...prev,
      qrsComplex: { ...prev.qrsComplex, width },
    }));
  }, []);

  const onStLevelChange = useCallback((stElevation: number) => {
    setParams((prev) => ({
      ...prev,
      stT_Segment: { ...prev.stT_Segment, stElevation },
    }));
  }, []);

  const controlPanel = (
    <div className="flex flex-col gap-6 md:gap-8 pb-12">
      {/* 症例プリセット選択 */}
      <CaseSelector
        selectedCaseId={selectedCase?.id ?? null}
        onCaseChange={onCaseChange}
      />

      {/* 解説カード */}
      <CaseExplanationCard selectedCase={selectedCase} />

      {/* スライダーパネル */}
      <ParameterDashboard
        params={params}
        onHeartRateChange={onHeartRateChange}
        onQrsWidthChange={onQrsWidthChange}
        onStLevelChange={onStLevelChange}
      />
    </div>
  );

  return <HybridLayout params={params} dashboard={controlPanel} />;
}
