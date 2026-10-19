// tools/meshopt_pack.mjs — pack a .glb losslessly with EXT_meshopt_compression (v67).
//   node tools/meshopt_pack.mjs in.glb out.glb
// Every mesh accessor gets its own bufferView; vertex data is packed as ATTRIBUTES, triangle indices as
// TRIANGLES. Raw bytes are kept exactly (no quantization, no filters) — the model comes back bit-for-bit.
// Images, animation data etc. are copied as they are. Uses third_party/meshoptimizer-1.2.0 (MIT).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const encSrc = fs.readFileSync(path.join(here, '..', 'third_party', 'meshoptimizer-1.2.0', 'meshopt_encoder.js'), 'utf8');
const tmp = path.join(here, '.meshopt_encoder.mjs'); fs.writeFileSync(tmp, encSrc);
const { MeshoptEncoder } = await import(tmp); fs.unlinkSync(tmp);
await MeshoptEncoder.ready;

const [,, inp, outp] = process.argv;
if (!inp || !outp) { console.error('usage: node tools/meshopt_pack.mjs in.glb out.glb'); process.exit(1); }
const buf = fs.readFileSync(inp);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a .glb');
let off = 12, json = null, bin = null;
while (off + 8 <= buf.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(data)); else if (type === 0x004E4942) bin = data;
  off += 8 + len; }
if ((json.extensionsUsed || []).includes('EXT_meshopt_compression')) { console.log('already packed'); fs.copyFileSync(inp, outp); process.exit(0); }
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }, SZ = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
// which accessors are mesh vertex attributes / triangle indices
const role = {};
(json.meshes || []).forEach(m => (m.primitives || []).forEach(p => {
  Object.values(p.attributes || {}).forEach(a => role[a] = 'ATTRIBUTES');
  (p.targets || []).forEach(t => Object.values(t).forEach(a => role[a] = 'ATTRIBUTES'));
  if (p.indices !== undefined) role[p.indices] = ((p.mode ?? 4) === 4) ? 'TRIANGLES' : 'INDICES'; }));
const chunks = []; let cur = 0, fbCur = 0, packed = 0;
const align = () => { const pad = (4 - (cur % 4)) % 4; if (pad) { chunks.push(new Uint8Array(pad)); cur += pad; } };
const views = [];
const pushPlain = (bytes, extra) => { align(); const bv = Object.assign({ buffer: 0, byteOffset: cur, byteLength: bytes.byteLength }, extra || {}); chunks.push(bytes); cur += bytes.byteLength; views.push(bv); return views.length - 1; };
// copy non-accessor views (images etc.) as they are
const oldViews = json.bufferViews || [], viewMap = {};
const usedByAcc = new Set((json.accessors || []).map(a => a.bufferView).filter(v => v !== undefined));
oldViews.forEach((bv, i) => { if (usedByAcc.has(i)) return; const o = bv.byteOffset || 0;
  const e = {}; if (bv.target) e.target = bv.target; viewMap[i] = pushPlain(bin.subarray(o, o + bv.byteLength), e); });
// accessors: each gets a tight copy, packed when it is mesh data
(json.accessors || []).forEach((a, ai) => {
  if (a.bufferView === undefined) return;
  const bv = oldViews[a.bufferView], n = NC[a.type], es = SZ[a.componentType], el = n * es;
  const stride = bv.byteStride || el, base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const r = role[ai];
  const st = r === 'ATTRIBUTES' ? Math.ceil(el / 4) * 4 : el;           // ATTRIBUTES needs a stride that is a multiple of 4
  const raw = new Uint8Array(a.count * st);
  for (let i = 0; i < a.count; i++) raw.set(bin.subarray(base + i * stride, base + i * stride + el), i * st);
  let enc = null;
  try { if (r === 'ATTRIBUTES' && st <= 256) enc = MeshoptEncoder.encodeGltfBuffer(raw, a.count, st, 'ATTRIBUTES');
        else if (r === 'TRIANGLES' && a.count % 3 === 0 && (es === 2 || es === 4)) enc = MeshoptEncoder.encodeGltfBuffer(raw, a.count, es, 'TRIANGLES');
        else if (r === 'INDICES' && (es === 2 || es === 4)) enc = MeshoptEncoder.encodeGltfBuffer(raw, a.count, es, 'INDICES'); } catch (e) { enc = null; }
  const tgt = r === 'ATTRIBUTES' ? 34962 : (r ? 34963 : undefined);
  if (enc && enc.byteLength < raw.byteLength) {
    align(); const fp = (4 - (fbCur % 4)) % 4; fbCur += fp;
    const v = { buffer: 1, byteOffset: fbCur, byteLength: raw.byteLength,
      extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: cur, byteLength: enc.byteLength, byteStride: r === 'ATTRIBUTES' ? st : es, count: a.count, mode: r } } };
    if (r === 'ATTRIBUTES') v.byteStride = st; if (tgt) v.target = tgt;
    chunks.push(enc); cur += enc.byteLength; fbCur += raw.byteLength; views.push(v); packed++;
  } else { const e = {}; if (r === 'ATTRIBUTES' && st !== el) e.byteStride = st; if (tgt) e.target = tgt; pushPlain(raw, e); }
  a.bufferView = views.length - 1; delete a.byteOffset; });
(json.images || []).forEach(im => { if (im.bufferView !== undefined) im.bufferView = viewMap[im.bufferView]; });
align();
json.bufferViews = views;
json.buffers = [{ byteLength: cur }];
if (packed) { json.buffers.push({ byteLength: Math.max(4, fbCur + ((4 - (fbCur % 4)) % 4)), extensions: { EXT_meshopt_compression: { fallback: true } } });
  json.extensionsUsed = Array.from(new Set([...(json.extensionsUsed || []), 'EXT_meshopt_compression']));
  json.extensionsRequired = Array.from(new Set([...(json.extensionsRequired || []), 'EXT_meshopt_compression'])); }
const nbin = new Uint8Array(cur); let at = 0; chunks.forEach(c => { nbin.set(c, at); at += c.byteLength; });
let js = new TextEncoder().encode(JSON.stringify(json)); const jp = (4 - (js.length % 4)) % 4;
if (jp) { const t = new Uint8Array(js.length + jp); t.set(js); t.fill(0x20, js.length); js = t; }
const total = 12 + 8 + js.length + 8 + nbin.length, out = new Uint8Array(total), ov = new DataView(out.buffer);
ov.setUint32(0, 0x46546C67, true); ov.setUint32(4, 2, true); ov.setUint32(8, total, true);
ov.setUint32(12, js.length, true); ov.setUint32(16, 0x4E4F534A, true); out.set(js, 20);
ov.setUint32(20 + js.length, nbin.length, true); ov.setUint32(24 + js.length, 0x004E4942, true); out.set(nbin, 28 + js.length);
fs.writeFileSync(outp, out);
console.log(`${path.basename(inp)}: ${(buf.length / 1048576).toFixed(2)} MB -> ${(out.length / 1048576).toFixed(2)} MB (${packed} views packed, lossless)`);
