/* ============================================================
   THE ROOM — MUSIC VISUALIZERS
   Ships in every Room Space bake. One shared music signal drives every
   effect: a synthetic beat by default (which is what a room on the Trio
   website gets — the room never plays audio itself), or the real track
   when a room has an analyser wired.
   The Sky Show dome and the soft beams are ported from the portal's own
   artist rooms (initTrioRoom), with one fix: the sparkle hash no longer
   uses sin(), which breaks into a dotted ladder on some GPUs.
   Rooms start with NONE of this running. An event space keeps its poles only
   if the look was saved before visualizers existed.
   ============================================================ */
(function(){
if(typeof THREE==='undefined') return;
const FX=window.HEXFX={};
const TOUCH=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
const TRIO=[0x8b7bff,0x2dd4bf,0xfbbf24,0xfb4a6d,0x9d8bff];
let H=null, RM=null, CFG=null, BUILT={}, booted=false;
let PAL=TRIO.slice(), ACC=new THREE.Color(0x8b7bff), I=1;

/* ---------- the menu ---------- */
FX.SKIES=[['off','off'],['trio','Trio'],['ember','Ember'],['aurora','Aurora']];
FX.LIST=[
  {id:'orbs',      label:'Floating orbs',  note:'soft lights drifting overhead — the artist-room sky'},
  {id:'softbeams', label:'Soft beams',     note:'the artist rooms’ glowing columns around the floor'},
  {id:'columns',   label:'Light poles',    note:'the event space’s bouncing poles along the edge'},
  {id:'floor',     label:'Dance floor',    note:'rings ripple out from the centre on every kick'},
  {id:'lasers',    label:'Laser fans',     note:'beams fan from the top corners and sweep'},
  {id:'eq',        label:'EQ skyline',     note:'a spectrum visualizer along the top of every wall'},
  {id:'haze',      label:'Haze & embers',  note:'sparks drift up and surge on the bass'}
];
FX.PRESETS={
  none:   {label:'None',        sky:'off',  on:{}},
  artist: {label:'Artist Room', sky:'trio', on:{softbeams:1,orbs:1}},
  club:   {label:'Club',        sky:'off',  on:{lasers:1,haze:1,floor:1}},
  arena:  {label:'Arena',       sky:'off',  on:{eq:1,lasers:1}},
  chill:  {label:'Chill',       sky:'aurora',on:{haze:1,orbs:1}},
  minimal:{label:'Minimal',     sky:'off',  on:{eq:1}}
};
FX.newCfg=()=>({preset:'none', sky:'off', on:{}, color:null, intensity:1, playing:true});

/* ---------- the signal ---------- */
const BPM=124, SPB=60/BPM;
function synth(t){
  const beat=t/SPB, bi=Math.floor(beat), ph=beat-bi;
  const bass=Math.exp(-ph*5.5)*(bi%4===0?1:0.8);
  const hat=Math.exp(-(((ph+0.5)%1))*9)*0.8;
  const mid=0.35+0.28*Math.sin(t*2.3)+0.25*hat;
  const high=0.22+0.5*hat+0.12*Math.sin(t*7.1);
  const bands=new Float32Array(32);
  for(let k=0;k<32;k++){ const f=k/31;
    bands[k]=Math.max(0,Math.min(1, bass*Math.pow(1-f,2.0)*1.05
      + mid*Math.exp(-Math.pow((f-0.45)/0.22,2))*0.75
      + high*Math.pow(f,1.5)*0.7 + 0.08*Math.sin(t*3.1+k*1.7) + 0.05)); }
  return {beat:bi, phase:ph, bass, mid, high, bands};
}
let lastBeatT=0, lastBass=0, realBeat=0;
/* the page's levels (hosted rooms): {trio:'levels', b, m, t} ~30 fps. Stale for 500 ms → the synthetic beat. */
let EXT=null;
FX.feed=function(b,m,t){ EXT={b:Math.max(0,Math.min(1,b)), m:Math.max(0,Math.min(1,m)), t:Math.max(0,Math.min(1,t)), at:performance.now()}; };
function signal(t){
  if(EXT&&performance.now()-EXT.at<500){
    const bands=new Float32Array(32);
    for(let k=0;k<32;k++){ const f=k/31;
      bands[k]=Math.min(1, EXT.b*Math.pow(1-f,2)*1.1 + EXT.m*Math.exp(-Math.pow((f-.45)/.22,2))*.9 + EXT.t*Math.pow(f,1.5)*.9); }
    const bass=EXT.b, mid=EXT.m, high=EXT.t;
    if(bass>lastBass+.12&&t-lastBeatT>.25){ realBeat++; lastBeatT=t; }
    lastBass=bass*.9+lastBass*.1;
    return {beat:realBeat, phase:Math.min(1,(t-lastBeatT)/SPB), bass, mid, high, bands, beatT:lastBeatT};
  }
  /* the real track, when there is one playing through an analyser */
  if(H&&H.hasAnalyser&&H.hasAnalyser()&&H.audioEl&&!H.audioEl.paused&&H.levels){
    const a=H.levels(), n=a.length||32, bands=new Float32Array(32);
    for(let k=0;k<32;k++) bands[k]=(a[Math.min(n-1,Math.floor(k*n/40))]||0)/255;
    const bass=(bands[0]+bands[1]+bands[2])/3, mid=(bands[8]+bands[10]+bands[12])/3, high=(bands[20]+bands[24]+bands[28])/3;
    if(bass>lastBass+.12&&t-lastBeatT>.25){ realBeat++; lastBeatT=t; }
    lastBass=bass*.9+lastBass*.1;
    return {beat:realBeat, phase:Math.min(1,(t-lastBeatT)/SPB), bass, mid, high, bands, beatT:lastBeatT};
  }
  const e=synth(t); e.beatT=Math.floor(t/SPB)*SPB; return e;
}
/* the artist rooms read bass / mid / treble with their own smoothing; keep it */
const S={b:0,m:0,t:0,on:0,_t:null};
function portal(e,t){
  if(S._t===t) return S; S._t=t;
  const pl=!CFG||CFG.playing!==false;
  const kb=pl?Math.min(1,.12+e.bass*.8):0, km=pl?.22+.35*e.mid:0, kt=pl?.1+.32*e.high:0;
  S.b+=(kb-S.b)*(kb>S.b?.6:.16); S.m+=(km-S.m)*.2; S.t+=(kt-S.t)*.25;
  S.on+=((pl?1:0)-S.on)*.07;
  return S;
}

/* ---------- shared bits ---------- */
let sd=11; const rnd=()=>{ sd=(sd*16807)%2147483647; return (sd-1)/2147483646; };
function dotTex(){
  const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
  const r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.3,'rgba(255,255,255,.58)'); r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r; g.fillRect(0,0,64,64); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
let DOT=null; const dot=()=>DOT||(DOT=dotTex());
const ADD=o=>Object.assign({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false},o||{});
/* the room's footprint, for both shapes: the box's W×D, or the hexagon's bounding square */
const BOUND=()=>RM.shape==='box'?{W:RM.W,D:RM.D}:{W:2*RM.APO,D:2*RM.APO};
const INSIDE=(x,z,inset)=>RM.shape==='box'
  ? (Math.abs(x)<=RM.W/2-(inset||0)&&Math.abs(z)<=RM.D/2-(inset||0))
  : (Math.hypot(x,z)<=RM.APO-(inset||0));
const SPOT=(inset)=>{ const p={x:0,z:0}; do{ p.x=(rnd()-.5)*BOUND().W; p.z=(rnd()-.5)*BOUND().D; }while(!INSIDE(p.x,p.z,inset||0)); return p; };

/* ---------- the Sky Show dome — portal shaders ---------- */
const VERT=`varying vec3 vP; void main(){ vP=normalize(position);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const HASH='float hash(float n){ n=fract(n*.1031); n*=n+33.33; n*=n+n; return fract(n); }';
const DITHER='col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.0;';
const DOMES={
trio:`varying vec3 vP; uniform float uT,uBass,uMid,uTreb,uOn,uI; ${HASH}
  void main(){
    float r=acos(clamp(vP.y,-1.0,1.0))/1.5708; float a=atan(vP.z,vP.x)+uT*.05;
    vec3 col=vec3(.004,.003,.016); float seg=6.0; float ka=abs(fract(a/6.28318*seg)-.5)*2.0;
    col+=vec3(.38,.26,.92)*exp(-26.0*abs(r-.24-uBass*.34))*(.35+uBass*1.7);
    col+=vec3(.24,.14,.66)*exp(-20.0*abs(r-.55-uMid*.22))*(.28+uMid*1.1);
    col+=vec3(.2,.1,.5)*exp(-30.0*abs(r-.82-uTreb*.12))*(.2+uTreb*.8);
    col+=vec3(.5,.32,.95)*pow(abs(sin(a*seg*.5+uT*.35)),16.0)*smoothstep(.95,.15,r)*(.22+uMid*.9);
    col+=vec3(.3,.16,.6)*pow(ka,10.0)*smoothstep(.85,.25,r)*(.18+uBass*.7);
    float em=step(.986-uTreb*.012, hash(floor(a*42.0)+floor(uT*8.0)*57.0+floor(r*30.0)*131.0))*smoothstep(.85,.25,r);
    col+=vec3(1.0,.78,.3)*em*.65; col+=vec3(.85,.78,1.0)*exp(-13.0*r)*uBass*.95;
    col*=.92+.08*sin(r*24.0-uT*.8); col*=uOn*uI; ${DITHER}
    gl_FragColor=vec4(col, uOn*.96); }`,
ember:`varying vec3 vP; uniform float uT,uBass,uMid,uTreb,uOn,uI; ${HASH}
  void main(){
    float r=acos(clamp(vP.y,-1.0,1.0))/1.5708; float a=atan(vP.z,vP.x)+uT*.05;
    vec3 col=vec3(.015,.002,.002); float seg=6.0;
    col+=vec3(.85,.06,.04)*exp(-26.0*abs(r-.24-uBass*.34))*(.35+uBass*1.7);
    col+=vec3(.5,.02,.02)*exp(-20.0*abs(r-.55-uMid*.22))*(.28+uMid*1.1);
    col+=vec3(.68,.09,.05)*pow(abs(sin(a*seg*.5+uT*.35)),16.0)*smoothstep(.95,.15,r)*(.22+uMid*.9);
    float em=step(.986-uTreb*.012, hash(floor(a*42.0)+floor(uT*8.0)*57.0+floor(r*30.0)*131.0))*smoothstep(.85,.25,r);
    col+=vec3(1.0,.45,.18)*em*.65; col+=vec3(1.0,.8,.72)*exp(-13.0*r)*uBass*.95;
    col*=(.35+uOn*.65)*uI; ${DITHER}
    gl_FragColor=vec4(col,.96*max(uOn,.35)); }`,
aurora:`varying vec3 vP; uniform float uT,uBass,uMid,uTreb,uOn,uI;
  float h2(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
  void main(){
    float r=acos(clamp(vP.y,-1.0,1.0))/1.5708; float a=atan(vP.z,vP.x);
    float n=noise(vec2(a*2.2+uT*.05, r*3.0-uT*.03)); float n2=noise(vec2(a*4.5-uT*.04, r*6.0+uT*.02));
    float band=smoothstep(.55,.0,abs(r-.34-n*.28)); float band2=smoothstep(.45,.0,abs(r-.62-n2*.2));
    vec3 col=vec3(.42,.24,.86)*band*(.35+uMid*.9+n2*.4)+vec3(.12,.68,.6)*band2*(.3+uTreb*.8+n*.4);
    col+=vec3(.06,.03,.12)*(1.0-r); col*=smoothstep(1.05,.25,r);
    col*=(.3+uOn*.45+uBass*.3)*uI; ${DITHER}
    gl_FragColor=vec4(col,.9); }`
};
function buildDome(id){
  const uni={uT:{value:0},uBass:{value:0},uMid:{value:0},uTreb:{value:0},uOn:{value:0},uI:{value:1}};
  const m=new THREE.Mesh(new THREE.SphereGeometry(38,48,24,0,Math.PI*2,0,Math.PI*.52),   /* inside the room's 46 m sky */
    new THREE.ShaderMaterial({uniforms:uni,transparent:true,depthWrite:false,side:THREE.BackSide,
      vertexShader:VERT,fragmentShader:DOMES[id]}));
  m.position.y=2.0; m.renderOrder=-1; H.scene.add(m);
  return {obj:m, update(t,e){ const s=portal(e,t);
    uni.uT.value=t; uni.uBass.value=s.b; uni.uMid.value=s.m; uni.uTreb.value=s.t; uni.uOn.value=s.on; uni.uI.value=I; }};
}

/* ---------- effects ---------- */
const MAKE={};
MAKE.orbs=function(){
  const layer=(n,size,color,op,drift)=>{
    const pos=new Float32Array(n*3);
    for(let i=0;i<n;i++){ pos[i*3]=(rnd()*2-1)*26; pos[i*3+1]=9+rnd()*13; pos[i*3+2]=(rnd()*2-1)*26; }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const p=new THREE.Points(g,new THREE.PointsMaterial(ADD({map:dot(),color,size:size*.5,opacity:op})));
    p.userData={drift,base:op,ph:rnd()*6}; return p; };
  const k=TOUCH?.55:1;
  const L=[layer(Math.round(260*k),1.15,0xfff7e8,.5,[.014,.005]), layer(Math.round(220*k),.8,ACC.getHex(),.5,[-.010,.008]),
           layer(Math.round(200*k),.5,0xbfe3ff,.5,[.007,-.011])];
  const grp=new THREE.Group(); L.forEach(l=>grp.add(l)); H.scene.add(grp);
  return {obj:grp, tint(){ L[1].material.color.copy(ACC); },
    update(t){ L.forEach(p=>{ const a=p.geometry.attributes.position.array, d=p.userData.drift;
      for(let i=0;i<a.length;i+=3){ a[i]+=d[0]*.8; a[i+2]+=d[1]*.8;
        if(a[i]>26) a[i]=-26; else if(a[i]<-26) a[i]=26; if(a[i+2]>26) a[i+2]=-26; else if(a[i+2]<-26) a[i+2]=26; }
      p.geometry.attributes.position.needsUpdate=true; p.material.opacity=(p.userData.base+.07*Math.sin(t*.2+p.userData.ph))*I; }); }};
};
MAKE.softbeams=function(){
  const c=document.createElement('canvas'); c.width=64; c.height=256; const g2=c.getContext('2d');
  const gr=g2.createLinearGradient(0,256,0,0);
  gr.addColorStop(0,'rgba(255,255,255,.95)'); gr.addColorStop(.6,'rgba(255,255,255,.28)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g2.fillStyle=gr; g2.fillRect(0,0,64,256);
  const fade=g2.createLinearGradient(0,0,64,0);
  fade.addColorStop(0,'rgba(0,0,0,1)'); fade.addColorStop(.25,'rgba(0,0,0,0)'); fade.addColorStop(.75,'rgba(0,0,0,0)'); fade.addColorStop(1,'rgba(0,0,0,1)');
  g2.globalCompositeOperation='destination-out'; g2.fillStyle=fade; g2.fillRect(0,0,64,256);
  const tex=new THREE.CanvasTexture(c);
  const geo=new THREE.PlaneGeometry(.9,1.15); geo.translate(0,.575,0);
  const hash01=n=>Math.abs(Math.sin(n*12.9898)*43758.5453)%1;
  const spots=[];
  if(RM.shape==='box'){
    const W=RM.W/2, D=RM.D/2;
    const N=TOUCH?5:7; for(let i=0;i<N;i++){ const z=-D+1.1+i*((D*2-2.2)/(N-1)); spots.push([W-.7,z]); spots.push([-W+.7,z]); }
    const M=TOUCH?4:5; for(let i=0;i<M;i++){ const x=-(W-1.6)+i*((W*2-3.2)/(M-1)); spots.push([x,D-.7]); spots.push([x,-D+.7]); }
  } else {
    const K=TOUCH?12:18; for(let i=0;i<K;i++){ const q=RM.perimeter(i/K,.8); spots.push([q.x,q.z]); }
  }
  const grp=new THREE.Group(), cols=[];
  spots.forEach((s,i)=>{
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const gg=new THREE.Group(), p1=new THREE.Mesh(geo,mat), p2=new THREE.Mesh(geo,mat); p2.rotation.y=Math.PI/2;
    gg.add(p1,p2); gg.position.set(s[0],.02,s[1]); gg.scale.y=.001;
    gg.userData={bin:Math.floor(Math.pow(((i*29)%spots.length)/spots.length,1.15)*44), ph:i*1.7, i:i, mat:mat};
    grp.add(gg); cols.push(gg); });
  H.scene.add(grp);
  const tint=()=>{ const white=new THREE.Color(0xffffff);
    const pal=[white, ACC.clone().lerp(white,.55), ACC.clone(), ACC.clone().lerp(new THREE.Color(0x3b2be0),.5)];
    cols.forEach(gg=>{ const i=gg.userData.i; gg.userData.mat.color.copy(pal[i%4]).lerp(pal[(i+1)%4],hash01(i*7.7)); }); };
  tint();
  return {obj:grp, tint, update(t,e){ const s=portal(e,t);
    cols.forEach(gg=>{ const ev=e.bands[Math.min(31,Math.floor(gg.userData.bin*31/44))];
      const v=.2+Math.pow(ev,1.4)*3.4+s.b*.5, tgt=v*s.on;
      gg.scale.y+=(Math.max(.001,tgt)-gg.scale.y)*(tgt>gg.scale.y?.8:.14);
      gg.userData.mat.opacity=s.on*(.2+Math.pow(ev,1.3)*.8+Math.sin(t*1.6+gg.userData.ph)*.05)*I; }); }};
};
MAKE.columns=function(){
  /* the event space's poles are built by the room shell; this just shows or hides them */
  const cols=window._cols||[];
  const obj={ set visible(v){ cols.forEach(c=>{ c.core.visible=v; c.beam.visible=v; c.halo.visible=v; }); this._v=v; },
              get visible(){ return !!this._v; } };
  return {obj, update(){}};
};
MAKE.floor=function(){
  const B=BOUND(), W=B.W, D=B.D, nx=RM.shape==='box'?8:14, nz=RM.shape==='box'?12:14, sx=W/nx, sz=D/nz;
  const geo=new THREE.PlaneGeometry(sx*.88,sz*.88); geo.rotateX(-Math.PI/2);
  const im=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial(ADD({color:0xffffff})),nx*nz);
  const m=new THREE.Matrix4(), col=new THREE.Color(), cells=[];
  for(let i=0;i<nx;i++) for(let j=0;j<nz;j++){ const x=-W/2+sx*(i+.5), z=-D/2+sz*(j+.5);
    if(!INSIDE(x,z,.35)) continue;                       /* a hexagon has no corners to light */
    m.makeTranslation(x,.02,z); im.setMatrixAt(cells.length,m); cells.push(Math.hypot(x,z)); }
  im.count=cells.length;
  im.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1,cells.length)*3),3);
  H.scene.add(im);
  return {obj:im, update(t,e){
    for(let c=0;c<cells.length;c++){ const d=cells[c]; let v=.018, hi=0;
      for(let k=0;k<3;k++){ const bt=e.beatT-k*SPB, age=t-bt; if(age<0) continue;
        const w=Math.exp(-Math.pow((d-age*8)/.55,2))*Math.exp(-age*1.7);
        if(w>v){ v=w; hi=(((e.beat-k)%PAL.length)+PAL.length)%PAL.length; } }
      const centre=Math.exp(-d*d/2.2)*e.bass*.55;
      if(centre>v){ v=centre; hi=((e.beat%PAL.length)+PAL.length)%PAL.length; }
      col.setHex(PAL[hi]).multiplyScalar(Math.min(.9,v*.95+.012)*I); im.setColorAt(c,col); }
    im.instanceColor.needsUpdate=true; }};
};
MAKE.lasers=function(){
  const Hh=RM.H||4.6, g=new THREE.Group(); H.scene.add(g);
  let em;
  if(RM.shape==='box'){ const W=RM.W, D=RM.D;
    em=[[-W/2+.25,Hh-.15,-D/2+.25,1],[W/2-.25,Hh-.15,-D/2+.25,-1],[-W/2+.25,Hh-.15,D/2-.25,1],[W/2-.25,Hh-.15,D/2-.25,-1]];
  } else {
    em=[.0833,.4167,.5833,.9167].map((u,i)=>{ const q=RM.perimeter(u,.45); return [q.x,Hh-.15,q.z,i%2?-1:1]; });
  }
  const N=TOUCH?5:7, L=24;
  const core=new THREE.CylinderGeometry(.011,.011,L,5,1,true); core.translate(0,L/2,0);
  const glow=new THREE.CylinderGeometry(.055,.055,L,6,1,true); glow.translate(0,L/2,0);
  const beams=[];
  em.forEach((e,ei)=>{ const o=new THREE.Vector3(e[0],e[1],e[2]);
    const pod=new THREE.Sprite(new THREE.SpriteMaterial(ADD({map:dot(),color:PAL[1]}))); pod.position.copy(o); pod.scale.set(.5,.5,1); g.add(pod);
    for(let k=0;k<N;k++){ const a=new THREE.Mesh(core,new THREE.MeshBasicMaterial(ADD({color:PAL[1],opacity:.9})));
      const b=new THREE.Mesh(glow,new THREE.MeshBasicMaterial(ADD({color:PAL[1],opacity:.15})));
      a.position.copy(o); b.position.copy(o); g.add(a); g.add(b); beams.push({a,b,ei,k,o,side:e[3],pod}); } });
  const up=new THREE.Vector3(0,1,0), dir=new THREE.Vector3();
  return {obj:g, update(t,e){
    const ci=Math.floor(e.beat/4)%PAL.length, c=PAL[ci===2&&!CFG.color?1:ci], spread=.5+.22*e.bass;
    beams.forEach(bm=>{ const base=Math.atan2(-bm.o.x,-bm.o.z), f=(bm.k-(N-1)/2)/((N-1)/2);
      const yaw=base+f*spread+Math.sin(t*.9+bm.ei)*.45*bm.side, p=.3+.09*Math.sin(t*1.3+bm.ei*1.7);
      dir.set(Math.sin(yaw)*Math.cos(p),-Math.sin(p),Math.cos(yaw)*Math.cos(p)).normalize();
      bm.a.quaternion.setFromUnitVectors(up,dir); bm.b.quaternion.copy(bm.a.quaternion);
      const on=(bm.ei%2)===(((e.beat%2)+2)%2)?1:.35;
      bm.a.material.opacity=Math.min(1,.28+.7*e.bass*on)*I; bm.b.material.opacity=(.05+.2*e.bass*on)*I;
      bm.a.material.color.setHex(c); bm.b.material.color.setHex(c); bm.pod.material.color.setHex(c); }); }};
};
MAKE.eq=function(){
  const bars=[], bw=.19, gap=.08, dummy=new THREE.Object3D();
  for(let i=0;i<RM.n;i++){ const len=RM.len(i), n=Math.floor((len-.3)/(bw+gap)), nrm=RM.normal(i);
    for(let k=0;k<n;k++){ const along=-((n-1)*(bw+gap))/2+k*(bw+gap), f=Math.abs(k-(n-1)/2)/((n-1)/2);
      bars.push({p:RM.wallPoint(i,along,RM.H+.02,.05), n:nrm, band:Math.min(31,Math.floor(f*29)), j:rnd()}); } }
  const geo=new THREE.PlaneGeometry(bw,1); geo.translate(0,.5,0);
  const im=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial(ADD({color:0xffffff,side:THREE.DoubleSide})),bars.length);
  im.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(bars.length*3),3);
  const caps=new THREE.InstancedMesh(new THREE.PlaneGeometry(bw,.05),new THREE.MeshBasicMaterial(ADD({color:0xffffff,side:THREE.DoubleSide})),bars.length);
  const peak=new Float32Array(bars.length), g=new THREE.Group(); g.add(im); g.add(caps); H.scene.add(g);
  const cA=new THREE.Color(), cB=new THREE.Color(), cC=new THREE.Color(), col=new THREE.Color(); let lt=0;
  return {obj:g, update(t,e){ const dt=Math.max(0,Math.min(.1,t-lt)); lt=t;
    cA.setHex(PAL[1]); cB.setHex(PAL[0]); cC.setHex(PAL[2]);
    bars.forEach((b,i)=>{ const v=Math.max(.03,e.bands[b.band]*(.85+.3*Math.sin(t*6+b.j*9))), h=.06+v*1.7;
      dummy.position.copy(b.p); dummy.lookAt(b.p.x+b.n.x,b.p.y,b.p.z+b.n.z); dummy.scale.set(1,h,1); dummy.updateMatrix(); im.setMatrixAt(i,dummy.matrix);
      if(v<.5) col.copy(cA).lerp(cB,v/.5); else col.copy(cB).lerp(cC,(v-.5)/.5);
      im.setColorAt(i,col.multiplyScalar((.75+.5*v)*I));
      peak[i]=Math.max(h,peak[i]-dt*.9); dummy.scale.set(1,1,1); dummy.position.y=b.p.y+peak[i]+.06; dummy.updateMatrix(); caps.setMatrixAt(i,dummy.matrix); });
    im.instanceMatrix.needsUpdate=true; im.instanceColor.needsUpdate=true; caps.instanceMatrix.needsUpdate=true; }};
};
MAKE.haze=function(){
  const B=BOUND(), W=B.W*.94, D=B.D*.94, N=TOUCH?600:1300;
  const pos=new Float32Array(N*3), col=new Float32Array(N*3), vel=new Float32Array(N), ph=new Float32Array(N), cool=new Uint8Array(N);
  const warm=[new THREE.Color(0xffb347),new THREE.Color(0xfb7a4a),new THREE.Color(0xfbbf24)];
  for(let i=0;i<N;i++){ const q=SPOT(.25); pos[i*3]=q.x; pos[i*3+1]=rnd()*4.8; pos[i*3+2]=q.z; vel[i]=.1+rnd()*.3; ph[i]=rnd()*6.28;
    cool[i]=rnd()<.28?1:0; const c=warm[Math.floor(rnd()*3)]; col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const mat=new THREE.PointsMaterial(ADD({size:.14,map:dot(),vertexColors:true,sizeAttenuation:true,opacity:.9}));
  const g=new THREE.Group(); g.add(new THREE.Points(geo,mat)); const fog=[];
  for(let k=0;k<(TOUCH?8:14);k++){ const s=new THREE.Sprite(new THREE.SpriteMaterial(ADD({map:dot(),color:0x6d5ae0,opacity:.1})));
    const q=SPOT(1.2); s.position.set(q.x,.3+rnd()*.7,q.z); s.scale.set(7+rnd()*4,2.2,1); s.userData.v=rnd()*.25-.12; s.userData.k=k; g.add(s); fog.push(s); }
  H.scene.add(g);
  const tint=()=>{ const c=ACC.clone().lerp(new THREE.Color(0xffffff),.2);
    for(let i=0;i<N;i++) if(cool[i]){ col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; }
    geo.attributes.color.needsUpdate=true;
    fog.forEach(s=>s.material.color.copy(s.userData.k%3?ACC:new THREE.Color(PAL[1]))); };
  tint(); let lt=null;
  return {obj:g, tint, update(t,e){ const dt=lt===null?1/30:Math.max(0,Math.min(.1,t-lt)); lt=t; const sp=1+e.bass*3.2;
    for(let i=0;i<N;i++){ pos[i*3+1]+=vel[i]*sp*dt; pos[i*3]+=Math.sin(t*.7+ph[i])*.08*dt;
      if(pos[i*3+1]>5.2){ const q=SPOT(.25); pos[i*3+1]=.05; pos[i*3]=q.x; pos[i*3+2]=q.z; } }
    geo.attributes.position.needsUpdate=true; mat.size=.11+e.bass*.16; mat.opacity=(.65+.35*e.bass)*I;
    fog.forEach(s=>{ s.position.x+=s.userData.v*dt; if(!INSIDE(s.position.x,s.position.z,1.0)) s.userData.v*=-1; s.material.opacity=(.13+.26*e.bass)*I; }); }};
};

/* ---------- running it ---------- */
function palette(){
  if(CFG&&CFG.color){
    const b=new THREE.Color(CFG.color); ACC.copy(b);
    /* stay close to the colour they picked — shades of it, not a trip round the wheel */
    PAL=[b.getHex(), b.clone().offsetHSL(0,0,.12).getHex(), b.clone().lerp(new THREE.Color(0xffffff),.5).getHex(),
         b.clone().offsetHSL(-.025,0,-.08).getHex(), b.clone().offsetHSL(.025,-.12,.05).getHex()];
  } else { ACC.setHex(0x8b7bff); PAL=TRIO.slice(); }
}
function frame(){
  if(!CFG) return;
  const t=(window.FXT!==undefined)?window.FXT:performance.now()/1000;
  const e=signal(t);
  Object.keys(BUILT).forEach(k=>{ const f=BUILT[k]; if(f.obj.visible) f.update(t,e); });
}
FX.boot=function(HEX){
  if(booted) return FX; booted=true; H=HEX; RM=HEX.ROOM||(window.HEXCORE&&window.HEXCORE.room(HEX));
  H.onFrame.push(frame);
  return FX;
};
let K=1, IB=1;                              /* v57: a trigger can fade the whole show in / out */
FX.apply=function(cfg){
  if(!booted) return;
  CFG=Object.assign(FX.newCfg(), cfg||{}); CFG.on=Object.assign({}, CFG.on||{});
  IB=Math.max(.2,Math.min(1.6,+CFG.intensity||1)); I=IB*K;
  palette();
  const want={};
  FX.LIST.forEach(d=>{ if(CFG.on[d.id]) want[d.id]=1; });
  if(CFG.sky&&CFG.sky!=='off'&&DOMES[CFG.sky]) want['sky:'+CFG.sky]=1;
  Object.keys(want).forEach(k=>{ if(!BUILT[k]) BUILT[k]=(k.indexOf('sky:')===0)?buildDome(k.slice(4)):MAKE[k](); });
  if(!BUILT.columns) BUILT.columns=MAKE.columns();          /* so "off" really hides the shell's poles */
  Object.keys(BUILT).forEach(k=>{ const f=BUILT[k]; f.obj.visible=!!want[k]&&K>0.003; f.want=!!want[k]; if(want[k]&&f.tint) f.tint(); });
};
FX.setK=function(k){ K=Math.max(0,Math.min(1,+k||0)); I=IB*K; Object.keys(BUILT).forEach(n=>{ const f=BUILT[n]; if(f.want!==undefined) f.obj.visible=f.want&&K>0.003; }); };
FX.getK=()=>K;
FX.cfg=()=>CFG;
FX.activeCount=()=>CFG?Object.keys(CFG.on).filter(k=>CFG.on[k]).length+((CFG.sky&&CFG.sky!=='off')?1:0):0;
})();

