"use client";

import { useState } from "react";
import { EcgCanvas } from "@/components/EcgCanvas";
import {
  ECG_TEMPLATE_OPTIONS,
  findTemplateOption,
  type EcgTemplateId,
} from "@/src/data/ecg/templates";

export default function EcgPage() {
  const [templateId, setTemplateId] = useState<EcgTemplateId>("nsr");
  const selectedTemplate = findTemplateOption(templateId);
  const [bpm, setBpm] = useState(selectedTemplate.defaultBpm);

  const handleTemplateChange = (nextTemplateId: EcgTemplateId) => {
    const nextTemplate = findTemplateOption(nextTemplateId);
    setTemplateId(nextTemplateId);
    setBpm(nextTemplate.defaultBpm);
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>ECG Simulator MVP</h1>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {ECG_TEMPLATE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleTemplateChange(option.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: option.id === templateId ? "#111" : "#fff",
                color: option.id === templateId ? "#fff" : "#111",
              }}
            >
              {option.abbr}
            </button>
          ))}
        </div>

        <label>
          BPM: <strong>{bpm}</strong>
        </label>

        <input
          type="range"
          min={40}
          max={180}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ display: "block", width: 300, marginTop: 8 }}
        />
      </div>

      <EcgCanvas bpm={bpm} template={selectedTemplate.template} />
    </main>
  );
}
