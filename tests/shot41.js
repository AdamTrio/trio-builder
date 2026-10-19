const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const out=process.argv[2]||'/tmp/claude-0/s41';
  for(const sp of ['event','room']){
    const p=await b.newPage({viewport:{width:1280,height:760}});
    const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
    await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space='+sp);
    await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
    const tabs=await p.evaluate(()=>[...document.querySelectorAll('#stgRail button')].filter(b=>b.style.display!=='none').map(b=>b.dataset.tab));
    console.log(sp,'tabs',tabs.join(','),'errs',errs.length, errs.slice(0,2));
    for(const t of tabs){
      await p.evaluate(t=>document.querySelector('#stgRail button[data-tab="'+t+'"]').click(),t); await p.waitForTimeout(250);
      const vis=await p.evaluate(()=>[...document.querySelectorAll('#stgBody>.stsec')].filter(s=>s.style.display!=='none').map(s=>s.dataset.t));
      console.log(' ',t,'->',vis.join(' | '));
      await p.screenshot({path:`${out}-${sp}-${t}.png`});
    }
    await p.close();
  }
  await b.close();
})();
