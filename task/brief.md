# Brief: Ashcombe Tool Library website

Status: fixed before implementation. Change it only by a recorded decision, not to fit the build.

Ashcombe Tool Library is a fictional volunteer-run lending library for tools in the fictional
town of Ashcombe. It needs a one-page website that tells local people what it is, when it is
open, what they can borrow, and lets them fill in a membership application.

The stack is the builder's choice. The finished site must be static files under `site/` that
work when served as-is by `node capture.mjs site`: no build step at serve time, no server code.

## Content

Use this content. Wording may be edited lightly for layout (headings, line breaks, list
formatting), but no fact may be added, removed or changed. Anything not listed here is not
authorised (see "Not authorised").

**Name:** Ashcombe Tool Library

**Introduction:** Ashcombe Tool Library lends tools to people who live in and around Ashcombe.
Borrow a drill for a weekend instead of buying one you will use twice. We are run entirely by
volunteers.

**Address:** The Old Forge, Mill Lane, Ashcombe
**Email:** hello@ashcombetools.example

**Opening hours** (UK time):

| Day | Hours |
|---|---|
| Monday | Closed |
| Tuesday | 17:30–19:30 |
| Wednesday | Closed |
| Thursday | 17:30–19:30 |
| Friday | Closed |
| Saturday | 10:00–13:00 |
| Sunday | Closed |

**How borrowing works** (a real sequence; numbering is appropriate):
1. Join online or at any session.
2. Reserve a tool by email, or come to a session and choose from the shelves.
3. Borrow it for up to one week. You can renew once if nobody is waiting for it.

**Borrowing rules:**
- Return tools clean and on time.
- Tell us about any damage or fault straight away. We never charge for normal wear.
- Some tools need a refundable deposit, paid when you collect them. We return it when the tool
  comes back in working order.
- Members must be 18 or over.

**Membership** (per year):
- Individual — £15
- Household — £25 (up to four adults at one address)
- Concession — £5 (for people receiving means-tested benefits, and full-time students)

**Volunteers:** We need help on Saturday mornings: checking tools in and out, and small
repairs. Email us if you can give a few hours a month.

**Tools** (20). Deposit "none" means no deposit.

| Tool | Category | Deposit |
|---|---|---|
| Electric lawnmower | Garden | £25 |
| Hedge trimmer | Garden | £10 |
| Garden shears | Garden | none |
| Leaf blower | Garden | £10 |
| Wheelbarrow | Garden | none |
| Cordless drill | Woodwork | £10 |
| Jigsaw | Woodwork | £10 |
| Mitre saw | Woodwork | £25 |
| Sash clamps (set of 4) | Woodwork | none |
| Folding workbench | Woodwork | none |
| Wallpaper steamer | Decorating | £10 |
| Pasting table | Decorating | none |
| Step ladder (6 tread) | Decorating | none |
| Tile cutter | Decorating | £10 |
| Carpet cleaner | Cleaning | £25 |
| Pressure washer | Cleaning | £25 |
| Window vacuum | Cleaning | none |
| Gazebo (3 × 3 m) | Events | £25 |
| Folding tables (set of 2) | Events | none |
| Tea urn (40 cups) | Events | £10 |

## Not authorised

No testimonials or quotes; no statistics or counts (members, loans, money or waste saved),
except the count of tools shown by the filter; no customers, partners, sponsors, logos or awards;
no social media links; no photographs or illustrations of people; no prices, dates, phone
numbers, rules or services other than those above. Placeholder text must not ship.

## Behaviour

### Open-now indicator
Near the top of the page, show whether the library is open, computed from the hours above in
UK time (Europe/London), whatever the visitor's own time zone. Opening time is inclusive and
closing time exclusive (open at 17:30:00, closed at 19:30:00). The text must be exactly one of:

- `Open now until 19:30` (the closing time for the current session)
- `Closed now. Opens today at 17:30` (an opening later the same day)
- `Closed now. Opens tomorrow at 17:30` (the next opening is the next calendar day)
- `Closed now. Opens Saturday at 10:00` (otherwise, the weekday name of the next opening)

In the opening-hours table, today's row (UK date) is marked both visually and in text
(for example the word "today"), so that it does not rely on colour alone.

Without JavaScript the hours table must still be shown; the indicator may be absent.

### Tool list and filter
Under a heading "Browse the tools", show all 20 tools with their category and deposit.

- A text input labelled "Search tools" filters by case-insensitive match anywhere in the tool
  name.
- A group of buttons labelled "Category" offers "All", "Garden", "Woodwork", "Decorating",
  "Cleaning" and "Events". Exactly one is selected (default "All"), and its selected state is
  exposed to assistive technology (for example `aria-pressed`).
- Search and category combine (both must match).
- A status line reads `Showing N of 20 tools` and is announced to screen readers when it
  changes (a polite live region).
- When nothing matches, show `No tools match. Try another category or clear the search.` and a
  button "Clear filters" that resets the search to empty and the category to "All".
- Without JavaScript, all 20 tools are listed.

### Membership application form
Under a heading "Join the library", a form with:

| Field | Label | Required | Validation message(s) |
|---|---|---|---|
| Text | Full name | yes | `Enter your full name` |
| Email | Email address | yes | empty: `Enter your email address`; malformed: `Enter an email address in the format name@example.com` |
| Text | Postcode | yes | empty: `Enter your postcode`; malformed: `Enter a UK postcode, like AB1 2CD` |
| Radios | Membership type: Individual, Household, Concession (each showing its price) | yes | `Choose a membership type` |
| Textarea | Tools you are interested in | no, at most 500 characters | `Use 500 characters or fewer` |
| Checkbox | I have read the borrowing rules | yes | `Confirm you have read the borrowing rules` |

The submit button reads "Send application".

- Validate on submit. After the first submit attempt, each field's message updates as that
  field changes.
- Each message is shown next to its field, programmatically associated with it
  (`aria-describedby`), and the field is marked `aria-invalid="true"` while invalid.
- On a failed submit, focus moves to the first invalid field.
- A postcode is valid if, ignoring case and surrounding spaces, it matches the UK outward/inward
  shape `^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$`.
- There is no backend. A valid submit must not make any network request. Replace the form with
  this message and move focus to it:
  `Thank you, {Full name}. This is a demonstration, so nothing has been sent. At your first session, bring photo ID and the {price} {type} membership fee.`
  For example: `… bring photo ID and the £25 Household membership fee.`

## Technical requirements

- One page, `lang="en-GB"`, title "Ashcombe Tool Library", exactly one `h1`.
- No horizontal scrolling at any width from 320px to 1440px.
- No requests to any origin other than the page's own. Fonts are system fonts, or font files
  shipped in `site/` with their licence beside them.
- All interactive elements are reachable and operable by keyboard with a visible focus
  indicator. Respect `prefers-reduced-motion`.
- The workbench capture gates pass (see `CLAUDE.md`).

## Visual direction

Practical, local and trustworthy: a notice board at a community workshop rather than a start-up
landing page. Beyond that, visual design is the builder's judgement. Final design quality is
decided by a human reviewer looking at the rendered page.
