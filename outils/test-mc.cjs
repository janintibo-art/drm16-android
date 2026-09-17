// MC-101 : vrais clips, lancement à la mesure, restauration et copies isolées.
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
    maintenant:1,SET:{on:false,actives:{}},
    H:{inter(){},cran(){},start(){}},
    document:{getElementById(id){return el[id]||null;},createElement:element,
      querySelectorAll(q){return q==='#mc-pads .mb'?el['mc-pads'].childNodes:[];}},
    window:{confirm(s){c.confirms.push(s);return c.confirmation;}},
    audioInit(){},maintenantAudio(){return c.maintenant;},busSet(){return null;},
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

function clipsChoisis(c){return Array.from(c.MC.pistes,p=>p.clip);}
function attendreClips(c){return Array.from(c.MC.attente);}
function fixtureMesure(){
  const f=setup(),{c}=f;c.activerMc();
  // Chaque clip est identifiable à l'écoute sur n'importe quel pas.
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)c.MC.pistes[i].clips[j].fill(i?i*20+j:j);
  c.modeClipsMc(true);c.S.run=true;return f;
}
function notesJouees(c){return c.sons.map(n=>[n[1],n[2]]);}

// Les projets antérieurs restent en DIRECT. Les scènes changent les quatre
// index d'un seul geste, même les pistes muettes, sans jouer de note à l'arrêt.
{
  const f=setup(memoireExemple()),{c}=f;c.activerMc();assert.strictEqual(c.MC.quantifie,false);
  const pistes=copie(c.MC.pistes),sel=c.MC.sel,arrets=c.arrets;
  c.modeClipsMc(true);assert(c.MC.quantifie);assert.strictEqual(c.stocke.quantifie,true);
  c.choisirSceneMc(1);assert.deepStrictEqual(clipsChoisis(c),[1,1,1,1]);
  assert.equal(c.MC.sel,sel);assert.equal(c.arrets,arrets);assert.equal(c.sons.length,0);
  assert.equal(c.MC.depart,null);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  pistes.forEach(p=>p.clip=1);assert.deepStrictEqual(copie(c.MC.pistes),pistes,'scène conserve les notes, les sons et les mutes');
  const avant=copie(c.MC.pistes),ecritures=c.ecritures;
  for(const k of [-1,4,1.5,NaN,Infinity,'2',null])c.choisirSceneMc(k);
  assert.deepStrictEqual(copie(c.MC.pistes),avant);assert.equal(c.ecritures,ecritures);
  const reprise=setup(copie(c.stocke));reprise.c.activerMc();assert.strictEqual(reprise.c.MC.quantifie,true);
  for(const quantifie of [undefined,'true',1,null,{},[]]){
    const g=setup({quantifie});g.c.activerMc();assert.strictEqual(g.c.MC.quantifie,false,'seul le booléen true active MESURE');
  }
}

// Demande, remplacement et annulation restent silencieux. Le choix de l'index
// courant annule ; la bascule DIRECT abandonne les demandes non programmées.
{
  const {c}=fixtureMesure(),ecritures=c.ecritures;
  c.choisirClipMc(1);assert.deepStrictEqual(attendreClips(c),[1,null,null,null]);
  c.choisirClipMc(2);assert.deepStrictEqual(attendreClips(c),[2,null,null,null]);
  c.choisirClipMc(2);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  c.choisirClipMc(3);c.choisirClipMc(0);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  c.MC.sel=1;c.choisirClipMc(2);c.MC.sel=3;c.choisirClipMc(1);
  assert.deepStrictEqual(attendreClips(c),[null,2,null,1]);assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);
  assert.equal(c.ecritures,ecritures,'les demandes transitoires ne deviennent pas des choix sauvegardés');
  c.annulerClipsMc();assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  c.choisirSceneMc(2);assert.deepStrictEqual(attendreClips(c),[2,2,2,2]);
  c.modeClipsMc(false);assert(!c.MC.quantifie);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);assert.equal(c.sons.length,0);
  c.choisirSceneMc(3);assert.deepStrictEqual(clipsChoisis(c),[3,3,3,3],'DIRECT s’applique pendant la lecture');
}

// Le scheduler voit la nouvelle scène dès la prochaine mesure, mais l'écran,
// l'édition et la sauvegarde restent sur la scène entendue pendant le lookahead.
{
  const {c}=fixtureMesure();c.MC.sel=2;c.MC.pistes[3].muet=true;
  const source=copie(c.MC.pistes),ecritures=c.ecritures;
  c.choisirSceneMc(2);c.scheduleMc(15,1.1);
  assert.deepStrictEqual(notesJouees(c),[[0,0],[1,20],[2,40]]);assert.equal(c.MC.depart,null);
  c.sons=[];c.scheduleMc(0,1.2);
  assert.deepStrictEqual(notesJouees(c),[[0,2],[1,22],[2,42]],'la première note utilise la nouvelle scène');
  assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);assert.equal(c.MC.depart.t,1.2);
  assert.strictEqual(c.MC.depart.ctx,c.ctx);assert.deepStrictEqual(Array.from(c.MC.depart.clips),[2,2,2,2]);
  assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);assert.equal(c.ecritures,ecritures);
  assert.strictEqual(c.clipMcCur(2),c.MC.pistes[2].clips[0]);
  c.copierClipMc();assert.equal(c.MC.copie.clip,0);assert.equal(c.MC.copie.pas[0],40);
  c.clipMcCur(2)[1]=99;assert.equal(c.MC.pistes[2].clips[2][1],42,'éditer conserve le clip entendu');
  const depart=c.MC.depart;
  c.choisirClipMc(3);c.choisirSceneMc(1);c.modeClipsMc(false);c.annulerClipsMc();
  assert.strictEqual(c.MC.depart,depart,'un départ déjà confié à l’audio ne se remplace pas');
  assert(c.MC.quantifie);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  c.memMc();assert.deepStrictEqual(c.stocke.pistes.map(p=>p.clip),[0,0,0,0],'sauvegarde avant le son');
  assert(!('attente' in c.stocke));assert(!('depart' in c.stocke));
  c.sons=[];c.scheduleMc(1,1.325);assert.deepStrictEqual(notesJouees(c),[[0,2],[1,22],[2,42]]);
  c.maintenant=1.199;assert.strictEqual(c.validerDepartMc(),false);assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);
  c.maintenant=1.2;const avantValidation=c.ecritures;assert.strictEqual(c.validerDepartMc(),true);
  assert.equal(c.ecritures,avantValidation,'la validation peut être utilisée par la sauvegarde sans récursion');
  assert.deepStrictEqual(clipsChoisis(c),[2,2,2,2]);assert.equal(c.MC.depart,null);assert.equal(c.MC.sel,2);
  assert(c.MC.pistes[3].muet);assert.deepStrictEqual(copie(c.MC.pistes[3].clips),source[3].clips);
  assert.strictEqual(c.validerDepartMc(),false,'un départ ne se valide qu’une fois');
  c.memMc();assert.deepStrictEqual(c.stocke.pistes.map(p=>p.clip),[2,2,2,2]);
}


// Une seule piste demandée conserve les trois autres choix. Une demande arrivée
// après la programmation du premier pas attend le zéro de la mesure suivante.
{
  const {c}=fixtureMesure();c.MC.sel=1;c.choisirClipMc(1);c.scheduleMc(0,1.2);
  assert.deepStrictEqual(Array.from(c.MC.depart.clips),[0,1,0,0]);
  c.sons=[];c.scheduleMc(1,1.19);
  assert(c.sons.every(n=>n[0]>=1.2),'le décalage humain ne fait pas entendre le nouveau clip avant son départ');
  c.maintenant=1.2;c.suivreClipsMc();c.choisirClipMc(2);
  for(let i=2;i<16;i++)c.scheduleMc(i,1.2+i*.125);
  assert.equal(c.MC.depart,null);assert.deepStrictEqual(attendreClips(c),[null,2,null,null]);
  c.scheduleMc(0,3.2);assert.deepStrictEqual(Array.from(c.MC.depart.clips),[0,2,0,0]);
  assert.deepStrictEqual(clipsChoisis(c),[0,1,0,0]);
}

// Les vrais boutons rendent distincts le clip entendu, la demande encore
// annulable et le départ déjà programmé ; le bouton de cycle suit la demande.
{
  const f=setup(),{c,el}=f;c.activerMc();f.click('mc-quantifie');c.S.run=true;
  assert(c.MC.quantifie);assert.equal(el['mc-quantifie'].textContent,'MESURE');
  f.clip(2);assert(el['mc-clips'].childNodes[2].classList.contains('attente'));
  assert(el['mc-clips'].childNodes[0].classList.contains('sel'));assert(!el['mc-annuler'].disabled);
  f.click('mc-clip');assert.equal(c.MC.attente[0],3);f.click('mc-annuler');assert.equal(c.MC.attente[0],null);
  assert(el['mc-annuler'].disabled);el['mc-scenes'].childNodes[1].click();
  assert(el['mc-scenes'].childNodes[1].classList.contains('attente'));c.scheduleMc(0,1.2);
  for(const id of ['mc-quantifie','mc-annuler','mc-clip'])assert(el[id].disabled,id+' verrouillé pendant le départ');
  assert(el['mc-clips'].childNodes.every(b=>b.disabled));assert(el['mc-scenes'].childNodes.every(b=>b.disabled));
  assert(el['mc-lancement-etat'].textContent.includes('IMMINENT'));
  c.maintenant=1.2;c.beatMc(0);assert(el['mc-scenes'].childNodes[1].classList.contains('sel'));
  assert(el['mc-clips'].childNodes.every(b=>!b.disabled&&!b.classList.contains('attente')));
  assert(!el['mc-quantifie'].disabled);assert(el['mc-annuler'].disabled);
}

// Tous les chemins de persistance/affichage rattrapent un départ déjà entendu,
// même quand aucune image du navigateur n'a été peinte à cet instant.
for(const passage of ['suivreClipsMc','memMc']){
  const {c}=fixtureMesure();c.choisirSceneMc(1);c.scheduleMc(0,1.25);const ecritures=c.ecritures;
  c.maintenant=1.3;c[passage]();
  assert.deepStrictEqual(clipsChoisis(c),[1,1,1,1]);assert.equal(c.MC.depart,null);
  assert.deepStrictEqual(c.stocke.pistes.map(p=>p.clip),[1,1,1,1]);assert.equal(c.ecritures,ecritures+1);
}

// STOP met S.run à false avant l'arrêt de la machine. Il conserve la scène
// réellement entendue et abandonne un départ futur ou une simple demande.
for(const temps of [1.1,1.2,1.5]){
  const {c}=fixtureMesure();c.choisirSceneMc(3);c.scheduleMc(0,1.2);c.maintenant=temps;c.stop();
  const cible=temps<1.2?0:3;
  assert(!c.S.run);assert.deepStrictEqual(clipsChoisis(c),[cible,cible,cible,cible]);
  assert.equal(c.MC.depart,null);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  assert.equal(c.MC.pos,-1);c.memMc();assert(c.stocke.pistes.every(p=>p.clip===cible));
}
{
  const {c}=fixtureMesure();c.choisirSceneMc(2);c.stop();assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);
  assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);c.S.run=true;c.scheduleMc(0,2);
  assert.equal(c.MC.depart,null,'la demande abandonnée ne revient pas au démarrage');
}

// Le début de mesure se décide avant le SCATTER, indépendamment du pas lu,
// du nombre de frappes ou du silence produit par l'effet.
{
  const {c}=fixtureMesure();c.MC.scatOn=true;c.MC.scatProf=1;c.MC.scatType=6;
  c.choisirSceneMc(1);c.scheduleMc(9,1.1);assert.equal(c.MC.depart,null,'le GEL au pas zéro ne lance pas une scène en milieu de mesure');
  c.MC.scatType=1;c.sons=[];c.scheduleMc(0,1.2);assert.equal(c.MC.depart.t,1.2,'lecture du pas quinze au vrai début de mesure');
  assert.deepStrictEqual(notesJouees(c),[[0,1],[1,21],[2,41],[3,61]]);
}
{
  const {c}=fixtureMesure();c.scatterMc=()=>({pas:-1,coups:0});c.choisirSceneMc(2);c.scheduleMc(0,1.2);
  assert(c.MC.depart,'une première frappe avalée ne perd pas le départ');assert.equal(c.sons.length,0);
  c.maintenant=1.2;c.suivreClipsMc();assert.deepStrictEqual(clipsChoisis(c),[2,2,2,2]);
}

// L'arrière-plan Android utilise cache=true : les sons doivent garder leur
// lancement à la mesure, même sans file d'affichage. L'export hors ligne,
// lui, prend les clips courants sans créer de départ de transport.
{
  const {c}=fixtureMesure();c.cache=true;c.choisirSceneMc(2);c.scheduleMc(0,1.2);
  assert(c.MC.depart);assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);assert.equal(c.queue.length,0);
  c.maintenant=1.3;c.scheduleMc(1,1.325);assert.deepStrictEqual(clipsChoisis(c),[2,2,2,2]);
}
{
  const {c}=fixtureMesure();c.ctx={startRendering(){}};c.cache=true;c.choisirSceneMc(1);
  assert.deepStrictEqual(clipsChoisis(c),[1,1,1,1]);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  c.scheduleMc(0,5);assert.equal(c.MC.depart,null);assert.deepStrictEqual(notesJouees(c),[[0,1],[1,21],[2,41],[3,61]]);
}

// La MC-101 secondaire du SET garde sa mesure sans polluer les pas affichés de
// la machine principale. Une ancienne horloge audio n'est jamais validée.
{
  const {c}=fixtureMesure();c.MACHINE={};c.SET={on:true,actives:{mc:true}};
  c.queue=[{i:7,t:1.1}];c.choisirSceneMc(1);c.scheduleMc(0,1.2);
  assert(c.MC.depart);assert.deepStrictEqual(copie(c.queue),[{i:7,t:1.1}]);
  c.scatterMc=()=>({pas:-1,coups:0});c.scheduleMc(1,1.325);
  assert.deepStrictEqual(copie(c.queue),[{i:7,t:1.1}],'même un pas avalé ne pollue pas la file');
  c.maintenant=1.2;c.suivreClipsMc();assert.deepStrictEqual(clipsChoisis(c),[1,1,1,1]);
}
{
  const {c}=fixtureMesure();c.choisirSceneMc(3);c.scheduleMc(0,1.2);c.ctx={};c.maintenant=4;
  c.suivreClipsMc();assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);assert.equal(c.MC.depart,null);
  assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
}


// L'horloge MIDI externe ne cadence que la machine principale : une MC
// secondaire applique donc le choix directement, sans attente orpheline.
for(const principale of [false,true])for(const ouvert of [-1,0]){
  const {c}=fixtureMesure();if(!principale)c.MACHINE={};
  c.SET={on:true,actives:{mc:true}};c.MIDI={sync:true,ouvert};c.choisirSceneMc(2);
  const quantifie=principale||ouvert<0;
  assert.deepStrictEqual(clipsChoisis(c),Array(4).fill(quantifie?0:2));
  assert.deepStrictEqual(attendreClips(c),Array(4).fill(quantifie?2:null));
  assert.equal(c.MC.depart,null);
}

// Recharger un projet supprime les demandes et les départs de la session,
// y compris si une sauvegarde trafiquée contient ces champs transitoires.
{
  const {c}=fixtureMesure();c.choisirSceneMc(2);c.scheduleMc(0,1.2);
  c.memoire.mc={...memoireExemple(),quantifie:true,attente:[3,3,3,3],depart:{t:99,clips:[3,3,3,3]}};
  c.chargerMc();assert.deepStrictEqual(clipsChoisis(c),[0,1,2,3]);assert.equal(c.MC.depart,null);
  assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);assert(c.MC.quantifie);
  c.choisirSceneMc(1);c.memoire.mc=null;c.chargerMc();assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
}


function chargerTransportReel(c){
  Object.assign(c,{MIDI:{sync:true,ouvert:0},SYNC:{},step:9,pasSet:12,timer:null,AUDIT:{tDernier:1},
    clearInterval(){},couperSourcesFutures(){},midiSilence(){},draw(){},host(){},midiHorloge(){},preparerSet(){},majPlayEm(){}});
  vm.runInContext(lire('page/js/130-decalage-humain.js'),c);
  const midi=lire('page/js/310-midi.js'),debut=midi.indexOf('function departEsclave('),fin=midi.indexOf('/* réception */',debut);
  assert(debut>=0&&fin>debut,'départ MIDI réel présent');vm.runInContext(midi.slice(debut,fin),c);
}

// Les points d'entrée du transport réel réinitialisent également la MC-101,
// même si une autre machine est à l'écran lors de l'arrêt du SET.
for(const depart of [false,true]){
  const {c}=fixtureMesure();c.choisirSceneMc(2);if(depart)c.scheduleMc(0,1.2);
  chargerTransportReel(c);c.start();assert(c.S.run);assert.equal(c.step,0);
  assert.equal(c.MC.depart,null);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);
}
for(const temps of [1.1,1.3]){
  const {c}=fixtureMesure();c.MACHINE={};c.SET={on:true,actives:{mc:true}};
  c.choisirSceneMc(1);c.scheduleMc(0,1.2);c.maintenant=temps;chargerTransportReel(c);c.stop();
  assert(!c.S.run);assert.equal(c.MC.depart,null);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  assert.deepStrictEqual(clipsChoisis(c),Array(4).fill(temps<1.2?0:1));
}
{
  const {c}=fixtureMesure();c.choisirSceneMc(2);chargerTransportReel(c);
  c.departEsclave(false);assert.deepStrictEqual(attendreClips(c),[2,2,2,2],'MIDI CONTINUE conserve la mesure en cours');
  c.scheduleMc(0,1.2);c.departEsclave(true);assert.equal(c.step,0);
  assert.equal(c.MC.depart,null);assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);
  assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0],'MIDI START abandonne l’ancien départ encore futur');
}


function chargerTableReelle(f){
  const {c,el}=f;
  for(const id of ['table-voies','table-on','table-play','table-ensemble','table-rien'])el[id]=element();
  Object.assign(c,{SET_VOIES:[['mc','MC-101']],preparerSet(){},majToutesVoiesSet(){},majTable(){},memSet(){}});
  const table=lire('page/js/210-transfert-vers-une-vraie-volca-sample.js');
  const construction=table.indexOf('function construireTable(){'),suite=table.indexOf('/* Ouvrir la façade',construction);
  const commandes=table.indexOf('document.getElementById("table-on").addEventListener'),fin=table.indexOf('document.getElementById("menu-studio")',commandes);
  assert(construction>=0&&suite>construction&&commandes>=0&&fin>commandes,'vraies commandes SET présentes');
  vm.runInContext(table.slice(construction,suite)+'\n'+table.slice(commandes,fin),c);c.construireTable();
  return function couper(commande){
    if(commande==='voie')el['table-voies'].childNodes[0].listeners.click({target:{closest(){return {dataset:{a:'on'}};}}});
    else f.click(commande);
  };
}
// Les trois chemins qui retirent une MC secondaire du SET abandonnent son
// départ futur. Ils laissent jouer la MC quand elle est la machine principale.
for(const commande of ['voie','table-on','table-rien'])for(const principale of [false,true]){
  const f=fixtureMesure(),{c}=f;if(!principale)c.MACHINE={};c.SET={on:true,actives:{mc:true}};
  c.choisirSceneMc(2);c.scheduleMc(0,1.2);const couper=chargerTableReelle(f);couper(commande);
  assert(c.S.run);assert.deepStrictEqual(clipsChoisis(c),[0,0,0,0]);
  if(principale){assert(c.MC.depart,commande+' garde le transport principal');c.maintenant=1.2;c.suivreClipsMc();assert.deepStrictEqual(clipsChoisis(c),[2,2,2,2]);}
  else {assert.equal(c.MC.depart,null,commande+' abandonne le départ de la voie retirée');assert.deepStrictEqual(attendreClips(c),[null,null,null,null]);}
}


function chargerEcritureReelle(c){
  Object.assign(c,{saveTmr:null,PROJET_EN_COURS:false,MEM:'memoire-test',memEchec:false,
    clearTimeout(){},vidages:[],ecrituresLocales:[],
    viderMachines(){c.vidages.push(copie(c.memoire));},
    localStorage:{setItem(cle,valeur){c.ecrituresLocales.push([cle,JSON.parse(valeur)]);}}});
  const source=lire('page/js/030-memoire.js'),debut=source.indexOf('function writeMem(){'),fin=source.indexOf('/* toutes les écritures',debut);
  assert(debut>=0&&fin>debut,'vraie écriture mémoire présente');vm.runInContext(source.slice(debut,fin),c);
}
// Une sauvegarde globale entre deux images du navigateur doit actualiser la
// MC secondaire avant de vider les écritures différées de chaque machine.
for(const temps of [1.1,1.3]){
  const {c,el}=fixtureMesure();c.MACHINE={};c.SET={on:true,actives:{mc:true}};
  c.choisirSceneMc(2);c.scheduleMc(0,1.2);c.maintenant=temps;chargerEcritureReelle(c);c.writeMem();
  const cible=temps<1.2?0:2;
  assert.equal(c.vidages.length,1);assert.deepStrictEqual(c.vidages[0].mc.pistes.map(p=>p.clip),Array(4).fill(cible),'le bon clip précède le flush');
  assert.deepStrictEqual(clipsChoisis(c),Array(4).fill(cible));assert.equal(c.ecrituresLocales.length,1);
  assert.equal(!!c.MC.depart,temps<1.2,'sauver ne consomme pas un départ encore futur');
  assert(el['mc-scenes'].childNodes[cible].classList.contains('sel'),'la sauvegarde actualise aussi les boutons');
  assert.equal(el['mc-quantifie'].disabled,temps<1.2,'la façade se déverrouille après le départ entendu');
}
{
  const c={memoire:{},S:{modele:'mc'}};vm.createContext(c);chargerEcritureReelle(c);c.writeMem();
  assert.equal(c.vidages.length,1);assert.equal(c.ecrituresLocales.length,1,'writeMem reste utilisable avant l’initialisation de MC');
}

console.log('MC-101 : restauration, copies indépendantes, scènes, demandes annulables, frontière audio de mesure, arrêt, mémoire, SCATTER, arrière-plan et SET OK.');
