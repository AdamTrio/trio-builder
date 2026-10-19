const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:800}});
 await p.goto('http://127.0.0.1:8765/mock/trigger-flow-mock.html'); await p.waitForTimeout(700);
 await p.screenshot({path:'/mnt/user-data/outputs/trigger-flow-mock.png',fullPage:true}); await b.close(); })();
