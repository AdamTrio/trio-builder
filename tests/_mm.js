const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1324,height:800}});
 await p.goto('http://127.0.0.1:8765/mock/mood-room-mock.html'); await p.waitForTimeout(600);
 await p.screenshot({path:'/mnt/user-data/outputs/mood-room-mock.png',fullPage:true}); await b.close(); })();
