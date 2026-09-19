# Web Workbench V0 — cross-environment qualification

Date: 2026-09-19
Status: observed evidence from two environments.
Scope: whether the workbench (instrument, calibration, site, acceptance tests) reproduces outside
the development machine. The tag `v0-capture-qualified` and its evidence are unchanged.

## Isolation boundary

- **Image:** `mcr.microsoft.com/playwright:v1.63.0-noble`, pinned by digest
  `sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`. It matches the
  lockfile's playwright 1.63.0.
- **Input:** tracked files only (`git archive` or `git ls-files`), piped in on stdin. No host
  `.git`, `node_modules`, `evidence/`, Chrome, fonts or Claude configuration crossed. There were
  no bind mounts except an output folder, used to copy evidence out.
- **Network:** `npm ci` ran in one container with network access. Everything else ran in a second
  container with `--network=none`.

| | Development machine | Container |
|---|---|---|
| OS | Ubuntu 24.04.4, kernel 7.0.0-31 | Ubuntu 24.04.4 (root) |
| Node / npm | 24.17.0 / 11.13.0 | 24.20.0 / 11.19.0 |
| Browser | Google Chrome 145.0.7632.159 (`channel: 'chrome'`) | Playwright Chromium 153.0.8010.12 (`/ms-playwright/chromium-1243`) |
| playwright / axe-core | 1.63.0 / 4.13.0 | 1.63.0 / 4.13.0 (`npm ci`) |
| Fonts | 577, including Noto Sans/Serif and DejaVu | about 20 families. No Noto Sans/Serif or DejaVu; `system-ui` and `sans-serif` resolve to WenQuanYi Zen Hei. |

## Reproduction

`scripts/reproduce.sh [revision]` runs this procedure for any committed revision (default `HEAD`)
and prints `REPRODUCED` on success. Only `git archive` output enters the container, so uncommitted
or ignored files cannot affect the result. It needs only git and Docker on the host.

## Results

**Unchanged workbench (`c19cab7`) in the container:**

| Step | Result | Classification |
|---|---|---|
| Documented defaults (no `WORKBENCH_CHROME`) | capture exits 2: the `chrome` channel is not installed | Expected binding; the documented override applies. |
| `node calibrate.mjs` | NOT QUALIFIED. Every planted defect is detected and repeat screenshots are identical, but the clean page is flagged for font fallback: `Georgia, "DejaVu Serif"` rendered as Liberation Serif. | **Calibration-fixture defect.** The clean page relied on DejaVu Serif being installed. The instrument reported a real fallback. |
| `node --test tests/site.test.mjs` | 13/13 | Functional behaviour is portable. |
| `node capture.mjs site` | FAIL on two font-fallback findings | See the next two rows. |
| Heading stack (`Charter, …, "Noto Serif", "DejaVu Serif", serif`) | rendered as Liberation Serif | **Site portability defect.** None of the site's named heading fonts exist here. |
| Body stack (`system-ui, …, "Noto Sans", …, sans-serif`) | `system-ui` rendered as WenQuanYi Zen Hei, and was flagged | **Instrument defect (false positive).** The page asks for the generic `system-ui` first, and it resolved; the families after it are never reached. The development machine hid this because its `system-ui` happens to be Noto Sans, which is also named in the stack. |

**Corrections.** Each was demonstrated before being fixed:

1. **Instrument, `capture.mjs` font check.** Only named families before the stack's first generic
   that Chrome always resolves (`serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`,
   `system-ui`) are required. Platform aliases such as `-apple-system` and the `ui-*` families
   still fall through.
2. **Calibration clean page.**
   - Headings: `Georgia, "Workbench Fixture Sans", serif` now uses the page's shipped web font
     instead of the installed DejaVu Serif.
   - A footer regression element was added: `system-ui, "Workbench Absent Family", sans-serif`.
     The tagged instrument flags it on the development machine too.
3. **Site.** A Noto Serif Bold Latin subset (OFL-1.1, licence beside it in `site/fonts/`) is
   shipped as `"Ashcombe Serif"`, placed last before `serif`. On the development machine it is
   never downloaded (status `unloaded`), and the screenshots are byte-identical to the unmodified
   site captured at the same moment. In the container the headings render in it.

**Regression coverage.** Calibration run on the development machine:

| Instrument variant | Result |
|---|---|
| Tagged font rule | NOT QUALIFIED (clean footer flagged) |
| Corrected rule | QUALIFIED |
| Font check disabled | NOT QUALIFIED |
| Old rule re-seeded (no terminal generics) | NOT QUALIFIED |
| Over-permissive rule (any generic exempts the stack) | NOT QUALIFIED (`Inter` missed) |

**Corrected workbench**, source hash `22390bfa` on both machines:

| | Development machine, Chrome 145 | Development machine, Chromium 153 (copied from the image) | Container, Chromium 153, offline |
|---|---|---|---|
| Calibration | QUALIFIED | QUALIFIED | QUALIFIED |
| Acceptance tests | 13/13 | — | 13/13 |
| Site capture | PASS, 0 findings | — | PASS, 0 findings |

## Observed differences

These are rendering differences, not defects, and pixel identity across environments was not
expected:

- **Body text in the container** renders in WenQuanYi Zen Hei, which has no bold, so bold labels,
  tool names and buttons lose their weight hierarchy. This is what the page's `system-ui` stack
  asks for on that system. If the reviewed look must hold everywhere, the site should ship a body
  font too. That is a design decision, not a qualification failure.
- **Page height** differs slightly (375 wide: 4650px in the container, 4829px here, at the same
  open-now state) because the fonts differ.
- **The capture has no clock control.** The open-now line follows real time, so screenshots
  compare only between runs in the same open/closed state. Screenshots taken on the development
  machine at 06:00 and at 13:30 differed for this reason alone.
- **Run numbering:** as recorded in the acceptance report, run numbers count every entry in the
  output folder.

## Machine bindings

- **Browser:** any Chromium executable. The default is `channel: 'chrome'`, which needs Google
  Chrome installed. Elsewhere, set `WORKBENCH_CHROME` to Playwright's own build (the command is in
  the README). Playwright's Chromium 153 also qualifies on the development machine.
- **Sandbox:** the reconnaissance recorded that downloaded Chrome builds fail the sandbox here,
  and the docs said never to use `--no-sandbox`. Observation: Playwright launches Chrome with
  `--no-sandbox` by default (`chromiumSandbox: false`). So the qualified instrument has always run
  unsandboxed on the development machine. The positive control: with `chromiumSandbox: true` the
  flag is absent. The container uses the same default; that is inferred, not separately observed. The docs are corrected. Pages captured are only the locally served task pages.
- **Fonts:** screenshots depend on the installed fonts. Neither the site's gates nor either
  calibration page need any particular font to be installed or absent. The defects page first
  planted its silent-fallback defect by asking for `Inter`, so it was detected only where Inter
  was not installed. With Inter installed in the container, calibration reported NOT QUALIFIED. The
  page now asks for a family no machine has, and calibration is QUALIFIED with Inter installed.
- **Not required:** host paths, Claude configuration, or network access after `npm ci`.

## Readiness for a frozen remote reference release

**Technically ready.** From tracked files alone, the pinned container reproduces the calibration,
the acceptance suite and the capture gates, with the same verdicts as the development machine,
across two browser builds and two font sets. No portability blocker remains.

**Decisions to make before tagging a release:**

- Whether the container's body-text rendering is acceptable, or the site should ship a body font.
- Whether the reference procedure is the commands above or a Dockerfile, as the recon proposed.
  The `WORKBENCH_CHROME` export makes a Dockerfile unnecessary for reproduction.
- Where the release is published. Publishing, a remote and the Bouch Registry are not part of this slice.
