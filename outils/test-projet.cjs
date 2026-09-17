// Les vrais points d'entrée du projet : sauvegarde de secours et restauration.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{atob,btoa}=require('buffer');
const js=n=>fs.readFileSync(path.join(__dirname,'../page/js/',n),'utf8');
const production=js('015-reprise-projet.js')+'\n'+js('635-projet-drm16.js'),es=js('280-electribe-es-1.js');
const encode={};vm.createContext(encode);
vm.runInContext(es.slice(es.indexOf('function wavDe('),es.indexOf('function b64De(')),encode);
function wav(note=.25){return Buffer.from(encode.wavDe({length:4,sampleRate:32000,getChannelData:()=>[note,0,-note,0]})).toString('base64');}
const oldWav=wav(.25),newWav=wav(.75);
// Les retours tardifs du réseau et du MIDI ne doivent pas réécrire les données
// remplacées par un projet pendant que le rechargement est encore en attente.
{
 const extract=(name,start,end)=>{const source=js(name);return source.slice(source.indexOf(start),source.indexOf(end));};
 const guarded=[
  extract('330-enregistreur-midi.js','function enrEcrire(){','function enrDemarrer(){'),
  extract('620-la-collection-archive-org.js','function arcGarder(){','function arcListeMachines(){'),
  extract('280-electribe-es-1.js','function supprimerEch(id){','function poserEch(k, buf, quoi){'),
  extract('310-midi.js','window.__midi = function(a,b,c){','function majPlayEm(){'),
  extract('310-midi.js','window.__midiEtat = function(e){','function chercherMidi(){')
 ].join('\n');
 const kept=new Map(),calls=[];
 const c={MEM:'drm.reglages',window:{},ENR:{canaux:{0:'ancien'},prises:[{nom:'ancienne'}]},ARC:{machines:['ancienne']},
  localStorage:{setItem(k,v){calls.push(['mémoire',k]);kept.set(k,v)}},
  HOST:{echSupprimer(id){calls.push(['son',id])}},ES_CHARGES:{test:true},
  ES:{buf:{test:true},inv:{test:true},noms:{test:'ancien'}},actualiserEchs(){calls.push(['affichage'])}};
 vm.createContext(c);vm.runInContext(guarded,c);
 // Sans drapeau (petits contextes de tests) les écritures continuent à marcher.
 c.enrEcrire();c.arcGarder();assert.equal(kept.size,3);
 c.PROJET_EN_COURS=true;calls.length=0;kept.clear();
 c.enrEcrire();c.arcGarder();c.supprimerEch('test');
 // Les autres états MIDI sont volontairement absents : aucune consultation
 // ni transmission, même partielle, ne doit se produire après ce verrou.
 c.window.__midi(0x90,60,127);c.window.__midi(0xFA,0,0);
 c.window.__midiEtat({evt:'ouvert',ouvert:1,appareils:[{id:1,nom:'tardif'}]});
 assert.deepStrictEqual(calls,[]);assert.equal(kept.size,0);
 assert(c.ES_CHARGES.test);assert(c.ES.buf.test);assert(c.ES.inv.test);assert.equal(c.ES.noms.test,'ancien');
 c.PROJET_EN_COURS=false;c.supprimerEch('test');
 assert.deepStrictEqual(calls,[['son','test'],['affichage']]);assert(!c.ES.buf.test);
 console.log('Projets : callbacks MIDI, prises, catalogue et suppression de sons bloqués pendant le remplacement OK.');
}
function documentProjet(sons={}) {return JSON.stringify({format:'drm16-projet',version:1,
  memoire:{'drm.reglages':'{"bpm":90}','drm.reglages.es1':'{"motif":"nouveau"}'},sons});}
function setup(){
  const values=new Map([['drm.reglages','{"bpm":133}'],['drm.reglages.es1','{"motif":"ancien"}'],['autre.appli','garder']]);
  const sounds=new Map([['u-existant',oldWav]]),files=new Map();
  const before=[...values],beforeSounds=[...sounds];
  const c={MEM:'drm.reglages',S:{run:false},PROJET_EN_COURS:false,TextEncoder,TextDecoder,Date,
    messages:[],timers:[],attempts:[],fileWrites:[],fileReads:[],fileLists:[],blocked:0,backupFail:false,storageFail:false,soundFail:'',unreadable:'',listFail:false,
    window:{confirm:()=>true},writeMem(){},octetsTexte:n=>String(n),signal(s){c.messages.push(s)},
    stop(){c.S.run=false},location:{reload(){c.reloaded=true}},setTimeout(fn){c.timers.push(fn)},
    projetBloquerReprise(){c.blocked++;if(c.PROJET_REPRISE.recharger)c.setTimeout(()=>c.location.reload())},
    atob,btoa,
    localStorage:{get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,
      removeItem:k=>values.delete(k),setItem(k,v){if(c.storageFail&&v.includes('nouveau'))throw Error('QuotaExceededError');values.set(k,v)}},
    HOST:{plateforme:'test',
      fichierSauver(n,b){c.fileWrites.push(n);if(c.backupFail)return '';files.set(n,Buffer.from(b,'base64').toString('utf8'));return '/documents/'+n},
      fichierSupprimer:n=>files.delete(n),
      fichierListe(ext){c.fileLists.push(ext);if(c.fileListFail)throw Error('liste des documents refusée');
        return [...files].filter(([n])=>!ext||n.endsWith(ext)).map(([n,v])=>n+'\t'+Buffer.byteLength(v)+'\t0').join('\n')},
      fichierCharger(n){c.fileReads.push(n);const bytes=Buffer.from(files.get(n)||'','utf8');
        return c.readBack?c.readBack(bytes,n):bytes.toString('base64')},
      echListe(){if(c.listFail)throw Error('lecture impossible');return [...sounds.keys()].join('\n')},
      echCharger:n=>c.unreadable===n?'':sounds.get(n)||'',
      echSauver(n,b){c.attempts.push(n);if(c.soundFail===n)return false;sounds.set(n,b);return true},
      echSupprimer:n=>sounds.delete(n)},
    ecrireDocument(h,n,bytes){c.fileWrites.push(n);if(c.backupFail)return '';files.set(n,new TextDecoder().decode(bytes));return '/documents/'+n}
  };
  vm.createContext(c);vm.runInContext(production,c);
  return {c,values,sounds,files,before,beforeSounds};
}
function unchanged(t,pending=false,reload=pending){assert.deepStrictEqual([...t.values].sort(),[...t.before].sort());assert.deepStrictEqual([...t.sounds].sort(),[...t.beforeSounds].sort());
  assert.equal(t.c.PROJET_EN_COURS,pending);assert.equal(t.c.timers.length,reload?1:0);assert(!t.c.messages.includes('PROJET OUVERT'));}
function transaction(t,phase,sons){
  assert.equal(t.files.size,3,'deux instantanés et leur journal');
  const journal=JSON.parse(t.files.get('drm16-ouverture.json'));
  assert.equal(journal.version,1);assert.equal(journal.phase,phase);
  assert.deepStrictEqual(journal.sons.sort(),Object.keys(sons).sort());
  const before=JSON.parse(t.files.get(journal.avant.nom)),after=JSON.parse(t.files.get(journal.apres.nom));
  assert(journal.avant.nom.startsWith('avant-ouverture-'));assert(journal.apres.nom.startsWith('ouverture-verifiee-'));
  assert.deepStrictEqual(before.memoire,Object.fromEntries(t.before.filter(([k])=>k==='drm.reglages'||k.startsWith('drm.reglages.'))));
  assert.deepStrictEqual(before.sons,Object.fromEntries(t.beforeSounds));
  assert.deepStrictEqual(after.memoire,JSON.parse(documentProjet()).memoire);assert.deepStrictEqual(after.sons,sons);
  for(const ref of [journal.avant,journal.apres])assert.equal(ref.taille,Buffer.byteLength(t.files.get(ref.nom)));
  return journal;
}

// Deux sauvegardes à la même seconde gardent chacune leur contenu, y compris
// pour le préfixe réservé aux sauvegardes de secours avant ouverture.
for(const prefix of ['projet','avant-ouverture']){
 const t=setup(),{c}=t;c.projetHorodatage=()=> 'meme-date';
 const first=c.projetEnregistrer(prefix);assert.equal(first,prefix+'-meme-date.drm16');
 const firstBytes=t.files.get(first);
 t.values.set('drm.reglages','{"bpm":144}');
 const second=c.projetEnregistrer(prefix);
 assert.equal(second,prefix+'-meme-date-2.drm16');assert.equal(t.files.size,2);
 assert.equal(t.files.get(first),firstBytes);assert.equal(JSON.parse(t.files.get(second)).memoire['drm.reglages'],'{"bpm":144}');
 assert.deepStrictEqual(c.fileReads,[first,second]);assert.deepStrictEqual(c.fileLists,['','']);
}
// Windows ignore la casse des noms. La liste doit comprendre toutes les
// extensions : filtrer seulement ".drm16" ferait disparaître ".DRM16".
{
 const t=setup(),{c}=t;c.projetHorodatage=()=> 'meme-date';
 t.files.set('PROJET-MEME-DATE.DRM16','ancien premier');
 t.files.set('projet-meme-date-2.DRM16','ancien deuxième');
 const saved=c.projetEnregistrer('projet');assert.equal(saved,'projet-meme-date-3.drm16');
 assert.equal(t.files.get('PROJET-MEME-DATE.DRM16'),'ancien premier');
 assert.equal(t.files.get('projet-meme-date-2.DRM16'),'ancien deuxième');assert.equal(t.files.size,3);
 assert.deepStrictEqual(c.fileLists,['']);
}
// Le choix du nom doit porter sur le préfixe déjà assaini, celui qui arrivera
// réellement au pont natif ; les caractères de chemin ne peuvent le contourner.
{
 const t=setup(),{c}=t;c.projetHorodatage=()=> 'meme-date';
 const prefix='../projet spécial:/été';
 const first=c.projetEnregistrer(prefix),firstBytes=t.files.get(first);
 assert(first);assert(/^[A-Za-z0-9_.-]+$/.test(first));assert(!first.includes('/'));
 t.values.set('drm.reglages','{"bpm":145}');
 const second=c.projetEnregistrer(prefix);
 assert.equal(second,first.replace(/\.drm16$/,'-2.drm16'));assert.equal(t.files.get(first),firstBytes);
 assert.equal(t.files.size,2);assert.deepStrictEqual(c.fileReads,[first,second]);
}
// La relecture vérifie des octets UTF-8 réels, pas des caractères Latin-1 ni
// une simple équivalence JSON : accents, nom de son et emoji restent intacts.
{
 const t=setup(),{c}=t;
 const settings=JSON.stringify({bpm:133,nom:'été 🎛️ – caisse claire',noms:{'u-existant':'Échantillon 🥁'}});
 t.values.set('drm.reglages',settings);
 const saved=c.projetEnregistrer('projet');assert(saved);assert.equal(c.fileWrites.length,1);
 assert.deepStrictEqual(c.fileReads,[saved]);assert.equal(JSON.parse(t.files.get(saved)).memoire['drm.reglages'],settings);
 assert(c.messages.at(-1).startsWith('PROJET ENREGISTRÉ'));
}
// Sans capacités de liste/écriture/relecture, aucune sauvegarde fiable n'est
// possible. L'ouverture doit elle aussi s'arrêter avant les premières mutations.
for(const missing of ['fichierSauver','fichierListe','fichierCharger']){
 for(const open of [false,true]){
  const t=setup(),{c}=t;delete c.HOST[missing];
  assert.equal(open?c.projetOuvrir(documentProjet({'u-existant':newWav}),'test'):c.projetEnregistrer('projet'),open?false:'',missing);
  unchanged(t);assert.equal(t.files.size,0);assert.equal(c.fileWrites.length,0);
  assert(!c.messages.some(m=>m.startsWith('PROJET ENREGISTRÉ')));
 }
}
for(const open of [false,true]){
 const t=setup(),{c}=t;c.fileListFail=true;
 assert.equal(open?c.projetOuvrir(documentProjet({'u-existant':newWav}),'test'):c.projetEnregistrer('projet'),open?false:'');
 // Une liste illisible empêche aussi de savoir si un journal attend déjà.
 // L'ouverture reste bloquée sans recharger, la sauvegarde seule reste libre.
 unchanged(t,open,false);assert.equal(c.blocked,open?1:0);assert.equal(c.fileWrites.length,0);assert.equal(t.files.size,0);
}
// Un pont peut annoncer une écriture réussie alors que le fichier ne peut
// plus être relu. Même un JSON équivalent ou un ajout blanc ne vaut pas une
// copie identique. Garder le fichier suspect permet de diagnostiquer le refus.
const readFailures={
 vide:()=>'',
 exception:()=>{throw Error('lecture refusée')},
 base64_invalide:()=> '!!!',
 tronque:bytes=>bytes.subarray(0,bytes.length-1).toString('base64'),
 octet_change:bytes=>Buffer.from(bytes.toString('utf8').replace('133','134'),'utf8').toString('base64'),
 ajout_espace:bytes=>Buffer.concat([bytes,Buffer.from(' ')]).toString('base64'),
 accent_change:bytes=>Buffer.from(bytes.toString('utf8').replace('été','èté'),'utf8').toString('base64'),
 json_equivalent:bytes=>Buffer.from(bytes.toString('utf8').replace('été','\\u00e9té'),'utf8').toString('base64')
};
for(const [failure,readBack] of Object.entries(readFailures)){
 for(const open of [false,true]){
  const t=setup(),{c}=t;
  t.values.set('drm.reglages',JSON.stringify({bpm:133,nom:'été 🎛️'}));t.before=[...t.values];
  // Ce groupe vise la copie de secours ; la lecture préalable du journal
  // absent fonctionne normalement. Ses propres pannes ont leurs tests dédiés.
  c.readBack=(bytes,n)=>n.endsWith('.drm16')?readBack(bytes,n):bytes.toString('base64');
  assert.equal(open?c.projetOuvrir(documentProjet({'u-existant':newWav,'u-nouveau':newWav}),'test'):c.projetEnregistrer('projet'),open?false:'',failure);
  unchanged(t);assert.equal(c.attempts.length,0);assert.equal(c.fileReads.filter(n=>n.endsWith('.drm16')).length,1);
  assert.equal(c.fileReads.length,open?2:1);
  assert.equal(t.files.size,1,'le fichier suspect reste disponible : '+failure);
  assert.equal(c.fileWrites.length,1);assert(!c.reloaded);assert(!c.messages.some(m=>m.startsWith('PROJET ENREGISTRÉ')));
  assert(c.messages.at(-1),'le refus doit être signalé : '+failure);
 }
}
console.log('Projets : collisions à la seconde et Windows sans écrasement, préfixe assaini, UTF-8 intact, liste/relecture refusées et 8 fichiers relus non identiques sans mutation OK.');

// Parcours nominal : les deux copies restent disponibles et le journal validé
// annonce le nouvel état jusqu'à sa vérification au prochain démarrage.
{
 const t=setup(),{c}=t;
 assert.equal(c.projetOuvrir(documentProjet({'u-existant':newWav,'u-nouveau':newWav}),'test'),true);
 assert.equal(t.values.get('drm.reglages'),' {"bpm":90}'.trim());assert.equal(t.values.get('autre.appli'),'garder');
 assert.equal(t.sounds.get('u-existant'),newWav);assert.equal(t.sounds.get('u-nouveau'),newWav);
 transaction(t,'apres',{'u-existant':newWav,'u-nouveau':newWav});
 assert.equal(c.messages.at(-1),'PROJET OUVERT');assert.equal(c.PROJET_EN_COURS,true);
 assert.equal(c.blocked,1);assert.equal(c.PROJET_REPRISE.erreur,'');assert.equal(c.PROJET_REPRISE.recharger,true);
 assert.equal(c.timers.length,1);c.timers[0]();assert(c.reloaded);
 const attempts=c.attempts.length;assert.equal(c.projetOuvrir(documentProjet(),'second'),false);assert.equal(c.attempts.length,attempts);
}
// Un flush en échec ne permet pas de sauvegarder une ancienne version du
// motif puis d'ouvrir un autre projet en perdant les dernières modifications.
{
 const t=setup();t.c.writeMem=()=>false;
 assert.equal(t.c.projetOuvrir(documentProjet(),'test'),false);unchanged(t);assert.equal(t.files.size,0);
 assert.equal(t.c.projetEnregistrer('projet'), '');assert.equal(t.files.size,0);
}
// Pas de sauvegarde ou sauvegarde incomplète : aucune donnée n'est remplacée.
for(const failure of ['backupFail','unreadable','listFail','oversize']){
 const t=setup();
 if(failure==='unreadable')t.c.unreadable='u-existant';
 else if(failure==='oversize')t.c.PROJET_MAX=65540;
 else t.c[failure]=true;
 assert.equal(t.c.projetOuvrir(documentProjet(),'test'),false,failure);unchanged(t);
 assert.equal(t.c.attempts.length,0);
}
// Refus utilisateur : pas de sauvegarde ni de mutation.
{
 const t=setup();t.c.window.confirm=()=>false;
 assert.equal(t.c.projetOuvrir(documentProjet(),'test'),false);unchanged(t);assert.equal(t.files.size,0);
}
// Quota après une première clé écrite : restaurer toutes les anciennes clés,
// préserver les autres applis, ne pas toucher aux fichiers de sons.
{
 const t=setup();t.c.storageFail=true;
 assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':newWav}),'test'),false);unchanged(t,true);
 assert.equal(t.c.attempts.length,0);transaction(t,'avant',{'u-existant':newWav});
 assert(t.c.messages.at(-1).includes('ÉTAT PRÉCÉDENT RESTAURÉ'));assert.equal(t.c.blocked,1);
 t.c.timers[0]();assert(t.c.reloaded);
}
// Un son refuse l'écriture après deux réussites : remettre l'original et
// retirer le nouveau fichier, puis restaurer les réglages précédents.
{
 const t=setup();t.c.soundFail='u-refuse';
 assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':newWav,'u-nouveau':newWav,'u-refuse':newWav}),'test'),false);
 unchanged(t,true);transaction(t,'avant',{'u-existant':newWav,'u-nouveau':newWav,'u-refuse':newWav});
 assert(t.c.attempts.includes('u-existant'));assert.equal(t.c.blocked,1);
 t.c.timers[0]();assert(t.c.reloaded);
}
// Si le système refuse aussi la restauration, indiquer le vrai fichier de
// secours ; ne jamais annoncer une réussite ni recharger la page.
{
 const t=setup();let changed=false;
 t.c.HOST.echSauver=(n,b)=>{if(n==='u-refuse')return false;if(n==='u-existant'&&changed)return false;changed=true;t.sounds.set(n,b);return true;};
 assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':newWav,'u-refuse':newWav}),'test'),false);
 assert(t.c.messages.at(-1).includes('RESTAURATION À TERMINER · avant-ouverture-'));
 assert.equal(t.c.timers.length,0);assert.equal(t.c.PROJET_EN_COURS,true);assert.equal(t.c.blocked,1);
 transaction(t,'avant',{'u-existant':newWav,'u-refuse':newWav});
 assert(t.c.PROJET_REPRISE.erreur);assert(t.c.PROJET_REPRISE.secours.startsWith('avant-ouverture-'));assert(!t.c.reloaded);
}
// Le validateur accepte le vrai WAV de l'application, y compris les chunks
// supplémentaires, et refuse les signatures tronquées et les tailles fausses.
{
 const {c}=setup();assert(c.projetWavValide(newWav));
 const original=Buffer.from(newWav,'base64'),extra=Buffer.alloc(original.length+10);
 original.copy(extra,0,0,12);extra.write('JUNK',12);extra.writeUInt32LE(1,16);extra[20]=10;
 original.copy(extra,22,12);extra.writeUInt32LE(extra.length-8,4);assert(c.projetWavValide(extra.toString('base64')));
 const wrongSize=Buffer.from(original);wrongSize.writeUInt32LE(90000,40);
 for(const value of ['UklGR!!!!','UklGR',Buffer.from('RIFF----pas un son').toString('base64'),wrongSize.toString('base64')]){
   const t=setup();assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':value}),'abîmé'),false);unchanged(t);assert.equal(t.files.size,0);
 }
 for(const name of ['.','..','../x']){assert.equal(typeof c.projetValider(documentProjet({[name]:newWav})),'string');}
 for(const wrong of ['null','[]','3']){const d=JSON.parse(documentProjet());d.memoire['drm.reglages']=wrong;assert.equal(typeof c.projetValider(JSON.stringify(d)),'string');}
}
console.log('Projets : succès avec secours complet, quota et sons refusés restaurés, secours indisponible sans mutation, restauration impossible signalée, WAV réel/chunks/son abîmé et double ouverture OK.');

// Un WAV personnel de 4 Mo reste sous le plafond d'un projet. La validation
// doit fonctionner sans regex récursive, avec le décodeur Base64 strict.
{
 const {c}=setup(),samples=new Float32Array(2048000);
 const big=Buffer.from(encode.wavDe({length:samples.length,sampleRate:32000,getChannelData:()=>samples}));
 assert.equal(big.length,4096044);
 const b64=big.toString('base64'),doc=documentProjet({'u-long':b64});
 assert(Buffer.byteLength(doc)<c.PROJET_MAX);
 assert.doesNotThrow(()=>assert.equal(c.projetWavValide(b64),true));
 assert.equal(typeof c.projetValider(doc),'object');
 // Ni caractères étrangers, ni remplissage interne ou excessif, ni quartet tronqué.
 for(const bad of [b64.slice(0,20)+'='+b64.slice(21),b64+'=',b64.slice(0,-4)+'====',b64.slice(0,-1),b64.slice(0,20)+'!'+b64.slice(21)]){
   assert.doesNotThrow(()=>assert.equal(c.projetWavValide(bad),false));
 }
 console.log('Projets : vrai WAV de4 Mo accepté sans débordement de pile ; alphabet, padding et longueur Base64 invalides refusés OK.');
}

// v181 : une liste native nulle indique un refus, jamais un kit vide.
for(const valeur of [null,undefined]){
 const t=setup();t.c.HOST.echListe=()=>valeur;
 assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':newWav}),'liste refusée'),false);
 unchanged(t);assert.equal(t.files.size,0);assert.equal(t.c.attempts.length,0);
 assert(t.c.messages.some(m=>m.includes('SECOURS INCOMPLÈTE')));
 assert(t.c.projetContenu().erreurs.includes('liste des sons'));
}
// Une absence réelle de sons est en revanche un cas valide.
{
 const t=setup();t.sounds.clear();t.beforeSounds=[];
 assert.equal(t.c.projetOuvrir(documentProjet(),'sans sons'),true);
 assert.deepStrictEqual(JSON.parse(t.files.get(JSON.parse(t.files.get('drm16-ouverture.json')).avant.nom)).sons,{});
}
console.log('Projets v181 : liste de sons indéterminée refusée avant sauvegarde ou remplacement ; kit réellement vide accepté.');
