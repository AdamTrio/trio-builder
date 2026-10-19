// t81 — Event Space: no Romy splash, no music — in the builder and in what it bakes. Room Space unchanged.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  const html=fs.readFileSync(path.join(__dirname,'..','dist','trio-builder-admin.html'),'utf8');
  check(!/data:audio\/mpeg;base64/.test(html),'the builder file carries no Romy song');
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event'); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const ui=await p.evaluate(()=>({music:[...document.querySelectorAll('#stg .stsec>h4')].some(h=>/Music/.test(h.textContent)),
    rows:[...document.querySelectorAll('#stg .strow .nm b')].map(x=>x.textContent), src:document.getElementById('track').getAttribute('src')||'', playing:!document.getElementById('track').paused}));
  check(ui.music,'Event Space panel keeps its Music section (for demoing)');
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>[...document.querySelectorAll('#stg .strow')].find(x=>(x.querySelector('.nm b')||{}).textContent==='Demo song').querySelector('button.add').click())]);
  await fc.setFiles(path.join(__dirname,'..','src','assets','song.mp3')); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()==='play the track'); if(b) b.click(); });
  await p.waitForTimeout(1500);
  const pl=await p.evaluate(()=>({src:document.getElementById('track').getAttribute('src')||'', playing:!document.getElementById('track').paused}));
  check(/^blob:|^data:/.test(pl.src)&&pl.playing,'a demo song you load plays in the builder');
  check(!ui.rows.some(t=>/Splash logo|Event song/.test(t)),'no Splash logo / Event song rows');
  check(!/^data:|^blob:/.test(ui.src)&&!ui.playing,'no Romy track loaded or playing when the builder opens');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()==='bake .html').click())]);
  const bp=path.join(__dirname,'..','out','t81-event.html'); await dl.saveAs(bp);
  const bh=fs.readFileSync(bp,'utf8');
  check(!/data:audio/.test(bh),'baked event room carries no music (even with a demo song loaded)');
  for(const [w,h,name,mob] of [[390,844,'phone',true],[1280,800,'desktop',false]]){
    const q=await b.newPage({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
    await q.goto('http://127.0.0.1:8765/out/t81-event.html'); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(1500);
    const r=await q.evaluate(()=>{ const sp=document.getElementById('splash'), au=document.getElementById('track');
      return {splash:sp?getComputedStyle(sp).display!=='none'&&!sp.classList.contains('gone'):false, src:au.getAttribute('src')||'', playing:!au.paused,
        rail:getComputedStyle(document.getElementById('rail')).display, mute:getComputedStyle(document.getElementById('mute')).display}; });
    check(!r.splash,name+': opens straight into the room, no splash');
    check(!r.src&&!r.playing,name+': no music');
    check(r.mute==='none',name+': no mute button (nothing to mute)');
    await q.screenshot({path:'shots/t81-'+name+'.png'});
    check(e2.length===0,name+': no errors'+(e2[0]?': '+e2[0]:'')); await q.close();
  }
  // Room Space bake keeps its door
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=room'); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1200);
  const [dl2]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()==='publish room').click())]);
  const rp=path.join(__dirname,'..','out','t81-room.html'); await dl2.saveAs(rp);
  const q=await b.newPage({viewport:{width:390,height:844}}); await q.goto('http://127.0.0.1:8765/out/t81-room.html'); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(1200);
  check(await q.evaluate(()=>!document.getElementById('splash').classList.contains('gone')),'Room Space rooms still have their door (unchanged)');
  check(errs.length===0,'builder: no errors'+(errs[0]?': '+errs[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
