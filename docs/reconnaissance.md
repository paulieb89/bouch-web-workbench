# Web Agent Workbench — Reconnaissance

Date: 2026-09-19
Status: observed local evidence / V0 design input
Scope: Web Agent Workbench V0

This document records the bounded reconnaissance that preceded V0.
It is evidence and design input, not the project contract and not proof that
the proposed V0 improves agent performance.

Current runtime evidence overrides this document where they conflict.
The V0 experiment must test the proposed workbench against a control.

---

**Short answer:** the useful workbench is much smaller than the brief expected. It needs two pieces:
- **One capture command:** a pinned Playwright + axe script, about 150 lines, that writes screenshots, runtime errors, accessibility results, layout checks and design metrics into a folder per run.
- **A short project contract:** a `CLAUDE.md` that requires the agent to run that command and look at the screenshots before it claims a page is done.

Nothing more on the machine was justified: no MCP, no Skill, no hooks, no framework. Whether even this beats ordinary Claude Code is the experiment's question. It has not been assumed.

## 1. What already works on this machine
- **Claude Code 2.1.277.** The Read tool displays PNG files to the model. Large images are shrunk so the long side fits about 2000px.
- **Runtimes:** Node 24.17, npm 11.13, pnpm 11.9, deno 2.9, python 3.14, uv 0.9.5. ImageMagick's `compare` and ffmpeg are available. Docker 29.3 is running. `gh` and the Vercel CLI are both logged in as `paulieb89`.
- **Browsers:**
  - System Chrome 145.0.7632.159 is the **only Chrome that starts with its sandbox on**.
  - Firefox is installed; not tested.
  - Puppeteer's cache holds Chrome 127–150 builds. Not tested directly, but they're the same kind of downloaded build that failed the sandbox.
- **Playwright:** `playwright@1.63.0` and `@axe-core/playwright@4.13.0` install in 1.7s and take 22MB when the browser download is skipped. They run against the system Chrome with `channel:'chrome'`.
- **`agent-browser` 0.31.0** is installed globally (0.38.1 is current). It works only when pointed at the system Chrome.
- **Claude in Chrome extension:** connected. It drives the user's real, visible browser with their profile. Only tab listing was exercised.
- **Cached but not enabled:** the official `playwright` plugin (runs `@playwright/mcp@latest`, an unpinned version) and `frontend-design` (a 1516-word design skill).
- **Fonts:** 577 installed. `Inter` isn't one of them. `system-ui` and `sans-serif` resolve to Noto Sans.

## 2. The five hypotheses and results

The probe used two throwaway pages: a "generic" page with defects planted on purpose, and a restrained page. Each was captured at 375px and 1280px wide.

**H1 – The agent can see its own rendered output without any new tool.**
Confirmed, with one catch:
- A Playwright screenshot opened with Read is clearly visible.
- A full-page mobile screenshot 8516px tall was shrunk 4.26×, which made the body text **unreadable**. Only the rhythm of the layout survived.
- Screenshots cut into 375×812 tiles were fully readable.
- So the capture needs both: one full-page image for layout and rhythm, and tiles for detail.

**H2 – Each observation surface catches different defects.**
What caught each planted defect:

| Planted defect | Caught by |
|---|---|
| JS exception on load, image 404 | Console / page-error / failed-request listeners only |
| Button with no accessible name, heading order skipped, no `main` landmark | axe, also visible in the accessibility snapshot |
| Low-contrast text | axe (3 cases) and the screenshot |
| Page 1100px wide on a 375px screen | Layout check and the screenshot |
| Stats clipped at the left edge, headline spilling out of the hero | **Screenshot only** (the probe's layout check only looked at the right edge) |
| `Inter` silently replaced by Noto Sans | **Nothing in the probe** |
| Invented metrics and testimonial, one accented word in the headline, 01/02/03 labels | Judgement only |

Three things duplicated each other:
- The accessibility snapshot mostly repeats axe for pass/fail purposes. Its value is as a compact outline of the page for the agent to reason about.
- A raw DOM dump just repeats the source.
- The layout check repeats the screenshot, but it's cheap and gives a fixed pass/fail answer, so it's worth keeping as a gate.

**H3 – Design quality can partly be measured without judgement.**
Only partly. The design metrics separated the two pages cleanly:

| Metric | Generic | Restrained |
|---|---|---|
| Distinct font sizes | 7 | 3 |
| Gradients | 1 | 0 |
| Card-like elements | 3 | 0 |
| Spaced-out uppercase labels | 1 | 0 |
| Centred blocks | 15 | 0 |

But two hand-made pages built to be different prove nothing. The checks were also noisy: the small-tap-target check flagged an inline link on the clean page, which WCAG exempts. So these metrics should be **reported to the agent and the judge, not used as pass/fail gates**.

**H4 – Existing browser tools already provide the loop.**
Not credibly:
- **`agent-browser`** returned empty `errors` and `console` for a page built to throw an error and a 404 on load. Its screenshots are viewport-only by default.
- **The Chrome extension** runs in the user's live profile, is visible on screen and saves nothing as evidence.
- **The Playwright MCP** is unpinned and would repeat what a script already does.

The probe script captured every surface in 2.3–4.3s per page for both widths, straight to files.

**H5 – Captures repeat, and the machine dependencies can be named.**
- On this machine, two runs gave identical screenshots: a pixel diff counted 0 differing pixels for all four captures.
- Two dependencies are tied to this machine: the Chrome executable (because of the AppArmor sandbox restriction) and the installed fonts.
- Docker was not tested: the Playwright image isn't present and roughly 2GB was not pulled. So whether screenshots match across machines is **unknown**.

## 3. Reuse rather than rebuild
- Playwright (`channel:'chrome'`, listeners attached before navigation, `ariaSnapshot`, `clip` for tiles).
- `@axe-core/playwright`.
- The Read tool as the agent's eyes.
- ImageMagick `compare` for repeat-run checks.
- `python3 -m http.server` or Node's built-in `http` for serving pages.
- From `bouch-agent-core`: the candidate/evidence pattern and the `evidence-freeze` skill with git tags.
- The `frontend-design` skill as existing design guidance. It's a variable in its own right, though, so it stays off in both arms of the first run.

## 4. Real gaps
1. **Ordinary Claude Code web work never renders and looks at its own output by default.** The `frontend-design` skill only says to take screenshots "if your environment supports it".
2. **Full-page screenshots of tall pages mislead the agent** unless they're also cut into tiles.
3. **The measuring tools can return false "all clear" results.** `agent-browser` did exactly that. The capture needs a calibration page with known defects that it must detect every time.
4. **Two defects nothing caught:** clipping at the left edge and silent font fallback. Both can be checked deterministically:
   - left edge: element bounds less than 0;
   - fonts: `document.fonts` against the families the page asks for.
5. **Browser sandbox binding:** downloaded Chrome builds fail to start on this machine.

## 5. Proposed V0
- **Contract:** a `CLAUDE.md` of about 30 lines. It says:
  - run the capture after each meaningful change;
  - read the tiles at both widths and write a short critique before claiming the page is done;
  - the evidence files, not tool success messages, are the authority;
  - use the system Chrome;
  - use only content from the brief — no invented metrics, customers or quotes;
  - a human is the final judge of design quality.
- **Execution:** static HTML/CSS/JS served locally. No framework choice.
- **Observation:** `capture <dir>` writes `evidence/<run>/` containing, at 375 and 1280 wide:
  - a full-page screenshot and viewport tiles;
  - console output, page errors and failed requests;
  - axe violations;
  - the accessibility snapshot;
  - layout checks (overflow on both edges, clipped text);
  - which fonts actually loaded;
  - the design metrics;
  - a `summary.json` with the source hash.
- **Pass/fail gates:** a run fails if any of these hold:
  - console errors, page errors or failed requests;
  - serious or critical axe violations;
  - horizontal overflow at 375px;
  - a requested font that didn't load.
- **Perceptual check:** the agent's written critique of the tiles, then a blind human comparison.
- **Evidence:** one folder per iteration, with sha256 hashes. That makes correction loops countable.

## 6. Left out of V0, and why
- **Lighthouse:** performance barely matters for a small static page, it's slow, and axe already covers accessibility.
- **Visual-regression baselines:** a new build has no baseline yet; they belong in a later repair task.
- **Playwright MCP, `chrome-devtools-mcp`, `agent-browser`, the Chrome extension:** they repeat the script, or failed the known-defect test, or use the user's live profile.
- **An LLM judge as the authority, and a design checklist or banned-pattern list:** the brief asked for inspection of the real result, not another checklist.
- **Hooks:** nothing in V0 is irreversible, so there's nothing to gate.
- **Skills:** no need shown yet.
- **Docker for development:** it would only add neatness.
- **Performance traces, a tablet viewport, raw DOM dumps:** they add little or repeat other surfaces.

## 7. First control-vs-candidate experiment
- **Task:** a one-page site for a fictional small organisation, built from a supplied content brief. The brief includes:
  - real text, prices and opening hours;
  - one interaction (an "open now" indicator plus a filterable list);
  - a form with validation;
  - no metrics or testimonials, so any the agent invents are countable;
  - no network assets (system fonts or supplied OFL font files).
- **Arms:** same model, same brief, same budget, fresh folders, headless `claude -p`, 5 runs per arm.
  - **Control:** the normal environment. It may still install Playwright on its own.
  - **Candidate:** control plus the contract and the capture command.
- **Measures:**
  - a hidden acceptance suite written by the experimenter and run identically on both arms (interactions, gates, captures);
  - count of remaining defects;
  - count of invented content items;
  - defects found and fixed before finishing;
  - turns, tokens and wall time;
  - blind pairwise human preference over the tiles, with labels randomised.
- **Acceptance criteria:** fix these before the first run. Proposed: the candidate lowers remaining defects **or** wins at least 60% of blind preferences, does no worse on the other, and costs at most 1.5× the control's time and tokens. A null result is a valid outcome.

## 8. Dependency classification
| Class | Items |
|---|---|
| **REMOTE PORTABLE** | Contract, capture script, pinned `package-lock.json` (playwright 1.63.0, axe 4.13.0), calibration page with known defects and expected detections, task brief, hidden acceptance suite, OFL fonts |
| **LOCALLY DERIVABLE** | `node_modules` (`npm ci`), Chrome version (`browser.version()`), font inventory, evidence folders, design metrics |
| **MACHINE BINDING** | The Chrome executable (`/opt/google/chrome/chrome`, because of `apparmor_restrict_unprivileged_userns=1`); the installed font set, which affects pixels |
| **SECRET / AUTH** | None for V0. `gh` and Vercel only matter if publishing or deploying |
| **EPHEMERAL** | Server ports, browser sessions, scratch captures |

**Implication:** a full bindings system is not justified yet. One overridable environment variable for the browser path, plus a font check, covers what's here. Whether a container removes both is a question for qualification.

## 9. Frozen reference release
A git tag containing:
- the contract, capture script and lockfile;
- the calibration page and its expected detections;
- the task brief and hidden acceptance suite;
- a Dockerfile `FROM mcr.microsoft.com/playwright:v1.63.0-noble`;
- evidence manifests and human ratings from the experiment.

It qualifies when a clean consumer clones it, runs the calibration in the container, and gets the same detections. Screenshot differences between this machine and the container get measured and recorded, not assumed equal.

## 10. Narrowest next action
Build `capture` plus the calibration page, then qualify it. Every planted defect must be detected, including the two the probe missed (left-edge clipping and font fallback), and the restrained page must come out clean. The task brief comes after that.

## Evidence for whoever writes the build prompt
- Reproduce the probe with:
  ```
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.63.0 @axe-core/playwright@4.13.0
  ```
  Launch with `chromium.launch({channel:'chrome'})`, a context with `deviceScaleFactor:1` and `reducedMotion:'reduce'`, and attach listeners before `goto`.
- The exploratory probe (`probe.mjs`, `tall.mjs` and the fixture pages) was left in the recon session's scratchpad
  (`/tmp/claude-1000/-home-bch-experiments-webdev/1f4f9cc5-3a0f-4f29-a6a0-f14063b53e59/scratchpad/probe/`).
  It may no longer exist. It can be inspected for implementation detail but is not canonical code; build the real calibration fixture from the findings above.
- **Chrome sandbox failure text:** `FATAL … No usable sandbox!`. The fix is to use the system Chrome, never `--no-sandbox`.
- **`agent-browser` workaround:** set `AGENT_BROWSER_EXECUTABLE_PATH=/opt/google/chrome/chrome`.
- The Bouch contract shapes to copy are `audio-agent-workbench-v2/CLAUDE.md`, `asset-workbench/CLAUDE.md` and `bouch-agent-core/references/candidate-evidence-pattern.md`. No Bouch repository was modified during recon.
