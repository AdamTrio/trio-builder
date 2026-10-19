const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  for(const [q,out] of JSON.parse(process.argv[2])){ const p=await b.newPage({viewport:{width:1600,height:900}});
    p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto('http://127.0.0.1:8765/mock/beams/beams.html?'+q);
    await p.waitForFunction(()=>window.DONE,null,{timeout:240000}); await p.screenshot({path:out}); await p.close(); }
  await b.close(); })();
