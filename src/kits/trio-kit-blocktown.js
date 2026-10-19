/* ===== Trio World Kit · Block Town · v1 =====
   Toy-block diorama style: chunky cubes, clean flat colours, banded tree crowns,
   grass tops over sandy dirt sides. No textures: every colour is a vertex colour,
   so a piece draws with one solid material, plus water and glow where it needs them.
   One call to TRIOKIT.register. No imports, network, timers, globals or page access. */
(function () {
'use strict';

const PI = Math.PI;
const ID = s => 'BLOCKTOWN-' + s;

/* ---------- palette ---------- */
const P = {
  grass: ['#7ccf4e', '#74c548', '#86d65a', '#7ccf4e', '#6fc244'],
  grassDk: ['#5fae45', '#57a33f', '#66b74b', '#5fae45'],
  speck: '#93dd66', lip: '#5fb043', dirt: '#dba86c', dirtDk: '#c8925a',
  path: ['#ecc98e', '#e2bc7e', '#e8c488', '#ecc98e'],
  road: ['#5a5d68', '#5e616b', '#575a64'],
  pave: ['#d2cdc4', '#c8c3ba'], curb: '#aaa59c',
  stone: ['#9c9a96', '#aaa7a2', '#8f8d89', '#b3b0aa'],
  bark: '#8a5a36',
  leaf: ['#7fe09a', '#2e8a52'], leafDk: ['#5cc77a', '#1f6e40'], gold: ['#ffd85a', '#ec962c'], autumn: ['#ffa05a', '#c8402c'],
  wood: '#b88a5a', wood2: '#c89a68', woodDk: '#7a5232',
  iron: '#3a3d48', bulb: '#ffe2a0', warm: '#ffcf7a',
  flower: ['#f8f4ec', '#f8f4ec', '#f26aa6', '#ffd84a', '#8fb8ff'],
  sand: '#dcc591', water: '#3d9ee0', foam: '#cfeefc'
};

/* ---------- deterministic hash (for ground colours) ---------- */
function h2(i, j, s) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function pick(arr, i, j, s) { return arr[Math.floor(h2(i, j, s) * arr.length) % arr.length]; }

/* ---------- the block maker: merges every cube of a piece into one mesh per material ---------- */
function maker(K) {
  const T = K.THREE, groups = new Map(), CC = Object.create(null);
  const V = new T.Vector3(), N = new T.Vector3();
  let frame = null, frameRy = 0, M = null;

  function rgb(c) { if (typeof c !== 'string') return c; let v = CC[c]; if (!v) { const t = new T.Color(c); v = CC[c] = [t.r, t.g, t.b]; } return v; }
  function mul(c, f) { c = rgb(c); return [c[0] * f, c[1] * f, c[2] * f]; }
  function mix(a, b, t) { a = rgb(a); b = rgb(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  function grp(key) {
    let G = groups.get(key); if (G) return G;
    let mat;
    if (key === 'v') mat = K.mat({ vertexColors: true, roughness: 0.86 });
    else if (key === 'w') mat = K.mat({ vertexColors: true, roughness: 0.12, transparent: true, opacity: 0.88 });
    else { const a = key.split('|'); mat = K.glow(a[1], +a[2]); }
    G = { mat, vc: key === 'v' || key === 'w', pos: [], nrm: [], col: [], idx: [] };
    groups.set(key, G); return G;
  }
  function quad(G, a, b, c, d, n, ca, cb, cc, cd) {
    const base = G.pos.length / 3, P4 = [a, b, c, d], C4 = [ca, cb, cc, cd];
    for (let i = 0; i < 4; i++) {
      const p = P4[i];
      if (M) { V.set(p[0], p[1], p[2]).applyMatrix4(M); G.pos.push(V.x, V.y, V.z); } else G.pos.push(p[0], p[1], p[2]);
      if (G.vc) { const q = C4[i]; G.col.push(q[0], q[1], q[2]); }
    }
    let nx = n[0], ny = n[1], nz = n[2];
    if (M) { N.set(nx, ny, nz).transformDirection(M); nx = N.x; ny = N.y; nz = N.z; }
    for (let i = 0; i < 4; i++) G.nrm.push(nx, ny, nz);
    G.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  /* f bits: 1 top, 2 +x, 4 -x, 8 +z, 16 -z, 32 bottom */
  function faces(G, f, x0, y0, z0, x1, y1, z1, ct, cs, cb) {
    if (f & 1) quad(G, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], ct, ct, ct, ct);
    if (f & 2) quad(G, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], cb, cb, cs, cs);
    if (f & 4) quad(G, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], cb, cb, cs, cs);
    if (f & 8) quad(G, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], cb, cb, cs, cs);
    if (f & 16) quad(G, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], cb, cb, cs, cs);
    if (f & 32) quad(G, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], cb, cb, cb, cb);
  }
  /* a box sitting on y0, centred on cx/cz. o: k (material key), f (faces), top (top colour), ao, rx/ry/rz (spin about its centre) */
  function box(cx, y0, cz, sx, sy, sz, color, o) {
    o = o || {};
    const G = grp(o.k || 'v'), c = rgb(color), ct = o.top ? rgb(o.top) : c;
    const ao = o.ao == null ? (sy >= 0.3 ? 0.78 : 0.94) : o.ao, cb = [c[0] * ao, c[1] * ao, c[2] * ao];
    let f = o.f == null ? 31 : o.f;
    if (o.f == null && y0 > 1.2) f |= 32;   // high things show their underside to a walker
    if (o.bot) f |= 32;
    let L = null;
    if (o.rx || o.ry || o.rz) {
      const cy = y0 + sy / 2;
      L = new T.Matrix4().makeTranslation(cx, cy, cz)
        .multiply(new T.Matrix4().makeRotationFromEuler(new T.Euler(o.rx || 0, o.ry || 0, o.rz || 0)))
        .multiply(new T.Matrix4().makeTranslation(-cx, -cy, -cz));
    }
    M = L ? (frame ? frame.clone().multiply(L) : L) : frame;
    faces(G, f, cx - sx / 2, y0, cz - sz / 2, cx + sx / 2, y0 + sy, cz + sz / 2, ct, c, cb);
  }
  /* draw fn() moved to x,y,z and turned by ry */
  function at(x, y, z, ry, fn) {
    const pf = frame, pr = frameRy;
    const m = new T.Matrix4().makeTranslation(x, y, z).multiply(new T.Matrix4().makeRotationY(ry || 0));
    frame = pf ? pf.clone().multiply(m) : m; frameRy = pr + (ry || 0);
    fn();
    frame = pf; frameRy = pr;
  }
  function wpos(x, y, z) { V.set(x, y, z); if (frame) V.applyMatrix4(frame); return [V.x, V.y, V.z]; }
  function lamp(x, y, z) { const p = wpos(x, y, z); K.lamp(p[0], p[1], p[2]); }
  function door(x, y, z, f) { const p = wpos(x, y, z); K.door(p[0], p[1], p[2], (f || 0) + frameRy); }

  /* the ground: a 32 x 32 grid of half-metre cells. fn(x, z, i, j) -> { h, c, s, w }
     h = top height, c = top colour, s = side style (grass, cliff, stone, curb, flat), w = water sits here */
  function grid(fn) {
    const NC = 32, S = 0.5, cells = new Array(NC * NC);
    for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
      const c = fn(-8 + (i + 0.5) * S, -8 + (j + 0.5) * S, i, j); c.i = i; c.j = j; cells[j * NC + i] = c;
    }
    const cell = (i, j) => (i < 0 || j < 0 || i >= NC || j >= NC) ? null : cells[j * NC + i];
    const G = grp('v'); M = frame;
    for (let j = 0; j < NC; j++) {
      let i = 0;
      while (i < NC) {
        const c = cell(i, j); let e = i + 1;
        while (e < NC) { const d = cell(e, j); if (d.h !== c.h || d.c !== c.c) break; e++; }
        const col = rgb(c.c);
        faces(G, 1, -8 + i * S, c.h, -8 + j * S, -8 + e * S, c.h, -8 + j * S + S, col, col, col);
        i = e;
      }
    }
    const D4 = [[1, 0, 2], [-1, 0, 4], [0, 1, 8], [0, -1, 16]];
    for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
      const c = cell(i, j);
      for (const d of D4) {
        const n = cell(i + d[0], j + d[1]);
        if (!n || c.h - n.h < 0.04) continue;
        side(G, d[2], -8 + i * S, -8 + j * S, n.h, c);
      }
    }
    return { cell };
  }
  function side(G, bit, x0, z0, lo, c) {
    const x1 = x0 + 0.5, z1 = z0 + 0.5, hi = c.h, s = c.s || 'flat';
    const q = (a, b, ct, cb) => faces(G, bit, x0, a, z0, x1, b, z1, ct, ct, cb);
    if (s === 'grass' || s === 'cliff') {
      const lip = Math.max(lo, hi - 0.22), L = rgb(c.lip || P.lip);
      q(lip, hi, L, L);
      let y = lip, k = 0;
      while (y > lo + 1e-4) {
        const y2 = Math.max(lo, y - 0.5);
        const base = rgb(s === 'cliff' ? pick(P.stone, c.i + k, c.j, 9) : (h2(c.i + k, c.j, 5) < 0.3 ? P.dirtDk : P.dirt));
        q(y2, y, base, y2 <= lo + 1e-4 ? mul(base, 0.78) : base);
        y = y2; k++;
      }
    } else if (s === 'stone') {
      let y = hi, k = 0;
      while (y > lo + 1e-4) {
        const y2 = Math.max(lo, y - 0.5), base = rgb(pick(P.stone, c.i + k, c.j, 11));
        q(y2, y, base, y2 <= lo + 1e-4 ? mul(base, 0.8) : base);
        y = y2; k++;
      }
    } else {
      const base = rgb(s === 'curb' ? P.curb : c.c);
      q(lo, hi, base, mul(base, 0.82));
    }
  }
  /* water surface over every cell flagged w, merged along each row */
  function water(g, top) {
    const G = grp('w'); M = frame; const col = rgb(P.water);
    for (let j = 0; j < 32; j++) {
      let i = 0;
      while (i < 32) {
        if (!g.cell(i, j).w) { i++; continue; }
        let e = i + 1; while (e < 32 && g.cell(e, j).w) e++;
        faces(G, 1, -8 + i * 0.5, top, -8 + j * 0.5, -8 + e * 0.5, top, -8 + j * 0.5 + 0.5, col, col, col);
        i = e;
      }
    }
  }
  function finish(g) {
    groups.forEach(G => {
      if (!G.idx.length) return;
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(G.pos, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(G.nrm, 3));
      if (G.vc) geo.setAttribute('color', new T.Float32BufferAttribute(G.col, 3));
      geo.setIndex(G.idx); geo.computeBoundingSphere(); geo.computeBoundingBox();
      g.add(new T.Mesh(geo, G.mat));
    });
  }
  return { T, K, rgb, mul, mix, box, at, lamp, door, grid, water, finish, glow: (c, s) => 'g|' + c + '|' + (s == null ? 1.6 : s) };
}

/* ---------- ground cells ---------- */
function gcell(i, j, pal, speck) {
  pal = pal || P.grass;
  let c = pick(pal, i >> 1, j >> 1, 1);
  if (h2(i, j, 7) < 0.14) c = speck || P.speck;
  return { h: 0.01, c, s: 'grass' };
}
function pcell(i, j) { let c = pick(P.path, i, j, 2); if (h2(i, j, 8) < 0.08) c = '#f4dcaa'; return { h: 0.015, c, s: 'flat' }; }
function rcell(i, j) { return { h: 0.02, c: pick(P.road, i >> 1, j >> 1, 3), s: 'flat' }; }
function scell(i, j) { return { h: 0.15, c: ((i >> 1) + (j >> 1)) % 2 ? P.pave[0] : P.pave[1], s: 'curb' }; }
function ringCell(x, z, i, j) { const r = Math.floor(Math.hypot(x, z)); return { h: 0.15, c: r % 2 ? '#d8d2c6' : ((i + j) % 2 ? '#c6c0b4' : '#cbc5b9'), s: 'curb' }; }

/* ---------- little things ---------- */
function crown(B, x, yb, z, w, ch, top, bot) {
  for (let k = 0; k < 5; k++) {
    const f = 30 | (k === 4 ? 1 : 0) | (k === 0 ? 32 : 0);
    B.box(x, yb + k * ch / 5, z, w, ch / 5, w, B.mix(bot, top, k / 4), { ao: 1, f });
  }
}
function tree(B, K, x, z, o) {
  o = o || {};
  const y = o.y || 0, h = o.h || 4.5, w = o.w || 3.2, ch = o.ch || w * 1.35;
  const top = o.top || P.leaf[0], bot = o.bot || P.leaf[1], bark = o.bark || P.bark, bark2 = B.mul(bark, 0.82);
  B.box(x, y, z, 0.8, h, 0.8, bark, { f: 30 });
  B.box(x, y, z, 1.3, 0.5, 1.3, bark2);
  B.box(x + 0.85, y, z + 0.1, 0.7, 0.22, 0.4, bark2);
  B.box(x - 0.15, y, z - 0.85, 0.4, 0.22, 0.7, bark2);
  B.box(x + 0.42, y + h * 0.42, z, 0.1, 0.5, 0.3, bark2, { ao: 1 });
  const cy = y + h - 0.6;
  crown(B, x, cy, z, w, ch, top, bot);
  crown(B, x + w * 0.42, cy + ch * 0.12, z + w * 0.22, w * 0.55, ch * 0.55, top, bot);
  crown(B, x - w * 0.38, cy + ch * 0.4, z - w * 0.28, w * 0.5, ch * 0.45, top, bot);
  crown(B, x + w * 0.1, cy + ch - 0.35, z - w * 0.1, w * 0.45, ch * 0.3, top, bot);
  const arms = o.arms == null ? 1 : o.arms, D = [[1, 0], [0, 1], [-1, 0], [0, -1]], s0 = Math.floor(K.rnd() * 4);
  for (let a = 0; a < arms; a++) {
    const d = D[(s0 + a * 2 + (a > 1 ? 1 : 0)) % 4], ah = y + h * (0.42 + 0.14 * a), L = 1.5;
    const ex = x + d[0] * (0.4 + L), ez = z + d[1] * (0.4 + L);
    B.box(x + d[0] * (0.4 + L / 2), ah, z + d[1] * (0.4 + L / 2), d[0] ? L : 0.38, 0.38, d[1] ? L : 0.38, bark);
    B.box(ex, ah, ez, 0.38, 1.2, 0.38, bark);
    crown(B, ex, ah + 1.0, ez, 1.7, 1.8, top, bot);
  }
  if (!K.low) for (let k = 0; k < 4; k++) B.box(x + (K.rnd() - 0.5) * w * 0.85, cy - 0.4, z + (K.rnd() - 0.5) * w * 0.85, 0.4, 0.4, 0.4, bot, { ao: 1 });
}
function deadTree(B, K, x, z, o) {
  o = o || {};
  const c = o.bark || '#7a6a5a', c2 = B.mul(c, 0.8), h = o.h || 4.4;
  B.box(x, 0, z, 0.8, h, 0.8, c);
  B.box(x, 0, z, 1.3, 0.45, 1.3, c2);
  B.box(x + 0.85, 0, z, 0.7, 0.2, 0.4, c2); B.box(x, 0, z - 0.85, 0.4, 0.2, 0.7, c2);
  [[1, 0, 0.55], [-1, 0, 0.72], [0, 1, 0.45]].forEach(([dx, dz, t]) => {
    const by = h * t, L = 1.8;
    B.box(x + dx * 0.9, by, z + dz * 0.9, dx ? L : 0.3, 0.3, dz ? L : 0.3, c);
    B.box(x + dx * 1.7, by, z + dz * 1.7, 0.28, 1.4, 0.28, c);
    B.box(x + dx * 1.7 + dz * 0.3, by + 1.3, z + dz * 1.7 + dx * 0.3, 0.2, 0.8, 0.2, c2);
    B.box(x + dx * 2.1, by + 1.0, z + dz * 2.1, dx ? 0.6 : 0.16, 0.16, dz ? 0.6 : 0.16, c2);
  });
  B.box(x + 0.15, h, z, 0.5, 0.6, 0.5, c2);
  B.box(x - 0.2, h, z + 0.1, 0.3, 0.9, 0.3, c);
  B.box(x + 0.45, 1.2, z + 0.1, 0.35, 0.12, 0.5, '#d8b88a', { ao: 1 });
  B.box(x + 0.45, 1.6, z - 0.15, 0.3, 0.1, 0.4, '#d8b88a', { ao: 1 });
}
function bush(B, K, x, y, z, o) {
  o = o || {};
  const pal = o.pal || ['#3f9a3a', '#4fae44', '#5bbd4c'], n = o.n || 6, sc = o.s || 1;
  for (let k = 0; k < n; k++) {
    const s = (0.5 + K.rnd() * 0.5) * sc;
    B.box(x + (K.rnd() - 0.5) * 1.2 * sc, y + K.rnd() * 0.35 * sc, z + (K.rnd() - 0.5) * 1.2 * sc, s, s, s, pal[k % pal.length]);
  }
  if (o.fl) for (let k = 0; k < 4; k++) B.box(x + (K.rnd() - 0.5) * 1.0 * sc, y + (0.55 + K.rnd() * 0.35) * sc, z + (K.rnd() - 0.5) * 1.0 * sc, 0.22, 0.22, 0.22, o.fl, { ao: 1 });
}
function flowers(B, K, x0, x1, z0, z1, n, y, pal, ok) {
  y = y || 0; pal = pal || P.flower; if (K.low) n = Math.ceil(n / 2);
  for (let k = 0, g = 0; k < n && g < n * 20; g++) {
    const x = x0 + K.rnd() * (x1 - x0), z = z0 + K.rnd() * (z1 - z0);
    if (ok && !ok(x, z)) continue;
    k++;
    B.box(x, y, z, 0.08, 0.3, 0.08, '#4f9a3a', { f: 30 });
    B.box(x, y + 0.28, z, 0.24, 0.16, 0.24, pal[Math.floor(K.rnd() * pal.length)], { ao: 1 });
  }
}
function tufts(B, K, x0, x1, z0, z1, n, y, ok) {
  y = y || 0; if (K.low) n = Math.ceil(n / 2);
  for (let k = 0, g = 0; k < n && g < n * 20; g++) {
    const x = x0 + K.rnd() * (x1 - x0), z = z0 + K.rnd() * (z1 - z0);
    if (ok && !ok(x, z)) continue;
    k++;
    const c = K.rnd() < 0.5 ? '#5fb043' : '#6cc04a';
    B.box(x, y, z, 0.12, 0.4, 0.12, c, { f: 31, ao: 0.8 });
    B.box(x + 0.14, y, z + 0.05, 0.1, 0.28, 0.1, c, { ao: 0.8 });
    B.box(x - 0.1, y, z + 0.12, 0.1, 0.22, 0.1, c, { ao: 0.8 });
  }
}
function mush(B, x, y, z, s, cap, glowKey) {
  s = s || 1; cap = cap || '#e04a3a';
  B.box(x, y, z, 0.2 * s, 0.4 * s, 0.2 * s, '#f4eee0');
  B.box(x, y + 0.38 * s, z, 0.62 * s, 0.24 * s, 0.62 * s, cap, glowKey ? { k: glowKey } : { ao: 0.85 });
  if (!glowKey) {
    B.box(x + 0.15 * s, y + 0.62 * s, z + 0.1 * s, 0.12 * s, 0.02, 0.12 * s, '#f6f2ea', { f: 1 });
    B.box(x - 0.14 * s, y + 0.62 * s, z - 0.12 * s, 0.1 * s, 0.02, 0.1 * s, '#f6f2ea', { f: 1 });
  }
}
function rock(B, x, y, z, s, moss) {
  s = s || 1;
  B.box(x, y, z, 1.0 * s, 0.6 * s, 0.8 * s, '#9a9a9a');
  B.box(x + 0.35 * s, y, z + 0.25 * s, 0.6 * s, 0.4 * s, 0.6 * s, '#a8a8a8');
  B.box(x - 0.1 * s, y + 0.6 * s, z - 0.05 * s, 0.6 * s, 0.25 * s, 0.5 * s, '#b2b0ac');
  if (moss !== false) B.box(x - 0.1 * s, y + 0.85 * s, z - 0.05 * s, 0.45 * s, 0.05, 0.35 * s, moss || '#7cbf5a', { ao: 1 });
}
function fence(B, x0, z0, x1, z1, o) {
  o = o || {};
  const y = o.y || 0, c = o.c || P.wood, c2 = o.c2 || P.wood2;
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0), L = Math.abs(alongX ? x1 - x0 : z1 - z0), n = Math.max(1, Math.round(L / 2));
  for (let k = 0; k <= n; k++) {
    const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    if (o.broken && k % 3 === 1) { B.box(x, y, z, 0.3, 0.5, 0.3, c); continue; }
    B.box(x, y, z, 0.3, 1.2, 0.3, c); B.box(x, y + 1.2, z, 0.38, 0.1, 0.38, B.mul(c, 0.85));
  }
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  [0.45, 0.85].forEach((yy, r) => {
    if (o.broken && r === 1) {
      B.box(mx - (alongX ? L / 4 : 0), y + yy - 0.3, mz - (alongX ? 0 : L / 4), alongX ? L / 2 : 0.15, 0.15, alongX ? 0.15 : L / 2, c2, alongX ? { rz: Math.min(0.25, 0.4 / (L / 4)) } : { rx: Math.min(0.25, 0.4 / (L / 4)) });
      return;
    }
    B.box(mx, y + yy, mz, alongX ? L : 0.15, 0.15, alongX ? 0.15 : L, c2);
  });
}
function lampPost(B, x, z, o) {
  o = o || {};
  const c = o.c || P.iron, gc = o.gc || P.bulb, on = o.on !== false && !o.ab, y = o.y || 0;
  B.box(x, y, z, 0.7, 0.35, 0.7, c);
  B.box(x, y + 0.35, z, 0.45, 0.25, 0.45, B.mul(c, 1.2));
  B.box(x, y + 0.6, z, 0.26, 4.4, 0.26, c, { f: 30 });
  B.box(x, y + 2.2, z, 0.38, 0.18, 0.38, B.mul(c, 1.2));
  B.box(x, y + 5.0, z, 0.5, 0.18, 0.5, c);
  B.box(x, y + 5.18, z, 0.62, 0.1, 0.62, c);
  if (on) B.box(x, y + 5.28, z, 0.5, 0.62, 0.5, gc, { k: B.glow(gc, 2.2) });
  else B.box(x, y + 5.28, z, 0.5, 0.62, 0.5, o.ab ? '#2a2f33' : '#cfd6dc');
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => B.box(x + a * 0.27, y + 5.28, z + b * 0.27, 0.08, 0.62, 0.08, c));
  B.box(x, y + 5.9, z, 0.78, 0.14, 0.78, c, { f: 63 });
  B.box(x, y + 6.04, z, 0.5, 0.14, 0.5, c);
  B.box(x, y + 6.18, z, 0.16, 0.22, 0.16, c);
  if (on) B.lamp(x, y + 5.6, z);
}
function pathLantern(B, x, z, o) {
  o = o || {};
  B.box(x, 0, z, 0.3, 2.3, 0.3, P.woodDk);
  B.box(x, 2.3, z, 0.4, 0.12, 0.4, P.woodDk);
  B.box(x + 0.45, 2.1, z, 0.9, 0.16, 0.16, P.woodDk);
  B.box(x + 0.8, 1.6, z, 0.04, 0.5, 0.04, P.iron);
  B.box(x + 0.8, 1.15, z, 0.36, 0.08, 0.36, P.iron);
  B.box(x + 0.8, 1.23, z, 0.28, 0.36, 0.28, P.warm, { k: B.glow(P.warm, 2) });
  B.box(x + 0.8, 1.59, z, 0.4, 0.1, 0.4, P.iron);
  if (o.mark !== false) B.lamp(x + 0.8, 1.4, z);
}
function bench(B, x, z, ry, o) {
  o = o || {};
  const w = o.wood || P.wood, m = o.metal || P.iron;
  B.at(x, 0, z, ry || 0, () => {
    [-0.75, 0.75].forEach(s => {
      B.box(s, 0, 0, 0.14, 0.45, 0.6, m);
      B.box(s, 0.45, -0.25, 0.14, 0.55, 0.1, m);
      B.box(s, 0.62, 0.02, 0.12, 0.08, 0.5, m);
    });
    for (let k = 0; k < 3; k++) B.box(0, 0.45, -0.2 + k * 0.2, 1.8, 0.07, 0.16, k % 2 ? B.mul(w, 0.9) : w);
    B.box(0, 0.7, -0.28, 1.8, 0.14, 0.07, w);
    B.box(0, 0.9, -0.28, 1.8, 0.14, 0.07, B.mul(w, 0.9));
  });
}
function planter(B, K, x, z, o) {
  o = o || {};
  const s = o.s || 1.6, c = o.c || '#b4b0a8';
  B.box(x, 0, z, s, 0.55, s, c);
  B.box(x, 0.55, z, s + 0.12, 0.1, s + 0.12, B.mul(c, 0.9));
  B.box(x, 0.55, z, s - 0.2, 0.06, s - 0.2, '#7a5232', { f: 1 });
  if (o.tree) tree(B, K, x, z, Object.assign({ y: 0.6, h: 3.2, w: 2.4, arms: 0 }, o.tree));
  else bush(B, K, x, 0.6, z, { s: s / 1.8, fl: o.fl || '#f26aa6' });
}
function log(B, x, z, ry, len) {
  len = len || 3;
  B.at(x, 0, z, ry || 0, () => {
    B.box(0, 0, 0, len, 0.6, 0.6, P.bark);
    B.box(len / 2 + 0.01, 0.05, 0, 0.04, 0.5, 0.5, '#e0b884', { f: 2 });
    B.box(-len / 2 - 0.01, 0.05, 0, 0.04, 0.5, 0.5, '#e0b884', { f: 4 });
    B.box(-0.3, 0.6, 0.05, 1.2, 0.06, 0.4, '#7cbf5a', { ao: 1 });
    mushTiny(B, 0.6, 0.6, 0.1);
  });
}
function mushTiny(B, x, y, z) { B.box(x, y, z, 0.1, 0.18, 0.1, '#f4eee0'); B.box(x, y + 0.16, z, 0.28, 0.1, 0.28, '#e04a3a', { ao: 1 }); }
function crate(B, x, y, z, fill, ry) {
  B.box(x, y, z, 0.7, 0.4, 0.5, P.wood, { ry: ry || 0 });
  B.box(x, y + 0.12, z, 0.72, 0.06, 0.52, P.woodDk, { ry: ry || 0, ao: 1 });
  if (fill) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b += 2) B.box(x + a * 0.2, y + 0.4, z + b * 0.1, 0.17, 0.15, 0.17, fill, { ao: 1 });
}
function barrel(B, x, z, c) {
  c = c || '#9a6a3e';
  B.box(x, 0, z, 0.75, 1.0, 0.75, c);
  B.box(x, 0.12, z, 0.8, 0.1, 0.8, P.iron, { ao: 1 }); B.box(x, 0.78, z, 0.8, 0.1, 0.8, P.iron, { ao: 1 });
}
function spots(K, n, ok, lim) {
  lim = lim || 6.6; const out = [];
  for (let g = 0; out.length < n && g < n * 40; g++) {
    const x = (K.rnd() * 2 - 1) * lim, z = (K.rnd() * 2 - 1) * lim;
    if (!ok || ok(x, z)) out.push([x, z]);
  }
  return out;
}

/* ---------- buildings ---------- */
function wr(B, c, ab) { return ab ? B.mul(B.mix(c, '#6e665a', 0.45), 0.86) : B.rgb(c); }
function resolve(meta, o) {
  o = o || {};
  const p = {}, e = {}, op = o.parts || {}, oe = o.extras || {};
  for (const k in (meta.parts || {})) {
    const d = meta.parts[k], q = op[k] || {};
    let fin = q.finish || (d.finishes ? d.finishes[0] : null);
    if (d.finishes && d.finishes.indexOf(fin) < 0) fin = d.finishes[0];
    p[k] = { finish: fin, colour: q.colour || q.color || d.colour, on: q.on == null ? d.on : !!q.on };
  }
  for (const k in (meta.extras || {})) e[k] = oe[k] == null ? meta.extras[k] : !!oe[k];
  const looks = meta.looks || ['fresh'];
  const look = looks.indexOf(o.look) >= 0 ? o.look : looks[0];
  return { p, e, ab: look === 'abandoned' };
}
/* walls of a w x d box with a surface finish on all four sides */
function body(B, K, w, d, y0, h, fin, col, trim, ab, o) {
  o = o || {};
  const base = wr(B, col, ab), tr = wr(B, trim, ab);
  B.box(0, y0, 0, w, h, d, base, { f: 30 });
  const sides = [[0, d / 2, 0, w], [0, -d / 2, PI, w], [w / 2, 0, PI / 2, d], [-w / 2, 0, -PI / 2, d]];
  sides.forEach(([sx, sz, ry, L]) => B.at(sx, y0, sz, ry, () => {
    if (fin === 'brick') {
      const n = Math.round(L * h * 0.85);
      for (let k = 0; k < n; k++) {
        const row = Math.floor(K.rnd() * (h / 0.25)), off = row % 2 ? 0.25 : 0;
        const u = Math.floor((K.rnd() * (L - 0.8)) / 0.5) * 0.5 - L / 2 + 0.4 + off;
        B.box(u, row * 0.25 + 0.02, 0.03, 0.46, 0.21, 0.06, K.rnd() < 0.5 ? B.mul(base, 0.84) : B.mix(base, '#ffffff', 0.14), { f: 15, ao: 1 });
      }
    } else if (fin === 'stone') {
      const n = Math.round(L * h * 0.5);
      for (let k = 0; k < n; k++) {
        const sw = 0.4 + K.rnd() * 0.4, sh = 0.3 + K.rnd() * 0.2;
        B.box(-L / 2 + sw / 2 + K.rnd() * (L - sw), K.rnd() * (h - sh), 0.04, sw, sh, 0.08, B.mix(base, pick(P.stone, k, 3, 13), 0.4), { f: 15, ao: 1 });
      }
      for (let v = 0; v < h - 0.35; v += 0.8) [-1, 1].forEach(s => B.box(s * (L / 2 - 0.25), v, 0.05, 0.5, 0.4, 0.1, B.mul(base, 0.88), { f: 15, ao: 1 }));
    } else if (fin === 'wood') {
      for (let u = -L / 2 + 0.25; u < L / 2 - 0.2; u += 1.0) B.box(u, 0, 0.03, 0.48, h, 0.06, B.mul(base, 0.86), { f: 15, ao: 0.85 });
      B.box(0, 0, 0.05, L, 0.3, 0.1, B.mul(base, 0.72), { f: 15, ao: 0.8 });
    } else if (fin === 'siding') {
      for (let v = 0.3; v < h; v += 0.6) B.box(0, v, 0.03, L, 0.3, 0.06, B.mul(base, 0.88), { f: 15, ao: 1 });
    } else {   /* plaster with timber */
      B.box(0, h * 0.5 - 0.1, 0.04, L, 0.2, 0.08, tr, { f: 15, ao: 1 });
      for (let u = -L / 2 + 2; u < L / 2 - 1; u += 2) B.box(u, 0, 0.04, 0.2, h, 0.08, tr, { f: 15, ao: 1 });
      const n = Math.round(L * h * 0.08);
      for (let k = 0; k < n; k++) B.box(-L / 2 + 0.6 + K.rnd() * (L - 1.2), K.rnd() * (h - 0.6), 0.02, 0.5 + K.rnd() * 0.4, 0.3, 0.04, B.mix(base, '#ffffff', 0.15), { f: 15, ao: 1 });
    }
    if (fin !== 'stone' && !o.noPosts) [-1, 1].forEach(s => B.box(s * (L / 2 - 0.12), 0, 0.06, 0.24, h, 0.12, tr, { f: 15, ao: 0.9 }));
    if (ab) {
      const vn = 1 + Math.floor(K.rnd() * 2);
      for (let v = 0; v < vn; v++) { const u = -L / 2 + 0.6 + K.rnd() * (L - 1.2), top = 0.8 + K.rnd() * (h - 0.8); for (let yy = 0; yy < top; yy += 0.4) B.box(u + (K.rnd() - 0.5) * 0.3, yy, 0.12, 0.35, 0.4, 0.14, K.rnd() < 0.5 ? '#4f8a3a' : '#5f9a42', { f: 15, ao: 1 }); }
    }
  }));
}
function win(B, K, o) {
  const w = o.w || 1.1, h = o.h || 1.1, y = o.y, t = wr(B, o.trim, o.ab), ab = o.ab;
  B.box(0, y - h / 2 - 0.1, 0.06, w + 0.24, h + 0.2, 0.12, t, { f: 15, ao: 1 });
  if (ab) {
    if (o.faint) B.box(0, y - h / 2, 0.08, w, h, 0.12, '#7dffa0', { k: B.glow('#7dffa0', 0.45), f: 15 });
    else B.box(0, y - h / 2, 0.08, w, h, 0.12, '#262a2c', { f: 15, ao: 1 });
  } else if (o.glow) B.box(0, y - h / 2, 0.08, w, h, 0.12, o.gc, { k: B.glow(o.gc, 1.3), f: 15 });
  else B.box(0, y - h / 2, 0.08, w, h, 0.12, '#9fc4d8', { f: 15, ao: 1 });
  if (!o.plain) {
    B.box(0, y - h / 2, 0.15, 0.08, h, 0.05, t, { f: 15, ao: 1 });
    B.box(0, y - 0.04, 0.15, w, 0.08, 0.05, t, { f: 15, ao: 1 });
  }
  B.box(0, y - h / 2 - 0.22, 0.14, w + 0.45, 0.12, 0.28, t, { ao: 1 });
  if (o.shut) {
    const sh = wr(B, o.shut, ab);
    B.box(-(w / 2 + 0.3), y - h / 2 - 0.05, 0.06, 0.34, h + 0.1, 0.1, sh, { f: 15, ao: 1 });
    if (ab) B.box(w / 2 + 0.36, y - h / 2 - 0.25, 0.08, 0.34, h + 0.1, 0.1, sh, { f: 15, ao: 1, rz: -0.3 });
    else B.box(w / 2 + 0.3, y - h / 2 - 0.05, 0.06, 0.34, h + 0.1, 0.1, sh, { f: 15, ao: 1 });
  }
  if (o.fb) {
    B.box(0, y - h / 2 - 0.55, 0.22, w + 0.1, 0.3, 0.38, wr(B, P.woodDk, ab), { f: 47 });
    for (let k = 0; k < 4; k++) {
      const fx = -w / 2 + 0.2 + k * (w - 0.4) / 3;
      if (ab) B.box(fx, y - h / 2 - 0.25, 0.22, 0.08, 0.18, 0.08, '#7a6248', { ao: 1 });
      else { B.box(fx, y - h / 2 - 0.25, 0.22, 0.2, 0.2, 0.2, ['#f26aa6', '#ffd84a', '#f8f4ec', '#5bbd4c'][k], { ao: 1 }); }
    }
  }
  if (ab) {
    B.box(0, y - 0.45, 0.22, w + 0.4, 0.2, 0.06, '#8a6a48', { rz: 0.25, f: 15 });
    B.box(0, y + 0.15, 0.22, w + 0.4, 0.2, 0.06, '#7a5c3c', { rz: -0.18, f: 15 });
  }
}
function doorway(B, K, o) {
  const w = o.w || 1.2, h = o.h || 2.2, tr = wr(B, o.trim, o.ab), dc = wr(B, o.colour, o.ab);
  B.box(0, 0, 0.06, w + 0.32, h + 0.16, 0.12, tr, { f: 15, ao: 1 });
  B.box(0, h + 0.16, 0.1, w + 0.6, 0.16, 0.22, tr, { ao: 1 });
  if (!o.ab) {
    B.box(0, 0, 0.1, w, h, 0.1, dc, { f: 15 });
    B.box(0, 0.25, 0.16, w - 0.4, 0.75, 0.05, B.mul(dc, 0.85), { f: 15, ao: 1 });
    B.box(0, 1.2, 0.16, w - 0.4, 0.75, 0.05, B.mul(dc, 0.85), { f: 15, ao: 1 });
    B.box(w / 2 - 0.2, 1.0, 0.2, 0.1, 0.1, 0.1, '#e8c050', { ao: 1 });
  } else {
    B.box(0, 0, 0.08, w, h, 0.06, '#1c1814', { f: 15 });
    const a = -0.8;
    B.box(-w / 2 + (w / 2) * Math.cos(a), 0, 0.12 - (w / 2) * Math.sin(a), w, h, 0.1, dc, { ry: a });
  }
  if (o.lantern) {
    const on = o.glow && !o.ab;
    B.box(w / 2 + 0.5, h - 0.45, 0.22, 0.3, 0.38, 0.3, on ? o.gc : '#3a3f44', on ? { k: B.glow(o.gc, 1.8) } : { ao: 1 });
    B.box(w / 2 + 0.5, h - 0.07, 0.22, 0.4, 0.1, 0.4, P.iron);
    B.box(w / 2 + 0.5, h - 0.2, 0.08, 0.1, 0.1, 0.28, P.iron);
  }
  B.door(0, 0, 0.35, 0);
}
/* gable roof, ridge along x. offs = how far each step moves in from the eave */
function roof(B, K, w, d, y, fin, col, wall, ab, o) {
  o = o || {};
  const ov = o.ov || (fin === 'thatch' ? 0.55 : 0.4);
  const n = o.n || (fin === 'slate' ? 6 : fin === 'thatch' ? 4 : 5);
  const lh = o.lh || (fin === 'thatch' ? 0.6 : fin === 'slate' ? 0.42 : 0.5);
  const W = w + ov * 2, D = d + ov * 2, step = (D / 2 - 0.4) / n;
  const offs = o.offs || Array.from({ length: n }, (_, k) => k * step);
  const wc = wr(B, wall, ab);
  for (let k = 0; k < n; k++) {
    const dk = D - 2 * offs[k], yk = y + k * lh, gk = d - 2 * offs[k];
    let c = fin === 'tiles' ? (k % 2 ? B.mul(col, 0.88) : B.rgb(col))
      : fin === 'slate' ? B.mul(col, 1 - k * 0.035)
      : fin === 'metal' ? (k % 2 ? B.mix(col, '#ffffff', 0.12) : B.rgb(col))
      : B.mix(col, '#fff6d0', k * 0.05);
    c = wr(B, c, ab);
    if (k === n - 1) { B.box(0, yk, 0, W, lh, dk, c, { f: 63 }); continue; }
    const sw = (offs[k + 1] - offs[k]) + 0.2;
    [-1, 1].forEach(s => {
      const cz = s * (dk / 2 - sw / 2);
      if (ab && k === n - 2 && s > 0) {
        B.box(-W / 4 - 0.3, yk, cz, W / 2 - 0.6, lh, sw, c, { f: 63 });
        B.box(W * 0.38, yk, cz, W * 0.24, lh, sw, c, { f: 63 });
        return;
      }
      B.box(0, yk, cz, W, lh, sw, c, { f: 63 });
      if (fin === 'thatch' && k === 0) for (let u = -W / 2 + 0.25; u < W / 2; u += 0.5) B.box(u, yk - 0.22 - (Math.round(u * 2) % 2 ? 0.1 : 0), s * (dk / 2 - 0.12), 0.46, 0.25, 0.22, B.mul(c, 0.86), { ao: 1, f: 63 });
      if (ab && k === 1 && s < 0) B.box(W * 0.2, yk + lh, cz, 1.2, 0.08, sw * 0.7, '#6a9a42', { ao: 1 });
    });
    if (gk > 0.25) [-1, 1].forEach(s => B.box(s * (w / 2 - 0.15), yk, 0, 0.3, lh, gk, wc, { f: 31 }));
  }
  const top = y + n * lh;
  B.box(0, top, 0, W + 0.1, 0.18, 0.5, wr(B, B.mul(col, 0.7), ab));
  if (o.trim) [-1, 1].forEach(s => B.box(0, y - 0.16, s * (D / 2 - 0.08), W, 0.16, 0.16, wr(B, o.trim, ab), { f: 63 }));
  return top;
}

/* ---------- piece + prop factories ---------- */
function piece(code, name, family, edges, draw) {
  return { id: ID(code), name, family, edges, build(g, K) { const B = maker(K); draw(B, K); B.finish(g); } };
}
function prop(meta, draw) {
  const out = Object.assign({}, meta, { id: ID(meta.id) });
  out.build = function (g, K, opts) {
    const B = maker(K), R = resolve(meta, opts);
    draw(B, K, R, g);
    B.finish(g);
  };
  return out;
}

/* ================= CITY ================= */
function roadPiece(B, K, m, deco) {
  const cnt = m.n + m.e + m.s + m.w;
  const isRoad = (x, z) => {
    if (m.n && Math.abs(x) <= 5 && z <= 0) return true;
    if (m.s && Math.abs(x) <= 5 && z >= 0) return true;
    if (m.e && Math.abs(z) <= 5 && x >= 0) return true;
    if (m.w && Math.abs(z) <= 5 && x <= 0) return true;
    if (cnt === 1) return x * x + z * z <= 5.6 * 5.6;
    if (cnt === 2 && !(m.n && m.s) && !(m.e && m.w)) return x * x + z * z <= 25;
    return false;
  };
  B.grid((x, z, i, j) => isRoad(x, z) ? rcell(i, j) : scell(i, j));
  const paint = (cx, cz, sx, sz, c) => B.box(cx, 0.02, cz, sx, 0.008, sz, c || '#f4e7a0', { f: 1 });
  const through = (m.n && m.s && cnt === 2) || (m.e && m.w && cnt === 2);
  const marks = through ? [-7.2, -4.4, -1.6, 1.2, 4.0, 6.8] : [-7.2, -4.6, -2.0];
  if (m.n) marks.forEach(t => { if (through || t < -5.4 || cnt <= 2) paint(0, t, 0.22, 1.3); });
  if (m.s && !through) [7.2, 4.6, 2.0].forEach(t => { if (t > 5.4 || cnt <= 2) paint(0, t, 0.22, 1.3); });
  if (m.e && !through) [7.2, 4.6, 2.0].forEach(t => { if (t > 5.4 || cnt <= 2) paint(t, 0, 1.3, 0.22); });
  if (m.w && !through) [-7.2, -4.6, -2.0].forEach(t => { if (t < -5.4 || cnt <= 2) paint(t, 0, 1.3, 0.22); });
  if (m.e && m.w && cnt === 2) marks.forEach(t => paint(t, 0, 1.3, 0.22));
  if (cnt >= 3) {   /* zebra crossings at each arm */
    const zeb = (dir) => { for (let k = 0; k < 7; k++) { const u = -4.2 + k * 1.4; if (dir === 'n') paint(u, -6.2, 0.7, 1.6, '#eceae4'); if (dir === 's') paint(u, 6.2, 0.7, 1.6, '#eceae4'); if (dir === 'e') paint(6.2, u, 1.6, 0.7, '#eceae4'); if (dir === 'w') paint(-6.2, u, 1.6, 0.7, '#eceae4'); } };
    ['n', 'e', 's', 'w'].forEach(d => { if (m[d]) zeb(d); });
  }
  /* manhole + storm drain */
  B.box(m.n ? 2.4 : 0, 0.02, m.n ? -2.6 : 2.4, 1.0, 0.01, 1.0, '#4a4c55', { f: 1 });
  B.box(m.n ? 2.4 : 0, 0.02, m.n ? -2.6 : 2.4, 0.8, 0.014, 0.12, '#3c3e46', { f: 1 });
  if (deco) deco(B, K);
}
function hydrant(B, x, z) {
  B.box(x, 0.15, z, 0.4, 0.15, 0.4, '#b8342a');
  B.box(x, 0.3, z, 0.3, 0.5, 0.3, '#d8443a');
  B.box(x, 0.55, z, 0.5, 0.12, 0.14, '#b8342a');
  B.box(x, 0.8, z, 0.36, 0.1, 0.36, '#b8342a');
  B.box(x, 0.9, z, 0.14, 0.1, 0.14, '#e8c050');
}
function bin(B, x, z) {
  B.box(x, 0.15, z, 0.6, 0.85, 0.6, '#3f7a52');
  B.box(x, 1.0, z, 0.68, 0.1, 0.68, '#2f5a3e');
  B.box(x, 0.45, z, 0.62, 0.08, 0.62, '#2f5a3e', { ao: 1 });
}
function busSign(B, x, z) {
  B.box(x, 0.15, z, 0.14, 2.4, 0.14, P.iron);
  B.box(x, 2.15, z, 0.6, 0.6, 0.08, '#ffd84a', { ao: 1 });
  B.box(x, 2.3, z + 0.05, 0.3, 0.3, 0.02, '#3a3d48', { f: 8, ao: 1 });
}

const CITY = [
  piece('C01', 'Road straight', 'C', 'RCRC', B => roadPiece(B, B.K, { n: 1, e: 0, s: 1, w: 0 }, (B, K) => {
    lampPost(B, -6.6, -3.5, { y: 0.15 }); lampPost(B, 6.6, 4.0, { y: 0.15 });
    hydrant(B, 6.4, -2.2); bin(B, -6.4, 4.2);
    planter(B, K, -6.3, 1.0, { s: 1.2 }); planter(B, K, 6.3, -5.6, { s: 1.2, fl: '#ffd84a' });
  })),
  piece('C02', 'Road corner', 'C', 'RRCC', B => roadPiece(B, B.K, { n: 1, e: 1, s: 0, w: 0 }, (B, K) => {
    lampPost(B, 6.6, -6.6, { y: 0.15 }); lampPost(B, -6.6, -2.0, { y: 0.15 });
    B.at(0, 0.15, 0, 0, () => planter(B, K, -5.0, 5.0, { s: 2.2, tree: { top: P.leaf[0], bot: P.leaf[1] } }));
    B.at(0, 0.15, 0, 0, () => { bench(B, -2.2, 6.6, PI); bench(B, -6.6, 2.0, PI / 2); });
    bin(B, 2.0, 6.6);
  })),
  piece('C03', 'T-junction', 'C', 'RRRC', B => roadPiece(B, B.K, { n: 1, e: 1, s: 1, w: 0 }, (B, K) => {
    lampPost(B, 6.6, -6.6, { y: 0.15 }); lampPost(B, 6.6, 6.6, { y: 0.15 }); lampPost(B, -6.6, 0, { y: 0.15 });
    busSign(B, -6.4, -4.0); B.at(0, 0.15, 0, 0, () => bench(B, -6.4, -2.4, PI / 2));
    hydrant(B, -6.4, 3.2);
  })),
  piece('C04', 'Crossroads', 'C', 'RRRR', B => roadPiece(B, B.K, { n: 1, e: 1, s: 1, w: 1 }, (B, K) => {
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => lampPost(B, a * 6.6, b * 6.6, { y: 0.15 }));
  })),
  piece('C05', 'Dead end', 'C', 'RCCC', B => roadPiece(B, B.K, { n: 1, e: 0, s: 0, w: 0 }, (B, K) => {
    lampPost(B, -6.6, -4.5, { y: 0.15 }); lampPost(B, 6.6, -4.5, { y: 0.15 });
    B.at(0, 0.15, 0, 0, () => { planter(B, K, -6.2, 5.6, { s: 1.4 }); planter(B, K, 6.2, 5.6, { s: 1.4, fl: '#ffd84a' }); bench(B, 0, 6.6, PI); });
    [-1.2, 0, 1.2].forEach(x => { B.box(x, 0.15, 6.0, 0.3, 0.7, 0.3, '#e8e2d6'); B.box(x, 0.6, 6.0, 0.32, 0.12, 0.32, '#d8443a', { ao: 1 }); });
  })),
  piece('C06', 'Town plaza', 'C', 'CCCC', B => {
    const K = B.K;
    B.grid((x, z, i, j) => {
      const d = Math.hypot(x, z);
      if (d < 1.8) return { h: 0.6, c: pick(P.grass, i, j, 1), s: 'stone' };
      if (d < 2.4) return { h: 0.75, c: pick(P.stone, i, j, 4), s: 'stone' };
      return ringCell(x, z, i, j);
    });
    tree(B, K, 0, 0, { y: 0.6, h: 4.2, w: 3.2, top: P.gold[0], bot: P.gold[1], arms: 2 });
    flowers(B, K, -1.6, 1.6, -1.6, 1.6, 10, 0.6, null, (x, z) => Math.hypot(x, z) > 0.9 && Math.hypot(x, z) < 1.6);
    B.at(0, 0.15, 0, 0, () => { bench(B, 0, 4.2, PI); bench(B, 0, -4.2, 0); bench(B, 4.2, 0, -PI / 2); bench(B, -4.2, 0, PI / 2); });
    lampPost(B, 4.6, -4.6, { y: 0.15 }); lampPost(B, -4.6, 4.6, { y: 0.15 });
    B.at(0, 0.15, 0, 0, () => { planter(B, K, 4.8, 4.8, { s: 1.3 }); planter(B, K, -4.8, -4.8, { s: 1.3, fl: '#ffd84a' }); });
    /* notice board */
    B.box(6.2, 0.15, -1.6, 0.16, 2.0, 0.16, P.woodDk); B.box(6.2, 0.15, 1.6, 0.16, 2.0, 0.16, P.woodDk);
    B.box(6.2, 1.0, 0, 0.12, 1.2, 3.0, P.wood); B.box(6.2, 2.15, 0, 0.5, 0.16, 3.4, P.woodDk, { f: 63 });
    [['#f8f4ec', -0.8, 1.5], ['#ffd84a', 0.4, 1.35], ['#8fb8ff', 0.9, 1.7], ['#f26aa6', -0.1, 1.15]].forEach(([c, z, y]) => B.box(6.13, y, z, 0.04, 0.42, 0.34, c, { f: 4, ao: 1 }));
  }),
  piece('C07', 'Crosswalk', 'C', 'RCRC', B => roadPiece(B, B.K, { n: 1, e: 0, s: 1, w: 0 }, (B, K) => {
    for (let k = 0; k < 7; k++) B.box(-4.2 + k * 1.4, 0.02, 0, 0.7, 0.01, 3.2, '#eceae4', { f: 1 });
    [[-6.4, -2.2], [6.4, 2.2]].forEach(([x, z]) => {
      B.box(x, 0.15, z, 0.14, 2.6, 0.14, P.iron);
      B.box(x, 2.3, z, 0.7, 0.7, 0.08, '#3a6ab0', { ao: 1 });
      B.box(x, 2.45, z + 0.05, 0.3, 0.42, 0.02, '#f8f4ec', { f: 8, ao: 1 });
      B.box(x, 2.75, z, 0.3, 0.3, 0.3, '#ffd84a', { k: B.glow('#ffb84a', 1.4) });
    });
    [-1.8, 1.8].forEach(z => [-5.4, 5.4].forEach(x => B.box(x, 0.15, z, 0.28, 0.8, 0.28, '#e8e2d6')));
    lampPost(B, -6.6, 4.6, { y: 0.15 }); lampPost(B, 6.6, -4.6, { y: 0.15 });
  })),
  piece('C08', 'Fountain square', 'C', 'CCCC', B => {
    const K = B.K;
    const g = B.grid((x, z, i, j) => {
      const d = Math.hypot(x, z);
      if (d < 3.0) return { h: 0.15, c: '#6aa8cc', s: 'flat', w: true };
      if (d < 3.7) return { h: 0.7, c: pick(['#c8c3ba', '#d2cdc4', '#bdb8ae'], i, j, 4), s: 'stone' };
      return ringCell(x, z, i, j);
    });
    B.water(g, 0.52);
    B.box(0, 0.15, 0, 1.4, 1.2, 1.4, '#c8c3ba');
    B.box(0, 1.35, 0, 2.8, 0.35, 2.8, '#d2cdc4', { f: 63 });
    B.box(0, 1.7, 0, 2.3, 0.04, 2.3, P.water, { k: 'w', f: 1 });
    B.box(0, 1.7, 0, 0.6, 0.9, 0.6, '#d2cdc4');
    B.box(0, 2.6, 0, 1.1, 0.25, 1.1, '#c8c3ba', { f: 63 });
    B.box(0, 2.85, 0, 0.3, 0.9, 0.3, P.water, { k: 'w' });
    B.box(0, 3.75, 0, 0.6, 0.25, 0.6, P.foam, { k: 'w' });
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => {
      B.box(a * 1.45, 0.52, b * 1.45, a ? 0.12 : 2.0, 1.18, b ? 0.12 : 2.0, P.water, { k: 'w' });
      B.box(a * 1.75, 0.52, b * 1.75, a ? 0.5 : 1.8, 0.14, b ? 0.5 : 1.8, P.foam, { k: 'w' });
    });
    B.at(0, 0.15, 0, 0, () => { bench(B, 0, 5.2, PI); bench(B, 0, -5.2, 0); bench(B, 5.2, 0, -PI / 2); bench(B, -5.2, 0, PI / 2); });
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => lampPost(B, a * 6.2, b * 6.2, { y: 0.15 }));
    B.at(0, 0.15, 0, 0, () => { planter(B, K, 4.2, -4.2, { s: 1.2 }); planter(B, K, -4.2, 4.2, { s: 1.2, fl: '#ffd84a' }); planter(B, K, 4.2, 4.2, { s: 1.2, fl: '#8fb8ff' }); planter(B, K, -4.2, -4.2, { s: 1.2 }); });
  }),
  piece('C09', 'Market stalls', 'C', 'CCCC', B => {
    const K = B.K;
    B.grid(scell);
    const stall = (x, z, ry, col, goods) => B.at(x, 0.15, z, ry, () => {
      B.box(0, 0, 0, 3.0, 0.95, 1.0, P.wood);
      B.box(0, 0.95, 0.05, 3.2, 0.1, 1.2, P.woodDk);
      for (let u = -1.25; u <= 1.3; u += 0.5) B.box(u, 0.1, 0.51, 0.42, 0.75, 0.04, P.wood2, { f: 15, ao: 1 });
      [[-1.5, -0.55], [1.5, -0.55], [-1.5, 0.75], [1.5, 0.75]].forEach(([a, b]) => B.box(a, 0, b, 0.16, b > 0 ? 2.5 : 2.8, 0.16, P.woodDk));
      for (let k = 0; k < 7; k++) {
        const u = -1.5 + 0.25 + k * 0.5;
        B.box(u, 2.55, 0.15, 0.5, 0.08, 2.0, k % 2 ? '#f5efe2' : col, { rx: 0.22, f: 63 });
        B.box(u, 2.15, 1.18, 0.5, 0.3, 0.05, k % 2 ? '#f5efe2' : col, { f: 63 });
      }
      goods.forEach((c, k) => crate(B, -1.0 + k * 1.0, 1.05, 0.05, c));
      B.box(1.3, 2.0, 1.15, 0.24, 0.3, 0.24, P.warm, { k: B.glow(P.warm, 1.8) });
      B.box(-0.6, 0, -1.1, 0.8, 0.5, 0.6, P.wood); crate(B, 0.4, 0, -1.1, '#e04a3a');
    });
    stall(-3.8, -3.6, 0, '#d8503c', ['#e04a3a', '#ff9a3a', '#7cc84a']);
    stall(3.8, -3.6, 0, '#3a6ab0', ['#ffd84a', '#8a4ab0', '#e04a3a']);
    stall(0, 4.0, PI, '#2f8a5a', ['#ff9a3a', '#7cc84a', '#ffd84a']);
    [[-6.4, 0.3], [6.4, 0.3]].forEach(([x, z]) => { B.box(x, 0.15, z, 0.22, 3.4, 0.22, P.woodDk); B.box(x, 3.55, z, 0.32, 0.12, 0.32, P.woodDk); });
    const bulbs = (ax, az, bx, bz, y) => {
      const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax);
      B.box((ax + bx) / 2, y + 0.05, (az + bz) / 2, L, 0.03, 0.03, '#2a2a30', { ry, f: 63 });
      for (let t = 0.5; t < L; t += 0.8) { const u = t / L; B.box(ax + (bx - ax) * u, y - 0.12, az + (bz - az) * u, 0.16, 0.18, 0.16, P.warm, { k: B.glow('#ffd27a', 2.2) }); }
    };
    bulbs(-6.4, 0.3, 0, 1.0, 3.4); bulbs(0, 1.0, 6.4, 0.3, 3.4); bulbs(-6.4, 0.3, 6.4, 0.3, 3.0);
    B.lamp(-3.2, 3.2, 0.6); B.lamp(3.2, 3.2, 0.6);
    barrel(B, -6.0, 5.4); barrel(B, -5.2, 5.9); B.at(0, 0.15, 0, 0, () => { crate(B, 5.6, 0, 5.6, '#7cc84a'); crate(B, 5.6, 0.4, 5.6, null); crate(B, 6.3, 0, 5.0, '#ff9a3a', 0.3); });
    B.at(0, 0.15, 0, 0, () => { bench(B, -6.2, -6.4, 0); planter(B, K, 6.0, -6.2, { s: 1.1 }); });
  }),
  piece('C10', 'Paved lot', 'C', 'CCCC', B => {
    B.grid((x, z, i, j) => { const c = scell(i, j); if (h2(i, j, 41) < 0.05) c.c = '#bdb8ae'; return c; });
    B.box(-3.2, 0.15, 4.4, 1.0, 0.01, 1.0, '#8f8d89', { f: 1 }); B.box(-3.2, 0.15, 4.4, 0.8, 0.014, 0.12, '#6e6c69', { f: 1 });
    [[5.2, -5.6], [-5.8, 1.4], [2.4, 5.8]].forEach(([x, z]) => { B.box(x, 0.15, z, 0.1, 0.22, 0.1, '#5fb043', { ao: 0.8 }); B.box(x + 0.12, 0.15, z + 0.05, 0.08, 0.16, 0.08, '#6cc04a', { ao: 0.8 }); });
  })
];

/* ================= NATURE ================= */
function pathPiece(B, K, m, deco) {
  const isP = (x, z) => (m.n && Math.abs(x) <= 1.5 && z <= 0) || (m.s && Math.abs(x) <= 1.5 && z >= 0)
    || (m.e && Math.abs(z) <= 1.5 && x >= 0) || (m.w && Math.abs(z) <= 1.5 && x <= 0) || (Math.abs(x) <= 1.5 && Math.abs(z) <= 1.5);
  B.grid((x, z, i, j) => isP(x, z) ? pcell(i, j) : gcell(i, j));
  const near = (x, z, r) => isP(x, z) || isP(x + r, z) || isP(x - r, z) || isP(x, z + r) || isP(x, z - r);
  const ok = (x, z) => !near(x, z, 0.6);
  /* pebbles along the edges of the path */
  for (let k = 0; k < (K.low ? 10 : 20); k++) {
    const t = K.rnd() * 13 - 6.5, sgn = K.rnd() < 0.5 ? -1 : 1, s = 0.2 + K.rnd() * 0.2;
    const cands = [];
    if (m.n || m.s) cands.push([sgn * 1.75, t]);
    if (m.e || m.w) cands.push([t, sgn * 1.75]);
    const c = cands[k % cands.length];
    if (!isP(c[0], c[1]) && near(c[0], c[1], 0.4)) B.box(c[0], 0, c[1], s, s * 0.6, s, pick(P.stone, k, 1, 3), { ao: 0.9 });
  }
  flowers(B, K, -6.6, 6.6, -6.6, 6.6, 16, 0, null, ok);
  tufts(B, K, -6.6, 6.6, -6.6, 6.6, 12, 0, ok);
  if (deco) deco(B, K, ok);
}
function meadowBase(B, pal, speck) { return B.grid((x, z, i, j) => gcell(i, j, pal, speck)); }

const NATURE = [
  piece('N01', 'Meadow', 'N', 'NNNN', B => {
    const K = B.K; meadowBase(B);
    flowers(B, K, -6.6, 6.6, -6.6, 6.6, 40);
    tufts(B, K, -6.6, 6.6, -6.6, 6.6, 26);
    bush(B, K, -4.6, 0, -3.8, { fl: '#f26aa6' }); bush(B, K, 4.4, 0, 4.6); bush(B, K, 3.6, 0, -4.8, { s: 0.8 });
    rock(B, -3.4, 0, 4.4, 1); rock(B, 5.0, 0, -0.8, 0.7);
    mushTiny(B, -1.2, 0, 2.2); mushTiny(B, -1.0, 0, 2.5);
    [[1.2, 1.4, -1.2, '#f8f4ec'], [-2.4, 1.1, 0.8, '#ffd84a']].forEach(([x, y, z, c]) => { B.box(x - 0.1, y, z, 0.18, 0.04, 0.22, c, { f: 63, ao: 1, rz: 0.4 }); B.box(x + 0.1, y, z, 0.18, 0.04, 0.22, c, { f: 63, ao: 1, rz: -0.4 }); });
  }),
  piece('N02', 'Light forest', 'N', 'NNNN', B => {
    const K = B.K; meadowBase(B);
    tree(B, K, -4.0, -4.2, { h: 5.5, w: 3.6, arms: 2 });
    tree(B, K, 3.6, -4.6, { h: 4.4, w: 3.0, arms: 1 });
    tree(B, K, -4.6, 3.8, { h: 4.0, w: 3.0, arms: 1 });
    tree(B, K, 4.2, 3.4, { h: 5.0, w: 3.4, arms: 2 });
    tree(B, K, 0.2, -0.4, { h: 3.4, w: 2.4, arms: 0, top: P.gold[0], bot: P.gold[1] });
    bush(B, K, -1.8, 0, 3.2); bush(B, K, 1.8, 0, -2.8, { fl: '#f26aa6' }); bush(B, K, 6.0, 0, -0.6, { s: 0.8 });
    log(B, -1.4, 5.6, 0.2, 2.6);
    rock(B, 2.6, 0, 1.6, 0.8);
    mush(B, -2.8, 0, -1.6); mush(B, -2.4, 0, -1.2, 0.7);
    flowers(B, K, -6.6, 6.6, -6.6, 6.6, 16);
    tufts(B, K, -6.6, 6.6, -6.6, 6.6, 14);
  }),
  piece('N03', 'Path straight', 'N', 'PNPN', B => pathPiece(B, B.K, { n: 1, s: 1 }, (B, K) => {
    pathLantern(B, 2.3, 1.6);
    fence(B, -2.6, -6.2, -2.6, -1.4);
    tree(B, K, -4.8, 4.2, { h: 4.6, w: 3.2, arms: 1 }); tree(B, K, 4.8, -4.4, { h: 4.0, w: 3.0, arms: 1 });
    bush(B, K, 4.6, 0, 4.6, { fl: '#ffd84a' }); rock(B, -4.6, 0, -0.4, 0.8);
  })),
  piece('N04', 'Path corner', 'N', 'PPNN', B => pathPiece(B, B.K, { n: 1, e: 1 }, (B, K) => {
    pathLantern(B, -2.2, 2.2);
    tree(B, K, -4.4, 4.0, { h: 5.2, w: 3.6, arms: 2 });
    tree(B, K, 4.8, -4.8, { h: 3.6, w: 2.6, arms: 0, top: P.gold[0], bot: P.gold[1] });
    fence(B, 2.6, 2.6, 6.4, 2.6); fence(B, 2.6, 2.6, 2.6, 6.4);
    bush(B, K, 4.6, 0, 4.6, { fl: '#f26aa6' }); rock(B, -4.8, 0, -3.0, 0.8);
  })),
  piece('N05', 'Path fork', 'N', 'PPPN', B => pathPiece(B, B.K, { n: 1, e: 1, s: 1 }, (B, K) => {
    /* signpost at the fork */
    B.box(-2.2, 0, -2.2, 0.22, 2.4, 0.22, P.woodDk);
    [[2.0, 0, 'E'], [1.6, PI / 2, 'N'], [1.2, -PI / 2, 'S']].forEach(([y, ry]) => B.at(-2.2, y, -2.2, ry, () => { B.box(0.65, 0, 0, 1.1, 0.3, 0.07, '#e8d2a0', { ao: 1 }); B.box(1.25, 0.05, 0, 0.12, 0.2, 0.07, '#e8d2a0', { ao: 1 }); B.box(0.6, 0.1, 0.04, 0.7, 0.08, 0.02, '#7a5232', { f: 8, ao: 1 }); }));
    tree(B, K, -4.6, -4.4, { h: 4.8, w: 3.4, arms: 2 }); tree(B, K, -4.4, 4.6, { h: 4.2, w: 3.0, arms: 1 });
    bush(B, K, 4.6, 0, -4.6); bush(B, K, 4.4, 0, 4.6, { fl: '#ffd84a' }); rock(B, -5.2, 0, 0.6, 0.9);
    pathLantern(B, 2.4, -2.6);
  })),
  piece('N06', 'Dense forest', 'N', 'NNNN', B => {
    const K = B.K; meadowBase(B, P.grassDk, '#6cbf52');
    const pos = [[-5, -5], [0.2, -5.4], [5, -4.6], [-5.4, 0.2], [0.6, 0.2], [5.2, 0.6], [-4.6, 5], [0, 5.2], [5.2, 5.2]];
    pos.forEach(([x, z], k) => {
      const jx = (K.rnd() - 0.5) * 1.2, jz = (K.rnd() - 0.5) * 1.2, c = k % 4 === 2 ? P.leaf : P.leafDk;
      tree(B, K, x + jx, z + jz, { h: 4.2 + K.rnd() * 2.4, w: 2.8 + K.rnd() * 1.0, arms: k % 3 === 0 ? 2 : 1, top: c[0], bot: c[1] });
    });
    [[-2.6, -2.4], [2.8, 2.6], [-2.4, 2.8], [3.0, -2.2]].forEach(([x, z]) => bush(B, K, x, 0, z, { pal: ['#2f7a3a', '#3a8a40', '#468f3f'], s: 0.9 }));
    B.box(-2.6, 0, 0.4, 0.9, 0.7, 0.9, P.bark); B.box(-2.6, 0.7, 0.4, 0.92, 0.04, 0.92, '#e0b884', { f: 1 });
    mush(B, 2.2, 0, -0.8); mush(B, 2.5, 0, -0.5, 0.6); mush(B, -0.8, 0, 3.0, 0.8);
    log(B, 2.4, 3.6, -0.4, 2.4);
    tufts(B, K, -6.6, 6.6, -6.6, 6.6, 16);
  }),
  piece('N07', 'Pond', 'N', 'NNNN', B => {
    const K = B.K;
    const pd = (x, z) => Math.hypot(x / 5.0, z / 4.0) + 0.05 * Math.sin(x * 1.3 + z * 0.7);
    const g = B.grid((x, z, i, j) => {
      const d = pd(x, z);
      if (d < 0.8) return { h: 0.01, c: pick(['#d8c08c', '#cdb47e'], i, j, 2), s: 'flat', w: true };
      if (d < 1.0) return h2(i, j, 31) < 0.3 ? { h: 0.48, c: pick(P.stone, i, j, 4), s: 'stone' } : { h: 0.4, c: pick(P.grass, i, j, 1), s: 'grass' };
      return gcell(i, j);
    });
    B.water(g, 0.3);
    [[-1.6, -1.0], [1.8, 1.2], [0.4, -2.0], [-2.4, 1.4]].forEach(([x, z], k) => { B.box(x, 0.3, z, 0.6, 0.03, 0.6, '#4fae44', { f: 1 }); if (k === 1) B.box(x + 0.1, 0.33, z, 0.2, 0.16, 0.2, '#f6a2c8', { ao: 1 }); });
    /* dock */
    B.box(0, 0.4, 2.6, 1.4, 0.12, 2.6, P.wood, { f: 63 });
    for (let k = 0; k < 5; k++) B.box(0, 0.52, 1.5 + k * 0.5, 1.4, 0.01, 0.06, P.woodDk, { f: 1 });
    [[-0.6, 1.4], [0.6, 1.4]].forEach(([x, z]) => B.box(x, 0, z, 0.16, 0.7, 0.16, P.woodDk));
    /* ducks */
    [[-1.0, 0.4, 0.3], [-0.2, -0.6, -0.5]].forEach(([x, z, ry]) => B.at(x, 0.28, z, ry, () => { B.box(0, 0, 0, 0.45, 0.3, 0.65, '#f4f0e6'); B.box(0, 0.25, 0.3, 0.28, 0.28, 0.28, '#f4f0e6'); B.box(0, 0.3, 0.5, 0.14, 0.08, 0.16, '#ff9a3a', { ao: 1 }); B.box(0, 0.12, -0.36, 0.2, 0.14, 0.12, '#e8e2d6', { ao: 1 }); }));
    /* reeds */
    for (let k = 0; k < (K.low ? 6 : 12); k++) {
      const a = K.rnd() * PI * 2, x = Math.cos(a) * 4.2, z = Math.sin(a) * 3.3;
      if (z > 1.5 && Math.abs(x) < 1.2) continue;
      B.box(x, 0.3, z, 0.08, 0.9 + K.rnd() * 0.5, 0.08, '#5a9a3a', { f: 30 }); B.box(x + 0.14, 0.3, z + 0.05, 0.08, 1.1, 0.08, '#5a9a3a', { f: 30 }); B.box(x + 0.14, 1.25, z + 0.05, 0.14, 0.3, 0.14, '#8a5a36', { ao: 1 });
    }
    tree(B, K, -5.8, -5.6, { h: 4.4, w: 3.0, arms: 1 }); tree(B, K, 5.8, -5.4, { h: 3.8, w: 2.8, arms: 1, top: P.gold[0], bot: P.gold[1] });
    bush(B, K, 5.8, 0, 5.4, { s: 0.8 }); bush(B, K, -5.8, 0, 5.4, { fl: '#f26aa6' });
    rock(B, 5.6, 0, 0.2, 0.7);
    flowers(B, K, -6.6, 6.6, -6.6, 6.6, 14, 0, null, (x, z) => pd(x, z) > 1.1);
  }),
  piece('N08', 'Stream & bridge', 'N', 'PNPN', B => {
    const K = B.K;
    const zc = x => 1.1 * Math.sin(x * 0.55);
    const wet = (x, z) => (Math.abs(z - zc(x)) < 0.95 && Math.abs(x) < 5.6) || Math.hypot(x - 4.8, z - zc(4.8)) < 1.15;
    const bank = (x, z) => (Math.abs(z - zc(x)) < 1.6 && Math.abs(x) < 6.2) || Math.hypot(x - 4.8, z - zc(4.8)) < 1.75;
    const g = B.grid((x, z, i, j) => {
      if (wet(x, z)) return { h: 0.01, c: pick(['#d8c08c', '#cdb47e'], i, j, 2), s: 'flat', w: true };
      if (Math.abs(x) <= 1.5) return pcell(i, j);
      if (bank(x, z)) return h2(i, j, 33) < 0.25 ? { h: 0.42, c: pick(P.stone, i, j, 4), s: 'stone' } : { h: 0.35, c: pick(P.grass, i, j, 1), s: 'grass' };
      return gcell(i, j);
    });
    B.water(g, 0.25);
    /* bridge */
    for (let z = -2.6; z < 2.6; z += 0.5) {
      const zz = z + 0.25, top = Math.abs(zz) > 1.4 ? (Math.abs(zz) > 2.0 ? 0.3 : 0.5) : 0.7;
      B.box(0, top - 0.14, zz, 3.0, 0.14, 0.48, (Math.round(z * 2) % 2) ? P.wood : P.wood2, { f: 63 });
    }
    [-1.3, 1.3].forEach(x => B.box(x, 0, 0, 0.25, 0.42, 4.2, P.woodDk));
    [-1.55, 1.55].forEach(x => {
      [-2.2, -1.0, 1.0, 2.2].forEach(z => B.box(x, 0, z, 0.2, (Math.abs(z) > 2 ? 0.3 : 0.6) + 0.9, 0.2, P.woodDk));
      B.box(x, 1.25, 0, 0.16, 0.14, 2.4, P.wood); B.box(x, 1.0, -1.6, 0.16, 0.14, 1.4, P.wood); B.box(x, 1.0, 1.6, 0.16, 0.14, 1.4, P.wood);
    });
    /* spring rocks, fish, reeds */
    rock(B, -6.0, 0, zc(-6.0) - 0.4, 0.9); rock(B, -5.6, 0.3, zc(-5.6) + 0.6, 0.6, false);
    B.box(2.8, 0.18, zc(2.8), 0.3, 0.12, 0.14, '#ff8a3a', { ao: 1 }); B.box(-3.2, 0.18, zc(-3.2) + 0.2, 0.3, 0.12, 0.14, '#ff8a3a', { ao: 1 });
    for (let k = 0; k < (K.low ? 4 : 8); k++) { const x = -5 + K.rnd() * 10; if (Math.abs(x) < 2) continue; const z = zc(x) + (K.rnd() < 0.5 ? -1 : 1) * 1.2; B.box(x, 0.35, z, 0.08, 0.9, 0.08, '#5a9a3a', { f: 30 }); B.box(x, 1.2, z, 0.14, 0.28, 0.14, '#8a5a36', { ao: 1 }); }
    tree(B, K, -4.8, -5.0, { h: 4.6, w: 3.2, arms: 1 }); tree(B, K, 5.0, -5.2, { h: 4.0, w: 3.0, arms: 1, top: P.gold[0], bot: P.gold[1] }); tree(B, K, -5.0, 5.0, { h: 4.2, w: 3.0, arms: 2 });
    bush(B, K, 4.6, 0, 5.0, { fl: '#f26aa6' });
    flowers(B, K, -6.6, 6.6, -6.6, 6.6, 12, 0, null, (x, z) => !bank(x, z) && Math.abs(x) > 1.9);
  }),
  piece('N09', 'Hill with stairs', 'N', 'NNNN', B => {
    const K = B.K;
    const H = (x, z) => {
      if (x >= -5 && x <= -0.5 && z >= -6.5 && z <= -2.5) return [4, 'g'];
      if (z >= -4 && z <= -3) { if (x > -0.5 && x <= 0) return [3.5, 's']; if (x > 0 && x <= 0.5) return [3.0, 's']; if (x > 0.5 && x <= 1) return [2.5, 's']; }
      const t1 = x >= -6 && x <= 5 && z >= -6.5 && z <= 2.5 && !(x > 3 && z < -4.5) && !(x < -4.5 && z > 1);
      if (t1) return [2, (x >= 1 && x <= 3 && z >= -4) ? 'p' : 'g'];
      if (x >= 1 && x <= 3) { if (z > 2.5 && z <= 3) return [1.5, 's']; if (z > 3 && z <= 3.5) return [1.0, 's']; if (z > 3.5 && z <= 4) return [0.5, 's']; }
      return null;
    };
    B.grid((x, z, i, j) => {
      const h = H(x, z);
      if (!h) return gcell(i, j);
      if (h[1] === 's') return { h: h[0], c: pick(['#b4b0a8', '#c0bcb4'], i, j, 4), s: 'stone' };
      if (h[1] === 'p') return { h: h[0], c: pick(P.path, i, j, 2), s: 'grass' };
      return { h: h[0], c: pick(P.grass, i >> 1, j >> 1, 1), s: 'grass' };
    });
    tree(B, K, -3.0, -4.6, { y: 4, h: 4.2, w: 3.0, arms: 1, top: P.gold[0], bot: P.gold[1] });
    tree(B, K, -4.2, -0.6, { y: 2, h: 4.6, w: 3.2, arms: 1 });
    tree(B, K, 4.0, -1.8, { y: 2, h: 3.4, w: 2.2, arms: 0 });
    tree(B, K, 5.6, -5.8, { h: 4.0, w: 3.0, arms: 1 }); tree(B, K, -5.4, 5.4, { h: 3.6, w: 2.8, arms: 1 });
    fence(B, -0.2, 2.2, -3.6, 2.2, { y: 2 });
    bush(B, K, -1.6, 2, -1.0, { fl: '#f26aa6' }); bush(B, K, 4.0, 2, 1.6); bush(B, K, -1.4, 4, -5.6, { s: 0.7 }); bush(B, K, 4.2, 0, 4.4, { s: 0.8 });
    flowers(B, K, -4.6, -1, -6.2, -2.8, 7, 4); flowers(B, K, -5.6, 0.4, -2.2, 2.0, 8, 2);
    mush(B, -2.2, 2, 1.4); mush(B, -1.9, 2, 1.7, 0.6); rock(B, 2.0, 0, 5.6, 0.7); rock(B, 4.2, 2, -3.6, 0.6);
    flowers(B, K, -6.6, 6.6, 3.2, 6.6, 8, 0, null, (x) => x < 0.6 || x > 3.4);
  }),
  piece('N10', 'Cliff & waterfall', 'N', 'NNNN', B => {
    const K = B.K;
    const front = x => -1.5 - (x > 2.5 ? 1.0 : 0) - (x < -4.5 ? 0.5 : 0);
    const g = B.grid((x, z, i, j) => {
      if (x >= -6.5 && x <= 6.5 && z >= -6.5 && z <= front(x)) {
        const h = (x >= 2 && z <= -4) ? 7.5 : 6;
        return { h, c: pick(P.grass, i >> 1, j >> 1, 1), s: 'cliff' };
      }
      if (x >= -3.0 && x <= 0 && z > -1.5 && z <= 1.5) return { h: 0.01, c: pick(['#c8b484', '#bda876'], i, j, 2), s: 'flat', w: true };
      if (x >= -3.5 && x <= 0.5 && z > -1.5 && z <= 2.0) return { h: 0.45, c: pick(P.stone, i, j, 4), s: 'stone' };
      return gcell(i, j);
    });
    B.water(g, 0.32);
    /* stream on top, the fall, foam */
    B.box(-1.5, 6.0, -4.0, 2.0, 0.1, 5.0, P.water, { k: 'w', f: 1 });
    [-2.75, -0.25].forEach(x => B.box(x, 6.0, -4.2, 0.5, 0.3, 4.6, '#a8a7a2'));
    B.box(-1.5, 0.32, -1.35, 2.0, 5.78, 0.3, P.water, { k: 'w', f: 15 });
    [-2.2, -1.5, -0.8].forEach(x => B.box(x, 0.32, -1.18, 0.22, 5.78, 0.04, P.foam, { k: 'w', f: 8 }));
    B.box(-1.5, 5.85, -1.3, 2.2, 0.28, 0.5, P.foam, { k: 'w' });
    for (let k = 0; k < 6; k++) { const s = 0.35 + K.rnd() * 0.35; B.box(-2.6 + K.rnd() * 2.2, 0.24, -1.0 + K.rnd() * 1.0, s, s * 0.6, s, P.foam, { k: 'w' }); }
    /* vines and ledges on the face */
    [[-5.2, -2.0, 4.2], [3.6, -2.5, 5.4], [5.6, -2.5, 3.6], [-3.6, -1.5, 3.0]].forEach(([x, z, top]) => { for (let y = 6 - top; y < 5.9; y += 0.4) B.box(x + (K.rnd() - 0.5) * 0.3, y, z + 0.1, 0.35, 0.4, 0.2, K.rnd() < 0.5 ? '#4f8a3a' : '#5f9a42', { ao: 1 }); });
    B.box(1.4, 3.0, -1.2, 1.2, 0.4, 0.6, '#9c9a96'); bush(B, K, 1.4, 3.4, -1.2, { s: 0.5 });
    tree(B, K, 4.6, -5.6, { y: 7.5, h: 3.2, w: 2.4, arms: 0, top: P.gold[0], bot: P.gold[1] });
    tree(B, K, -4.8, -4.6, { y: 6, h: 3.8, w: 2.8, arms: 1 });
    bush(B, K, 1.0, 6, -5.6); bush(B, K, -5.2, 6, -2.4, { s: 0.7, fl: '#f26aa6' });
    flowers(B, K, 0.2, 1.8, -6.2, -2.0, 6, 6);
    tree(B, K, -5.6, 4.8, { h: 4.2, w: 3.0, arms: 1 });
    rock(B, 2.2, 0, 0.6, 0.9); rock(B, -5.4, 0, 1.4, 0.7);
    for (let k = 0; k < 6; k++) { const x = -3.2 + K.rnd() * 3.4; B.box(x, 0.45, 1.85, 0.08, 1.0, 0.08, '#5a9a3a', { f: 30 }); }
    flowers(B, K, -6.6, 6.6, 2.4, 6.6, 12);
  }),
  piece('N11', 'Golden grove', 'N', 'NNNN', B => {
    const K = B.K;
    B.grid((x, z, i, j) => { const c = gcell(i, j); if (h2(i, j, 21) < 0.2) c.c = pick(['#f0a040', '#e8c048', '#e07838'], i, j, 22); return c; });
    tree(B, K, -4.0, -3.8, { h: 5.4, w: 3.8, arms: 2, top: P.gold[0], bot: P.gold[1] });
    tree(B, K, 4.0, -4.2, { h: 4.6, w: 3.2, arms: 1, top: P.autumn[0], bot: P.autumn[1] });
    tree(B, K, -3.6, 4.2, { h: 4.2, w: 3.0, arms: 1, top: P.autumn[0], bot: P.autumn[1] });
    tree(B, K, 4.4, 3.8, { h: 5.0, w: 3.4, arms: 2, top: P.gold[0], bot: P.gold[1] });
    [[-0.8, 1.6], [1.4, -1.2], [2.2, 1.8]].forEach(([x, z]) => { for (let k = 0; k < 6; k++) B.box(x + (K.rnd() - 0.5) * 1.0, 0, z + (K.rnd() - 0.5) * 1.0, 0.35, 0.18 + K.rnd() * 0.12, 0.35, ['#f0a040', '#e8c048', '#e07838'][k % 3], { ao: 0.9 }); });
    [[-1.6, -1.4, 0.8], [0.4, 3.6, 0.6], [-5.6, 0.4, 0.7]].forEach(([x, z, s]) => { B.box(x, 0, z, 0.8 * s, 0.6 * s, 0.8 * s, '#f08a2a'); B.box(x, 0.6 * s, z, 0.12, 0.2, 0.12, '#5a7a2a'); B.box(x + 0.2, 0.55 * s, z + 0.1, 0.3, 0.06, 0.2, '#5fae45', { ao: 1 }); });
    bench(B, 0.6, -3.0, 0, {});
    pathLantern(B, -1.6, -3.4);
    mush(B, 5.6, 0, -0.8, 0.8);
    tufts(B, K, -6.6, 6.6, -6.6, 6.6, 12);
  }),
  piece('N12', 'Flower garden', 'N', 'NNNN', B => {
    const K = B.K;
    B.grid((x, z, i, j) => (Math.abs(x) <= 0.5 || Math.abs(z) <= 0.5) && Math.abs(x) < 6 && Math.abs(z) < 6 && ((i + j) % 3) ? { h: 0.05, c: pick(['#c8c3ba', '#d2cdc4'], i, j, 4), s: 'stone' } : gcell(i, j));
    const pals = [['#f26aa6', '#f8f4ec', '#f6a2c8'], ['#ffd84a', '#ff9a3a', '#f8e08a'], ['#8fb8ff', '#b08aff', '#f8f4ec'], ['#e04a3a', '#f26aa6', '#ffd84a']];
    [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]].forEach(([x, z], b) => {
      B.box(x, 0, z, 3.4, 0.45, 2.2, P.wood, { top: '#7a5232' });
      B.box(x, 0.45, z, 3.5, 0.08, 2.3, P.woodDk, { f: 1 });
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        const fx = x - 1.3 + c * 0.65, fz = z - 0.65 + r * 0.65;
        B.box(fx, 0.45, fz, 0.1, 0.32, 0.1, '#4f9a3a', { f: 30 });
        B.box(fx, 0.72, fz, 0.3, 0.2, 0.3, pals[b][(r + c) % 3], { ao: 1 });
        if (!K.low && (r + c) % 2) B.box(fx + 0.18, 0.5, fz, 0.18, 0.06, 0.1, '#5fae45', { ao: 1 });
      }
    });
    /* birdbath */
    B.box(0, 0.05, 0, 0.8, 0.2, 0.8, '#c0bcb4'); B.box(0, 0.25, 0, 0.35, 0.75, 0.35, '#d2cdc4');
    B.box(0, 1.0, 0, 1.2, 0.2, 1.2, '#d2cdc4', { f: 63 }); B.box(0, 1.2, 0, 1.0, 0.03, 1.0, P.water, { k: 'w', f: 1 });
    B.box(0.3, 1.2, 0.1, 0.2, 0.18, 0.28, '#8fb8ff', { ao: 1 });
    /* arch */
    [-1.3, 1.3].forEach(x => B.box(x, 0, -6.0, 0.22, 2.7, 0.22, P.wood));
    B.box(0, 2.7, -6.0, 3.2, 0.2, 0.5, P.wood, { f: 63 }); for (let k = 0; k < 5; k++) B.box(-1.2 + k * 0.6, 2.9, -6.0, 0.12, 0.12, 0.9, P.woodDk);
    for (let k = 0; k < (K.low ? 8 : 16); k++) { const t = K.rnd(); const x = t < 0.5 ? (K.rnd() < 0.5 ? -1.3 : 1.3) : -1.4 + K.rnd() * 2.8, y = t < 0.5 ? 0.4 + K.rnd() * 2.3 : 2.8; B.box(x, y, -6.0 + (K.rnd() - 0.5) * 0.4, 0.3, 0.3, 0.3, k % 3 ? '#4f9a3a' : '#f26aa6', { ao: 1 }); }
    /* watering can */
    B.box(1.6, 0, 1.6, 0.5, 0.45, 0.35, '#3a8aa8'); B.box(1.95, 0.25, 1.6, 0.4, 0.08, 0.08, '#3a8aa8', { rz: 0.5 }); B.box(1.6, 0.45, 1.6, 0.08, 0.2, 0.3, '#2a6a88');
    /* butterflies */
    [[-1.4, 1.3, 1.8, '#ffd84a'], [2.0, 1.6, -1.6, '#8fb8ff'], [-2.0, 1.1, -1.4, '#f26aa6']].forEach(([x, y, z, c]) => { B.box(x - 0.1, y, z, 0.18, 0.04, 0.22, c, { f: 63, ao: 1, rz: 0.4 }); B.box(x + 0.1, y, z, 0.18, 0.04, 0.22, c, { f: 63, ao: 1, rz: -0.4 }); });
    tufts(B, K, -6.6, 6.6, -6.6, 6.6, 10, 0, (x, z) => Math.abs(x) > 1 && Math.abs(z) > 1);
  }),
  piece('N13', 'Mushroom ring', 'N', 'NNNN', B => {
    const K = B.K;
    B.grid((x, z, i, j) => gcell(i, j, Math.hypot(x, z) < 4.6 ? P.grassDk : P.grass, '#7ccf4e'));
    for (let k = 0; k < 13; k++) { const a = k / 13 * PI * 2, r = 3.6 + (K.rnd() - 0.5) * 0.4; mush(B, Math.cos(a) * r, 0, Math.sin(a) * r, 0.8 + K.rnd() * 0.9, k % 4 === 0 ? '#e8a03a' : '#e04a3a'); }
    const gC = B.glow('#6af0ff', 1.4), gP = B.glow('#c08aff', 1.4);
    [[0, 0, 1.6, gC], [0.7, 0.4, 0.9, gP], [-0.6, 0.5, 1.0, gC], [0.2, -0.7, 0.8, gP], [-0.5, -0.4, 0.6, gC]].forEach(([x, z, s, gk]) => mush(B, x, 0, z, s, '#6af0ff', gk));
    for (let k = 0; k < (K.low ? 4 : 9); k++) B.box((K.rnd() - 0.5) * 7, 0.6 + K.rnd() * 1.4, (K.rnd() - 0.5) * 7, 0.1, 0.1, 0.1, '#e8ff8a', { k: B.glow('#e8ff8a', 2.4) });
    /* giant mushroom */
    B.box(-5.0, 0, -4.8, 0.7, 1.8, 0.7, '#f4eee0'); B.box(-5.0, 0, -4.8, 1.0, 0.3, 1.0, '#e8e2d6');
    B.box(-5.0, 1.7, -4.8, 2.6, 0.5, 2.6, '#c8443a', { f: 63 }); B.box(-5.0, 2.2, -4.8, 1.8, 0.35, 1.8, '#d8503c');
    [[-5.6, -4.4], [-4.4, -5.3], [-4.7, -4.2]].forEach(([x, z]) => B.box(x, 2.55, z, 0.32, 0.03, 0.32, '#f6f2ea', { f: 1 }));
    rock(B, 5.2, 0, 4.8, 0.9); rock(B, -5.2, 0, 4.4, 0.7);
    tree(B, K, 5.2, -5.0, { h: 4.0, w: 3.0, arms: 1, top: P.leafDk[0], bot: P.leafDk[1] }); tree(B, K, 5.2, -0.4, { h: 3.4, w: 2.4, arms: 0, top: P.leafDk[0], bot: P.leafDk[1] });
    log(B, -1.4, 5.6, 0.3, 2.4);
    tufts(B, K, -6.6, 6.6, -6.6, 6.6, 10, 0, (x, z) => Math.hypot(x, z) > 4.4);
  }),
  piece('N14', 'Campfire clearing', 'N', 'NNNN', B => {
    const K = B.K;
    B.grid((x, z, i, j) => Math.hypot(x, z) < 3.2 + 0.3 * Math.sin(x * 2 + z) ? { h: 0.012, c: pick(['#c9a06a', '#bf955f', '#d2aa74'], i, j, 2), s: 'flat' } : gcell(i, j));
    for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; B.box(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95, 0.45, 0.3, 0.45, pick(P.stone, k, 0, 3), { ry: a }); }
    [[0.5, 0], [-0.5, 0]].forEach(([a]) => { B.box(0, 0.3, 0, 1.3, 0.2, 0.2, P.bark, { rz: a, ry: 0.4 }); B.box(0, 0.3, 0, 1.3, 0.2, 0.2, P.bark, { rz: a, ry: 1.97 }); });
    B.box(0, 0.1, 0, 0.6, 0.45, 0.6, '#ff7a2a', { k: B.glow('#ff7a2a', 2.4) });
    B.box(0.05, 0.45, 0, 0.4, 0.4, 0.4, '#ffb03a', { k: B.glow('#ffb03a', 2.6) });
    B.box(-0.05, 0.8, 0.05, 0.22, 0.3, 0.22, '#ffe07a', { k: B.glow('#ffe07a', 3) });
    B.box(0.25, 1.15, -0.1, 0.1, 0.1, 0.1, '#ffb03a', { k: B.glow('#ffb03a', 2.6) });
    B.lamp(0, 0.9, 0);
    [[0, 2.4, 0], [2.1, -1.2, PI / 3], [-2.1, -1.2, -PI / 3]].forEach(([x, z, r]) => B.at(x, 0, z, r, () => { B.box(0, 0, 0, 1.8, 0.45, 0.5, P.bark); B.box(0.91, 0.05, 0, 0.02, 0.35, 0.4, '#e0b884', { f: 2 }); B.box(-0.91, 0.05, 0, 0.02, 0.35, 0.4, '#e0b884', { f: 4 }); }));
    /* tent */
    B.at(3.8, 0, -3.6, -0.5, () => {
      [3.0, 2.4, 1.8, 1.2, 0.6].forEach((w, k) => B.box(0, k * 0.42, 0, w, 0.42, 2.6, k % 2 ? '#e8b84a' : '#f0c45a', { f: 63 }));
      B.box(0, 0, 1.31, 0.9, 1.1, 0.02, '#8a5a2a', { f: 8 });
      B.box(0, 2.1, 0, 0.12, 0.3, 2.7, '#7a5232');
      [[-1.8, 1.4], [1.8, 1.4], [-1.8, -1.4], [1.8, -1.4]].forEach(([a, b]) => B.box(a, 0, b, 0.1, 0.25, 0.1, P.woodDk));
    });
    /* lantern on a stump, firewood */
    B.box(-3.6, 0, -3.4, 0.9, 0.6, 0.9, P.bark); B.box(-3.6, 0.6, -3.4, 0.92, 0.03, 0.92, '#e0b884', { f: 1 });
    B.box(-3.6, 0.63, -3.4, 0.3, 0.4, 0.3, P.warm, { k: B.glow(P.warm, 1.8) }); B.box(-3.6, 1.03, -3.4, 0.38, 0.08, 0.38, P.iron);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) B.box(-3.6 + (k - (3 - r) / 2) * 0.4, r * 0.35, 3.8, 0.36, 0.35, 1.2, k % 2 ? P.bark : '#9a6a3e');
    tree(B, K, -5.4, 0.4, { h: 4.6, w: 3.2, arms: 1 }); tree(B, K, -5.2, 5.0, { h: 4.0, w: 3.0, arms: 1 }); tree(B, K, 0.6, -5.6, { h: 3.8, w: 2.8, arms: 1, top: P.gold[0], bot: P.gold[1] });
    bush(B, K, 4.8, 0, 1.0); bush(B, K, 5.4, 0, 5.2, { s: 0.8, fl: '#ffd84a' });
    flowers(B, K, -6.6, 6.6, -6.6, 6.6, 10, 0, null, (x, z) => Math.hypot(x, z) > 3.8);
  }),
  piece('N15', 'Farm patch', 'N', 'NNNN', B => {
    const K = B.K;
    const inField = (x, z) => Math.abs(x) <= 5.5 && z >= -5 && z <= 5.5;
    B.grid((x, z, i, j) => {
      if (!inField(x, z)) return gcell(i, j);
      const ridge = j % 2 === 0;
      return ridge ? { h: 0.12, c: pick(['#a87448', '#b07c4e'], i, j, 2), s: 'flat' } : { h: 0.02, c: '#8a5a36', s: 'flat' };
    });
    for (let j = 0; j < 32; j += 2) {
      const z = -8 + (j + 0.5) * 0.5;
      if (z < -5 || z > 5.5) continue;
      const kind = z < -2 ? 'wheat' : z < 1 ? 'carrot' : z < 3 ? 'cabbage' : 'pumpkin';
      const step = kind === 'pumpkin' ? 1.6 : kind === 'wheat' ? 0.9 : 1.0;
      for (let x = -5.0; x <= 5.0; x += step) {
        if (Math.abs(x) < 0.6 && z > -1.5 && z < 0.5) continue;
        if (kind === 'wheat') { B.box(x, 0.12, z, 0.14, 0.8, 0.14, '#e8c04a', { f: 30 }); B.box(x + 0.2, 0.12, z + 0.05, 0.14, 0.95, 0.14, '#f0cc5a', { f: 31 }); B.box(x + 0.1, 0.92, z, 0.2, 0.28, 0.2, '#f4d870', { ao: 1 }); }
        else if (kind === 'carrot') { B.box(x, 0.12, z, 0.22, 0.1, 0.22, '#ff8a2a', { ao: 1 }); B.box(x, 0.22, z, 0.1, 0.3, 0.1, '#5fae45', { ao: 1 }); B.box(x + 0.1, 0.22, z, 0.08, 0.22, 0.08, '#6cc04a', { ao: 1 }); }
        else if (kind === 'cabbage') { B.box(x, 0.12, z, 0.55, 0.4, 0.55, '#7cc84a'); B.box(x, 0.52, z, 0.35, 0.08, 0.35, '#a8e07a', { ao: 1 }); }
        else { B.box(x, 0.12, z, 0.75, 0.5, 0.75, '#f08a2a'); B.box(x, 0.62, z, 0.12, 0.18, 0.12, '#5a7a2a'); B.box(x + 0.4, 0.12, z + 0.2, 0.35, 0.06, 0.3, '#5fae45', { ao: 1 }); }
      }
    }
    /* scarecrow */
    B.box(0, 0.12, -0.5, 0.18, 2.4, 0.18, P.woodDk); B.box(0, 1.7, -0.5, 1.8, 0.14, 0.14, P.woodDk);
    B.box(0, 1.2, -0.5, 0.7, 0.75, 0.4, '#3a6ab0'); B.box(0, 1.2, -0.5, 1.4, 0.3, 0.3, '#3a6ab0');
    B.box(0, 2.05, -0.5, 0.45, 0.45, 0.45, '#e8d2a0'); B.box(0, 2.5, -0.5, 0.8, 0.08, 0.8, '#c8a050', { f: 63 }); B.box(0, 2.58, -0.5, 0.45, 0.28, 0.45, '#c8a050');
    fence(B, -6.2, -5.8, 6.2, -5.8); fence(B, -6.2, -5.8, -6.2, 6.2); fence(B, 6.2, -5.8, 6.2, 6.2); fence(B, -6.2, 6.2, -1.2, 6.2); fence(B, 1.2, 6.2, 6.2, 6.2);
    /* wheelbarrow at the gate */
    B.at(-3.4, 0, 6.6, 0, () => { B.box(0, 0.3, 0, 1.2, 0.4, 0.7, '#d8503c'); B.box(0.75, 0.1, 0, 0.3, 0.3, 0.12, P.iron); B.box(-0.8, 0.45, 0.25, 0.8, 0.08, 0.08, P.woodDk); B.box(-0.8, 0.45, -0.25, 0.8, 0.08, 0.08, P.woodDk); B.box(0, 0.7, 0, 1.0, 0.1, 0.5, '#f0cc5a', { ao: 1 }); });
  }),
  piece('N16', 'Lawn', 'N', 'NNNN', B => {
    const K = B.K; meadowBase(B);
    tufts(B, K, -6.6, 6.6, -6.6, 6.6, 10);
    flowers(B, K, -6.6, 6.6, -6.6, 6.6, 8);

  })
];

/* ================= PROPS: buildings and objects ================= */
const PROPS = [
  prop({ id: 'P01', name: 'Cottage', solid: true,
    parts: { walls: { finishes: ['plaster', 'brick', 'wood', 'stone'], colour: '#f2e6c8' }, roof: { finishes: ['tiles', 'thatch', 'slate'], colour: '#d8503c' }, trim: { colour: '#7a5232' }, shutters: { colour: '#3a7aa8' }, door: { colour: '#6a3a1e' }, glow: { on: true, colour: '#ffcf7a' } },
    extras: { flowerBoxes: true, chimney: true, fence: true },
    looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    const { p, e, ab } = R, W = 6, D = 5, FH = 0.4, H = 2.6;
    B.box(0, 0, 0, W + 0.3, FH, D + 0.3, wr(B, '#a8a49c', ab));
    body(B, K, W, D, FH, H, p.walls.finish, p.walls.colour, p.trim.colour, ab);
    B.box(0, FH + H - 0.22, 0, W + 0.14, 0.22, D + 0.14, wr(B, p.trim.colour, ab), { f: 30 });
    roof(B, K, W, D, FH + H, p.roof.finish, p.roof.colour, p.walls.colour, ab, { trim: p.trim.colour });
    if (e.chimney) {
      const cy = FH + H + 0.3;
      B.box(1.6, cy, -1.0, 0.9, 2.9, 0.9, wr(B, '#9a8a7a', ab));
      if (!ab) { B.box(1.6, cy + 2.9, -1.0, 1.15, 0.2, 1.15, '#6a5e54', { f: 63 }); B.box(1.6, cy + 3.1, -1.0, 0.4, 0.3, 0.4, '#4a4440'); }
      else B.box(1.8, cy + 2.9, -1.0, 0.5, 0.25, 0.9, wr(B, '#9a8a7a', ab));
    }
    B.at(0, FH, D / 2, 0, () => doorway(B, K, { colour: p.door.colour, trim: p.trim.colour, ab, lantern: true, glow: p.glow.on, gc: p.glow.colour }));
    B.box(0, 0, D / 2 + 0.55, 1.8, FH, 0.9, wr(B, '#b4b0a8', ab));
    const wo = { trim: p.trim.colour, glow: p.glow.on, gc: p.glow.colour, shut: p.shutters.colour, fb: e.flowerBoxes, ab };
    B.at(-1.85, FH, D / 2, 0, () => win(B, K, Object.assign({ y: 1.4 }, wo)));
    B.at(1.85, FH, D / 2, 0, () => win(B, K, Object.assign({ y: 1.4, faint: true }, wo)));
    B.at(W / 2, FH, 0.3, PI / 2, () => win(B, K, Object.assign({ y: 1.4 }, wo, { fb: false })));
    B.at(-W / 2, FH, -0.3, -PI / 2, () => win(B, K, Object.assign({ y: 1.4 }, wo, { fb: false })));
    B.at(0, FH, -D / 2, PI, () => win(B, K, Object.assign({ y: 1.4 }, wo, { fb: false, shut: null })));
    [0, 1].forEach(k => B.box(0, 0, D / 2 + 1.4 + k * 0.75, 0.7, 0.06, 0.5, wr(B, '#c0bcb4', ab)));
    if (e.fence) { fence(B, -3.6, D / 2 + 2.4, -0.9, D / 2 + 2.4, { broken: ab }); fence(B, 0.9, D / 2 + 2.4, 3.6, D / 2 + 2.4, { broken: ab }); }
    if (ab) { tufts(B, K, -3.4, 3.4, D / 2 + 0.3, D / 2 + 2.2, 10); deadTree(B, K, -4.6, -1.6, { h: 3.4 }); }
    else { bush(B, K, -3.0, 0, D / 2 + 0.7, { s: 0.7, fl: '#f26aa6' }); bush(B, K, 3.0, 0, D / 2 + 0.7, { s: 0.7, fl: '#ffd84a' }); }
  }),
  prop({ id: 'P02', name: 'Corner shop', solid: true,
    parts: { walls: { finishes: ['brick', 'plaster', 'wood', 'stone'], colour: '#c8644a' }, trim: { colour: '#f2ead8' }, awning: { colour: '#2f8a5a' }, door: { colour: '#2f4f6e' }, sign: { colour: '#2f3a4a' }, glow: { on: true, colour: '#ffcf7a' } },
    extras: { crates: true, bench: true },
    looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    const { p, e, ab } = R, W = 7, D = 6, FH = 0.2, H1 = 3.2, H2 = 2.8, top = FH + H1 + H2, tr = wr(B, p.trim.colour, ab);
    B.box(0, 0, 0, W + 0.2, FH, D + 0.2, wr(B, '#a8a49c', ab));
    body(B, K, W, D, FH, H1 + H2, p.walls.finish, p.walls.colour, p.trim.colour, ab);
    B.box(0, FH + H1 - 0.1, 0, W + 0.24, 0.25, D + 0.24, tr, { f: 30 });
    B.box(0, top, 0, W + 0.5, 0.3, D + 0.5, tr, { f: 62 });
    B.box(0, top + 0.3, 0, W - 0.2, 0.02, D - 0.2, '#6e7078', { f: 1 });
    [[0, D / 2 + 0.05, W + 0.3, 0.3], [0, -D / 2 - 0.05, W + 0.3, 0.3], [W / 2 + 0.05, 0, 0.3, D + 0.3], [-W / 2 - 0.05, 0, 0.3, D + 0.3]].forEach(([x, z, sx, sz]) => B.box(x, top + 0.3, z, sx, 0.6, sz, wr(B, p.walls.colour, ab), { f: 31 }));
    B.box(-1.6, top + 0.32, -1.2, 1.2, 0.8, 1.0, '#8a8d96'); B.box(2.0, top + 0.32, -1.6, 0.9, 1.2, 0.9, '#9a6a3e');
    B.at(-0.9, FH, D / 2, 0, () => { win(B, K, { y: 1.6, w: 3.8, h: 1.9, trim: p.trim.colour, glow: p.glow.on, gc: p.glow.colour, ab, plain: true }); B.box(0, 0, 0.05, 4.0, 0.5, 0.1, B.mul(tr, 0.85), { f: 15 }); });
    B.at(2.45, FH, D / 2, 0, () => doorway(B, K, { w: 1.1, h: 2.3, colour: p.door.colour, trim: p.trim.colour, ab }));
    /* awning */
    for (let k = 0; k < 13; k++) {
      if (ab && k % 4 === 2) continue;
      const u = -3.1 + 0.25 + k * 0.5, c = wr(B, k % 2 ? '#f5efe2' : p.awning.colour, ab);
      B.box(u, FH + 2.65, D / 2 + 0.85, 0.5, 0.08, 1.7, c, { rx: 0.35, f: 63 });
      B.box(u, FH + 2.15, D / 2 + 1.62, 0.5, 0.3, 0.06, c, { f: 63, rz: ab && k === 5 ? 0.4 : 0 });
    }
    [-3.0, 3.0].forEach(x => B.box(x, FH + 2.5, D / 2 + 0.7, 0.08, 0.08, 1.4, P.iron, { rx: 0.35 }));
    /* sign with glowing letters */
    B.box(-0.9, FH + H1 + 0.15, D / 2 + 0.06, 3.6, 0.6, 0.14, wr(B, p.sign.colour, ab), { f: 15 });
    for (let k = 0; k < 6; k++) { const on = p.glow.on && !(ab && k % 2); B.box(-2.15 + k * 0.5, FH + H1 + 0.27, D / 2 + 0.14, 0.32, 0.34, 0.04, on ? p.glow.colour : '#4a4f5a', on ? { k: B.glow(p.glow.colour, 1.6), f: 8 } : { f: 8, ao: 1 }); }
    const wo = { trim: p.trim.colour, glow: p.glow.on, gc: p.glow.colour, ab, shut: null, fb: !ab };
    [-2.3, 0, 2.3].forEach((x, k) => B.at(x, FH, D / 2, 0, () => win(B, K, Object.assign({ y: H1 + 1.4, faint: k === 1 }, wo))));
    [[W / 2, PI / 2], [-W / 2, -PI / 2]].forEach(([x, r]) => [-1.4, 1.4].forEach(z => { B.at(x, FH, z, r, () => win(B, K, Object.assign({ y: H1 + 1.4 }, wo, { fb: false }))); B.at(x, FH, z, r, () => win(B, K, Object.assign({ y: 1.6 }, wo, { fb: false }))); }));
    if (e.crates && !ab) { crate(B, -2.6, 0, D / 2 + 0.6, '#e04a3a'); crate(B, -1.8, 0, D / 2 + 0.6, '#ff9a3a'); crate(B, -1.0, 0, D / 2 + 0.6, '#7cc84a'); }
    if (e.crates && ab) { crate(B, -2.2, 0, D / 2 + 0.8, null, 0.5); crate(B, -1.4, 0, D / 2 + 1.4, null, 1.2); }
    if (e.bench) bench(B, 2.2, D / 2 + 2.4, PI, { wood: ab ? '#7a6a5a' : P.wood });
    if (ab) tufts(B, K, -3.4, 3.4, D / 2 + 0.3, D / 2 + 2.0, 8);
  }),
  prop({ id: 'P03', name: 'Café', solid: true,
    parts: { walls: { finishes: ['plaster', 'wood', 'brick', 'stone'], colour: '#f3d9b0' }, roof: { finishes: ['tiles', 'slate', 'thatch'], colour: '#3a6ab0' }, awning: { colour: '#d8503c' }, trim: { colour: '#f4efe6' }, door: { colour: '#7a4a2a' }, glow: { on: true, colour: '#ffcf7a' } },
    extras: { tables: true, stringLights: true, menuBoard: true },
    looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    const { p, e, ab } = R, W = 6, D = 5, FH = 0.3, H = 3.2;
    B.box(0, 0, 0, W + 0.2, FH, D + 0.2, wr(B, '#a8a49c', ab));
    body(B, K, W, D, FH, H, p.walls.finish, p.walls.colour, p.trim.colour, ab);
    roof(B, K, W, D, FH + H, p.roof.finish, p.roof.colour, p.walls.colour, ab, { trim: p.trim.colour });
    B.at(0, FH, D / 2, 0, () => doorway(B, K, { w: 1.2, h: 2.3, colour: p.door.colour, trim: p.trim.colour, ab }));
    const wo = { trim: p.trim.colour, glow: p.glow.on, gc: p.glow.colour, ab, fb: true };
    [-1.9, 1.9].forEach((x, k) => B.at(x, FH, D / 2, 0, () => win(B, K, Object.assign({ y: 1.45, w: 1.5, h: 1.6, faint: k === 0 }, wo))));
    B.at(W / 2, FH, 0, PI / 2, () => win(B, K, Object.assign({ y: 1.45, w: 1.4, h: 1.4 }, wo, { fb: false })));
    B.at(-W / 2, FH, 0, -PI / 2, () => win(B, K, Object.assign({ y: 1.45, w: 1.4, h: 1.4 }, wo, { fb: false })));
    for (let k = 0; k < 12; k++) {
      if (ab && k % 5 === 3) continue;
      const u = -3 + 0.25 + k * 0.5, c = wr(B, k % 2 ? '#f5efe2' : p.awning.colour, ab);
      B.box(u, FH + 2.7, D / 2 + 0.75, 0.5, 0.08, 1.5, c, { rx: 0.3, f: 63 });
      B.box(u, FH + 2.25, D / 2 + 1.45, 0.5, 0.26, 0.06, c, { f: 63 });
    }
    if (e.stringLights) for (let k = 0; k < 10; k++) { const on = p.glow.on && !ab; B.box(-2.7 + k * 0.6, FH + 2.1 - (k % 2) * 0.08, D / 2 + 1.5, 0.14, 0.16, 0.14, on ? '#ffd27a' : '#5a5a60', on ? { k: B.glow('#ffd27a', 2.2) } : { ao: 1 }); }
    B.box(0, FH + 2.6, D / 2 + 0.1, 2.0, 0.42, 0.1, wr(B, '#2f2a26', ab), { f: 15 });
    if (p.glow.on && !ab) { B.box(-0.4, FH + 2.68, D / 2 + 0.16, 0.26, 0.26, 0.04, p.glow.colour, { k: B.glow(p.glow.colour, 1.6), f: 8 }); B.box(-0.22, FH + 2.74, D / 2 + 0.16, 0.08, 0.14, 0.04, p.glow.colour, { k: B.glow(p.glow.colour, 1.6), f: 8 }); for (let k = 0; k < 3; k++) B.box(0.15 + k * 0.28, FH + 2.72, D / 2 + 0.16, 0.18, 0.18, 0.04, p.glow.colour, { k: B.glow(p.glow.colour, 1.6), f: 8 }); }
    if (e.tables) [-1.8, 1.8].forEach((x, t) => {
      const z = D / 2 + 3.0;
      if (ab && t === 1) { B.box(x, 0.46, z, 1.0, 0.08, 1.0, '#7a6a5a', { rx: 1.2 }); return; }
      B.box(x, 0, z, 0.5, 0.06, 0.5, P.iron); B.box(x, 0.06, z, 0.12, 0.7, 0.12, P.iron); B.box(x, 0.76, z, 1.0, 0.07, 1.0, wr(B, '#f4efe6', ab));
      B.box(x, 0.83, z, 0.08, 1.6, 0.08, P.woodDk);
      B.box(x, 2.4, z, 2.2, 0.14, 2.2, wr(B, p.awning.colour, ab), { f: 63 }); B.box(x, 2.54, z, 1.3, 0.14, 1.3, wr(B, '#f5efe2', ab)); B.box(x, 2.68, z, 0.2, 0.14, 0.2, P.woodDk);
      [-0.85, 0.85].forEach(dx => { B.box(x + dx, 0, z, 0.08, 0.45, 0.08, P.iron); B.box(x + dx, 0.45, z, 0.5, 0.07, 0.5, wr(B, '#3a8a6a', ab)); B.box(x + dx + (dx > 0 ? 0.22 : -0.22), 0.52, z, 0.06, 0.5, 0.5, wr(B, '#3a8a6a', ab)); });
      B.box(x + 0.2, 0.83, z + 0.1, 0.14, 0.14, 0.14, '#f8f4ec', { ao: 1 });
    });
    if (e.menuBoard) B.at(2.9, 0, D / 2 + 1.2, -0.3, () => { B.box(0, 0, 0.18, 0.7, 1.1, 0.06, '#2f4a3a', { rx: -0.18 }); B.box(0, 0, -0.18, 0.7, 1.1, 0.06, '#2f4a3a', { rx: 0.18 }); [0.75, 0.6, 0.45].forEach(y => B.box(0, y, 0.25, 0.45, 0.04, 0.02, '#e8e4dc', { rx: -0.18, f: 8 })); });
    if (!ab) { planter(B, K, -0.95, D / 2 + 0.6, { s: 0.6 }); planter(B, K, 0.95, D / 2 + 0.6, { s: 0.6, fl: '#ffd84a' }); }
    else tufts(B, K, -3, 3, D / 2 + 0.3, D / 2 + 2.0, 8);
  }),
  prop({ id: 'P04', name: 'Townhouse', solid: true,
    parts: { walls: { finishes: ['brick', 'stone', 'plaster', 'siding'], colour: '#b85a48' }, trim: { colour: '#efe6d6' }, roof: { colour: '#4a4f5a' }, door: { colour: '#2f4f6e' }, glow: { on: true, colour: '#ffcf7a' } },
    extras: { planters: true, porchLamp: true },
    looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    const { p, e, ab } = R, W = 5, D = 6, FH = 1.0, FL = 2.8, top = FH + FL * 3, tr = wr(B, p.trim.colour, ab), wc = wr(B, p.walls.colour, ab);
    B.box(0, 0, 0, W + 0.2, FH, D + 0.2, wr(B, '#8f8d89', ab));
    body(B, K, W, D, FH, FL * 3, p.walls.finish, p.walls.colour, p.trim.colour, ab);
    [1, 2].forEach(f => B.box(0, FH + f * FL - 0.1, 0, W + 0.18, 0.2, D + 0.18, tr, { f: 30 }));
    B.box(0, top, 0, W + 0.5, 0.3, D + 0.5, tr, { f: 62 });
    for (let u = -2.4; u <= 2.4; u += 0.4) B.box(u, top - 0.18, D / 2 + 0.12, 0.16, 0.18, 0.16, tr, { ao: 1 });
    B.box(0, top + 0.3, 0, W, 0.02, D, wr(B, p.roof.colour, ab), { f: 1 });
    [3.8, 2.8, 1.8, 0.9].forEach((w, k) => B.box(0, top + 0.3 + k * 0.8, D / 2 - 0.25, w + 1.2 - k * 0.1, 0.8, 0.5, wc, { f: 31 }));
    [3.8, 2.8, 1.8, 0.9].forEach((w, k) => B.box(0, top + 1.1 + k * 0.8 - 0.04, D / 2 - 0.25, w + 1.36 - k * 0.1, 0.12, 0.62, tr, { f: 63 }));
    B.box(0, top + 0.95, D / 2 + 0.01, 0.8, 0.8, 0.06, p.glow.on && !ab ? p.glow.colour : '#262a2c', p.glow.on && !ab ? { k: B.glow(p.glow.colour, 1.3), f: 8 } : { f: 8, ao: 1 });
    B.box(0, top + 0.85, D / 2, 1.0, 1.0, 0.04, tr, { f: 8, ao: 1 });
    [[-1.4, -1.6], [1.4, -1.8]].forEach(([x, z]) => { B.box(x, top + 0.3, z, 0.7, 1.2, 0.7, wr(B, '#9a6a5a', ab)); B.box(x, top + 1.5, z, 0.2, 0.3, 0.2, '#5a4a44'); });
    /* stoop */
    for (let k = 0; k < 5; k++) B.box(1.2, 0, D / 2 + (5 - k - 0.5) * 0.35, 1.5, (k + 1) * 0.2, 0.35, wr(B, k % 2 ? '#b4b0a8' : '#c0bcb4', ab));
    [0.4, 2.0].forEach(x => { B.box(x, 0, D / 2 + 1.7, 0.1, 1.0, 0.1, P.iron); B.box(x, 0.45, D / 2 + 0.85, 0.06, 0.06, 1.8, P.iron, { rx: -0.5 }); });
    B.at(1.2, FH, D / 2, 0, () => doorway(B, K, { w: 1.1, h: 2.3, colour: p.door.colour, trim: p.trim.colour, ab, lantern: e.porchLamp, glow: p.glow.on, gc: p.glow.colour }));
    const wo = { trim: p.trim.colour, glow: p.glow.on, gc: p.glow.colour, ab, shut: null, fb: false };
    B.at(-1.2, FH, D / 2, 0, () => win(B, K, Object.assign({ y: 1.4, h: 1.5 }, wo)));
    /* bay window, floor 2 */
    B.at(-1.0, FH + FL + 0.3, D / 2, 0, () => {
      B.box(0, 0, 0.4, 2.4, 2.1, 0.8, wc); B.box(0, -0.25, 0.4, 2.6, 0.25, 1.0, tr, { f: 63 }); B.box(0, 2.1, 0.4, 2.7, 0.25, 1.05, tr, { f: 63 });
      B.at(0, 0, 0.8, 0, () => win(B, K, Object.assign({ y: 1.05, w: 1.4, h: 1.4 }, wo)));
    });
    B.at(1.3, FH, D / 2, 0, () => win(B, K, Object.assign({ y: FL + 1.4, h: 1.5 }, wo)));
    [-1.2, 1.3].forEach((x, k) => B.at(x, FH, D / 2, 0, () => win(B, K, Object.assign({ y: FL * 2 + 1.4, h: 1.5, faint: k === 1 }, wo))));
    [[W / 2, PI / 2], [-W / 2, -PI / 2]].forEach(([x, r]) => [0, 1, 2].forEach(f => B.at(x, FH, 0, r, () => win(B, K, Object.assign({ y: f * FL + 1.4, w: 1.0, h: 1.3 }, wo)))));
    B.at(-1.2, 0, D / 2, 0, () => { B.box(0, 0.3, 0.05, 1.0, 0.45, 0.1, '#262a2c', { f: 15 }); for (let k = 0; k < 4; k++) B.box(-0.36 + k * 0.24, 0.3, 0.12, 0.05, 0.45, 0.05, P.iron, { f: 15 }); });
    if (e.planters && !ab) { planter(B, K, -0.2, D / 2 + 0.6, { s: 0.7 }); planter(B, K, 2.4, D / 2 + 1.8, { s: 0.6, fl: '#ffd84a' }); }
    if (ab) tufts(B, K, -2.4, 2.4, D / 2 + 0.2, D / 2 + 1.4, 6);
  }),
  prop({ id: 'P05', name: 'Barn', solid: true,
    parts: { walls: { finishes: ['wood', 'plaster', 'stone', 'brick'], colour: '#b8443a' }, roof: { finishes: ['metal', 'tiles', 'slate', 'thatch'], colour: '#5a5f6a' }, trim: { colour: '#f2ece0' }, glow: { on: true, colour: '#ffcf7a' } },
    extras: { hayBales: true, cupola: true, paddockFence: false },
    looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    const { p, e, ab } = R, W = 8, D = 10, FH = 0.3, H = 4.0, tr = wr(B, p.trim.colour, ab);
    B.box(0, 0, 0, W + 0.3, FH, D + 0.3, wr(B, '#a8a49c', ab));
    body(B, K, W, D, FH, H, p.walls.finish, p.walls.colour, p.trim.colour, ab);
    let rtop = 0;
    B.at(0, 0, 0, PI / 2, () => { rtop = roof(B, K, D, W, FH + H, p.roof.finish, p.roof.colour, p.walls.colour, ab, { n: 6, lh: 0.6, ov: 0.4, offs: [0, 0.35, 0.75, 1.6, 2.55, 3.5], trim: p.trim.colour }); });
    /* big doors */
    B.at(0, FH, D / 2, 0, () => {
      const dc = wr(B, B.mul(p.walls.colour, 0.82), ab);
      B.box(0, 0, 0.04, 3.6, 3.6, 0.08, tr, { f: 15 });
      [-0.8, 0.8].forEach((x, k) => {
        if (ab && k === 1) { B.box(x, 0, 0.12, 1.5, 3.4, 0.04, '#1c1814', { f: 15 }); B.box(x + 0.9, 0, 0.9, 1.6, 3.4, 0.12, dc, { ry: -1.1 }); return; }
        B.box(x, 0, 0.1, 1.6, 3.4, 0.1, dc, { f: 15 });
        B.box(x, 0, 0.16, 1.6, 0.16, 0.06, tr, { f: 15 }); B.box(x, 3.24, 0.16, 1.6, 0.16, 0.06, tr, { f: 15 });
        B.box(x - 0.74, 0, 0.16, 0.12, 3.4, 0.06, tr, { f: 15 }); B.box(x + 0.74, 0, 0.16, 0.12, 3.4, 0.06, tr, { f: 15 });
        B.box(x, 1.63, 0.18, 3.5, 0.14, 0.05, tr, { rz: 1.13, f: 15 }); B.box(x, 1.63, 0.18, 3.5, 0.14, 0.05, tr, { rz: -1.13, f: 15 });
      });
      B.door(0, 0, 0.4, 0);
      /* loft door + hay + pulley beam */
      B.box(0, H + 0.6, -0.05, 1.6, 1.5, 0.14, tr, { f: 15 }); B.box(0, H + 0.65, 0.02, 1.4, 1.4, 0.1, '#2a2420', { f: 15 });
      B.box(0, H + 0.65, 0.05, 1.1, 0.7, 0.4, '#f0cc5a');
      B.box(0, H + 2.6, 0.4, 0.3, 0.3, 1.4, P.woodDk); B.box(0, H + 1.9, 1.0, 0.04, 0.7, 0.04, '#8a7a5a'); B.box(0, H + 1.75, 1.0, 0.2, 0.18, 0.2, P.iron);
      const on = p.glow.on && !ab; B.box(2.3, 2.8, 0.2, 0.3, 0.38, 0.3, on ? p.glow.colour : '#3a3f44', on ? { k: B.glow(p.glow.colour, 1.8) } : { ao: 1 }); B.box(2.3, 3.18, 0.2, 0.4, 0.1, 0.4, P.iron);
    });
    const wo = { trim: p.trim.colour, glow: p.glow.on, gc: p.glow.colour, ab, w: 0.9, h: 0.9, y: 2.4 };
    [[W / 2, PI / 2], [-W / 2, -PI / 2]].forEach(([x, r]) => [-2.5, 2.5].forEach((z, k) => B.at(x, FH, z, r, () => win(B, K, Object.assign({ faint: k === 0 && x > 0 }, wo)))));
    if (e.cupola) {
      const cy = rtop + 0.18;
      B.box(0, cy, 0, 1.3, 1.2, 1.3, wr(B, p.walls.colour, ab));
      for (let k = 0; k < 3; k++) [-1, 1].forEach(s => B.box(s * 0.66, cy + 0.25 + k * 0.28, 0, 0.04, 0.12, 1.0, tr, { ao: 1 }));
      B.box(0, cy + 1.2, 0, 1.7, 0.25, 1.7, wr(B, p.roof.colour, ab), { f: 63 }); B.box(0, cy + 1.45, 0, 1.0, 0.25, 1.0, wr(B, p.roof.colour, ab)); B.box(0, cy + 1.7, 0, 0.08, 0.9, 0.08, P.iron);
      if (!ab) { B.box(0.2, cy + 2.35, 0, 0.6, 0.12, 0.06, P.iron); B.box(-0.15, cy + 2.38, 0, 0.3, 0.2, 0.04, P.iron); }
    }
    if (e.hayBales) [[-3.2, D / 2 + 1.4], [-2.0, D / 2 + 1.8], [-2.6, D / 2 + 1.6, 0.9]].forEach(([x, z, y]) => { B.box(x, y || 0, z, 1.1, 0.9, 1.1, wr(B, '#f0cc5a', ab)); B.box(x, (y || 0) + 0.3, z, 1.12, 0.06, 1.12, '#c8a040', { ao: 1 }); });
    if (e.paddockFence) { fence(B, W / 2 + 0.8, -D / 2, W / 2 + 0.8, D / 2, { broken: ab }); }
    if (ab) { tufts(B, K, -4, 4, D / 2 + 0.4, D / 2 + 2.2, 10); B.box(2.2, FH + 1.0, D / 2 + 0.06, 0.8, 1.2, 0.04, '#1c1814', { f: 8 }); }
  }),
  prop({ id: 'P06', name: 'Windmill', solid: true,
    parts: { walls: { finishes: ['stone', 'plaster', 'brick', 'wood'], colour: '#d8d2c4' }, roof: { finishes: ['tiles', 'slate', 'thatch'], colour: '#7a4a32' }, sails: { colour: '#f2ead6' }, trim: { colour: '#7a5232' }, glow: { on: true, colour: '#ffcf7a' } },
    extras: { balcony: true },
    looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    const { p, e, ab } = R, tr = wr(B, p.trim.colour, ab);
    const tiers = [4.6, 4.1, 3.6, 3.1];
    tiers.forEach((w, k) => { body(B, K, w, w, k * 2.4, 2.4, p.walls.finish, p.walls.colour, p.trim.colour, ab, { noPosts: true }); B.box(0, k * 2.4 + 2.3, 0, w + 0.2, 0.2, w + 0.2, tr, { f: 63 }); });
    [3.7, 2.9, 2.1, 1.3].forEach((w, k) => B.box(0, 9.6 + k * 0.6, 0, w, 0.6, w, wr(B, k % 2 ? B.mul(p.roof.colour, 0.88) : p.roof.colour, ab), { f: 63 }));
    B.box(0, 12.0, 0, 0.3, 0.6, 0.3, tr);
    B.at(0, 0, tiers[0] / 2, 0, () => doorway(B, K, { w: 1.1, h: 2.0, colour: '#6a3a1e', trim: p.trim.colour, ab, lantern: true, glow: p.glow.on, gc: p.glow.colour }));
    const wo = { trim: p.trim.colour, glow: p.glow.on, gc: p.glow.colour, ab, w: 0.8, h: 0.9 };
    B.at(0, 2.4, tiers[1] / 2, 0, () => win(B, K, Object.assign({ y: 1.2 }, wo)));
    B.at(tiers[2] / 2, 4.8, 0, PI / 2, () => win(B, K, Object.assign({ y: 1.2, faint: true }, wo)));
    B.at(-tiers[1] / 2, 2.4, 0, -PI / 2, () => win(B, K, Object.assign({ y: 1.2 }, wo)));
    if (e.balcony) {
      B.box(0, 2.4, 0, tiers[0] + 1.6, 0.2, tiers[0] + 1.6, wr(B, P.wood, ab), { f: 63 });
      const r = (tiers[0] + 1.6) / 2 - 0.1;
      [[0, r, tiers[0] + 1.4, 0.08], [0, -r, tiers[0] + 1.4, 0.08], [r, 0, 0.08, tiers[0] + 1.4], [-r, 0, 0.08, tiers[0] + 1.4]].forEach(([x, z, sx, sz]) => B.box(x, 3.4, z, sx, 0.1, sz, tr));
      for (let k = -3; k <= 3; k++) [[k * 0.9, r], [k * 0.9, -r], [r, k * 0.9], [-r, k * 0.9]].forEach(([x, z]) => B.box(x, 2.6, z, 0.1, 0.8, 0.1, tr));
    }
    /* hub + sails */
    const hubY = 8.8, hz = tiers[3] / 2;
    B.box(0, hubY - 0.45, hz + 0.45, 0.9, 0.9, 0.9, tr); B.box(0, hubY - 0.25, hz + 0.95, 0.5, 0.5, 0.2, wr(B, '#4a4440', ab));
    const L = 6.0, z = hz + 1.0;
    for (let k = 0; k < 4; k++) {
      if (ab && k === 2) continue;
      const a = PI / 4 + k * PI / 2, ca = Math.cos(a), sa = Math.sin(a), len = ab && k === 1 ? 3.8 : L;
      B.box(ca * (len / 2 + 0.3), hubY + sa * (len / 2 + 0.3) - 0.12, z, len, 0.24, 0.16, tr, { rz: a });
      const sr = 1.0 + (len - 1.2) / 2, px = -sa * 0.6, py = ca * 0.6;
      B.box(ca * sr + px, hubY + sa * sr + py - 0.5, z + 0.06, len - 1.2, 1.0, 0.06, wr(B, p.sails.colour, ab), { rz: a, f: 63 });
      for (let t = 1.6; t < len; t += 1.2) B.box(ca * t + px, hubY + sa * t + py - 0.6, z + 0.12, 0.08, 1.2, 0.06, tr, { rz: a });
    }
    if (ab) tufts(B, K, -2.6, 2.6, 2.4, 3.6, 8);
  }),
  prop({ id: 'P07', name: 'Bandstand', solid: true,
    parts: { base: { colour: '#efe8da' }, roof: { colour: '#d8503c' }, trim: { colour: '#f4efe6' }, accent: { colour: '#f5d400' }, lights: { on: true, colour: '#ffd27a' } },
    extras: { instruments: true, speakers: true },
    looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    const { p, e, ab } = R, bc = wr(B, p.base.colour, ab), tr = wr(B, p.trim.colour, ab), rc = p.roof.colour, on = p.lights.on && !ab;
    const oct = (y, h, s, c, o) => { B.box(0, y, 0, s, h, s * 0.62, c, o); B.box(0, y, 0, s * 0.62, h, s, c, o); B.box(0, y, 0, s * 0.86, h, s * 0.86, c, o); };
    oct(0, 1.0, 8, bc); oct(1.0, 0.12, 8.2, tr, { f: 63 });
    for (let k = 0; k < 4; k++) B.box(0, 0, 4.0 + 0.3 * (4 - k) - 0.15, 3.0, (k + 1) * 0.25, 0.3, wr(B, k % 2 ? '#d8d2c4' : '#e2dccf', ab));
    const posts = [[3.2, 1.3], [1.3, 3.2], [-1.3, 3.2], [-3.2, 1.3], [-3.2, -1.3], [-1.3, -3.2], [1.3, -3.2], [3.2, -1.3]];
    posts.forEach(([x, z], k) => { B.box(x, 1.12, z, 0.45, 0.3, 0.45, tr); B.box(x, 1.42, z, 0.26, 2.6, 0.26, tr, { f: 30 }); B.box(x, 3.95, z, 0.42, 0.22, 0.42, tr); if (ab && k % 3 === 0) for (let y = 1.4; y < 3.6; y += 0.4) B.box(x + 0.1, y, z + 0.1, 0.3, 0.4, 0.3, '#4f8a3a', { ao: 1 }); });
    for (let k = 0; k < 8; k++) {
      const a = posts[k], b = posts[(k + 1) % 8], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if (mz > 3 && Math.abs(mx) < 0.5) continue;
      if (ab && k === 5) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      B.box(mx, 2.0, mz, len, 0.12, 0.12, tr, { ry }); B.box(mx, 1.5, mz, len, 0.08, 0.08, tr, { ry });
    }
    [8.8, 7.2, 5.6, 4.0, 2.4].forEach((s, k) => oct(4.17 + k * 0.5, 0.5, s, wr(B, k % 2 ? B.mul(rc, 0.86) : rc, ab), { f: 63 }));
    B.box(0, 6.67, 0, 0.5, 0.5, 0.5, wr(B, p.accent.colour, ab)); B.box(0, 7.17, 0, 0.12, 0.6, 0.12, tr);
    if (ab) B.box(1.6, 4.67, 1.4, 1.4, 0.52, 1.2, '#2a2420');
    /* string lights around the eave */
    for (let k = 0; k < 8; k++) { const a = posts[k], b = posts[(k + 1) % 8]; for (let t = 0.15; t < 1; t += 0.33) B.box(a[0] + (b[0] - a[0]) * t, 3.85, a[1] + (b[1] - a[1]) * t, 0.16, 0.18, 0.16, on ? p.lights.colour : '#5a5a60', on ? { k: B.glow(p.lights.colour, 2.2) } : { ao: 1 }); }
    if (on) { B.box(0, 3.95, 1.0, 0.4, 0.2, 0.4, p.lights.colour, { k: B.glow(p.lights.colour, 2.4) }); B.box(0, 3.95, -1.0, 0.4, 0.2, 0.4, p.lights.colour, { k: B.glow(p.lights.colour, 2.4) }); B.lamp(0, 3.9, 1.0); B.lamp(0, 3.9, -1.0); }
    if (e.speakers) [[-2.4, -1.8], [2.4, -1.8]].forEach(([x, z], k) => {
      const tilt = ab && k === 1 ? { rz: 1.2 } : {};
      B.box(x, 1.12, z, 0.9, 1.5, 0.8, '#2a2a30', tilt);
      if (!(ab && k === 1)) { B.box(x, 1.35, z + 0.41, 0.5, 0.5, 0.02, '#5a5a66', { f: 8, ao: 1 }); B.box(x, 2.05, z + 0.41, 0.3, 0.3, 0.02, '#5a5a66', { f: 8, ao: 1 }); }
    });
    if (e.instruments) {
      B.box(0, 1.12, -1.6, 1.0, 0.8, 0.6, wr(B, p.accent.colour, ab)); B.box(0, 1.32, -1.29, 0.6, 0.4, 0.02, '#f4efe6', { f: 8, ao: 1 });
      [[-0.7, -1.3], [0.7, -1.3]].forEach(([x, z]) => { B.box(x, 1.12, z, 0.08, 0.9, 0.08, P.iron); B.box(x, 2.0, z, 0.6, 0.04, 0.6, '#e8c050', { f: 63 }); });
      B.box(-0.35, 1.92, -1.6, 0.4, 0.3, 0.4, wr(B, p.accent.colour, ab));
      B.box(1.7, 1.12, 0.4, 0.1, 0.9, 0.1, P.iron, { rz: 0.4 }); B.box(1.7, 1.12, 0.4, 0.1, 0.9, 0.1, P.iron, { rz: -0.4 });
      B.box(1.7, 1.95, 0.4, 1.3, 0.12, 0.4, '#2a2a30'); B.box(1.7, 2.07, 0.48, 1.2, 0.02, 0.2, '#f4efe6', { f: 1 });
      B.box(0, 1.12, 1.6, 0.06, 1.4, 0.06, P.iron); B.box(0, 2.5, 1.65, 0.12, 0.18, 0.12, '#2a2a30');
    }
  }),
  prop({ id: 'P08', name: 'Video screen', solid: true,
    parts: { frame: { colour: '#2f3240' }, accent: { colour: '#f5d400' }, lights: { on: true, colour: '#e8f0ff' } },
    extras: { speakers: true },
    looks: ['fresh', 'abandoned'] }, (B, K, R, g) => {
    const { p, e, ab } = R, fc = wr(B, p.frame.colour, ab), ac = wr(B, p.accent.colour, ab), on = p.lights.on && !ab;
    [-4.1, 4.1].forEach(x => {
      B.box(x, 0, 0, 1.4, 0.2, 1.4, fc);
      [[-0.35, -0.35], [0.35, -0.35], [0.35, 0.35], [-0.35, 0.35]].forEach(([a, b]) => B.box(x + a, 0.2, b, 0.12, 7.6, 0.12, fc));
      for (let y = 0.9; y < 7.8; y += 1.0) {
        if (ab && y > 4 && y < 5.5 && x > 0) continue;
        B.box(x, y, -0.35, 0.7, 0.08, 0.08, fc); B.box(x, y, 0.35, 0.7, 0.08, 0.08, fc); B.box(x - 0.35, y, 0, 0.08, 0.08, 0.7, fc); B.box(x + 0.35, y, 0, 0.08, 0.08, 0.7, fc);
      }
      B.box(x, 1.0, 0.42, 0.74, 0.3, 0.04, ac, { f: 8, ao: 1 });
    });
    B.box(0, 2.7, 0, 7.6, 4.3, 0.5, fc, { f: 63 });
    B.box(0, 2.6, 0.26, 7.6, 0.18, 0.04, ac, { f: 8, ao: 1 });
    B.box(0, 7.0, 0, 7.8, 0.2, 0.7, fc);
    for (let k = 0; k < 7; k++) B.box(-3.3 + k * 1.1, 7.2, 0.15, 0.4, 0.26, 0.3, on ? p.lights.colour : '#5a5a60', on ? { k: B.glow(p.lights.colour, 2.0) } : { ao: 1 });
    if (e.speakers) [-4.1, 4.1].forEach(x => { B.box(x, 0.2, 1.1, 1.2, 1.4, 1.0, '#2a2a30'); B.box(x, 1.6, 1.1, 1.0, 0.9, 0.9, '#2a2a30'); B.box(x, 0.5, 1.61, 0.7, 0.7, 0.02, '#5a5a66', { f: 8, ao: 1 }); B.box(x, 1.8, 1.56, 0.4, 0.4, 0.02, '#5a5a66', { f: 8, ao: 1 }); });
    const T = B.T, scr = new T.Mesh(new T.PlaneGeometry(6.4, 3.6), K.mat({ color: '#14161f', roughness: 0.4 }));
    scr.name = 'SCREEN'; scr.position.set(0, 4.85, 0.26); g.add(scr);
  }),
  prop({ id: 'P09', name: 'Well', solid: true,
    parts: { stone: { colour: '#a8a49c' }, roof: { colour: '#b8443a' }, wood: { colour: '#8a5a36' } },
    looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    const { p, ab } = R, sc = p.stone.colour, wd = wr(B, p.wood.colour, ab);
    [[0, 0.95, 2.3, 0.4], [0, -0.95, 2.3, 0.4], [0.95, 0, 0.4, 1.5], [-0.95, 0, 0.4, 1.5]].forEach(([x, z, sx, sz], k) => B.box(x, 0, z, sx, 0.9, sz, wr(B, pick(P.stone, k, 2, 5), ab)));
    B.box(0, 0.9, 0, 2.5, 0.14, 2.5, wr(B, sc, ab), { f: 31 });
    B.box(0, 0, 0, 1.5, 0.7, 1.5, P.water, { k: 'w', f: 1 });
    [-1.0, 1.0].forEach(x => B.box(x, 0.9, 0, 0.22, 1.9, 0.22, wd));
    B.box(0, 2.3, 0, 2.3, 0.14, 0.14, wd); B.box(1.25, 2.3, 0.25, 0.1, 0.1, 0.5, P.iron); B.box(1.25, 2.1, 0.5, 0.1, 0.3, 0.1, P.iron);
    B.box(0, 1.3, 0, 0.04, 1.0, 0.04, '#c8b48a'); B.box(0, 1.0, 0, 0.4, 0.38, 0.4, wd); B.box(0, 1.34, 0, 0.42, 0.06, 0.42, P.iron);
    [[3.0, 2.4], [2.4, 1.6], [1.8, 0.8], [1.2, 0.1]].forEach(([w, d], k) => { if (ab && k === 1) return; B.box(0, 2.8 + k * 0.28, 0, w, 0.28, d, wr(B, k % 2 ? B.mul(p.roof.colour, 0.88) : p.roof.colour, ab), { f: 63 }); });
    if (ab) tufts(B, K, -1.6, 1.6, 1.3, 1.8, 5);
    else flowers(B, K, -1.6, 1.6, 1.3, 1.9, 5);
  }),
  prop({ id: 'P10', name: 'Bench', parts: { wood: { colour: '#b88a5a' }, metal: { colour: '#3a3d48' } }, looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    bench(B, 0, 0, 0, { wood: wr(B, R.p.wood.colour, R.ab), metal: wr(B, R.p.metal.colour, R.ab) });
    if (R.ab) tufts(B, K, -1, 1, -0.4, 0.4, 3);
  }),
  prop({ id: 'P11', name: 'Mailbox', parts: { box: { colour: '#3a6ab0' }, post: { colour: '#8a5a36' }, flag: { colour: '#e04a3a' } } }, (B, K, R) => {
    const { p } = R;
    B.box(0, 0, 0, 0.35, 0.15, 0.35, B.mul(p.post.colour, 0.8)); B.box(0, 0.15, 0, 0.2, 0.95, 0.2, p.post.colour);
    B.box(0, 1.1, 0, 0.5, 0.36, 0.8, p.box.colour); B.box(0, 1.46, 0, 0.36, 0.1, 0.8, p.box.colour); B.box(0, 1.2, 0.41, 0.4, 0.24, 0.02, B.mul(p.box.colour, 0.8), { f: 8, ao: 1 });
    B.box(0.28, 1.25, -0.1, 0.04, 0.5, 0.06, P.iron); B.box(0.28, 1.6, 0, 0.04, 0.18, 0.26, p.flag.colour, { ao: 1 });
  }),
  prop({ id: 'P12', name: 'Signpost', parts: { wood: { colour: '#7a5232' }, signs: { colour: '#e8d2a0' } } }, (B, K, R) => {
    const { p } = R;
    B.box(0, 0, 0, 0.5, 0.2, 0.5, B.mul(p.wood.colour, 0.85)); B.box(0, 0.2, 0, 0.24, 2.6, 0.24, p.wood.colour); B.box(0, 2.8, 0, 0.34, 0.14, 0.34, p.wood.colour);
    [[2.25, 0], [1.75, 2.4], [1.25, -0.9]].forEach(([y, ry]) => B.at(0, y, 0, ry, () => { B.box(0.7, 0, 0, 1.15, 0.32, 0.07, p.signs.colour, { ao: 1 }); B.box(1.33, 0.06, 0, 0.12, 0.2, 0.07, p.signs.colour, { ao: 1 }); B.box(0.62, 0.12, 0.04, 0.7, 0.08, 0.02, p.wood.colour, { f: 8, ao: 1 }); }));
  }),
  prop({ id: 'P13', name: 'Street lamp', parts: { pole: { colour: '#3a3d48' }, light: { on: true, colour: '#ffe2a0' } }, looks: ['fresh', 'abandoned'] }, (B, K, R) => {
    lampPost(B, 0, 0, { c: wr(B, R.p.pole.colour, R.ab), gc: R.p.light.colour, on: R.p.light.on, ab: R.ab });
  }),
  prop({ id: 'P14', name: 'Green tree', solid: true, parts: { leaves: { colour: '#56b576' }, trunk: { colour: '#8a5a36' } } }, (B, K, R) => {
    const c = R.p.leaves.colour;
    tree(B, K, 0, 0, { h: 5.0, w: 3.6, arms: 2, top: B.mix(c, '#d8ffc8', 0.3), bot: B.mul(c, 0.5), bark: R.p.trunk.colour });
  }),
  prop({ id: 'P15', name: 'Golden tree', solid: true, parts: { leaves: { colour: '#f5b743' }, trunk: { colour: '#8a5a36' } } }, (B, K, R) => {
    const c = R.p.leaves.colour;
    tree(B, K, 0, 0, { h: 5.2, w: 3.8, arms: 2, top: B.mix(c, '#fff0b0', 0.45), bot: B.mul(c, 0.62), bark: R.p.trunk.colour });
  }),
  prop({ id: 'P16', name: 'Dead tree', solid: true, parts: { trunk: { colour: '#7a6a5a' } } }, (B, K, R) => {
    deadTree(B, K, 0, 0, { bark: R.p.trunk.colour, h: 4.6 });
  }),
  prop({ id: 'P17', name: 'Bush', parts: { leaves: { colour: '#4fae44' }, flowers: { on: true, colour: '#f26aa6' } } }, (B, K, R) => {
    const c = R.p.leaves.colour, pal = [B.mul(c, 0.78), B.rgb(c), B.mix(c, '#ffffff', 0.16)];
    const L = [[0, 5, 0.62, 0.85], [0.5, 4, 0.38, 0.75], [0.95, 2, 0.18, 0.6]];
    L.forEach(([y, n, r, sz], li) => { for (let k = 0; k < n; k++) { const a = k / n * PI * 2 + li * 0.6, j = 0.85 + K.rnd() * 0.3; B.box(Math.cos(a) * r, y, Math.sin(a) * r, sz * j, sz * j, sz * j, pal[(k + li) % 3]); } });
    if (R.p.flowers.on) for (let k = 0; k < 7; k++) { const a = k / 7 * PI * 2, r = 0.55 + (k % 2) * 0.25, y = 0.55 + (k % 3) * 0.35; B.box(Math.cos(a) * r, y, Math.sin(a) * r, 0.2, 0.2, 0.2, R.p.flowers.colour, { ao: 1 }); }
  }),
  prop({ id: 'P18', name: 'Rocks', parts: { stone: { colour: '#a0a0a0' }, moss: { on: true, colour: '#7cbf5a' } } }, (B, K, R) => {
    const s = R.p.stone.colour, m = R.p.moss.on ? R.p.moss.colour : false;
    B.box(0, 0, 0, 1.6, 0.9, 1.3, s); B.box(0.6, 0, 0.5, 1.0, 0.6, 0.9, B.mul(s, 1.08)); B.box(-0.2, 0.9, -0.1, 1.0, 0.45, 0.8, B.mix(s, '#ffffff', 0.1));
    B.box(-0.9, 0, 0.6, 0.6, 0.4, 0.6, B.mul(s, 0.92));
    if (m) { B.box(-0.2, 1.35, -0.1, 0.7, 0.06, 0.5, m, { ao: 1 }); B.box(0.6, 0.6, 0.5, 0.6, 0.05, 0.5, m, { ao: 1 }); }
  })
];

TRIOKIT.register({
  id: 'blocktown',
  name: 'Block Town',
  version: 1,
  textures: {},
  pieces: CITY.concat(NATURE),
  props: PROPS
});
})();
