// Acceptance tests for task/brief.md, run against site/ in the system Chrome.
// Written from the brief and task/acceptance.md before the site existed; they locate
// elements by the labels, roles and text the brief specifies, not by implementation.
// Usage: node --test tests/site.test.mjs   (WORKBENCH_CHROME overrides the browser path)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, '..', 'site');
const BRIEF = fs.readFileSync(path.resolve(here, '..', 'task', 'brief.md'), 'utf8');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json' };

const TOOLS = [...BRIEF.matchAll(/^\| (.+?) \| (Garden|Woodwork|Decorating|Cleaning|Events) \| (£\d+|none) \|$/gm)]
  .map(([, name, category, deposit]) => ({ name, category, deposit }));
const CATEGORIES = ['Garden', 'Woodwork', 'Decorating', 'Cleaning', 'Events'];

let server, base, browser;
before(async () => {
  assert.equal(TOOLS.length, 20, 'brief parse');
  server = http.createServer((req, res) => {
    let file = path.join(SITE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(SITE) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}/`;
  const exe = process.env.WORKBENCH_CHROME;
  browser = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
});
after(async () => { await browser?.close(); server?.close(); });

async function open({ time, timezoneId = 'Europe/London', width = 1280, js = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1,
    reducedMotion: 'reduce', timezoneId, javaScriptEnabled: js });
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  if (time) await page.clock.setFixedTime(new Date(time));
  await page.goto(base, { waitUntil: 'load' });
  return { page, ctx, requests };
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const STATUS_RE = /^(Open now until \d\d:\d\d|Closed now\. Opens (today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) at \d\d:\d\d)$/;

// The innermost visible elements whose whole text is an open-now message.
async function openNow(page) {
  await page.waitForFunction((src) => {
    const re = new RegExp(src);
    return [...document.querySelectorAll('body *')].some((e) => re.test(e.innerText?.replace(/\s+/g, ' ').trim() ?? ''));
  }, STATUS_RE.source, { timeout: 5000 });
  return page.evaluate((src) => {
    const re = new RegExp(src);
    const hits = [...document.querySelectorAll('body *')].filter((e) => e.checkVisibility() && re.test(e.innerText.replace(/\s+/g, ' ').trim()));
    return [...new Set(hits.filter((e) => !hits.some((o) => o !== e && e.contains(o))).map((e) => e.innerText.replace(/\s+/g, ' ').trim()))];
  }, STATUS_RE.source);
}

// UTC instants; the week of 21 Sep 2026 is BST (UTC+1), 3 Nov 2026 is GMT.
const OPEN_NOW = [
  ['2026-09-21T08:00:00Z', 'Europe/London', 'Closed now. Opens tomorrow at 17:30'],     // Mon 09:00
  ['2026-09-22T11:00:00Z', 'Europe/London', 'Closed now. Opens today at 17:30'],        // Tue 12:00
  ['2026-09-22T16:29:59Z', 'Europe/London', 'Closed now. Opens today at 17:30'],        // Tue 17:29:59
  ['2026-09-22T16:30:00Z', 'Europe/London', 'Open now until 19:30'],                    // Tue 17:30 opening, inclusive
  ['2026-09-22T18:29:59Z', 'Europe/London', 'Open now until 19:30'],                    // Tue 19:29:59
  ['2026-09-22T18:30:00Z', 'Europe/London', 'Closed now. Opens Thursday at 17:30'],     // Tue 19:30 closing, exclusive
  ['2026-09-23T22:59:00Z', 'Europe/London', 'Closed now. Opens tomorrow at 17:30'],     // Wed 23:59
  ['2026-09-25T19:00:00Z', 'Europe/London', 'Closed now. Opens tomorrow at 10:00'],     // Fri 20:00
  ['2026-09-26T08:59:00Z', 'Europe/London', 'Closed now. Opens today at 10:00'],        // Sat 09:59
  ['2026-09-26T09:00:00Z', 'Europe/London', 'Open now until 13:00'],                    // Sat 10:00
  ['2026-09-26T12:00:00Z', 'Europe/London', 'Closed now. Opens Tuesday at 17:30'],      // Sat 13:00
  ['2026-09-27T11:00:00Z', 'Europe/London', 'Closed now. Opens Tuesday at 17:30'],      // Sun 12:00
  ['2026-11-03T17:29:59Z', 'Europe/London', 'Closed now. Opens today at 17:30'],        // Tue 17:29:59 GMT
  ['2026-11-03T17:30:00Z', 'Europe/London', 'Open now until 19:30'],                    // Tue 17:30 GMT
  ['2026-09-22T16:45:00Z', 'America/New_York', 'Open now until 19:30'],                 // UK Tue 17:45, visitor 12:45
  ['2026-09-21T23:30:00Z', 'Asia/Tokyo', 'Closed now. Opens today at 17:30'],           // UK Tue 00:30, visitor Tue 08:30
  ['2026-09-26T22:30:00Z', 'Asia/Tokyo', 'Closed now. Opens Tuesday at 17:30'],         // UK Sat 23:30, visitor Sun 07:30
  ['2026-09-22T22:30:00Z', 'Pacific/Honolulu', 'Closed now. Opens Thursday at 17:30'],  // UK Tue 23:30, visitor Tue 12:30
];

test('F1 open-now text for every case', async () => {
  const failures = [];
  for (const [time, tz, want] of OPEN_NOW) {
    const { page, ctx } = await open({ time, timezoneId: tz });
    const got = await openNow(page).catch((e) => [`(none: ${e.message.split('\n')[0]})`]);
    if (got.length !== 1 || got[0] !== want) failures.push(`${time} ${tz}: want "${want}", got ${JSON.stringify(got)}`);
    await ctx.close();
  }
  assert.deepEqual(failures, []);
});

test('F2 today is marked in text in the hours table', async () => {
  for (const [time, day] of [['2026-09-22T11:00:00Z', 'Tuesday'], ['2026-09-27T11:00:00Z', 'Sunday']]) {
    const { page, ctx } = await open({ time });
    await openNow(page);
    const rows = await page.locator('table tr').allInnerTexts();
    const dayRows = rows.filter((r) => /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/.test(r));
    assert.equal(dayRows.length, 7, `hours table rows: ${JSON.stringify(rows)}`);
    const marked = dayRows.filter((r) => /today/i.test(r));
    assert.equal(marked.length, 1, `rows marked today: ${JSON.stringify(marked)}`);
    assert.match(marked[0], new RegExp(day));
    await ctx.close();
  }
});

async function visibleTools(page) {
  const out = [];
  for (const t of TOOLS) if (await page.getByText(t.name, { exact: true }).first().isVisible()) out.push(t.name);
  return out;
}
const statusLine = (page) => page.getByText(/^Showing \d+ of 20 tools$/);

test('F3 search, category, combination, status line and empty state', async () => {
  const { page, ctx } = await open();
  assert.equal((await visibleTools(page)).length, 20);
  await assert.doesNotReject(statusLine(page).waitFor({ timeout: 2000 }), 'status line');
  assert.equal(norm(await statusLine(page).innerText()), 'Showing 20 of 20 tools');
  const live = await statusLine(page).evaluate((e) => !!e.closest('[aria-live="polite"],[role="status"]'));
  assert.ok(live, 'status line is in a polite live region');

  const group = page.getByRole('group', { name: 'Category' });
  const buttons = ['All', ...CATEGORIES];
  const pressed = async () => Promise.all(buttons.map((b) => group.getByRole('button', { name: b, exact: true }).getAttribute('aria-pressed')));
  assert.deepEqual(await pressed(), ['true', 'false', 'false', 'false', 'false', 'false']);

  const search = page.getByLabel('Search tools');
  for (const q of ['saw', 'SAW', 'et', ' drill', 'set of']) {
    await search.fill(q);
    const want = TOOLS.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())).map((t) => t.name);
    assert.deepEqual(await visibleTools(page), want, `search "${q}"`);
    if (want.length) assert.equal(norm(await statusLine(page).innerText()), `Showing ${want.length} of 20 tools`);
  }
  await search.fill('');
  for (const c of CATEGORIES) {
    await group.getByRole('button', { name: c, exact: true }).click();
    const want = TOOLS.filter((t) => t.category === c).map((t) => t.name);
    assert.deepEqual(await visibleTools(page), want, `category ${c}`);
    assert.equal(norm(await statusLine(page).innerText()), `Showing ${want.length} of 20 tools`);
    assert.deepEqual(await pressed(), buttons.map((b) => String(b === c)));
  }
  await group.getByRole('button', { name: 'Garden', exact: true }).click();
  await search.fill('hedge');
  assert.deepEqual(await visibleTools(page), ['Hedge trimmer']);

  await group.getByRole('button', { name: 'Woodwork', exact: true }).click();
  await search.fill('tea');
  assert.deepEqual(await visibleTools(page), []);
  assert.ok(await page.getByText('No tools match. Try another category or clear the search.', { exact: true }).isVisible(), 'empty message');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  assert.equal(await search.inputValue(), '');
  assert.deepEqual(await pressed(), ['true', 'false', 'false', 'false', 'false', 'false']);
  assert.equal((await visibleTools(page)).length, 20);
  assert.equal(norm(await statusLine(page).innerText()), 'Showing 20 of 20 tools');
  assert.ok(!(await page.getByText('No tools match. Try another category or clear the search.', { exact: true }).isVisible()));
  await ctx.close();
});

test('F4 without JavaScript the hours and all tools are present', async () => {
  const { page, ctx } = await open({ js: false });
  const rows = (await page.locator('table tr').allInnerTexts()).filter((r) => /day/.test(r));
  assert.equal(rows.length, 7, JSON.stringify(rows));
  assert.equal((await visibleTools(page)).length, 20);
  await ctx.close();
});

const MESSAGES = {
  name: 'Enter your full name', emailEmpty: 'Enter your email address',
  emailBad: 'Enter an email address in the format name@example.com', postcodeEmpty: 'Enter your postcode',
  postcodeBad: 'Enter a UK postcode, like AB1 2CD', type: 'Choose a membership type',
  long: 'Use 500 characters or fewer', rules: 'Confirm you have read the borrowing rules',
};
function form(page) {
  return {
    name: page.getByLabel('Full name', { exact: true }), email: page.getByLabel('Email address', { exact: true }),
    postcode: page.getByLabel('Postcode', { exact: true }), interest: page.getByLabel(/Tools you are interested in/),
    rules: page.getByLabel(/I have read the borrowing rules/), submit: page.getByRole('button', { name: 'Send application' }),
    radio: (t) => page.getByRole('radio', { name: new RegExp(t) }),
  };
}
const shown = (page, text) => page.getByText(text, { exact: true }).isVisible();
async function describedBy(locator, text) {
  return locator.evaluate((e, t) => {
    const ids = (e.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    return ids.some((id) => document.getElementById(id)?.textContent.replace(/\s+/g, ' ').includes(t));
  }, text);
}

test('F5 form validation, association, focus and live updates', async () => {
  const { page, ctx } = await open();
  const f = form(page);
  assert.ok(!(await shown(page, MESSAGES.name)), 'no message before first submit');
  await f.submit.click();
  for (const k of ['name', 'emailEmpty', 'postcodeEmpty', 'type', 'rules']) assert.ok(await shown(page, MESSAGES[k]), `shows "${MESSAGES[k]}"`);
  for (const [field, msg] of [[f.name, MESSAGES.name], [f.email, MESSAGES.emailEmpty], [f.postcode, MESSAGES.postcodeEmpty], [f.rules, MESSAGES.rules]]) {
    assert.equal(await field.getAttribute('aria-invalid'), 'true', `aria-invalid for "${msg}"`);
    assert.ok(await describedBy(field, msg), `aria-describedby for "${msg}"`);
  }
  const radioGroupOk = await page.getByRole('radio', { name: /Individual/ }).evaluate((r, msg) => {
    const holders = [r, r.closest('fieldset'), r.closest('[role=radiogroup]')].filter(Boolean);
    const describes = (e) => (e.getAttribute('aria-describedby') ?? '').split(/\s+/).some((id) => id && document.getElementById(id)?.textContent.includes(msg));
    return { invalid: holders.some((e) => e.getAttribute('aria-invalid') === 'true'), described: holders.some(describes) };
  }, MESSAGES.type);
  assert.deepEqual(radioGroupOk, { invalid: true, described: true }, 'membership type invalid + described');
  assert.ok(await f.name.evaluate((e) => e === document.activeElement), 'focus on first invalid field');

  // After the first attempt, messages track changes.
  await f.name.fill('Jo Bloggs');
  assert.ok(!(await shown(page, MESSAGES.name)));
  assert.notEqual(await f.name.getAttribute('aria-invalid'), 'true');
  await f.email.fill('jo');
  assert.ok(await shown(page, MESSAGES.emailBad), 'malformed email');
  await f.email.fill('jo@example.com');
  assert.ok(!(await shown(page, MESSAGES.emailBad)) && !(await shown(page, MESSAGES.emailEmpty)));

  for (const v of ['AB1 2CD', 'ab12cd', ' SW1A 1AA ', 'M1 1AE', 'B33 8TH', 'CR2 6XH', 'DN55 1PT', 'EC1A 1BB']) {
    await f.postcode.fill(v);
    assert.ok(!(await shown(page, MESSAGES.postcodeBad)) && !(await shown(page, MESSAGES.postcodeEmpty)), `valid postcode "${v}"`);
  }
  for (const v of ['ABC 123', '12345', 'SW1A 1A', 'A1 1AAA', 'AB1 2C']) {
    await f.postcode.fill(v);
    assert.ok(await shown(page, MESSAGES.postcodeBad), `invalid postcode "${v}"`);
  }
  await f.postcode.fill('AB1 2CD');

  await f.interest.fill('x'.repeat(501));
  const len = (await f.interest.inputValue()).length;
  assert.ok(len <= 500 || (await shown(page, MESSAGES.long)), `501 characters: length ${len}, message shown?`);
  await f.interest.fill('A ladder, please');
  assert.ok(!(await shown(page, MESSAGES.long)));

  await f.radio('Household').check();
  assert.ok(!(await shown(page, MESSAGES.type)));
  await f.rules.check();
  assert.ok(!(await shown(page, MESSAGES.rules)));

  const before = [];
  page.on('request', (r) => before.push(r.url()));
  await f.submit.click();
  const done = 'Thank you, Jo Bloggs. This is a demonstration, so nothing has been sent. At your first session, bring photo ID and the £25 Household membership fee.';
  await page.getByText(done).waitFor({ timeout: 2000 });
  assert.deepEqual(before, [], 'no request on valid submit');
  assert.ok(await page.getByText(done).evaluate((e) => e.contains(document.activeElement) || document.activeElement.contains(e)), 'focus on confirmation');
  assert.ok(!(await f.submit.isVisible()), 'form replaced');
  await ctx.close();
});

test('F5 confirmation names the chosen price and type', async () => {
  const { page, ctx } = await open();
  const f = form(page);
  await f.name.fill('Sam Lee'); await f.email.fill('sam@example.com'); await f.postcode.fill('ab12cd');
  await f.radio('Concession').check(); await f.rules.check();
  await f.submit.click();
  await page.getByText('Thank you, Sam Lee. This is a demonstration, so nothing has been sent. At your first session, bring photo ID and the £5 Concession membership fee.').waitFor({ timeout: 2000 });
  await ctx.close();
});

// POST-ACCEPTANCE FINDING, not part of the original 12-test held-out result.
// Added after the first verification run found that, without JavaScript, submitting sent the
// applicant's details in the URL. The brief's "a valid submit must not make any network request"
// has no JavaScript exemption. Submission is attempted both ways a user can (button, Enter in a
// field) without waiting for the button to be enabled: a disabled button is a valid fix.
test('F6 without JavaScript a filled-in form sends no request and claims no success', async () => {
  const { page, ctx, requests } = await open({ js: false });
  const f = form(page);
  if (await f.submit.isVisible()) {
    for (const [field, v] of [[f.name, 'Jo Bloggs'], [f.email, 'jo@example.com'], [f.postcode, 'AB1 2CD']]) if (await field.isVisible()) await field.fill(v);
    if (await f.radio('Household').isVisible()) await f.radio('Household').check();
    if (await f.rules.isVisible()) await f.rules.check();
    const n = requests.length, url = page.url();
    await f.submit.click({ force: true });
    await page.waitForTimeout(500);
    if (page.url() === url && await f.postcode.isVisible()) { await f.postcode.press('Enter'); await page.waitForTimeout(500); }
    assert.deepEqual(requests.slice(n), [], 'requests after submit');
    assert.equal(page.url(), url);
    assert.ok(!(await page.getByText(/Thank you|nothing has been sent/).isVisible()), 'no confirmation shown');
  }
  await ctx.close();
});

test('T1 language, title and a single h1', async () => {
  const { page, ctx } = await open();
  assert.equal(await page.getAttribute('html', 'lang'), 'en-GB');
  assert.equal(await page.title(), 'Ashcombe Tool Library');
  assert.equal(await page.locator('h1').count(), 1);
  await ctx.close();
});

test('T2 no horizontal scrolling at 320, 768 and 1440', async () => {
  for (const width of [320, 768, 1440]) {
    const { page, ctx } = await open({ width });
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    assert.ok(sw <= cw, `${width}: scrollWidth ${sw} > ${cw}`);
    await ctx.close();
  }
});

test('T3 and T5: same-origin requests only; no running animation with reduced motion', async () => {
  const { page, ctx, requests } = await open();
  await page.getByRole('group', { name: 'Category' }).getByRole('button', { name: 'Garden', exact: true }).click();
  await page.getByLabel('Search tools').fill('ham');
  await page.getByRole('button', { name: 'Send application' }).click();
  const foreign = requests.filter((u) => !u.startsWith(base) && !/^(data|blob):/.test(u));
  assert.deepEqual(foreign, []);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  assert.equal(running, 0);
  await ctx.close();
});

test('T4 keyboard reaches every control with a visible focus indicator', async () => {
  const { page, ctx } = await open();
  const seen = [];
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const s = getComputedStyle(e);
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      return { name: e.labels?.[0]?.textContent.replace(/\s+/g, ' ').trim() || e.getAttribute('aria-label') || e.textContent.replace(/\s+/g, ' ').trim(),
        tag: e.tagName, type: e.type, indicator: outline || s.boxShadow !== 'none' };
    });
    if (d) seen.push(d);
  }
  const reached = (pred, what) => assert.ok(seen.some(pred), `Tab reaches ${what}`);
  reached((d) => /Search tools/.test(d.name), 'search');
  for (const b of ['All', ...CATEGORIES]) reached((d) => d.tag === 'BUTTON' && d.name === b, `category ${b}`);
  for (const l of ['Full name', 'Email address', 'Postcode', 'Tools you are interested in', 'I have read the borrowing rules']) reached((d) => d.name.startsWith(l), l);
  reached((d) => d.type === 'radio', 'a membership radio');
  reached((d) => d.tag === 'BUTTON' && d.name === 'Send application', 'submit');
  const missing = [...new Set(seen.filter((d) => !d.indicator).map((d) => `${d.tag} ${d.name.slice(0, 40)}`))];
  assert.deepEqual(missing, [], 'focused elements without a visible indicator');
  await ctx.close();
});

test('C1 every fact in the brief is on the page', async () => {
  const { page, ctx } = await open({ time: '2026-09-22T11:00:00Z' });
  const text = norm(await page.locator('body').innerText());
  const has = (s) => text.toLowerCase().includes(s.toLowerCase());
  const missing = [
    'Ashcombe Tool Library', 'The Old Forge', 'Mill Lane', 'hello@ashcombetools.example', 'volunteers',
    'Join online or at any session', 'Reserve a tool by email', 'up to one week', 'renew once',
    'Return tools clean and on time', 'damage or fault', 'never charge for normal wear', 'refundable deposit', '18 or over',
    'Individual', '£15', 'Household', '£25', 'up to four adults at one address', 'Concession', '£5',
    'means-tested benefits', 'full-time students', 'Saturday mornings', 'small repairs',
  ].filter((s) => !has(s));
  assert.deepEqual(missing, [], 'missing brief content');
  const rows = await page.locator('table tr').allInnerTexts();
  const hours = { Monday: null, Tuesday: ['17:30', '19:30'], Wednesday: null, Thursday: ['17:30', '19:30'], Friday: null, Saturday: ['10:00', '13:00'], Sunday: null };
  for (const [day, h] of Object.entries(hours)) {
    const row = rows.find((r) => r.includes(day));
    assert.ok(row, `hours row ${day}`);
    if (h) assert.ok(h.every((t) => row.includes(t)), `${day}: ${row}`);
    else assert.match(row, /closed/i, `${day}: ${row}`);
  }
  const itemFailures = [];
  for (const t of TOOLS) {
    const item = await page.getByText(t.name, { exact: true }).first().evaluate((e) => {
      for (let p = e; p; p = p.parentElement) if (/^(LI|TR|ARTICLE)$/.test(p.tagName)) return p.innerText;
      return e.parentElement.innerText;
    });
    const deposit = t.deposit === 'none' ? /none|no deposit/i : new RegExp(t.deposit);
    if (!item.includes(t.category) || !deposit.test(item)) itemFailures.push(`${t.name}: ${norm(item)}`);
  }
  assert.deepEqual(itemFailures, [], 'tool items with category and deposit');
  await ctx.close();
});

test('C2 every number in the page text appears in the brief', async () => {
  const { page, ctx } = await open({ time: '2026-09-22T11:00:00Z' });
  const allowed = new Set(BRIEF.match(/\d+/g));
  const text = await page.locator('body').innerText();
  const unknown = [...new Set(text.match(/\d+/g) ?? [])].filter((n) => !allowed.has(n));
  assert.deepEqual(unknown, [], 'numbers not authorised by the brief');
  await ctx.close();
});
