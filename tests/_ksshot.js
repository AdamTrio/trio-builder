const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto('file:///home/claude/hex/kitlab/katseye/trio-kitlab-katseye.html'); await p.waitForTimeout(7000);
  const click=async(k,v)=>{ await p.evaluate(([k,v])=>document.querySelector(`.seg[data-k="${k}"] button[data-v="${v}"]`).click(),[k,v]); await p.waitForTimeout(5000); };
  const shot=n=>p.screenshot({path:'/home/claude/hex/out/ks-'+n+'.png'});
  await shot('night-over'); await click('view','front'); await shot('night-front'); await click('view','door'); await shot('night-door');
  await click('view','up'); await shot('night-up'); await click('time','day'); await click('view','over'); await shot('day-over'); await click('view','front'); await shot('day-front');
  console.log(errs); await b.close(); })();
