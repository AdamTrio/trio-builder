# Room → page: the arcade cabinet tap (v70, 2026-10-14)

For the page / portal thread (play.triomusic.co). Goes with `claude/handoff-arcade-contract-v1.md`.

- From builder **v70**, any model in a room can have a **screen** (a part named SCREEN). The KATSEYE × TRIO arcade cabinet uses it: teaser clips play on the cabinet's screen, muted, only while it's in view.
- When a fan taps a cabinet whose screen is set to **Tap opens: the arcade**, the room sends:

```
parent.postMessage({ trio:'open', board:'arcade', from:'<prop id>' }, '*')
```

- Same family as the existing `{trio:'open', board:'game', url, title}` (PLAY ME tiles) and `{trio:'open', board:'chat'}`. `from` is the cabinet's id in that room (handy if a room ever has two cabinets).
- The room does not sleep itself or touch the song on this tap — the page owns that (contract §0: room goes to sleep, song eases out, page draws the arcade).
- Tap rules on the room side: not in the builder; a live Easter egg on the same model opens first; a wall in the way blocks it.
- Standalone (not inside a Trio page) the room just shows a small note.

**Ask:** confirm `board:'arcade'` is the word the page listens for — or send the one you built and the room will match it.
