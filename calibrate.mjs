#!/usr/bin/env node
// Qualify capture.mjs against the calibration fixtures: every planted defect must be
// detected, the clean page must have no findings, and both must hold on two consecutive runs
// with byte-identical screenshots.
// Usage: node calibrate.mjs [--out evidence/calibration]   Exit: 0 qualified, 1 not qualified.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { capture, VIEWPORTS } from './capture.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const outArg = process.argv.indexOf('--out');
const out = outArg > 0 ? path.resolve(process.argv[outArg + 1]) : path.join(here, 'evidence', 'calibration');
const expected = JSON.parse(fs.readFileSync(path.join(here, 'calibration', 'expected.json')));
const WIDTHS = VIEWPORTS.map((v) => v.width);
const problems = [];
const fail = (msg) => { problems.push(msg); console.log(`  MISS ${msg}`); };

const metricValue = (m) => (Array.isArray(m) ? m.length : m);
function checkMetric(summaryDir, spec, label) {
  for (const w of WIDTHS) {
    const m = JSON.parse(fs.readFileSync(path.join(summaryDir, String(w), 'metrics.json')))[spec.name];
    const ok = (spec.contains === undefined || m.includes(spec.contains))
      && (spec.min === undefined || metricValue(m) >= spec.min) && (spec.max === undefined || metricValue(m) <= spec.max);
    if (!ok) fail(`${label}: metric ${spec.name} at ${w} = ${JSON.stringify(m)}, expected ${JSON.stringify(spec)}`);
  }
}

function checkStates(name, exp, summary) {
  const got = (summary.states?.names ?? []).join(', ');
  const want = (exp.states ?? []).join(', ');
  if (got !== want) fail(`${name}: captured states [${got}], expected [${want}]`);
  for (const v of summary.viewports) {
    const shots = (v.states ?? []).map((s) => s.name).join(', ');
    if (shots !== want) fail(`${name}: state screenshots at ${v.width} [${shots}], expected [${want}]`);
  }
}

function evaluate(name, exp, { runDir, summary }) {
  checkStates(name, exp, summary);
  console.log(`${name} run ${summary.run}: ${summary.pass ? 'PASS' : 'FAIL'}, ${summary.findings.length} findings`);
  if (summary.pass !== exp.expectPass) fail(`${name}: gates ${summary.pass ? 'passed' : 'failed'}, expected ${exp.expectPass ? 'pass' : 'fail'}`);
  const matched = new Set();
  for (const p of exp.planted ?? []) {
    if (p.metric) { checkMetric(runDir, p.metric, `${name}/${p.id}`); continue; }
    if (!p.detect) continue;
    for (const w of p.detect.widths ?? WIDTHS) {
      const hits = summary.findings.filter((f) => f.width === w && f.check === p.detect.check
        && Object.entries(p.detect.where ?? {}).every(([k, v]) => String(f[k] ?? '').includes(v)));
      hits.forEach((h) => matched.add(h));
      if (!hits.length) fail(`${name}/${p.id} not detected at ${w}: ${p.description}`);
    }
  }
  for (const m of exp.metrics ?? []) checkMetric(runDir, m, name);
  if (exp.maxFindings !== undefined && summary.findings.length > exp.maxFindings) {
    for (const f of summary.findings) fail(`${name}: unexpected finding ${f.width} ${f.check} ${f.rule ?? f.element ?? f.family ?? ''} ${f.detail}`);
  }
  const extra = summary.findings.filter((f) => !matched.has(f));
  if (exp.planted && extra.length) console.log(`  also found (not planted as a separate defect): ${extra.map((f) => `${f.width} ${f.check} ${f.rule ?? f.element ?? ''}`.trim()).join('; ')}`);
  const judgement = (exp.planted ?? []).filter((p) => p.detect === null);
  if (judgement.length) console.log(`  judgement only, not machine-checked: ${judgement.map((p) => p.id).join(', ')}`);
}

// Every screenshot, at rest and per state, must be byte-identical across runs: a state
// capture that is not reproducible is not evidence.
const pngsIn = (dir, prefix) => (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
  .filter((f) => f.endsWith('.png'))
  .map((f) => [`${prefix}${f}`, crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex')]);
const pngHashes = (dir) => Object.fromEntries(WIDTHS.flatMap((w) => [
  ...pngsIn(path.join(dir, String(w)), `${w}/`),
  ...pngsIn(path.join(dir, String(w), 'states'), `${w}/states/`),
]));

const report = { created: new Date().toISOString(), fixtures: {} };
for (const [name, exp] of Object.entries(expected)) {
  const runs = [];
  for (let i = 0; i < 2; i++) {
    const r = await capture(path.join(here, exp.dir), { out });
    evaluate(name, exp, r);
    runs.push(r);
  }
  const [a, b] = runs.map((r) => pngHashes(r.runDir));
  const differing = Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]);
  if (differing.length) fail(`${name}: screenshots differ between runs: ${differing.join(', ')}`);
  else console.log(`  repeat: ${Object.keys(a).length} screenshots byte-identical across runs`);
  report.fixtures[name] = { runs: runs.map((r) => r.summary.run), source: runs[0].summary.source.sha256,
    browser: runs[0].summary.browser, screenshotsIdentical: !differing.length, screenshots: a };
}
report.qualified = !problems.length;
report.problems = problems;
fs.writeFileSync(path.join(out, 'calibration-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${report.qualified ? 'QUALIFIED' : 'NOT QUALIFIED'} (${problems.length} problems) — ${path.join(out, 'calibration-report.json')}`);
process.exit(report.qualified ? 0 : 1);
