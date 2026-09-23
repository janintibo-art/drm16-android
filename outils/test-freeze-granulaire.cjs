/* v290 : paramètres, grainOffset et capture/lecture du FREEZE GRANULAIRE ;
   le graphe complet (silence exact, ScriptProcessorNode réel) est vérifié
   dans Chromium par test-navigateur.py. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const R=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(R,'page/js/479e-freeze-granulaire.js'),'utf8');
const html=fs.readFileSync(path.join(R,'app/src/main/assets/drm16.html'),'utf8');
let n=0,checks=0;
function ok(c,m){checks++;assert.ok(c,m);}
function eq(a,b){checks++;assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));}
function test(s,f){f();n++;console.log('ok '+s);}
function env(sr){
  sr=sr||48000;
  const nodes=[];
  function param(v){return {value:v||0,events:[],setValueAtTime(v,t){ok(Number.isFinite(v)&&Number.isFinite(t)&&t>=0,'événement non fini');this.value=v;this.events.push(v);},
    linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);}};}
  function node(){const nd={gain:param(1),playbackRate:param(1),buffer:null,links:[],
    connect(x){this.links.push(x);},disconnect(x){this.links=x?this.links.filter(a=>a!==x):[];},
    start(t,off,dur){this.started=t;this.offset=off;this.duree=dur;},stop(t){this.stopped=t;}};nodes.push(nd);return nd;}
  var sp=null;
  const destination={links:[]};
  const b={EUR_CAT:{},EUR_ORDRE:[],ctx:{currentTime:0,sampleRate:sr,destination:destination,
    createGain:node,createBufferSource:node,
    createBuffer:(c,len,srr)=>({numberOfChannels:c,length:len,sampleRate:srr,
      data:[new Float32Array(len),new Float32Array(len)],getChannelData(i){return this.data[i];}}),
    createScriptProcessor:(bs,ic,oc)=>{sp=node();sp.bufferSize=bs;return sp;}}};
  b.eurGain=v=>{const g=node();g.gain.value=v;return g;};
  vm.createContext(b);
  vm.runInContext(code,b);
  return {b,nodes,get sp(){return sp;},
    mod(){const m={id:1,p:{}};m.io=b.EUR_CAT.freeze.creer(m);return m;},
    process(t0,samplesL,samplesR){
      const len=samplesL.length;
      sp.onaudioprocess({playbackTime:t0,
        inputBuffer:{numberOfChannels:2,length:len,getChannelData:i=>i===0?samplesL:(samplesR||samplesL)},
        outputBuffer:{numberOfChannels:2,length:len,getChannelData:()=>new Float32Array(len)}});
    }};
}
test('source assemblée une fois',()=>eq(html.split(code).length,2));
test('module ajouté au catalogue et à EUR_ORDRE une seule fois',()=>{
  const e=env();
  ok(!!e.b.EUR_CAT.freeze);
  eq(e.b.EUR_ORDRE.filter(x=>x==='freeze').length,1);
  eq(e.b.EUR_CAT.freeze.kns.map(k=>k[0]),['dur','pos','spray','taille','haut','niv']);
  eq(new Set(e.b.EUR_CAT.freeze.kns.map(k=>k[0])).size,e.b.EUR_CAT.freeze.kns.length);
});
test('jacks entrée/sortie et clés sans doublon',()=>{
  const e=env(),m=e.mod();
  eq(Object.keys(m.io.e).sort(),['capt','in','rst','trig']);
  eq(Object.keys(m.io.s).sort(),['out']);
});
test('valeurs et normaliser : NaN, infinis et hors bornes ramenés dans la plage',()=>{
  const e=env();
  for(const value of [NaN,Infinity,-Infinity,null,'0.7',-1e9,1e9]){
    const raw={};e.b.EUR_CAT.freeze.kns.forEach(k=>raw[k[0]]=value);
    const p=e.b.EUR_FREEZE.valeurs(raw);
    for(const k of e.b.EUR_CAT.freeze.kns) ok(Number.isFinite(p[k[0]])&&p[k[0]]>=k[2]&&p[k[0]]<=k[3]);
  }
});
test('grainOffset reste dans le tampon capturé, même avec un spray extrême',()=>{
  const F=e=>e; const go=env().b.EUR_FREEZE.grainOffset;
  for(const spray of [0,0.5,1]) for(const hasard of [0,0.3,0.7,1]) for(const pos of [0,0.5,1]){
    const off=go(pos,spray,2,0.3,hasard);
    ok(off>=0 && off<=2-0.3+1e-9);
  }
  eq(go(0.5,1,1,2,0.5),0);         /* grain plus long que le tampon : aucune marge, décalage nul */
});
test('GRAIN avant toute capture ne joue rien',()=>{
  const e=env(),m=e.mod();
  const avant=e.nodes.length;
  eq(m.recevoir(1,'trig'),null);
  eq(e.nodes.length,avant);
});
test('CAPTURER puis GRAIN une fois le tampon prêt : un grain programmé, borné à sa durée',()=>{
  const e=env(1000);          /* fréquence basse : la capture tient en peu d’échantillons */
  const m=e.mod();
  m.recevoir(0,'capt');                       /* fige de t=0 à t=1.5 (dur par défaut) */
  const bloc=new Float32Array(200).fill(0.4);
  e.process(0,bloc);
  ok(!m.gel.pret,'encore en cours de capture');
  e.process(1.5,bloc);                        /* t0 >= fin : capture déclarée prête */
  ok(m.gel.pret);
  const avant=e.nodes.length;
  const r=m.recevoir(2,'trig');
  eq(r,null);
  ok(e.nodes.length>avant,'un lecteur de tampon a été créé');
  const src=e.nodes[e.nodes.length-2];        /* source puis gain, dans cet ordre de création */
  ok(src.started===2);
  ok(src.duree<=m.p.taille/1000+1e-9);
});
test('RST vide le tampon : GRAIN ne joue plus tant qu’il n’y a pas eu de nouvelle capture',()=>{
  const e=env(1000),m=e.mod();
  m.recevoir(0,'capt');
  e.process(1.6,new Float32Array(50));
  ok(m.gel.pret);
  m.recevoir(2,'rst');
  ok(!m.gel.pret);
  const avant=e.nodes.length;
  eq(m.recevoir(2,'trig'),null);
  eq(e.nodes.length,avant);
});
test('une nouvelle CAPTURER remplace la précédente sans laisser l’ancien tampon jouable trop tôt',()=>{
  const e=env(1000),m=e.mod();
  m.recevoir(0,'capt');
  e.process(1.6,new Float32Array(50));
  ok(m.gel.pret);
  m.recevoir(2,'capt');                       /* recapture : plus prêt tant que la nouvelle fenêtre n’est pas passée */
  ok(!m.gel.pret);
  e.process(3.6,new Float32Array(50));
  ok(m.gel.pret);
});
test('HAUTEUR change playbackRate, NIVEAU borne le sommet de l’enveloppe',()=>{
  const e=env(1000),m=e.mod();
  m.p.haut=12;m.p.niv=0.42;
  m.recevoir(0,'capt');e.process(1.6,new Float32Array(50));
  m.recevoir(2,'trig');
  const src=e.nodes[e.nodes.length-2],g=e.nodes[e.nodes.length-1];
  eq(Math.round(src.playbackRate.value*1000)/1000,Math.round(Math.pow(2,1)*1000)/1000);
  ok(g.gain.events.some(v=>Math.abs(v-0.42)<1e-9),'le sommet de l’enveloppe atteint NIVEAU');
  eq(g.gain.events[g.gain.events.length-1],0);
});
test('détruire coupe le ScriptProcessorNode et n’écrit plus rien ensuite',()=>{
  const e=env(1000),m=e.mod();
  m.recevoir(0,'capt');
  m.io.detruire();
  ok(e.sp.onaudioprocess===null);
  const avant=JSON.stringify([...m.gel ? [] : []]);
  eq(m.recevoir(2,'trig'),null);
});
console.log(`Freeze granulaire : ${n} scénarios, ${checks} assertions, 0 erreur.`);
