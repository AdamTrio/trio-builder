// t125 — v76: BIG SCREENS. Jumbotron, Portrait tower (two-sided), Drive-in screen, Fan board wall — in every editor
// (real size in a World, small in a room). Clips crop to fill, play from far away while in view, tap opens arcade / fan board;
// the wall shows the fan board live from the page's chat rows; bakes carry screens.js only when used.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const A=f=>path.join(__dirname,'..','setassets','arcade',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const open=async q=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(q+': '+e));
    await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html'+q,{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2000);
    await p.evaluate(()=>{ window.confirm=()=>true; }); return p; };
  const tab=(p,t)=>p.evaluate(t=>document.querySelector('#stgRail button[data-tab="'+t+'"]').click(),t);
  const btn=(p,t)=>p.evaluate(t=>{ const x=[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t); if(!x) return false; x.click(); return true; },t);
  const seg=(p,lab,t)=>p.evaluate(([lab,t])=>{ const r=[...document.querySelectorAll('#stg .stf')].find(x=>x.querySelector('label')&&x.querySelector('label').textContent===lab); if(!r) return false; const x=[...r.querySelectorAll('button')].find(x=>x.textContent===t); if(!x) return false; x.click(); return true; },[lab,t]);
  const bake=async(p,name)=>{ await p.evaluate(()=>document.getElementById('stg').classList.remove('open'));
    const [dl]=await Promise.all([p.waitForEvent('download',{timeout:180000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]); const f=path.join(__dirname,'..','out',name); await dl.saveAs(f); return f; };

  // 1 · World: the four screens
  const w=await open('?space=world'); await tab(w,'models'); await w.waitForTimeout(300);
  const names=['+ Jumbotron','+ Portrait tower','+ Drive-in screen','+ Fan board wall'];
  const have=await w.evaluate(n=>n.map(t=>[...document.querySelectorAll('#stg button')].some(x=>x.textContent.trim()===t)),names);
  check(have.every(Boolean),'World → Models offers Jumbotron, Portrait tower, Drive-in screen, Fan board wall '+JSON.stringify(have));
  for(const n of names){ await btn(w,n); await w.waitForTimeout(1500); }
  const sz=await w.evaluate(()=>{ const out={}; window.HEXCORE.WORLDPROPS().forEach((p,i)=>{ const g=window.HEXCORE.PROPG[p.id]; p.pos=[-45+i*30,0,-30]; p.rot=[0,0,0]; window.HEXCORE.apply(p,g);
      const bb=new THREE.Box3(); g.children.find(c=>c!==g.userData.shadow).traverse(o=>{ if(o.isMesh) bb.expandByObject(o); }); const s=bb.getSize(new THREE.Vector3()); out[p.kind]={w:+s.x.toFixed(1),h:+s.y.toFixed(1),scale:p.scale,tap:p.screen&&p.screen.tap,screen:!!g.userData.hasScreen}; }); return out; });
  check(sz.jumbotron&&sz.jumbotron.w>19&&sz.jumbotron.h>16&&sz.jumbotron.scale===1,'the Jumbotron comes in at full size (about '+(sz.jumbotron||{}).w+' × '+(sz.jumbotron||{}).h+' m) '+JSON.stringify(sz.jumbotron));
  check(sz.ptower&&sz.ptower.h>15&&sz.ptower.w<9,'the Portrait tower is tall and slim ('+(sz.ptower||{}).w+' × '+(sz.ptower||{}).h+' m)');
  check(sz.drivein&&sz.drivein.w>20,'the Drive-in screen is about '+(sz.drivein||{}).w+' m wide');
  check(sz.fanwall&&sz.fanwall.w>16&&!sz.fanwall.screen,'the Fan board wall is '+(sz.fanwall||{}).w+' m wide (a board, not a clip screen)');
  check(['jumbotron','ptower','drivein'].every(k=>sz[k].screen&&sz[k].tap==='none'),'each clip screen has a Screen, and a tap does nothing until you choose');
  // clips on the jumbotron and the tower
  const pick=async kind=>{ await w.evaluate(k=>{ const p=window.HEXCORE.WORLDPROPS().find(q=>q.kind===k); const rows=[...document.querySelectorAll('#stg .strow')]; const r=rows.find(x=>x.textContent.includes(p.name)&&!x.classList.contains('stclip')); if(r&&!r.classList.contains('sel')) r.click(); },kind); await w.waitForTimeout(600); };
  await pick('jumbotron');
  const hint=await w.evaluate(()=>[...document.querySelectorAll('#stg .sthint')].map(x=>x.textContent).find(t=>/16:9/.test(t))||'');
  check(/1920 × 1080/.test(hint),'Jumbotron screen asks for 16:9 clips (1920 × 1080), crops anything else');
  let [fc]=await Promise.all([w.waitForEvent('filechooser'),btn(w,'+ clip')]); await fc.setFiles(A('teaser1.webm')); await w.waitForTimeout(2500);
  const opts=await w.evaluate(()=>{ const r=[...document.querySelectorAll('#stg .stf')].find(x=>x.querySelector('label')&&x.querySelector('label').textContent==='Tap opens'); return r?[...r.querySelectorAll('button')].map(b=>b.textContent):[]; });
  check(opts.join()==='the arcade,the fan board,nothing','Tap opens: the arcade / the fan board / nothing '+JSON.stringify(opts));
  await seg(w,'Tap opens','the fan board'); await w.waitForTimeout(300);
  await pick('ptower'); [fc]=await Promise.all([w.waitForEvent('filechooser'),btn(w,'+ clip')]); await fc.setFiles(A('teaser1.webm')); await w.waitForTimeout(3000);
  await w.evaluate(async()=>{ for(let i=0;i<100;i++){ if(Object.values(window.HEXCORE.SCREENS).every(S=>S.cropped)) break; await new Promise(r=>setTimeout(r,250)); } });   /* metadata can lag in the sandbox */
  const sc=await w.evaluate(()=>{ const out={}; Object.values(window.HEXCORE.SCREENS).forEach(S=>{ const t=S.mesh.material.map; let twin=null; S.g.traverse(o=>{ if(o.userData.screenTwin) twin=o; });
      out[S.p.kind]={rs:S.v.readyState, vw:S.v.videoWidth, err:!!S.err, ns:S.v.networkState, cropped:!!S.cropped, video:!!(t&&t.isVideoTexture), rx:+t.repeat.x.toFixed(2), ry:+t.repeat.y.toFixed(2), twin:twin?twin.material===S.mesh.material:null, far:Math.round(S.far)}; }); return out; });
  check(sc.jumbotron&&sc.jumbotron.video&&sc.jumbotron.rx===1&&sc.jumbotron.ry<.8,'a 4:3 clip fills the 16:9 Jumbotron (cropped top and bottom, not stretched) '+JSON.stringify(sc.jumbotron));
  check(sc.ptower&&sc.ptower.rx<.5&&sc.ptower.ry===1,'the same clip fills the 9:16 tower (cropped at the sides) '+JSON.stringify(sc.ptower));
  const inpg=await w.evaluate(()=>Object.values(window.HEXCORE.SCREENS).every(S=>S.v.isConnected));
  check(inpg,'screen clips live in the page (so browsers play them)');
  const er=await w.evaluate(async()=>{ const S=Object.values(window.HEXCORE.SCREENS).find(S=>S.p.kind==='ptower'); let hit=0; const o=window.HEXCORE.onScreenErr; window.HEXCORE.onScreenErr=p=>{ hit++; o&&o(p); }; S.v.dispatchEvent(new Event('error')); await new Promise(r=>setTimeout(r,200)); window.HEXCORE.onScreenErr=o; const ok=!!S.err; S.err=false; return {hit,ok}; });
  check(er.hit===1&&er.ok,'a clip that can’t play warns the builder '+JSON.stringify(er));
  check(sc.ptower&&sc.ptower.twin===true,'the Portrait tower plays on both sides');
  check(sc.jumbotron&&sc.jumbotron.far>=60,'big screens play from across the plaza (up to '+(sc.jumbotron||{}).far+' m), not just 18 m');
  // plays in view from 35 m, pauses turned away
  await w.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const p=window.HEXCORE.WORLDPROPS().find(q=>q.kind==='jumbotron'); const N=window.HEXCORE.NAV; N.pos.x=p.pos[0]; N.pos.z=p.pos[2]+35; window.HEX.setYaw(0); }); await w.waitForTimeout(7000);
  const st=()=>w.evaluate(()=>{ const S=Object.values(window.HEXCORE.SCREENS).find(S=>S.p.kind==='jumbotron'); return {playing:!S.v.paused, t:+S.v.currentTime.toFixed(2)}; });
  const s1=await st(); await w.waitForTimeout(1200); const s2=await st();
  check(s2.playing&&s2.t!==s1.t,'Jumbotron plays when you look at it from 35 m away');
  await w.screenshot({path:path.join(__dirname,'..','out','t125-jumbotron.png')});
  await w.evaluate(()=>window.HEX.setYaw(Math.PI)); await w.waitForTimeout(1800); const s3=await st();
  check(s3.playing,'turned away, it keeps looping (v78: big screens play all the time)');
  await w.evaluate(()=>window.HEX.setYaw(0));
  // the fan board wall draws the board (sample rows in the builder)
  const fw=await w.evaluate(()=>{ const p=window.HEXCORE.WORLDPROPS().find(q=>q.kind==='fanwall'), g=window.HEXCORE.PROPG[p.id]; let m=null; g.traverse(o=>{ if(o.userData&&o.userData.fanWall) m=o; }); const c=m.material.map.image, x=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let s=0; for(let i=0;i<x.length;i+=4) s+=x[i]+x[i+1]+x[i+2]; return {w:c.width,lit:s/(x.length/4)}; });
  check(fw.w===1024&&fw.lit>10,'the Fan board wall shows the fan board (sample posts in the builder)');
  const bp=await bake(w,'t125.html'); await w.close();
  const html=fs.readFileSync(bp,'utf8'); check(/data-screens/.test(html),'a world with big screens carries them in its bake');
  // 2 · published: plays, tap opens the fan board, the wall follows the page's posts
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t125.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(6000);
  await q.evaluate(()=>{ window.__msgs=[]; window.HEXCORE.HOSTED=true; addEventListener('message',e=>{ if(e.data&&e.data.trio) window.__msgs.push(e.data); }); const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone');
    const p=(window.HEXBAKE.props||[]).find(q=>q.kind==='jumbotron'); const N=window.HEXCORE.NAV; N.pos.x=p.pos[0]; N.pos.z=p.pos[2]+30; window.HEX.setYaw(0); }); await q.waitForTimeout(3000);
  const pq=await q.evaluate(async()=>{ const S=Object.values(window.HEXCORE.SCREENS).find(S=>S.p.kind==='jumbotron'); if(!S) return null; const a=S.v.currentTime; await new Promise(r=>setTimeout(r,1200)); return {playing:!S.v.paused, moved:S.v.currentTime!==a, n:Object.keys(window.HEXCORE.SCREENS).length}; });
  check(pq&&pq.playing&&pq.moved&&pq.n===2,'published world: the Jumbotron plays its clip (2 screens live) '+JSON.stringify(pq));
  const xy=await q.evaluate(()=>{ const S=Object.values(window.HEXCORE.SCREENS).find(S=>S.p.kind==='jumbotron'); const v=new THREE.Vector3(); S.mesh.getWorldPosition(v); v.project(window.HEX.cam); return {x:(v.x+1)/2*innerWidth, y:(1-v.y)/2*innerHeight}; });
  await q.mouse.click(xy.x,xy.y); await q.waitForTimeout(800);
  let ms=await q.evaluate(()=>window.__msgs);
  check(ms.some(m=>m.trio==='open'&&m.board==='chat'),'tap the Jumbotron (set to "the fan board") → the page opens the fan board '+JSON.stringify(ms.filter(m=>m.trio==='open')));
  await q.evaluate(()=>{ window.__msgs=[]; const p=(window.HEXBAKE.props||[]).find(q=>q.kind==='fanwall'); const N=window.HEXCORE.NAV; N.pos.x=p.pos[0]; N.pos.z=p.pos[2]+22; window.HEX.setYaw(0); }); await q.waitForTimeout(2500);
  const fx=await q.evaluate(()=>{ const p=(window.HEXBAKE.props||[]).find(q=>q.kind==='fanwall'), g=window.HEXCORE.PROPG[p.id]; let m=null; g.traverse(o=>{ if(o.userData&&o.userData.fanWall) m=o; }); const v=new THREE.Vector3(); m.getWorldPosition(v); v.project(window.HEX.cam); return {x:(v.x+1)/2*innerWidth, y:(1-v.y)/2*innerHeight}; });
  await q.mouse.click(fx.x,fx.y); await q.waitForTimeout(800); ms=await q.evaluate(()=>window.__msgs);
  check(ms.some(m=>m.trio==='open'&&m.board==='chat'),'tap the Fan board wall → the page opens the fan board');
  const hash=()=>q.evaluate(()=>{ const p=(window.HEXBAKE.props||[]).find(q=>q.kind==='fanwall'), g=window.HEXCORE.PROPG[p.id]; let m=null; g.traverse(o=>{ if(o.userData&&o.userData.fanWall) m=o; }); return m.material.map.image.toDataURL().length; });
  const h0=await hash();
  await q.evaluate(()=>{ window.HEXCORE.HOSTED=true; window.HEXCORE.hostBoot(window.HEX); window.postMessage({trio:'chat', rows:[{name:'adam',txt:'welcome to the world!!',you:true},{name:'demi',txt:'first one here'}], count:2},'*'); }); await q.waitForTimeout(800);
  const h1=await hash();
  check(h1!==h0,'the page sends new posts → the wall redraws them live (no database)');
  await q.screenshot({path:path.join(__dirname,'..','out','t125-fanwall.png')});
  await q.close();
  // 3 · a Mood Room gets them too, small
  const m=await open('?space=mood'); await tab(m,'models'); await m.waitForTimeout(300);
  check(await btn(m,'+ Portrait tower'),'a Mood Room offers the big screens too'); await m.waitForTimeout(1500);
  const ms2=await m.evaluate(()=>{ const p=(window.HEXCORE.WORLDPROPS?null:null); return null; });
  const rs=await m.evaluate(()=>{ const g=window.HEX.scene.children.find(o=>o.userData.isProp&&o.userData.hasScreen); return g?+g.scale.x.toFixed(2):null; });
  check(rs===.25,'…coming in small in a room (size '+rs+'), ready to size up');
  const mp=await bake(m,'t125-mood.html'); check(/data-screens/.test(fs.readFileSync(mp,'utf8')),'the room bake carries the screens it uses');
  await m.close();
  const n=await open('?space=mood'); const np=await bake(n,'t125-plain.html'); check(!/data-screens/.test(fs.readFileSync(np,'utf8')),'a room without big screens carries none'); await n.close();
  check(errs.length===0,'no page errors '+errs.slice(0,3).join(' | '));
  await b.close();
  console.log((bad.length?'FAIL ':'PASS ')+ok.length+(bad.length?' / FAIL '+bad.length:''));
  ok.forEach(m=>console.log('  ✓ '+m)); bad.forEach(m=>console.log('  ✗ '+m));
  process.exit(bad.length?1:0);
})();
