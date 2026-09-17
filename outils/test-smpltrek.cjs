// Moteur réel : tranches par pas, anciennes sauvegardes et absence d'alias.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../page/js/590-smpltrek-dix-pistes.js'),'utf8');
const moteur=source.slice(0,source.indexOf('/* ---------- la façade du KAOSS PAD'));
const copie=o=>JSON.parse(JSON.stringify(o));
function setup(m){
 const c={S:{modele:'stk'},ctx:{},ES:{buf:{uessai:{length:17}}},memoire:{stk:m},queue:[],cache:false,
  memLire(){return c.memoire.stk;},sauverMachine(){},banqueEs(){},signal(){},majStk(){},
  ouvrirPas(){return 0;},attenuerVoie(){}};
 vm.createContext(c);vm.runInContext(moteur,c);return c;
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
