import assert from "node:assert/strict";

import { evaluateSegments } from "../src/data/ecg/activation/evaluate.ts";
import {
  WPW_VARIANTS,
  wpwFiducials,
  wpwLeftFreeWallVariant,
  wpwLeftPosteroseptalTimeline,
  wpwLeftPosteroseptalVariant,
  wpwRightFreeWallTimeline,
  wpwRightFreeWallVariant,
  wpwRightAnteroseptalTimeline,
  wpwRightAnteroseptalVariant,
  wpwRightPosteroseptalTimeline,
  wpwRightPosteroseptalVariant,
  wpwTimeline,
} from "../src/data/ecg/activation/wpw.ts";
import { projectLeadValue } from "../src/data/ecg/leads/projectLead.ts";

assert.equal(wpwFiducials.qrsOn - wpwFiducials.pOn, 100, "PR interval should be short");
assert.equal(wpwFiducials.qrsOff - wpwFiducials.qrsOn, 190, "QRS should be wide");

const approach = evaluateSegments(wpwTimeline, 150);
const bridge = evaluateSegments(wpwTimeline, 174);
const delta = evaluateSegments(wpwTimeline, 210);
const fusion = evaluateSegments(wpwTimeline, 300);
assert.ok(approach.accessoryAtrialApproach > 0.9, "atrial activation should approach the accessory-pathway entrance");
assert.ok(bridge.accessoryPathway > 0.9, "activation should cross the AV annulus over the accessory pathway");
assert.ok(delta.accessoryVentricularSpread > 0.9 && delta.septalPurkinje < 0.05, "accessory exit should activate ventricular myocardium first");
assert.ok(fusion.septalPurkinje > 0.9 && fusion.accessoryVentricularSpread < 0.2, "normal pathway should join later");
assert.equal(wpwLeftFreeWallVariant.location, "left-free-wall");
assert.equal(wpwLeftFreeWallVariant.ventricularChamber, "left");
assert.equal(wpwRightFreeWallVariant.location, "right-free-wall");
assert.equal(wpwRightFreeWallVariant.ventricularChamber, "right");
assert.equal(wpwRightPosteroseptalVariant.location, "posteroseptal");
assert.equal(wpwRightPosteroseptalVariant.ventricularChamber, "septal");
assert.equal(wpwLeftPosteroseptalVariant.location, "posteroseptal");
assert.equal(wpwLeftPosteroseptalVariant.atrialChamber, "left");
assert.equal(wpwLeftPosteroseptalVariant.ventricularChamber, "septal");
assert.equal(wpwRightAnteroseptalVariant.location, "anteroseptal");
assert.equal(wpwRightAnteroseptalVariant.ventricularChamber, "septal");
assert.equal(Object.keys(WPW_VARIANTS).length, 5, "five location variants should be selectable");

const leadII = (timeMs) => projectLeadValue(wpwTimeline, "II", timeMs);
assert.ok(leadII(170) > 0 && leadII(170) < leadII(190), "QRS should begin with a small slurred upstroke");
assert.ok(leadII(190) < leadII(230) && leadII(230) < leadII(270), "delta-wave upstroke should rise gradually");
assert.ok(leadII(300) > leadII(270) + 0.15, "fused activation should form the dominant R wave");
assert.ok(projectLeadValue(wpwTimeline, "V1", 190) > 0, "left free-wall model should have a positive initial QRS in V1");
assert.ok(projectLeadValue(wpwRightFreeWallTimeline, "V1", 190) < 0, "right free-wall model should have a negative initial QRS in V1");
for (const lead of ["II", "III", "aVF"]) {
  assert.ok(projectLeadValue(wpwRightPosteroseptalTimeline, lead, 190) < 0, `right posteroseptal model should be initially negative in ${lead}`);
  assert.ok(projectLeadValue(wpwRightAnteroseptalTimeline, lead, 190) > 0, `right anteroseptal model should be initially positive in ${lead}`);
}
assert.ok(projectLeadValue(wpwRightAnteroseptalTimeline, "V1", 190) < 0, "right anteroseptal model should be initially negative in V1");
for (const lead of ["III", "aVF"]) {
  assert.ok(projectLeadValue(wpwLeftPosteroseptalTimeline, lead, 190) < 0, `left posteroseptal model should be initially negative in ${lead}`);
}
for (const lead of ["V1", "V2"]) {
  assert.ok(projectLeadValue(wpwLeftPosteroseptalTimeline, lead, 190) > 0, `left posteroseptal model should be initially positive in ${lead}`);
}
assert.ok(projectLeadValue(wpwRightPosteroseptalTimeline, "V1", 190) < 0, "right posteroseptal model should be initially negative in V1");
assert.ok(projectLeadValue(wpwRightPosteroseptalTimeline, "V2", 190) > 0, "right posteroseptal model should transition positive by V2");

console.log("PASS: five WPW locations separate anatomy and lead-specific delta-wave teaching polarities.");
