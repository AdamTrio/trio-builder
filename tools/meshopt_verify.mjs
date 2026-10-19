import fs from 'fs';
const { MeshoptDecoder } = await import(new URL('../third_party/meshoptimizer-1.2.0/meshopt_decoder.mjs', import.meta.url)); await MeshoptDecoder.ready;
const rd=f=>{ const b=fs.readFileSync(f), dv=new DataView(b.buffer,b.byteOffset,b.byteLength); let o=12,j,bin; while(o+8<=b.length){ const l=dv.getUint32(o,true),t=dv.getUint32(o+4,true),d=b.subarray(o+8,o+8+l); if(t===0x4E4F534A) j=JSON.parse(new TextDecoder().decode(d)); else bin=d; o+=8+l; } return {j,bin}; };
const NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}, SZ={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const view=(g,i)=>{ const bv=g.j.bufferViews[i], X=bv.extensions&&bv.extensions.EXT_meshopt_compression; if(!X){ const o=bv.byteOffset||0; return {bytes:g.bin.subarray(o,o+bv.byteLength), stride:bv.byteStride}; }
  const out=new Uint8Array(X.count*X.byteStride); MeshoptDecoder.decodeGltfBuffer(out,X.count,X.byteStride,g.bin.subarray(X.byteOffset,X.byteOffset+X.byteLength),X.mode,X.filter||'NONE'); return {bytes:out, stride:bv.byteStride}; };
const elems=(g,ai)=>{ const a=g.j.accessors[ai], el=NC[a.type]*SZ[a.componentType], v=view(g,a.bufferView), st=v.stride||el, b=a.byteOffset||0; const out=new Uint8Array(a.count*el); for(let i=0;i<a.count;i++) out.set(v.bytes.subarray(b+i*st,b+i*st+el),i*el); return out; };
// TRIANGLES packing may start a triangle at a different corner (same triangle, same facing) — compare that way
const triSame=(x,y,es)=>{ const r=b=>{ const v=es===2?new Uint16Array(b.buffer,b.byteOffset,b.length/2):new Uint32Array(b.buffer,b.byteOffset,b.length/4); return v; };
  const p=r(x), q=r(y); if(p.length!==q.length) return false;
  const key=(v,i)=>{ const a=v[i],b=v[i+1],c=v[i+2]; return a<=b&&a<=c?[a,b,c]:(b<=a&&b<=c?[b,c,a]:[c,a,b]); };
  for(let i=0;i<p.length;i+=3){ const k1=key(p,i), k2=key(q,i); if(k1[0]!==k2[0]||k1[1]!==k2[1]||k1[2]!==k2[2]) return false; } return true; };
const A=rd(process.argv[2]), B=rd(process.argv[3]); let same=0, diff=0;
A.j.accessors.forEach((a,i)=>{ if(a.bufferView===undefined) return; const x=elems(A,i), y=elems(B,i); const isTri=(B.j.bufferViews[B.j.accessors[i].bufferView].extensions||{}).EXT_meshopt_compression&&B.j.bufferViews[B.j.accessors[i].bufferView].extensions.EXT_meshopt_compression.mode==='TRIANGLES';
  if(Buffer.compare(Buffer.from(x),Buffer.from(y))===0||(isTri&&triSame(x,y,SZ[a.componentType]))) same++; else { diff++; if(process.env.V) console.log('diff',i,JSON.stringify(a),x.length,y.length, A.j.bufferViews[a.bufferView]); } });
console.log('accessors identical:',same,'different:',diff);
