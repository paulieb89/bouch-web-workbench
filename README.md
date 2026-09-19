# Web Agent Workbench

V0 capture/calibration slice. Design input: [docs/reconnaissance.md](docs/reconnaissance.md).
Qualification record: [docs/qualification.md](docs/qualification.md).

```sh
npm ci
node capture.mjs <dir> [--page index.html] [--out evidence]   # exit 0 pass, 1 gate failed, 2 capture error
node calibrate.mjs                                            # exit 0 qualified, 1 not
```

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
element past the left or right edge), a text element for which none of the named families in
its `font-family` stack rendered.

**Reported, not gated:** moderate/minor axe violations, content overflowing its own box
(`text-overflow`: clipped or spilling), design metrics. The screenshots remain the authority for
what the page looks like; the agent must read the tiles.

**Calibration.** `calibration/defects/` plants known defects; `calibration/clean/` must produce
no findings at all. `calibration/expected.json` lists every planted defect and the finding that
must detect it (or marks it judgement-only). `calibrate` captures each fixture twice and also
requires byte-identical screenshots across the two runs. Do not fix the defects fixture.

**Machine bindings.** The browser is the system Chrome (`channel: 'chrome'`); downloaded Chrome
builds fail the AppArmor sandbox here. Override with `WORKBENCH_CHROME=/path/to/chrome`; never
use `--no-sandbox`. Pixels depend on the installed fonts; `fonts.json` records what rendered.
