/* ================= hasard sur les sons =================
   Le bouton tire au sort les réglages de la machine affichée sans toucher au
   motif : on garde son rythme et on cherche un autre son. Les champs modifiés
   sont donnés machine par machine, parce qu'un « niveau » n'est pas un
   « accord » et qu'il ne faut pas mettre le volume à zéro par surprise. */
/* chaque machine a sa propre fonction d'enregistrement : on appelle la bonne */
function memMachineCourante(){
  var t = {em1:"memEm", er1:"memEr", er2:"memEr", ea1:"memEa", ea2:"memEa",
           es1:"memEs", es2:"memEs", emx:"memMx", esx:"memSx",
           mpc3000:"memMpc", mpc2000:"memMpc", tr808:"memTr", tr909:"memTr", tr707:"memTr",
           dmx:"memDmx", vlc:"memVlc", cr5:"memCr", dbi:"memDbi", t1k:"memT1k", arcm:"memArcm"};
  var f = t[S.modele];
  try{ if(f && typeof window[f] === "function") window[f](); }catch(e){}
}
function sonsHasard(){
  if(S.modele === "dbi" && !editionDbiPermise()) return;
  var m = S.modele, l = [], champs = null, i;
  function pousse(tab, n, c){ for(i=0;i<n;i++) if(tab[i]) l.push({o:tab[i], c:c}); }
  var doux = ["ton","dec","snap","acc","filt","pan","tune","pitch","debut","res","cut","egi","drv"];
  if(m === "es1" || m === "es2") pousse(ES.pat.son, 9, ["filt","pan","pitch"]);
  else if(m === "esx") pousse(SX.pat.son, 14, ["filt","pan","pitch"]);
  else if(m === "emx") pousse(MX.pat.son, 16, ["pitch","eg","cut","res","egi","drv","mdepth","mspeed"]);
  else if(m === "er1" || m === "er2") pousse(ER.pat.son, 11, ["pitch","modD","modS","dec","pan"]);
  else if(m === "ea1" || m === "ea2") pousse(EA.pat.son, 2, ["cut","res","egi","mdepth","mspeed","drv"]);
  else if(m === "tr808" || m === "tr909" || m === "tr707") pousse(TR.pat.son, TR.def.instr.length, ["ton","dec","snap","acc"]);
  else if(m === "dbi") pousse(motifDbiCur().pistes.map(function(p){ return p.p; }), 8,
                              ["dec","pit","ton","body","clap","harm","mpit","fmamt","penv"]);
  else if(m === "t1k") pousse(motifT1kCur().instr, 10, ["tune","dec","c1","c2"]);
  else if(m === "vlc") pousse(motifVlcCur().parties.map(function(p){ return p.par; }), 10, null);
  else if(m === "mpc3000" || m === "mpc2000") pousse(MPC.pads, 64, ["pan","tune","dec","filt","debut"]);
  else if(m === "arcm") pousse(motifArcmCur().pistes, 16, ["pan","tune","dec","debut","filt"]);
  else if(m === "ko"){
    /* Les seize emplacements reçoivent les seize sons de la banque, au hasard. */
    for(var kq=0; kq<16; kq++) KO.sons[kq] = "b" + Math.floor(Math.random() * ES_BANQUE.length);
    majKo(); memKo();
  }
  else if(m === "rd6"){
    /* la RD-6 n'a qu'un niveau par instrument : ce qui se tire, c'est son timbre */
    TR.tone = 0.25 + Math.random() * 0.7;
    TR.drive = Math.random();
    TR.dist = Math.random() > 0.4;
    majBusTr(); majTr(); memTr();
    signal("TIMBRE ET DISTORSION TIRÉS AU SORT");
    H.inter();
    return;
  }
  else if(m === "dmx"){ signal("LA DMX N'A PAS DE RÉGLAGES DE SONS"); return; }
  else if(m === "cr5"){ signal("LA CR-5000 N'A QUE DES NIVEAUX"); return; }
  if(!l.length){ signal("RIEN À TIRER AU SORT ICI"); return; }
  var n2 = 0;
  l.forEach(function(x){
    var cs = x.c;
    if(!cs){                                   /* volca : valeurs de 0 à 127 */
      ["speed","ampeg_decay","pitcheg_int","start_point","hicut","pan"].forEach(function(c){
        if(typeof x.o[c] === "number"){ x.o[c] = Math.round(Math.random() * 127); n2++; }
      });
      return;
    }
    cs.forEach(function(c){
      if(typeof x.o[c] !== "number") return;
      /* les champs bipolaires restent centrés, les autres couvrent tout */
      x.o[c] = (c === "pan" || c === "pitch" || c === "tune" || c === "egi" || c === "mdepth")
             ? (Math.random() * 2 - 1) * 0.8
             : Math.random();
      if(c === "tune" && (m === "arcm" || m === "mpc3000" || m === "mpc2000" || m === "t1k"))
        x.o[c] = 0.3 + Math.random() * 0.4;
      n2++;
    });
  });
  /* d'abord garder le tirage, ensuite recharger : dans l'autre sens, la
     mémoire écrase ce qu'on vient de tirer et rien ne change. */
  memMachineCourante();
  writeMem();
  rouvrirMachine(m);                           /* la façade se remet à jour d'un bloc */
  signal(n2 + " RÉGLAGES TIRÉS AU SORT · LE MOTIF EST INTACT");
  H.inter();
}

