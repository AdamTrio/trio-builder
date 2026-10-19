const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 for (const [n,vp] of [['desk',{width:1280,height:800}],['phone',{width:390,height:844}]]){
  const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/hex/mock/world-map/trio-world-map-mock.html'); await p.waitForTimeout(3000);
  await p.screenshot({path:'/home/claude/hex/mock/world-map/'+n+'-top.png'});
  console.log(n, await p.evaluate(()=>document.getElementById('warn').textContent+' | '+document.getElementById('count').textContent));
  if(n==='desk'){ await p.click('#vTilt'); await p.waitForTimeout(1500); await p.screenshot({path:'/home/claude/hex/mock/world-map/desk-tilt.png'});
   await p.click('#walkBtn'); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1500); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(800); await p.screenshot({path:'/home/claude/hex/mock/world-map/desk-walk.png'}); }
  console.log(errs); }
 await b.close(); })();
