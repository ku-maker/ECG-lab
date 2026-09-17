import assert from "node:assert/strict";

import { lbbbFiducials, lbbbTimeline } from "../src/data/ecg/activation/lbbb.ts";
import { evaluateSegments } from "../src/data/ecg/activation/evaluate.ts";
import { projectLeadValue } from "../src/data/ecg/leads/projectLead.ts";

assert.equal(lbbbFiducials.qrsOff - lbbbFiducials.qrsOn, 200);

const early = evaluateSegments(lbbbTimeline, 310);
const late = evaluateSegments(lbbbTimeline, 430);
assert.ok(early.rightBundle > 0.9 && early.septalPurkinje < 0.1, "right ventricle should activate first");
assert.ok(late.septalPurkinje > 0.9 && late.rightBundle < 0.1, "left ventricle should activate later");

assert.ok(projectLeadValue(lbbbTimeline, "V1", 430) < -0.3, "V1 late QRS should be negative");
assert.ok(projectLeadValue(lbbbTimeline, "V6", 365) > 0.5, "V6 should have a first broad R peak");
assert.ok(projectLeadValue(lbbbTimeline, "V6", 430) > 0.5, "V6 should have a second broad R peak");
assert.ok(
  projectLeadValue(lbbbTimeline, "V6", 398) <
    Math.min(projectLeadValue(lbbbTimeline, "V6", 365), projectLeadValue(lbbbTimeline, "V6", 430)) * 0.8,
  "V6 should show a visible mid-QRS notch"
);

console.log("PASS: LBBB QRS width, right-before-left activation, V1 negativity and notched V6 R wave.");
