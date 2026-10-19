# Trio Builder

The Trio room and World builder — Three.js rooms, Mood Rooms, Open Space and Worlds, baked into single HTML files.
**Current version: v86** (2026-10-18). Every version is tagged (`v86`, `v87`, …).

## Layout

- `src/` — the builder source: `shell.html`, `lib/` (hexcore, stage, world, screens, houses, add-ons…), `kits/` (outside kits), `assets/`
- `tools/build.py` — builds `dist/trio-builder-admin.html` and `dist/trio-room-builder.html`
- `tests/` — Playwright tests (`tNN-*.js`); t47 guards the hexagon
- `contracts/` — **the messages between a room and the Trio page** (read this first if you work on the portal)
- `notes/` — build notes (v73 on), hand-offs
- `kitlab/`, `moodlab/`, `romy/`, `setassets/`, `base/` — labs, mocks, test assets and the v30 baseline

## Build and test

```
python3 tools/build.py
python3 -m http.server 8765 --bind 127.0.0.1
node tests/t47-hex-regression.js
```

No keys, passwords or database access live in this repository — rooms never talk to a database.

---

## Recovery notes (2026-09-24)


src/shell.html        room shell with {{TRIO:...}} slots
src/lib/              nav.css, gltfloader-classic.js, hexcore.js, hexfx.js,
                      meshopt-simplifier-classic.js, stage.css, stage.js, three.min.js
src/assets/           song.mp3 (Romy track), logo.webp (Romy splash logo)
tools/extract.py      carves a built admin HTML back into src/
tools/build.py        builds the three variants into dist/ (replaces patch.py)
base/                 eventspace-src-stage30.html — the v30 hex baseline
tests/t47-hex-regression.js   hex vs v30: 11 named pieces + all 89 meshes
tests/t00-smoke.js            shapes, errors, screenshots

  python3 tools/build.py
  python3 -m http.server 8765 --bind 127.0.0.1
  node tests/t47-hex-regression.js

Proof on recovery: dist/trio-builder-admin.html is byte-identical to the shipped
v33 admin build (md5 23c45cbd…), dist/trio-room-builder.html byte-identical to the
shipped public room build (md5 d01694c4…). t47: local, local+stager, admin Event
Space all 89/89 meshes + 11/11 named pieces at v30 positions. 0 page errors.
