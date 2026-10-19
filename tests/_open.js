const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}); const p=await b.newPage({viewport:{width:1600,height:900}});
 await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(2500);
 // boards on, so the chat / game boards show
 await p.evaluate(()=>{ const b=document.querySelector('#stgRail button[data-tab="boards"]'); if(b) b.click(); }); await p.waitForTimeout(500);
 await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>[...x.querySelectorAll('button')].some(y=>y.textContent==='on')&&/board/i.test((x.querySelector('label')||{}).textContent||'')); if(f) [...f.querySelectorAll('button')].find(y=>y.textContent==='on').click(); }); await p.waitForTimeout(1500);
 await p.evaluate(()=>{ const H=window.HEX, S=H._mood;
   H.walls.forEach(w=>{ w.visible=false; });                 // invisible walls
   window.HEXCORE.skyK(H,1);                                 // roof open, stars + sky glow
   H.scene.fog=new THREE.FogExp2(0x07051a,0.004); H.scene.background=new THREE.Color(0x0b0820);
   if(H.dome){ H.dome.visible=true; }
   // the platform edge: a glowing rim + an underside so it floats
   const RM=window.HEXCORE.room(H), R=(RM.R||10)*1.02;
   const sh=new THREE.Shape(); for(let i=0;i<6;i++){ const a=i*Math.PI/3; i?sh.lineTo(Math.cos(a)*R,Math.sin(a)*R):sh.moveTo(Math.cos(a)*R,Math.sin(a)*R);} sh.closePath();
   const pts=sh.getPoints().map(p=>new THREE.Vector3(p.x,.03,p.y)); pts.push(pts[0].clone());
   const rim=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xf5d400})); H.scene.add(rim);
   const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',0),120,.05,6),new THREE.MeshBasicMaterial({color:0xf5d400})); H.scene.add(tube);
   const und=new THREE.Mesh(new THREE.CylinderGeometry(R,1.2,7,6,1,true),new THREE.MeshStandardMaterial({color:0x15131b,roughness:1})); und.position.y=-3.6; H.scene.add(und);
   document.getElementById('stg').classList.remove('open'); ['stgRail','stgTop'].forEach(id=>{ const e=document.getElementById(id); if(e) e.style.display='none'; });
   window.HEXCORE.showWallTags&&window.HEXCORE.showWallTags(false); });
 for(const [n,yaw] of [['a',0],['b',2.4],['c',-2.1]]){ await p.evaluate(y=>{ window.HEX.setYaw(y); },yaw); await p.waitForTimeout(1800); await p.screenshot({path:'/tmp/claude-0/os-'+n+'.png'}); }
 await b.close(); })();
