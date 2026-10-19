const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 for(const u of ['dist/trio-builder-admin.html?space=mood','out/t88.html']){
  const p=await b.newPage({viewport:{width:1280,height:800}});
  await p.goto('http://127.0.0.1:8765/'+u,{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok); await p.waitForTimeout(2500);
  console.log(u, await p.evaluate(()=>JSON.stringify(Object.keys(window.HEXCORE.BOARDS).map(k=>{ const r=window.HEXCORE.BOARDS[k]; const g=r.group||r.mesh; return [k, g&&g.visible, g&&g.parent?1:0]; }))));
  await p.evaluate(()=>window.HEX.setYaw(Math.PI)); await p.waitForTimeout(800); await p.screenshot({path:'/tmp/claude-0/w3-'+(u.length)+'.png'});
  await p.close(); }
 await b.close(); })();
