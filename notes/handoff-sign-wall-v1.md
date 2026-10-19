# HANDOFF: SIGN THE WALL, live (v1)

*Written 2026-10-18 for the portal / Trio page team. The room side shipped in Trio Builder v86. This page covers what the page must do so fans can really sign a wall in a Mood Room.*

---

## 1 · What it is

A Mood Room can have a **signature wall**. One wall carries a solid title at the top: **SIGN THE WALL** by default (the builder can change the words and the colour). Under it is a small line: "TAP THE WALL TO LEAVE YOUR NAME". Fans' signatures fill the wall below, drawn in the look the builder picked: marker, paint pen, chalk or carved.

**The split is the same as the fan board:**

| | The room (done, v86) | The Trio page (this hand-off) |
|---|---|---|
| Draws the wall, title and signatures | ✓ | |
| Detects a tap and asks for the pad | ✓ | |
| Shows a signature big when tapped | ✓ | |
| The signing pad (finger / mouse, name, line, pen colour) | | ✓ |
| Saving, one-per-device, editing | | ✓ |
| Moderation | | ✓ |
| Sending approved signatures to the room | | ✓ |

**The room never talks to a database.** It only sends and receives messages with the page it sits in.

---

## 2 · Messages

**Room → page**, when a fan taps the wall (not on a signature):

```js
{ trio: 'open', board: 'sign' }
```

The page opens its signing pad. This is the same `trio:'open'` message the fan board and arcade already use, with a new `board` value.

**Page → room**, whenever the approved list changes (on load, after a fan signs, after moderation):

```js
{ trio: 'signatures', rows: [
  { id: 'a1b2', name: 'Maya', line: 'see you in Denver', pen: '#d23a3a',
    strokes: [ [x, y, x, y, …], [x, y, …] ] }
] }
```

- **Send the whole current list every time.** The room redraws from it; there are no adds or deletes.
- **`id`:** stable per signature. Use the device tag (see §4), not the raw device id.
- **`name`:** max 18 characters. **`line`:** max 60. Both are text only; the room draws them with `fillText` and never as HTML.
- **`pen`:** a `#rrggbb` colour. Anything else falls back to black. The builder's pens are black `#141414`, white `#f2f0ea`, silver `#c9ccd2`, gold `#e2c46a` and red `#d23a3a`. Offer those five.
- **`strokes`:** each stroke is one finger-down-to-finger-up path, as a flat list of x, y pairs.
  - Coordinates are **0–1** across the pad, with x left to right and y top to bottom. Draw the pad at a **2 : 1** shape so signatures aren't squashed.
  - Up to **40 strokes** and **300 points** per stroke. The room drops anything past that.
  - Thin out points as the finger moves; one every ~4 px is plenty.
- **Up to 60 signatures** are drawn. Send the newest 60 (or the best 60 after moderation).
- The room keeps the last list it got, even if it arrives before the room has finished loading.

---

## 3 · The signing pad (page)

A sheet slides up with:

1. A signing area at the 2 : 1 shape, with an **undo** button and a **clear** button.
2. The five pen colours.
3. **Name** (18 characters max) and **one line** (60 max, optional).
4. A **Sign the wall** button.

On post:

1. Close the sheet.
2. Send the new full list to the room (§2), so the fan sees their signature land on the wall right away.
3. Put the page scroll back to the top. The iPhone keyboard shoves the page; this is the fan board's lesson.

Copy the fan board's button rules: purple glass pill, and no yellow buttons.

---

## 4 · Data: same pattern as the fan board

Copy the fan board's security model exactly. The page's key is public, so assume everyone has it.

- **Table `wall_sigs`:** `campaign · device · name · line · pen · strokes (json) · hidden · created_at`.
  - Unique on (campaign, device), so signing again **replaces** the fan's signature.
  - Row-level security on, with zero policies. The public key can't touch it.
- **Write `wall_sign(campaign, device, name, line, pen, strokes)`:** a privileged function and the only way in.
  - Strip `<` and `>`.
  - Clamp name to 18 and line to 60.
  - Pen must match `#rrggbb`.
  - Strokes: at most 40 × 300 numbers, each clamped to 0–1.
  - Reject an empty signature.
  - Upsert.
- **Read `wall_view`:** `campaign · name · line · pen · strokes · tag · created_at`, where `hidden = false`.
  - `tag` = the first 8 hex characters of a hash of the device id, the same as the fan board. Use it as the signature `id`, and to find "you".
- **Who can sign:** decide per campaign. The simple default is anyone in the room. The fan board's "has played" gate also works if the room is part of a challenge.

---

## 5 · Moderation (must exist before a live event)

1. Hide one signature.
2. Hide everything from one device tag.
3. Hide the whole wall.
4. Wipe the wall for a campaign.

Hiding sets the flag; the view filters it out. The page then sends the room the new list, so the signature disappears for everyone on their next refresh. Never delete hidden rows.

A drawn signature can be a drawing of anything, so somebody should watch the wall during a live event. A "report" button is a good next step; it isn't required for v1.

---

## 6 · Refresh

Re-read `wall_view` about every **10 seconds** while the room is showing, and send the room the list only when it changed. Pause while the room is covered (when the page sends `{trio:'cover'}`) or while a game is open.

---

## 7 · Testing it without the portal

The baked room works on its own. Tapping the wall shows "the signing pad opens here inside the Trio page" when no page is around. To fake the page from the browser console of a published room:

```js
HEXCORE.SIGFEED(HEXCORE.sigClean([{id:'t1', name:'Test', line:'hello', pen:'#d23a3a', strokes:[[.1,.5,.3,.2,.5,.6,.7,.3,.9,.5]]}]))
```

The builder's own "✍ sign the wall" button is still a demo: its signatures stay in the builder and never publish.
