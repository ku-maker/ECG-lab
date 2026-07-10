import {
  axisFromAngle,
  leadAxis,
  LEAD_ANGLES_DEG,
  LEADS,
} from "../src/data/ecg/leads/leadAxes.ts";

const EPSILON = 1e-9;
const EXPECTED_LEADS = [
  "I",
  "II",
  "III",
  "aVR",
  "aVL",
  "aVF",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
];

function approxEqual(actual, expected, epsilon = EPSILON) {
  return Math.abs(actual - expected) <= epsilon;
}

function vectorApproxEqual(actual, expected, epsilon = EPSILON) {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => approxEqual(value, expected[index], epsilon))
  );
}

function normalize(vector) {
  const norm = Math.hypot(...vector);
  if (norm === 0) return [0, 0, 0];

  return vector.map((value) => value / norm);
}

function norm(vector) {
  return Math.hypot(...vector);
}

const checks = [];

function check(name, pass, detail) {
  checks.push({ name, pass, detail });
}

check(
  'leadAxis("I") ~= [1, 0, 0]',
  vectorApproxEqual(leadAxis("I"), [1, 0, 0]),
  `axis=${JSON.stringify(leadAxis("I"))}`
);

check(
  'leadAxis("aVF") ~= [0, -1, 0]',
  vectorApproxEqual(leadAxis("aVF"), [0, -1, 0]),
  `axis=${JSON.stringify(leadAxis("aVF"))}`
);

check(
  'leadAxis("II") ~= [0.5, -0.8660254, 0]',
  vectorApproxEqual(leadAxis("II"), [0.5, -0.8660254037844386, 0]),
  `axis=${JSON.stringify(leadAxis("II"))}`
);

const einthovenSum = normalize(
  axisFromAngle(0).map((value, index) => value + axisFromAngle(120)[index])
);
const leadIIAxis = normalize(axisFromAngle(60));
check(
  "Einthoven direction II ~= I + III",
  vectorApproxEqual(einthovenSum, leadIIAxis),
  `I+III=${JSON.stringify(einthovenSum)} II=${JSON.stringify(leadIIAxis)}`
);

for (const lead of LEADS) {
  check(
    `norm(${lead}) ~= 1`,
    approxEqual(norm(leadAxis(lead)), 1),
    `norm=${norm(leadAxis(lead))}`
  );
}

const uniqueLeads = new Set(LEADS);
const angleKeys = Object.keys(LEAD_ANGLES_DEG);
check(
  "LEADS contains 12 unique leads",
  LEADS.length === 12 && uniqueLeads.size === 12,
  `length=${LEADS.length} unique=${uniqueLeads.size}`
);
check(
  "LEAD_ANGLES_DEG contains 12 leads",
  angleKeys.length === 12 && new Set(angleKeys).size === 12,
  `keys=${angleKeys.join(",")}`
);
check(
  "LEADS covers all expected leads",
  EXPECTED_LEADS.every((lead) => uniqueLeads.has(lead)) &&
    LEADS.every((lead) => EXPECTED_LEADS.includes(lead)),
  `leads=${LEADS.join(",")}`
);
check(
  "LEAD_ANGLES_DEG covers all expected leads",
  EXPECTED_LEADS.every((lead) =>
    Object.prototype.hasOwnProperty.call(LEAD_ANGLES_DEG, lead)
  ) && angleKeys.every((lead) => EXPECTED_LEADS.includes(lead)),
  `keys=${angleKeys.join(",")}`
);

let ok = true;
for (const result of checks) {
  const mark = result.pass ? "PASS" : "FAIL";
  if (!result.pass) ok = false;
  console.log(`[${mark}] ${result.name} ${result.detail}`);
}

console.log(ok ? "✅ Lead axes validation passed" : "❌ Lead axes validation failed");
process.exit(ok ? 0 : 1);
