/* v280 : moteur MÉLO 32, horloge, CV, accents et sauvegardes. Aucun timer mural. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'app/src/main/assets/drm16.html'),'utf8');
const code=fs.readFileSync(path.join(root,'page/js/456-melo32-eurorack.js'),'utf8');
const porte=html.match(/function eurPorte\(p, t, duree\)\{[\s\S]*?\n\}/)[0];
let total=0,verifications=0;
function ok(c,m){verifications++;assert.ok(c,m);}
function eq(a,b,m){verifications++;assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);}
function proche(a,b,m){ok(Math.abs(a-b)<1e-8,m||`${a} != ${b}`);}
function test(n,fn){fn();total++;console.log('ok '+n);}
function env(){
 const box={EUR_CAT:{},EUR_ORDRE:[],ctx:{currentTime:0},stepDur:()=>.125,Math:Object.create(Math)};
 let alea=0;box.Math.random=()=>{alea++;return .5;};box.maintenantAudio=()=>box.ctx.currentTime;
 box.eurGain=v=>({gain:{value:v},connect(){}});
 box.eurConst=v=>({offset:{value:v,events:[],cancelScheduledValues(t){this.events=this.events.filter(e=>e.t<t);},setValueAtTime(v,t){ok(Number.isFinite(v)&&Number.isFinite(t)&&t>=0);this.events.push({t,v,type:'set'});},linearRampToValueAtTime(v,t){ok(Number.isFinite(v)&&Number.isFinite(t)&&t>=0);this.events.push({t,v,type:'linear'});}}});
 vm.createContext(box);vm.runInContext(porte,box);vm.runInContext(code,box);
 return {box,alea:()=>alea,mod(p={}){const m={id:1,type:'melo32',p:{...p}};m.io=box.EUR_CAT.melo32.creer(m);return m;}};
}
function ligne(m,n=33){for(let i=1;i<=32;i++){m.p['n'+i]=n;m.p['on'+i]=1;m.p['a'+i]=0;m.p['s'+i]=0;m.p['p'+i]=100;}m.p.scale=0;}
test('schema, catalogue et 167 paramètres numériques uniques',()=>{
 const e=env(),m=e.mod(),d=e.box.EUR_CAT.melo32;eq(e.box.EUR_ORDRE,['melo32']);eq(d.kns.length,167);eq(new Set(d.kns.map(k=>k[0])).size,167);
 for(const k of d.kns)ok(Number.isFinite(m.p[k[0]]) && m.p[k[0]]>=k[2]&&m.p[k[0]]<=k[3]);eq(d.jacks.map(j=>j[0]),['clk','rst','cv','gate','acc']);
});
test('quantification exhaustive sur 12 toniques, 5 gammes, 128 notes',()=>{
 const q=env().box.EUR_MELO32.quantifier,scales=[[0,1,2,3,4,5,6,7,8,9,10,11],[0,2,3,5,7,8,10],[0,2,4,5,7,9,11],[0,2,3,5,7,9,10],[0,3,5,7,10]];
 for(let r=0;r<12;r++)for(let g=0;g<5;g++)for(let n=0;n<128;n++){
  const candidats=Array.from({length:128},(_,i)=>i).filter(i=>scales[g].includes(((i-r)%12+12)%12));
  candidats.sort((a,b)=>Math.abs(a-n)-Math.abs(b-n)||a-b);eq(q(n,r,g),candidats[0]);
 }
});
test('frontières d’octave et égalités : plus proche puis plus basse',()=>{const q=env().box.EUR_MELO32.quantifier;eq(q(71,9,4),72);eq(q(61,0,2),60);eq(q(0,9,4),0);});
test('transposition avant gamme sans réécrire les notes',()=>{const e=env(),m=e.mod({n1:60,trans:1,root:0,scale:2});eq(e.box.EUR_MELO32.noteJouee(m,1),60);eq(m.p.n1,60);m.p.scale=0;eq(e.box.EUR_MELO32.noteJouee(m,1),61);});
test('CV exact, 0 V LA1, une octave par volt',()=>{
 for(const note of [24,33,45,57,69,84]){const m=env().mod();ligne(m,note);eq(m.recevoir(1,'clk'),['gate']);proche(m.io.s.cv.offset.events.at(-1).v,(note-33)/12);}
});
test('noms de notes en notation MIDI standard',()=>{const n=env().box.EUR_MELO32.noteNom;eq([n(24),n(33),n(60),n(69),n(84)],['DO1','LA1','DO4','LA4','DO6']);});
test('les 32 longueurs en avant et arrière, trois cycles chacune',()=>{
 for(let L=1;L<=32;L++)for(let dir=0;dir<=1;dir++){
  const m=env().mod({len:L,dir});ligne(m);for(let i=0;i<L*3;i++){m.recevoir(1+i*.125,'clk');eq(m.melo32.pos,dir?L-1-(i%L):i%L);}
 }
});
test('aller-retour sans redoubler les extrémités et longueur 1',()=>{
 for(const L of [1,2,3,7,32]){const m=env().mod({len:L,dir:2});ligne(m);const trajet=L===1?[0]:Array.from({length:L},(_,i)=>i).concat(Array.from({length:L-2},(_,i)=>L-2-i));
 for(let i=0;i<100;i++){m.recevoir(1+i*.125,'clk');eq(m.melo32.pos,trajet[i%trajet.length]);}}
});
test('aléatoire limité à la longueur choisie',()=>{const e=env(),m=e.mod({len:7,dir:3});ligne(m);for(const r of [0,.2,.9,.999999]){e.box.Math.random=()=>r;m.recevoir(1+r,'clk');eq(m.melo32.pos,Math.floor(r*7));}});
test('changer de sens repart sur la première note de ce parcours',()=>{const m=env().mod({len:5});ligne(m);m.recevoir(1,'clk');m.recevoir(1.125,'clk');m.p.dir=1;m.recevoir(1.25,'clk');eq(m.melo32.pos,4);m.p.dir=2;m.recevoir(1.375,'clk');eq(m.melo32.pos,0);});
test('raccourcir conserve les données et ignore les notes hors cycle',()=>{const m=env().mod({len:16,n17:84});for(let i=0;i<32;i++)m.recevoir(1+i*.125,'clk');eq(m.p.n17,84);eq(m.melo32.pos,15);m.p.len=32;m.recevoir(5,'clk');eq(m.melo32.pos,16);});
test('silence sans déplacement du CV ni nouvelle porte',()=>{const m=env().mod();ligne(m);m.recevoir(1,'clk');const ev=JSON.stringify(m.io.s.cv.offset.events);m.p.on2=0;m.p.n2=84;eq(m.recevoir(1.125,'clk'),[]);eq(JSON.stringify(m.io.s.cv.offset.events),ev);eq(m.melo32.pos,1);});
test('probabilité 0 et 100 sans tirage aléatoire',()=>{const e=env(),m=e.mod();ligne(m);m.p.p1=0;eq(m.recevoir(1,'clk'),[]);eq(m.recevoir(1.125,'clk'),['gate']);eq(e.alea(),0);});
test('probabilité du pas : seuil strict',()=>{const e=env(),m=e.mod({len:1});ligne(m);m.p.p1=50;e.box.Math.random=()=>.49;eq(m.recevoir(1,'clk'),['gate']);e.box.Math.random=()=>.5;eq(m.recevoir(1.125,'clk'),[]);});
test('les silences ne consomment pas de hasard de probabilité',()=>{const e=env(),m=e.mod();ligne(m);m.p.on1=0;m.p.p1=50;eq(m.recevoir(1,'clk'),[]);eq(e.alea(),0);});
test('MUTE avance, réactivation sur le bon pas',()=>{const m=env().mod({len:4});ligne(m);m.p.mute=1;eq(m.recevoir(1,'clk'),[]);eq(m.recevoir(1.125,'clk'),[]);m.p.mute=0;eq(m.recevoir(1.25,'clk'),['gate']);eq(m.melo32.pos,2);});
test('ACC envoyé avant GATE, aux mêmes dates audio',()=>{const m=env().mod();ligne(m);m.p.a1=1;eq(m.recevoir(1,'clk'),['acc','gate']);for(const j of ['acc','gate']){const ev=m.io.s[j].offset.events;eq(ev.filter(x=>x.v===1).map(x=>x.t),[1]);proche(ev.at(-1).t,1.012);}});
test('un silence accentué ne transmet pas ACC',()=>{const m=env().mod({on1:0,a1:1});eq(m.recevoir(1,'clk'),[]);ok(m.io.s.acc.offset.events.every(x=>x.v===0));});
test('première note franche, deuxième glissée en 60 ms',()=>{const m=env().mod();ligne(m);m.p.s1=1;m.p.s2=1;m.p.n2=45;m.recevoir(1,'clk');ok(!m.io.s.cv.offset.events.some(x=>x.type==='linear'));m.recevoir(1.125,'clk');eq(m.io.s.cv.offset.events.slice(-2),[{type:'set',v:0,t:1.125},{type:'linear',v:1,t:1.185}]);});
test('glissé limité à 80 % du dernier intervalle',()=>{const m=env().mod({glide:250});ligne(m);m.p.s2=1;m.p.n2=45;m.recevoir(1,'clk');m.recevoir(1.1,'clk');proche(m.melo32.rampe.fin,1.18);});
test('rampe interrompue conserve la partie déjà programmée',()=>{const m=env().mod({glide:250});ligne(m);m.p.s2=m.p.s3=1;m.p.n2=45;m.p.n3=57;m.recevoir(1,'clk');m.recevoir(1.5,'clk');m.recevoir(1.55,'clk');proche(m.melo32.rampe.a,.2);const ev=m.io.s.cv.offset.events;ok(ev.some(x=>x.type==='linear'&&Math.abs(x.t-1.55)<1e-9&&Math.abs(x.v-.2)<1e-8));});
test('aucun glissé après un silence',()=>{const m=env().mod();ligne(m);m.p.on2=0;m.p.s3=1;m.p.n3=57;m.recevoir(1,'clk');m.recevoir(1.125,'clk');m.recevoir(1.25,'clk');eq(m.io.s.cv.offset.events.at(-1).type,'set');proche(m.io.s.cv.offset.events.at(-1).v,2);});
test('RST réaligne et annule portes programmées',()=>{const m=env().mod();m.recevoir(1,'clk');eq(m.recevoir(1.005,'rst'),null);eq(m.melo32.pos,-1);eq(m.melo32.dernier,null);for(const p of ['gate','acc'])ok(m.io.s[p].offset.events.filter(e=>e.t>=1.005).every(e=>e.v===0));m.recevoir(1.125,'clk');eq(m.melo32.pos,0);});
test('STOP avant look-ahead garde le CV réellement courant',()=>{const e=env(),m=e.mod();ligne(m,45);m.recevoir(1,'clk');m.recevoir(1.125,'clk');e.box.ctx.currentTime=.5;m.arreter();proche(m.io.s.cv.offset.events.at(-1).v,0);eq(m.melo32.dates,[]);eq(m.melo32.pos,-1);});
test('STOP pendant rampe, avec une autre note déjà planifiée',()=>{const e=env(),m=e.mod({glide:80});ligne(m);m.p.s2=1;m.p.n2=45;m.p.n3=57;m.recevoir(1,'clk');m.recevoir(1.125,'clk');m.recevoir(1.25,'clk');e.box.ctx.currentTime=1.165;m.arreter();proche(m.io.s.cv.offset.events.at(-1).v,.5);});
test('dates doublées, anciennes, invalides et entrées inconnues ignorées',()=>{const m=env().mod();for(const t of [NaN,Infinity,-1])eq(m.recevoir(t,'clk'),null);eq(m.recevoir(1,'in'),null);m.recevoir(1,'clk');for(const t of [1,.9])eq(m.recevoir(t,'clk'),null);eq(m.melo32.pos,0);});
test('normalisation bornée des valeurs malformées',()=>{const m=env().mod({len:0,dir:99,root:-1,scale:NaN,trans:-999,glide:Infinity,n1:999,on1:2,a1:-1,s1:.7,p1:120});eq([m.p.len,m.p.dir,m.p.root,m.p.scale,m.p.trans,m.p.glide,m.p.n1,m.p.on1,m.p.a1,m.p.s1,m.p.p1],[1,3,0,1,-24,60,84,1,0,1,100]);});
test('deux instances ne partagent ni paramètres ni sorties',()=>{const e=env(),a=e.mod(),b=e.mod();a.p.n1=84;a.recevoir(1,'clk');eq(b.p.n1,33);eq(b.melo32.pos,-1);ok(a.io.s.cv!==b.io.s.cv);});
test('aller-retour JSON garde les 167 paramètres exactement',()=>{const e=env(),a=e.mod({n32:84,on19:0,a31:1,s22:1,p21:42,dir:2,trans:12});const p=JSON.parse(JSON.stringify(a.p)),b=e.mod(p);eq(a.p,b.p);});
test('rendu hors ligne sans historique graphique accumulé',()=>{const e=env();e.box.ctx.startRendering=()=>{};const m=e.mod();ligne(m);for(let i=0;i<300;i++)m.recevoir(1+i*.125,'clk');eq(m.melo32.dates,[]);eq(m.melo32.histoire.length,1);});
test('histoire en direct bornée au dernier CV et au look-ahead',()=>{const e=env(),m=e.mod();ligne(m);for(let i=0;i<300;i++){e.box.ctx.currentTime=i*.125+.8;m.recevoir(1+i*.125,'clk');}ok(m.melo32.histoire.length<=4);ok(m.melo32.dates.length<=128);});
console.log(`MÉLO 32 : ${total} scénarios, ${verifications} assertions, 0 erreur.`);
