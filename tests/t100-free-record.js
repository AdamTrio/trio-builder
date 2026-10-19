// t100 — v56: free recording in the fan preview — ring + ripple, Esc stops, a real clip comes out, everything restored
const { chromium } = require('playwright'); const path=require('path'), fs=require('fs'), cp=require('child_process');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--auto-accept-this-tab-capture','--use-fake-ui-for-media-stream','--enable-usermedia-screen-capturing','--auto-select-tab-capture-source-by-title=t101']});
  const ctx=await b.newContext({viewport:{width:1280,height:720},acceptDownloads:true});
  const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const [d0]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  await d0.saveAs(path.join(__dirname,'..','out','t100.html')); await p.close();
  const q=await ctx.newPage(); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t100.html?record',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(2500);
  await q.evaluate(()=>{ document.title='t101';
    /* the sandbox has no screen to share: stand in for Chrome's tab share with the room canvas + a silent audio track */
    navigator.mediaDevices.getDisplayMedia=async()=>{ const s=window.HEX.renderer.domElement.captureStream(30);
      const ac=new AudioContext(); const o=ac.createOscillator(), g=ac.createGain(); g.gain.value=0; const d=ac.createMediaStreamDestination(); o.connect(g); g.connect(d); o.start();
      d.stream.getAudioTracks().forEach(t=>s.addTrack(t)); return s; }; });
  const btns=await q.evaluate(()=>[...document.querySelectorAll('#hexRec button')].map(x=>x.textContent));
  check(btns.includes('record 360')&&btns.includes('record'),'the pill has record 360 + record ('+btns.join('|')+')');
  await q.mouse.move(400,300);
  const dlP=q.waitForEvent('download',{timeout:60000});
  await q.click('#hexRec button.go2');
  await q.waitForTimeout(800);
  const cd=await q.evaluate(()=>!!document.getElementById('hexRecMsg')||document.getElementById('hexRec').textContent);
  console.log('after click:', cd);
  await q.waitForTimeout(2600);
  const st=await q.evaluate(()=>({ring:!!document.getElementById('hexRing'), pillHidden:getComputedStyle(document.getElementById('hexRec')).display==='none', cur:document.documentElement.classList.contains('hexrecing'), rec:!!window.HEXCORE.FREEREC}));
  check(st.ring&&st.pillHidden&&st.cur&&st.rec,'recording: glowing ring on, pill hidden, arrow hidden ('+JSON.stringify(st)+')');
  await q.mouse.move(640,360,{steps:5}); await q.mouse.down(); await q.mouse.up();
  const rip=await q.evaluate(()=>document.querySelectorAll('.hexRip').length); check(rip>=1,'a click sends out a ripple');
  await q.waitForTimeout(2500);
  await q.keyboard.press('Escape');
  let dl=null; try{ dl=await dlP; }catch(e){}
  check(!!dl,'Esc stops it and the clip downloads ('+(dl?dl.suggestedFilename():'none')+')');
  if(dl){ const p=path.join(__dirname,'..','out','t100'+path.extname(dl.suggestedFilename())); await dl.saveAs(p);
    let info=''; try{ info=cp.execSync(`ffprobe -v error -show_entries stream=codec_type,codec_name,width,height -of compact "${p}"`).toString(); }catch(e){ info='ERR'; }
    console.log(info); check(/codec_type=video/.test(info)&&/width=\d+/.test(info),'the clip is a real video'); }
  await q.waitForTimeout(500);
  const af=await q.evaluate(()=>({ring:!!document.getElementById('hexRing'), pill:getComputedStyle(document.getElementById('hexRec')).display!=='none', cur:document.documentElement.classList.contains('hexrecing')}));
  check(!af.ring&&af.pill&&!af.cur,'afterwards: ring gone, arrow back, pill back');
  check(e2.length===0,'no errors'+(e2[0]?': '+e2[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
