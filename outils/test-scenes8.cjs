/* v281 : scènes, chronologie et CV. Faux AudioParam, vraie logique du module. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'app/src/main/assets/drm16.html'),'utf8');
const code=fs.readFileSync(path.join(root,'page/js/458-scenes8-eurorack.js'),'utf8');
const porte=html.match(/function eurPorte\(p, t, duree\)\{[\s\S]*?\n\}/)[0];
const cycle=html.match(/var EUR_CYCLE = \(function\(\)\{[\s\S]*?\n\}\)\(\);/)[0];
let total=0,n=0;
function ok(c,m){n++;assert.ok(c,m);}function eq(a,b,m){n++;assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);}function proche(a,b){ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}function test(nom,f){f();total++;console.log('ok '+nom);}
function env(){
 const b={EUR_CAT:{},EUR_ORDRE:[],ctx:{currentTime:0},stepDur:()=>.125};b.maintenantAudio=()=>b.ctx.currentTime;
 b.eurGain=v=>({gain:{value:v},connect(){}});
 b.eurConst=v=>({offset:{value:v,events:[],cancelScheduledValues(t){this.events=this.events.filter(x=>x.t<t);},setValueAtTime(v,t){ok(Number.isFinite(v)&&Number.isFinite(t)&&t>=0);this.events.push({t,v,type:'set'});},linearRampToValueAtTime(v,t){ok(Number.isFinite(v)&&Number.isFinite(t)&&t>=0);this.events.push({t,v,type:'linear'});}}});
 vm.createContext(b);vm.runInContext(porte,b);vm.runInContext(cycle,b);vm.runInContext(code,b);
 return {b,mod(p={}){const m={id:1,type:'scenes8',p:{...p}};m.io=b.EUR_CAT.scenes8.creer(m);return m;}};
}
function tick(m,i,base=1){return m.recevoir(base+i*.125,'in');}
function aller(m,n){for(let i=0;i<n;i++)tick(m,i);}
function niveau(m,k){return m.io.s[k].offset.events.at(-1)?.v??0;}
test('52 paramètres numériques et 9 prises uniques',()=>{const e=env(),m=e.mod(),d=e.b.EUR_CAT.scenes8;eq(d.kns.length,52);eq(new Set(d.kns.map(k=>k[0])).size,52);eq(new Set(d.jacks.map(j=>j[0])).size,9);eq(e.b.EUR_ORDRE,['scenes8']);for(const k of d.kns)ok(Number.isFinite(m.p[k[0]])&&m.p[k[0]]>=k[2]&&m.p[k[0]]<=k[3]);});
test('la page assemblée contient exactement la source',()=>{eq(html.split(code).length,2);});
test('normalisation des paramètres malformés',()=>{const m=env().mod({len:99,fade:Infinity,hold:.8,bars1:0,nom1:99,a1:-2,b1:999,c1:NaN,d1:'4',pasmes:'x'});eq([m.p.len,m.p.fade,m.p.hold,m.p.bars1,m.p.nom1,m.p.a1,m.p.b1,m.p.c1,m.p.d1,m.p.pasmes],[8,80,1,1,6,0,100,0,70,16]);});
test('premier CLK : scène, mesure, puis horloge',()=>{const m=env().mod();eq(tick(m,0),['change','bar','clk']);eq([m.scenes8.scene,m.scenes8.pas],[0,0]);});
test('16 impulsions exactement par mesure',()=>{const m=env().mod({bars1:2});tick(m,0);for(let i=1;i<16;i++)eq(tick(m,i),['clk']);eq(tick(m,16),['bar','clk']);eq([m.scenes8.scene,m.scenes8.pas],[0,16]);});
test('CYCLES LIBRES : 14 pas (7/8) au lieu de 16',()=>{const m=env().mod({pasmes:14,len:2,bars1:1,bars2:1});tick(m,0);for(let i=1;i<14;i++)eq(tick(m,i),['clk']);eq(tick(m,14),['change','bar','clk']);eq(m.scenes8.scene,1);});
test('CYCLES LIBRES : compte libre hors métriques nommées (11 pas)',()=>{const m=env().mod({pasmes:11});tick(m,0);for(let i=1;i<11;i++)eq(tick(m,i),['clk']);eq(tick(m,11),['change','bar','clk']);});
test('CYCLES LIBRES : pasmes hors bornes normalisé entre 4 et 32',()=>{const m=env().mod({pasmes:2});eq(m.p.pasmes,4);const m2=env().mod({pasmes:99});eq(m2.p.pasmes,32);});
test('durées 1, 3 et 2 mesures, puis boucle',()=>{const m=env().mod({len:3,bars1:1,bars2:3,bars3:2});const attendu=[0,1,1,1,2,2,0,1];for(let i=0;i<attendu.length*16;i++){tick(m,i);eq(m.scenes8.scene,attendu[Math.floor(i/16)]);}});
test('longueurs 1 à 8 et durées 1 à 16',()=>{for(let L=1;L<=8;L++)for(const duree of [1,2,7,16]){const e=env(),m=e.mod({len:L});for(let j=1;j<=8;j++)m.p['bars'+j]=duree;eq(e.b.EUR_SCENES8.longueur(m),L*duree);for(let i=0;i<L*duree*16+1;i++){tick(m,i);eq(m.scenes8.scene,Math.floor(i/(duree*16))%L);}}});
test('une seule scène émet SCÈNE à chaque nouveau cycle',()=>{const m=env().mod({len:1});aller(m,16);eq(tick(m,16),['change','bar','clk']);eq(m.scenes8.scene,0);});
test('raccourcir la boucle conserve les scènes hors longueur',()=>{const e=env(),m=e.mod({len:2,bars8:16,d8:37});eq(e.b.EUR_SCENES8.longueur(m),2);aller(m,64);eq([m.p.bars8,m.p.d8,m.scenes8.scene],[16,37,1]);});
test('réduire la longueur rejoint la première scène à la mesure suivante',()=>{const m=env().mod();aller(m,40);eq(m.scenes8.scene,2);m.p.len=1;for(let i=40;i<48;i++)tick(m,i);eq(m.scenes8.scene,2);eq(tick(m,48),['change','bar','clk']);eq(m.scenes8.scene,0);});
test('quatre CV indépendants, de 0 à 1 V',()=>{const m=env().mod({a1:0,b1:25,c1:75,d1:100,fade:0});tick(m,0);eq(['a','b','c','d'].map(k=>niveau(m,k)),[0,.25,.75,1]);});
test('fondu de 80 ms aux dates audio',()=>{const m=env().mod({a1:100});tick(m,0);eq(m.io.s.a.offset.events,[{t:1,v:0,type:'set'},{t:1.08,v:1,type:'linear'}]);});
test('fondu nul change le niveau sans rampe',()=>{const m=env().mod({fade:0});tick(m,0);ok(!m.io.s.a.offset.events.some(x=>x.type==='linear'));proche(niveau(m,'a'),.65);});
test('aucune reprogrammation des CV inchangés',()=>{const m=env().mod({bars1:4});tick(m,0);const a=JSON.stringify(m.io.s.a.offset.events);for(let i=1;i<64;i++)tick(m,i);eq(JSON.stringify(m.io.s.a.offset.events),a);});
test('édition à chaud appliquée à la prochaine mesure',()=>{const m=env().mod({bars1:3,a1:20});aller(m,7);m.p.a1=80;for(let i=7;i<16;i++)tick(m,i);proche(niveau(m,'a'),.2);tick(m,16);proche(niveau(m,'a'),.8);});
test('durée réduite : passage au prochain début de mesure',()=>{const m=env().mod({bars1:4});aller(m,26);m.p.bars1=1;for(let i=26;i<32;i++)tick(m,i);eq(m.scenes8.scene,0);tick(m,32);eq(m.scenes8.scene,1);});
test('TENIR conserve le CLK et répète la dernière mesure',()=>{const m=env().mod({hold:1,bars1:2});for(let i=0;i<100;i++){const f=tick(m,i);ok(f.includes('clk'));eq(m.scenes8.scene,0);if(i>=32)ok(m.scenes8.pas>=16&&m.scenes8.pas<32);}});
test('relâcher TENIR reprend au prochain début de mesure',()=>{const m=env().mod({hold:1});aller(m,36);m.p.hold=0;for(let i=36;i<48;i++)tick(m,i);eq(m.scenes8.scene,0);tick(m,48);eq(m.scenes8.scene,1);});
test('paramètres conservés pendant TENIR',()=>{const m=env().mod({hold:1});aller(m,17);m.p.b1=39;for(let i=17;i<=32;i++)tick(m,i);proche(niveau(m,'b'),.39);eq(m.p.hold,1);});
test('dates invalides, doublées, anciennes et prises inconnues ignorées',()=>{const m=env().mod();for(const t of [NaN,Infinity,-1])eq(m.recevoir(t,'in'),null);eq(m.recevoir(1,'x'),null);tick(m,0);for(const t of [1,.5])eq(m.recevoir(t,'in'),null);eq(m.scenes8.pas,0);});
test('RST réaligne puis premier CLK, même à la même date',()=>{const m=env().mod();aller(m,30);eq(m.recevoir(5,'rst'),null);eq(m.scenes8.scene,-1);eq(m.recevoir(4.9,'in'),null);eq(m.recevoir(5,'in'),['change','bar','clk']);eq(m.scenes8.scene,0);});
test('RST annule les impulsions futures',()=>{const m=env().mod();tick(m,0);m.recevoir(1.002,'rst');for(const k of ['clk','bar','change'])ok(m.io.s[k].offset.events.filter(x=>x.t>=1.002).every(x=>x.v===0));});
test('STOP avant le look-ahead supprime les quatre niveaux futurs',()=>{const e=env(),m=e.mod();aller(m,40);e.b.ctx.currentTime=.5;m.arreter();for(const k of ['a','b','c','d']){proche(niveau(m,k),0);ok(m.io.s[k].offset.events.every(x=>x.t<1));}eq(m.scenes8.dates,[]);eq(m.scenes8.scene,-1);});
test('STOP dans un fondu conserve sa partie déjà prévue',()=>{const e=env(),m=e.mod({a1:100,fade:1000});tick(m,0);for(let i=1;i<=16;i++)tick(m,i);e.b.ctx.currentTime=1.5;m.arreter();const ev=m.io.s.a.offset.events;ok(ev.some(x=>x.type==='linear'&&x.t===1.5&&Math.abs(x.v-.5)<1e-8));eq(ev.at(-1),{t:1.505,v:0,type:'linear'});});
test('une nouvelle scène peut interrompre un fondu sans saut rétroactif',()=>{const e=env(),m=e.mod({fade:1000,a1:100,a2:0});for(let i=0;i<=16;i++)m.recevoir(1+i*.025,'in');proche(m.scenes8.hist.a.at(-1).a,.4);ok(m.io.s.a.offset.events.some(x=>x.type==='linear'&&Math.abs(x.t-1.4)<1e-8&&Math.abs(x.v-.4)<1e-8));});
test('CV continus jamais annoncés comme des déclencheurs',()=>{const m=env().mod();for(let i=0;i<150;i++)ok(tick(m,i).every(k=>['clk','bar','change'].includes(k)));});
test('impulsions raccourcies quand CLK rapide',()=>{const m=env().mod();m.recevoir(1,'in');m.recevoir(1.002,'in');proche(m.io.s.clk.offset.events.at(-1).t,1.0029);});
test('deux instances isolées',()=>{const e=env(),a=e.mod(),b=e.mod();a.p.a1=4;aller(a,22);eq(b.p.a1,65);eq(b.scenes8.scene,-1);ok(a.io.s.a!==b.io.s.a);});
test('aller-retour JSON conserve les 52 réglages',()=>{const e=env(),a=e.mod({len:5,fade:137,bars3:7,d8:38,nom6:6});const b=e.mod(JSON.parse(JSON.stringify(a.p)));eq(a.p,b.p);eq(Object.keys(a.p).length,52);});
test('hors ligne : pas de file graphique et une seule rampe par voie',()=>{const e=env();e.b.ctx.startRendering=()=>{};const m=e.mod();aller(m,1200);eq(m.scenes8.dates,[]);for(const k of ['a','b','c','d'])eq(m.scenes8.hist[k].length,1);});
test('historique direct borné au look-ahead',()=>{const e=env(),m=e.mod();for(let i=0;i<1200;i++){e.b.ctx.currentTime=.8+i*.125;tick(m,i);}ok(m.scenes8.dates.length<=128);for(const k of ['a','b','c','d'])ok(m.scenes8.hist[k].length<=3);});
console.log(`SCÈNES 8 : ${total} scénarios, ${n} assertions, 0 erreur.`);
