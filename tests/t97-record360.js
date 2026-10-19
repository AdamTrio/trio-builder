// t97 — v54: ?record shows the pill (only then), records an even 360 turn into a real MP4, puts the room back
const { chromium } = require('playwright'); const path=require('path'), fs=require('fs'), cp=require('child_process');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  check(!(await p.$('#hexRec')),'builder without ?record: no pill');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t97.html'); await dl.saveAs(bp); await p.close();
  const q=await ctx.newPage(); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t97.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(2000);
  check(!(await q.$('#hexRec')),'published room without ?record: no pill');
  await q.goto('http://127.0.0.1:8765/out/t97.html?record',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(2500);
  const pill=await q.evaluate(()=>{ const e=document.getElementById('hexRec'); return e?[...e.querySelectorAll('button')].map(x=>x.textContent):null; });
  check(pill&&pill.includes('HD')&&pill.includes('4K')&&pill.includes('record 360'),'?record: the pill shows ('+pill+')');
  const before=await q.evaluate(()=>({w:window.HEX.renderer.domElement.width, yaw:window.HEX.getYaw()}));
  const r=await q.evaluate(async()=>{ const yaws=[]; const sy=window.HEX.getYaw;
    const blob=await window.HEXCORE.record360({size:'hd', secs:1, fps:30, onProgress:()=>yaws.push(window.HEX.getYaw())});
    const buf=new Uint8Array(await blob.arrayBuffer()); let s=''; for(let i=0;i<buf.length;i+=8192) s+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));
    return {b64:btoa(s), n:buf.length, yaws}; });
  const mp=path.join(__dirname,'..','out','t97.mp4'); fs.writeFileSync(mp,Buffer.from(r.b64,'base64'));
  let info=''; try{ info=cp.execSync(`ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=codec_name,width,height,nb_read_frames,avg_frame_rate -show_entries format=duration -of json "${mp}"`).toString(); }catch(e){ info='ERR '+e.message; }
  const j=(()=>{ try{ return JSON.parse(info); }catch(e){ return null; } })();
  const sv=j&&j.streams&&j.streams[0];
  check(sv&&sv.width===1920&&sv.height===1080,'the file is 1920 × 1080 ('+(sv?sv.codec_name+' '+sv.width+'x'+sv.height:info.slice(0,200))+')');
  check(sv&&+sv.nb_read_frames===30&&Math.abs(+j.format.duration-1)<.05,'every frame is there, 1 s at 30 fps ('+(sv&&sv.nb_read_frames)+' frames, '+(j&&j.format.duration)+' s)');
  let dec=''; try{ cp.execSync(`ffmpeg -v error -i "${mp}" -f null - 2>&1`).toString(); dec='clean'; }catch(e){ dec=String(e.stdout||e.message).slice(0,200); }
  check(dec==='clean','it decodes cleanly');
  try{ cp.execSync(`ffmpeg -v error -y -i "${mp}" -vf "select=eq(n\\,0)+eq(n\\,15)" -vsync 0 "${path.join(__dirname,'..','shots','t97-f%d.png')}"`); }catch(e){}
  const after=await q.evaluate(()=>({w:window.HEX.renderer.domElement.width, yaw:window.HEX.getYaw(), raf:String(window.requestAnimationFrame).includes('native'), now:String(performance.now).includes('native')}));
  check(after.w===before.w&&Math.abs(after.yaw-before.yaw)<1e-6&&after.raf&&after.now,'the room is put back afterwards ('+JSON.stringify(after)+')');
  const t0=await q.evaluate(()=>performance.now()); await q.waitForTimeout(500); const t1=await q.evaluate(()=>performance.now());
  check(t1-t0>300,'the room’s clock runs again');
  await q.close();
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
