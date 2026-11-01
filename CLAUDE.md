# Web Agent Workbench

A local workbench for building web pages and verifying them in a real browser.
The current task is [task/brief.md](task/brief.md). Its acceptance criteria are in
[task/acceptance.md](task/acceptance.md). The site goes in `site/`.

The brief is fixed. Build only from its content: do not invent facts, figures, testimonials,
customers or claims. If the brief is ambiguous or seems wrong, record the question and your
assumption; do not edit the brief to fit the build.

## Seeing the result

A page is not done because the code looks right or a tool returned success. The rendered
browser output is the authority.

- `node capture.mjs site` loads the page in the system Chrome at 375 and 1280 wide. It writes
  `evidence/NNNN-<source hash>/` and exits non-zero if a gate fails. The [README](README.md)
  describes the files and gates.
- Capture after each meaningful change. Read `summary.json`, then open the tiles
  (`<width>/tile-NN.png`) at both widths with Read. Use `full.png` for overall layout only:
  tall pages are downscaled and their text is unreadable.
- The capture shows the page at rest, plus any interaction states declared in `states.json`
  (see the README); those are captured and gated the same way, and their screenshots
  (`<width>/states/<name>.png`) must be read like the tiles. Anything a declared state cannot
  express — other viewports, multi-page flows, timing — still needs its own check in the real
  browser; the pinned `playwright` package is installed.
- Before claiming completion, the capture must pass, you must have read the tiles at both
  widths, and you must write a short critique of what you saw, including what you fixed.

Keep these separate when reporting: runtime evidence (captures, test runs), deterministic
checks (gates, tests), your own visual critique, and human judgement. Design metrics are
diagnostic, not targets. A human decides final design quality.

## Visual production contract

[docs/visual-production.md](docs/visual-production.md) is optional, but required when
visual or design quality is in scope. [task/visual-acceptance-template.md](task/visual-acceptance-template.md)
is its copyable checklist. A task that does not set visual quality in scope, such as the
current Ashcombe task, is unchanged by it.

- Keep content authority (brief, approved copy), machine gates, visual critique and human
  judgement separate, in the work and in the report. One does not stand in for another.
- Declare states in `states.json` for meaningful interactive UI, and capture them. Do not
  claim a state that was only coded.
- Record fonts and assets that are not final as provisional, with source and licence. Do not
  invent facts, figures, testimonials, customers or claims to fill a design.
- The Workbench is the evidence instrument, not a design generator. Passing it does not make
  a design good; a human decides that.

## The instrument

`capture.mjs`, `calibrate.mjs` and `calibration/` were qualified at tag `v0-capture-qualified`
and revised once, with regression coverage, in
[docs/cross-environment.md](docs/cross-environment.md); see also
[docs/qualification.md](docs/qualification.md). Do not change them to make a page pass.
If you suspect the instrument is wrong, keep the evidence, run `node calibrate.mjs` (it must
report QUALIFIED), and report the suspected defect separately from site defects.

The browser defaults to the installed Google Chrome; set `WORKBENCH_CHROME` to use another
Chromium (see the README). Rendering depends on the browser build and installed fonts.
`evidence/` is gitignored; cite run ids rather than committing captures.

Choose the stack, libraries and other capabilities the task justifies. The brief allows no
requests to other origins.
