// Bibliothèque : le bon niveau audio, la bonne partie PCM et des caches cohérents.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../page/js/630-bibliotheque.js'),'utf8');
function fragment(from,to){const a=source.indexOf(from),b=source.indexOf(to,a);assert(a>=0&&b>a);return source.slice(a,b);}
function setup(){
  const c={S:{modele:'es1'},ES:{buf:{},inv:{},pat:{son:[]}},SX:{pat:{son:[]}},MPC:{pads:[]},ER:{pat:{son:[]}},
    ES_PARTS:[],BIB:{cible:{machine:'er2',partie:0},preset:'punch',noms:{}},BIB_MACHINES:[],TRAITE_NOMS:['punch'],
    messages:[],actions:{},writes:[],stored:true,updates:0,saved:0,
    audioInit(){},banqueEs(){},signal(s){c.messages.push(s)},H:{inter(){}},majBibUI(){c.updates++},
    memEs(){c.saved++},memSx(){c.saved++},memMpc(){c.saved++},memEr(){c.saved++},
    majLedsEs(){},majLedsSx(){},majPadsMpc(){},majLcdMpc(){},nomPartieSx:k=>String(k),padNom:k=>String(k),
    trLufs:d=>d[0],linDb:x=>20*Math.log10(Math.max(1e-9,x)),dbLin:x=>Math.pow(10,x/20),
    nomBib:id=>id,bibParties:()=>['PCM1','PCM2'],bibNomPartie:()=>'',
    traiterSon:()=>({buffer:{name:'traité'},rapport:{gain:3,apres:{crete:-1}}}),
    sauverEch(id,b){c.writes.push([id,b]);return c.stored},
    listeEch:()=>Object.keys(c.ES.buf),trTauxConseille:()=>16000,
    reechantillonner:(b,sr)=>({length:b.length/2,sampleRate:sr}),
    document:{createElement(){return {children:[],options:[],style:{},value:'',appendChild(x){this.children.push(x);this.options.push(x)},addEventListener(){}}}},
    ligneBib:()=>({appendChild(){}}),boutonBib(parent,label,fn){c.actions[label]=fn},
    bibSons:()=>[{id:'u1',nom:'prise',propre:true,duree:1,freq:32000}]
  };vm.createContext(c);
  vm.runInContext(fragment('function bibAffecter(','var BIB_MACHINES'),c);
  vm.runInContext(fragment('function bibIndexReel(','/* ---------- rayon des sauvegardes'),c);
  vm.runInContext(fragment('function bibPartiesNiveau(){','/* ---------- export vers la carte'),c);
  vm.runInContext(fragment('function bibRendreSons(','function bibRendrePrises('),c);
  return c;
}
for(const machine of ['es1','es2','esx','mpc3000','mpc2000']){
 const c=setup();c.S.modele=machine;const champ=machine.startsWith('mpc')?'niv':'lvl';
 const sons=Array.from({length:64},(_,i)=>({ech:'u'+i,[champ]:i===1?.4:.8}));
 c.ES.pat.son=sons;c.SX.pat.son=sons;c.MPC.pads=sons;c.ES_PARTS=sons.map((_,i)=>({n:String(i)}));
 c.ES.buf={u0:{sampleRate:32000,getChannelData:()=>[-10]},u1:{sampleRate:32000,getChannelData:()=>[-10]}};
 c.bibEgaliser();
 assert(Math.abs(sons[0][champ]-sons[1][champ])<.001,machine+' utilise le champ réellement joué');
 assert(sons.every(s=>Number.isFinite(s[champ])));assert(!c.messages.at(-1).includes('NaN'));
 if(champ==='lvl')assert(sons.every(s=>s.niv===undefined));assert.equal(c.saved,1);
}
// Les deux choix du menu correspondent aux deux vraies parties PCM de l'ER2.
for(const [visible,reel] of [[0,4],[1,5]]){
 const c=setup();c.S.modele='er2';c.BIB.cible.partie=visible;
 c.ER.pat.son=Array.from({length:6},()=>({pcm:0}));c.bibAffecter('b7');
 c.ER.pat.son.forEach((s,k)=>assert.equal(s.pcm,k===reel?7:0));assert.equal(c.saved,1);
}
// TRAITER doit invalider l'ancien son inversé. En cas de disque plein, le
// dernier message conserve l'avertissement, même si le traitement a réussi.
for(const stored of [true,false]){
 const c=setup();c.stored=stored;c.ES.buf.u1={name:'original'};c.ES.inv.u1={name:'inversé ancien'};
 c.bibRendreSons({appendChild(){}});c.actions.TRAITER();
 assert.equal(c.ES.buf.u1.name,'traité');assert(!c.ES.inv.u1);assert.equal(c.writes.length,1);
 assert.equal(c.messages.at(-1).includes('ÉCHEC D\'ÉCRITURE'),!stored);
}
// OPTIMISER modifie aussi le buffer : ne pas continuer à jouer l'ancien
// inversé, et ne pas cacher l'échec de sauvegarde derrière le gain de place.
for(const stored of [true,false]){
 const c=setup();c.stored=stored;c.ES.buf={u1:{length:32000,sampleRate:32000},b0:{length:100,sampleRate:32000}};
 c.ES.inv.u1={name:'ancien'};c.bibOptimiser();
 assert.equal(c.ES.buf.u1.sampleRate,16000);assert(!c.ES.inv.u1);assert.equal(c.writes.length,1);
 assert.equal(c.messages.at(-1).includes('ÉCHEC D\'ÉCRITURE'),!stored);
}
console.log('Bibliothèque : égalisation réelle ES/ES2/ESX/MPC, destinations PCM ER2, caches inversés et avertissements de sauvegarde traitement/optimisation OK.');
