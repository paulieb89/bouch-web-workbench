# Web Agent Workbench V0 — capture qualification

Date: 2026-09-19
Status: observed local evidence. Two statements here were revised after the cross-environment
run (the font-fallback rule and the clean fixture's heading font): see
[cross-environment.md](cross-environment.md).
Scope: `capture.mjs` and `calibrate.mjs` on this machine only. Container qualification and
the control-vs-candidate experiment ([reconnaissance.md §7, §9](reconnaissance.md)) are not
covered here.

## Environment observed

Chrome 145.0.7632.159 (system, `channel: 'chrome'`), Node v24.17.0, playwright 1.63.0,
axe-core 4.13.0 (from `summary.json`). Neither npm package has an install script, so
`npm ci` downloads no browser; `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` is not needed.

## Result

`node calibrate.mjs` → `QUALIFIED (0 problems)`.

| Fixture | Runs | Gate result | Findings | Screenshots across runs | Time per capture |
|---|---|---|---|---|---|
| defects | 2 | fail (as expected) | 37 (25 gating) | 6/6 byte-identical | 2.7–4.1 s |
| clean | 2 | pass | 0 | 7/7 byte-identical | 2.5 s |

All 15 machine-detectable planted defects were detected at every width they apply to, on both
runs, including the two the recon probe missed:

- left-edge clipping: `overflow-left div.stat` at 375 (left −16px);
- silent font fallback: `Inter` rendered as Noto Sans, and an `@font-face` family whose file
  404s rendered as Liberation Serif. Detection uses Chrome's own record of the fonts it used
  (CDP `CSS.getPlatformFontsForNode`), not `document.fonts.check()`.

The metric expectations held: gradients, card-like elements, tracked caps and the 18px button
appear on the defects page, and all are zero on the clean page. Three planted defects (invented
metrics and testimonial, the accent word, 01/02/03 labels) are marked judgement-only, and no
check claims to detect them.

The clean page exercises the non-failing font paths: a supplied web font (Open Sans subset,
Apache-2.0, served as "Workbench Fixture Sans") and a local stack whose first family is missing
(`Georgia` → `DejaVu Serif`, which is also named in the stack). Neither is flagged.

## The calibrator can fail

Four deliberately broken copies were run through `calibrate.mjs`. Each one was reported
`NOT QUALIFIED`:

| Mutation | Reported misses |
|---|---|
| font-fallback check disabled | inter-fallback, webfont-fallback at both widths |
| left-edge check disabled | left-clip at 375 |
| clean page given a 404 image | clean gates failed, and 4 unexpected findings per run |
| HTTP ≥400 response listener removed | missing-image at both widths |

The last mutation also shows why a response listener is needed. Once the page is served over
HTTP, a 404 image does not fire `requestfailed`, which is the only signal the file:// probe
relied on.

## Behaviour decided during the build

- The capture server answers `/favicon.ico` with 204 when the page has none. Chrome requests it
  once per browser, page listeners can't see the request, and it produced a console error at
  the first width only.
- Vertical overflow counts only from half a line upward. A 64px heading with `line-height: 1.1`
  overflowed its box by 8px from glyph height alone.
- Tiles are clipped to the viewport width. Content past the right edge shows only in `full.png`,
  which widens to the page's scroll width (1100px on the defects page at 375).
- A capture that errors removes its run folder, so the folder count equals the number of
  completed iterations.
- Overflow gates apply at both widths. The recon listed only 375, but overflow at 1280 is
  equally a defect.

## Tile readability (H1)

`0001/375/tile-01.png` and `0003/375/tile-01.png` were opened with Read at 375×812. The text is
fully readable, and the planted clipping and spill are visible.

## Not established

- Whether screenshots match across machines or inside `mcr.microsoft.com/playwright:v1.63.0-noble`.
- How noisy `text-overflow` and the metrics are on pages other than these two fixtures.
- Whether any of this improves agent output. That is the experiment's question.
