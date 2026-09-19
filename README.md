# Web Agent Workbench

V0 capture/calibration slice. Design input: [docs/reconnaissance.md](docs/reconnaissance.md).
Qualification record: [docs/qualification.md](docs/qualification.md).

```sh
npm ci
node capture.mjs <dir> [--page index.html] [--out evidence]   # exit 0 pass, 1 gate failed, 2 capture error
node calibrate.mjs                                            # exit 0 qualified, 1 not
node --test tests/site.test.mjs                               # acceptance tests for site/
```

The current task is [task/brief.md](task/brief.md); its result is in
[docs/acceptance-report.md](docs/acceptance-report.md).

`capture` serves `<dir>` on a local port, loads it in the system Chrome at 375×812 and
1280×800, and writes `evidence/NNNN-<source hash>/`:

| File | Contents |
|---|---|
| `summary.json` | pass/fail, every finding, source file hashes, browser and tool versions |
| `manifest.sha256` | hashes of every evidence file (`sha256sum -c manifest.sha256`) |
| `<width>/full.png` | full-page screenshot, for layout and rhythm (as wide as the page if it overflows) |
| `<width>/tile-NN.png` | viewport-sized tiles, readable at full resolution |
| `<width>/console.json` | console messages, page errors, failed and ≥400 requests |
| `<width>/axe.json` | axe violations and incomplete checks |
| `<width>/aria.yml` | accessibility snapshot: a compact outline of the page |
| `<width>/layout.json` | page overflow, elements past either edge, content overflowing its box |
| `<width>/fonts.json` | per font stack: requested families, the fonts that actually rendered, `@font-face` status |
| `<width>/metrics.json` | design metrics — reported, never gated |

**Gates** (any one fails the run, at either width): console errors, page errors, failed or
≥400 requests, serious/critical axe violations, horizontal overflow (page scroll width or an
element past the left or right edge), a text element for which none of the named families before
its `font-family` stack's first generic (`serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`,
`system-ui`) rendered. Families after that generic are never reached, so they are not required.

**Reported, not gated:** moderate/minor axe violations, content overflowing its own box
(`text-overflow`: clipped or spilling), design metrics. The screenshots remain the authority for
what the page looks like; the agent must read the tiles.

**Calibration.** `calibration/defects/` plants known defects; `calibration/clean/` must produce
no findings at all. `calibration/expected.json` lists every planted defect and the finding that
must detect it (or marks it judgement-only). `calibrate` captures each fixture twice and also
requires byte-identical screenshots across the two runs. Do not fix the defects fixture.

**Machine bindings.** The browser defaults to the installed Google Chrome (`channel: 'chrome'`).
Any Chromium works through `WORKBENCH_CHROME=/path/to/chrome`, including Playwright's own build:
`WORKBENCH_CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())")`.
Playwright launches the browser without Chrome's sandbox (its default); captures only load the
local page being served. Pixels depend on the browser build and the installed fonts; `fonts.json`
records what rendered. `scripts/reproduce.sh [revision]` reproduces the qualification from committed source in the
pinned official Playwright container; what differs there is in
[docs/cross-environment.md](docs/cross-environment.md).
