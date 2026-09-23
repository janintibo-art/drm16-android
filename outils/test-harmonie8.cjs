/* v287 : vraie logique HARMONIE 8, événements AudioParam simulés. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const R=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(R,'app/src/main/assets/drm16.html'),'utf8'),code=fs.readFileSync(path.join(R,'page/js/476-harmonie8-eurorack.js'),'utf8');
const porte=html.match(/function eurPorte\(p, t, duree\)\{[\s\S]*?\n\}/)[0];let total=0,assertions=0;
const plain=x=>JSON.parse(JSON.stringify(x));function ok(x,msg){assertions++;assert.ok(x,msg);}function eq(a,b){assertions++;assert.deepEqual(plain(a),plain(b));}function near(a,b){ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}function test(n,f){f();total++;console.log('ok '+n);}
function env(){
 const b={EUR_CAT:{},EUR_ORDRE:[],ctx:{currentTime:0},stepDur:()=>.125};b.maintenantAudio=()=>b.ctx.currentTime;
 b.eurGain=v=>({gain:{value:v},connect(){}});
 b.eurConst=v=>({stop(){this.stopped=true;},disconnect(){this.disconnected=true;},offset:{value:v,events:[],cancelScheduledValues(t){this.events=this.events.filter(e=>e.t<t);},setValueAtTime(v,t){ok(Number.isFinite(v)&&Number.isFinite(t)&&t>=0);this.events.push({v,t,type:'set'});},linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);this.events.at(-1).type='linear';}}});
 vm.createContext(b);vm.runInContext(porte,b);vm.runInContext(code,b);
 return {b,H:b.EUR_HARMONIE8,mod(ps={}){const m={id:1,type:'harmonie8',p:{...ps}};m.io=b.EUR_CAT.harmonie8.creer(m);return m;}};
}
function tic(m,i){return m.recevoir(1+i*.125,'in');}
function aller(m,n){for(let i=0;i<n;i++)tic(m,i);}
test('source assemblée une seule fois',()=>eq(html.split(code).length,2));
test('39 paramètres et 11 prises uniques, aucune source audio',()=>{const e=env(),m=e.mod(),d=e.b.EUR_CAT.harmonie8;eq(d.kns.length,39);eq(new Set(d.kns.map(k=>k[0])).size,39);eq(new Set(d.jacks.map(j=>j[0])).size,11);eq(Object.keys(m.io.e),['in','rst']);eq(Object.keys(m.io.s),d.jacks.filter(j=>j[2]).map(j=>j[0]));eq(e.b.EUR_ORDRE,['harmonie8']);});
test('valeurs malformées normalisées sans NaN',()=>{const m=env().mod({len:99,root1:NaN,glide:Infinity,ref:-5,trans:40,type2:100,inv1:-1});eq([m.p.len,m.p.root1,m.p.glide,m.p.ref,m.p.trans,m.p.type2,m.p.inv1],[8,33,40,24,12,7,0]);});
test('huit qualités calculées en demi-tons',()=>{const e=env(),m=e.mod({root1:33,oct:0}),attendus=[[33,37,40,45],[33,36,40,45],[33,36,40,43],[33,37,40,44],[33,37,40,43],[33,35,40,45],[33,38,40,45],[33,36,39,42]];for(let i=0;i<8;i++){m.p.type1=i;eq(e.H.accord(m.p,0).notes,attendus[i]);}});
test('renversements : notes distinctes et classes harmoniques conservées',()=>{const e=env(),m=e.mod({oct:0});for(let type=0;type<8;type++)for(let inv=0;inv<4;inv++){m.p.type1=type;m.p.inv1=inv;const a=e.H.accord(m.p,0);ok(a.notes.every((n,i)=>i===0||n>a.notes[i-1]));const pcs=e.H.types[type][2].map(n=>n%12);ok(a.notes.every(n=>pcs.includes((n-a.fond)%12)));}});
test('bornes musicales de toutes les qualités et renversements',()=>{const e=env(),m=e.mod();for(const root of [24,60])for(const trans of [-12,12])for(const oct of [0,2])for(let type=0;type<8;type++)for(let inv=0;inv<4;inv++){Object.assign(m.p,{root1:root,trans,oct,type1:type,inv1:inv});const a=e.H.accord(m.p,0);ok(a.notes.every(n=>Number.isInteger(n)&&n>=0&&n<=127));}});
test('TRANS référence et FOND indépendants de la nappe',()=>{const e=env(),m=e.mod({root1:29,ref:33,trans:2,oct:2,inv1:3});const a=e.H.accord(m.p,0);near(a.shift,-2/12);near(a.root,-2/12);m.p.ref=36;near(e.H.accord(m.p,0).shift,-5/12);});
test('note noms : octave MIDI explicite',()=>{const H=env().H;eq([H.nomNote(33),H.nomNote(60),H.nomNote(61)],['LA1','DO4','DO♯4']);});
test('premier front : cycle puis accord puis CLK',()=>{const m=env().mod();eq(tic(m,0),['cycle','change','clk']);eq([m.harmonie8.pos,m.harmonie8.pas],[0,0]);});
test('une mesure correspond exactement à seize CLK',()=>{const m=env().mod();tic(m,0);for(let i=1;i<16;i++)eq(tic(m,i),['clk']);eq(tic(m,16),['change','clk']);eq(m.harmonie8.pos,1);});
test('durées et boucle 1/3/2 mesures',()=>{const e=env(),m=e.mod({len:3,bars1:1,bars2:3,bars3:2});eq(e.H.longueur(m),6);const attendu=[0,1,1,1,2,2,0];for(let i=0;i<112;i++){tic(m,i);eq(m.harmonie8.pos,attendu[Math.floor(i/16)]);}});
test('mode SCÈNES : une impulsion avance, les durées sont ignorées',()=>{const m=env().mod({sync:1,len:3,bars1:16,bars2:16});for(let i=0;i<12;i++){tic(m,i);eq(m.harmonie8.pos,i%3);}});
test('TENIR suit les impulsions sans avancer, puis reprend',()=>{for(const sync of [0,1]){const m=env().mod({sync,hold:1});for(let i=0;i<48;i++){ok(tic(m,i).includes('clk'));eq(m.harmonie8.pos,0);}m.p.hold=0;tic(m,48);eq(m.harmonie8.pos,1);}});
test('changement de mode réarme au prochain front uniquement',()=>{const m=env().mod({sync:1});aller(m,3);eq(m.harmonie8.pos,2);m.p.sync=0;m.maj();eq(m.harmonie8.pos,2);tic(m,3);eq(m.harmonie8.pos,0);});
test('réduction longueur rejoint début à la prochaine mesure',()=>{const m=env().mod();aller(m,40);m.p.len=1;eq(m.harmonie8.pos,2);for(let i=40;i<=48;i++)tic(m,i);eq(m.harmonie8.pos,0);eq(m.p.root8,31);});
test('édition ne change pas les CV immédiatement',()=>{const m=env().mod({bars1:3,glide:0});aller(m,8);const avant=JSON.stringify(m.io.s.root.offset.events);m.p.root1=40;m.maj();eq(JSON.stringify(m.io.s.root.offset.events),avant);for(let i=8;i<=16;i++)tic(m,i);near(m.harmonie8.valeur('root',3),7/12);});
test('transposition appliquée franchement, sans glissé de nappe',()=>{const m=env().mod({sync:1,glide:200,root2:45});tic(m,0);tic(m,1);near(m.harmonie8.valeur('shift',1.125),1);ok(!m.io.s.shift.offset.events.some(e=>e.type==='linear'));});
test('glissé de nappe : valeurs aux instants intermédiaires',()=>{const m=env().mod({sync:1,glide:200,oct:0,root1:33,root2:45,type1:2,type2:2});tic(m,0);tic(m,1);near(m.harmonie8.valeur('v1',1.225),.5);near(m.harmonie8.valeur('v1',1.326),1);});
test('glissé interrompu conserve la pente antérieure',()=>{const m=env().mod({sync:1,glide:200,oct:0,root1:33,root2:45,root3:33});m.recevoir(1,'in');m.recevoir(2,'in');m.recevoir(2.1,'in');near(m.harmonie8.valeur('v1',2.1),.5);ok(m.io.s.v1.offset.events.some(e=>e.type==='linear'&&e.t===2.1&&Math.abs(e.v-.5)<1e-8));});
test('dates invalides, doubles et prises inconnues ignorées',()=>{const m=env().mod();for(const t of [NaN,Infinity,-1])eq(m.recevoir(t,'in'),null);eq(m.recevoir(1,'inconnue'),null);tic(m,0);eq(m.recevoir(1,'in'),null);eq(m.recevoir(.9,'in'),null);eq(m.harmonie8.pos,0);});
test('RST puis CLK à la même date',()=>{const m=env().mod({sync:1});aller(m,4);m.recevoir(3,'rst');eq(m.harmonie8.pos,-1);eq(m.recevoir(2.9,'in'),null);eq(m.recevoir(3,'in'),['cycle','change','clk']);});
test('STOP retire les changements futurs et garde la hauteur entendue',()=>{const e=env(),m=e.mod({sync:1,glide:0,root1:33,root2:45,oct:0});tic(m,0);tic(m,1);e.b.ctx.currentTime=1.05;m.arreter();near(m.harmonie8.valeur('v1',10),0);for(const k of Object.keys(m.io.s))ok(m.io.s[k].offset.events.every(e=>e.t<=1.05));eq(m.harmonie8.dates,[]);});
test('STOP au milieu du glissé ne saute pas à sa fin',()=>{const e=env(),m=e.mod({sync:1,glide:200,root1:33,root2:45,oct:0});tic(m,0);tic(m,1);e.b.ctx.currentTime=1.225;m.arreter();near(m.harmonie8.valeur('v1',10),.5);});
test('CV jamais propagées comme des impulsions',()=>{const m=env().mod();for(let i=0;i<130;i++)ok(tic(m,i).every(x=>['change','cycle','clk'].includes(x)));});
test('deux instances isolées, JSON exact',()=>{const e=env(),a=e.mod({root3:52,bars7:13,inv4:2}),b=e.mod(plain(a.p));aller(a,80);eq(a.p,b.p);eq(b.harmonie8.pos,-1);ok(a.io.s.v1!==b.io.s.v1);});
test('destruction ferme les sources et interdit les fronts tardifs',()=>{const m=env().mod();tic(m,0);m.io.detruire();ok(Object.values(m.io.s).every(n=>n.stopped&&n.disconnected));eq(tic(m,1),null);eq(m.harmonie8.historique(),0);});
test('historique offline borné et pas de file graphique',()=>{const e=env();e.b.ctx.startRendering=()=>{};const m=e.mod({sync:1});aller(m,500);eq(m.harmonie8.dates,[]);eq(m.harmonie8.historique(),6);});
test('historique live limité au look-ahead',()=>{const e=env(),m=e.mod({sync:1});for(let i=0;i<500;i++){e.b.ctx.currentTime=.8+i*.125;tic(m,i);}ok(m.harmonie8.historique()<=24);ok(m.harmonie8.dates.length<=128);});
console.log(`HARMONIE 8 : ${total} scénarios, ${assertions} assertions, 0 erreur.`);
