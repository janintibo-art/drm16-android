/* v288 : ordonnancement et cycle de vie (nœuds simulés).
   La comparaison des vrais échantillons est dans test-stutter-live.py. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const R=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(R,'page/js/479-stutter-live.js'),'utf8');
let tests=0;
class Param {
 constructor(v=0){this.value=v;this.events=[];}
 setValueAtTime(v,t){this.events.push({type:'set',v,t});return this;}
 linearRampToValueAtTime(v,t){this.events.push({type:'linear',v,t});return this;}
 cancelScheduledValues(t){this.events=this.events.filter(e=>e.t<t);return this;}
 cancelAndHoldAtTime(t){this.cancelScheduledValues(t);return this;}
}
function env(sr=48000){
 const nodes=[];
 function node(kind){const n={kind,gain:new Param(1),offset:new Param(),delayTime:new Param(),connections:[],stopped:[],connect(x){this.connections.push(x);return x;},disconnect(){this.disconnected=true;},start(t=0){this.startAt=t;},stop(t=0){this.stopped.push(t);}};nodes.push(n);return n;}
 const ctx={sampleRate:sr,currentTime:0,state:'running',createGain(){return node('gain');},createDelay(){return node('delay');},createBufferSource(){return node('buffer');},createBuffer(c,n,sr){const a=Array.from({length:c},()=>new Float32Array(n));return {length:n,sampleRate:sr,getChannelData(i){return a[i];}}}};
 const b={ctx,Math,Set,Map,Number,Float32Array,console,EUR_CAT:{},EUR_ORDRE:[],dt:.125,EUR_STUTTER_UI:{rafraichir(){}},eurGain(v){const n=ctx.createGain();n.gain.value=v;return n;},eurConst(v){const n=node('constant');n.offset.value=v;n.start();return n;},stepDur(){return b.dt;},maintenantAudio(){return ctx.currentTime;}};
 vm.createContext(b);vm.runInContext(code,b);return {b,ctx,nodes,H:b.EUR_STUTTER,mod(p={}){const m={id:1,type:'stutterlive',p};m.io=b.EUR_CAT.stutterlive.creer(m);return m;}};
}
function eq(a,b){assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));}
function near(a,b,tol=1e-8){assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);}
function test(name,f){try{f();console.log('ok '+name);tests++;}catch(e){console.error('FAUX '+name);throw e;}}
test('catalogue : cinq paramètres et six prises uniques',()=>{const e=env(),m=e.mod(),d=e.b.EUR_CAT.stutterlive;eq(d.kns.length,5);eq(new Set(d.jacks.map(j=>j[0])).size,6);eq(Object.keys(m.io.e),['in','clk','trig','rel','rst']);eq(Object.keys(m.io.s),['out']);eq(e.b.EUR_ORDRE,['stutterlive']);});
test('normalisation des nombres invalides, entiers et bornes',()=>{const h=env().H;eq(h.valeurs({div:NaN,span:Infinity,mix:-2,auto:99,edge:0}),{div:2,span:4,mix:0,auto:3,edge:.5});eq(h.valeurs({div:1.8,span:7.6,auto:.4}).span,8);eq(h.valeurs({mix:'1'}).mix,1);});
test('longueurs calculées au sample près à trois fréquences',()=>{for(const sr of [44100,48000,96000])for(let div=0;div<5;div++){const h=env(sr).H,l=h.taille({div},sr,.125);near(l*sr,Math.round(.125*16/h.divisions[div]*sr));assert.ok(l>=256/sr&&l<=2);}});
test('longueur maximum bornée à deux secondes',()=>{const h=env().H;near(h.taille({div:0},48000,1.5),2);});
test('ligne interne compensée et délai externe d’un quantum',()=>{const e=env(),m=e.mod(),d=e.nodes.filter(n=>n.kind==='delay');eq(d.length,2);near(d[0].delayTime.value,128/48000);near(d[1].delayTime.value,.125-128/48000);});
test('repos : passage direct, écriture ouverte et boucle ouverte',()=>{const m=env().mod(),n=m.stutter.noeuds;eq(n.ecriture.gain.value,1);eq(n.feedback.gain.value,0);eq(n.etat.offset.value,0);assert.ok(!m.stutter.statut(0).actif);});
test('tampon de départ : capture refusée avant remplissage',()=>{const m=env().mod();assert.equal(m.stutter.capturer(.12,false),false);assert.equal(m.stutter.capturer(.125,false),true);});
test('capture limitée : durée au tempo et réarmement explicite',()=>{const m=env().mod({span:4});assert.ok(m.stutter.capturer(1,false));near(m.stutter.historique()[0].fin,1.5);assert.ok(m.stutter.statut(1.25).actif);assert.ok(!m.stutter.statut(1.5).pret);assert.ok(m.stutter.statut(1.625).pret);});
test('écriture et feedback sont exclusifs pendant capture',()=>{const m=env().mod();m.stutter.capturer(1,false);eq(m.stutter.noeuds.ecriture.gain.events,[{type:'set',v:0,t:1},{type:'set',v:1,t:1.5}]);eq(m.stutter.noeuds.feedback.gain.events,[{type:'set',v:1,t:1},{type:'set',v:0,t:1.5}]);});
test('doubles captures et recapture avant réarmement refusées',()=>{const m=env().mod();assert.ok(m.stutter.capturer(1,false));for(const t of [1,1.1,1.499,1.51,1.62])assert.equal(m.stutter.capturer(t,false),false);assert.ok(m.stutter.capturer(1.625,false));});
test('TENIR n’a pas de fin programmée avant relâchement',()=>{const e=env(),m=e.mod();assert.ok(m.stutter.capturer(1,true));assert.equal(m.stutter.statut(50).tenu,true);assert.equal(e.nodes.filter(n=>n.kind==='buffer')[0].stopped.length,0);m.stutter.relacher(2,false);near(m.stutter.historique()[0].fin,2);assert.ok(!m.stutter.statut(2.1).actif);});
test('libération conserve les réglages et le compteur',()=>{const m=env().mod({auto:2});m.recevoir(.4,'clk');const p=JSON.stringify(m.p),c=m.stutter.statut(.4).pas;m.stutter.capturer(1,true);m.stutter.relacher(2,false);eq(JSON.stringify(m.p),p);eq(m.stutter.statut(2).pas,c);});
test('RST réarme le compteur et refuse les notifications anciennes',()=>{const m=env().mod();m.recevoir(1,'clk');m.recevoir(1.1,'rst');m.recevoir(1,'clk');eq(m.stutter.statut(1.1).pas,-1);m.recevoir(1.1,'clk');eq(m.stutter.statut(1.1).pas,0);});
test('CLK doublé ou décroissant ignoré',()=>{const m=env().mod();m.recevoir(1,'clk');m.recevoir(1,'clk');m.recevoir(.9,'clk');eq(m.stutter.statut(1).pas,0);m.recevoir(1.1,'clk');eq(m.stutter.statut(1.1).pas,1);});
test('prise inconnue et dates non finies sans effet',()=>{const m=env().mod();for(const t of [-1,NaN,Infinity,'1'])m.recevoir(t,'trig');m.recevoir(1,'in');m.recevoir(1,'?');eq(m.stutter.historique(),[]);});
test('TRIG et LIBÉRER sont des commandes distinctes',()=>{const m=env().mod();m.recevoir(1,'trig');assert.ok(m.stutter.statut(1.1).actif);m.recevoir(1.2,'rel');assert.ok(!m.stutter.statut(1.3).actif);});
test('AUTO à la fin de 2, 4 ou 8 mesures',()=>{for(let auto=1;auto<=3;auto++){const e=env(),m=e.mod({auto,span:4}),period=e.H.periodes[auto]*16;for(let i=0;i<period*3;i++)m.recevoir(.2+i*.125,'clk');const hs=m.stutter.historique();assert.ok(hs.length>=1);near(hs.at(-1).t,.2+(3*period-4)*.125);eq(m.stutter.statut(100).captures,3);}});
test('AUTO OFF ne capture jamais tout seul',()=>{const m=env().mod();for(let i=0;i<256;i++)m.recevoir(.2+i*.125,'clk');eq(m.stutter.statut(100).captures,0);});
test('la durée choisie déplace le début du fill, pas sa fin',()=>{for(const span of [1,7,16]){const m=env().mod({auto:1,span});for(let i=0;i<32;i++)m.recevoir(.2+i*.125,'clk');const c=m.stutter.historique()[0];near(c.t,.2+(32-span)*.125);near(c.fin,.2+32*.125);}});
test('STOP annule une capture programmée dans le futur',()=>{const e=env(),m=e.mod();m.stutter.capturer(1,false);e.ctx.currentTime=.8;m.arreter();eq(m.stutter.historique(),[]);assert.ok(m.stutter.noeuds.feedback.gain.events.every(x=>x.v===0));assert.ok(e.nodes.filter(n=>n.kind==='buffer')[0].stopped.at(-1)<1);});
test('STOP au milieu de la rampe conserve sa valeur instantanée',()=>{const e=env(),m=e.mod();m.stutter.capturer(1,true);near(m.stutter.enveloppe(1.002),.5);e.ctx.currentTime=1.002;m.arreter();near(m.stutter.enveloppe(1.004),.25);near(m.stutter.enveloppe(1.008),0);});
test('solution de repli sans cancelAndHoldAtTime',()=>{const e=env(),m=e.mod();m.stutter.noeuds.etat.offset.cancelAndHoldAtTime=undefined;m.stutter.capturer(1,true);e.ctx.currentTime=1.002;m.arreter();const es=m.stutter.noeuds.etat.offset.events;assert.ok(es.some(x=>x.type==='linear'&&x.t===1.002&&Math.abs(x.v-.5)<1e-6));});
test('changement de longueur différé pendant TENIR',()=>{const e=env(),m=e.mod();m.stutter.capturer(1,true);e.ctx.currentTime=1.1;m.p.div=0;m.maj();near(m.stutter.statut(1.1).longueur,.125);eq(m.stutter.noeuds.retard.delayTime.events.length,0);m.stutter.relacher(2,false);near(m.stutter.statut(2).longueur,.5);assert.ok(!m.stutter.statut(2.49).pret);});
test('une capture future empêche de retoucher son délai',()=>{const e=env(),m=e.mod();m.stutter.capturer(1,false);e.ctx.currentTime=.95;m.p.div=0;m.maj();eq(m.stutter.noeuds.retard.delayTime.events.length,0);assert.equal(m.stutter.capturer(.96,true),false);});
test('changement de tempo appliqué après capture, pas en plein fragment',()=>{const e=env(),m=e.mod();m.stutter.capturer(1,true);e.ctx.currentTime=1.2;e.b.dt=.1;m.maj();near(m.stutter.statut(1.2).longueur,.125);m.stutter.relacher(2,false);near(m.stutter.statut(2).longueur,.1);});
test('DOSE immédiate ne supprime pas la fin automatique',()=>{const e=env(),m=e.mod();m.stutter.capturer(1,false);const a=JSON.stringify(m.stutter.noeuds.etat.offset.events);e.ctx.currentTime=1.2;m.p.mix=.3;m.maj();eq(JSON.stringify(m.stutter.noeuds.etat.offset.events),a);assert.ok(e.nodes.some(n=>n.gain.value===-.3));});
test('fenêtre de raccord dans 0..1, nulle aux deux bords',()=>{const e=env(),m=e.mod({edge:5});m.stutter.capturer(1,false);const b=e.nodes.find(n=>n.kind==='buffer').buffer,a=b.getChannelData(0);eq(a[0],0);eq(a.at(-1),0);assert.ok(a.every(x=>x>=0&&x<=1));eq(Math.max(...a),1);});
test('deux instances et leur JSON restent indépendants',()=>{const e=env(),a=e.mod({div:0}),b=e.mod({div:4});a.stutter.capturer(1,true);assert.ok(!b.stutter.statut(2).actif);const p=JSON.parse(JSON.stringify(a.p)),c=e.mod(p);eq(c.p,a.p);eq(c.stutter.historique(),[]);});
test('destruction brise la boucle et rend toutes les anciennes commandes inertes',()=>{const e=env(),m=e.mod();m.stutter.capturer(1,true);m.io.detruire();assert.ok(m.stutter.noeuds.feedback.disconnected);assert.equal(m.stutter.sources(),0);assert.equal(m.stutter.capturer(2,true),false);m.recevoir(3,'clk');m.arreter();m.maj();assert.ok(m.stutter.statut(3).ferme);m.io.detruire();});
test('historiques nettoyés pendant un long rendu hors ligne',()=>{const e=env(),m=e.mod();e.ctx.startRendering=()=>{};for(let i=0;i<1000;i++)m.stutter.capturer(1+i,false);assert.ok(m.stutter.historique().length<=5);eq(m.stutter.statut(2000).captures,1000);});
console.log(`STUTTER LIVE : ${tests} scénarios, aucun échec.`);
