const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1360,height:760}});
 await p.goto('http://127.0.0.1:8765/mock/egg-float-mock.html'); await p.waitForTimeout(700);
 await p.screenshot({path:'/mnt/user-data/outputs/egg-float-mock.png',fullPage:true}); await b.close(); })();
