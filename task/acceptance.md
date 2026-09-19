# Acceptance criteria: Ashcombe Tool Library

Fixed with [brief.md](brief.md) before implementation. Each criterion names how it is checked.
Four kinds of evidence are kept apart:

- **Browser test**: `tests/site.test.mjs`, deterministic, against the served site in system Chrome.
- **Capture gate**: `node capture.mjs site` exits 0 (the qualified V0 instrument, unchanged).
- **Visual critique**: the builder's and verifier's written reading of the tiles and full-page
  screenshots at 375 and 1280. It is judgement, recorded as such.
- **Human review**: final design quality. Not decided by this acceptance.

| ID | Criterion | Checked by |
|---|---|---|
| F1 | Open-now text is exactly right for times covering open, before opening, after closing, next day, later weekday, both boundaries, both GMT and BST, and a visitor in a non-UK time zone | Browser test |
| F2 | Today's row in the hours table is marked in text | Browser test |
| F3 | The tool list shows 20 tools; search, category and their combination filter correctly; `aria-pressed` reflects the selection; the status line is exact and in a polite live region; the empty state and "Clear filters" work | Browser test |
| F4 | Without JavaScript, the hours table and all 20 tools are present | Browser test |
| F5 | Form: every validation message is exact; `aria-invalid` and `aria-describedby` are set; focus goes to the first invalid field; messages update after the first attempt; postcode and 500-character rules hold; a valid submit makes no request, shows the exact confirmation and focuses it | Browser test |
| T1 | `lang="en-GB"`, the title, and exactly one `h1` | Browser test |
| T2 | No horizontal scrolling at 320, 768 and 1440 | Browser test |
| T2 | No horizontal scrolling at 375 and 1280 | Capture gate |
| T3 | No request to another origin | Browser test |
| T4 | Search, category buttons and every form control are reachable with Tab, and show a visible focus indicator | Browser test |
| T5 | With reduced motion, no animation runs after the filter or form is used | Browser test |
| T6 | No console errors, page errors or failed requests; no serious or critical axe violations; no font fallback | Capture gate |
| C1 | Every fact in the brief (hours, 20 tools with category and deposit, prices, address, email, steps, rules) appears on the page | Browser test |
| C2 | No unauthorised numbers: every number in the page's text appears in the brief | Browser test |
| C3 | No other unauthorised content (testimonials, invented claims, people imagery, placeholder text) | Visual critique and human review |
| V1 | Tiles and full-page screenshots at both widths have been read, with a written critique of real defects found and fixed | Visual critique |
| V2 | Design quality | Human review |

Design metrics in the capture's `metrics.json` are diagnostic only.
