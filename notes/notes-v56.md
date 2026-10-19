# Trio Builder v43.1 → v70 (2026-10-04/09) — CURRENT builder notes (supersede "current" in `trio-builder-worktree-2026-09-24.md`, which logs up to v43)

## v70 — CURRENT. `trio-builder-admin-site-v70.zip`, admin md5 `9faad2e4c3993e21bd3ba12cb806e396`.
- **Screens on models — the arcade cabinet** (Adam's KATSEYE × TRIO cabinet, `setassets/arcade/katseye-arcade.glb`; spec `claude/handoff-arcade-cabinet-model-spec-v1.md`). Standard feature: any .glb with a part named **SCREEN** (`CORE.findScreen`, name on the mesh or a parent) gets a **Screen** section in the model editor: clips (+ clip, ↑↓ ×; warn > 4 MB), **Tap opens: the arcade / nothing**, **save as preset**.
- Engine: `CORE.screenApply(p,g)` (called in `CORE.build` finish, after glow; glow skips `userData.isScreen`): one `<video>` per model (muted, playsinline, loops a single clip, plays a list in order) → `VideoTexture` (sRGB, **flipY=false** for glTF UVs) on a white unlit `MeshBasicMaterial` (toneMapped:false). `CORE.screenTick` — a 400 ms timer (not a frame hook, so a sleeping room still pauses): plays only when the SCREEN is in the camera frustum and < 18 m. `CORE.SCREENURL(id)` resolves clips (builder ASSETS / bake.assets). Real size: the first build of a model with a SCREEN takes its true size (`p.size`, `p.sizeAuto`) — cabinet 1.8 m.
- **Tap:** published room, not in the builder, egg goes first, a wall in the way wins → `CORE.arcadeOpen(p)` → hosted: `postMessage({trio:'open', board:'arcade', from:<prop id>})`; standalone: a small toast. **Page side still to confirm this message** (the arcade contract says the builder note goes separately).
- **Presets:** `.hexmodel.json` = `{kind:'hexmodel', prop, assets}` (model + clips + egg assets; trigger/follow dropped). Models → **open model preset…** drops it in front of you. Ready-made: `katseye-trio-arcade.hexmodel.json` (cabinet + the 1.1 MB teaser MP4, re-encoded from Adam's 5.6 MB .mov: H.264, 30 fps, no audio, 960×720).
- Bake carries clips (skip > 12 MB); project files + reopen-a-baked-room keep them.
- Tests: **t119 12/12** (real size; Screen section; clip on SCREEN; plays in view, pauses turned away; preset round-trip; published plays; tap → `{trio:'open', board:'arcade'}`). t47, t80, t83, t87, t91, t102, t108, t115, t117 pass.

## v69.1. `trio-builder-admin-site-v69.1.zip`, admin md5 `0b3bfcaca6bc352106e4116eb68d781e`.
- **Boards flew off the wall with the Carved line on** (Adam: chat board so far off "I can walk behind it"; tiles were the right distance). Cause: `hang()` in `addons/carved.js` measured each hung thing with a WORLD box — for a panel on a turned wall that box is metres deep, so the "back" of the board read as deep behind the wall and the push came out ~3.3 m (tiles ~1.2 m). Now every mesh's own box is taken into the WALL's frame (thing parked at its own spot while measuring) → push = carve height under it + 3 cm − its real back. Measured: board 0.50 m, tiles 0.46–0.50 m (carve on); 0.10 / 0.09 m with no carve. Without the carve nothing changed.
- Tests: **t118 2/2** (v66 fails: board 3.27 m); t47, t83, t108, t113 pass.

## v69. `trio-builder-admin-site-v69.zip`, admin md5 `4ca6416676ee6dfdc4888a68bfc0b41e`.
- **Easter egg quiz** (Adam: "prompt somebody to pop open an Easter egg… answer a question… if they get it right, they can collect"; mock `egg-quiz-mock.png` approved). Egg editor → **+ question**: block `{t:'quiz', q, answers:[2–4], right}`; mark the right one with "✓ right", "+ answer" up to 4, × to remove (min 2).
- Pop-up: question + answer buttons; **collect** shows "🔒 answer to collect" and is disabled until every question block is answered right. Wrong → red ✕ + "Not quite — try again" (that answer can't be picked again). Right → green ✓ + "You got it!" + collect turns green. Solved state per egg in `CORE.EGGSOLVED` (reset by "reset the room"; preview resets its own).
- `closeEgg`: an unsolved quiz egg closes (✕ / tap the room) **without** collecting and without the room reaction (`EGGCTX.unsolved`). A song in an unsolved quiz egg just plays. Hosted: posts `{trio:'quiz', id, ok}`.
- Tests: **t117 9/9** (real clicks in preview; published ✕-before-answer doesn't count; right → collect → uplights come on). t47, t83, t93–t96, t101, t102, t111 pass.

## v68. `trio-builder-admin-site-v68.zip`, admin md5 `0e92d2196a642f18c845f4458ed6e91a`.
- **Sky drift** (Adam: "slowly rotate the stars and the clouds so they're not fixed"). Sky section (Mood Room) / Open space section → **Sky drift: off / slow / medium** (`C.drift`, in `M.sky` or `M.open`; off = undefined, the default). `CORE.SKYDRIFT={slow:.006, medium:.02}` rad/s (≈ 17 min / 5 min a turn). One onFrame in `CORE.skyParts` turns the sky sphere, own-image sphere, `H.stars` and `H.dome` together by absolute time; the shader's sun uniform is counter-rotated so the sun disc stays with the sun light. A sleeping room doesn't advance it until it draws again.
- Tests: **t116 10/10**; t47, t83, t105, t106 pass.

## BANKED (Adam 10/14) — not building yet, he'll come back
- ~~Arcade cabinet screen~~ → built in v70. (was: Adam models a cabinet for most rooms; the screen plays teaser clips. Plan: in Blender the screen is its own part named **SCREEN** with its own material, UVs filling 0–1. Builder finds a part named SCREEN on any model → **Screen** section: teaser clips (playlist, muted loop, plays only when on screen), fit/fill, **Tap opens: the arcade** (message per `claude/handoff-arcade-contract-v1.md` — confirm the exact open-arcade message with the page/portal thread). "Save as preset" so every room adds it in one tap. Clips < ~4 MB each. Standard feature, not an add-on. Offer a mock first.
- **Cabinet arrived (10/14):** `setassets/arcade/katseye-arcade.glb` (KATSEYE × TRIO, meshopt-compressed 3.4 MB, 20,950 tris, faces +Z, origin bottom centre). Parts: SCREEN (+ extras: 4:3, video_target, 0.62 × 0.465 m), SCREEN_BEZEL, MARQUEE, BUTTONS, CABINET_*, SIDE_LEFT/RIGHT… Checked in v69.1: loads clean (decoder works), SCREEN found, UVs exactly 0–1; a canvas "teaser" on a MeshBasicMaterial (toneMapped:false, texture flipY=false) lands right way up, edge to edge (`arcade-screen-mock.png`). Builder's default size made it 1.6 m tall — use its real size (1.8).
- **Blender animations in models (Adam: this one matters, before simple motions):** play the model file's own animations (AnimationMixer), keep animation/skin data through publish (crunchGLB currently drops them), per model: pick clip, loop / once / on a trigger. Skinned characters heavier on phones.
- Simple builder motions (spin / float / sway / pulse): low priority.
- Still queued: v70 glow direction dial.

## LOGGED (Adam 10/12) — next fixes
- ~~Boards too far off the wall~~ → fixed in v69.1.
- Queue: **v70 glow direction dial**.

## v67. `trio-builder-admin-site-v67.zip`, admin md5 `8e82cd9a02edcaf4b11a36f209e5f902`.
- **Compressed models (lossless meshopt)** — Adam's dolls are ~16 MB each, 93% geometry. meshoptimizer 1.2 (MIT) came from Adam (npm tarball dropped in the vault; this sandbox and his Mac shell can't reach npm) → `third_party/meshoptimizer-1.2.0/` (+ the .tgz).
- **Opens them:** `src/lib/meshopt-decoder-classic.js` (29 KB) ships in every page incl. published rooms; `CORE.gltfLoader()` = GLTFLoader + `setMeshoptDecoder` (hexcore build + stage testParseGLB).
- **Publishing packs every model:** `src/lib/meshopt-encoder-classic.js` (builder only, data-stage). `crunchGLB` unpacks packed bufferViews first, trims to the triangle budget as before, then writes vertex data as `ATTRIBUTES` and triangle indices as `TRIANGLES` with `EXT_meshopt_compression` (+ fallback buffer, extensionsRequired); views that don't shrink stay plain. Lossless (no quantization/filters; TRIANGLES may start a triangle at another corner — same triangle, same facing). `KHR_mesh_quantization` dropped from the output (we write floats).
- **Tools:** `tools/meshopt_pack.mjs in.glb out.glb` (pack any GLB losslessly — e.g. Adam's dolls before upload, so the builder + project files are lighter too); `tools/meshopt_verify.mjs a.glb b.glb` (proves every accessor identical). Katseye conference room 1.26 → 0.80 MB, 197/197 identical; test model 1.00 → 0.58 MB.
- Tests: **t115 6/6** (packed model opens in builder same as plain; bake packs; room carries decoder only; published opens). t47, t83, t87, t91, t95, t97, t108, t112, t114 pass. Fixture `setassets/model-meshopt.glb`.

## v66.1. `trio-builder-admin-site-v66.1.zip`, admin md5 `ce2661cc87573df80b573daf932e218f`.
- **Set glow light in the wrong place** (Adam's Katseye room: "the beam of light… from the center of the room aiming back at the thing"; set stayed black). `glowApply` measured the model's centre in WORLD space; when a project file is opened (or a set is still being placed) those positions are stale, so the SpotLight landed ~10 m out in the room aiming back. Now measured in the model's own space (walk the matrices up to the model) → the light sits on the model, shining deeper into the set. Test **t114** loads Adam's real file (`setassets/katseye.hexlook.json`): v66 gap 10.13 m → v66.1 gap 0. t87 also re-opens a saved project (passes on both — the bug needs Adam's file).
- **Carved line + sets**: `hang()` skips set groups (`isSet`), window frames (`cutFrame`) and the beam ceiling — sets stay behind the wall; only wall-hung things float out.
- **Carved line + windows**: the neon stops at a window opening (reads the wall's cut mask) and picks up after it; a **closed** window keeps its piece of neon until it opens (`winKey` tubes follow `winK`). `CORE.CUTVER` bumps on every cut/uncut so the carve re-fits. Test **t113 7/7**.
- **Glossy shine**: the reflection world (`moodEnv`) lost its 6 tall "studio light" strips — they showed as white beams on glossy floors / spots on glossy walls. Real lights still reflect.
- Tests: t47, t83, t84, t87 11/11, t99, t103, t107, t108, t110–t114 pass.

## v66. `trio-builder-admin-site-v66.zip`, admin md5 `1dc39e2157b899e347bf5248e2d2cd0a`.
- **Add-on #2 "Beam ceiling"** (Adam's red-room reference; pattern A picked from mock `mock/beams/beams.html?p=grid`; "make sure the ceiling can still disappear"). `src/lib/addons/beams.js`, `<script data-addon="beams">`. The room's own ceiling lifts 1.1 m (keeps its texture + colour, gets a soft emissive glow); a band of "well" wall up to it wears the ceiling material; 15 beams (3 long, 2 cross, 4 diagonal braces, 6 rim beams round the wall tops) in one group; 7 point lights under the lid in the glow colour.
- Dials: Beams match the ceiling / pick a colour · Beam depth · Glow · Glow colour · **Roof opens: beams fade too / beams stay**. Roof (Sky → Roof, or a "sky opens" trigger) still works: ceiling + band + lights fade; beams fade or stay. `CORE.SKYHOOKS` (new) lets add-ons follow `skyK` the moment it moves (the published room may stop drawing frames once a fade ends).
- Open Space: "no ceiling" note, builds nothing. Bake carries only add-ons that are on (t112 checks beams yes / carved no).
- Tests: **t112 12/12**; t47, t83, t101, t103, t105, t106, t108, t110, t111 pass.

## v65. `trio-builder-admin-site-v65.zip`, admin md5 `6a9a3c05288271e229b4af0877ee2af7`.
- **Windows that open on a trigger — fade, like the roof** (Adam: "preset a window and then have it open upon a collection of an Easter egg"; "keep it uniform" → fade). Windows tab → cut window → **At the start: open / closed · opens on a trigger** (`cut.closed`). Fans see plain wall (pane wears the wall's own material; the frame is hidden too and fades in with the opening); the builder shows a faint 45% ghost so you can still work on it.
- Trigger target **"window · wall N"** (The room group; only windows set to closed) with **opens / closes**, fade + after like every action. Fires on tap, on collecting / closing the model's egg (v58 path), or when its song plays. "reset the room" closes it again.
- Engine: `CORE.winPane` (ShapeGeometry of the cut, wall-uv, child of the wall, `onBeforeRender` copies the wall material), `CORE.WINPANES`, `CORE.winK(key,v)` (0 closed → 1 open); `trigAct` handles `t:'win:wallN'`; `trigReset` closes all; `uncutWindow` removes the pane.
- Tests: **t111 8/8**; t47, t83, t84 (load timeout raised), t87, t91, t94–t96, t101, t102, t108, t110 pass.

## v64. `trio-builder-admin-site-v64.zip`, admin md5 `27b04ebf5cac41b3b016ee13083a06a1`.
- **Ceiling textures** (Adam: "the ceiling needs to have the same texture model as the floor"). Room tab → Textures → **Ceiling**: original (default = as before: concrete, or plain when walls are plain) · concrete · brick · metal · cracked · peeling paint · glossy · plain. Data `M.ceilTex` (null = original); `moodPacks` includes it so the bake carries the pack. Glossy ceiling gets the reflection world; works with the v62 ceiling colour. The old Textures → "Ceiling on / open sky" row is gone from Textures — the **Roof** switch in the Sky section does that. Not shown in Open Space (no ceiling).
- **Rule from Adam (10/10):** every new feature is standard in every editor unless he says it's an add-on.
- Tests: **t110 8/8**; t47, t83, t106–t109 pass.

## v63.2. `trio-builder-admin-site-v63.2.zip`, admin md5 `09651a6ee175d5a632bc255498381c5f`.
- **Pictures hang over the carve** (Adam: "the carve should still be there, but the picture's hung over it"). In `lib/addons/carved.js`, `hang(H,X)` runs every 12 frames: any visible top-level scene object (not walls/floor/ceiling/lights) within 0.9 m in front of a carved wall gets its box sampled against that wall's carve height (`X.walls[i].prot(x,y)`) and floats out along the wall's normal just far enough (+3 cm). Its own spot is kept in `userData._cvB` (a move by its owner = new spot); off/re-carve puts everything back. Works in the builder and the published room.
- Tests: t108 now 17/17 (tiles float out; all back when off). t47, t83, t94–t96, t107, t109 pass.

## v63.1. `trio-builder-admin-site-v63.1.zip`, admin md5 `0dc622658c5c9170c9d008e5e105ce1c`.
- **Fix: editor froze after v62's Colour** (Adam: every click opened the colour picker, even after reload). The hidden `<input type=color>` in each "+ any" chip was `position:absolute; inset:0`, but `.stsw label.any{all:unset}` out-ranked `position:relative`, so the invisible picker covered the whole page. Now `.stsw label.any{position:relative;overflow:hidden}` + the input sized to the chip. Builder only — published rooms never had it.
- Test **t109** (real mouse clicks + drag across swatches; v63 fails 1/5, v63.1 passes 5/5). t107, t108, t47 pass.

## v63. `trio-builder-admin-site-v63.zip`, admin md5 `e3bd74187967cd0d94adab8aec5563d2`.
- **Add-ons drawer + first add-on "Carved line"** (plan `claude/trio-builder-addons-plan-2026-10-10.md`; mocks `mock/addons/panel.html?v=addons`, `mock/liquid/`). Adam: for the artist's liquid room; "the main editor should stay the main editor".
- Rail: new **add-ons** tab (Mood Room + Open Space only; not Event / Room Space). Section 'Add-ons' → cards; Carved line: on/off switch, **Height · Wave · Depth · Neon colour · Neon glow · With music still/pulses**. Open Space shows "no walls to carve".
- Architecture: each add-on is its own file `src/lib/addons/<key>.js`, inlined as `<script data-addon="<key>">` after hexfx; it registers `HEXCORE.ADDONS[key]={name, defaults, apply(H,cfg,M), remove(H)}`. `CORE.applyAddons(H,M)` runs at the end of `applyMood` (after applyOpen). Data `LOOK.mood.addons[key]` → bakes with `mood`. **Bake strips every `script[data-addon]` the room doesn't switch on.**
- Carved line engine: per wall a "band" skin (child of the wall, PlaneGeometry ~16 seg/m × 60, wall-local, uv = the wall's own so art / window holes line up; shares `w.material` (onBeforeRender keeps it synced) → texture + colour + gloss match). Profile: soft roll above the line, small lip below, channel at the line; flat at band edges and fading into each corner (1.4 m). Line height = crest(world angle) so it flows round the room. Neon = 3 tubes (core toneMapped:false + 2 additive halos) + one PointLight per wall; pulses with the track's bass (analyser) or breathes slowly with no music. Walls never change (t108 checks geometry/positions).
- Known: photo/video tiles hanging over the line get covered by the roll — move them or change Height.
- Tests: **t108 15/15**; t47, t83, t94–t107 pass.
- Rollback: v62 zip / `backups/src-v62`.

## v62. `trio-builder-admin-site-v62.zip`, admin md5 `dd955a04eaecb0ea96c98d88f1e066fc`.
- **Colour (core, Mood Room + Open Space)** — first step of the one-engine + add-ons plan (`claude/trio-builder-addons-plan-2026-10-10.md`; mock `mock/addons/panel.html?v=colour`). Room tab → Textures → **Colour**: Walls · Floor · Ceiling (Open Space: Walls · Floor), each "original" (default) / 7 swatches / "+ any"; **all the same / each on its own**. Data `M.color={walls,floor,ceil,same}` (null = original) → bakes with `mood`.
- Engine: `CORE.moodColor`, `CORE.tintFor`; `moodTex` computes each colour texture's average brightness and a grey "detail" copy evened out round it (`userData.avg`, `userData.detailTex`); a coloured surface wears the detail copy × colour×2, so glossy/concrete/brick all read true to the picked colour and keep their grain. Art on a wall is never tinted. Ceiling colour now set in `moodSync`.
- "original" = exactly v61 colours (t107 compares against the v61 build) → Knocked Loose unchanged.
- Tests: **t107 10/10**; t47, t83, t99, t101, t95, t102, t103–t106 pass.
- Rollback: v61 zip / `backups/src-v61`.

## v61. `trio-builder-admin-site-v61.zip`, admin md5 `5ef57a7e3fd2df5b8b2b8c5811cf4149`.
- **Sky + Sky glow in the Mood Room too** (Adam: "those lights are no longer in the mood room… we should be able to choose the sky no matter… mood room or open event space"). Room tab → **Sky** section (Mood Room): Roof on / open sky · Sky night (original, default) · galaxy · day · my own image · **Sky glow on · breathing lights / off · just stars** (night only). Open Space keeps its Open space section with the same controls + Below.
- Engine: sky moved out of `applyOpen` into shared `CORE.skyParts / applySky / skyLight / skySea / skyCfg` (Mood Room reads `M.sky`, Open Space `M.open`). `skyK` drives stars/aurora/sun for the roof opening; a closed roof doesn't draw the sky (unless a cut window looks out). Changing the Roof setting resets a trigger-opened sky. `openWall` resets a stray ghost opacity.
- Tests: t106 8/8 (new), t105 8/8, t104 7/7, t103 10/10, t101 12/12, t83 21/21, t47 ALL PASS, t94–t99, t102. t91 9/10 and t100 6/7 fail the same way on v60 in today's slow sandbox (timing, not v61).
- Rollback: v60 zip / `backups/src-v60`.

## v60. `trio-builder-admin-site-v60.zip`, admin md5 `13a97b3d75c012f6016e01425494a57a`.
- **Open Space skies** (Adam: loved galaxy + ocean; day clouds redone "more ethereal and photorealistic"; "keep the original sky as an option, always"). Mock `mock/open/sky.html`.
- Room tab → Open space: **Sky** night (the original — default, always there) · galaxy · day · my own image (+ a 360° 2:1 picture row); **Below** void · ocean · cloud sea. Sky glow switch shows only for night. Stored `open.sky`, `open.below`, `open.skyImg` (asset id; baked into `payload.assets`; `CORE.SKYURL` resolves id → url in builder and bake).
- Engine: one sky sphere (r 880, `CORE.openSkyMat`, shader `SKYFS`: mode 0 night/1 galaxy/2 day/3 image/4 night-env, `below` cloud sea) + image sphere (r 900, repeat.x −1) + ocean (5000² plane at y −14, metal .08 rough, cube map of the sky via `CORE.openSea`, 256² procedural ripple normals drifting) + day sun DirectionalLight. Camera far → 2000 in Open Space. Night shows the shell's dome/stars/aurora; other skies hide them. Day sky ×.78 (halo + ACES brighten it). Fog colour per sky.
- Day clouds: per-pixel deck (plane 300, domain-warped fbm 5 oct + detail, self-shadow toward the sun, silver lining, horizon haze); cloud sea below (plane 140), moonlit tint for night/galaxy/image.
- Note: the planned "sets float free" build is now **v61**.
- Tests: **t105 8/8**; t103 10/10, t104 7/7, t83 21/21, t47.
- Rollback: v59.1 zip / source.

## v59.1. `trio-builder-admin-site-v59.1.zip`, admin md5 `ce8ca75be6dac40faaf1e6cc095c685e`.
- Adam: "accidentally turned the walls on and can't turn them off"; wants a glossy/shiny texture; wants to turn off the breathing sky glow ("just stars").
- Room tab → Open space: **Sky glow** on / off · just stars (`open.glow`), **Walls** show walls with art / all invisible (`open.walls='none'` hides art walls too; builder keeps the faint ghost), **Roof** open sky / on (same as Textures → Ceiling).
- New pack **glossy** (`gloss_*`, polished dark stone, rgh ≈ .1) for walls/floor (all mood spaces). `moodPack` flags `gloss`; `moodSync` gives glossy surfaces `CORE.moodEnv(H)` — a PMREM of a dark purple sky with six light strips + a soft top light (built once) — envMapIntensity .9, floor roughness capped .55. Other packs unchanged (no env map).
- Tests: **t104 7/7**; t103 10/10, t99 4/4, t83 21/21, t47.
- Rollback: v59 zip / source.

## v59. `trio-builder-admin-site-v59.zip`, admin md5 `939019e22c1f8d77ec6df23cd7732cfb`.
- **Open Space — a 4th builder** (Adam after the UMG presentation: own "open space event space" type; floating platform in the night sky; **invisible walls** so chat/game boards, posters, tiles, wall art and windows keep their spots and float; distant islands yes; wall art floats). Concept: `claude/trio-open-platform-concept-2026-10-09.md`, mocks `mock/open/open.html`.
- `?space=open` → `OPENSP` (also `MOODSP`, so every Mood Room control works). Looks `open:`, autosave `auto:open`. Start screen card **OPEN SPACE** (NEW). Loading a mood look in the open builder (or vice versa) offers to switch. New looks: `mood.open = {rim:'#f5d400', islands:true}`, `mood.ceiling='off'`.
- Engine `CORE.applyOpen(H,M)` (called at the end of `applyMood`): glowing rim tube on the wall line (+ soft halo), rocky underside (jittered cone), purple glow + rising specks below, 5 distant floating islands (toggle), uplight beam cones (follow upK + colour), fog 70–520, stars + aurora + dome on. `CORE.openTick`: each wall → art = visible (floating panel) · builder = faint ghost (opacity .08, clickable) · otherwise invisible; walls still bound the walk. `skyK` leaves stars/aurora alone in Open Space.
- Room tab → **Open space**: Edge glow (colour), Floating islands on/off.
- Sets still show only through their window rect (Build 2 = v60: free set placement — distance out, height, curve, size).
- Tests: **t103 10/10**; t83 21/21 (now expects 4 cards), t47, t101, t96, t102 pass.
- Rollback: v58 zip / source.

## v58. `trio-builder-admin-site-v58.zip`, admin md5 `e3a39df9dc0e74a5e4afc9d652aba116`.
- **The room reacts when the egg is put away** (Adam: "upon closing the Easter egg… whether you close it or collect it… closing and collecting should do the exact same thing… play track, it goes away… then the room reaction happens").
- `CORE.EGGCTX` set by `openEgg`; `CORE.closeEgg(opt)` is the one exit: marks collected (`afterCollect==='gone'`) and calls `CORE.eggDone(id,H,song)` → fires the model's trigger (song-moments only on play). ✕, collect, tap-the-room (floating) and **play track** (now closes the card) all go through it. `{quiet:true}` from record360.
- v51.1's "glint fires the trigger on open" removed. Tapping the model itself while its egg is live (`CORE.eggLive`) opens the egg and the room waits; once collected/hidden, a tap fires the moment straight away.
- Tests: **t102 5/5**; t94 now 7/7 (waits while open, reacts on collect); t101 12/12; t47, t91, t93, t95, t96, t75 pass.
- Rollback: v57 zip / source.

## v57. `trio-builder-admin-site-v57.zip`, admin md5 `97c2eb7a6072306604daef9a4c9e25a1`.
- **Song → sky opens → visualizers wake** (Adam, for the 10/9 presentation: "uncover a song, start the song… music visualizer… the roof to go away"; mock `mock/song-sky-mock.html`; "we're just engaging the visualizers and vibes we already have preloaded"; song lives in the room for the demo).
- Egg pop-up block **+ song** (mp3/m4a asset, optional name) → "▶ play track" button. Plays through the shell's `#track` (analyser wired, so HEXFX rides the real song). `directBoot`/`hostBoot` keep `H._startAudio0`; `CORE.playSong` deletes the instance `play` no-op and calls it. Song keeps playing after the card closes.
- Trigger **Sets things off: when tapped / when its song plays** (`p.trig.when='song'`, only offered when the egg has a song). Song triggers are skipped by tap + glint; `CORE.songPressed(id)` fires them from the play button. "▶ play the moment" also plays the song.
- New trigger targets (Mood Room): **the sky (roof)** opens/closes (`CORE.skyK`: ceiling opacity → 0, stars + aurora fade in; fade 0 = hard cut) and **the visualizers** turn on/off (`CORE.vibeK` → `HEXFX.setK`, scales intensity + hides at 0). Vibe tab (Mood Room): **Visualizers start: on / off · waits** (`fx.start='off'`; builder shows them at 30%). Reset puts roof, visualizers and song back.
- Tests: **t101 12/12** (vibe start, faint in builder, song block, sky/visualizer actions, play the moment, reset, published: waits, egg alone doesn't fire, play track → song + sky + visualizers, stars). t47, t91 10/10, t94 6/6, t95 10/10, t83 21/21 (now closes the builder page before the published one).
- Rollback: v56 zip / source.

## v56. `trio-builder-admin-site-v56.zip`, admin md5 `7c5a90e5f659d4ad0105c1bca49292e5`.
- **Free recording ("● record") in the record pill** (fan preview / `?record`; mock `mock/free-record-mock.html`, Adam: "everything on screen is fine", "glow ripple", "love it"). Records the whole tab as you play, in bursts: `getDisplayMedia` (preferCurrentTab, Chrome asks "Share this tab" once per burst) → `MediaRecorder` (H.264/AAC MP4 when Chrome supports it, else WebM; bitrate ≈ 10 bits/px, 16–80 Mbps; tab audio included). 3-2-1 countdown (not in the clip), then the pill hides, the arrow becomes a glowing ring (`#hexRing`, `html.hexrecing *{cursor:none}`) with a ripple on every click (`.hexRip`); **Esc** stops (or Chrome's "stop sharing"); `<title>-clip-N.mp4` downloads; everything restored.
- Clip shape = the browser window's shape.
- Tests: **t100 7/7** (pill has both buttons; ring on, pill hidden, arrow hidden; ripple; Esc → download; real video; restored; no errors). The sandbox has no screen share, so the test stands in the room canvas stream for Chrome's tab share — the real "Share this tab" prompt is untested here. t47, t97 9/9, t98 3/3.
- Rollback: v55 zip / source.

## v55. `trio-builder-admin-site-v55.zip`, admin md5 `c66966a4b151ff8fd9d1982e76432f2b` (2.98 MB — texture library grew).
- **Two new Mood Room texture packs: Cracked + Peeling paint** (Adam: "is there like a crack texture"; mock `wall-textures-mock.png` / `wall-textures-new-closeup.png`, "great! lets build that in").
- Room tab → Textures → Walls / Floor now: concrete · brick · metal · **cracked** · **peeling paint** · plain. Keys `cracked`, `paint`. Files `src/assets/mood/{cracked,paint}_{col,nrm,rgh}.jpg` (1024², procedural, tileable). Generator: `moodlab/gen_tex2.py <outdir>` (cracked = warped periodic Voronoi cracks that run out + thinner branches, grime along cracks; paint = charcoal paint ~74% coverage with ragged multi-scale chips showing concrete). Existing rooms unchanged; a bake carries only the packs it uses.
- Tests: **t99 4/4**. t47 ALL PASS.
- Rollback: v54.1 zip / source snapshot.

## v54.1. admin md5 `e773a9c19f01b3efcb08e6f70b987957`.
- **Record 360 from "preview as a fan"**: preview blob HTML gets `window.HEXRECORD=1` (written `'<scr'+'ipt>'` — a literal closing script tag inside the inlined builder JS breaks the page); record boot checks `window.HEXRECORD || ?record`. t98 3/3.
- If Adam doesn't see the pill: he's on an old builder — hard refresh (Cmd+Shift+R) after uploading v54.1+.

## v54. admin md5 `9e9b8decde6befde2fc669f4ea1205d5`.
**Record 360** — HD/4K clip of the room turning one full circle, no screen capture (mock `mock/record-mock.html`).
- Pill bottom right: **HD / 4K**, **10 / 20 / 30 s**, **record 360** → camera turns once (linear, loops) from where you stand → `<title>-360-hd.mp4`.
- Engine: `CORE.record360` — frame-by-frame virtual clock (overrides `performance.now`/`Date.now`/`requestAnimationFrame`), renderer resized at pixel ratio 1, yaw driven, videos seeked per frame, WebCodecs H.264 (VP9 fallback) 60 fps; `CORE.mp4Mux` own MP4 writer; `CORE.recUI` pill. t97 9/9. Not yet confirmed on Adam's Mac Chrome.

## v53. admin md5 `119f10b5d05ee48a8daea9c728cfcacb` — **After collect: glint goes away / stays** (`egg.afterCollect`; `CORE.EGGGONE`). t96 7/7.
## v52. admin md5 `b02bcd5baa70be92ce9dde76678aea0e` — trigger **egg appears / egg hides**; **Egg at the start: showing / hidden · waits** (`CORE.EGGK`, `eggVis`). Needs "Egg at the start → hidden · waits" on the object; "appear" ≠ "egg appears". t95 10/10.
## v51.1. admin md5 `ae51c4e27f416312e7d8bc2578dd743c` — glint tap fires the model's trigger (one tap = one moment, `CORE.TRIGLAST`); egg button says **collect**. t94 6/6.
## v51. admin md5 `ea5dd1d951ececa34402b935b0e7ae57` — **Floating Easter egg + per-artist pop-up colours** (`LOOK.ui.eggStyle` → `bake.ui.eggStyle`; `CORE.EGGSTYLE`, `eggFloatTick`, `eggAnchor`; floating mode doesn't sleep the room). t93 14/14.
## v50. admin md5 `08a5e126279b6bd28dc56219c50af9c3` — room triggers reach set models (`CORE.SETG`, `trigGroups`); set start states; tab no longer jumps to Windows; "show editor" pill. t92 11/11.
## v49.1. admin md5 `3eb37738da10837ca5a250c3e6b04f70` — hidden-at-start shows as a ghost in the builder (`CORE.ghost`). t91 10/10.
## v49. admin md5 `7a6c89a6805bfbf994e85f2c987aeeb1` — **Triggers** (`p.trig={on,mode,acts:[{t,w,fade,delay}]}`; switch glint; glow on/off, appear/disappear, uplights; once/flips; play/reset) + v48 (key art only with the marquee; Board colours `boards.theme`; remove picture).
## v47. admin md5 `3090de0b335fd25851004569ab466cda` — Sign the wall (builder demo, never baked). t89 7/7.
## v46.1. admin md5 `e54c12b5f9355f9dd9758685b6a43145` — set models `· height`.
## v46. admin md5 `1e301a6e10872a8f07261a248be7414a` — Lights out for sets (`st.dark`).
## v45.1. admin md5 `9e99000252bd6a8c606758723398f007` — set model size max ↑; ceiling on the corners.
## v45. admin md5 `ab8983b28ffd62c881f256af3135190b` — glow on set models (inward SpotLight).
## v44. admin md5 `b7d24f47a48651832fdcce6a1abcb565` — glow on any model (`p.glow`, `CORE.glowApply`).
## v43.1. admin md5 `987e052ce1018f2d506005a777027040` — lit/unlit no longer lights a Mood Room (`CORE.MOODON`).

## Side work 10/5–10/6
- Knocked Loose tutorial card mock (`mock/kl-tutorial-mock.html`): "WELCOME", joystick row, orbs row, "there are three", yellow LET'S GO; optional counter "ORBS 0/3 → ROOM LIT".
- A baked room HTML deploys on its own: rename to index.html, drag the folder into Netlify.

## Next (queued)
- Triggers, later: "when the music starts"; open a window; ceiling open / room light; maybe "when collected" as a trigger.
- Real collectible system behind "collect" (Adam: not yet).
- Floating eggs / colours for Event Space + Room Space if Adam wants them there.
- Sign the wall, live: handoff spec for the play-site thread.
- Uplight behaviours, phone quality; more packs (wood, tile) or upload-your-own maps.

## How to rebuild from "2 Source code"
    cd trio-builder-source
    python3 tools/build.py                 # → dist/trio-builder-admin.html (+ local + room variants)
    python3 -m http.server 8765 --bind 127.0.0.1
    node tests/t47-hex-regression.js       # the hexagon must never change
Package: zip `_headers` (from any shipped zip) + `dist/trio-builder-admin.html` renamed `index.html`.
Rules: never touch the TrioWebPortal folder (read only); the room never talks to a database; never share the Supabase service_role key; don't touch master-stripped.html.
