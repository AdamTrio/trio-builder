const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}); const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
 await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="boards"]').click()); await p.waitForTimeout(300);
 const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const fs=[...document.querySelectorAll('#stg .stf')].filter(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); fs.forEach(f=>[...f.querySelectorAll('button')].find(x=>x.textContent===v).click()); return fs.length; },[lab,v]);
 console.log(await p.evaluate(()=>[...document.querySelectorAll('#stg .stf label')].map(l=>l.textContent).join('|')));
 await seg('Marquee','on'); await p.waitForTimeout(300);
 for(const lab of ['Live board']) { await seg(lab,'on'); await p.waitForTimeout(200); }
 await seg('Chat board','off'); await seg('On wall','W0'); await p.waitForTimeout(500); await seg('Colours','concrete'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); window.HEX.setYaw(0); }); await p.waitForTimeout(1000);
 await p.screenshot({path:'/mnt/user-data/outputs/v48-boards-concrete.png'}); await b.close(); })();
