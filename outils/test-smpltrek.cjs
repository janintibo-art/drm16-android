// Moteur réel : tranches par pas, anciennes sauvegardes et absence d'alias.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../page/js/590-smpltrek-dix-pistes.js'),'utf8');
const moteur=source.slice(0,source.indexOf('/* ---------- la façade du KAOSS PAD'));
const copie=o=>JSON.parse(JSON.stringify(o));
function setup(m){
 const c={S:{modele:'stk',run:false},ctx:{},now:1,confirmation:true,
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
