(async()=>{
const { chromium } = require('playwright');
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
for (const [n,vp] of [['phone',{width:390,height:844}],['desk',{width:1280,height:800}]]){
 const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('file://'+'/home/claude/hex/mock/world-tile/trio-world-tile-mock.html'); await p.waitForTimeout(1500);
 await p.screenshot({path:'/home/claude/hex/mock/world-tile/'+n+'-walk.png'});
 await p.keyboard.down('ArrowUp'); await p.waitForTimeout(2500); await p.keyboard.up('ArrowUp'); await p.screenshot({path:'/home/claude/hex/mock/world-tile/'+n+'-walk2.png'});
 await p.click('#fly'); await p.waitForTimeout(2500); await p.screenshot({path:'/home/claude/hex/mock/world-tile/'+n+'-fly.png'});
 console.log(n,errs);
}
await b.close();
})();
