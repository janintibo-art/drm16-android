/* v279 : vrai moteur DRUM 32 et helper eurPorte ; aucune attente murale. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app/src/main/assets/drm16.html'),'utf8');
const code=fs.readFileSync(path.join(root,'page/js/453-drum32-eurorack.js'),'utf8');
const porte=html.match(/function eurPorte\(p, t, duree\)\{[\s\S]*?\n\}/)[0];
let tests=0,verifs=0;
function ok(c,m){verifs++;assert.ok(c,m);}
function eq(a,b,m){verifs++;assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);}
function proche(a,b){ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
function env(){
 const box={EUR_CAT:{},EUR_ORDRE:[],ctx:{currentTime:0},Math:Object.create(Math),stepDur:()=>.125,maintenantAudio:()=>box.ctx.currentTime};
 let rand=0;box.Math.random=()=>{rand++;return .5;};
 box.eurGain=v=>({gain:{value:v},connect(){}});
 box.eurConst=v=>({offset:{value:v,events:[],cancelScheduledValues(t){this.events=this.events.filter(e=>e.t<t);},setValueAtTime(v,t){assert.ok(Number.isFinite(t)&&t>=0);this.events.push({t,v});}}});
 vm.createContext(box);vm.runInContext(porte,box);vm.runInContext(code,box);
 function mod(){const m={id:1,type:'drum32',p:{}};m.io=box.EUR_CAT.drum32.creer(m);return m;}
 return {box,mod,rand:()=>rand};
}
function vider(m){for(const c of 'abcd')for(let n=1;n<=32;n++)m.p[c+n]=0;}
function test(n,fn){fn();tests++;console.log('ok '+n);}
test('schema numérique complet, prises et catalogue',()=>{
 const e=env(),d=e.box.EUR_CAT.drum32,m=e.mod();eq(e.box.EUR_ORDRE,['drum32']);eq(d.kns.length,144);
 eq(new Set(d.kns.map(k=>k[0])).size,144);eq(Object.keys(m.p).length,144);eq(d.jacks.map(j=>j[0]),['clk','rst','ta','tb','tc','td']);
 for(const k of d.kns)ok(Number.isFinite(m.p[k[0]])&&m.p[k[0]]>=k[2]&&m.p[k[0]]<=k[3]);
});
test('premier CLK commence au pas 1 des quatre pistes',()=>{const m=env().mod();vider(m);for(const c of 'abcd')m.p[c+1]=1;eq(m.recevoir(1,'clk'),[['ta',1],['tb',1],['tc',1],['td',1]]);eq(m.drum32.pos,[0,0,0,0]);});
test('32 longueurs : trois tours exacts, dont les pas 17 à 32',()=>{
 for(let L=1;L<=32;L++){const m=env().mod();vider(m);m.p.alen=L;m.p['a'+L]=1;const dates=[];
  for(let k=0;k<L*3;k++){const f=m.recevoir(1+k*.125,'clk');eq(m.drum32.pos[0],k%L);dates.push(...f.filter(x=>x[0]==='ta').map(x=>x[1]));}
  eq(dates,[1+(L-1)*.125,1+(2*L-1)*.125,1+(3*L-1)*.125]);
 }
});
test('longueurs indépendantes 3 / 5 / 7 / 32',()=>{
 const m=env().mod();vider(m);[3,5,7,32].forEach((n,i)=>{m.p['abcd'[i]+'len']=n;m.p['abcd'[i]+1]=1;});
 for(let i=0;i<224;i++){const f=m.recevoir(1+i*.1,'clk');for(let v=0;v<4;v++){let L=[3,5,7,32][v];eq(m.drum32.pos[v],i%L);eq(f.some(x=>x[0]==='t'+'abcd'[v]),i%L===0);}}
});
test('roulements de un à quatre coups : dates et tensions concordent',()=>{
 for(let n=1;n<=4;n++){const m=env().mod();vider(m);m.p.a1=n;const f=m.recevoir(2,'clk');eq(f.length,n);
  for(let i=0;i<n;i++){proche(f[i][1],2+i*.125/n);const ev=m.io.s.ta.offset.events.filter(x=>x.v===1);proche(ev[i].t,f[i][1]);}
  const ev=m.io.s.ta.offset.events;eq(ev.length,n*2);for(let i=0;i<n;i++)ok(ev[i*2+1].t<2+(i+1)*.125/n);
 }
});
test('intervalle reçu suivi, CLK divisée et accélération sans temporisateur',()=>{
 const m=env().mod();vider(m);m.p.a1=4;m.p.alen=1;m.recevoir(1,'clk');let f=m.recevoir(1.5,'clk');eq(f.length,4);proche(f[3][1],1.875);f=m.recevoir(1.625,'clk');proche(f[3][1],1.71875);
});
test('sorties de pistes triées chronologiquement',()=>{const m=env().mod();vider(m);m.p.a1=4;m.p.b1=3;m.p.c1=2;m.p.d1=1;const f=m.recevoir(1,'clk');eq(f.length,10);ok(f.every((x,i)=>i===0||x[1]>=f[i-1][1]));});
test('0 et 100 % ne tirent jamais de hasard',()=>{
 const e=env(),m=e.mod();for(const c of 'abcd')for(let n=1;n<=32;n++)m.p[c+n]=4;
 for(const c of 'abcd')m.p[c+'chance']=0;eq(m.recevoir(1,'clk'),[]);eq(e.rand(),0);
 for(const c of 'abcd')m.p[c+'chance']=100;eq(m.recevoir(1.125,'clk').length,16);eq(e.rand(),0);
});
test('probabilité au pas entier : les quatre répétitions passent ensemble',()=>{
 const e=env(),m=e.mod();vider(m);m.p.alen=1;m.p.a1=4;m.p.achance=50;e.box.Math.random=()=>.49;eq(m.recevoir(1,'clk').length,4);e.box.Math.random=()=>.5;eq(m.recevoir(1.125,'clk').length,0);
});
test('les silences ne consomment pas de hasard',()=>{const e=env(),m=e.mod();vider(m);for(const c of 'abcd')m.p[c+'chance']=40;eq(m.recevoir(1,'clk'),[]);eq(e.rand(),0);});
test('MUTE avance sans déclencher et réactive au bon pas',()=>{
 const e=env(),m=e.mod();vider(m);m.p.alen=4;m.p.a1=1;m.p.a3=1;m.p.amute=1;eq(m.recevoir(1,'clk'),[]);eq(m.recevoir(1.125,'clk'),[]);m.p.amute=0;eq(m.recevoir(1.25,'clk'),[['ta',1.25]]);
});
test('décalage modulo longueur sans déplacer les données',()=>{
 const m=env().mod();vider(m);m.p.alen=3;m.p.ashift=31;m.p.a2=1;let avant=JSON.stringify(m.p);eq(m.recevoir(1,'clk'),[['ta',1]]);eq(JSON.stringify(m.p),avant);
});
test('les pas hors longueur sont conservés, mais ne jouent pas',()=>{
 const m=env().mod();vider(m);m.p.a17=4;m.p.alen=16;for(let k=0;k<32;k++)eq(m.recevoir(1+k*.125,'clk'),[]);eq(m.p.a17,4);m.p.alen=32;eq(m.recevoir(5,'clk').length,4);
});
test('RST annule les tensions futures et réaligne les quatre pistes',()=>{
 const m=env().mod();vider(m);m.p.a1=4;m.recevoir(1,'clk');eq(m.recevoir(1.04,'rst'),null);eq(m.drum32.pos,[-1,-1,-1,-1]);eq(m.drum32.dernier,null);
 for(const c of 'abcd')ok(m.io.s['t'+c].offset.events.filter(e=>e.t>=1.04).every(e=>e.v===0));eq(m.recevoir(1.2,'clk').length,4);eq(m.drum32.pos,[0,0,0,0]);
});
test('STOP efface les portes et le suivi graphique',()=>{
 const e=env(),m=e.mod();m.recevoir(1,'clk');e.box.ctx.currentTime=.9;m.arreter();eq(m.drum32.dates,[]);eq(m.drum32.entendu,null);eq(m.drum32.pos,[-1,-1,-1,-1]);for(const c of 'abcd')eq(m.io.s['t'+c].offset.events,[{t:.9,v:0}]);
});
test('horloges doublées ou en arrière ignorées',()=>{const m=env().mod();m.recevoir(1,'clk');for(const t of [1,1,1-.1])eq(m.recevoir(t,'clk'),null);eq(m.drum32.pos,[0,0,0,0]);});
test('entrée inconnue et dates non finies sans effet',()=>{const m=env().mod();for(const t of [NaN,Infinity,-Infinity,-1])eq(m.recevoir(t,'clk'),null);eq(m.recevoir(1,'in'),null);eq(m.drum32.pos,[-1,-1,-1,-1]);});
test('normalisation de valeurs malformées, non finies et absentes',()=>{
 const e=env(),m={p:{alen:100,blen:-3,clen:2.6,a1:Infinity,a2:-1,a3:99,ashift:NaN,achance:Infinity,bchance:-3,amute:5}};
 e.box.EUR_CAT.drum32.creer(m);eq([m.p.alen,m.p.blen,m.p.clen,m.p.a1,m.p.a2,m.p.a3,m.p.ashift,m.p.achance,m.p.bchance,m.p.amute],[32,1,3,1,0,4,0,100,0,1]);
});
test('deux instances entièrement indépendantes',()=>{const e=env(),a=e.mod(),b=e.mod();a.p.a1=4;a.recevoir(1,'clk');eq(b.p.a1,1);eq(b.drum32.pos,[-1,-1,-1,-1]);ok(a.io.s.ta!==b.io.s.ta);});
test('reconstruction reprend les paramètres mais pas les anciennes positions',()=>{
 const e=env(),m=e.mod();m.p.d32=4;m.p.dlen=7;m.recevoir(1,'clk');e.box.EUR_CAT.drum32.creer(m);eq(m.p.d32,4);eq(m.p.dlen,7);eq(m.drum32.pos,[-1,-1,-1,-1]);
});
test('historique graphique borné à 128 pas',()=>{const m=env().mod();for(let i=0;i<1000;i++)m.recevoir(1+i*.1,'clk');eq(m.drum32.dates.length,128);});
test('aucun historique de lecture accumulé en rendu hors ligne',()=>{const e=env(),m=e.mod();e.box.ctx.startRendering=()=>{};for(let i=0;i<1000;i++){m.recevoir(1+i*.1,'clk');if(i%16===0)m.recevoir(1+i*.1+.01,'rst');}eq(m.drum32.dates.length,0);});
test('longueurs et décalages changés à chaud',()=>{const m=env().mod();vider(m);for(let i=0;i<20;i++)m.recevoir(1+i*.1,'clk');m.p.alen=3;m.p.ashift=1;m.p.a1=1;eq(m.recevoir(3,'clk'),[['ta',3]]);eq(m.drum32.pos[0],2);});
test('aucun changement aux états persistants lors de 1024 CLK',()=>{const m=env().mod(),p=JSON.stringify(m.p);for(let i=0;i<1024;i++)m.recevoir(1+i*.025,'clk');eq(JSON.stringify(m.p),p);});
console.log(`DRUM 32 : ${tests} scénarios, ${verifs} assertions, 0 erreur.`);
