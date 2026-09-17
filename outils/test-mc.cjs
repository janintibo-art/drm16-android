// MC-101 : les vrais clips et leurs commandes, restauration et copies isolées.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const lire=nom=>fs.readFileSync(path.join(__dirname,'..',nom),'utf8');
const moteur=lire('page/js/580-roland-mc-101.js');
const facade=lire('page/js/590-smpltrek-dix-pistes.js');
const html=lire('page/html/190-unit-mc.html');
const copie=o=>JSON.parse(JSON.stringify(o));
function element(tag='div'){
  const classes=new Set(),selecteurs={};
  const e={tagName:tag.toUpperCase(),childNodes:[],listeners:{},attrs:{},style:{},dataset:{},textContent:'',disabled:false,
    classList:{toggle(k,v){if(v===undefined)v=!classes.has(k);v?classes.add(k):classes.delete(k);return v;},
      contains(k){return classes.has(k);},add(k){classes.add(k);},remove(k){classes.delete(k);}},
    appendChild(n){this.childNodes.push(n);return n;},addEventListener(k,f){this.listeners[k]=f;},
    setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k];},
    querySelector(k){return selecteurs[k]||(selecteurs[k]=element(k));},
    querySelectorAll(){return this.childNodes;},
    click(){if(!this.disabled&&this.listeners.click)this.listeners.click.call(this);}};
  Object.defineProperty(e,'children',{get(){return this.childNodes;}});
  Object.defineProperty(e,'innerHTML',{get(){return this.html||'';},set(v){this.html=v;this.childNodes.length=0;}});
  return e;
}
function setup(saved,options={}){
  const el={};for(const m of html.matchAll(/\bid="([^"]+)"/g))el[m[1]]=element();
  const c={memoire:saved===undefined?{}:{mc:saved},S:{modele:'16',run:false},ctx:options.sansAudio?null:{},
    master:{},cache:false,queue:[],sons:[],signals:[],confirms:[],confirmation:true,arrets:0,sauves:0,ecritures:0,
    H:{inter(){},cran(){},start(){}},
    document:{getElementById(id){return el[id]||null;},createElement:element,
      querySelectorAll(q){return q==='#mc-pads .mb'?el['mc-pads'].childNodes:[];}},
    window:{confirm(s){c.confirms.push(s);return c.confirmation;}},
    audioInit(){},maintenantAudio(){return 1;},busSet(){return null;},
    eurGain(){return {connect(){},disconnect(){}};},debrancherTout(n){if(n&&n.e)n.e.disconnect();},
    ouvrirPas(){return 0;},attenuerVoie(){},stepDur(){return .125;},
    memLire(id){return c.memoire[id];},sauverMachine(id){c.ecritures++;c.stocke=copie(c.memoire[id]);},
    save(){c.sauves++;},signal(s){c.signals.push(s);},poserMachine(){},fit(){},setTimeout(){},
    stop(){c.arrets++;c.S.run=false;c.queue=[];if(c.MACHINE&&c.MACHINE.arret)c.MACHINE.arret();},
    start(){c.S.run=true;},knobEm(id,o){return {maj(){},options:o};},
  };
  vm.createContext(c);vm.runInContext(moteur,c);
  const debut=facade.indexOf('/* ---------- la façade de la MC-101'),fin=facade.indexOf('/* ---------- la façade de la SmplTrek',debut);
  assert(debut>=0&&fin>debut,'façade réelle MC-101 présente');
  vm.runInContext(facade.slice(debut,fin),c);
  c.voixMc=function(...args){c.sons.push(args);};
  return {c,el,click(id){assert(el[id],id+' présent dans la vraie façade HTML');el[id].click();},
    piste(k){el['mc-trks'].childNodes[k].click();},clip(k){el['mc-clips'].childNodes[k].click();}};
}
function memoireExemple(){
  return {sel:2,note:5,scatType:3,scatProf:.7,pistes:Array.from({length:4},(_,i)=>({
    type:i===0?'drum':'synth',onde:i%2?'sawtooth':'square',cut:.3,dec:.4,niv:.6,muet:i===3,oct:0,clip:i,
    clips:Array.from({length:4},(_,j)=>Array.from({length:16},(_,k)=>k===i+j?(i===0?j:i*7+j):-1)),
  }))};
}
function verifierForme(c){
  assert(Number.isInteger(c.MC.sel)&&c.MC.sel>=0&&c.MC.sel<4);
  assert(Number.isInteger(c.MC.note)&&c.MC.note>=0&&c.MC.note<16);
  assert(Number.isInteger(c.MC.scatType)&&c.MC.scatType>=0&&c.MC.scatType<c.MC_SCATTER.length);
  assert(Number.isFinite(c.MC.scatProf)&&c.MC.scatProf>=0&&c.MC.scatProf<=1);
  assert.equal(c.MC.pistes.length,4);
  c.MC.pistes.forEach((p,i)=>{
    assert(['drum','synth'].includes(p.type));assert(['sawtooth','square','triangle','sine'].includes(p.onde));
    assert.equal(typeof p.muet,'boolean');assert(Number.isInteger(p.oct)&&Number.isFinite(p.oct));
    for(const nom of ['cut','dec','niv'])assert(Number.isFinite(p[nom])&&p[nom]>=0&&p[nom]<=1,nom+' borné');
    assert(Number.isInteger(p.clip)&&p.clip>=0&&p.clip<4);assert.equal(p.clips.length,4);
    p.clips.forEach(clip=>{assert.equal(clip.length,16);clip.forEach(note=>{
      assert(Number.isInteger(note)&&note>=-1&&note<=(p.type==='drum'?3:127),'note valide');
    });});
  });
}

// Démarrage direct, sans visiter ARCHIVE : les clips mémorisés reviennent et
// l'ancienne machine est arrêtée avant de basculer sur MC-101.
{
  const enregistre=memoireExemple(),f=setup(copie(enregistre)),{c,el}=f;let ancienArrete=false;
  c.MACHINE={arret(){ancienArrete=true;assert.equal(c.S.modele,'16');}};c.S.run=true;
  c.activerMc();assert(ancienArrete);assert(!c.S.run);assert.equal(c.S.modele,'mc');
  assert.strictEqual(c.MACHINE,c.MACHINE_MC);assert.equal(c.sauves,1);assert.equal(c.MC.sel,2);
  assert.deepStrictEqual(copie(c.MC.pistes),enregistre.pistes);assert.equal(c.MC.note,5);
  assert.equal(c.MC.scatType,3);assert.equal(c.MC.scatProf,.7);assert.equal(el['mc-scat-prof'].value,.7);
  assert.equal(el['mc-clips'].childNodes.length,4);assert.equal(el['mc-pads'].childNodes.length,16);
  assert.equal(c.sons.length,0);verifierForme(c);
  c.MC.pistes[2].clips[2][0]=42;assert.equal(c.memoire.mc.pistes[2].clips[2][0],-1,'lecture sans alias vers la mémoire');
  c.memMc();const snapshot=c.memoire.mc;c.MC.pistes[2].clips[2][0]=43;
  assert.equal(snapshot.pistes[2].clips[2][0],42,'écriture prend un instantané indépendant');
  const reprise=setup(copie(c.stocke));reprise.c.activerMc();assert.equal(reprise.c.MC.pistes[2].clips[2][0],42);
  assert(!reprise.c.MC.copie,'le presse-papiers de session ne fait pas partie du projet');
}

// Les boutons vont directement au clip choisi, sans couper la lecture ni
// changer les clips des autres pistes. Le prochain pas utilise ce clip.
{
  const f=setup(memoireExemple()),{c,el}=f;c.activerMc();
  c.S.run=true;c.queue=[{i:5,t:2}];const arrets=c.arrets,sons=c.sons.length,autres=c.MC.pistes.map(p=>p.clip);
  for(const k of [3,0,2,1]){
    f.clip(k);assert.equal(c.MC.pistes[2].clip,k);assert.equal(c.MC.sel,2);assert(c.S.run);
    assert.equal(c.arrets,arrets);assert.equal(c.sons.length,sons);assert.equal(c.queue.length,1);
    c.MC.pistes.forEach((p,i)=>{if(i!==2)assert.equal(p.clip,autres[i]);});
    assert.equal(el['mc-clips'].childNodes[k].attrs['aria-pressed'],'true');
  }
  const avant=copie(c.MC.pistes),ecritures=c.ecritures;
  for(const k of [-1,4,1.5,NaN,Infinity,'2',null])c.choisirClipMc(k);
  assert.deepStrictEqual(copie(c.MC.pistes),avant);assert.equal(c.ecritures,ecritures);
  for(const p of c.MC.pistes)for(const clip of p.clips)clip.fill(-1);
  c.MC.pistes[2].clips[1][6]=17;c.MC.pistes[2].clips[0][6]=4;
  c.scheduleMc(6,2);assert.equal(c.sons.at(-1)[2],17);
  f.clip(0);c.scheduleMc(6,2.125);assert.equal(c.sons.at(-1)[2],4);
  c.beatMc(6);assert(el['mc-pads'].childNodes[6].classList.contains('cur'));
  f.click('mc-play');assert(!c.S.run);assert.equal(c.MC.pos,-1);
  assert(el['mc-pads'].childNodes.every(p=>!p.classList.contains('cur')),'STOP éteint le pas courant');
}

// Copier prend les notes maintenant. Une édition ultérieure de la source,
// du collage ou d'un second collage ne peut modifier les autres tableaux.
{
  const f=setup(memoireExemple()),{c,el}=f;c.activerMc();f.piste(1);f.clip(1);
  const source=c.MC.pistes[1].clips[1],notes=copie(source),ecritures=c.ecritures,sons=c.sons.length;
  f.click('mc-copier');assert.equal(c.ecritures,ecritures);assert.equal(c.sons.length,sons);
  assert.equal(c.MC.copie.type,'synth');assert.equal(c.MC.copie.piste,1);assert.equal(c.MC.copie.clip,1);
  assert.deepStrictEqual(copie(c.MC.copie.pas),notes);assert.notStrictEqual(c.MC.copie.pas,source);
  c.memMc();assert(!Object.prototype.hasOwnProperty.call(c.memoire.mc,'copie'));
  const reprise=setup(copie(c.stocke));reprise.c.activerMc();assert(!reprise.c.MC.copie,'copie limitée à la session');
  source[2]=61;assert.equal(c.MC.copie.pas[2],notes[2]);
  f.piste(2);f.clip(3);const p=c.MC.pistes[2];p.clips[3].fill(-1);
  const avant=copie(c.MC.pistes),confirms=c.confirms.length;c.S.run=true;
  f.click('mc-coller');assert.equal(c.confirms.length,confirms,'coller sur un clip vide ne demande pas confirmation');
  assert.deepStrictEqual(copie(p.clips[3]),notes);assert.notStrictEqual(p.clips[3],c.MC.copie.pas);
  avant[2].clips[3]=notes;assert.deepStrictEqual(copie(c.MC.pistes),avant,'seules les notes de la destination changent');
  assert(c.S.run);assert.equal(c.sons.length,sons);
  p.clips[3][0]=77;assert.equal(c.MC.copie.pas[0],notes[0]);
  f.clip(0);p.clips[0].fill(-1);f.click('mc-coller');assert.deepStrictEqual(copie(p.clips[0]),notes);
  assert.equal(p.clips[3][0],77);assert.equal(source[2],61);
  f.piste(0);const refuse=copie(c.MC.pistes),ecrituresRefus=c.ecritures;
  assert(el['mc-coller'].disabled,'la façade désactive un collage mélodique vers la piste rythmique');
  c.collerClipMc();assert.deepStrictEqual(copie(c.MC.pistes),refuse);assert.equal(c.ecritures,ecrituresRefus);
  c.MC.pistes[0].clips[0][0]=3;f.clip(0);f.click('mc-copier');
  f.clip(2);c.MC.pistes[0].clips[2].fill(-1);f.click('mc-coller');assert.equal(c.MC.pistes[0].clips[2][0],3);
  f.piste(1);assert(el['mc-coller'].disabled);const interdit=copie(c.MC.pistes);c.collerClipMc();
  assert.deepStrictEqual(copie(c.MC.pistes),interdit,'pas de collage rythmique dans une piste mélodique');
}

// Refuser de remplacer ou d'effacer un clip conserve la destination et la
// copie. Accepter ne touche ni aux autres clips ni aux paramètres du son.
{
  const f=setup(memoireExemple()),{c}=f;c.activerMc();f.click('mc-copier');f.clip(3);
  const avant=copie(c.MC.pistes),copieAvant=copie(c.MC.copie),ecritures=c.ecritures;
  c.confirmation=false;f.click('mc-coller');assert.equal(c.confirms.length,1);
  assert.deepStrictEqual(copie(c.MC.pistes),avant);assert.deepStrictEqual(copie(c.MC.copie),copieAvant);
  assert.equal(c.ecritures,ecritures);f.click('mc-clear');assert.deepStrictEqual(copie(c.MC.pistes),avant);
  c.confirmation=true;f.click('mc-coller');avant[2].clips[3]=copieAvant.pas;
  assert.deepStrictEqual(copie(c.MC.pistes),avant);f.click('mc-clear');avant[2].clips[3]=Array(16).fill(-1);
  assert.deepStrictEqual(copie(c.MC.pistes),avant);assert.deepStrictEqual(copie(c.MC.copie),copieAvant);
  assert.equal(c.sons.length,0);
}

// Un presse-papiers absent est inactif ; un clip vide reste une vraie copie,
// avec la même confirmation avant de remplacer les notes d'une destination.
{
  const f=setup(),{c,el}=f;c.activerMc();assert(el['mc-coller'].disabled);
  const avant=copie(c.MC.pistes),ecritures=c.ecritures;c.collerClipMc();
  assert.deepStrictEqual(copie(c.MC.pistes),avant);assert.equal(c.ecritures,ecritures);
  f.click('mc-copier');f.clip(1);c.MC.pistes[0].clips[1][4]=3;
  c.confirmation=false;f.click('mc-coller');assert.equal(c.MC.pistes[0].clips[1][4],3);
  c.confirmation=true;f.click('mc-coller');assert(c.MC.pistes[0].clips[1].every(n=>n===-1));
  assert.equal(c.confirms.length,2);assert.equal(c.sons.length,0);
}

// Les données de projet mal formées ne peuvent fabriquer un index absent,
// une note NaN ou partager un même tableau entre plusieurs clips.
{
  const mauvais=[-1,0,4,127,128,-2,1.5,'3',null,{},NaN,Infinity];
  const sauvegarde={sel:2.8,note:Infinity,scatType:NaN,scatProf:8,pistes:[
    {type:'invalide',onde:42,clip:99,cut:NaN,dec:-3,niv:Infinity,oct:'x',muet:'non',clips:[mauvais,null,{},[]]},
    {type:null,onde:'invalide',clip:-2,cut:9,dec:null,niv:'0.2',oct:1.5,clips:[mauvais]},null,
    {clip:'2',clips:'non'},
  ]};
  const f=setup(sauvegarde),{c}=f;c.activerMc();verifierForme(c);
  assert.deepStrictEqual(copie(c.MC.pistes[0].clips[0].slice(0,4)),[-1,0,0,3]);
  assert.deepStrictEqual(copie(c.MC.pistes[1].clips[0].slice(0,4)),[-1,0,4,127]);
  assert(c.MC.pistes[0].clips[0].slice(4).every(n=>n===-1));
  assert(c.MC.pistes[1].clips[0].slice(4).every(n=>n===-1));
  c.MC.pistes[0].clips[1][0]=3;assert.equal(c.MC.pistes[0].clips[2][0],-1);
  c.MC.pistes[1].clips[1][0]=7;assert.equal(c.MC.pistes[2].clips[1][0],-1);
  c.majMc();for(let i=0;i<16;i++)c.scheduleMc(i,1+i*.125);
  for(const pistes of [{length:4},'texte',null]){
    const g=setup({pistes,sel:NaN,note:-99,scatType:Infinity,scatProf:'1'});g.c.activerMc();verifierForme(g.c);
  }
}
console.log('MC-101 : restauration directe, mémoire normalisée, quatre clips silencieux, copies indépendantes, types compatibles, confirmations et persistance OK.');
