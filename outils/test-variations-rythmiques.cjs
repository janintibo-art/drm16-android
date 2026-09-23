/* v285 — Vrais séquenceurs / fausses primitives audio, sans DOM ni périphérique.
   Complété par test-variations-rythmiques.py dans le vrai navigateur. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const R=path.resolve(__dirname,'..');let tests=0;
const json=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
function eq(a,b){assert.deepStrictEqual(json(a),json(b));}
function test(n,f){f();tests++;console.log('ok '+n);}
function env(avec=true){
 const starts=[],trigs=[];
 class P{constructor(v=0){this.value=v;this.events=[];}setValueAtTime(v,t){assert(Number.isFinite(v)&&t>=0);this.events.push([v,t]);}linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);}exponentialRampToValueAtTime(v,t){assert(v>0);this.setValueAtTime(v,t);}cancelScheduledValues(t){this.events=this.events.filter(x=>x[1]<t);}cancelAndHoldAtTime(t){this.cancelScheduledValues(t);}}
 function node(type){return {type,gain:new P(1),offset:new P(),frequency:new P(440),detune:new P(),Q:new P(),playbackRate:new P(1),connect(x){return x;},disconnect(){},start(t=0,offset=0,duration){this.debut=t;this.offsetAudio=offset;this.durationAudio=duration;starts.push(this);},stop(t=0){this.fin=t;}};}
 const ctx={sampleRate:44100,currentTime:0,state:'running',createGain:()=>node('gain'),createConstantSource:()=>node('const'),createBufferSource:()=>node('buffer'),createBiquadFilter:()=>node('filter'),createWaveShaper:()=>node('shape'),createOscillator:()=>node('osc'),
  createBuffer(c,n,s){const d=Array.from({length:c},()=>new Float32Array(n));return {length:n,sampleRate:s,numberOfChannels:c,duration:n/s,getChannelData:i=>d[i]};}};
 let calls=0,seed=1;
 const math=Object.create(Math);math.random=()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const b={console,Math:math,Number,Float32Array,ctx,S:{run:false},EUR_CAT:{},EUR_ORDRE:[],stepDur:()=>.1,maintenantAudio:()=>ctx.currentTime,memEur:()=>{},
 eurGain:v=>{let n=node('gain');n.gain.value=v;return n;},eurConst:v=>{let n=node('const');n.offset.value=v;return n;},eurPorte:(p,t,d)=>trigs.push({p,t,d}),eurCourbe:f=>Float32Array.from({length:1025},(_,i)=>f(i/512-1))};
 vm.createContext(b);for(const name of ['453-drum32-eurorack.js','461-voix-rave-eurorack.js','462-break32-eurorack.js'].concat(avec?['457b-cycles-libres.js','469-variations-rythmiques.js']:[]))vm.runInContext(fs.readFileSync(path.join(R,'page/js',name),'utf8'),b);
 function mod(type,ps={}){const m={id:1,type,p:{}};b.EUR_CAT[type].kns.forEach(k=>m.p[k[0]]=k[4]);Object.assign(m.p,ps);m.io=b.EUR_CAT[type].creer(m);return m;}
 function tick(m,i){ctx.currentTime=1+i*.1;return m.recevoir(ctx.currentTime,'clk');}
 return {b,M:b.EUR_VARIATIONS,ctx,mod,tick,starts,buffers:()=>starts.filter(s=>s.type==='buffer'),calls:()=>calls};
}
for(const type of ['drum32','break32']){
 test(type+' : sans B, aucun changement des paramètres ni de la lecture',()=>{
  const a=env(false),b=env(),ma=a.mod(type),mb=b.mod(type),avant=JSON.stringify(mb.p);
  for(let i=0;i<130;i++)eq(a.tick(ma,i),b.tick(mb,i));
  eq(a.calls(),b.calls());eq(JSON.stringify(mb.p),avant);eq(mb.variation,undefined);
  if(type==='break32')eq(a.buffers().map(x=>[x.debut,x.fin,x.playbackRate.value]),b.buffers().map(x=>[x.debut,x.fin,x.playbackRate.value]));
 });
 test(type+' : copie B indépendante de A, édition indépendante de la lecture',()=>{
  const e=env(),m=e.mod(type),k=type==='drum32'?'a1':'n1',old=m.p[k];e.M.preparerB(m);e.M.editer(m,1);e.M.ecrire(m,k,0);eq(m.p[k],old);eq(e.M.lire(m,k),0);eq(m._rv.lecture,0);
  e.M.editer(m,0);eq(e.M.lire(m,k),old);e.M.ecrire(m,k,2);eq(m.variation.b[k],0);
 });
 test(type+' : sélection B différée, phase des pistes conservée',()=>{
  const e=env(),m=e.mod(type,{alen:7,len:7});e.M.preparerB(m);e.b.S.run=true;e.tick(m,0);e.M.choisir(m,1);
  for(let i=1;i<16;i++){e.tick(m,i);eq(m._rv.lecture,0);}e.tick(m,16);eq(m._rv.lecture,1);
  eq(type==='drum32'?m.drum32.pos[0]:m.break32.pos,16%7);
 });
 test(type+' : un fill dure exactement 16 CLK et revient à A',()=>{
  const e=env(),m=e.mod(type);e.M.preparerB(m);e.b.S.run=true;e.tick(m,0);assert(e.M.fill(m));e.M.fill(m);
  for(let i=1;i<49;i++){e.tick(m,i);eq(m._rv.lecture,i>=16&&i<32?1:0);eq(m._rv.fill,i>=16&&i<32);}
 });
 test(type+' : CYCLES LIBRES — un fill suit PAS/MESURE (14 pas, 7/8)',()=>{
  const e=env(),m=e.mod(type);e.M.preparerB(m);assert(e.M.pasmes(m,14));eq(m.variation.pasmes,14);
  e.b.S.run=true;e.tick(m,0);assert(e.M.fill(m));
  for(let i=1;i<42;i++){e.tick(m,i);eq(m._rv.lecture,i>=14&&i<28?1:0);eq(m._rv.fill,i>=14&&i<28);}
 });
 test(type+' : CYCLES LIBRES — sans variation B, pasmes refusé et reste 16',()=>{
  const e=env(),m=e.mod(type);eq(e.M.pasmes(m,14),false);eq(m.variation,undefined);
  e.b.S.run=true;for(let i=0;i<17;i++)e.tick(m,i);
 });
 test(type+' : fill automatique toutes les 2, 4, 8 mesures',()=>{
  for(const period of [2,4,8]){const e=env(),m=e.mod(type);e.M.preparerB(m);e.M.periode(m,period);e.b.S.run=true;
   for(let i=0;i<16*17;i++){e.tick(m,i);eq(m._rv.fill,(Math.floor(i/16)+1)%period===0);}}
 });
 test(type+' : annuler retire uniquement les commandes non programmées',()=>{
  const e=env(),m=e.mod(type);e.M.preparerB(m);e.b.S.run=true;e.tick(m,0);e.M.fill(m);e.M.choisir(m,1);e.M.annuler(m);
  for(let i=1;i<=16;i++)e.tick(m,i);eq([m._rv.lecture,m._rv.fill,m.variation.initial],[0,false,0]);
  e.M.fill(m);for(let i=17;i<=32;i++)e.tick(m,i);e.M.annuler(m);eq(m._rv.fill,true);
 });
 test(type+' : STOP et RST vident les fills ponctuels sans effacer B',()=>{
  const e=env(),m=e.mod(type);e.M.preparerB(m);const before=JSON.stringify(m.variation);e.b.S.run=true;e.tick(m,0);e.M.fill(m);m.arreter();eq(m._rv.demandeFill,false);eq(m._rv.pas,-1);eq(JSON.stringify(m.variation),before);
  e.tick(m,1);e.M.fill(m);m.recevoir(2,'rst');e.ctx.currentTime=2;m.recevoir(2,'clk');eq(m._rv.fill,false);eq(m._rv.pas,0);
 });
 test(type+' : générer B ne tire pas dans le hasard audio et ne touche jamais A',()=>{
  const e=env(),m=e.mod(type),a=JSON.stringify(m.p),n=e.calls();e.M.generer(m);assert(m.variation);eq(JSON.stringify(m.p),a);eq(e.calls(),n);const b=JSON.stringify(m.variation.b);e.M.generer(m);assert(b!==JSON.stringify(m.variation.b));
 });
 test(type+' : sérialisation bornée et indépendante, données étrangères rejetées',()=>{
  const e=env(),m=e.mod(type);e.M.preparerB(m);const key=type==='drum32'?'a1':'n1';m.variation.b[key]=Infinity;m.variation.b.inconnue=333;m.variation.initial=20;m.variation.periode=5;
  const c=e.M.copier(m,m.variation);eq(c.b[key],m.p[key]);eq(c.periode,0);eq(c.initial,0);eq(c.b.inconnue,undefined);c.b[key]=0;assert(c.b!==m.variation.b);eq(e.M.copier(m,{version:2,b:{}}),null);
 });
 test(type+' : témoins différés à leur date audio',()=>{
  const e=env(),m=e.mod(type);e.M.preparerB(m);e.b.S.run=true;e.tick(m,0);e.M.lireEtat(m,1);e.M.choisir(m,1);
  for(let i=1;i<=16;i++)e.tick(m,i);e.ctx.currentTime=2.5;const d=e.M.lireEtat(m,2.5);eq(d.entendu.banque,0);eq(d.futur.banque,1);eq(e.M.lireEtat(m,2.6).entendu.banque,1);
 });
 test(type+' : historique borné et absent dans les rendus hors ligne',()=>{
  const e=env(),m=e.mod(type);e.M.preparerB(m);for(let i=0;i<1100;i++)e.tick(m,i);assert(m._rv.dates.length<=64);
  e.ctx.startRendering=()=>{};e.M.initialiser(m);m.arreter();for(let i=1100;i<1200;i++)e.tick(m,i);eq(m._rv.dates,[]);
 });
 test(type+' : clic répété, CLK doublé et autre entrée ne décalent pas les mesures',()=>{
  const e=env(),m=e.mod(type);e.tick(m,0);m.recevoir(1,'clk');m.recevoir(.9,'clk');m.recevoir(1.01,'in');eq(m._rv.pas,0);eq(e.M.choisir(m,1),false);eq(e.M.fill(m),false);
 });
 test(type+' : choix à l’arrêt n’avance pas le séquenceur et définit le prochain départ',()=>{
  const e=env(),m=e.mod(type);e.M.preparerB(m);e.M.choisir(m,1);eq(m._rv.pas,-1);eq(m.variation.initial,1);e.tick(m,0);eq(m._rv.lecture,1);
 });
}
test('DRUM : protections de pistes respectées et vrais déclenchements de B',()=>{
 const e=env(),m=e.mod('drum32');e.M.generer(m);for(let i=1;i<=32;i++){eq(m.variation.b['a'+i],m.p['a'+i]);eq(m.variation.b['b'+i],m.p['b'+i]);}
 for(const k of Object.keys(m.variation.b))m.variation.b[k]=0;m.variation.b.a1=4;e.M.choisir(m,1);const r=e.tick(m,0);eq(r.map(x=>x[0]),['ta','ta','ta','ta']);r.forEach((x,j)=>assert(Math.abs(x[1]-(1+j*.025))<1e-8));
});
test('BREAK : protection des temps forts, B inverse et répète la vraie tranche',()=>{
 const e=env(),m=e.mod('break32');e.M.generer(m);for(let i=1;i<=32;i+=4)for(const k of ['n','r','v','p'])eq(m.variation.b[k+i],m.p[k+i]);
 Object.assign(m.variation.b,{n1:5,r1:4,v1:1,p1:100});e.M.choisir(m,1);e.tick(m,0);eq(e.buffers().length,4);assert(e.buffers()[0].buffer===e.b.EUR_BREAK32.banque().inverse[4]);
});
test('Paramètres globaux communs aux deux phrases et longueurs non détruites',()=>{
 const e=env(),m=e.mod('drum32');e.M.preparerB(m);e.M.editer(m,1);e.M.ecrire(m,'alen',5);eq(m.p.alen,5);eq(m.variation.b.alen,undefined);assert(Object.keys(m.variation.b).includes('a32'));
});
test('Deux instances gardent leurs banques et leurs files séparées',()=>{
 const e=env(),a=e.mod('drum32'),b=e.mod('drum32');e.M.preparerB(a);e.M.preparerB(b);e.b.S.run=true;e.tick(a,0);e.tick(b,0);e.M.fill(a);for(let i=1;i<=16;i++){e.tick(a,i);e.tick(b,i);}eq([a._rv.fill,b._rv.fill],[true,false]);
});
test('BREAK personnel : la génération conserve la référence et le découpage',()=>{
 const e=env(),m=e.mod('break32');m.breakSample={nb:8,ech:'boucle-test',coupes:Array.from({length:9},(_,i)=>i/8)};const source=JSON.stringify(m.breakSample);e.M.generer(m);eq(JSON.stringify(m.breakSample),source);
 for(let i=1;i<=32;i++)if((i-1)%4!==0&&((i-1)%16>=12)){assert(m.variation.b['n'+i]>=1&&m.variation.b['n'+i]<=8);}
});
test('BREAK personnel : B utilise la tranche demandée, non le break de secours',()=>{
 const e=env(),m=e.mod('break32');m.breakSample={nb:8};const buffer=e.ctx.createBuffer(1,44100,44100),demandes=[];
 e.b.EUR_BREAK_SAMPLES={tranche:(m,n,inv)=>{demandes.push([n,inv]);return {buffer,offset:.25,duree:.1};}};
 e.M.preparerB(m);Object.assign(m.variation.b,{n1:3,v1:1,r1:2});e.M.choisir(m,1);e.tick(m,0);eq(demandes,[[3,true]]);eq(e.buffers().length,2);assert(e.buffers()[0].buffer===buffer);eq(e.buffers()[0].offsetAudio,.25);
});
console.log(`VARIATIONS : ${tests} scénarios réussis, 0 erreur.`);
