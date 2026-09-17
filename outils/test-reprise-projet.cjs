// v180 : coupures logiques de l'ouverture, rejouées dans une NOUVELLE VM.
// À chaque écriture, on photographie seulement les données persistantes. La
// reprise repart de cette photo : aucune exception du pont ne simule un arrêt,
// aucun catch de projetOuvrir ne peut donc « réparer » la coupure photographiée.
// Ceci vérifie le protocole, pas la durabilité OS de WebView/localStorage/fsync.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {atob,btoa}=require('buffer');
const source=n=>fs.readFileSync(path.join(__dirname,'../page/js',n),'utf8');
const JOURNAL='drm16-ouverture.json';
function wav(level){
  const b=Buffer.alloc(52);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(32000,24);
  b.writeUInt32LE(64000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);
  b.writeUInt32LE(8,40);b.writeInt16LE(level,44);b.writeInt16LE(-level,48);return b.toString('base64');
}
const vieuxSon=wav(3000),nouveauSon=wav(17000),autreSon=wav(6000);
const ancien={values:new Map([
  ['drm.reglages','{"bpm":133,"nom":"ancien été 🎛️"}'],
  ['drm.reglages.es1','{"motif":"ancien"}'],
  ['drm.reglages.ancienne','{"garder":true}'],
  ['autre.appli','préservée'],['drm.reglages-autre','sans rapport']]),
  sounds:new Map([['u-existant',vieuxSon],['u-autre',autreSon]]),files:new Map([['notes.txt','à conserver']])};
const documentCible={format:'drm16-projet',version:1,
  memoire:{'drm.reglages':'{"bpm":90,"nom":"nouveau été 🥁"}',
    'drm.reglages.es1':'{"motif":"nouveau"}','drm.reglages.nouvelle':'{"cree":true}'},
  sons:{'u-existant':nouveauSon,'u-nouveau':nouveauSon}};
const texteCible=JSON.stringify(documentCible);
function clone(s){return {values:new Map(s.values),sounds:new Map(s.sounds),files:new Map(s.files)}}
function setup(seed=ancien,options={}){
  const state=clone(seed),cuts=[],events=[];
  function event(kind,name,value,action){
    const info={kind,name,value};events.push(info);
    if(options.before){const response=options.before(info,state);if(response&&response.handled)return response.result;}
    const result=action();cuts.push({event:info,state:clone(state)});
    return options.after?options.after(info,state,result):result;
  }
  const c={MEM:'drm.reglages',S:{run:false},PROJET_EN_COURS:false,TextEncoder,TextDecoder,Date,atob,btoa,
    messages:[],timers:[],stopCalls:0,offTransportPlaying:false,window:{confirm:()=>true},writeMem:()=>true,
    stop(){c.stopCalls++;c.offTransportPlaying=false;c.S.run=false},
    signal(s){c.messages.push(s)},octetsTexte:n=>String(n),
    projetBloquerReprise(){c.playingAtBlock=c.offTransportPlaying;c.blocked=true;c.PROJET_EN_COURS=true;if(c.PROJET_REPRISE.recharger)c.setTimeout(()=>c.location.reload())},
    texteDeB64:b=>Buffer.from(b,'base64').toString('utf8'),
    octetsVersB64:b=>Buffer.from(b).toString('base64'),
    location:{reload(){c.reloads=(c.reloads||0)+1}},setTimeout(fn){c.timers.push(fn);return c.timers.length},
    localStorage:{get length(){return state.values.size},key:i=>[...state.values.keys()][i]??null,
      getItem(k){if(options.storageRead)return options.storageRead(k,state);return state.values.get(k)??null},
      setItem(k,v){return event('memoire-écrire',k,String(v),()=>state.values.set(k,String(v)))},
      removeItem(k){return event('memoire-effacer',k,null,()=>state.values.delete(k))}},
    HOST:{plateforme:'test',
      fichierListe(ext){if(options.fileList)return options.fileList(ext,state);return [...state.files].filter(([n])=>!ext||n.endsWith(ext)).map(([n,v])=>n+'\t'+Buffer.byteLength(v)+'\t0').join('\n')},
      fichierCharger(n){if(options.fileRead)return options.fileRead(n,state);return state.files.has(n)?Buffer.from(state.files.get(n)).toString('base64'):''},
      fichierSauver(n,b){return event('document-écrire',n,Buffer.from(b,'base64').toString('utf8'),()=>{state.files.set(n,Buffer.from(b,'base64').toString('utf8'));return '/documents/'+n})},
      fichierSupprimer(n){return event('document-effacer',n,null,()=>state.files.delete(n))},
      echListe:()=>[...state.sounds.keys()].join('\n'),
      echCharger(n){return options.soundRead?options.soundRead(n,state):state.sounds.get(n)||''},
      echSauver(n,b){return event('son-écrire',n,b,()=>{state.sounds.set(n,b);return true})},
      echSupprimer(n){return event('son-effacer',n,null,()=>state.sounds.delete(n))}},
    ecrireDocument(h,n,b){return h.fichierSauver(n,Buffer.from(b).toString('base64'))}
  };
  vm.createContext(c);
  vm.runInContext(source('015-reprise-projet.js'),c,{filename:'015-reprise-projet.js'});
  vm.runInContext(source('635-projet-drm16.js'),c,{filename:'635-projet-drm16.js'});
  return {c,state,cuts,events,open:()=>c.projetOuvrir(texteCible,'projet été'),boot:()=>c.projetReprendreOuverture()};
}
function etatAttendu(apres){
  const s=clone(ancien);
  if(apres){for(const k of s.values.keys())if(k==='drm.reglages'||k.startsWith('drm.reglages.'))s.values.delete(k);
    for(const [k,v] of Object.entries(documentCible.memoire))s.values.set(k,v);
    for(const [n,b] of Object.entries(documentCible.sons))s.sounds.set(n,b);}
  return s;
}
function identique(s,expected,why){
  assert.deepStrictEqual([...s.values].sort(),[...expected.values].sort(),'mémoire '+why);
  assert.deepStrictEqual([...s.sounds].sort(),[...expected.sounds].sort(),'sons '+why);
  assert.equal(s.files.get('notes.txt'),'à conserver','document extérieur '+why);
}
function sansMutation(t,why){assert(!t.events.some(e=>/^(memoire|son)-/.test(e.kind)),why)}
function reprise(seed,expected,why){
  let s=clone(seed),t;
  for(let tour=0;tour<3;tour++){
    t=setup(s);const ok=t.boot();
    if(ok){identique(t.state,expected,why);assert(!t.state.files.has(JOURNAL),'journal retiré '+why);return t;}
    assert.equal(t.c.PROJET_REPRISE.recharger,true,'reprise doit progresser '+why+': '+t.c.PROJET_REPRISE.erreur);
    assert(t.state.files.has(JOURNAL),'le journal survit aux écritures de restauration '+why);
    identique(t.state,expected,'avant rechargement '+why);s=t.state;
  }
  assert.fail('la reprise boucle après trois démarrages : '+why);
}
const nominal=setup();assert.equal(nominal.open(),true,'ouverture complète');
assert(nominal.state.files.has(JOURNAL),'le journal reste présent avant le prochain démarrage');
identique(nominal.state,etatAttendu(true),'ouverture nominale');
const journalApres=JSON.parse(nominal.state.files.get(JOURNAL));
assert.equal(journalApres.phase,'apres');assert.equal(journalApres.version,1);
assert.equal(typeof journalApres.avant.nom,'string');assert.equal(typeof journalApres.apres.nom,'string');
assert(nominal.state.files.has(journalApres.avant.nom));assert(nominal.state.files.has(journalApres.apres.nom));
assert(journalApres.avant.taille>0);assert(journalApres.apres.taille>0);
assert.notEqual(journalApres.avant.crc,undefined);assert.notEqual(journalApres.apres.crc,undefined);
reprise(nominal.state,etatAttendu(true),'commit complet');

// Chaque frontière d'écriture réelle est une interruption possible. Tant que
// le commit n'est pas écrit on revient à l'ancien ; après, on termine le nouveau.
let interruptions=0,reinterruptions=0,avantPartiel;
for(const cut of nominal.cuts){
  const j=cut.state.files.has(JOURNAL)?JSON.parse(cut.state.files.get(JOURNAL)):null;
  const expected=etatAttendu(!!j&&j.phase==='apres');
  reprise(cut.state,expected,cut.event.kind+' '+cut.event.name);interruptions++;
  if(j&&j.phase==='avant'&&cut.event.kind==='son-écrire')avantPartiel=cut.state;
  if(j){
    const t=setup(cut.state);t.boot();
    // Une seconde coupure pendant la réparation repart encore d'une VM neuve.
    for(const second of t.cuts){reprise(second.state,expected,'seconde coupure '+second.event.kind);reinterruptions++;}
  }
}
assert(avantPartiel,'une vraie ouverture a écrit un son avant son commit');
for(const kind of ['memoire-écrire','memoire-effacer','son-écrire','document-écrire'])
  assert(nominal.cuts.some(c=>c.event.kind===kind),'frontière couverte : '+kind);
assert(reinterruptions>0,'coupures durant la restauration réellement exercées');
console.log('Reprise projets : '+interruptions+' interruptions et '+reinterruptions+' secondes interruptions, décisions avant/après et convergence vérifiées.');

// Même après un commit, mémoire et sons peuvent avoir une persistance partielle
// indépendante. La copie cible vérifiée permet de terminer, puis revérifier.
for(const part of ['memoire','sons','les-deux']){
  const s=clone(nominal.state);
  if(part!=='sons')s.values=new Map(ancien.values);
  if(part!=='memoire')s.sounds=new Map(ancien.sounds);
  reprise(s,etatAttendu(true),'commit avec persistance partielle '+part);
}

// Un journal invalide ou une copie absente/altérée bloque, sans remplacer la
// mémoire ni les sons. Les sauvegardes sont conservées pour une intervention.
for(const mauvais of ['', '{', 'null', '[]', '{}', JSON.stringify({...journalApres,version:99}),
  JSON.stringify({...journalApres,phase:'inconnue'}),
  JSON.stringify({...journalApres,avant:{...journalApres.avant,nom:'../secours.drm16'}})]){
  const s=clone(avantPartiel);s.files.set(JOURNAL,mauvais);
  const t=setup(s);assert.equal(t.boot(),false,'journal invalide '+mauvais);
  sansMutation(t,'journal invalide sans mutation');identique(t.state,s,'journal invalide');
  assert(t.state.files.has(JOURNAL));assert(t.c.PROJET_REPRISE.erreur);
}
for(const phase of ['avant','apres'])for(const corruption of ['absent','tronque','octet','taille','crc']){
  const s=clone(phase==='avant'?avantPartiel:nominal.state),j=JSON.parse(s.files.get(JOURNAL)),ref=j[phase];
  if(corruption==='absent')s.files.delete(ref.nom);
  if(corruption==='tronque')s.files.set(ref.nom,s.files.get(ref.nom).slice(0,-1));
  if(corruption==='octet')s.files.set(ref.nom,s.files.get(ref.nom).replace('été','èté'));
  if(corruption==='taille'){ref.taille++;s.files.set(JOURNAL,JSON.stringify(j));}
  if(corruption==='crc'){ref.crc=typeof ref.crc==='number'?(ref.crc^1)>>>0:'00000000';s.files.set(JOURNAL,JSON.stringify(j));}
  const t=setup(s);assert.equal(t.boot(),false,'copie '+phase+' '+corruption);sansMutation(t,'copie refusée avant mutation');
  identique(t.state,s,'copie abîmée');assert(t.state.files.has(JOURNAL));assert(t.c.PROJET_REPRISE.erreur);
}
console.log('Reprise projets : commit partiellement persisté complété ; journaux invalides, copies absentes/tronquées, taille et CRC altérés bloqués sans mutation.');

// Les refus réels doivent conserver le journal et arrêter l'application. Une
// nouvelle tentative, une fois le refus levé, peut terminer sans perte.
for(const refus of ['quota','son','faux-succes-son','suppression-son','faux-succes-suppression-son','suppression-journal','faux-succes-suppression-journal']){
  const s=clone(avantPartiel);
  // Garder une nouveauté cible garantit que le retrait du son est exercé.
  s.sounds.set('u-nouveau',nouveauSon);
  const options={before(e){
    if(refus==='quota'&&e.kind==='memoire-écrire')throw Error('QuotaExceededError');
    if(refus==='son'&&e.kind==='son-écrire')return {handled:true,result:false};
    if(refus==='faux-succes-son'&&e.kind==='son-écrire')return {handled:true,result:true};
    if(refus==='suppression-son'&&e.kind==='son-effacer')return {handled:true,result:false};
    if(refus==='faux-succes-suppression-son'&&e.kind==='son-effacer')return {handled:true,result:true};
    if(refus==='suppression-journal'&&e.kind==='document-effacer'&&e.name===JOURNAL)return {handled:true,result:false};
    if(refus==='faux-succes-suppression-journal'&&e.kind==='document-effacer'&&e.name===JOURNAL)return {handled:true,result:true};
  }};
  // La suppression du journal n'arrive qu'au démarrage qui constate l'état
  // déjà cohérent. Faire le premier passage sans faute pour ce seul cas.
  let seed=s;
  if(refus.includes('journal')){const first=setup(seed);assert.equal(first.boot(),false);assert(first.c.PROJET_REPRISE.recharger);seed=first.state;}
  const t=setup(seed,options);assert.equal(t.boot(),false,refus);assert(t.state.files.has(JOURNAL),refus+' conserve journal');
  assert(t.c.PROJET_REPRISE.erreur,refus+' donne une erreur');assert(!t.c.PROJET_REPRISE.recharger,refus+' ne boucle pas automatiquement');
  reprise(t.state,etatAttendu(false),'refus levé '+refus);
}

// Une suppression ciblée n'enlève jamais un son ajouté hors transaction après
// l'arrêt. Les clés hors préfixe, elles aussi, traversent toutes les reprises.
{
 const s=clone(avantPartiel);s.sounds.set('u-ajoute-apres',autreSon);
 const expected=etatAttendu(false);expected.sounds.set('u-ajoute-apres',autreSon);
 reprise(s,expected,'son extérieur à la transaction');
}

// Échec d'écriture/relecture du journal initial : aucune première mutation de
// mémoire/son. Un pont qui dit avoir écrit sans rien écrire est aussi refusé.
for(const refus of ['ecriture','faux-succes','relecture']){
 const options={before(e){if(e.kind==='document-écrire'&&e.name===JOURNAL){
   if(refus==='ecriture')return {handled:true,result:''};
   if(refus==='faux-succes')return {handled:true,result:'/documents/'+JOURNAL};
 }} ,fileRead(n,s){if(n===JOURNAL&&refus==='relecture'&&s.files.has(n))return Buffer.from('{').toString('base64');return s.files.has(n)?Buffer.from(s.files.get(n)).toString('base64'):''}};
 const t=setup(ancien,options);assert.equal(t.open(),false,'journal initial '+refus);sansMutation(t,'journal initial '+refus);identique(t.state,ancien,'journal initial refusé');
}

// Le passage « après » peut lui-même échouer ou être relu incorrectement.
// L'état relu au prochain démarrage décide : ancien si seul « avant » a été
// écrit, nouveau si le commit est effectivement présent malgré le refus reçu.
for(const refus of ['ecriture','faux-succes','relecture','exception-apres-ecriture']){
 const options={before(e){if(e.kind==='document-écrire'&&e.name===JOURNAL&&JSON.parse(e.value).phase==='apres'){
   if(refus==='ecriture')return {handled:true,result:''};
   if(refus==='faux-succes')return {handled:true,result:'/documents/'+JOURNAL};
 }},after(e,s,result){if(refus==='exception-apres-ecriture'&&e.kind==='document-écrire'&&e.name===JOURNAL&&JSON.parse(e.value).phase==='apres')throw Error('réponse du pont interrompue');return result},
 fileRead(n,s){const text=s.files.get(n);if(refus==='relecture'&&n===JOURNAL&&text&&JSON.parse(text).phase==='apres')return Buffer.from('{').toString('base64');return text===undefined?'':Buffer.from(text).toString('base64')}};
 const t=setup(ancien,options);assert.equal(t.open(),false,'commit refusé '+refus);assert(!t.c.messages.includes('PROJET OUVERT'));
 const j=t.state.files.has(JOURNAL)?JSON.parse(t.state.files.get(JOURNAL)):null;
 reprise(t.state,etatAttendu(!!j&&j.phase==='apres'),'commit refusé puis reprise '+refus);
 for(const cut of t.cuts){const jc=cut.state.files.has(JOURNAL)?JSON.parse(cut.state.files.get(JOURNAL)):null;
   reprise(cut.state,etatAttendu(!!jc&&jc.phase==='apres'),'coupure autour du commit '+refus);}
}

// Erreur ordinaire après des mutations : la vraie fonction peut restaurer.
// Photographier ses écritures de rollback exerce également les coupures de ce
// chemin ; le protocole doit toujours reprendre vers la copie avant.
{
 let refuse=false;
 const t=setup(ancien,{before(e){if(!refuse&&e.kind==='son-écrire'&&e.name==='u-nouveau'){refuse=true;return {handled:true,result:false}}}});
 assert.equal(t.open(),false);assert(refuse);assert(!t.c.messages.includes('PROJET OUVERT'));
 for(const cut of t.cuts){const j=cut.state.files.get(JOURNAL);if(j&&JSON.parse(j).phase==='avant')reprise(cut.state,etatAttendu(false),'coupure du rollback');}
 reprise(t.state,etatAttendu(false),'fin du rollback');
}
console.log('Reprise projets : quota, refus et faux succès des sons/suppressions, journal refusé/non relu, coupures du rollback et nouvelle tentative sans boucle OK.');

// CRC32 standard : une constante indépendante évite qu'un même défaut dans
// l'écriture et la lecture ne fasse accepter toutes les empreintes produites.
{
 const t=setup();assert.equal(t.c.projetEmpreinte(new TextEncoder().encode('123456789')),'cbf43926');
}

// Sous Windows, Kick et kick peuvent désigner le même fichier. Refuser aussi
// bien les doublons internes au projet que l'alias d'un son déjà présent,
// avant de créer les copies ou de toucher à la bibliothèque.
for(const collision of ['projet','bibliotheque']){
 const seed=clone(ancien),d=JSON.parse(texteCible);
 if(collision==='projet')d.sons={Kick:nouveauSon,kick:autreSon};
 else {seed.sounds.set('Kick',vieuxSon);d.sons={kick:nouveauSon};}
 const t=setup(seed);
 assert.equal(t.c.projetOuvrir(JSON.stringify(d),'noms ambigus'),false,collision);
 sansMutation(t,'collision de casse '+collision);identique(t.state,seed,'collision de casse '+collision);
 assert.deepStrictEqual([...t.state.files],[...seed.files],'aucune copie créée pour '+collision);
 assert(!t.c.messages.includes('PROJET OUVERT'));assert.equal(t.c.timers.length,0);
}

// Un ancien journal peut décrire ce cas ambigu. Le fabriquer avec les vraies
// fonctions de référence et d'écriture lui donne des CRC valides : le refus
// doit alors venir des noms, avant toute restauration ou suppression de son.
{
 const fabrique=setup(avantPartiel),j=JSON.parse(fabrique.state.files.get(JOURNAL));
 const sauvegarde=JSON.parse(fabrique.state.files.get(j.avant.nom));
 sauvegarde.sons.Kick=vieuxSon;
 fabrique.state.files.set(j.avant.nom,JSON.stringify(sauvegarde));
 j.avant=fabrique.c.projetReference(j.avant.nom,sauvegarde);j.sons=['kick'];
 fabrique.c.projetEcrireJournal(j);
 assert.equal(fabrique.c.projetLireJournal().phase,'avant','journal valide et relisible');
 const seed=clone(fabrique.state),t=setup(seed);
 assert.equal(t.boot(),false);sansMutation(t,'reprise avec alias de casse');
 identique(t.state,seed,'reprise ambiguë sans perte');assert.deepStrictEqual([...t.state.files],[...seed.files]);
 assert(t.state.files.has(JOURNAL));assert(t.c.PROJET_REPRISE.erreur.includes('même son'));
 assert.equal(t.c.PROJET_REPRISE.secours,j.avant.nom);assert.equal(t.c.PROJET_REPRISE.recharger,false);
}
console.log('Reprise projets : CRC32 connu, collisions Kick/kick entrantes ou existantes, journal valide mais ambigu refusé sans mutation ni perte du secours OK.');

// Ce nom de fichier est légal : l'ancien objet sons={} l'omettait lors de la
// copie de secours. Le son doit être un champ propre, puis retrouver ses octets
// précédents après une coupure, même s'il a été remplacé pendant l'ouverture.
{
 const seed=clone(ancien);seed.sounds.set('__proto__',vieuxSon);
 const cible=JSON.parse(texteCible);
 cible.sons=Object.assign(Object.create(null),cible.sons);
 cible.sons.__proto__=nouveauSon;
 const t=setup(seed);assert.equal(t.c.projetOuvrir(JSON.stringify(cible),'son nommé __proto__'),true);
 const j=JSON.parse(t.state.files.get(JOURNAL)),secours=JSON.parse(t.state.files.get(j.avant.nom));
 assert(Object.prototype.hasOwnProperty.call(secours.sons,'__proto__'),'son présent dans le secours');
 assert.equal(secours.sons.__proto__,vieuxSon);assert.equal(t.state.sounds.get('__proto__'),nouveauSon);
 const apres=etatAttendu(true);apres.sounds.set('__proto__',nouveauSon);
 let sonInterrompu=false;
 for(const cut of t.cuts){
   const phase=cut.state.files.has(JOURNAL)?JSON.parse(cut.state.files.get(JOURNAL)).phase:'avant';
   reprise(cut.state,phase==='apres'?apres:seed,'son __proto__ '+cut.event.kind);
   if(cut.event.kind==='son-écrire'&&cut.event.name==='__proto__')sonInterrompu=true;
 }
 assert(sonInterrompu,'coupure après remplacement du son spécial exercée');
}

// Kaoss/looper peuvent jouer alors que S.run est faux. L'arrêt doit précéder la
// copie et être répété avant le blocage pour neutraliser un démarrage tardif.
{
 const t=setup();assert.equal(t.c.S.run,false);t.c.offTransportPlaying=true;
 t.c.writeMem=()=>{assert(t.c.stopCalls>0,'arrêt avant lecture du secours');
   assert.equal(t.c.offTransportPlaying,false,'jeu indépendant arrêté avant secours');
   t.c.offTransportPlaying=true;return true};
 assert.equal(t.open(),true);assert(t.c.stopCalls>=2,'nouvel arrêt avant le voile');
 assert.equal(t.c.playingAtBlock,false);assert.equal(t.c.offTransportPlaying,false);
 assert.equal(t.c.PROJET_EN_COURS,true);assert.equal(t.c.blocked,true);
}
// Un journal illisible est rencontré avant la confirmation et la sauvegarde.
// Ce refus précoce doit lui aussi arrêter tout jeu, puis bloquer l'application.
{
 const seed=clone(ancien);seed.files.set(JOURNAL,'{');
 const t=setup(seed);t.c.offTransportPlaying=true;assert.equal(t.c.S.run,false);
 assert.equal(t.open(),false);assert(t.c.stopCalls>0);assert.equal(t.c.playingAtBlock,false);
 assert.equal(t.c.offTransportPlaying,false);assert.equal(t.c.PROJET_EN_COURS,true);assert(t.c.blocked);
 sansMutation(t,'journal précoce corrompu');identique(t.state,seed,'refus précoce');
 assert.deepStrictEqual([...t.state.files],[...seed.files]);assert.equal(t.c.timers.length,0);
}
console.log('Reprise projets : son __proto__ conservé et restauré à chaque coupure ; jeu hors transport arrêté avant sauvegarde et blocage, y compris sur journal corrompu précoce OK.');

// v181 : le pont distingue une erreur d'accès (null) d'une absence ("").
for(const panne of ['lecture-journal','liste-documents','lecture-secours','lecture-son','liste-sons']){
 const seed=panne==='liste-documents'?ancien:avantPartiel;
 const options={};
 if(panne==='lecture-journal')options.fileRead=()=>null;
 if(panne==='liste-documents')options.fileList=()=>null;
 if(panne==='lecture-secours')options.fileRead=(n,s)=>n.endsWith('.drm16')?null:s.files.has(n)?Buffer.from(s.files.get(n)).toString('base64'):'';
 if(panne==='lecture-son')options.soundRead=()=>null;
 const t=setup(seed,options);
 if(panne==='liste-sons'){
  // Le son ajouté par le projet n'a pas d'équivalent dans l'ancien : sa
  // suppression ne peut être confirmée si la liste est inaccessible.
  t.state.sounds.delete('u-nouveau');
  t.c.HOST.echListe=()=>null;
 }
 assert.equal(t.boot(),false,panne+' bloque la reprise');
 assert(t.c.PROJET_REPRISE.erreur,panne+' explique le refus');
 assert(!t.c.PROJET_REPRISE.recharger,panne+' pas de rechargement aveugle');
 assert(!t.events.some(e=>e.kind==='document-effacer'),panne+' conserve le suivi');
 if(panne!=='liste-sons')sansMutation(t,panne+' sans mutation');
}
// Même après un effacement annoncé réussi, un refus de relecture empêche de
// déclarer la restauration terminée, bien que la liste soit devenue vide.
{
 let efface=false;
 const t=setup(nominal.state,{
  after(e,s,result){if(e.kind==='document-effacer'&&e.name===JOURNAL)efface=true;return result;},
  fileRead(n,s){if(efface&&n===JOURNAL)return null;return s.files.has(n)?Buffer.from(s.files.get(n)).toString('base64'):'';}
 });
 assert.equal(t.boot(),false,'relecture après suppression refusée');
 assert(efface);assert(t.c.PROJET_REPRISE.erreur);sansMutation(t,'fin de reprise refusée');
 identique(t.state,etatAttendu(true),'refus après suppression');
 reprise(t.state,etatAttendu(true),'accès rétabli après suppression');
}
console.log('Reprise v181 : lectures/listes natives indéterminées bloquées, y compris après suppression du suivi ; nouvel essai possible.');
