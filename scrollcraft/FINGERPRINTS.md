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
| `techno-lot-datacenter` | **Filmic one-shot** inside the existing Next.js site (chosen because the user explicitly asked for full-screen video and picked direction C, one continuous argument: the aisle full, then empty). Replaces `techno-lot-accueil` (rejected by the user) | The site's global header only, transparent over the hero video (the page is pulled up under it). No page-specific chrome, no progress readout | Full-bleed **scrub** of a kling dolly down a green-lit server aisle (2nd generation, head and tail frames fixed so the haze holds). At rest a canvas re-draws every LED of the first frame (activity bursts, pointer makes nearby LEDs race); the real logo waits at the vanishing point in the haze, grows toward the camera, a two-line positioning line appears under it | `scrub(2.6) > pan(3.4) > flow > pin(4.2) > flow`, 5 engine acts, ~12.3vh. Pan rail of studio objects with pointer tilt + scroll-driven rotateY + shadow plane; pinned peak on canvas + plates + SVG | The resolved peak frame (empty lit hall, the logo drawn at its far end, "Votre espace est libre." centred under it, CTA) un-pins into the real submission form in flow. Bookends the hero (logo at the vanishing point, then in the freed space) | **La mise hors tension**: every LED (2,439, extracted from the photo itself as peak + own light) is live on a canvas over an "LEDs erased" plate; scroll powers the aisle down bay by bay near to far (each LED's last flicker, then the bay falls into one seamless darkness profile), silence with only the far haze, then the lights switch on with a tube flicker onto the empty hall and the logo's own loop is revealed along its traced centreline by an SVG mask | Photographic green-night data centre: haze, LED field, glossy raised floor; studio-black objects with a green rim. Chakra Petch (the site's own face, kept at the user's request) + Inter, accent #5ECB33 | 3000 (Next) |
| `techno-lot-datacenter` (3rd round, supersedes the row above on the live page) | **Filmic one-shot**, same build revised at the user's request: the scroll-driven power-down removed ("enleve le scrolling animation"), a time-based arrival scene added | Unchanged: the site's global header only, transparent over the hero video | Same scrub dolly and live LEDs at rest; the real logo is larger (up to 420px), grows x1.55 toward the camera, then fades and sinks over the last quarter of the act with the engine's cue curve, together with its letter-spaced two-line positioning line | `scrub(2.6) > pan(3.4) > flow > flow > pin(2.4) > flow`, 6 engine acts, ~12.6vh desktop. The step act gains a connector that fills with scroll and lights each step; the van act is a flow with a clip played once on view plus three ARIA tabs | Unchanged pattern: the resolved peak frame (empty hall lit, logo drawn, "Votre espace est libre.", CTA) un-pins into the real submission form | **L'espace libéré**: a lettered Sprinter (the real logo composited in perspective on a generated van, then animated by kling between the empty yard and the parked still) drives in and stops in a cloud of tyre smoke, played once on view; then the dark empty hall, tube-flicker lights-on, and the logo revealed along its own traced stroke | Same green-night data centre, plus a wet night loading yard with a green LED strip. Chakra Petch + Inter, accent #5ECB33 | 3000 (Next) |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Split stage with a moving divider that collapses at the end** (`techno-lot-accueil`). A later split-stage build must find a different collapse.
- **Objects sliced along their occlusion lines that cross a line and become ledger rows** (`techno-lot-accueil`). Nobody else may take "physical items converting into text rows at a seam".
- **Act band**: `pin > flow x5 > pin > flow`, 8 acts, about 10vh (`techno-lot-accueil`).
- **A photo's own lights made live and switched off by scroll** (`techno-lot-datacenter`): light sources extracted from a still, redrawn per source over an erased plate, powered down in a spatial wave. A later build must not reuse "scroll turns the lights of a scene off" as its signature.
- **Lights-out then lights-on reveal of the same place emptied** (`techno-lot-datacenter`).
- **A brand mark revealed along its own traced stroke by an SVG mask** (`techno-lot-datacenter`).
- **Hero logo at the vanishing point of a scrubbed dolly, bookended by the same logo in the resolved frame** (`techno-lot-datacenter`).
- **Act band**: `scrub > pan > flow > pin > flow`, 5 acts, about 12.3vh (`techno-lot-datacenter`).
- **A real brand logo composited onto a generated vehicle, then animated between an empty plate and the parked still (kling head and tail), played once on view as the "we come to you" beat** (`techno-lot-datacenter`, 3rd round). A later build must not reuse "the company's lettered vehicle arrives in frame" as its signature.
- **Act band**: `scrub > pan > flow > flow > pin > flow`, 6 acts, about 12.6vh (`techno-lot-datacenter`, 3rd round).

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
