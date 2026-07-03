#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const templatesDir = path.join(rootDir, "src/data/ecg/templates");
const casesFile = path.join(rootDir, "data/ecgCases.ts");

const fiducialOrder = [
  "pOn",
  "pPeak",
  "pOff",
  "qrsOn",
  "q",
  "r",
  "s",
  "qrsOff",
  "jPoint",
  "tPeak",
  "tEnd",
];

const allowedRhythms = new Set(["regular", "irregular", "chaotic"]);
const allowedSeverities = new Set(["normal", "warning", "critical"]);
const errors = [];

function relative(filePath) {
  return path.relative(rootDir, filePath);
}

function addError(filePath, message) {
  errors.push(`❌ ${relative(filePath)}: ${message}`);
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function loadTemplateFiles() {
  const entries = await readdir(templatesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(templatesDir, entry.name))
    .sort();
}

async function validateTemplate(filePath, templateIds) {
  let template;

  try {
    template = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    addError(filePath, `invalid JSON (${error.message})`);
    return;
  }

  for (const key of ["id", "label", "lead", "unit"]) {
    if (typeof template[key] !== "string" || template[key].trim() === "") {
      addError(filePath, `${key} must be a non-empty string`);
    }
  }

  if (typeof template.id === "string" && template.id.trim() !== "") {
    if (templateIds.has(template.id)) {
      addError(filePath, `duplicate template id "${template.id}"`);
    }
    templateIds.add(template.id);
  }

  if (!isPositiveNumber(template.sampleRateHz)) {
    addError(filePath, "sampleRateHz must be a positive number");
  }

  if (!isPositiveNumber(template.durationMs)) {
    addError(filePath, "durationMs must be a positive number");
  }

  if (!Array.isArray(template.samplesMv)) {
    addError(filePath, "samplesMv must be an array");
  } else {
    if (template.samplesMv.length === 0) {
      addError(filePath, "samplesMv must not be empty");
    }

    template.samplesMv.forEach((sample, index) => {
      if (typeof sample !== "number" || !Number.isFinite(sample)) {
        addError(filePath, `samplesMv[${index}] must be a finite number`);
      }
    });
  }

  if (!isPlainObject(template.fiducialsMs)) {
    addError(filePath, "fiducialsMs must exist and be an object");
    return;
  }

  const durationMs = template.durationMs;
  for (const [key, value] of Object.entries(template.fiducialsMs)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      addError(filePath, `fiducialsMs.${key} must be a finite number`);
      continue;
    }

    if (isPositiveNumber(durationMs) && (value < 0 || value > durationMs)) {
      addError(filePath, `fiducialsMs.${key} is out of range`);
    }
  }

  let previousKey = null;
  let previousValue = null;

  for (const key of fiducialOrder) {
    if (!Object.hasOwn(template.fiducialsMs, key)) {
      continue;
    }

    const value = template.fiducialsMs[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }

    if (previousValue !== null && value < previousValue) {
      addError(
        filePath,
        `fiducialsMs order is invalid: ${previousKey} (${previousValue}) > ${key} (${value})`,
      );
    }

    previousKey = key;
    previousValue = value;
  }
}

function findMatchingBracket(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractCasesArray(source) {
  const declarationIndex = source.indexOf("export const ECG_CASES");
  if (declarationIndex === -1) {
    return null;
  }

  const assignmentIndex = source.indexOf("=", declarationIndex);
  if (assignmentIndex === -1) {
    return null;
  }

  const arrayStart = source.indexOf("[", assignmentIndex);
  if (arrayStart === -1) {
    return null;
  }

  const arrayEnd = findMatchingBracket(source, arrayStart, "[", "]");
  if (arrayEnd === -1) {
    return null;
  }

  return source.slice(arrayStart + 1, arrayEnd);
}

function extractTopLevelObjects(source) {
  const objects = [];

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "{") {
      continue;
    }

    const objectEnd = findMatchingBracket(source, index, "{", "}");
    if (objectEnd === -1) {
      return null;
    }

    objects.push(source.slice(index, objectEnd + 1));
    index = objectEnd;
  }

  return objects;
}

function getStringField(source, key) {
  const match = source.match(new RegExp(`\\b${key}\\s*:\\s*"([^"]*)"`));
  return match?.[1] ?? null;
}

function getNumberField(source, key) {
  const match = source.match(new RegExp(`\\b${key}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : null;
}

async function validateCases(templateIds) {
  const source = await readFile(casesFile, "utf8");
  const arraySource = extractCasesArray(source);

  if (arraySource === null) {
    addError(casesFile, "could not find ECG_CASES array");
    return [];
  }

  const caseBlocks = extractTopLevelObjects(arraySource);
  if (caseBlocks === null) {
    addError(casesFile, "could not parse ECG_CASES objects");
    return [];
  }

  if (caseBlocks.length === 0) {
    addError(casesFile, "ECG_CASES must not be empty");
  }

  const caseIds = new Set();

  caseBlocks.forEach((caseBlock, index) => {
    const label = `ECG_CASES[${index}]`;
    const id = getStringField(caseBlock, "id");
    const templateId = getStringField(caseBlock, "templateId");
    const rhythm = getStringField(caseBlock, "rhythm");
    const severity = getStringField(caseBlock, "severity");
    const initialBpm = getNumberField(caseBlock, "initialBpm");

    if (!id) {
      addError(casesFile, `${label}.id must be a non-empty string`);
    } else if (caseIds.has(id)) {
      addError(casesFile, `duplicate ECG_CASES id "${id}"`);
    } else {
      caseIds.add(id);
    }

    if (!templateId) {
      addError(casesFile, `${id ?? label}.templateId must be a non-empty string`);
    } else if (!templateIds.has(templateId)) {
      addError(
        casesFile,
        `templateId "${templateId}" does not match any template JSON id`,
      );
    }

    if (initialBpm === null || !Number.isFinite(initialBpm)) {
      addError(casesFile, `${id ?? label}.initialBpm must be a finite number`);
    }

    if (!rhythm || !allowedRhythms.has(rhythm)) {
      addError(
        casesFile,
        `${id ?? label}.rhythm must be one of: ${Array.from(allowedRhythms).join(", ")}`,
      );
    }

    if (!severity || !allowedSeverities.has(severity)) {
      addError(
        casesFile,
        `${id ?? label}.severity must be one of: ${Array.from(allowedSeverities).join(", ")}`,
      );
    }
  });

  return caseBlocks;
}

async function main() {
  const templateIds = new Set();
  const templateFiles = await loadTemplateFiles();

  if (templateFiles.length === 0) {
    addError(templatesDir, "no template JSON files found");
  }

  for (const filePath of templateFiles) {
    await validateTemplate(filePath, templateIds);
  }

  const caseBlocks = await validateCases(templateIds);

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  console.log("✅ ECG content validation passed");
  console.log(`Templates: ${templateFiles.length}`);
  console.log(`Cases: ${caseBlocks.length}`);
}

main().catch((error) => {
  console.error(`❌ ECG content validation failed: ${error.message}`);
  process.exit(1);
});
