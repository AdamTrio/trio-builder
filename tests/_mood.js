const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 for(const [w,h,n] of [[1280,760,'desk'],[390,844,'phone']]){
 const p=await b.newPage({viewport:{width:w,height:h}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
 await p.goto('http://127.0.0.1:8765/moodlab/site/index.html'); await p.waitForTimeout(4000);
 await p.screenshot({path:'/home/claude/hex/shots/mood-'+n+'.png'});
 if(n==='desk'){ await p.evaluate(()=>{ document.querySelector('.seg[data-k="walls"] button[data-v="brick"]').click(); document.getElementById('walk').value=.7; }); await p.waitForTimeout(2500); await p.screenshot({path:'/home/claude/hex/shots/mood-desk-brick.png'}); }
 console.log(n,errs.slice(0,3)); await p.close(); }
 await b.close(); })();
