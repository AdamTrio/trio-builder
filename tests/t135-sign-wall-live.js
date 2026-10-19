// t135 — v86: Sign the wall goes live: a solid title on the wall, signatures from the Trio page, a tap opens the page's signing pad
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); if(!f) return false; [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); return true; },[lab,v]);
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="boards"]').click()); await p.waitForTimeout(300);
  await seg('Signature wall','on'); await p.waitForTimeout(300); await seg('On wall','0'); await p.waitForTimeout(300);
  const labs=await p.evaluate(()=>[...document.querySelectorAll('#stg .stf label')].map(l=>l.textContent));
  check(['Title','Words','Small line','Title colour'].every(x=>labs.includes(x)),'the wall has its title controls: on/off, words, small line, colour');
  await p.evaluate(()=>{ const r=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='Words'); const i=r.querySelector('input'); i.value='leave your mark'; i.dispatchEvent(new Event('change')); }); await p.waitForTimeout(400);
  const lit=()=>p.evaluate(()=>{ const m=window.HEX.scene.children.find(o=>o.userData.sigWall); if(!m) return -1; const c=m.material.map.image, x=c.getContext('2d'), d=x.getImageData(0,0,c.width,Math.round(c.height*.3)).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>100) n++; return n; });
  const t1=await lit(); check(t1>2000,'the title is painted at the top of the wall (no signatures needed) '+t1);
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:180000}),p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); document.querySelector('#stgTop button.hot:last-child').click(); })]);
  const bp=path.join(__dirname,'..','out','t135.html'); await dl.saveAs(bp); await p.close();
  const html=fs.readFileSync(bp,'utf8'); check(/"sigwall":\{"on":true,"wall":0,"look":"marker","plate":true,"title":"LEAVE YOUR MARK"/.test(html),'the bake carries the wall and its title (not the demo signatures)');
  const q=await b.newPage({viewport:{width:1280,height:800}}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t135.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(5000);
  const pub=await q.evaluate(()=>{ const S=window.HEXCORE.SIGW; return S?{mesh:!!(S.mesh&&S.mesh.parent), n:S.sigs.length}:null; });
  check(pub&&pub.mesh&&pub.n===0,'published: the wall is up with its title, no signatures yet '+JSON.stringify(pub));
  await q.evaluate(()=>{ window.HEXCORE.SIGFEED(window.HEXCORE.sigClean([{id:'a',name:'Maya<script>',line:'see you in Denver',pen:'#d23a3a',strokes:[[.1,.5,.3,.2,.5,.6,.7,.3,.9,.5]]},{id:'b',name:'Zed',pen:'red; x',strokes:[[.2,.4,.8,.6]]},{id:'c',name:'nope',strokes:[]}])); }); await q.waitForTimeout(1500);
  const fed=await q.evaluate(()=>{ const S=window.HEXCORE.SIGW; return {n:S.sigs.length, rects:(S.mesh.userData.rects||[]).length, name:S.sigs[0].name, pen2:S.sigs[1].pen}; });
  check(fed.n===2&&fed.rects===2,'signatures the page sends land on the wall (empty ones dropped) '+JSON.stringify(fed));
  check(fed.name==='Maya<script>'.slice(0,18)&&fed.pen2==='#141414','names stay plain text and bad pen colours fall back to black');
  // tap the wall away from the signatures: the page is asked to open its pad
  await q.evaluate(()=>{ window.HEXCORE.__posts=[]; window.HEXCORE.post=m=>{ window.HEXCORE.__posts.push(m); return true; }; });
  const hit=await q.evaluate(()=>{ const m=window.HEXCORE.SIGW.mesh, r=new THREE.Raycaster(); for(let y=.1;y<.95;y+=.02) for(let x=.05;x<.95;x+=.02){ r.setFromCamera(new THREE.Vector2(x*2-1,-(y*2-1)),window.HEX.cam); const h=r.intersectObject(m,false)[0]; if(h&&h.uv&&h.uv.y>.85) return {x:x*innerWidth,y:y*innerHeight}; } return null; });
  if(hit){ await q.mouse.move(hit.x,hit.y); await q.mouse.down(); await q.mouse.up(); } await q.waitForTimeout(800);
  const posts=await q.evaluate(()=>window.HEXCORE.__posts||[]);
  check(!!hit&&posts.some(m=>m.trio==='open'&&m.board==='sign'),'a tap on the wall asks the page to open the signing pad '+JSON.stringify({hit:!!hit,posts}));
  await q.close();
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('  ✓ '+m)); bad.forEach(m=>console.log('  ✗ '+m)); console.log((bad.length?'FAIL ':'PASS ')+ok.length+' / '+(ok.length+bad.length));
})();
