import { readFileSync, readdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
import * as rateTiming from '../../lib/ecg/rateTiming.ts';
import * as timing from '../../lib/ecg/teachingTiming.ts';

// Exercise the functions used by the canvas itself, without mounting React or copying the signal math.
export function loadRenderer() {
  const dir = new URL('../../src/data/ecg/templates/', import.meta.url);
  const templates = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
  const normal = templates.find(t => t.id === 'nsr-lead2-v0');
  const exports = {};
  const source = readFileSync(new URL('../../components/EcgCanvas.tsx', import.meta.url), 'utf8') + '\nexport { getRhythmValueAtTimeMs, forEachQrsPeakInRange, getPvcCyclePosition, getPvcCycleMs, getPacCycleMs, getPacCyclePosition, getTemplateValueAtMs };';
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020}}).outputText;
  const context = createContext({exports, require: id => {
    if (id === 'react') return {forwardRef: () => ({})};
    if (id.endsWith('/templates')) return {ECG_TEMPLATE_OPTIONS: [{template:normal}]};
    if (id.endsWith('/rateTiming')) return rateTiming;
    if (id.endsWith('/teachingTiming')) return timing;
    return {};
  }});
  runInContext(code, context);
  return {renderer: exports, templates, normal};
}
