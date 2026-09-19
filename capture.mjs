#!/usr/bin/env node
// Capture a static page at 375 and 1280 wide and write evidence/<run>/.
// Usage: node capture.mjs <dir> [--page index.html] [--out evidence]
// Exit: 0 all gates pass, 1 a gate failed, 2 capture error.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const VIEWPORTS = [{ width: 375, height: 812 }, { width: 1280, height: 800 }];
const MAX_TILES = 24;
const SKIP_DIRS = new Set(['node_modules', '.git', 'evidence']);
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain' };

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function sourceFiles(root, rel = '') {
  return fs.readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap((e) => {
    const p = path.join(rel, e.name);
    if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : sourceFiles(root, p);
    return e.isFile() ? [p] : [];
  }).sort();
}

function hashSource(root) {
  const files = Object.fromEntries(sourceFiles(root).map((f) => [f, sha256(fs.readFileSync(path.join(root, f)))]));
  const sha = sha256(Object.entries(files).map(([f, h]) => `${h}  ${f}\n`).join(''));
  return { sha256: sha, files };
}

function serve(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    // Chrome requests /favicon.ico on its own once per browser, invisible to page listeners; not a page defect.
    if (!fs.existsSync(file) && p === '/favicon.ico') { res.writeHead(204).end(); return; }
    if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

function claimRunDir(out, tag) {
  fs.mkdirSync(out, { recursive: true });
  for (let n = fs.readdirSync(out).length + 1; ; n++) {
    const dir = path.join(out, `${String(n).padStart(4, '0')}-${tag}`);
    try { fs.mkdirSync(dir); return dir; } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
}

// Runs inside the page. Only reads the DOM; screenshots are taken before this.
function inspectPage() {
  const vw = document.documentElement.clientWidth;
  const visible = (e) => e.checkVisibility({ visibilityProperty: true, opacityProperty: true })
    && e.getBoundingClientRect().width > 1 && e.getBoundingClientRect().height > 1;
  const describe = (e) => e.tagName.toLowerCase() + (e.id ? `#${e.id}` : '')
    + [...e.classList].slice(0, 2).map((c) => `.${c}`).join('');
  const ownText = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const all = [...document.querySelectorAll('body *')];
  const els = all.filter(visible);
  const style = new Map(els.map((e) => [e, getComputedStyle(e)]));
  const clipsX = (s) => s.overflowX !== 'visible';

  // Horizontal overflow on both edges; report only the outermost offender, ignore overflow a scroll/clip ancestor contains.
  const contained = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) if (clipsX(getComputedStyle(p))) return true; return false; };
  const edge = [];
  for (const e of els) {
    const r = e.getBoundingClientRect();
    const side = r.left < -1 && r.right > 0 ? 'left' : r.right > vw + 1 && r.left < vw ? 'right' : null;
    if (!side || contained(e)) continue;
    if (edge.some((o) => o.el.contains(e) && o.side === side)) continue;
    edge.push({ el: e, side, element: describe(e), left: Math.round(r.left), right: Math.round(r.right) });
  }
  // Content that overflows its own box: clipped (overflow hidden/clip) or spilling (overflow visible).
  const textOverflow = [];
  for (const e of els) {
    const s = style.get(e);
    if (s.display === 'inline' || /auto|scroll/.test(s.overflowX + s.overflowY) || !e.textContent.trim()) continue;
    // Glyphs taller than a tight line-height overflow by a few px; only count vertical overflow of half a line or more.
    const dx = e.scrollWidth - e.clientWidth, dy = e.scrollHeight - e.clientHeight;
    if (dx > 1 || dy >= parseFloat(s.fontSize) / 2) textOverflow.push({ element: describe(e), mode: s.overflowX === 'visible' && s.overflowY === 'visible' ? 'spill' : 'clipped', dx, dy });
  }
  const interactive = els.filter((e) => e.matches('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link]'));
  const inlineInText = (e) => style.get(e).display === 'inline' && e.parentElement && ownText(e.parentElement);
  const smallTargets = interactive.filter((e) => !inlineInText(e)).filter((e) => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map(describe);

  const texty = els.filter(ownText);
  const cs = els.map((e) => style.get(e));
  const uniq = (xs) => [...new Set(xs)];
  const metrics = {
    fontSizes: uniq(texty.map((e) => style.get(e).fontSize)).sort((a, b) => parseFloat(a) - parseFloat(b)),
    fontStacks: uniq(texty.map((e) => style.get(e).fontFamily)),
    textColors: uniq(texty.map((e) => style.get(e).color)).length,
    backgroundColors: uniq(cs.map((s) => s.backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)')).length,
    gradients: cs.filter((s) => s.backgroundImage.includes('gradient')).length,
    radii: uniq(cs.map((s) => s.borderRadius).filter((r) => r !== '0px')).length,
    shadows: uniq(cs.map((s) => s.boxShadow).filter((b) => b !== 'none')).length,
    cardLike: cs.filter((s) => s.borderRadius !== '0px' && s.boxShadow !== 'none').length,
    uppercaseTracked: texty.filter((e) => style.get(e).textTransform === 'uppercase' && parseFloat(style.get(e).letterSpacing) > 0).length,
    centeredTextBlocks: texty.filter((e) => style.get(e).display !== 'inline' && style.get(e).textAlign === 'center').length,
    // Average characters per rendered line, over paragraphs that wrap to two or more lines.
    maxLineChars: Math.max(0, ...els.filter((e) => e.matches('p,li,dd')).map((e) => {
      const s = style.get(e), lh = s.lineHeight === 'normal' ? parseFloat(s.fontSize) * 1.2 : parseFloat(s.lineHeight);
      const lines = Math.round(e.getBoundingClientRect().height / lh);
      return lines >= 2 ? Math.round(e.textContent.trim().length / lines) : 0;
    })),
    smallTargets,
  };
  return {
    layout: { viewportWidth: vw, scrollWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
      edgeOverflow: edge.map(({ el, ...o }) => o), textOverflow },
    metrics,
    // Index into document.querySelectorAll('body *') so CDP node ids can be matched by position.
    textElements: all.map((e, i) => (visible(e) && ownText(e) ? { i, element: describe(e), stack: getComputedStyle(e).fontFamily } : null)).filter(Boolean),
    fontFaces: [...document.fonts].map((f) => ({ family: f.family.replace(/^["']|["']$/g, ''), weight: f.weight, style: f.style, status: f.status })),
  };
}

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif',
  'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', '-apple-system', 'blinkmacsystemfont']);
// Generics Chrome always resolves: families listed after one of these are never reached.
const TERMINAL = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']);
const parseStack = (s) => s.split(',').map((f) => f.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
const requestedFamilies = (stack) => {
  const fams = parseStack(stack);
  const end = fams.findIndex((f) => TERMINAL.has(f.toLowerCase()));
  return (end < 0 ? fams : fams.slice(0, end)).filter((f) => !GENERIC.has(f.toLowerCase()));
};

// A text element fails when none of the named families before its stack's first resolving generic rendered its text.
async function checkFonts(page, info) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'body *' });
  const faces = info.fontFaces;
  const byStack = new Map();
  for (const t of info.textElements) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: nodeIds[t.i] });
    const named = requestedFamilies(t.stack);
    const satisfied = named.some((f) => {
      const declared = faces.filter((x) => x.family.toLowerCase() === f.toLowerCase());
      if (declared.length) return declared.some((x) => x.status === 'loaded') && fonts.some((p) => p.isCustomFont);
      return fonts.some((p) => p.familyName.toLowerCase() === f.toLowerCase());
    });
    const entry = byStack.get(t.stack) ?? { stack: t.stack, requested: named, rendered: {}, elements: 0, failing: [] };
    entry.elements++;
    for (const p of fonts) entry.rendered[p.familyName + (p.isCustomFont ? ' (web font)' : '')] = (entry.rendered[p.familyName + (p.isCustomFont ? ' (web font)' : '')] ?? 0) + p.glyphCount;
    if (named.length && !satisfied) entry.failing.push(t.element);
    byStack.set(t.stack, entry);
  }
  await cdp.detach();
  return { stacks: [...byStack.values()], fontFaces: faces };
}

async function captureViewport(browser, url, vp, dir) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const consoleLog = [], pageErrors = [], failedRequests = [];
  page.on('console', (m) => consoleLog.push({ type: m.type(), text: m.text(), location: m.location().url }));
  page.on('pageerror', (e) => pageErrors.push({ message: e.message, stack: e.stack }));
  page.on('requestfailed', (r) => failedRequests.some((f) => f.url === r.url()) || failedRequests.push({ url: r.url(), failure: r.failure()?.errorText }));
  page.on('response', (r) => { if (r.status() >= 400) failedRequests.push({ url: r.url(), status: r.status() }); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);

  const shot = { animations: 'disabled', fullPage: true };
  await page.screenshot({ ...shot, path: path.join(dir, 'full.png') });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles = [];
  for (let y = 0, n = 1; y < height && n <= MAX_TILES; y += vp.height, n++) {
    const name = `tile-${String(n).padStart(2, '0')}.png`;
    await page.screenshot({ ...shot, clip: { x: 0, y, width: vp.width, height: Math.min(vp.height, height - y) }, path: path.join(dir, name) });
    tiles.push(name);
  }
  const axe = await new AxeBuilder({ page }).analyze();
  const aria = await page.locator('body').ariaSnapshot();
  const info = await page.evaluate(inspectPage);
  const fonts = await checkFonts(page, info);
  await ctx.close();

  const write = (name, data) => fs.writeFileSync(path.join(dir, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
  const violations = axe.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.map((n) => n.target.join(' ')) }));
  write('console.json', { console: consoleLog, pageErrors, failedRequests });
  write('axe.json', { violations, incomplete: axe.incomplete.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
  write('aria.yml', aria + '\n');
  write('layout.json', info.layout);
  write('fonts.json', fonts);
  write('metrics.json', info.metrics);

  const w = vp.width, L = info.layout;
  const findings = [
    ...consoleLog.filter((m) => m.type === 'error').map((m) => ({ check: 'console-error', gate: true, width: w, detail: m.text })),
    ...pageErrors.map((e) => ({ check: 'page-error', gate: true, width: w, detail: e.message })),
    ...failedRequests.map((r) => ({ check: 'failed-request', gate: true, width: w, detail: `${r.status ?? r.failure} ${r.url}` })),
    ...violations.map((v) => ({ check: 'axe', gate: ['serious', 'critical'].includes(v.impact), width: w, rule: v.id, impact: v.impact, detail: `${v.help} (${v.targets.length})` })),
    ...(L.scrollWidth > L.viewportWidth ? [{ check: 'overflow-x', gate: true, width: w, detail: `scrollWidth ${L.scrollWidth} > ${L.viewportWidth}` }] : []),
    ...L.edgeOverflow.map((o) => ({ check: `overflow-${o.side}`, gate: true, width: w, element: o.element, detail: `left ${o.left}, right ${o.right}` })),
    ...L.textOverflow.map((o) => ({ check: 'text-overflow', gate: false, width: w, element: o.element, detail: `${o.mode} dx ${o.dx} dy ${o.dy}` })),
    ...fonts.stacks.filter((s) => s.failing.length).map((s) => ({ check: 'font-fallback', gate: true, width: w, family: s.requested.join(', '), detail: `rendered ${Object.keys(s.rendered).join(', ')} in ${s.failing.length} element(s)` })),
  ];
  return { width: w, height: vp.height, pageHeight: height, tiles, tilesTruncated: height > vp.height * MAX_TILES, findings };
}

export async function capture(srcDir, { page = '', out = 'evidence' } = {}) {
  const t0 = Date.now();
  const root = fs.realpathSync(srcDir);
  const source = hashSource(root);
  const runDir = claimRunDir(path.resolve(out), source.sha256.slice(0, 8));
  const server = await serve(root);
  const url = `http://127.0.0.1:${server.address().port}/${page}`;
  const exe = process.env.WORKBENCH_CHROME;
  let browser;
  try {
    browser = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
    const viewports = [];
    for (const vp of VIEWPORTS) {
      const dir = path.join(runDir, String(vp.width));
      fs.mkdirSync(dir);
      viewports.push(await captureViewport(browser, url, vp, dir));
    }
    const findings = viewports.flatMap((v) => v.findings);
    const pkg = (n) => JSON.parse(fs.readFileSync(fileURLToPath(import.meta.resolve(`${n}/package.json`)))).version;
    const summary = {
      run: path.basename(runDir), created: new Date().toISOString(), pass: !findings.some((f) => f.gate),
      source: { dir: root, page: `/${page}`, ...source },
      browser: { version: browser.version(), launch: exe ? `executablePath ${exe}` : 'channel chrome' },
      tools: { node: process.version, playwright: pkg('playwright'), axe: pkg('axe-core') },
      viewports: viewports.map(({ findings, ...v }) => v), findings, durationMs: Date.now() - t0,
    };
    fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
    const manifest = sourceFiles(runDir).map((f) => `${sha256(fs.readFileSync(path.join(runDir, f)))}  ${f}\n`).join('');
    fs.writeFileSync(path.join(runDir, 'manifest.sha256'), manifest);
    return { runDir, summary };
  } catch (e) {
    fs.rmSync(runDir, { recursive: true, force: true }); // an aborted capture is not an iteration
    throw e;
  } finally {
    await browser?.close();
    server.close();
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
  const page = opt('--page'), out = opt('--out');
  if (args.length !== 1) { console.error('usage: capture <dir> [--page index.html] [--out evidence]'); process.exit(2); }
  try {
    const { runDir, summary } = await capture(args[0], { page, out });
    for (const f of summary.findings) console.log(`${f.gate ? 'FAIL' : 'note'} ${f.width} ${f.check}${f.rule ? ` ${f.rule}` : ''}${f.element ? ` ${f.element}` : ''}${f.family ? ` [${f.family}]` : ''}: ${f.detail}`);
    for (const v of summary.viewports) console.log(`tiles ${v.width}: ${v.tiles.length}${v.tilesTruncated ? ' (truncated)' : ''}, page height ${v.pageHeight}`);
    console.log(`${summary.pass ? 'PASS' : 'FAIL'} ${runDir} (${summary.durationMs}ms)`);
    process.exit(summary.pass ? 0 : 1);
  } catch (e) {
    console.error(e.stack ?? e); process.exit(2);
  }
}
