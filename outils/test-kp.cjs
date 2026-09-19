// Kaoss Pad : comportement des quatre banques et durée de vie des voix.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
function element(tag='div') {
  const classes = new Set(), selectors = {};
  const el={tagName:tag,childNodes:[],listeners:{},style:{},textContent:'',attrs:{},
    classList:{toggle(k,v){v ? classes.add(k) : classes.delete(k);},contains(k){return classes.has(k);},
      add(k){classes.add(k);},remove(k){classes.delete(k);}},
    addEventListener(k,f){this.listeners[k]=f;},appendChild(n){this.childNodes.push(n);},
    setAttribute(k,v){this.attrs[k]=v;},querySelector(k){return selectors[k]||(selectors[k]=element(k));}};
  Object.defineProperty(el,'innerHTML',{get(){return this.html||'';},set(v){this.html=v;this.childNodes.length=0;}});
  Object.defineProperty(el,'options',{get(){return this.childNodes;}});
  return el;
}
function param(value=0) { return {value,cancelAndHoldAtTime(){},cancelScheduledValues(){},
  setTargetAtTime(v){this.value=v;}}; }
class Node {
  constructor(context) { this.context=context; this.connections=[]; this.disconnected=0; this.stops=0;
    for(const k of ['gain','playbackRate','frequency','Q','delayTime']) this[k]=param(); }
  connect(n) { this.connections.push(n); }
  disconnect() { this.disconnected++; }
  start() {
    if(this.context&&this.context.trackSource) this.context.trackSource(this);
    if(this.failStart) throw Error('start refusé');
    this.started=true;
  }
  stop() { this.stops++; }
}
class Context {
  constructor() { this.currentTime=1; this.sampleRate=1000; this.nodes=[]; }
  node() { const n = new Node(this); this.nodes.push(n); return n; }
  createBufferSource() { const n=this.node(); n.failStart=this.failStart; this.failStart=false; return n; }
  createBiquadFilter() { return this.node(); }
  createWaveShaper() { return this.node(); }
  createDelay() { return this.node(); }
  createConvolver() { return this.node(); }
  createOscillator() { return this.node(); }
  createBuffer(ch,n,sr) {
    assert(n>0&&Number.isInteger(n));
    const data=Array.from({length:ch},()=>new Float32Array(n));
    return {length:n,numberOfChannels:ch,sampleRate:sr,duration:n/sr,getChannelData(k){return data[k];},
      copyFromChannel(target,k,start){target.set(data[k].subarray(start,start+target.length));}};
  }
}
function setup(saved) {
  const el={}, c={saved,PROJET_EN_COURS:false,ctx:new Context(),master:new Node(),KP:null,memoire:{},S:{modele:'kp',run:false,bpm:120},cache:false,queue:[],
    audioCalls:0,saveCalls:0,tempoSaves:0,fitCalls:0,signals:[],H:{inter(){},cran(){},start(){}},
    now:0,performance:{now(){return c.now;}},MIDI:{sync:false},kTempo:{set(v){c.knobBpm=v;}},
    saveSoon(){c.tempoSaves++;},
    bibLire(){},
    audioInit(){c.audioCalls++; if(!c.ctx&&!c.audioUnavailable)c.ctx=new Context();},
    banqueEs(){},chargerEchs(){},busSet(){return null;},eurGain(v){const n=c.ctx.node();n.gain.value=v;return n;},
    ES:{buf:Object.fromEntries(Array.from({length:24},(_,i)=>['b'+i,{duration:.1}]))},
    ES_BANQUE:Array.from({length:24},(_,i)=>'son '+i),nomEch(e){return 'son '+e.slice(1);},
    memLire(){return c.saved;},sauverMachine(){},signal(s){c.signals.push(s);},
    poserMachine(){},fit(){c.fitCalls++;},save(){c.saveCalls++;},
    stop(){c.S.run=false;if(c.MACHINE)c.MACHINE.arret();},start(){c.S.run=true;},
    debrancherTout(o){for(const k in o)if(o[k] instanceof Node){o[k].disconnect();o[k].stop();}},
    window:{addEventListener(){}},
    document:{addEventListener(){},getElementById(id){return el[id]||(el[id]=element());},createElement:element}};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../page/js/570-korg-kaoss-pad.js'),'utf8'),c);
  const ui=fs.readFileSync(path.join(__dirname,'../page/js/590-smpltrek-dix-pistes.js'),'utf8');
  vm.runInContext(ui.slice(ui.indexOf('/* ---------- la façade du KAOSS PAD'),ui.indexOf('/* ---------- la façade de la MC-101')),c);
  c.majKp();
  return {c,el,click(id){el[id].listeners.click.call(el[id]);},pad(k){el['kp-banques'].childNodes[k].listeners.click();}};
}
const {c,el,click,pad}=setup();
// STOP global doit libérer les banques LOOP de KAOSS même si la façade
// principale est une autre machine, ainsi que sa prise RESAMPLE éventuelle.
for(const principale of [false,true]){
  const f=setup(),k=f.c;k.S.run=true;k.SET={on:true,actives:{kp:true}};
  let arretsKaoss=0,arretsPrincipale=0,arretsPrise=0,arretsPiste=0;
  k.MACHINE_KP.arret=()=>{arretsKaoss++;k.arretKp();};
  k.MACHINE=principale?k.MACHINE_KP:{arret(){arretsPrincipale++;}};
  f.pad(0);const boucle=k.KP.sources[0],gain=boucle.connections[0],graphe=k.KP.noeuds;
  const mr={state:'recording',onstop(){},ondataavailable(){},onerror(){},stop(){arretsPrise++;}};
  k.KP.prise={ctx:k.ctx,phase:'enregistrement',morceaux:[],mr,
    destination:{stream:{getTracks(){return [{stop(){arretsPiste++;}}];}},disconnect(){}}};
  Object.assign(k,{timer:1,AUDIT:{tDernier:1},clearInterval(){},clearTimeout(){},
    couperSourcesFutures(){},midiSilence(){},host(){},midiHorloge(){}});
  const transport=fs.readFileSync(path.join(__dirname,'../page/js/130-decalage-humain.js'),'utf8');
  vm.runInContext(transport.slice(transport.indexOf('function stop(){')),k);k.stop();
  assert(!k.S.run);assert.equal(arretsKaoss,1,'un seul arrêt Kaoss par STOP');
  assert.equal(arretsPrincipale,principale?0:1);
  assert.equal(boucle.stops,1);assert.equal(boucle.disconnected,1);assert.equal(gain.disconnected,1);
  assert(k.KP.sources.every(s=>s===null));assert(k.KP.banques.every(b=>!b.on));assert(graphe.e.disconnected);
  assert.equal(k.KP.prise,null);assert.equal(arretsPrise,1);assert.equal(arretsPiste,1);
  assert.equal(mr.onstop,null);assert.equal(mr.ondataavailable,null);assert.equal(mr.onerror,null);
}
// v176 : chaque sortie normale de capture conserve les points effectivement
// enregistrés, même sans un second toucher sur MOTION.
for(const fin of ['limite','rejouer','stop','motion']){
  const f=setup({motion:[[.1,.2]]}),k=f.c;k.activerKp();
  let ecritures=0;k.sauverMachine=()=>ecritures++;
  f.click('kp-motion');k.KP.x=.8;k.KP.y=.9;
  const nombre=fin==='limite'?256:3;
  for(let i=0;i<nombre;i++)k.scheduleKp(i%16,i*.125);
  if(fin==='rejouer')f.click('kp-rejoue');
  if(fin==='stop')k.stop();
  if(fin==='motion')f.click('kp-motion');
  assert(!k.KP.enregistre,fin+' termine la capture');
  assert.equal(ecritures,1,fin+' écrit le geste une fois');
  const sauve=JSON.parse(JSON.stringify(k.memoire.kp));
  assert.equal(sauve.motion.length,nombre);
  assert.deepStrictEqual(sauve.motion,Array.from({length:nombre},()=>[.8,.9]));
  k.KP.motion[0][0]=.01;assert.equal(k.memoire.kp.motion[0][0],.8,'mémoire sans alias');
  const reprise=setup(sauve);reprise.c.activerKp();
  assert.equal(reprise.c.KP.motion.length,nombre);assert.equal(reprise.c.KP.motion[0][0],.8);
  reprise.c.KP.motion[0][0]=.1;assert.equal(sauve.motion[0][0],.8,'lecture sans alias');
}
// Effacer une relecture (ou commencer un nouveau geste) remet réellement
// l'effet au repos lorsque ni HOLD ni le doigt ne le maintiennent.
for(const action of ['kp-effacer','kp-motion']){
  const f=setup({motion:[[.1,.2]]}),k=f.c;k.activerKp();
  k.KP.rejoue=true;k.scheduleKp(0,1);
  assert(k.KP.noeuds.f.frequency.value<200,'ancien geste audible');
  f.click(action);assert.equal(k.KP.noeuds.f.frequency.value,20000);
  assert(!k.KP.rejoue);assert.equal(k.KP.motion.length,0);
}
// Les gestes issus d'une mémoire partielle restent bornés et indépendants.
{
  const mauvais=[null,{},'xy',[null],[[NaN,.2],[.1,Infinity],[.1],['.1',.2]],[]];
  for(const motion of mauvais){
    const f=setup({motion}),k=f.c;k.KP.motion=[[.9,.9]];k.KP.rejoue=true;
    k.activerKp();assert.equal(k.KP.motion.length,0);assert(!k.KP.rejoue);
  }
  const f=setup({motion:[[2,-1],[.3,.4],null,...Array.from({length:300},()=>[.5,.6])]}),k=f.c;
  k.activerKp();assert(k.KP.motion.length<=256);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(k.KP.motion.slice(0,2))),[[1,0],[.3,.4]]);
  k.KP.rejoue=true;for(let i=0;i<512;i++)k.scheduleKp(i%16,i*.125);
  assert(Number.isFinite(k.KP.x)&&Number.isFinite(k.KP.y));
}
// Ancien comportement LOOP, banques indépendantes et arrêt sans réveil audio.
pad(0);const a=c.KP.sources[0],ag=a.connections[0];assert(a.loop&&a.started&&c.KP.banques[0].on);
pad(1);const b=c.KP.sources[1];pad(0);
assert.equal(c.KP.sources[0],null);assert.equal(c.KP.sources[1],b);assert.equal(a.stops,1);
assert.equal(a.disconnected,1);assert.equal(ag.disconnected,1);
a.onended();assert.equal(a.disconnected,1);assert(c.KP.banques[1].on);
// Sélection silencieuse, mode sur la seule banque choisie ; relance active.
const calls=c.audioCalls;click('kp-selection');assert.equal(c.KP.sel,1);assert.equal(c.audioCalls,calls);
assert.equal(c.KP.sources[1],b);click('kp-mode');const one=c.KP.sources[1];
assert(!one.loop&&one!==b);assert.equal(c.KP.banques[0].mode,'loop');assert.equal(c.KP.banques[1].mode,'one');
b.onended();assert.equal(c.KP.sources[1],one);assert(c.KP.banques[1].on);
pad(1);const retrigger=c.KP.sources[1];assert(retrigger!==one&&!retrigger.loop);
assert.equal(one.stops,1);one.onended();assert.equal(c.KP.sources[1],retrigger);
assert(el['kp-banques'].childNodes[1].classList.contains('on'));
// Fin naturelle : source/gain libérés et voyant éteint, sans changer les autres.
pad(2);const other=c.KP.sources[2],rg=retrigger.connections[0];retrigger.onended();
assert.equal(c.KP.sources[1],null);assert(!c.KP.banques[1].on);assert.equal(retrigger.disconnected,1);
assert.equal(rg.disconnected,1);assert(!el['kp-banques'].childNodes[1].classList.contains('on'));
assert.equal(c.KP.sources[2],other);assert.equal(el['kp-banques'].childNodes[1].attrs['aria-pressed'],'false');
// VITESSE garde son effet sur les ONE SHOT et les nouvelles frappes.
c.vitesseKp(.5,.02);pad(1);assert.equal(c.KP.sources[1].playbackRate.value,.5);
c.vitesseKp(1.7,.02);assert.equal(c.KP.sources[1].playbackRate.value,1.7);
assert.equal(other.playbackRate.value,1.7);
// SON conserve le mode et relance ; changer de mode pendant le son repart au début.
const before=c.KP.sources[1];click('kp-son');const changed=c.KP.sources[1];
assert(changed!==before&&!changed.loop);assert.equal(before.stops,1);
assert.equal(c.KP.banques[1].ech,'b4');click('kp-mode');assert(c.KP.sources[1].loop);
changed.onended();assert(c.KP.banques[1].on);
// STOP choisi conserve l'autre banque, STOP TOUT ne coupe pas le transport.
c.S.run=true;click('kp-stop-banque');assert.equal(c.KP.sources[1],null);assert.equal(c.KP.sources[2],other);
click('kp-stop-tout');assert(c.KP.sources.every(x=>x===null));assert(c.S.run);
assert(c.KP.banques.every(x=>!x.on));
// Pas d'allumage fantôme : son absent, démarrage refusé, audio indisponible.
c.KP.banques[0].ech='absent';pad(0);assert(!c.KP.banques[0].on);assert.equal(c.KP.sources[0],null);
c.KP.banques[0].ech='b0';c.ctx.failStart=true;pad(0);
assert.equal(c.KP.sources[0],null);assert(!c.KP.banques[0].on);
const failed=c.ctx.nodes[c.ctx.nodes.length-2],fg=c.ctx.nodes[c.ctx.nodes.length-1];
assert.equal(failed.disconnected,1);assert.equal(fg.disconnected,1);
const prevCalls=c.audioCalls;c.ctx=null;c.arretKp();click('kp-stop-tout');assert.equal(c.audioCalls,prevCalls);
c.audioUnavailable=true;pad(0);assert.equal(c.ctx,null);assert(!c.KP.banques[0].on);
// Sauvegarde des sons/modes/sélection, jamais de source ni d'état en marche.
c.audioUnavailable=false;c.KP.sel=3;c.modeBanqueKp(0,'one');c.modeBanqueKp(3,'one');pad(3);c.memKp();
const saved=JSON.parse(JSON.stringify(c.memoire.kp));
assert.deepStrictEqual(Object.keys(saved.banques[3]).sort(),['ech','mode','slice','tranche']);
const reopened=setup(saved);reopened.c.activerKp();
assert.equal(reopened.c.KP.sel,3);assert.equal(reopened.c.KP.banques[3].mode,'one');
assert.equal(reopened.c.KP.banques[1].ech,'b4');assert.equal(reopened.c.S.modele,'kp');
assert.equal(reopened.c.saveCalls,1);assert(reopened.c.KP.banques.every(x=>!x.on));
assert.equal(reopened.el['kp-mode'].textContent,'ONE SHOT');
// Migration d'une mémoire ancienne, partielle ou mal formée, sans héritage d'un ancien mode.
for(const legacy of [{banques:[{ech:'b8'}]}, {banques:[null,{mode:'inconnu'}]}, {banques:{}}, undefined]){
  reopened.c.KP.banques.forEach(b=>b.mode='one');reopened.c.saved=legacy;reopened.c.chargerKp();
  assert(reopened.c.KP.banques.every(b=>b.mode==='loop'));
}
// Un nouveau contexte libère l'ancien graphe ET les voix, sans fin tardive parasite.
c.arretKp();pad(0);pad(1);const old=c.KP.sources.slice(),graph=c.KP.noeuds;
c.ctx=new Context();pad(2);const current=c.KP.sources[2];
assert.equal(c.KP.sources[0],null);assert.equal(c.KP.sources[1],null);assert(c.KP.banques[2].on);
assert(graph.e.disconnected);old.filter(Boolean).forEach(s=>{assert(s.disconnected);s.onended();});
assert.equal(c.KP.sources[2],current);assert(current.context===c.ctx);
// Réouverture de la façade : arrêt effectif, commandes et voyants cohérents.
c.MACHINE=c.MACHINE_KP;c.saved=saved;c.activerKp();assert.equal(current.stops,1);
assert(c.KP.banques.every(x=>!x.on));assert(c.KP.sources.every(x=>x===null));
assert(!el['kp-banques'].childNodes[2].classList.contains('on'));
console.log('Kaoss : LOOP/ONE SHOT, relances, fin naturelle, voyants, sélection silencieuse, STOP, vitesse, échecs audio, mémoire et changement de contexte OK.');

// TAP au timestamp zéro, cadence irrégulière, puis nouvelle cadence : seuls
// les quatre derniers intervalles comptent, sans réinitialiser la lecture.
const tempo=setup(), tc=tempo.c;
tempo.pad(0);tc.vitesseKp(.7,.02);tc.S.run=true;tc.KP.rejoue=true;tc.KP.mpos=3;
const playing=tc.KP.sources[0],audioCalls=tc.audioCalls;
function tapAt(t){tc.now=t;tempo.click('kp-tap');}
tapAt(0);assert.equal(tc.tempoSaves,0);assert.equal(tc.KP.taps.length,1);
[500,1000,1520,2000].forEach(tapAt);assert.equal(tc.S.bpm,120);
[2400,2800,3200,3600].forEach(tapAt);assert.equal(tc.S.bpm,150);
assert.equal(tc.KP.taps.length,5);assert.equal(tc.knobBpm,150);
assert.equal(tempo.el['kp-tempo'].textContent,'150 BPM');
assert.equal(tc.KP.sources[0],playing);assert.equal(playing.stops,0);
assert.equal(playing.playbackRate.value,.7);assert.equal(tc.audioCalls,audioCalls);
assert(tc.S.run&&tc.KP.rejoue);assert.equal(tc.KP.mpos,3);
const seq=fs.readFileSync(path.join(__dirname,'../page/js/120-sequenceur.js'),'utf8');
vm.runInContext(seq.match(/function stepDur\(\)\{[^\n]+/)[0],tc);
assert.equal(tc.stepDur(),.1); // 150 BPM => dixième de seconde par double croche.

// Rebond ignoré sans déplacer le dernier tap, pause et intervalle invalide
// repartent d'une frappe propre, et ne changent pas le tempo à eux seuls.
tc.KP.taps=[];tapAt(0);tapAt(30);assert.equal(tc.KP.taps.length,1);
tapAt(500);assert.equal(tc.S.bpm,120);
const savesBeforePause=tc.tempoSaves;tapAt(4000);
assert.equal(tc.KP.taps.length,1);assert.equal(tc.tempoSaves,savesBeforePause);
tapAt(4400);assert.equal(tc.S.bpm,150);
tc.KP.taps=[];tapAt(0);tapAt(200);assert.equal(tc.KP.taps.length,1);
assert.equal(tc.S.bpm,150);tapAt(800);assert.equal(tc.S.bpm,100);
tapAt(2500);assert.equal(tc.S.bpm,100);assert.equal(tc.KP.taps.length,1);
tapAt(3000);assert.equal(tc.S.bpm,120);
tapAt(2000);assert.equal(tc.KP.taps.length,1);tapAt(2500);assert.equal(tc.S.bpm,120);
for(const bpm of [40,220]){
  tc.KP.taps=[];tapAt(0);tapAt(60000/bpm);assert.equal(tc.S.bpm,bpm);
}
tempo.click('kp-tempo-plus');assert.equal(tc.S.bpm,220);assert.equal(tc.KP.taps.length,0);
tempo.click('kp-tempo-moins');assert.equal(tc.S.bpm,219);
tc.reglerTempoKp(40);tempo.click('kp-tempo-moins');assert.equal(tc.S.bpm,40);
assert(!tc.reglerTempoKp(NaN));assert(!tc.reglerTempoKp(Infinity));assert.equal(tc.S.bpm,40);
tc.ctx=null;tc.KP.taps=[];tapAt(0);tapAt(600);assert.equal(tc.S.bpm,100);
assert.equal(tc.ctx,null);assert.equal(tc.audioCalls,audioCalls);

// Véritables points d'entrée MIDI : changement de synchronisation, réception
// à l'arrêt et démarrage de page avant que KP soit initialisé.
const midi=fs.readFileSync(path.join(__dirname,'../page/js/310-midi.js'),'utf8');
vm.runInContext(midi.slice(midi.indexOf('function ticExterne(){'),midi.indexOf('function departEsclave(')),tc);
vm.runInContext(midi.slice(midi.indexOf('function majMidiUI(){'),midi.indexOf('/* ---- appareils MIDI')),tc);
for(const id of ['bOut','bIn','bClk','bCh','bChSy','bBase','bSync']) tc[id]=element();
tc.boxMidi={querySelectorAll(){return [];}};tc.nomNote=()=> 'DO';tc.S.modele='kp';
tc.MIDI.sync=true;tc.majMidiUI();
assert.equal(tc.KP.taps.length,0);assert.equal(tempo.el['kp-tempo'].textContent,'100 BPM · MIDI');
for(const id of ['kp-tap','kp-tempo-moins','kp-tempo-plus']) assert(tempo.el[id].disabled);
const lockedSaves=tc.tempoSaves;
tapAt(5000);tempo.click('kp-tempo-plus');tc.reglerTempoKp(180);
assert.equal(tc.S.bpm,100);assert.equal(tc.tempoSaves,lockedSaves);assert.equal(tc.KP.taps.length,0);
tc.S.run=false;
for(const bpm of [30,260]){
  tc.SYNC={dernier:100,bpmEst:bpm,ticks:0};tc.now=100+60000/bpm/24;tc.ticExterne();
  assert.equal(tc.S.bpm,bpm);assert.equal(tempo.el['kp-tempo'].textContent,bpm+' BPM · MIDI');
}
const kpState=tc.KP;tc.KP=undefined;assert.doesNotThrow(()=>tc.majMidiUI());tc.KP=kpState;
tc.MIDI.sync=false;tc.majMidiUI();assert.equal(tempo.el['kp-tempo'].textContent,'260 BPM');
for(const id of ['kp-tap','kp-tempo-moins','kp-tempo-plus']) assert(!tempo.el[id].disabled);
tapAt(6000);assert.equal(tc.S.bpm,260);tapAt(6500);assert.equal(tc.S.bpm,120);
tc.S.bpm=140;tc.beatKp(4);assert.equal(tempo.el['kp-tempo'].textContent,'140 BPM');
tc.activerKp();assert.equal(tc.KP.taps.length,0);

// Sauvegarde réelle du tempo GLOBAL et restauration au rechargement : les
// frappes intermédiaires ne sont jamais écrites dans la mémoire du Kaoss.
const storage=new Map(),memorySource=fs.readFileSync(path.join(__dirname,'../page/js/030-memoire.js'),'utf8');
function connectMemory(target){
  const c=target.c;c.HUM={};c.WAVX={};c.MIDI={sync:false};c.H={cran(){},inter(){},start(){}};
  c.localStorage={getItem(k){return storage.get(k);},setItem(k,v){storage.set(k,v);}};
  c.document.querySelectorAll=()=>[{dataset:{m:'kp'}}];c.setTimeout=()=>0;c.clearTimeout=()=>{};
  vm.runInContext(memorySource,c);
}
const persisted=setup();connectMemory(persisted);persisted.c.S.modele='kp';
persisted.c.now=0;persisted.click('kp-tap');persisted.c.now=400;persisted.click('kp-tap');
persisted.c.memKp();persisted.c.writeMem();
assert.equal(JSON.parse(storage.get('drm.reglages')).bpm,150);
assert(!Object.hasOwn(persisted.c.memoire.kp,'taps'));
const restored=setup();connectMemory(restored);restored.c.activerKp();
assert.equal(restored.c.S.bpm,150);assert.equal(restored.el['kp-tempo'].textContent,'150 BPM');
assert.equal(restored.c.KP.taps.length,0);
console.log('Kaoss tempo : TAP moyenné, rebonds, pauses, bornes, ±1 BPM, transport et voix conservés, MIDI et mémoire globale OK.');

// SLICE : huit régions contiguës, y compris la dernière frame d'une longueur
// non divisible par huit, tous les canaux et le taux d'origine conservés.
const sliced=setup(),sc=sliced.c;
function fixture(length=8195,channels=2,rate=32000){
  const buf=sc.ctx.createBuffer(channels,length,rate);
  for(let ch=0;ch<channels;ch++) for(let i=0;i<length;i++) buf.getChannelData(ch)[i]=(ch+1)*.1+i/100000;
  return buf;
}
const original=fixture(),unchanged=Array.from({length:2},(_,k)=>Array.from(original.getChannelData(k)));
sc.ES.buf.b0=original;
assert(sliced.el['kp-tranches'].hidden);const noAudio=sc.audioCalls;
sliced.click('kp-slice');assert(!sliced.el['kp-tranches'].hidden);assert.equal(sc.audioCalls,noAudio);
assert.equal(sc.KP.sources[0],null);assert.equal(sliced.el['kp-tranches'].childNodes.length,8);
const hitSlice=i=>sliced.el['kp-tranches'].childNodes[i].listeners.click();
let previousEnd=0;
for(let i=0;i<8;i++){
  hitSlice(i);const src=sc.KP.sources[0],buf=src.buffer;
  const begin=Math.floor(i*original.length/8),end=Math.floor((i+1)*original.length/8);
  assert.equal(begin,previousEnd);previousEnd=end;
  assert(src.loop&&src.started);assert.equal(buf.length,end-begin);
  assert.equal(buf.numberOfChannels,2);assert.equal(buf.sampleRate,32000);
  const fade=32;
  for(let ch=0;ch<2;ch++){
    const data=buf.getChannelData(ch);
    assert.equal(data[0],0);assert.equal(data[data.length-1],0);
    for(let j=fade;j<data.length-fade;j++) assert.equal(data[j],original.getChannelData(ch)[begin+j]);
    assert(data[15]>0&&data[15]<original.getChannelData(ch)[begin+15]);
  }
  assert(sliced.el['kp-tranches'].childNodes[i].classList.contains('on'));
  assert.equal(sliced.el['kp-tranche-etat'].textContent,'BANQUE A · TRANCHE '+(i+1)+'/8');
  assert(sliced.el['kp-banques'].childNodes[0].attrs['aria-label'].includes('tranche '+(i+1)+'/8'));
}
assert.equal(previousEnd,original.length);
for(let ch=0;ch<2;ch++) assert.deepStrictEqual(Array.from(original.getChannelData(ch)),unchanged[ch]);
// Relance rapide en LOOP, voix remplacée mais tampon réutilisé. Une édition
// NORMALIZE de l'original en place doit être audible à la frappe suivante.
const oldSlice=sc.KP.sources[0],cached=oldSlice.buffer;
hitSlice(7);const repeated=sc.KP.sources[0];assert(repeated!==oldSlice);
assert.equal(repeated.buffer,cached);assert.equal(oldSlice.stops,1);
oldSlice.onended();assert.equal(sc.KP.sources[0],repeated);assert(sc.KP.banques[0].on);
const start7=Math.floor(7*original.length/8);
original.getChannelData(1)[start7+100]=-.75;hitSlice(7);
assert.equal(sc.KP.sources[0].buffer,cached);assert.equal(cached.getChannelData(1)[100],-.75);
// ONE SHOT, vitesse variable, fin naturelle et STOP restent ceux de la banque.
sliced.click('kp-mode');const oneSlice=sc.KP.sources[0];assert(!oneSlice.loop);
sc.vitesseKp(.5,.01);assert.equal(oneSlice.playbackRate.value,.5);
hitSlice(6);const otherSlice=sc.KP.sources[0];assert(!otherSlice.loop&&otherSlice!==oneSlice);
assert.equal(otherSlice.playbackRate.value,.5);oneSlice.onended();assert(sc.KP.banques[0].on);
sc.vitesseKp(2,.01);assert.equal(otherSlice.playbackRate.value,2);
otherSlice.onended();assert.equal(sc.KP.sources[0],null);assert(!sc.KP.banques[0].on);
assert.equal(sc.KP.banques[0].tranche,6);assert(!sliced.el['kp-tranches'].hidden);
// Les autres banques continuent ; SLICE NON retrouve l'original en entier.
sliced.pad(1);const bankB=sc.KP.sources[1];sliced.click('kp-selection'); // banque C, silencieuse
assert.equal(sc.KP.sources[1],bankB);assert(sliced.el['kp-tranches'].hidden);
sc.KP.sel=0;sc.majKp();hitSlice(2);sliced.click('kp-slice');
assert.equal(sc.KP.sources[0].buffer,original);assert.equal(sc.KP.tranches[0],null);
assert.equal(sc.KP.sources[1],bankB);assert(sliced.el['kp-tranches'].hidden);
sliced.click('kp-slice');assert(sc.KP.sources[0].buffer!==original);assert.equal(sc.KP.banques[0].tranche,2);
// SON, même à l'arrêt, efface le cache ; le mode et le numéro sont conservés.
sliced.click('kp-stop-banque');assert(sc.KP.tranches[0]);sliced.click('kp-son');
assert.equal(sc.KP.tranches[0],null);assert(sc.KP.banques[0].slice);assert.equal(sc.KP.banques[0].tranche,2);
const replacement=fixture(4096,1,22050);sc.ES.buf.b1=replacement;hitSlice(2);
assert.equal(sc.KP.sources[0].buffer.numberOfChannels,1);assert.equal(sc.KP.sources[0].buffer.sampleRate,22050);
const beforeReplace=sc.KP.sources[0].buffer;sc.ES.buf.b1=fixture(4099,1,44100);hitSlice(2);
assert(sc.KP.sources[0].buffer!==beforeReplace);assert.equal(sc.KP.tranches[0].original,sc.ES.buf.b1);
// Tampons minuscules : aucune tranche de zéro frame n'est créée. Les touches
// vides sont désactivées ; une demande directe échoue sans voyant fantôme.
sc.ES.buf.b1=fixture(3,1);sc.majKp();
for(let i=0;i<8;i++){
  const empty=Math.floor(3*i/8)===Math.floor(3*(i+1)/8);
  assert.equal(sliced.el['kp-tranches'].childNodes[i].disabled,empty);
  hitSlice(i);
  if(empty){assert.equal(sc.KP.sources[0],null);assert(!sc.KP.banques[0].on);}
  else {assert.equal(sc.KP.sources[0].buffer.length,1);assert(sc.KP.sources[0].buffer.getChannelData(0)[0]>0);}
}
// Un échec d'allocation ne laisse ni source ni cache ; les autres banques restent actives.
sc.ES.buf.b1=fixture();const create=sc.ctx.createBuffer;sc.ctx.createBuffer=()=>{throw Error('mémoire');};
hitSlice(1);assert.equal(sc.KP.sources[0],null);assert.equal(sc.KP.tranches[0],null);
assert(!sc.KP.banques[0].on);assert.equal(sc.KP.sources[1],bankB);sc.ctx.createBuffer=create;
// Sauvegarde indépendante par banque, migration et validation des valeurs.
hitSlice(3);sc.KP.banques[2].slice=true;sc.KP.banques[2].tranche=7;sc.memKp();
const slicedMemory=JSON.parse(JSON.stringify(sc.memoire.kp));assert(!Object.hasOwn(slicedMemory,'tranches'));
sc.saved=slicedMemory;sc.chargerKp();assert.equal(sc.KP.tranches.length,0);
assert(sc.KP.banques[0].slice);assert.equal(sc.KP.banques[0].tranche,3);
assert(!sc.KP.banques[1].slice);assert.equal(sc.KP.banques[2].tranche,7);
for(const saved of [{banques:[{ech:'b0',mode:'one'}]},{banques:{}},undefined]){
  sc.saved=saved;sc.chargerKp();assert(sc.KP.banques.every(b=>!b.slice&&b.tranche===0));
}
sc.saved={banques:[{slice:'oui',tranche:'4'},{slice:true,tranche:Infinity},{slice:true,tranche:-2},{slice:true,tranche:19}]};
sc.chargerKp();assert(!sc.KP.banques[0].slice);assert.equal(sc.KP.banques[0].tranche,0);
assert.equal(sc.KP.banques[1].tranche,0);assert.equal(sc.KP.banques[2].tranche,0);assert.equal(sc.KP.banques[3].tranche,7);
// Rechargement réel d'un projet et changement de contexte : paramètres gardés,
// anciennes voix libérées et copies audio reconstruites dans le bon contexte.
const slicePersisted=setup();connectMemory(slicePersisted);slicePersisted.c.S.modele='kp';
slicePersisted.c.KP.banques[3].slice=true;slicePersisted.c.KP.banques[3].tranche=5;
slicePersisted.c.KP.sel=3;slicePersisted.c.memKp();slicePersisted.c.writeMem();
const sliceRestored=setup();connectMemory(sliceRestored);sliceRestored.c.activerKp();
assert(sliceRestored.c.KP.banques[3].slice);assert.equal(sliceRestored.c.KP.banques[3].tranche,5);
assert(!sliceRestored.el['kp-tranches'].hidden);assert(sliceRestored.c.KP.sources.every(s=>s===null));
sc.saved=slicedMemory;sc.arretKp();sc.chargerKp();sc.KP.sel=0;hitSlice(2);
const beforeContext=sc.KP.sources[0];sc.ctx=new Context();hitSlice(2);
assert(beforeContext.disconnected);assert.equal(sc.KP.tranches[0].ctx,sc.ctx);
assert(sc.KP.sources[0].buffer!==beforeContext.buffer);beforeContext.onended();assert(sc.KP.banques[0].on);
sc.arretKp();assert.equal(sc.KP.tranches.length,0);assert(sc.KP.sources.every(s=>s===null));
console.log('Kaoss SLICE : huit régions complètes, stéréo, fondus, original intact, relances, cache, sons courts, mémoire et contexte OK.');

// Jouer longtemps avec le transport arrêté ne retient pas chaque ancienne
// voix/copie dans le suivi global ; les sources d'autres machines sont gardées.
const tracked=setup(),lc=tracked.c,unrelated={n:{},t:1},future={n:{},t:999};
lc.SOURCES=[unrelated,future];lc.ctx.trackSource=n=>lc.SOURCES.push({n,t:1});
lc.S.modele='kp';lc.ES.buf.b0=fixture();
const initialFit=lc.fitCalls;tracked.click('kp-slice');assert.equal(lc.fitCalls,initialFit+1);
for(let j=0;j<100;j++) lc.frapperTrancheKp(0,j%8);
assert(!lc.S.run);assert.equal(lc.SOURCES.length,5); // deux autres voix, deux oscillateurs FX, une banque
assert(lc.SOURCES.includes(unrelated)&&lc.SOURCES.includes(future));
assert.equal(lc.SOURCES.filter(s=>s.n.buffer).length,1);
lc.majKp();assert.equal(lc.fitCalls,initialFit+1); // pas de recalage sur chaque frappe
tracked.click('kp-stop-banque');assert.equal(lc.SOURCES.filter(s=>s.n.buffer).length,0);
lc.modeBanqueKp(0,'one');lc.frapperTrancheKp(0,1);lc.KP.sources[0].onended();
assert.equal(lc.SOURCES.filter(s=>s.n.buffer).length,0);
lc.ctx.failStart=true;lc.frapperTrancheKp(0,2);
assert.equal(lc.KP.sources[0],null);assert.equal(lc.SOURCES.filter(s=>s.n.buffer).length,0);
assert(lc.SOURCES.includes(unrelated)&&lc.SOURCES.includes(future));
// La façade se recale uniquement quand la grille apparaît/disparaît, aussi
// lors d'une sélection silencieuse entre banques découpée et entière.
tracked.click('kp-selection');assert(tracked.el['kp-tranches'].hidden);
assert.equal(lc.fitCalls,initialFit+2);
tracked.click('kp-selection');tracked.click('kp-selection');tracked.click('kp-selection');
assert(!tracked.el['kp-tranches'].hidden);assert.equal(lc.fitCalls,initialFit+3);
tracked.click('kp-slice');assert.equal(lc.fitCalls,initialFit+4);
console.log('Kaoss SLICE : suivi des voix borné transport arrêté, démarrage refusé et ajustement de façade OK.');

// Bibliothèque réelle : ouverture sur la banque choisie, choix des quatre
// destinations et affectation de sons personnels sans lecture automatique.
const library=setup(),bc=library.c;
bc.BIB={noms:{},preset:'aucun',onglet:2,cible:{machine:'es1',partie:0}};
bc.ES.noms={};bc.ES.inv={};bc.MEM='drm.reglages';bc.TRAITE_NOMS=['aucun','punch'];
const bibMemory=new Map();bc.localStorage={getItem(k){return bibMemory.get(k);},setItem(k,v){bibMemory.set(k,v);}};
bc.document.querySelectorAll=()=>[];bc.arcCharger=()=>{};bc.majNoteOuverte=()=>{};
bc.fermerAutresPanneaux=id=>{bc.lastPanel=id;};
const esSource=fs.readFileSync(path.join(__dirname,'../page/js/280-electribe-es-1.js'),'utf8');
vm.runInContext(esSource.slice(esSource.indexOf('function nomEch('),esSource.indexOf('function inverse(')),bc);
/* v250 : la bibliothèque appelle Freesound (625), assemblé avant elle dans la page */
vm.runInContext(fs.readFileSync(path.join(__dirname,'../page/js/625-freesound.js'),'utf8'),bc);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../page/js/630-bibliotheque.js'),'utf8'),bc);
const custom=fixture();bc.ES.buf.uLocal=custom;bc.ES.noms.uLocal='fichier';bc.BIB.noms.uLocal='Ma boucle';
bc.bibEcrire();bc.KP.sel=2;bc.KP.banques[2].mode='one';bc.KP.banques[2].slice=true;bc.KP.banques[2].tranche=4;
const beforeOpen=bc.audioCalls;library.click('kp-bib');
assert.equal(bc.BIB.onglet,0);assert.equal(bc.BIB.cible.machine,'kp');assert.equal(bc.BIB.cible.partie,2);
assert.equal(bc.lastPanel,'bib');assert(library.el.bib.classList.contains('show'));
assert(bc.KP.sources.every(s=>s===null));
const body=library.el['bib-corps'],head=body.childNodes[0],selectors=head.childNodes.find(n=>n.className==='bib-cible');
assert.equal(selectors.childNodes[0].value,'kp');assert.equal(selectors.childNodes[1].value,2);
assert.deepStrictEqual(selectors.childNodes[1].options.map(o=>o.textContent),['Banque A','Banque B','Banque C','Banque D']);
assert.equal(bc.BIB_MACHINES.filter(m=>m[0]==='kp').length,1);
const rows=()=>body.childNodes.filter(n=>n.className==='bib-ligne');
function row(name){return rows().find(n=>n.querySelector('b').textContent===name);}
function action(line,label){return line.childNodes[0].childNodes.find(n=>n.textContent===label).listeners.click();}
action(row('Ma boucle'),'AFFECTER');
assert.equal(bc.KP.banques[2].ech,'uLocal');assert.equal(bc.KP.banques[2].mode,'one');
assert(bc.KP.banques[2].slice);assert.equal(bc.KP.banques[2].tranche,4);
assert.equal(bc.memoire.kp.banques[2].ech,'uLocal');assert.equal(bc.KP.sources[2],null);
assert.equal(library.el['kp-son-nom'].textContent,'Ma boucle');assert(bc.signals.at(-1).includes('Banque C'));
assert.equal(bc.audioCalls,beforeOpen+1); // ouverture de BIB seulement ; affecter reste silencieux
// Pendant la lecture, seule la banque visée repart avec le nouveau son.
library.pad(0);library.pad(2);const untouched=bc.KP.sources[0],oldCustom=bc.KP.sources[2];
bc.S.run=true;bc.ES.buf.uMic=fixture(32000,1,32000);bc.ES.noms.uMic='mic';
bc.BIB.noms.uMic='Ma voix';bc.bibAffecter('uMic');const newCustom=bc.KP.sources[2];
assert(newCustom!==oldCustom&&!newCustom.loop);assert.equal(oldCustom.stops,1);
assert.equal(bc.KP.sources[0],untouched);assert(bc.S.run);
assert.equal(bc.KP.tranches[2].original,bc.ES.buf.uMic);assert.equal(bc.KP.banques[2].tranche,4);
oldCustom.onended();assert.equal(bc.KP.sources[2],newCustom);assert(bc.KP.banques[2].on);
// Une affectation invalide conserve voix, réglage et mémoire, même depuis
// une autre machine. Aucun message de réussite ne doit remplacer l'erreur.
const beforeInvalid=JSON.stringify(bc.memoire.kp);bc.bibAffecter('absent');
assert.equal(bc.KP.sources[2],newCustom);assert.equal(bc.KP.banques[2].ech,'uMic');
assert.equal(JSON.stringify(bc.memoire.kp),beforeInvalid);assert(bc.signals.at(-1).includes('NON CHARGÉ'));
bc.S.modele='es1';assert(!bc.affecterSonKp(3,'absent'));assert.equal(bc.S.modele,'es1');
assert(!bc.affecterSonKp(-1,'uMic'));assert(!bc.affecterSonKp(1.5,'uMic'));assert(!bc.affecterSonKp(4,'uMic'));
assert(!bc.affecterSonKp(0,'__proto__'));assert.equal(bc.S.modele,'es1');
// La destination D reste explicite, même si KP.sel sauvegardée désigne B.
bc.saved={sel:1,banques:[{ech:'b0'},{ech:'b3'},{ech:'b6'},{ech:'b9',mode:'one',slice:true,tranche:7}]};
bc.BIB.cible={machine:'kp',partie:3};bc.bibAffecter('uLocal');
assert.equal(bc.S.modele,'kp');assert.equal(bc.KP.sel,3);assert.equal(bc.KP.banques[3].ech,'uLocal');
assert.equal(bc.KP.banques[3].mode,'one');assert.equal(bc.KP.banques[3].tranche,7);assert(!bc.KP.banques[3].on);
assert.equal(bc.KP.banques[1].ech,'b3');
// Les noms (y compris caractères ressemblant à du HTML) restent du texte ;
// fermer le panneau et rouvrir la façade retrouve le nom enregistré.
bc.window={prompt(){return '<b>Mon sample</b>';}};
action(row('Ma boucle'),'RENOMMER');bc.fermerBib();
assert.equal(library.el['kp-son-nom'].textContent,'<b>Mon sample</b>');
assert.equal(library.el['kp-son-nom'].innerHTML,'');assert(!library.el.bib.classList.contains('show'));
bc.saved=JSON.parse(JSON.stringify(bc.memoire.kp));bc.BIB.noms={};bc.activerKp();
assert.equal(library.el['kp-son-nom'].textContent,'<b>Mon sample</b>');
// SON avance par identifiant, même avec un nom personnalisé ou depuis un son importé.
bc.KP.banques[3].slice=false;bc.affecterSonKp(3,'b9');bc.BIB.noms.b9='Interne renommé';
library.click('kp-son');assert.equal(bc.KP.banques[3].ech,'b10');
bc.affecterSonKp(3,'uLocal');library.click('kp-son');assert.equal(bc.KP.banques[3].ech,'b0');
// Le nom indique explicitement les sons en cours de chargement ou manquants.
bc.KP.banques[3].ech='uRetrouver';bc.ES_CHARGES={uRetrouver:{ctx:bc.ctx}};bc.majKp();
assert(library.el['kp-son-nom'].textContent.includes('chargement'));
delete bc.ES_CHARGES.uRetrouver;bc.majKp();assert(library.el['kp-son-nom'].textContent.includes('indisponible'));
console.log('Kaoss bibliothèque : quatre destinations, import/micro affectables, relance isolée, erreurs sans perte, noms sûrs et mémoire OK.');
