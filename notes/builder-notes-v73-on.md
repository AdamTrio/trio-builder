# Trio Builder notes, v73 onward (2026-10-16). CURRENT

v71–v72: `claude/trio-builder-notes-v71-on-2026-10-15.md`. v43.1–v70: `claude/trio-builder-v43.1-fix-2026-10-04.md` (rules, rebuild steps, banked items).

## v73 — CURRENT. `trio-builder-admin-site-v73.zip`, admin md5 `0843e8c12acb8a11ebe4348321b732e5`.

**Two kits in the map tray: Original kit + Realistic kit.** Adam: keep the original look "catalogued as its own kit"; the realistic look (Kit Lab v1, `trio-kit-lab-v1.html`, locked 10/16) is the new direction; a lo-fi kit stays an option per artist.

### Map tray
- A kit switch above Nature / City: **Original kit** (the 21 v72 pieces, tagged `kit:'orig'`) and **Realistic kit** (`kit:'real'`). It opens on Realistic.
- Your own pieces show in both.
- Sample town on the Realistic kit swaps in `C01R` / `N03R` where they exist.

### Realistic pieces (world.js, `W.KIT`)
- **`C01R` Road straight (RCRC)**:
  - textured asphalt sunk 15 cm; slab sidewalks; granite curbs and a stone edging at the nature edge;
  - worn paint lines (alpha); a manhole and a grate;
  - 2 lamps whose **bulb is the only glowing part** (`RM.glass`, toneMapped:false).
- **`N03R` Light forest (NNNN)**:
  - textured ground (grass, dirt, moss); bark trunks + branches (merged);
  - leaf-card crowns with normals bent outward (merged); 3 bushes; 3 mossy rocks;
  - grass tufts (60; 34 on phones).
- Same edges as the Original kit, so the two kits mix.
- Materials: `W.realMat()` (MeshStandard, colour + normal + roughness). `mergeByMat` now keeps UVs.

### Textures
- 18 WebP files in `src/assets/kit/`: colour 1024, normal 512, roughness 256, leaves / tuft / paint alpha.
- About **425 KB** on disk, **568 KB** inside a page (the Kit Lab's JPGs were about 2.4 MB).
- Made by `kitlab/gen_kit.py`, then a WebP conversion.
- `build.py` `kittex()` → `window.HEXKITTEX` (data-stage, builder only).
- The bake adds `mood.world.kittex` **only when a Realistic piece is on the map**. importBaked drops it from the look; `W.useKitTex()` reads it in a published world.

### Lamps
- `KITLAMPS[id]` = bulb positions while a piece is built. `syncTiles` places them per square into `X.lampPts`.
- One additive `THREE.Points` for every halo (`X.halos`).
- A **pool of 6 point lights** (4 on phones, `userData.wpool`, not faded by `gatherLights`) is moved to the nearest lamps every 250 ms.
  - Intensity: 2.6 at night, 0.6 by day; fades between 30 and 55 m.
  - The shader light count stays constant however many lamps there are.

### World section
- **Streets: dry / wet · shiny** (`M.world.wet`).
  - Wet: asphalt roughness .32, colour ×.62, envMap = `CORE.moodEnv`; slabs roughness .55.
- **Street lamps: on · bulbs glow / off** (`M.world.lamps`).

### Phones
- `W.LOW` = coarse pointer or a screen under 820 px: anisotropy 2, fewer tufts, 4 pool lights, softer wet reflections.

### Tests
- **t122 14/14**. Covers:
  - the two kits; Original keeps 21; Realistic has 2 with thumbnails;
  - sample town on Realistic joins; textures + UVs in the world;
  - lamps (pool lit, halos, bulb glow); wet; lamps off;
  - the bake carries kittex once (568 KB), an Original-only world carries none; published world textured and lit.
- t121 now picks the Original kit first.
- Full suite run: t47 ALL PASS. t120–t122 pass. Only the known old failures (t61, t77, t90; same on v70).

### Next (agreed)
- Build the rest of the Realistic kit in this style:
  - **Nature:** birch grove, wildflower field with fireflies, glowing mushroom ring, campfire clearing, stream with a bridge.
  - **City:** fountain plaza (lit water), neon street, bus stop corner, market stalls with string lights, basketball court, alley.
  - Plus Realistic versions of the remaining Original pieces.
- Then: "load once, reuse" hosting of kit textures (page thread), and a lower-res phone texture set if real phones need it.
- **Banked:** world lighting moods (mystical uplight vs. sunbeams through trees).


## Rule (Adam, 10/16): artist-specific world pieces are ADD-ONS
- Anything made for one artist (e.g. the KATSEYE building, Kit Lab `kitlab/katseye/`, `trio-kitlab-katseye.html`) is a **World add-on**, not part of the shared Original / Realistic kits.
- It works like room add-ons: its own file, switched on per world, and only carried in a bake when used.
- The KATSEYE building is the first add-on (ovals centred at 3.95 m). Built in v74.

## v74 — SHIPPED 10/16 (md5 `de121fe61d6fe06eb130415f7cdde1d3`)
- **Event searchlights** are a standard light in Lighting → "+ Event searchlight", every editor, placeable anywhere (hexcore `CORE.buildSearch/applySearch/searchBoot`, `L.search={speed,swing,tilt,len,base,start}`; controls: colour, brightness, sweep, swing, tilt, beam length, trailer, beam at the start, pulse; trigger target "the event searchlights" via `CORE.SEARCHK`). Beam only, casts no real light.
- **World add-ons drawer** + the first add-on, **KATSEYE building** (`src/lib/waddons/katseye.js`, `<script data-waddon>`; World → Add-ons → KATSEYE on; Models → "+ KATSEYE building"; solid, own DOOR_ (no generic doorway) links a room, Sign lit/off; bake keeps an add-on only when on/used).
- Tests: t123 21/21; full suite passes except the known t61, t77, t90 (same on v70). t91/t119 flaked under load, pass alone.
- Source: `backups/src-v74`. Zip: `trio-builder-admin-site-v74.zip`.

## Rule (Adam, 10/16): ALL add-ons live in the Add-ons tab
- Every add-on (room or world) is switched on in the **Add-ons** tab. Nothing lives in other sections.
- In a World, the tab shows only world add-ons (e.g. KATSEYE building). In a room (Mood Room / Open Space / Event Space), only room add-ons (Carved line, Beam ceiling…). Never mix.
- Next build (v75, waiting for Adam's go): move the KATSEYE switch from Room → World → "Add-ons · made for one artist" into the Add-ons tab, and hide the room add-ons there when in a World.

## LOGGED (Adam 10/16): can't drag the KATSEYE building
- Cause (found): `beginDrag` drags on a flat plane at the model's BASE (y=pos[1]). A tall model grabbed above eye level → the mouse ray points up and never meets that plane → no drag. Small models are always grabbed below the horizon, so they work. Arrow keys still nudge it (0.1 m a press).
- Proposed fix (waiting for go): drag on a flat plane at the height you GRABBED it (the hit point), nudged off eye level so it never runs parallel. Standard, all editors.

## LOGGED (Adam 10/16): Realistic road broken
- Tray picture is black: the thumbnail is shot before the kit textures finish loading (and then cached). Fix: re-shoot once textures load.
- Placed road shows the world floor through the middle: `roadReal` puts the asphalt at y −0.15, under the world floor. Fix: lift the road surface above the floor (sidewalks/curbs up with it).
- Proposed Realistic kit, two batches (waiting for Adam's pick/go):
  - Batch 1 (the joiners): City: road corner, T-junction, crossroads, cul-de-sac, crosswalk. Nature: meadow, dense forest, dirt path straight / corner / fork, pond. Plus the two road fixes.
  - Batch 2 (the showpieces): City: fountain plaza, neon street, bus stop, market stalls + string lights, basketball court, alley, parking lot, town edge. Nature: birch grove, wildflowers + fireflies, mushroom ring, campfire clearing, stream, rocks & hill.

## v75 — SHIPPED 10/16: Realistic kit batch 1 (md5 `c4aba1531a6a56bb6196100aace88bdf`)
- Fixes: road surface now sits ON the floor (asphalt y .02, raised sidewalks .15 with real curb sides via `slabPoly`); tray pictures wait for the kit textures (`W.texBusy/texReady`).
- New Realistic pieces: City — Crosswalk C13R, Road corner C02R, T-junction C03R, Crossroads C04R, Dead end C05R (+ C01R rebuilt). Nature — Meadow N01R, Dense forest N04R, Dirt path N05R, Path corner N06R, Path fork N07R, Pond N10R (rim above the floor; water reflects the sky, slow ripple).
- New textures (kitlab/gen_kit2.py → src/assets/kit): dirt_col/nrm, flowers, fern, water_nrm (+~55 KB). Bake kit textures now 23 (646 KB).
- Sample town on the Realistic kit swaps every piece that has an R version.
- Pictures approved by Adam ("ok go"). Tests: new t124 14/14, t122 15/15; full suite passes except the known t61, t90. Source: backups/src-v75. Zip: trio-builder-admin-site-v75.zip.
- Next queued: drag fix for tall models (grab-height plane); move all add-ons into the Add-ons tab; Realistic kit batch 2 (showpieces).

## MOCK (10/17): coded houses with per-part colour + finish
- Lab: `kitlab/houses/houses.js` (TRIOHOUSE.build(type, look); types suburban, brownstone, cottage, modern, shop), `shoot.js` (street dusk/night + 4 looks), `panel.js` (picker panel mock). Pictures sent: houses-street-dusk/night.jpg, houses-same-house-4-looks.jpg, houses-picker-panel.png.
- Parts: walls {finish: siding/brick/stucco/stone/wood/paint, colour}, roof {shingles/metal/clay tiles/flat, colour}, trim, front door, window glow (on/off + colour), porch/garage/fence on/off, door links a room. Not built — waiting on Adam.
- Mock add (10/17, Adam asked): **Abandoned look** (`look.wear='abandoned'` in houses.js): faded/grimy colours (grime streaks + moss at the base), windows boarded or cracked-dark, one faint green glow, door ajar, sagging porch (a post gone), broken fence, dead flower boxes, faded torn awning, flickering broken shop sign, weeds, vines up the front, a dead tree. Pictures: houses-fresh-vs-abandoned.jpg, houses-abandoned-street.jpg (`kitlab/houses/spooky.js`).

## Adam 10/17: dead trees go into the kit packages (from the Abandoned mock) — add to Realistic kit batch 2.

## MOCK (10/17): media in the world (`kitlab/media/shoot.js`, picture world-media-ideas.jpg)
- 1 Jumbotron on truss towers + speaker stacks over a plaza crowd · 2 Projection onto a building facade (projector on a tripod) · 3 Floating hologram cube (4 screens) with a light column · 4 Drive-in screen with cars + string lights · 5 Water/mist screen over the pond · 6 The moon plays the video · 7 Giant fan-board wall (Adam's own board, embedded live — we only build the frame, never the board).
- Screen content in the mock = frames of the KATSEYE × TRIO teaser. Real build would reuse the v70 model-screen engine (clips, plays only in view). Not built — waiting on Adam's pick.

## SPEC (10/17): outside art-style kits — "Trio World Kit — Coded Kit Spec v1" (Claude Doc https://claude.ai/code/artifact/cbe4c3a1-d22a-4766-8379-2f5a095738ef)
- Contract: one file `trio-kit-<slug>.js` → `TRIOKIT.register({id,name,version,textures,pieces,props})`; pieces `{id:'<SLUG>-C01',name,family:'N'|'C',edges:'RCRC',size,build(g,K)}`; K = THREE, SQ, rnd, tex, mat, glow, uv, lamp, low, door. Harness + preview page: `kitlab/kitspec/preview.html` (tested). Edge profiles: R road 10 m @0.02 + 3 m sidewalks @0.15; C paving @0.15; N ground @0; P path 3 m @0.015. Budgets: 20k tris/piece, 10 materials, textures ≤800 KB, file ≤1.5 MB.
- TODO when a kit comes back: builder loader (`<script data-wkit>` + same TRIOKIT/K, kit tab beside Original/Realistic, K.lamp → KITLAMPS, props → Models with parts panel).
- Idea queued (Adam 10/17): a plane pulling a banner that plays a video (media-in-world list, #8).
- Mock #8 done (10/17): banner plane — red/white tow plane, 22 × 6.1 m waving banner playing the teaser (cropped to fit), rope bridle, flies across the coded-houses street. `kitlab/media/plane.js` (still + 192-frame flyover → banner-plane-flyover.mp4).
- Adam's picks (10/17): KEEP jumbotron (truss towers), drive-in screen, giant fan-board wall, banner plane, + NEW portrait tower (9:16 vertical screen on a pylon, two-sided; mock `kitlab/media/tower.js`, portrait-tower.jpg / portrait-towers-pair.jpg). DROP hologram cube, moon screen, building projection, water screen. Pond stays a plain nature tile.

## v76 — SHIPPED 10/17: BIG SCREENS (md5 `a8d4c3b3b6a0eec75aaf51459fb41da0`)
- New `src/lib/screens.js` (`<script data-screens>`, baked only when used): PRIMS `jumbotron` (16×9 m on truss towers, speaker stacks, deck), `ptower` (9:16 6.4×11.4 m on a pylon, two-sided via `SCREEN_BACK` userData.screenTwin), `drivein` (20 m 16:9 on posts, white frame), `fanwall` (16 m fan board drawn with CORE.drawFanBoard, sample posts in the builder, live from the page's `chat` rows via new `CORE.CHATFEED`; tap → `{trio:'open', board:'chat'}`). Flag `big:true` → offered in every editor; real size in a World, scale .25 in a room (.5 Open Space).
- hexcore screen engine: works on prims too; clips crop to fill (`userData.screenAspect`, set on loadedmetadata + tick fallback); play distance = max(18, 4.5 × screen size) (jumbotron 72 m); Tap opens: arcade / **fan board** / nothing; hidden World walls no longer block screen taps.
- Tests: new t125 26/26. Full suite: all pass except t61, t90 (known) and t77/t88/t100 (timing flakes — t88 and t100 fail the same on v75 now; t77 passed alone).
- Next: the banner plane (build 2 of the screens), drag fix for tall models, add-ons tab move, kit batch 2 (with dead trees), coded houses.

## KIT CHECK (10/17): two outside kits in `~/Downloads/Event Space/World Builder/` (checker: /home/claude/kits/check — spec harness + three r152, ray-sampled edges, determinism, weight)
- **Block Town** (`trio-kit-blocktown-v1.zip`): PASSES the spec fully. 26 tiles (10 city, 16 nature) + 18 props (6 buildings with parts/looks/doors, Video screen with SCREEN, trees incl. dead tree…). Every edge 100 %, nothing below 0 or past the tile, max 5,722 tris, 0 KB textures (vertex colours), 91 KB file, same every build, K.lamp/K.door per spec.
- **Neon City** (`trio-kit-cyber-package.zip`, id `cyber`): builds with no errors in our three r152 and looks right; 27 tiles + 10 props; textures 783 KB (limit 800), file 1.13 MB; max 10,922 tris; deterministic. Deviations to handle in our loader: `K.lamp(group, Vector3, {color})` and `K.door(group, {pos,w,h,ry})` instead of the spec's (x,y,z); props use `parts:[{label,mesh}]`, no looks; sets globals TRIOKIT_CYBER/TRIOKIT_QUEUE; package naming differs (no preview.html/pieces.png/README — HANDOFF.md + pictures/). Small fixes to ask for: N02 Neon park has 0.9 m turf/hedge bits on the E and W edge lines (74 % edge match); C24 glowing palm fronds overhang 1.4 m (limit 1 m); C27 has a planter in the south edge's last metre; N11 Seawall is a map-border piece (by design). Sunk details below 0 (C23, N01, N03, N05, N07) don't show the floor — OK.
- Not plugged in yet: needs the kit loader (`<script data-wkit>`, kit tabs, K adapter accepting both lamp/door shapes, props → Models with parts).

## v77 — SHIPPED 10/17: OUTSIDE KITS + map tray scroll (md5 `326339ab7895c5cc3544ba89a5bffb45`)
- **Map tray scroll fixed:** the room's window wheel handler was swallowing the wheel over the map (`e.target.closest('#wmap')` now skipped); `.wpcs` got `min-height:0` + `overflow-y:auto`; kit buttons wrap two by two.
- **Kit loader** (world.js `W.addKit`, `window.TRIOKIT.register`, drains `TRIOKIT_QUEUE`): kit pieces → `W.KIT` with their own kit tab; K per spec (rnd seeded by id, tex, mat, glow, uv, low) and `K.lamp`/`K.door` take both `(x,y,z)` and Neon's `(group, position)` forms; lamps → the light pool; materials with `userData.kitRole` get **Streets: wet**; tray pictures wait for `kit.ready()`.
- Kit props → PRIMS `kit_<id>` (world), listed under "<Kit> models" in Models; `CORE.build` now passes `p` to `def.build(p)`; panel: Look, each part's finish / colour / lights, extras (Neon: a colour per part mesh); a building with `K.door` gets `p.door` + solid + a doorway at that spot; a kit `SCREEN` plays clips (three UVs → `screenFlipY`).
- Files: `src/kits/trio-kit-blocktown.js` (v1), `src/kits/trio-kit-cyber.js` (v1.0.1 — Adam's fixes in: N02 edges, C24 overhang, C27 planter). Shell `{{TRIO:WKITS}}` → `<script data-wkit="…">` in the admin build only; a bake keeps a kit only when its pieces or models are used.
- Not yet: Neon's tile doorways (metro, alley, arcade, lobby, shrine) can't link rooms — only models have doors so far.
- Tests: new t126 23/23; t122/t125 updated (four kit tabs; video waits for the slower sandbox). Full suite: known t61, t90 + flaky t77/t88.

## v77.1 — FIX 10/17: Block Town black + Jumbotron clips
- **Block Town black:** world.js `mergeByMat` dropped each piece's vertex colours when tiles were merged for the map (Block Town paints with vertex colours, no textures) → pieces rendered black. The merge now keeps the `color` attribute (white for pieces without it).
- **Clips not playing on screens:** the screen `<video>` was never attached to the page, so some browsers (Safari/Chrome power saving) won't start it. It's now parked off-screen in the page (removed on stop); a clip that can't decode raises a builder tip + warning in the Screen section ("export it as MP4 (H.264)"). iPhone .mov (HEVC) is the usual culprit.
- Tests: t126 +1 (Block Town tiles keep colours), t125 +2 (video in page, error warns).

## v78 — SHIPPED 10/17: BANNER PLANE + big screens always loop + searchlight tips (md5 `07a91c1775a23f2a1c5d3acdeae38f46`)
- **Banner plane** (screens.js PRIM `bannerplane`, big): red/white tow plane flying laps around its spot (Loop small/medium/large = 38/64/100 m, Height low/mid/high = 20/30/44 m), pulling a 22 × 6.2 m (32:9) waving banner named SCREEN — clips play on both faces (`userData.screenDouble` → DoubleSide). Yellow ring + pin show the loop only while building. Room default loop small (scaled .25).
- **Big screens loop all the time** (`S.always` for big prims except the fan board) — no more stopping when far away or turned away.
- **Searchlight black circles:** the beam shader could go NaN at the tip on some GPUs (Mac) → black dots where the beam meets the sky. Values are now clamped.
- Tests: new t127 11/11; t125 updated (keeps looping turned away; removed the test's own reload nudge that stalled the tower clip). Quick check only: t47, t66, t67, t119, t120, t123, t125, t126 all pass.
- Lesson (Adam 10/17): quick checks for small builds — the full suite only for big system changes.

## v79 — SHIPPED 10/17: Realistic kit batch 2 · NATURE (md5 `f7b609fc5f44d4239618f52b4f9a3621`)
- Mock first (kitlab/gothic/pieces.js + shoot.js → kit2-gothic.jpg / kit2-gothicHigh.jpg / kit2-nature.jpg). Adam: "DIG IT GO" — split into 3 builds: 1 nature (this), 2 gothic, 3 coded houses.
- New pieces (world.js, kit 'real'): N11R Stream (WNWN), N12R Stream bend (WWNN), N13R Stream pool (WNNN — a stream's end), N14R Flower meadow, N15R Birch grove, N16R Autumn forest, N17R Boulder hill.
- New edge **W** (stream) — `W.MATCH.W='W'`, joins only another stream. Streams: raised banks (.32 m), muddy bed (.04), water at .2 — nothing under the floor; ground has the stream corridor cut out (`streamBed`, `bankStrip`).
- New materials in RMat: birch (drawn bark), birchleaf, autumn, autumn2, litter (drawn leaves, seeded). Smooth boulders (`boulder`, noise from position).
- Tests: new t128 9/9; t122 updated (14 nature). Quick check: t47, t121, t122, t124 pass.
- Neon City: send back to its builder — all signs must be language-neutral (no Asian/other non-English lettering; shapes, icons or short made-up English words). Add this rule to the kit spec. Idea: a "Custom sign" add-on model (type your own words, neon colour) — later.

## v80 — SHIPPED 10/17: Realistic kit batch 2 · GOTHIC (md5 `2412e2185f84a9e31c706da23f1ee55b`)
- Tiles (kit 'real', NNNN): N18R Dead forest, N19R Graveyard (headstones, crosses, tombs, iron fence with an opening, crypt, two gas lamps → light pool), N20R Swamp (dark still water in a low rim, dead trees, reeds, lilies). Low mist (merged soft planes, RM.mist).
- Models (Models → **Gothic models**, World only, PRIMS with `goth:true`): gchapel Chapel ruin (pointed doorway, rose window, side arcades, broken east end, rubble), ggate Iron gate, gfence Iron fence (8 m), glamp Gas lamp (flickers — `W.flick` in W.tick), gdead1/2/3 Dead / Twisted / Leaning dead tree.
- New RMat: deadbark, stone, darkstone, mud, moss, reed, swamp, mist. `deadTreeGeo(list,x,z,s,shape,maxD)`, `ironFenceGeo`, `gasLampGeo`, `headstoneGeo`, `mistGeo`.
- Tests: new t129 11/11; t122 → 17 nature. Quick check: t47, t121, t122, t128 pass.
- Vault: Mac link dropped at ship time — v80 (and its source) to be saved to the vault when the link is back.

## v81 — SHIPPED 10/17: HOUSES (build 3 of the Realistic batch 2) (md5 `9e84d5ddae5db615453fcce1656c3582`)
- New `src/lib/houses.js` (`<script data-houses>` after world.js; baked only when a house is used) — ported from kitlab/houses/houses.js. PRIMS `h_cottage`, `h_suburban`, `h_brownstone`, `h_shop`, `h_modern` (`house:type`), World only, own row **Models → Houses**.
- p.house = {look:'fresh'|'abandoned', walls:{t,c}, roof:{t,c}, trim, door, glow, porch, garage, fence, awning, sign}. Panel `houseControls`: Look, Walls (siding/brick/stucco/paint/stone/wood) + colour, Roof (cottage/suburban: shingles/tiles/metal) + colour, Trim, Front door, Window lights, Porch/Garage (suburban), Fence (cottage), Awning + Sign text (shop, upper-case, 18 max).
- Each house: solid, `DOOR_house` marker (ownDoor) at its front door → p.door on by default, opens a room. Seeded per prop id (same look every load).
- Bake: brick/concrete/paint packs (_col/_nrm) ride in mood.tex when houses are used; houses read textures from HEXMOODTEX or the published mood.tex.
- Tests: new t130 11/11; t126 now clicks Block Town's own "+ Cottage" (two cottages exist). Quick check: t47, t120, t126, t129 pass.

## v82 — SHIPPED 10/18: EMBER & CRYSTAL kit plugged in (md5 `e239a1ab6ea0e5ef21ebcbe98afdb2ff`)
- Adam's 3rd outside kit: `~/Downloads/Event Space/World Builder/Ember Cystal Kit/trio-kit-ember-v1.0.0.zip` → `src/kits/trio-kit-ember.js` (247 KB, id `ember`, 24 pieces: 10 C ruins + 14 N nature/paths/plain plots, 10 props with parts). Kit check on our three r152: all build, no errors; ground edges ±6–8 cm bumpy (fine). Its HANDOFF: N04 Ember river, C10 Chasm bridge, N02 Cliff edge are intended edge exceptions; tile doors (C03, C04, N03) not linkable yet.
- **Coloured lamps:** `K.lamp(group, pos, {color, tag})` now keeps the colour (and tag) → `X.lampPts` carry `.c` → the 6-light pool takes each lamp's colour, glow halos are vertex-coloured. (Ember: blue #3fb0ff, ember #ff4a1a, flame #ff8a3a.) Other kits unchanged (warm default).
- Fix: kit part labels had a stray leading space (" Stand") — `nice()` now only splits lower→Upper.
- Tests: new t131 12/12; t126 → five kit tabs. Quick check: t47, t121, t122, t126 pass.
- Spotted: Neon City update in the folder (`trio-kit-cyber-packageupdate.zip`, 10/18 00:11) — likely the sign-lettering fix; not plugged in yet (ask Adam).

## v83 — SHIPPED 10/18: window models can set things off (md5 `6d530a38e50e48cd801e2b2be264bfbe`)
- Adam: a model inside a window had an Easter egg switch but no actions. Now each window (set) model has **Tap sets things off** (same as room models: once / flips, + something happens, play the moment, reset).
- hexcore: set models act as pseudo-props `set:<model id>` (`CORE.setTrigList()` from `CORE.SETS`); trigWire taps hit their live copies (`CORE.trigGroups`); an egg on a window model sets its action off when closed (`trigPid` reads `<set>:m:<model>` egg ids); published rooms wire taps even with no room models (was returning early).
- stage: `trigControls` on a getter/setter wrapper of the set model; targets never include itself; `trigWho` counts window models.
- Tests: new t132 7/7. Quick check: t47, t72, t91, t92 pass.
- Also 10/18: Skate park spec written (Claude Doc "Trio World Kit — Skate Park brief + sunken pieces (Spec v1.1)", https://claude.ai/code/artifact/70fb6af4-9212-4958-a630-4aef44eb984d). Skate builder delivered SKATE-C04 Bowl with tunnel (1 square, 2.4 m deep) in World Builder Files/trio-kit-skate-C04; asked for a 2×2 SKATE-C11 too. Builder needs sunken support (floor hole + height walking) before plugging in.
- Website idea (Adam): landing hero = Trio logo glowing over a world that swaps art styles. Advice given: pre-rendered loop (same orbit in every world, logo lit in-scene, ripple swap), "step inside" loads live; waiting on the logo file for a test.

## v84 — SHIPPED 10/18: a hidden window model's Easter egg appears with it (md5 `fac8a03464c599253973bcdb06eaa6d3`)
- Adam: room model → its egg → a window model appears, but the window model's egg didn't. Cause: the egg glint/bubble were measured AFTER the hidden start shrank the model to 0.1 % → the glint sat at the model's feet (floor), the tap bubble was tiny.
- Fix: window models measure their egg before the hidden start; room models measure at full size too (`CORE.propEgg`). Glints carry `userData.host` and fade with their model's showK (published); `eggAt` ignores an egg whose model is hidden.
- Tests: new t133 7/7 (slow sandbox ≈1 fps → waits 7 s). Quick check: t47, t75, t76, t92, t95, t132 pass.
- Queued next (Adam said this goes under add-ons): Knocked Loose WORLD add-on = the Spray Park bowls (SKATE-C04 1×1, SKATE-C11 2×2, trio-kit-skate.js v0.2.0 in World Builder Files/trio-kit-skate) + sunken support (floor hole) + surface walking. Waiting on "go".

## v85 — SHIPPED 10/18: KNOCKED LOOSE world add-on (skate bowls) + sunken pieces + walking on the ground (md5 `6b8e883371c66ab0b22a8588928687c3`)
- Adam: the Spray Park bowls go under add-ons → **Knocked Loose**. New `src/lib/waddons/knockedloose.js` (`CORE.WORLDADDONS.knockedloose = {name, kits:['skate'], kitName}`), shell `<script data-waddon="knockedloose">`. Kit file `src/kits/trio-kit-skate.js` (v0.2.0, 1.0 MB: SKATE-C04 1×1 sink 2.25, SKATE-C11 2×2 sink 2.65). The map's kit tab for an add-on kit shows only when that add-on is on, named after the artist.
- **Add-ons tab in a World** now shows only world add-ons as cards (KATSEYE, Knocked Loose) — moved out of the World section (Adam 10/16 rule). Rooms unchanged.
- **Sunken pieces (Spec v1.1):** addKit keeps `sink` + `hole` (scaled SQ/16); `groundHoles` rebuilds the world floor as a ShapeGeometry with each sunken piece's outline cut out (rotated, 2×2 centred).
- **Walking on the ground (every World):** `heightMap(pc, parts)` measures each piece once (25 cm grid, upward faces only, skipping transparent/alphaTest materials) via a 1 m triangle bucket grid → list of surface heights per sample (HMAP). `CORE.groundStep` (nav move hook in hexcore) picks the highest surface within 0.42 m of your feet; a bigger step up or drop = wall (slides along it). `CORE.groundHere` settles you after a jump. Camera y = eye + smoothed foot. Hills, kerbs, bridges, steps, bowls.
- Tests: new t134 14/14 (steps down to −2.65, back up, lip stops you, eyes below deck, bake carries skate only). t123 now switches KATSEYE on in Add-ons. Quick check: t47, t120, t121, t122, t123, t124, t126, t128, t129, t130, t131 pass.

## v86 — SHIPPED 10/18: SIGN THE WALL goes live (room side) (md5 `6f31922ba80670ef3ba97e0b8e20e27d`)
- Adam: fans previewing saw no prompt to sign — the v47 sign wall was builder-demo only. Mock 1 (glowing pill) → Adam: no outline, no glow, solid lettering → mock 2 approved ("love it").
- hexcore: `CORE.SIGDEF` {plate, title 'SIGN THE WALL', sub, color '#f2efe6'}; `CORE.sigStrokes`, `CORE.sigCanvas` (title on top + signatures grid), `CORE.sigWallMesh` (builder + published share it), `CORE.sigLive(bake,H)` (after hydrateBoards): draws the wall, `CORE.SIGFEED` redraws from the page's rows, a tap on a signature → `CORE.sigCard`, elsewhere → `{trio:'open', board:'sign'}` (toast when not hosted). hostBoot: `{trio:'signatures', rows}` → `CORE.sigClean` (names 18 / lines 60 text only, pen #rrggbb else black, ≤60 sigs, ≤40 strokes × 300 pts, 0–1) → kept in `CORE.SIGROWS`.
- stage: Boards → Signature wall: Title on/off, Words (28, upper-case), Small line on/off, Title colour. Bake carries `payload.sigwall={on,wall,look,plate,title,sub,color}` — never the demo signatures.
- Portal hand-off: `claude/handoff-sign-wall-v1.md` (pad, wall_sigs/wall_sign/wall_view same pattern as the fan board, moderation, refresh).
- Tests: new t135 8/8; t89 updated (tap below the title; "sigwall" may now appear in the bake). Quick check: t47, t63, t83, t89, t118 pass.
