# Web Workbench V0 — acceptance task report

Date: 2026-09-19
Status: technical acceptance passed; human visual review pending.
Task: [task/brief.md](../task/brief.md), criteria [task/acceptance.md](../task/acceptance.md), both
fixed in commit `5675b1d` before any site code existed. Instrument: tag `v0-capture-qualified`,
unchanged throughout (`git diff v0-capture-qualified -- capture.mjs calibrate.mjs calibration` is empty).

## How it was run

- **Builder:** a fresh agent given only the brief, the acceptance criteria and `CLAUDE.md`.
  It chose static HTML/CSS/JS with no build step and no dependencies, with the page usable
  without JavaScript. It used no skills, MCP servers or libraries beyond the pinned Playwright,
  which it used for its own interaction scripts (not kept).
- **Verifier:** a separate agent. It wrote `tests/site.test.mjs` from the brief while the builder
  worked, kept it out of the repo until the build finished, and did not change it to fit the site.

## Capture, observation and repair loop (builder)

The capture runs are in `evidence/` (gitignored), and every manifest verifies.

| Run | Result | What the evidence showed | Repair |
|---|---|---|---|
| 0002-e03b27a8 | FAIL | Font-fallback gate at both widths. Bitstream Charter is installed only as Type1, which Chrome can't use, so headings rendered in Liberation Serif. | Stack changed to end in installed Noto Serif and DejaVu Serif. |
| 0003-a90c6e73 | PASS | Tiles showed the open-now badge wrapping at 1280, an over-stretched tools table, and prices not aligned with their labels. `smallTargets` listed the radio buttons at 21.6px. | Masthead column sizing, two-column tools panel, baseline alignment, 24px radios. |
| 0004-22e3bbfd, 0005-d9c5248c | PASS | The repairs are visible in the tiles. | Sticky filters on desktop. |
| 0007-07247967, 0008-c94910e3 | PASS | After the verifier's finding (below). Tiles are byte-identical to 0005. | Submit button ships disabled; the script enables it. Smooth scrolling removed. |

The verifier viewed tiles from 0003 and the final run and confirmed each claimed defect and repair.

## Independent verification (verifier)

- **Original held-out result:** 12/12 passed on the first run against the builder's first
  completed site (0005). They pass again, 12/12, on the repaired site (0008).
- **Post-acceptance finding:**
  - With JavaScript disabled, a valid submit made `GET /?name=…&email=…&postcode=…`. That is a
    network request carrying personal data in the URL, which the brief forbids. The site defect
    was reported to the builder, repaired, and re-verified.
  - The suite had not covered this case. Test **F6** was added afterwards and is labelled as a
    post-acceptance finding in the file. It failed on the unrepaired site.
  - F6 then timed out on the repaired site. The fault was in the test, not the site: Playwright's
    `click()` waits forever for a disabled button to become enabled. F6 now attempts submission by
    both a forced click and Enter in a field, and also asserts that no success message appears.
    The requirement it checks did not change.
- **The tests can fail:** 22 deliberately broken copies of the repaired site, one fault each.
  Every one was caught by the test that targets it. The faults covered opening boundaries, visitor
  time zone, "tomorrow", today marker, search case, `aria-pressed`, live region, clear-filters, a
  missing tool, message text, focus, a request on submit, the postcode space, `lang`, overflow at
  320, a foreign request, animation under reduced motion, the focus outline, a dropped rule, an
  invented statistic, and no-JS submission by button and by Enter.
- **Final suite:** 13/13 (12 original + F6).
- **Verifier capture 0009-c94910e3:** PASS, with 0 findings. All 12 screenshots are byte-identical
  to the builder's 0008 and to 0005.
- **Content (C3, judgement):** no images, embeds, quotes or external links beyond the brief's
  `mailto:`. The only text not taken from the brief is interface wording: "Skip to main content",
  "Find us", "Optional. At most 500 characters.", and the specified status line.

## Visual assessment (agent judgement, not a test result)

- **Overall:** restrained and readable, in line with the "community notice board" direction.
  Serif headings on cream panels with heavy top rules; no gradients, cards or tracked capitals.
- **Hours table:** today is marked by colour, a bar and a "Today" tag.
- **Form errors and empty filter state** render cleanly at 375.
- **Weaknesses:**
  - At 1280: empty space below "How borrowing works" and beside the long form.
  - At 375: the navigation wraps to three lines and makes the masthead tall.
  - Without JavaScript, the disabled "Send application" button looks enabled, and nothing explains
    why it does nothing. The brief doesn't require the form to work without JavaScript, so this is
    not a brief violation, but it is a real usability gap for a human to decide on.

Final design quality has not been judged. That is the human review.

## Instrument observations (no instrument defect found)

- **Run numbering:** run numbers count every entry in the output folder. With `evidence/calibration/`
  present, the first site run was `0002`. So [qualification.md](qualification.md)'s "folder count
  equals completed iterations" holds only when the output folder contains nothing but runs.
- **No clock control:** the capture uses the real clock. This site's open-now line changes with
  time, so its screenshots repeat only while the open/closed state is the same. They did here:
  "Closed now. Opens today at 10:00".
- **Page at rest only:** the capture shows the page at rest, with JavaScript on. Interaction states,
  other viewports and no-JS behaviour needed separate browser scripts. That split is intended,
  and `CLAUDE.md` states it.
- **The font gate is machine-relative:** it fired correctly on a font that is installed but
  unusable. A system-font stack that passes here may fail, or render differently, on another
  machine.

## Portability

- **Portable:** the brief, criteria, contract, `site/`, `tests/`, and the lockfile.
- **Locally derivable:** `node_modules` (`npm ci`) and `evidence/`.
- **Machine-bound:**
  - the system Chrome executable, overridable with `WORKBENCH_CHROME`;
  - the installed fonts. The site uses system stacks that render here as Noto Sans and Noto Serif,
    so pixels and the font gate depend on the machine.
- **Not kept:** builder and verifier scratch scripts, including the fault-seeding harness; their
  results are recorded above.
- **Blockers:** none found for running on another Linux machine with Chrome and the Noto fonts.
  Cross-machine screenshot equality is still untested.
