// t79 — a tiny model's egg is as tappable as a big one's (play-site note 10/2): phone 390x844, hosted-sized
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event'); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1000);
  const choose=async(fn,f)=>{ const [fc]=await Promise.all([p.waitForEvent('filechooser'),fn()]); await fc.setFiles(f); await p.waitForTimeout(1500); };
  const openSec=t=>p.evaluate(t=>{ const h=[...document.querySelectorAll('#stg .stsec>h4')].find(x=>x.textContent.indexOf(t)>=0); if(h&&h.parentNode.classList.contains('closed')) h.click(); },t);
  const rowBtn=l=>p.evaluate(l=>[...document.querySelectorAll('#stg .strow')].find(x=>(x.querySelector('.nm b')||{}).textContent===l).querySelector('button.add').click(),l);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  const slide=(lab,idx,v)=>p.evaluate(([lab,idx,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].filter(x=>(x.querySelector('label')||{}).textContent===lab)[idx]; const i=f.querySelector('input[type=range]'); i.value=v; i.dispatchEvent(new Event('input')); },[lab,idx,v]);
  const segOn=(lab,idx)=>p.evaluate(([lab,idx])=>{ const f=[...document.querySelectorAll('#stg .stf')].filter(x=>(x.querySelector('label')||{}).textContent===lab)[idx]; [...f.querySelectorAll('button')].find(x=>x.textContent==='on').click(); },[lab,idx]);
  const title=(idx,t)=>p.evaluate(([idx,t])=>{ const i=[...document.querySelectorAll('#stg .stctl input')].filter(x=>x.placeholder==='a short title')[idx]; i.value=t; i.dispatchEvent(new Event('input')); },[idx,t]);
  await openSec('Walls, banners'); await choose(()=>rowBtn('Wall 1 · DIRECTIVE'),A('wall-window.png'));
  await openSec('Windows & sets'); await btn('+ new set'); await p.waitForTimeout(500);
  await choose(()=>rowBtn('Background'),A('pano.jpg')); await choose(()=>rowBtn('Floor'),A('floor.jpg'));
  await choose(()=>btn('+ model (.glb)'),A('model.glb')); await choose(()=>btn('+ model (.glb)'),A('model.glb'));
  await slide('Floor height',0,1); await p.waitForTimeout(300);
  // model 1 = the big one (like the roller coaster), model 2 = the tiny one (like Romy gram)
  await slide('· across',0,-0.42); await slide('· depth',0,4.31); await slide('· size',0,4);
  await slide('· across',1,-2.85); await slide('· depth',1,2.52); await slide('· size',1,0.39);
  await p.waitForTimeout(800);
  await segOn('· easter egg',0); await p.waitForTimeout(500); await title(0,'Big one');
  await segOn('· easter egg',1); await p.waitForTimeout(500); await title(1,'Tiny one');
  await p.waitForTimeout(800);
  await btn('done & lock'); await p.waitForTimeout(500); await openSec('Windows & sets');
  await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='Wall 1 window'); [...f.querySelectorAll('button')].find(x=>x.textContent==='on').click(); });
  await p.waitForTimeout(1500);
  const [dl]=await Promise.all([p.waitForEvent('download'),btn('bake .html')]);
  const bp=path.join(__dirname,'..','out','t79-baked.html'); await dl.saveAs(bp);
  for(const [w,h,name,mob] of [[390,844,'phone',true],[1280,800,'desktop',false]]){
    const q=await b.newPage({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
    await q.goto('http://127.0.0.1:8765/out/t79-baked.html'); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(2000);
    await q.evaluate(()=>window.HEX.enterRoom&&window.HEX.enterRoom());
    await q.waitForFunction(()=>(window.HEXCORE.WINSETS||[]).some(G=>(G.userData.eggs||[]).length>=2),null,{timeout:20000}).catch(()=>{});
    await q.waitForTimeout(800);
    for(const want of ['Tiny one','Big one']){
      // from the default standing spot, face the egg's model and tap the centre of its box on screen
      const pt=await q.evaluate(want=>{ const T=window.THREE,H=window.HEX; const G=window.HEXCORE.WINSETS[0];
        const E=G.userData.eggs.find(e=>(e.egg.blocks||[]).some(b=>b.text===want)); if(!E) return null;
        const c=new T.Vector3(); E.obj.updateMatrixWorld(true); const bb=new T.Box3(); E.obj.traverse(o=>{ if(o.isMesh&&o!==E.obj.userData.shadow) bb.expandByObject(o); }); bb.getCenter(c);
        let best=null; for(let a=-Math.PI;a<Math.PI;a+=.01){ H.cam.rotation.set(0,0,0); H.cam.rotateY(-a); H.cam.updateMatrixWorld(); const v=c.clone().project(H.cam); if(v.z<1&&(!best||Math.abs(v.x)<Math.abs(best.x))) best={a,x:v.x}; }
        H.setYaw(best.a); return {a:best.a}; },want);
      check(!!pt,name+': '+want+' egg exists in the published room');
      await q.waitForTimeout(600);
      const sp=await q.evaluate(want=>{ const T=window.THREE,H=window.HEX; const G=window.HEXCORE.WINSETS[0];
        const E=G.userData.eggs.find(e=>(e.egg.blocks||[]).some(b=>b.text===want)); const bb=new T.Box3(); E.obj.traverse(o=>{ if(o.isMesh&&o!==E.obj.userData.shadow) bb.expandByObject(o); });
        const c=new T.Vector3(); bb.getCenter(c); H.cam.updateMatrixWorld(); const v=c.project(H.cam);
        const x=(v.x+1)/2*innerWidth, y=(1-v.y)/2*innerHeight; const r=window.HEXCORE.eggAt(H, window.HEXCORE.eggHosts(), x, y);
        return {x,y,got:r&&(r.egg.blocks||[]).find(b=>b.t==='title').text}; },want);
      check(sp.got===want,name+': eggAt at the centre of the '+want+' returns it (got '+sp.got+')');
      await q.mouse.click(sp.x,sp.y); await q.waitForTimeout(600);
      const op=await q.evaluate(()=>{ const E=document.getElementById('hexEgg'); return E&&E.classList.contains('on')?(E.querySelector('h3')||{}).textContent:null; });
      check(op===want,name+': a real tap on the '+want+' opens its pop-up ('+op+')');
      if(name==='phone') await q.screenshot({path:'shots/t79-'+name+'-'+want.replace(' ','')+'.png'});
      await q.evaluate(()=>window.HEXCORE.closeEgg()); await q.waitForTimeout(300);
    }
    const gv=await q.evaluate(()=>window.HEXCORE.GLINTS.filter(s=>s.parent&&s.material.depthTest===false).length);
    check(gv>=2,name+': set glints draw over the set (never hidden behind it): '+gv);
    check(e2.length===0,name+': no errors'+(e2[0]?': '+e2[0]:'')); await q.close();
  }
  check(errs.length===0,'builder: no errors'+(errs[0]?': '+errs[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
