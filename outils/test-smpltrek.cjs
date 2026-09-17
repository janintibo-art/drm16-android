// Moteur réel : tranches par pas, anciennes sauvegardes et absence d'alias.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../page/js/590-smpltrek-dix-pistes.js'),'utf8');
const moteur=source.slice(0,source.indexOf('/* ---------- la façade du KAOSS PAD'));
const copie=o=>JSON.parse(JSON.stringify(o));
function setup(m){
 const c={S:{modele:'stk',run:false},MIDI:{base:36,canalSy:0},ctx:{},now:1,confirmation:true,
  maintenantAudio(){return c.now;},window:{confirm(){return c.confirmation;}},document:{querySelectorAll(){return [];}},SET:{on:false,actives:{}},ES:{buf:{uessai:{length:17}}},memoire:{stk:m},queue:[],cache:false,
  memLire(){return c.memoire.stk;},sauverMachine(){},banqueEs(){},signal(){},majStk(){},
  ouvrirPas(){return 0;},attenuerVoie(){}};
 vm.createContext(c);vm.runInContext(moteur,c);c.MACHINE=c.MACHINE_STK;return c;
}
{
 const c=setup();for(let i=0;i<8;i++){
  const b=c.bornesTrancheStk({length:17},i);assert(b.fin>b.debut);
  if(i)assert.equal(b.debut,c.bornesTrancheStk({length:17},i-1).fin);
 }assert.equal(c.bornesTrancheStk({length:17},7).fin,17);
 assert.deepStrictEqual(copie(c.bornesTrancheStk({length:17},-1)),{debut:0,fin:17});
 const P=c.STK.pistes[0],m=c.STK.motifs[0];P.slice=true;P.tranche=2;m.pas[0]=3;
 m.tranches[0][0]=0;m.tranches[0][1]=7;const notes=[];c.voixStk=(...x)=>notes.push(x);
 c.scheduleStk(0,1);c.scheduleStk(1,2);
 assert.deepStrictEqual(notes.map(n=>n[3]),[0,7],'le séquenceur transmet la tranche de chaque pas');
 P.muet=true;c.scheduleStk(1,3);assert.equal(notes.length,2);
 P.muet=false;c.STK.solo=2;c.scheduleStk(0,4);assert.equal(notes.length,2);
 c.memStk();const saved=copie(c.memoire.stk);
 m.tranches[0][1]=3;m.pas[0]=0;c.STK.chaine.push(6);
 assert.equal(c.memoire.stk.motifs[0].tranches[0][1],7);assert.equal(c.memoire.stk.motifs[0].pas[0],3);
 assert.equal(c.memoire.stk.chaine.length,0,'instantanés indépendants');
 const d=setup(saved);d.chargerStk();assert(d.STK.pistes[0].slice);
 assert.equal(d.STK.motifs[0].tranches[0][1],7);
 d.STK.motifs[0].tranches[0][1]=4;assert.equal(saved.motifs[0].tranches[0][1],7);
 assert.equal(d.STK.motifs[1].tranches[0][1],-1,'motifs indépendants');
 assert(d.affecterSonStk(9,'uessai'));assert.equal(d.STK.pistes[9].ech,'uessai');
 assert(!d.affecterSonStk(10,'uessai'));assert(!d.affecterSonStk(0,'uabsent'));
 d.PROJET_EN_COURS=true;assert(!d.affecterSonStk(0,'uessai'));
}
{
 const c=setup({cur:NaN,sel:8.9,chaine:[2,3.4,-1,Infinity],pistes:[{slice:true,tranche:44,niv:Infinity,pan:88}],
 motifs:[{last:999,pas:[65537],tranches:[[0,7,8,-9,2.2,'3',null]]}]});
 c.chargerStk();assert.equal(c.STK.cur,0);assert.equal(c.STK.sel,8);
 assert.equal(c.STK.pistes[0].tranche,0);assert.equal(c.STK.pistes[0].niv,.8);assert.equal(c.STK.pistes[0].pan,1);
 assert.deepStrictEqual(copie(c.STK.chaine),[2]);assert.equal(c.STK.motifs[0].last,16);
 assert.deepStrictEqual(copie(c.STK.motifs[0].tranches[0].slice(0,7)),[0,7,-1,-1,-1,-1,-1]);
 assert.equal(c.STK.motifs[0].pas[0],1);
 c.memoire.stk={pistes:[],motifs:[]};c.chargerStk();assert(!c.STK.pistes[0].slice);
 assert(c.STK.motifs[0].tranches.every(t=>t.every(n=>n===-1)),'ancien projet sans résidus du précédent');
}
console.log('SmplTrek v186 : bornes, tranches par pas, mute/solo, import, mémoire et migration OK.');

// v187 : demande annulable, verrouillage puis validation à l'heure audio.
{
 const c=setup(),s=c.STK,sons=[];c.voixStk=(...n)=>sons.push(n);
 s.motifs[0].pas[0]=65535;s.motifs[0].tranches[0].fill(0);
 s.motifs[7].pas[0]=65535;s.motifs[7].tranches[0].fill(7);
 assert(c.modeMotifsStk());c.S.run=true;
 assert(c.choisirMotifStk(7));assert.equal(s.cur,0);assert.equal(s.attente,7);
 c.memStk();assert.equal(c.memoire.stk.cur,0);assert(c.memoire.stk.quantifie);
 assert(!('attente' in c.memoire.stk));
 assert(c.annulerMotifStk());assert.equal(s.attente,null);
 c.choisirMotifStk(7);c.choisirMotifStk(7);assert.equal(s.attente,null);
 c.choisirMotifStk(7);c.scheduleStk(15,1.8);assert.equal(sons.at(-1)[3],0);
 c.scheduleStk(0,2);assert.equal(sons.at(-1)[3],7);assert.equal(s.cur,0);
 assert.equal(s.depart.t,2);assert(!c.choisirMotifStk(3));assert(!c.annulerMotifStk());
 assert(!c.modeMotifsStk());c.memStk();assert.equal(c.memoire.stk.cur,0);
 c.scheduleStk(1,1.7);assert.equal(sons.at(-1)[0],2,'rafale MIDI ne joue pas avant le départ retenu');
 c.copierMotifStk();assert.equal(s.copie.origine,0,'copie du motif entendu');
 c.arretStk();assert.equal(s.cur,0);assert.equal(s.depart,null);assert.equal(s.attente,null);
 c.choisirMotifStk(7);c.scheduleStk(0,2);c.now=2;c.cache=true;
 c.scheduleStk(1,2.125);assert.equal(s.cur,7,'validation même sans animation');
 assert.equal(c.memoire.stk.cur,7);
 c.S.run=false;c.choisirMotifStk(0);c.S.run=true;
 c.choisirMotifStk(7);c.scheduleStk(0,3);c.now=3;c.arretStk();assert.equal(s.cur,7,'STOP après frontière conserve le motif entendu');
 c.S.run=false;assert(c.choisirMotifStk(2));assert.equal(s.cur,2);
 c.S.run=true;c.MACHINE={};c.SET={on:true,actives:{stk:true}};
 c.choisirMotifStk(7);assert.equal(s.attente,7);c.scheduleStk(0,4);
 assert.equal(s.cur,2);c.ctx={};c.suivreMotifsStk();assert.equal(s.depart,null,'ancien contexte invalidé');
 s.motifs[3].last=8;assert(!c.choisirMotifStk(3),'longueur différente exige arrêt en mode quantifié');
 c.choisirMotifStk(7);assert(c.modeMotifsStk());assert.equal(s.attente,null);
 assert(c.choisirMotifStk(1));assert.equal(s.cur,1,'mode DIRECT préservé');
 for(const k of [-1,8,2.5,NaN,'2'])assert(!c.choisirMotifStk(k));
}
{
 const c=setup(),s=c.STK;const reglages=copie(s.pistes);
 s.motifs[0].pas[9]=128;s.motifs[0].tranches[9][7]=6;
 c.copierMotifStk();s.motifs[0].tranches[9][7]=3;
 c.choisirMotifStk(6);assert(c.collerMotifStk());
 assert.equal(s.motifs[6].tranches[9][7],6);assert.equal(s.motifs[6].pas[9],128);
 s.motifs[6].tranches[9][7]=2;c.choisirMotifStk(5);assert(c.collerMotifStk());
 assert.equal(s.motifs[5].tranches[9][7],6,'collages indépendants');
 assert.deepStrictEqual(copie(s.pistes),reglages,'sons et mixage conservés');
 c.confirmation=false;s.motifs[5].pas[0]=9;assert(!c.collerMotifStk());assert.equal(s.motifs[5].pas[0],9);
 c.S.run=true;assert(!c.collerMotifStk());
 c.S.run=false;c.memStk();const d=setup(copie(c.memoire.stk));d.chargerStk();
 assert.equal(d.STK.motifs[6].tranches[9][7],2);assert.equal(d.STK.copie,null);
 assert.equal(d.STK.attente,null);assert.equal(d.STK.depart,null);
}
console.log('SmplTrek v187 : motifs quantifiés, heure audio, MIDI/SET, arrêt, copies indépendantes et mémoire OK.');

// v188 : chaîne répétée, ordonnancement en avance et position réellement entendue.
{
 const c=setup(),s=c.STK,notes=[];c.voixStk=(t,k,a,tr)=>notes.push({t,k,tr});
 assert(!c.modeChaineStk(),'chaîne vide non activable');
 for(let j=0;j<8;j++){s.motifs[j].pas[0]=65535;s.motifs[j].tranches[0].fill(j);}
 assert(c.ajouterChaineStk());assert(c.ajouterChaineStk());
 c.choisirMotifStk(2);assert(c.ajouterChaineStk());c.choisirMotifStk(7);assert(c.ajouterChaineStk());
 assert.deepStrictEqual(copie(s.chaine),[0,0,2,7]);const mix=copie(s.pistes);
 assert(c.modeChaineStk());assert.equal(s.cur,0);assert(c.preparerChaineStk());c.S.run=true;c.cache=true;
 for(let tour=0;tour<5;tour++)for(let i=0;i<16;i++)c.scheduleStk(i,2+tour*2+i*.125);
 assert.deepStrictEqual(notes.filter((_,i)=>i%16===0).map(n=>n.tr),[0,0,2,7,0]);
 assert.equal(s.chaineDeparts.length,5);assert.equal(s.cur,0);assert.equal(s.chainePos,0);
 assert(!c.choisirMotifStk(3));assert(!c.ajouterChaineStk());assert(!c.retirerChaineStk());assert(!c.viderChaineStk());assert(!c.modeChaineStk());
 c.now=4.1;c.suivreMotifsStk();assert.equal(s.chainePos,1);assert.equal(s.cur,0,'répétition conservée');
 c.now=6.1;c.suivreMotifsStk();assert.equal(s.chainePos,2);assert.equal(s.cur,2);assert.equal(c.memoire.stk.cur,2);
 c.now=8.1;c.S.run=false;c.arretStk();assert.equal(s.cur,7);assert.equal(s.chaineDeparts.length,0);assert.equal(s.chaineProgramme,-1);
 assert.deepStrictEqual(copie(s.pistes),mix);assert(s.song,'STOP garde le mode chaîne');
 assert(c.preparerChaineStk());assert.equal(s.cur,0);c.S.run=true;c.scheduleStk(0,9);assert.equal(notes.at(-1).tr,0,'PLAY repart du début');
 c.ctx={};c.suivreMotifsStk();assert.equal(s.chaineDeparts.length,0);assert.equal(s.chaineProgramme,-1);
 c.S.run=false;c.memStk();const saved=copie(c.memoire.stk),d=setup(saved);d.chargerStk();
 assert(d.STK.song);assert.deepStrictEqual(copie(d.STK.chaine),[0,0,2,7]);assert.equal(d.STK.chaineDeparts.length,0);
 assert(c.retirerChaineStk());assert.deepStrictEqual(copie(s.chaine),[0,0,2]);
 c.confirmation=false;assert(!c.viderChaineStk());c.confirmation=true;assert(c.viderChaineStk());assert(!s.song);
 assert.equal(s.motifs[7].pas[0],65535,'vider la chaîne préserve les motifs');
}
{
 const c=setup(),s=c.STK;s.chaine=[0,1];s.motifs[1].last=8;
 assert(!c.modeChaineStk());s.song=true;assert(!c.preparerChaineStk(),'refus après changement de longueur par collage');
 s.song=false;s.chaine=[0];s.cur=1;assert(!c.ajouterChaineStk());
 s.chaine=Array(256).fill(0);assert(!c.ajouterChaineStk());assert.equal(s.chaine.length,256);
 s.cur=0;s.motifs[1].last=16;s.chaine=[0,1];assert(c.modeChaineStk());
 c.choisirMotifStk(3);assert(!s.song);assert.equal(c.memoire.stk.song,false,'sélection manuelle arrête durablement le mode chaîne');
 c.memoire.stk={song:true,chaine:[],pistes:[],motifs:[]};c.chargerStk();assert(!s.song);
}
console.log('SmplTrek v188 : répétitions, plusieurs départs anticipés, position audio, STOP/PLAY, limites et sauvegarde de chaîne OK.');

// v189 : notes relatives, migration, copie indépendante et envoi au moteur.
{
 const c=setup(),s=c.STK;assert(s.pistes.every(p=>p.type==='shots'&&p.note===0));
 assert(s.motifs.every(m=>m.notes.length===10&&m.notes.every(n=>n.length===16&&n.every(v=>v===0))));
 assert(c.modeInstrumentStk());assert.equal(s.pistes[0].type,'instrument');
 assert(c.choisirNoteStk(-12));assert.equal(s.pistes[0].note,-12);
 for(const v of [-13,13,1.5,NaN,'3'])assert(!c.choisirNoteStk(v));
 s.motifs[0].pas[0]=7;s.motifs[0].notes[0][0]=-12;s.motifs[0].notes[0][1]=0;s.motifs[0].notes[0][2]=12;
 const n=[];c.voixStk=(...a)=>n.push(a);for(let i=0;i<3;i++)c.scheduleStk(i,1+i*.125);
 assert.deepStrictEqual(n.map(a=>a[4]),[-12,0,12],'hauteur de chaque pas transmise à la voix');
 c.copierMotifStk();c.choisirMotifStk(7);assert(c.collerMotifStk());
 s.motifs[7].notes[0][2]=7;assert.equal(s.motifs[0].notes[0][2],12);assert.equal(s.copie.motif.notes[0][2],12);
 c.memStk();const saved=copie(c.memoire.stk);s.motifs[7].notes[0][2]=4;
 assert.equal(c.memoire.stk.motifs[7].notes[0][2],7,'sauvegarde indépendante');
 const d=setup(saved);d.chargerStk();assert.equal(d.STK.pistes[0].type,'instrument');assert.equal(d.STK.pistes[0].note,-12);
 assert.equal(d.STK.motifs[7].notes[0][2],7);assert(d.modeInstrumentStk());
 assert.equal(d.STK.pistes[0].type,'shots');assert.equal(d.STK.motifs[7].notes[0][2],7,'retour SHOTS sans effacement');
 d.S.run=true;assert(!d.modeInstrumentStk(),'type protégé pendant PLAY');
}
{
 const c=setup({pistes:[{type:'instrument',note:99}],motifs:[{notes:[[-12,12,0,13,-13,1.5,'4',null]]}]});
 c.chargerStk();assert.equal(c.STK.pistes[0].note,0);
 assert.deepStrictEqual(copie(c.STK.motifs[0].notes[0].slice(0,8)),[-12,12,0,0,0,0,0,0]);
 c.memoire.stk={pistes:[{}],motifs:[{pas:[1]}]};c.chargerStk();
 assert.equal(c.STK.pistes[0].type,'shots');assert(c.STK.motifs[0].notes[0].every(n=>n===0));
}
console.log('SmplTrek v189 : notes, copies indépendantes, migration et type Instrument OK.');

// v190 : le canal mélodique vise une piste Instrument, les autres gardent le plan par pistes.
{
 const c=setup(),s=c.STK,sons=[];s.sel=3;s.pistes[3].type='instrument';s.pistes[3].note=4;s.pistes[3].slice=true;s.pistes[3].tranche=7;
 assert(c.modeMidiStk());c.voixStk=(...a)=>sons.push(a);
 const avant=copie(s.motifs),noteChoisie=s.pistes[3].note;
 for(const n of [24,36,48])assert(c.jouerMidiStk(n,.4,0));
 assert.deepStrictEqual(sons.map(a=>[a[1],a[3],a[4],a[5]]),[[3,7,-12,.4],[3,7,0,.4],[3,7,12,.4]]);
 for(const n of [23,49,-1,128,2.5])assert(!c.jouerMidiStk(n,1,0));
 assert(!c.jouerMidiStk(36,0,0));assert.equal(sons.length,3);
 assert(c.jouerMidiStk(44,.8,9));assert.equal(sons.at(-1)[1],8,'autre canal : note de base + rang de piste');
 s.pistes[3].muet=true;assert(!c.jouerMidiStk(36,1,0));s.pistes[3].muet=false;s.solo=0;assert(!c.jouerMidiStk(36,1,0));s.solo=-1;
 assert.deepStrictEqual(copie(s.motifs),avant);assert.equal(s.pistes[3].note,noteChoisie,'pas d’écriture implicite');
 s.sel=2;assert.equal(c.cibleMidiStk(36,0),null,'pas de repli percussif sur canal clavier avec piste SHOTS');s.sel=3;
 c.memStk();const d=setup(copie(c.memoire.stk));d.chargerStk();assert(d.STK.clavierMidi);
 c.S.run=true;assert(!c.modeMidiStk());c.S.run=false;assert(c.modeMidiStk());
 assert(c.jouerMidiStk(36,1,0));assert.equal(sons.at(-1)[1],0,'mode PISTES restauré');
 c.MIDI.base=60;assert(c.modeMidiStk());assert.equal(c.cibleMidiStk(72,0).hauteur,12);
}
console.log('SmplTrek v190 : routage clavier/pistes, plage, canal, vélocité, mute/solo et mémoire OK.');
{
 const c=setup(),s=c.STK;s.chaine=[0,0,2,7];s.cur=5;s.song=true;
 const motifs=JSON.stringify(s.motifs),pistes=JSON.stringify(s.pistes);
 assert(!c.deplacerEntreeChaineStk(1));assert(!c.choisirEntreeChaineStk(4));assert(!c.choisirEntreeChaineStk(1.5));
 assert(c.choisirEntreeChaineStk(1));assert.equal(s.cur,5);assert(s.song);
 assert(c.deplacerEntreeChaineStk(1));assert.deepStrictEqual(copie(s.chaine),[0,2,0,7]);assert.equal(s.chaineSel,2);
 assert(c.deplacerEntreeChaineStk(-1));assert.deepStrictEqual(copie(s.chaine),[0,0,2,7]);
 assert(!c.deplacerEntreeChaineStk(2));assert(c.dupliquerEntreeChaineStk());
 assert.deepStrictEqual(copie(s.chaine),[0,0,0,2,7]);assert.equal(s.chaineSel,2);
 assert(c.supprimerEntreeChaineStk());assert.deepStrictEqual(copie(s.chaine),[0,0,2,7]);
 assert.equal(s.chaineSel,2);assert.equal(JSON.stringify(s.motifs),motifs);assert.equal(JSON.stringify(s.pistes),pistes);
 const saved=copie(c.memoire.stk),d=setup(saved);d.chargerStk();assert.deepStrictEqual(copie(d.STK.chaine),[0,0,2,7]);assert.equal(d.STK.chaineSel,-1);
 c.S.run=true;const avant=JSON.stringify(s.chaine);
 assert(!c.choisirEntreeChaineStk(0));assert(!c.deplacerEntreeChaineStk(1));assert(!c.dupliquerEntreeChaineStk());assert(!c.supprimerEntreeChaineStk());assert.equal(JSON.stringify(s.chaine),avant);
 c.S.run=false;s.chaineSel=0;assert(!c.deplacerEntreeChaineStk(-1));s.chaineSel=3;assert(!c.deplacerEntreeChaineStk(1));
 assert(c.retirerChaineStk());assert.equal(s.chaineSel,2);assert(c.supprimerEntreeChaineStk());assert.equal(s.chaineSel,1);
 assert(c.supprimerEntreeChaineStk());assert.equal(s.chaineSel,0);assert(c.supprimerEntreeChaineStk());assert.equal(s.chaineSel,-1);assert(!s.song);
 s.chaine=Array(255).fill(0);s.chaineSel=254;assert(c.dupliquerEntreeChaineStk());assert.equal(s.chaine.length,256);assert(!c.dupliquerEntreeChaineStk());assert.equal(s.chaine.length,256);
 assert(c.choisirEntreeChaineStk(255));assert.equal(s.chaineSel,-1,'retoucher désélectionne');
}
console.log('SmplTrek v191 : édition des occurrences, bornes, limite, sauvegarde, conservation des motifs et verrouillage PLAY OK.');
{
 const c=setup();c.stepDur=()=>.125;
 const mix=fs.readFileSync(path.join(__dirname,'../page/js/595-mixage-chaine-smpltrek.js'),'utf8');
 vm.runInContext(mix.slice(0,mix.indexOf('async function exporterChaineStk')),c);
 assert.throws(()=>c.planMixageStk(),/CHAÎNE/);
 const s=c.STK;s.chaine=[0,0,2];s.cur=7;s.chaineSel=2;
 s.motifs.forEach(m=>m.last=4);s.motifs[0].pas[0]=1;s.motifs[2].pas[1]=4;s.motifs[2].notes[1][2]=12;s.motifs[2].tranches[1][2]=7;
 const avant=JSON.stringify(s),p=c.planMixageStk();assert.equal(JSON.stringify(s),avant);
 assert.equal(p.notes,3);assert.equal(p.entrees,3);assert.equal(p.duree,1.55);
 assert.deepStrictEqual(copie(p.pas.map(x=>x.t)),[.05,.55,1.3]);
 assert.deepStrictEqual(copie(p.pas[2].notes[0]),{piste:1,tranche:7,hauteur:12});
 assert.throws(()=>c.dureeMixageStk(p),/SON INTROUVABLE/);
 s.pistes[0].ech='a';s.pistes[1].ech='a';c.ES.buf.a={length:400,sampleRate:100,duration:4};
 s.pistes[0].dec=1;s.pistes[1].dec=1;s.pistes[1].type='instrument';
 assert(Math.abs(c.dureeMixageStk(p)-4.85)<1e-9,'la queue du deuxième sample entier est conservée');
 s.pistes[0].muet=true;assert.equal(c.planMixageStk().notes,1);
 s.solo=0;assert.equal(c.planMixageStk().notes,2,'le solo conserve sa priorité sur mute');
 s.solo=9;assert.throws(()=>c.planMixageStk(),/AUCUNE NOTE/);
 s.solo=-1;s.motifs[2].last=8;assert.throws(()=>c.planMixageStk(),/LONGUEURS/);
}
console.log('SmplTrek v192 : plan de mixage, ordre, notes, tranches, mute/solo, samples et queues longues OK.');
{
 const c=setup();c.stepDur=()=>.125;
 const mix=fs.readFileSync(path.join(__dirname,'../page/js/595-mixage-chaine-smpltrek.js'),'utf8');
 vm.runInContext(mix.slice(0,mix.indexOf('async function exporterChaineStk')),c);
 const s=c.STK;s.chaine=[0,0,2];s.motifs.forEach(m=>m.last=4);
 s.motifs[0].pas[0]=1;s.motifs[0].pas[1]=1;s.motifs[2].pas[1]=8;
 let p=c.planMixageStk(0);assert.equal(p.piste,0);assert.equal(p.notes,2);assert.equal(p.duree,1.55);
 assert.deepStrictEqual(copie(p.pas.map(x=>x.charge)),[2,2],'atténuation selon les voix du mixage, pas le solo exporté');
 assert(p.pas.every(x=>x.notes.length===1&&x.notes[0].piste===0));
 s.pistes[0].ech='u-stem';c.ES.buf['u-stem']={length:100,sampleRate:100,duration:1};
 assert(c.dureeMixageStk(p)>1.55,'sample absent d’une autre piste ignoré pour le stem');
 for(const k of [-1,10,1.2,NaN,null])assert.throws(()=>c.planMixageStk(k),/INVALIDE/);
 assert.throws(()=>c.planMixageStk(9),/PISTE 10/);
 s.pistes[0].muet=true;assert.throws(()=>c.planMixageStk(0),/AUCUNE NOTE/);
 s.solo=0;assert.equal(c.planMixageStk(0).notes,2);assert.throws(()=>c.planMixageStk(1),/AUCUNE NOTE/);
 assert.equal(c.planMixageStk().piste,undefined,'appel sans piste : mixage existant conservé');
}
console.log('SmplTrek v193 : export ciblé, atténuation du mixage, MUTE/SOLO, bornes et samples requis OK.');
