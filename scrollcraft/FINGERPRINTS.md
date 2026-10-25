# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| `techno-lot-accueil` | **Split stage** inside an existing Next.js site. Avant (photographic, cold) left, après (typographic ledger) right; the divider leans toward après as the argument advances | The site's global header stays (out of scope). The page's own chrome is the divider: a sticky hairline with AVANT/APRÈS (VOUS/NOUS during the process) labels at its foot and a green progress tick. Stacked horizontal divider on phones | Pinned 1.5vh layered photograph in the avant half: room plate, light cone (screen), real alpha lot cutout with contact shadow, near bokeh (screen); scroll push-in plus pointer depth; after-side h1 at 7.6rem with sub and CTA | `pin(1.5) > flow x5 > pin(3.6) > flow`, 8 engine acts, 10.2vh desktop. Zero scrub, zero pan, zero video | **Collapse**: the divider sweeps to the left edge after the last layer crosses, the ledger takes the left half, "Votre espace est libre." plus CTA on the right, then the real submission form in flow | **La ligne de rachat**: the lot is sliced along its real occlusion lines; each layer slides into the divider and, at the exact height it crossed, a ledger line emerges (item, dotted leader, green status), with a green glint on the divider at the crossing. Hidden surfaces under each layer are reconstructed so the stack empties physically | Low-key industrial still life: graphite, cold steel, board-formed concrete, one overhead lamp. Brand green #5ECB33 as the only accent. Archivo (wdth 75) + Inter | 3000 (Next dev) |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Split stage with a moving divider that collapses at the end** (`techno-lot-accueil`). A later split-stage build must find a different collapse.
- **Objects sliced along their occlusion lines that cross a line and become ledger rows** (`techno-lot-accueil`). Nobody else may take "physical items converting into text rows at a seam".
- **Act band**: `pin > flow x5 > pin > flow`, 8 acts, about 10vh (`techno-lot-accueil`).

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
