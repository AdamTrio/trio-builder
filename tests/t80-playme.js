// t80 — PLAY ME game tiles: place anywhere / on a wall / over a model; tap → the game (standalone) or {trio:'open',board:'game',url} (hosted)
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
const GAME='http://127.0.0.1:8765/out/fakegame.html';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=room'); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1000);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  const input=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab); const i=f.querySelector('input'); i.value=v; i.dispatchEvent(new Event('change')); },[lab,v]);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('#stg .stsec>h4')].find(x=>x.textContent.indexOf('5 ·')>=0); if(h.parentNode.classList.contains('closed')) h.click(); });
  // a model to ride on
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stg .stsec')].find(x=>x.querySelector('h4').textContent.indexOf('5 ·')>=0); [...s.querySelectorAll('button')].find(x=>/^\+ /.test(x.textContent)&&!/upload|hang|play-me/.test(x.textContent)).click(); });
  await p.waitForTimeout(700);
  await btn('+ play-me tile'); await p.waitForTimeout(800);
  await input('Game link',GAME); await p.waitForTimeout(200); await input('Game name','Orion Attacks'); await p.waitForTimeout(600);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>[...document.querySelectorAll('#stg .strow')].find(x=>(x.querySelector('.nm b')||{}).textContent==='Game picture').querySelector('button.add').click())]);
  await fc.setFiles(A('game-art.png')); await p.waitForTimeout(1200);
  const t1=await p.evaluate(()=>{ const P=(window.HEXCORE.PLAYMES||[]); return {n:P.length, face:(()=>{ let f=false; P[0]&&P[0].g.traverse(c=>{ if(c.userData.playmeFace) f=true; }); return f; })()}; });
  check(t1.n===1&&t1.face,'a play-me tile sits in the room');
  await seg('Where it lives','over a model'); await p.waitForTimeout(800);
  const fol=await p.evaluate(()=>{ const T=window.THREE, P=window.HEXCORE.PLAYMES[0]; const tile=new T.Vector3(); P.g.getWorldPosition(tile);
    const m=[...window.HEX.scene.children].find(o=>o.userData.isProp&&!o.userData.isPlayme&&o!==P.g); const bb=new T.Box3().setFromObject(m);
    return {dy:tile.y-bb.max.y, dx:Math.abs(tile.x-(bb.min.x+bb.max.x)/2)}; });
  check(fol.dy>0&&fol.dy<.6&&fol.dx<.05,'"over a model" floats it just above the model ('+fol.dy.toFixed(2)+' m up)');
  await p.screenshot({path:'shots/t80-builder.png'});
  const [dl]=await Promise.all([p.waitForEvent('download'),btn('publish room')]);
  const bp=path.join(__dirname,'..','out','t80-baked.html'); await dl.saveAs(bp);
  const html=fs.readFileSync(bp,'utf8'); const bake=JSON.parse(html.match(/window\.HEXBAKE=(\{.*?\});<\/script>/s)[1].replace(/\\u003c/g,'<'));
  const pm=bake.props.find(x=>x.type==='playme');
  check(pm&&pm.game.url===GAME&&bake.assets[pm.asset],'bake carries the tile, its link and its picture');
  // standalone: tap → full-screen game
  for(const [w,h,name,mob] of [[390,844,'phone',true],[1280,800,'desktop',false]]){
    const q=await b.newPage({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
    await q.goto('http://127.0.0.1:8765/out/t80-baked.html'); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(1500);
    await q.evaluate(()=>window.HEX.enterRoom&&window.HEX.enterRoom()); await q.waitForFunction(()=>(window.HEXCORE.PLAYMES||[]).length>0,null,{timeout:15000}).catch(()=>{});
    await q.waitForTimeout(600);
    const sp=await q.evaluate(()=>{ const T=window.THREE,H=window.HEX,P=window.HEXCORE.PLAYMES[0]; const c=new T.Vector3(); P.g.children[0].getWorldPosition(c);
      let best=null; for(let a=-Math.PI;a<Math.PI;a+=.01){ H.cam.rotation.set(0,0,0); H.cam.rotateY(-a); H.cam.updateMatrixWorld(); const v=c.clone().project(H.cam); if(v.z<1&&(!best||Math.abs(v.x)<Math.abs(best.x))) best={a,x:v.x}; }
      H.setYaw(best.a); return true; });
    await q.waitForTimeout(700);
    const pt=await q.evaluate(()=>{ const T=window.THREE,H=window.HEX,P=window.HEXCORE.PLAYMES[0]; const c=new T.Vector3(); P.g.children[0].getWorldPosition(c); H.cam.updateMatrixWorld(); const v=c.project(H.cam); return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight}; });
    if(name==='phone') await q.screenshot({path:'shots/t80-phone-tile.png'});
    await q.mouse.click(pt.x,pt.y); await q.waitForTimeout(800);
    const g=await q.evaluate(()=>({open:document.getElementById('groom').classList.contains('open'), src:document.getElementById('gframe').src, sleep:!!window.HEXSLEEP}));
    check(g.open&&g.src.indexOf('fakegame')>0&&g.sleep,name+': tapping the tile opens the game full screen, room asleep');
    check(e2.length===0,name+': no errors'+(e2[0]?': '+e2[0]:'')); await q.close();
  }
  // hosted: the room tells the page which game
  const hq=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await hq.goto('http://127.0.0.1:8765/out/t80-harness.html'); const fr=()=>hq.frames().find(f=>/t80-baked/.test(f.url()));
  await hq.waitForFunction(()=>window.LOG.some(m=>m&&m.trio==='ready'),null,{timeout:20000}).catch(()=>{});
  await fr().waitForFunction(()=>(window.HEXCORE.PLAYMES||[]).length>0,null,{timeout:15000}).catch(()=>{});
  await hq.waitForTimeout(800);
  await fr().evaluate(()=>{ const T=window.THREE,H=window.HEX,P=window.HEXCORE.PLAYMES[0]; const c=new T.Vector3(); P.g.children[0].getWorldPosition(c);
    let best=null; for(let a=-Math.PI;a<Math.PI;a+=.01){ H.cam.rotation.set(0,0,0); H.cam.rotateY(-a); H.cam.updateMatrixWorld(); const v=c.clone().project(H.cam); if(v.z<1&&(!best||Math.abs(v.x)<Math.abs(best.x))) best={a,x:v.x}; } H.setYaw(best.a); });
  await hq.waitForTimeout(700);
  const hp=await fr().evaluate(()=>{ const T=window.THREE,H=window.HEX,P=window.HEXCORE.PLAYMES[0]; const c=new T.Vector3(); P.g.children[0].getWorldPosition(c); H.cam.updateMatrixWorld(); const v=c.project(H.cam); return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight}; });
  await hq.mouse.click(hp.x,hp.y); await hq.waitForTimeout(700);
  const log=await hq.evaluate(()=>window.LOG.filter(m=>m&&m.trio==='open'));
  const gopen=await fr().evaluate(()=>document.getElementById('groom').classList.contains('open'));
  check(log.some(m=>m.board==='game'&&m.url===GAME&&m.title==='Orion Attacks')&&!gopen,'hosted: the tap tells the page {trio:"open", board:"game", url, title} and the room does not open it itself');
  check(errs.length===0,'builder: no errors'+(errs[0]?': '+errs[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
