# Visual acceptance template

Copy this into a new visual website task and fill it in. It is a template, not a task: the
current task's brief and acceptance criteria are unchanged. Contract:
[docs/visual-production.md](../docs/visual-production.md).

Keep content authority, machine gates, visual critique and human judgement separate. Mark
anything undecided as **provisional** or **pending**; do not leave it implied.

## Content authority

- Brief: <path or reference>
- Approved copy: <path or reference; list any sections with no approved copy>
- Facts, figures, names and claims allowed: only those in the brief or approved copy
- Open questions and assumptions: <question → assumption proceeded on>

## Audience and purpose

- Audience:
- The one thing the page must get them to do or understand:

## Visual direction

- Directions studied (2–3, genuinely different):
- Thesis of the chosen direction:
- Things to avoid (explicit):
- Chosen by: [ ] human  [ ] agent assumption, awaiting confirmation

## Type

- Candidates (real headline, body, numerals, both widths):
- Decision: <face / none> — status: [ ] provisional  [ ] human-confirmed
- Source, pinned revision and licence text kept beside files:
- Reserved-name / modification restrictions noted:
- Files: size, hash, weights used; weight/subsetting plan:
- Rendered per `fonts.json` (run id):

## Asset plan

| Asset / hero / motion | Job | CSS/SVG/UI enough? | If real asset: source, licence, alt, weight | Status |
|---|---|---|---|---|
|  |  |  |  | provisional / final |

- Motion removed and reduced-motion checked: [ ]

## Tokens and rhythm

- Colour pairs and contrast checked:
- Type scale, spacing scale, radius, breakpoints:
- Section spacing rhythm:

## Responsive

- Reviewed at 375×812: [ ]   at 1280×800: [ ]
- Hierarchy, tap targets, wrapping and order checked at both:
- Other widths / devices / browsers checked separately (or not covered):

## Interaction states

| Surface | State | Declared in `states.json` | Captured (run id) | Read |
|---|---|---|---|---|
|  | rest / hover / focus / disabled / loading / empty / error |  |  |  |
|  | awaiting approval / approved / declined / running / blocked / retry |  |  |  |

- Mocked data labelled as mocked: [ ]
- States coded but not captured: <list, or none>

## Deterministic checks (machine)

- `node capture.mjs <dir>` run id and result:
- Gates failed and how resolved (site defects only):
- Non-gating findings, reported and unexplained ones kept visible:
- Tests run:
- Instrument suspected faulty? <no / evidence kept, `node calibrate.mjs` result, reported separately>

## Screenshots read

- [ ] every `375/tile-NN.png`   [ ] every `1280/tile-NN.png`
- [ ] every `<width>/states/<name>.png` declared
- `full.png` used for overall layout only
- Not looked at:

## Visual critique (agent)

What I saw, what I fixed, what remains:

## Human judgement

- Reviewer and date:
- Verdict on direction, type, assets and overall quality:
- Still pending:

## Known limitations

- Fonts or assets still provisional:
- Coverage gaps (browsers, widths, states, assistive technology):
- Open licence or ownership questions:

## Closeout

- [ ] Capture passes; run id cited (captures not committed)
- [ ] Tiles and declared state screenshots read at both widths
- [ ] Critique written
- [ ] No invented facts, figures, testimonials, customers or claims
- [ ] Provisional fonts and assets recorded as provisional
- [ ] No new dependency, MCP server or service added without a demonstrated runtime gap
- [ ] Human judgement recorded or marked pending
