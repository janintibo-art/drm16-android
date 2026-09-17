// Kaoss Pad : comportement des quatre banques et durée de vie des voix.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
function element() {
  const classes = new Set(), em = {textContent:''};
  return {childNodes:[],listeners:{},style:{},textContent:'',attrs:{},innerHTML:'',
    classList:{toggle(k,v){v ? classes.add(k) : classes.delete(k);},contains(k){return classes.has(k);}},
    addEventListener(k,f){this.listeners[k]=f;},appendChild(n){this.childNodes.push(n);},
    setAttribute(k,v){this.attrs[k]=v;},querySelector(){return em;}};
}
function param(value=0) { return {value,cancelAndHoldAtTime(){},cancelScheduledValues(){},
  setTargetAtTime(v){this.value=v;}}; }
class Node {
  constructor(context) { this.context=context; this.connections=[]; this.disconnected=0; this.stops=0;
    for(const k of ['gain','playbackRate','frequency','Q','delayTime']) this[k]=param(); }
  connect(n) { this.connections.push(n); }
  disconnect() { this.disconnected++; }
  start() { if(this.failStart) throw Error('start refusé'); this.started=true; }
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
  createBuffer(ch,n,sr) { return {duration:n/sr,getChannelData(){return new Float32Array(n);}}; }
}
function setup(saved) {
  const el={}, c={saved,ctx:new Context(),master:new Node(),KP:null,memoire:{},S:{run:false,bpm:120},cache:false,queue:[],
    audioCalls:0,saveCalls:0,tempoSaves:0,signals:[],H:{inter(){},cran(){},start(){}},
    now:0,performance:{now(){return c.now;}},MIDI:{sync:false},kTempo:{set(v){c.knobBpm=v;}},
    saveSoon(){c.tempoSaves++;},
    audioInit(){c.audioCalls++; if(!c.ctx&&!c.audioUnavailable)c.ctx=new Context();},
    banqueEs(){},chargerEchs(){},busSet(){return null;},eurGain(v){const n=c.ctx.node();n.gain.value=v;return n;},
    ES:{buf:Object.fromEntries(Array.from({length:24},(_,i)=>['b'+i,{duration:.1}]))},
    ES_BANQUE:Array.from({length:24},(_,i)=>'son '+i),nomEch(e){return 'son '+e.slice(1);},
    memLire(){return c.saved;},sauverMachine(){},signal(s){c.signals.push(s);},
    poserMachine(){},fit(){},save(){c.saveCalls++;},
    stop(){c.S.run=false;if(c.MACHINE)c.MACHINE.arret();},start(){c.S.run=true;},
    debrancherTout(o){for(const k in o)if(o[k] instanceof Node){o[k].disconnect();o[k].stop();}},
    document:{getElementById(id){return el[id]||(el[id]=element());},createElement:element}};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../page/js/570-korg-kaoss-pad.js'),'utf8'),c);
  const ui=fs.readFileSync(path.join(__dirname,'../page/js/590-smpltrek-dix-pistes.js'),'utf8');
  vm.runInContext(ui.slice(ui.indexOf('/* ---------- la façade du KAOSS PAD'),ui.indexOf('/* ---------- la façade de la MC-101')),c);
  c.majKp();
  return {c,el,click(id){el[id].listeners.click.call(el[id]);},pad(k){el['kp-banques'].childNodes[k].listeners.click();}};
}
const {c,el,click,pad}=setup();
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
assert.deepStrictEqual(Object.keys(saved.banques[3]).sort(),['ech','mode']);
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
