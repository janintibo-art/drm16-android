/* ================= choix du modèle ================= */
var menu = document.getElementById("menu");
var logoEl = document.getElementById("logo");
var numEl = document.getElementById("model-num");
var capOut2 = document.getElementById("cap-out2");
var capRight = document.getElementById("cap-right");
var misc4 = document.getElementById("misc4");
var noteTitre = document.getElementById("note-titre");

function appliquerModele(id){
  stop();
  MACHINE = MACHINE_EHX;
  actif = unit;
  poserMachine();   /* le m32 est posé plus bas, une fois le modèle connu */
  S.modele = id;
  MODELE = MODELES[id];
  var r = memoire[id];
  S.style = r.style; S.col = r.col; S.del = r.del; S.space = r.space; S.bank = r.bank;

  document.body.classList.toggle("m32", id === "32");
  document.body.classList.toggle("bank-b", MODELE.banques > 1 && S.bank === 1);

  logoEl.innerHTML = MODELE.logo + '<small>DIGITAL RHYTHM MATRIX</small>';
  numEl.textContent = MODELE.numero;
  capOut2.textContent = MODELE.out2;
  capRight.textContent = MODELE.droite;
  misc4.textContent = MODELE.misc4;
  for(var i=0;i<odel.length;i++) odel[i].textContent = MODELE.del[i];

  swRight.classList.toggle("on",
      MODELE.modeDroite === "bank" ? S.bank === 1 : S.space);
  slotBass.classList.toggle("on", S.bass);
  kSty.set(S.style); kCol.set(S.col); kDel.set(S.del);
  kVol.set(S.vol); kTempo.set(S.bpm);

  S.power = false;
  swPower.classList.remove("on");
  led.classList.remove("on");
  unit.classList.add("off");

  paint(); applyBass(); save();
  fit(); setTimeout(fit,120);
}
document.getElementById("retour").addEventListener("click", function(){ ouvrirMenu(); H.inter(); });
function ouvrirMenu(){
  stop();
  /* On revient au menu depuis n'importe où : plus aucune vue particulière ne
     doit rester ouverte derrière, ni aucun panneau. */
  remettreVueAPlat();
  if(typeof fermerAutresPanneaux === "function"){ fermerAutresPanneaux(""); majNoteOuverte(); }
  menu.classList.remove("hide");
  document.body.classList.add("menu-ouvert");
  majVoileMenu();
}
function majVoileMenu(){
  var v = document.getElementById("menu-voile");
  if(!v) return;
  var reste = menu.scrollHeight - menu.clientHeight - menu.scrollTop;
  v.classList.toggle("vu", reste > 12);
}
function allerMachine(id){
  if(id === "eur") activerEur();
  else if(id === "td3") activerTd3();
  else if(id === "rd6") activerTr("rd6");
  else if(id === "arcm") activerArcm();
  else if(id === "ko") activerKo();
  else if(id === "stk") activerStk();
  else if(id === "mc") activerMc();
  else if(id === "kp") activerKp();
  else if(id === "t1k") activerT1k();
  else if(id === "dbi") activerDbi();
  else if(id === "cr5") activerCr();
  else if(id === "vlc") activerVlc();
  else if(id === "dmx") activerDmx();
  else if(id === "tr808") activerTr("tr808");
  else if(id === "tr909") activerTr("tr909");
  else if(id === "tr707") activerTr("tr707");
  else if(id === "mpc3000") activerMpc(3000);
  else if(id === "mpc2000") activerMpc(2000);
  else if(id === "em1") activerEm();
  else if(id === "er1") activerEr(1);
  else if(id === "er2") activerEr(2);
  else if(id === "ea1") activerEa(1);
  else if(id === "ea2") activerEa(2);
  else if(id === "es1") activerEs(1);
  else if(id === "es2") activerEs(2);
  else if(id === "emx") activerMx();
  else if(id === "esx") activerSx();
  else appliquerModele(id);
}
var picks = document.querySelectorAll(".pick");
for(var q=0;q<picks.length;q++){
  picks[q].addEventListener("click", function(){
    var id = this.dataset.m;
    if(!id) return;              /* tuiles de service : notices, enregistreur */
    ZOOM.z = 1; ZOOM.tx = 0; ZOOM.ty = 0;
    document.body.classList.remove("menu-ouvert");
    allerMachine(id);
    menu.classList.add("hide");
    H.inter();
  });
}

/* la machine mémorisée : même aiguillage que le menu, une seule liste à tenir */
allerMachine(memoire.modele);
menu.classList.remove("hide");
document.body.classList.add("menu-ouvert");
menu.addEventListener("scroll", majVoileMenu);
window.addEventListener("resize", majVoileMenu);
setTimeout(majVoileMenu, 60);
setTimeout(fit,500);
document.body.classList.add("pret");   /* tout est en place : on peut montrer */
