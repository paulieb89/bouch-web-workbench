# Visual production contract

A portable contract for professional website work where visual quality is in scope. It is
framework-neutral. It extends the Workbench ([README](../README.md)); it adds no browser
instrument, dependency or gate.

**What this contract can and cannot do.** Automated checks catch a defined set of defects
(console errors, overflow, contrast violations, missing fonts). They do not establish that a
page is well designed. Design quality is a human judgement. Nothing below promises it; the
steps exist to make decisions deliberate and the evidence honest.

Keep four things separate in every record and report:

| Kind | Source | Example |
|---|---|---|
| Content authority | The brief and approved copy | "The headline is the approved line, verbatim" |
| Machine gates | Workbench capture, tests | "Run `NNNN-…` passed at 375 and 1280" |
| Visual critique | The agent, after reading screenshots | "The hero crowds the nav at 375; fixed" |
| Human judgement | A person | "Direction B approved; type still provisional" |

A pass in one row is never evidence for another.

A copyable checklist is in [task/visual-acceptance-template.md](../task/visual-acceptance-template.md).

## 1. Brief and content authority first

Before any styling, establish what the page may say.

- The brief and approved copy are the only source of facts, figures, names, testimonials,
  customers and claims. Do not invent any. Do not "improve" a claim.
- Where copy is missing, use a clearly marked placeholder during a private study or leave the
  section out. Never let a placeholder ship in the reviewed or released page.
- Where the brief is ambiguous, record the question and the assumption you proceeded on. Do
  not edit the brief to fit the build.
- Name the audience and the one thing the page must get them to do or understand. Direction
  choices are judged against that, not against taste in the abstract.

## 2. Type study before committing to a display face

Do not pick a display face by name recognition or by what was installed.

1. Choose two to four candidates that suit the audience and tone. Include a plain baseline.
2. Set the *real* approved headline, a subhead, body text, a number and a small label in each
   candidate, at both 375 and 1280.
3. Check what the page will actually need: weights, italics, numerals, language coverage,
   long-word wrapping, and file weight.
4. Render and read the screenshots. Rendering a face proves it loads; it does not select it.
5. Record the decision as **provisional** until a human confirms it. A candidate that was
   obtained or rendered is not a chosen face.

## 3. Visual direction studies before production UI

Before building the real page, produce two or three short studies of distinct directions
(a thesis, a palette and type sketch, one representative section each).

- State one visual thesis per direction, and an explicit list of things to avoid.
- Make the directions genuinely different (density, contrast, structure), not colour swaps.
- Judge them against the audience and the approved copy. A human picks, or the choice is
  recorded as an agent assumption awaiting confirmation.
- Where an existing design system or brand applies, it overrides this step.
- A direction that depends on an asset that does not exist yet stays out until the asset does.

## 4. Hero, asset and animation: a deliberate decision

Decide, and write down, what the hero and any imagery or motion are *for*. Each asset has a
specific job; decoration alone is not a job.

**CSS, SVG and UI primitives are enough when** the job is typographic emphasis, structure,
diagrams, icons, simple shapes, gradients used with intent, or showing the product's own
interface as real, live markup. They are cheap, sharp at any size, themeable and accessible,
and carry no provenance or licence question.

**A real asset is justified when** the job needs something primitives cannot honestly supply:
a photograph of an actual place, person or object; a genuine product screenshot; a
commissioned illustration; footage. Then record:

- source, author and licence or ownership, and that it may be used on this site;
- that it is real and says what it claims to (no stock image passed off as a customer);
- dimensions, format, weight, `alt` text or decorative marking, and a fallback if it fails.

Do not ship assets whose ownership is undecided (for example, generated artwork with unclear
rights). Mark any placeholder asset as provisional.

**Animation:** decide whether it communicates something (state change, causality, focus) or
only decorates. Keep it optional: the page must make full sense with motion removed, and
`prefers-reduced-motion` must be respected. Check the page with imagery and motion removed;
if the content then fails, the content was leaning on decoration.

## 5. Tokens and layout rhythm

- Fix tokens before pages: colour (with text/background pairs checked for contrast), type
  scale, spacing scale, radius, border, shadow, and breakpoints. Pages consume tokens; avoid
  one-off values.
- Define a vertical rhythm: a small set of section spacings used consistently, with a clear
  step between related and unrelated content.
- Constrain measure (line length) for reading text; let non-text elements use width
  deliberately.
- Decide how each layout reflows from 375 to 1280, rather than relying on the browser to
  shrink it.
- Use `full.png` from a capture to judge rhythm, then confirm in the tiles.

## 6. Components and interaction-state mapping

Prefer platform and semantic HTML. Add a library or primitive only for behaviour the platform
lacks (dialog, popover, tabs, accessible select). Style through tokens, not per-use overrides.
Controls that look like buttons but navigate stay links. Icon-only controls need an
accessible name; decorative icons are hidden from assistive technology.

For each meaningful interactive surface, list the states it can be in, decide how each looks
and reads, and mark which ones will be captured:

- Generic: rest, hover, keyboard focus, active/pressed, disabled, loading, empty, error, success.
- Forms: invalid, valid, required, help text, submitted.
- Motion and script: reduced motion; behaviour with JavaScript unavailable where the design
  claims to work without it.

**Agentic and approval flows** add states that must be designed, not implied:

| State | What the user must be able to tell |
|---|---|
| Awaiting approval | What is being asked, by whom, what it will do, and how to approve or decline |
| Approved | That the decision was recorded and what happens next |
| Declined | That nothing ran, and what the user can do instead |
| Running / pending | That work is in progress, and whether it can be stopped |
| Error | What failed, in plain language, and whether anything partial happened |
| Blocked | What is preventing progress and who or what can unblock it |
| Retry | What a retry repeats, and what it does not |

Time and ordering must be unambiguous. If data is mocked, label it as mocked; nothing may
imply live execution that is not happening.

Record which states were *captured*, as opposed to merely coded. Do not claim a state that
was only written in source.

## 7. Self-hosted fonts: verification and licence boundary

- Self-host. The Workbench brief allows no requests to other origins, so no font CDN, no
  hosted-font `<link>`, no remote `@import`.
- Obtain files from an authoritative source at a pinned revision, and keep the upstream
  licence text beside them.
- Read the licence that actually ships with the files, not memory. Note any reserved-name or
  modification restrictions *before* subsetting, converting or editing. This is a project
  check, not legal advice; a production licence review is a separate, human step.
- Record per file: size, hash, axes, and the weights actually used. Plan for weight (subset or
  convert to a compressed web format) before production, and record if that is still open.
- Declare fonts only where used. Give every stack a sensible fallback and consider
  size-adjusted fallbacks to limit layout shift.
- A font is installed only when it **renders**. Prove it in the browser: Workbench
  `fonts.json` shows the fonts that rendered per stack, and the font gate fails a stack whose
  named families did not render. Do not name a family in CSS whose file is absent.
- "Downloaded", "built" and "rendered" are different claims. "Chosen" is a further, human one.

## 8. Responsive visual review at 375 and 1280

The Workbench captures 375×812 and 1280×800. Review both deliberately, not only for
overflow:

- Does hierarchy survive the narrow width? What is first, and is it still the right thing?
- Do tap targets, spacing and line lengths work at 375? Does anything wrap awkwardly or crowd?
- Does 1280 use its space on purpose, rather than stretching mobile content?
- Does the order of content still make sense when stacked?

Widths between and beyond (for example 768 or 1920), landscape, zoom, other browsers and real
devices are **not** covered by a default capture. If they matter, check them separately in the
real browser (the pinned `playwright` package is installed) and record that you did.

## 9. Capture, including declared interaction states

1. Run `node capture.mjs site` (or the target directory) after each meaningful change.
2. Declare the interaction states that matter in `states.json` (see
   [README: Interaction states](../README.md#interaction-states)) and capture them. Each state
   is gated like the page at rest.
3. Read `summary.json` first: pass/fail, findings, hashes, browser and tool versions.
4. Cite the run id (`evidence/NNNN-<hash>`); do not commit captures. `evidence/` is gitignored.
5. If you suspect the instrument is wrong, do not change it to make a page pass. Keep the
   evidence, run `node calibrate.mjs` (it must report QUALIFIED), and report the suspected
   defect separately from site defects.

The gates and findings are deterministic checks. They are necessary evidence, not a verdict.

## 10. Reading screenshots and human critique

- Open `<width>/tile-NN.png` at both widths with Read, and each
  `<width>/states/<name>.png`. Use `full.png` for overall layout only: tall pages are
  downscaled and text is unreadable.
- Look for what the gates cannot see: hierarchy, alignment, rhythm, crowding, contrast in
  context, awkward wraps, image crops, a state that is technically fine but unclear.
- Write a short critique: what you saw, what you fixed, what remains. Say plainly what you did
  not look at.
- Design metrics (`metrics.json`) and non-gating findings are diagnostic. They are not
  targets. Report non-gating findings you could not explain, rather than hiding them.
- A human decides final design quality. Record their judgement as theirs, and record anything
  still awaiting it as pending.

## 11. Anti-slop guidance: judgement, never a gate

"Anti-slop" lists name generic patterns an author tends to produce by default. Use them as
prompts for the critique, not as pass/fail tests, and never encode them as a machine gate:
taste is not measurable and a gate for it would only train the page to avoid the list.

Questions worth asking of each choice:

- Is this a decision for this audience and brief, or a default I reached for?
- Does every image, gradient, icon and animation have a job?
- Is any copy generic enough to fit any company? (Then it is probably not approved copy.)
- Would the page still hold up with the decoration stripped out?
- Are there claims, numbers or social proof that the brief did not supply?

A default is not wrong, but it should be chosen. The project contract and any existing brand
override generic taste advice.

## 12. Additional MCP servers and CLIs: only after a demonstrated gap

The Workbench, the system browser and the pinned `playwright` package already provide
rendering, screenshots, accessibility checks and interaction. Do not add another MCP server,
CLI or service on the expectation that it might help.

Add one only when you can show a **runtime gap**: a specific thing the task needs that the
existing tools were tried against and cannot do or cannot be trusted to do. Record the gap,
what was tried, and what the addition must prove. Prefer a native capability, then a thin
adapter, then a custom abstraction. An added tool's output is an opinion until it demonstrates
it can produce a known positive.

## Closing out

A visual task is closed when the capture passes, the tiles and state screenshots were read at
both widths, the critique is written, provisional fonts and assets are recorded as
provisional, and what is left for human judgement is stated. Report runtime evidence,
deterministic checks, your critique and human judgement separately.
