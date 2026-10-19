const { chromium } = require('playwright'); const fs=require('fs');
const img='data:image/jpeg;base64,'+fs.readFileSync('out/houses/var0.jpg').toString('base64');
const sw=(cs,on)=>cs.map((c,i)=>`<i style="background:${c}" class="${i===on?'on':''}"></i>`).join('');
const chips=(ts,on)=>ts.map(t=>`<b class="${t===on?'on':''}">${t}</b>`).join('');
const row=(l,inner)=>`<div class="r"><label>${l}</label><div>${inner}</div></div>`;
const html=`<html><head><style>
body{margin:0;background:#0b0a12;font-family:Helvetica,Arial,sans-serif;color:#e8e4f7;display:flex;width:1400px;height:820px}
.v{flex:1;background:url(${img}) center/cover;position:relative}
.tag{position:absolute;left:18px;bottom:18px;background:rgba(10,9,18,.8);border:1px solid rgba(139,123,255,.4);border-radius:10px;padding:8px 12px;font-size:13px}
.p{width:400px;background:#16141f;border-left:1px solid #2a2638;padding:18px 20px;box-sizing:border-box;overflow:hidden}
h2{font:800 15px Helvetica;letter-spacing:.12em;margin:0 0 4px;color:#fff}.sub{font-size:12px;color:#9c94bd;margin-bottom:14px}
h3{font:800 11px Helvetica;letter-spacing:.14em;color:#f5d400;margin:16px 0 8px}
.r{display:flex;align-items:center;gap:10px;margin:7px 0}.r label{width:84px;font-size:12px;color:#cfc7f2}.r>div{flex:1;display:flex;flex-wrap:wrap;gap:6px}
i{width:22px;height:22px;border-radius:6px;display:inline-block;border:2px solid rgba(255,255,255,.12)}i.on{border-color:#f5d400;box-shadow:0 0 0 2px #16141f inset}
b{font:700 11px Helvetica;padding:5px 9px;border-radius:999px;background:#211e2e;border:1px solid #34304a;color:#cfc7f2}b.on{background:#f5d400;color:#16141f;border-color:#f5d400}
.seg b{border-radius:8px}
</style></head><body><div class="v"><div class="tag">Suburban house · picked</div></div><div class="p">
<h2>SUBURBAN HOUSE</h2><div class="sub">Coded model · every part has its own colour and finish</div>
<h3>WALLS</h3>${row('Finish',chips(['Siding','Brick','Stucco','Stone','Wood','Paint'],'Siding'))}${row('Colour',sw(['#f2f0ea','#dbe5ea','#c4d8bd','#e9d8b8','#2f4f6e','#7a2f2f','#3b3b3b'],1))}
<h3>ROOF</h3>${row('Finish',chips(['Shingles','Metal','Clay tiles','Flat'],'Shingles'))}${row('Colour',sw(['#4a4d57','#2b2b2b','#6e4c3b','#9aa0a6','#b5583a','#3f5b44'],0))}
<h3>DETAILS</h3>${row('Trim',sw(['#ffffff','#f3eee4','#202022','#3a2e25','#9aa7b3'],0))}${row('Front door',sw(['#a3262a','#1f3a5f','#f0c445','#2d4a3e','#202022','#ffffff'],0))}
${row('Windows',chips(['glow on','off'],'glow on')+sw(['#ffbf6e','#ffe9c2','#a8d8ff','#ff8fd0'],0))}
<h3>EXTRAS</h3>${row('Porch',chips(['on','off'],'on'))}${row('Garage',chips(['on','off'],'on'))}${row('Fence',chips(['on','off'],'off'))}
<h3>DOOR LINK</h3>${row('Opens',chips(['a room','nothing'],'a room'))}
</div></body></html>`;
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:820}}); await p.setContent(html); await p.waitForTimeout(500); await p.screenshot({path:'out/houses/panel.png'}); await b.close(); })();
