# Room ↔ Trio page: the contract

The builder makes **rooms** (single HTML files). The Trio page (the portal / play site) **hosts** a room in a full-screen frame.
They work together only through the messages below, sent with `postMessage`. **The room never talks to a database**:
saving, names, scores, moderation and identity all belong to the page.

A room knows it is hosted when it is framed by a Trio page (`CORE.HOSTED`). Not hosted, it shows a small note instead of sending.

## Room → page

| Message | When |
|---|---|
| `{trio:'ready'}` | the room has drawn its first frame (also after 2.5 s) |
| `{trio:'open', board:'arcade', from:<model id>}` | a fan taps an arcade cabinet / a screen set to "the arcade" |
| `{trio:'open', board:'chat', from?}` | a fan taps the fan board wall / a screen set to "the fan board" |
| `{trio:'open', board:'game', url?, title?}` | a fan taps the game wall / a PLAY ME tile |
| `{trio:'open', board:'sign'}` | a fan taps the signature wall (v86) — open the signing pad |
| `{trio:'open', room:<url>, name, from}` | a fan walks through a World door — open that room |
| `{trio:'egg', id}` | an Easter egg pop-up opened |
| `{trio:'quiz', id, ok}` | a quiz egg was answered (right / wrong) |
| `{trio:'trigger', id}` | a model's "tap sets things off" moment fired |

## Page → room

| Message | What the room does |
|---|---|
| `{trio:'cover'}` / `{trio:'uncover'}` | sleeps (pauses video, rendering) / wakes |
| `{trio:'levels', b, m, t}` | bass / mid / treble 0–1 from the page's music → visualizers ride the song |
| `{trio:'board', rows:[{name, score, you}], over}` | the leaderboard wall (50 rows max; names 18 chars, text only) |
| `{trio:'chat', rows, count}` | the fan board wall: newest first, yours in gold (text only) |
| `{trio:'signatures', rows:[{id,name,line,pen,strokes}]}` | the signature wall — full approved list each time (v86, see `sign-wall-v1.md`) |

## Rules both sides keep

- Everything a fan typed is drawn as **text only** — never HTML.
- The page owns the music; the room's own track is silenced when hosted.
- The page owns identity and storage. The room sends what happened; the page decides what to keep.

## Related hand-offs (in the Trio Continued Build project)

- Arcade game contract — `handoff-arcade-contract-v1.md`
- Event-room game contract — `handoff-event-game-contract-v1.md`
- Fan board (sign the fan board) — `handoff-fan-board-spec-v1.md`
- Trio pop-up card — `handoff-trio-popup-contract-v1.md`
- Sign the wall (live) — `sign-wall-v1.md` (this folder)
