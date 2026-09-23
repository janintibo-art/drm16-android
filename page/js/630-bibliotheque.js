/* ================= bibliothèque =================
   Sons, prises MIDI, sauvegardes, archives, Freesound, et (v251) les sons
   de chaque machine avec leurs kits : voir 632-kits-de-sons.js.
   Tout y est renommable. Les sauvegardes sont de vrais fichiers .syx dans Documents. */

function bibLire(){
  BIB.freesound = Object.create(null);
  try{
    var o = JSON.parse(localStorage.getItem(MEM + ".bib") || "null");
    if(o && o.noms) BIB.noms = o.noms;
    if(o && o.preset) BIB.preset = o.preset;
    if(o && o.freesound) BIB.freesound = fsonCreditsValides(o.freesound);
    /* v252 : catégories, favoris */
    if(typeof bibMetaValides === "function") BIB.meta = bibMetaValides(o && o.meta);
    /* v258 : corbeille */
    if(typeof bibCorbeilleValide === "function") BIB.corbeille = bibCorbeilleValide(o && o.corbeille);
  }catch(e){}
}
function bibEcrire(){
  if(PROJET_EN_COURS) return false;
  try{
    localStorage.setItem(MEM + ".bib", JSON.stringify({noms:BIB.noms, preset:BIB.preset, freesound:BIB.freesound || {},
      meta:BIB.meta || {}, corbeille:BIB.corbeille || {}}));
    return true;
  }catch(e){ signal("MÉMOIRE PLEINE · NOMS ET CRÉDITS NON GARDÉS"); return false; }
}
/* le nom donné par l'utilisateur l'emporte sur le nom d'origine */
function nomBib(id){
  if(BIB.noms[id]) return BIB.noms[id];
  return nomEch(id);
}
function renommer(titre, actuel, suite){
  var v = window.prompt(titre, actuel || "");
  if(v === null) return;
  v = v.replace(/\s+/g, " ").trim().slice(0, 28);
  suite(v);
}

/* ---------- rayon des sons ---------- */
function bibSons(){
  banqueEs();
  var l = listeEch(), out = [];
  l.forEach(function(id){
    var b = ES.buf[id];
    out.push({id:id, nom:nomBib(id), propre:(id.charAt(0) !== "b"),
              duree:b ? b.duration : 0, freq:b ? b.sampleRate : 0});
  });
  return out;
}
/* silencieux (v253) : l'essai d'un son ne refait pas la liste, pour garder la place */
function bibAffecter(id, silencieux){
  var m = BIB.cible.machine, k = bibIndexReel(m, BIB.cible.partie);
  if(m === "es1" || m === "es2"){
    if(S.modele !== m) activerEs(m === "es2" ? 2 : 1);
    ES.pat.son[k].ech = id; delete ES.inv[id]; majLedsEs(); memEs();
  } else if(m === "esx"){
    if(S.modele !== m) activerSx();
    SX.pat.son[k].ech = id; delete ES.inv[id]; majLedsSx(); memSx();
  } else if(m === "mpc3000" || m === "mpc2000"){
    if(S.modele !== m) activerMpc(m === "mpc2000" ? 2000 : 3000);
    MPC.pads[k].ech = id; majPadsMpc(); majLcdMpc(); memMpc();
  } else if(m === "emx"){
    if(S.modele !== m) activerMx();
    if(id.charAt(0) === "b"){ MX.pat.son[k].tim = +id.slice(1); majLedsMx(); memMx(); }
    else { signal("L'EMX-1 NE LIT QUE LA BANQUE INTERNE"); return; }
  } else if(m === "er2"){
    if(S.modele !== m) activerEr(2);
    if(id.charAt(0) === "b"){ ER.pat.son[k].pcm = +id.slice(1); memEr(); }
    else { signal("LES PARTIES PCM NE LISENT QUE LA BANQUE"); return; }
  } else if(m === "stk"){
    if(!affecterSonStk(k, id)) return;
  } else if(m === "mc"){
    if(!affecterSonMc(k, id)) return;
  } else if(m === "kp"){
    if(!affecterSonKp(k, id)) return;
  } else if(m === "vlc"){                      /* v253 : quatre machines de plus */
    if(S.modele !== m) activerVlc();
    motifVlcCur().parties[k].ech = id; memVlc();
    try{ majVlc(); }catch(e){}
  } else if(m === "t1k"){
    if(S.modele !== m) activerT1k();
    motifT1kCur().instr[k].ech = id; memT1k();
    try{ majT1k(); majKnobsT1k(); }catch(e){}
  } else if(m === "arcm"){
    if(S.modele !== m) activerArcm();
    var P = motifArcmCur().pistes[k];
    P.ech = id; P.nom = nomBib(id).slice(0, 28); memArcm();
    try{ majArcm(); }catch(e){}
  } else if(m === "ko"){
    if(S.modele !== m) activerKo();
    KO.sons[k] = id; memKo();
    try{ majKo(); }catch(e){}
  }
  signal(nomBib(id) + " → " + bibNomPartie(m, k));
  if(!silencieux) majBibUI();
  H.inter();
  return true;
}
var BIB_MACHINES = [["es1","Electribe ES-1"],["es2","ES-1 mkII"],["esx","Electribe ESX-1"],
                    ["emx","Electribe EMX-1"],["er2","ER-1 mkII"],
                    ["mpc3000","Akai MPC3000"],["mpc2000","Akai MPC2000"],["kp","Korg KAOSS PAD"],["mc","Roland MC-101"],["stk","Sonicware SmplTrek"],
                    ["vlc","Korg volca sample"],["t1k","Roland TR-1000"],["arcm","Machine d'archive"],["ko","PO-33 K.O!"]];
function bibParties(m){
  var l = [], i;
  if(m === "es1" || m === "es2") for(i=0;i<9;i++) l.push(ES_PARTS[i].n);
  else if(m === "esx") for(i=0;i<14;i++) l.push(nomPartieSx(i));
  else if(m === "emx") for(i=0;i<9;i++) l.push("Drum " + MX_DRUMS[i]);
  else if(m === "er2") l = ["PCM 1", "PCM 2"];
  else if(m === "stk") for(i=0;i<STK_PISTES;i++) l.push("Piste " + (i + 1));
  else if(m === "mc") l = ["Piste 2", "Piste 3", "Piste 4"];
  else if(m === "kp") l = ["Banque A", "Banque B", "Banque C", "Banque D"];
  else if(m === "vlc") for(i=0;i<10;i++) l.push("Partie " + (i + 1));
  else if(m === "t1k") l = T1K_INSTR.map(function(p){ return p.nom; });
  else if(m === "arcm") for(i=0;i<16;i++) l.push("Piste " + (i + 1));
  else if(m === "ko") for(i=0;i<16;i++) l.push("Son " + (i + 1));
  else for(i=0;i<64;i++) l.push("Pad " + MPC_BANQUES[Math.floor(i/16)] + ((i%16)+1));
  return l;
}
function bibNomPartie(m, k){
  var l = bibParties(m);
  if(m === "mc") k--;
  if(m === "er2") k = (k === 5) ? 1 : 0;
  return l[k] !== undefined ? l[k] : ("partie " + (k+1));
}
function bibIndexReel(m, k){
  if(m === "mc") return k + 1;
  if(m === "er2") return k ? 5 : 4;      /* les deux parties PCM de l'ER-1 mkII */
  return k;
}

/* ---------- rayon des sauvegardes de machine ---------- */
function bibFichiers(ext){
  var p = HOST, l = [];
  if(!p || !p.fichierListe) return l;
  var t = "";
  try{ t = p.fichierListe(ext) || ""; }catch(e){}
  t.split("\n").forEach(function(ligne){
    if(!ligne) return;
    var c = ligne.split("\t");
    l.push({nom:c[0], taille:+c[1] || 0, date:+c[2] || 0});
  });
  l.sort(function(a,b){ return b.date - a.date; });
  return l;
}
function bibDemanderSauvegarde(){
  if(S.run) stop();
  EXC.attenteSauve = true;
  var n, ok = false;
  for(n=0;n<16;n++){
    var c = 0x30 | n;
    ok = excEnvoyerBrut([0xF0,0x42,c,0x57,0x1C,0xF7]) || ok;   /* ES-1 : tous les motifs */
    excEnvoyerBrut([0xF0,0x42,c,0x57,0x0B,0xF7]);              /* ES-1 : toutes les chansons */
    excEnvoyerBrut([0xF0,0x42,c,0x57,0x0E,0xF7]);              /* ES-1 : réglages généraux */
  }
  if(ok){
    signal("SAUVEGARDE DEMANDÉE · LAISSEZ LA MACHINE RÉPONDRE");
    setTimeout(function(){
      if(EXC.attenteSauve){ EXC.attenteSauve = false; signal("AUCUNE RÉPONSE DE LA MACHINE"); }
    }, 8000);
  }
}
/* appelé par la réception exclusive pour les envois volumineux */
function bibRecevoirSauvegarde(o, type, fonction){
  var p = HOST;
  if(!p || !p.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE"); return false; }
  var quoi = {0x4C:"motifs", 0x57:"chansons", 0x51:"reglages", 0x40:"motif"}[fonction] || "donnees";
  var d = new Date();
  var nom = "korg-" + type + "-" + quoi + "-" +
            d.getFullYear() + ("0"+(d.getMonth()+1)).slice(-2) + ("0"+d.getDate()).slice(-2) + "-" +
            ("0"+d.getHours()).slice(-2) + ("0"+d.getMinutes()).slice(-2) + ("0"+d.getSeconds()).slice(-2) + ".syx";
  var chemin = "";
  try{ chemin = p.fichierSauver(nom, octetsVersB64(o)); }catch(e){}
  if(chemin){
    EXC.attenteSauve = false;
    signal("SAUVEGARDÉ : " + nom + " · " + o.length + " OCTETS");
    majBibUI();
    return true;
  }
  signal("ÉCRITURE REFUSÉE");
  return false;
}
function bibRenvoyer(nom){
  var p = HOST;
  if(!p || !p.fichierCharger){ signal("LECTURE IMPOSSIBLE"); return; }
  if(!window.confirm("Renvoyer « " + nom + " » vers la machine ?\n\nElle sera remise dans l'état de cette sauvegarde.")) return;
  if(S.run) stop();
  var b64 = "";
  try{ b64 = p.fichierCharger(nom) || ""; }catch(e){}
  if(!b64){ signal("FICHIER ILLISIBLE"); return; }
  var o = b64VersOctets(b64);
  if(o[0] !== 0xF0){ signal("CE N'EST PAS UN ENVOI EXCLUSIF"); return; }
  var parti;
  try{ parti = p.midiSysex(b64); }catch(e){ signal("ENVOI REFUSÉ"); return; }
  if(parti === false){
    signal(MIDI.ouvert < 0 ? "AUCUN APPAREIL MIDI OUVERT" : "FICHIER EXCLUSIF INCOMPLET · RIEN N'EST PARTI");
    return;
  }
  signal("RENVOYÉ : " + o.length + " OCTETS");
}
function bibSupprimerFichier(nom){
  var p = HOST;
  if(!window.confirm("Supprimer « " + nom + " » ?")) return;
  try{ if(p && p.fichierSupprimer) p.fichierSupprimer(nom); }catch(e){}
  majBibUI(); H.inter();
}

/* ---------- interface ---------- */
function octetsTexte(n){
  if(n > 1048576) return (n/1048576).toFixed(1) + " Mo";
  if(n > 1024) return Math.round(n/1024) + " ko";
  return n + " o";
}
function majBibUI(){
  if(BIB.onglet !== 4) fsonAnnuler();
  var corps = document.getElementById("bib-corps");
  if(!corps) return;
  var bs = document.querySelectorAll("#bib-nav button");
  for(var i=0;i<bs.length;i++) bs[i].classList.toggle("on", i === BIB.onglet);
  /* v253 : refaire le rayon sans ramener la liste en haut */
  /* v254 : passer de la liste à l'éditeur (ou l'inverse) change de vue : on repart du haut */
  var vue = BIB.onglet + (typeof ED !== "undefined" && ED ? ":ed" : "");
  var defile = corps.parentNode, haut = defile ? defile.scrollTop : 0, memeRayon = BIB.ongletAffiche === vue;
  BIB.ongletAffiche = vue;
  corps.innerHTML = "";
  if(BIB.onglet === 0 && typeof ED !== "undefined" && ED) bibRendreEditeur(corps);   /* v254 */
  else if(BIB.onglet === 0) bibRendreSons(corps);
  else if(BIB.onglet === 1) bibRendrePrises(corps);
  else if(BIB.onglet === 2) bibRendreSauvegardes(corps);
  else if(BIB.onglet === 3) bibRendreArchive(corps);
  else if(BIB.onglet === 4) bibRendreFreesound(corps);
  else if(BIB.onglet === 5) bibRendreMachines(corps);
  else if(BIB.onglet === 6) bibRendreCc0Github(corps);
  if(defile) defile.scrollTop = memeRayon ? haut : 0;
  if(typeof majBarreEssai === "function") majBarreEssai();
}
function ligneBib(titre, detail){
  var d = document.createElement("div");
  d.className = "bib-ligne";
  d.innerHTML = "<b></b><span></span>";
  d.querySelector("b").textContent = titre;
  d.querySelector("span").textContent = detail;
  return d;
}
function boutonBib(l, texte, fn, sec){
  var b = document.createElement("button");
  b.className = sec === false ? "" : "sec";
  b.textContent = texte;
  b.addEventListener("click", fn);
  l.appendChild(b);
  return b;
}
function bibRendreSons(corps){
  var entete = document.createElement("div");
  entete.innerHTML = "<h3>Affecter à</h3>";
  var selM = document.createElement("select"), selP = document.createElement("select");
  BIB_MACHINES.forEach(function(m){
    var o = document.createElement("option");
    o.value = m[0]; o.textContent = m[1];
    selM.appendChild(o);
  });
  selM.value = BIB.cible.machine;
  function remplirParties(){
    selP.innerHTML = "";
    bibParties(BIB.cible.machine).forEach(function(n, i){
      var o = document.createElement("option");
      o.value = i; o.textContent = n;
      selP.appendChild(o);
    });
    selP.value = Math.min(BIB.cible.partie, selP.options.length - 1);
    BIB.cible.partie = +selP.value;
  }
  selM.addEventListener("change", function(){ BIB.cible.machine = this.value; BIB.cible.partie = 0; remplirParties(); });
  selP.addEventListener("change", function(){ BIB.cible.partie = +this.value; });
  remplirParties();
  var r = document.createElement("div"); r.className = "bib-cible";
  r.appendChild(selM); r.appendChild(selP);
  entete.appendChild(r);
  var h2 = document.createElement("h3"); h2.textContent = "Traitement";
  entete.appendChild(h2);
  var pp = document.createElement("p");
  pp.style.opacity = ".75"; pp.style.fontSize = "13px";
  pp.textContent = "Appliqué aux sons enregistrés ou importés, et par le bouton TRAITER de chaque son.";
  var selT = document.createElement("select");
  TRAITE_NOMS.forEach(function(n){
    var o = document.createElement("option");
    o.value = n; o.textContent = n;
    selT.appendChild(o);
  });
  selT.value = BIB.preset || "punch";
  selT.addEventListener("change", function(){ BIB.preset = this.value; bibEcrire(); });
  entete.appendChild(selT);
  entete.appendChild(pp);
  var acts = document.createElement("div"); acts.className = "bib-actions";
  boutonBib(acts, "ENREGISTRER AU MICRO", function(){ bibMicro(); });
  boutonBib(acts, "IMPORTER DES FICHIERS", function(){ document.getElementById("bib-fichier").click(); });
  boutonBib(acts, "ÉGALISER LE KIT", function(){ bibEgaliser(); });
  boutonBib(acts, "OPTIMISER LA MÉMOIRE", function(){ bibOptimiser(); });
  boutonBib(acts, "EXPORTER POUR LA CARTE ES-1", function(){ bibExportEs1(); });
  /* v255 : fabriquer des sons avec la machine affichée */
  if(typeof peutFiger === "function" && peutFiger(S.modele))
    boutonBib(acts, "FIGER LA MACHINE AFFICHÉE", function(){ figerMachine(S.modele); });
  if(typeof reechantillonnerMachine === "function")
    boutonBib(acts, "RÉÉCHANTILLONNER (" + WAVX.mesures + " MES.)", function(){ reechantillonnerMachine(); });
  entete.appendChild(acts);
  corps.appendChild(entete);

  var h = document.createElement("h3"); h.textContent = "Sons";
  corps.appendChild(h);
  /* v252 : recherche, filtres, tri ; seule la liste est refaite à chaque frappe */
  if(typeof bibRendreFiltres === "function") bibRendreFiltres(corps, function(){ bibRendreListeSons(corps); });
  bibRendreListeSons(corps);
}
function bibRendreListeSons(corps){
  if(corps.querySelectorAll){
    var vieux = corps.querySelectorAll(".bib-ligne, .bib-plus, .bib-vide");
    for(var v=0;v<vieux.length;v++) vieux[v].parentNode.removeChild(vieux[v]);
  }
  var tous = bibSons();
  var r = typeof bibClasserSons === "function" ? bibClasserSons(tous) : {l:tous, total:tous.length, tous:tous.length};
  if(typeof bibMajCompte === "function") bibMajCompte(r);
  if(!r.total){
    var p0 = document.createElement("p"); p0.className = "bib-vide"; p0.style.opacity = ".7";
    p0.textContent = "Aucun son ne correspond.";
    corps.appendChild(p0);
  }
  r.l.forEach(function(s){ corps.appendChild(bibLigneSon(s)); });
  if(r.total > r.l.length){
    var plus = document.createElement("div"); plus.className = "bib-actions bib-plus";
    boutonBib(plus, "AFFICHER " + Math.min(BIB_PAGE, r.total - r.l.length) + " DE PLUS (" + (r.total - r.l.length) + " RESTANTS)", function(){
      bibFiltre().n += BIB_PAGE; bibRendreListeSons(corps);
    });
    corps.appendChild(plus);
  }
}
function bibLigneSon(s){
  var l = ligneBib(s.nom, (s.propre ? "à vous" : "banque") +
    (s.duree ? (" · " + s.duree.toFixed(2) + " s · " + Math.round(s.freq/1000) + " kHz") : " · non chargé"));
  var a = document.createElement("div"); a.className = "bib-actions";
  boutonBib(a, "ÉCOUTER", function(){
    audioInit(); banqueEs();
    var b = ES.buf[s.id];
    if(!b) return;
    var src = ctx.createBufferSource(); src.buffer = b;
    var g = ctx.createGain(); g.gain.value = 0.8;
    src.connect(g); g.connect(master); src.start();
  });
  boutonBib(a, "AFFECTER", function(){
    if(typeof affecterDepuisListe === "function") affecterDepuisListe(s.id); else bibAffecter(s.id);
  });
  /* v253 : l'essai remplace le son pendant la lecture, sans l'arrêter */
  if(typeof essayerSon === "function") boutonBib(a, "ESSAYER", function(){ essayerSon(s.id); });
  if(typeof edOuvrir === "function") boutonBib(a, "ÉDITER", function(){ edOuvrir(s.id); });   /* v254 */
  if(typeof ESSAI !== "undefined" && ESSAI && ESSAI.id === s.id) l.setAttribute("aria-current", "true");
  if(s.propre) boutonBib(a, "TRAITER", function(){
    audioInit();
    var b = ES.buf[s.id];
    if(!b){ signal("SON INTROUVABLE"); return; }
    var r = traiterSon(b, BIB.preset || "punch", 0);
    if(!r.rapport){ signal("AUCUN TRAITEMENT CHOISI"); return; }
    /* v254 : même chemin que l'éditeur — les tranches du KAOSS sont oubliées aussi */
    var garde;
    if(typeof edPoserTampon === "function") garde = edPoserTampon(s.id, r.buffer);
    else { ES.buf[s.id] = r.buffer; delete ES.inv[s.id]; garde = sauverEch(s.id, r.buffer); }
    majBibUI();
    signal(!garde ? "SON TRAITÉ POUR CETTE SESSION · ÉCHEC D'ÉCRITURE"
      : (r.rapport.gain >= 0 ? "+" : "") + r.rapport.gain + " dB · CRÊTE " + r.rapport.apres.crete + " dB");
  });
  boutonBib(a, "RENOMMER", function(){
    renommer("Nom du son", s.nom, function(v){
      if(v) BIB.noms[s.id] = v; else delete BIB.noms[s.id];
      if(BIB.meta && BIB.meta[s.id]) delete BIB.meta[s.id].a;   /* v252 : nouveau nom, catégorie redevinée */
      bibEcrire(); majBibUI();
    });
  });
  /* v258 : SUPPRIMER met à la corbeille, réversible depuis SAUVEGARDES ·
     Nettoyage ; VIDER LA CORBEILLE ou trente jours l'effacent pour de bon */
  if(s.propre) boutonBib(a, "METTRE À LA CORBEILLE", function(){
    if(!bibMettreCorbeille(s.id)) return;
    majBibUI(); H.inter();
    signal(s.nom + " → CORBEILLE · RESTAURABLE DEPUIS SAUVEGARDES");
  });
  l.appendChild(a);
  if(typeof bibDecorerLigne === "function") bibDecorerLigne(l, s);
  if(BIB.freesound && BIB.freesound[s.id]) fsonAfficherCredits(l, BIB.freesound[s.id]);
  return l;
}
function bibRendrePrises(corps){
  enrCharger();
  var h = document.createElement("h3"); h.textContent = "Prises MIDI";
  corps.appendChild(h);
  if(!ENR.prises.length){
    var p = document.createElement("p");
    p.style.opacity = ".7";
    p.textContent = "Aucune prise. L'enregistreur MIDI en fabrique.";
    corps.appendChild(p);
  }
  ENR.prises.forEach(function(pr, i){
    var l = ligneBib(pr.nom, pr.date + " · " + dureeTexte(pr.duree) + " · " + pr.evts.length + " évén. · " + pr.bpm + " BPM");
    var a = document.createElement("div"); a.className = "bib-actions";
    boutonBib(a, "JOUER", function(){ enrJouer(i); });
    boutonBib(a, "STOP", function(){ enrArreterLecture(); });
    boutonBib(a, "TRAVAILLER", function(){ ouvrirPr(); setTimeout(function(){
      document.getElementById("pr-prise").value = i;
      prArreter(); prExtraire(i); prDessiner(); majPrUI();
    }, 120); });
    boutonBib(a, ".MID", function(){ enrExporter(i); });
    boutonBib(a, "RENOMMER", function(){
      renommer("Nom de la prise", pr.nom, function(v){
        if(v){ pr.nom = v; enrEcrire(); majBibUI(); }
      });
    });
    boutonBib(a, "SUPPRIMER", function(){
      if(!window.confirm("Supprimer « " + pr.nom + " » ?")) return;
      enrSupprimer(i); majBibUI();
    });
    l.appendChild(a);
    corps.appendChild(l);
  });
}
function bibRendreSauvegardes(corps){
  projetRendre(corps);   /* v145 : les projets .drm16 d'abord */
  if(typeof packRendre === "function") packRendre(corps);   /* v257 : packs et kits */
  if(typeof nettoyageRendre === "function") nettoyageRendre(corps);   /* v258 : corbeille, sans emploi, doublons */
  var hm = document.createElement("h3"); hm.textContent = "Machines Korg branchées";
  corps.appendChild(hm);
  var p1 = document.createElement("p");
  p1.innerHTML = "Une sauvegarde lit <b>tout ce que contient la machine branchée</b> et l'écrit en fichier " +
    ".syx dans le dossier Documents de l'application. Renvoyez-la pour remettre la machine comme avant.";
  corps.appendChild(p1);
  var acts = document.createElement("div"); acts.className = "bib-actions";
  boutonBib(acts, "SAUVEGARDER LA MACHINE BRANCHÉE", function(){ bibDemanderSauvegarde(); }, false);
  corps.appendChild(acts);
  var h = document.createElement("h3"); h.textContent = "Sauvegardes";
  corps.appendChild(h);
  var l = bibFichiers(".syx");
  if(!l.length){
    var p2 = document.createElement("p");
    p2.style.opacity = ".7";
    p2.textContent = "Aucune sauvegarde pour le moment.";
    corps.appendChild(p2);
  }
  l.forEach(function(f){
    var d = new Date(f.date);
    var li = ligneBib(BIB.noms["f:" + f.nom] || f.nom,
      octetsTexte(f.taille) + " · " + d.getDate() + "/" + (d.getMonth()+1) + " " +
      ("0"+d.getHours()).slice(-2) + "h" + ("0"+d.getMinutes()).slice(-2));
    var a = document.createElement("div"); a.className = "bib-actions";
    boutonBib(a, "RENVOYER À LA MACHINE", function(){ bibRenvoyer(f.nom); });
    boutonBib(a, "RENOMMER", function(){
      renommer("Nom de la sauvegarde", BIB.noms["f:" + f.nom] || f.nom, function(v){
        if(v) BIB.noms["f:" + f.nom] = v; else delete BIB.noms["f:" + f.nom];
        bibEcrire(); majBibUI();
      });
    });
    boutonBib(a, "SUPPRIMER", function(){ bibSupprimerFichier(f.nom); });
    li.appendChild(a);
    corps.appendChild(li);
  });
  var p3 = document.createElement("p");
  p3.style.opacity = ".6";
  p3.style.fontSize = "12.5px";
  var pj = HOST;
  var dossier = "";
  try{ dossier = (pj && pj.fichierDossier) ? pj.fichierDossier() : ""; }catch(e){}
  p3.textContent = dossier ? ("Dossier : " + dossier) : "";
  corps.appendChild(p3);
}
function bibMicro(){
  if(ES_REC.mr){ try{ ES_REC.mr.stop(); }catch(e){} return; }
  audioInit(); banqueEs();
  var p = HOST;
  if(p && p.micro){
    var ok = false;
    try{ ok = !!p.micro(); }catch(e){}
    if(!ok){ signal("AUTORISEZ LE MICRO PUIS RECOMMENCEZ"); return; }
  }
  if(!navigator.mediaDevices || !window.MediaRecorder){ signal("MICRO INDISPONIBLE"); return; }
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(flux){
    var morceaux = [], mr = new MediaRecorder(flux), minuteur = null;
    ES_REC.mr = mr;
    signal("ENREGISTREMENT · RETOUCHEZ POUR ARRÊTER");
    mr.ondataavailable = function(e){ if(e.data && e.data.size) morceaux.push(e.data); };
    mr.onstop = function(){
      clearTimeout(minuteur);
      flux.getTracks().forEach(function(t){ t.stop(); });
      if(ES_REC.mr === mr) ES_REC.mr = null;
      new Blob(morceaux).arrayBuffer().then(function(ab){
        return new Promise(function(res, rej){
          var decode = ctx.decodeAudioData(ab, res, rej);
          if(decode && decode.catch) decode.catch(rej);
        });
      }).then(function(buf){
        if(PROJET_EN_COURS) return;
        var court = reduireEch(buf, 32000, 8);
        var r = traiterSon(court, BIB.preset || "punch", 0);
        court = r.buffer;
        var id = "u" + Date.now().toString(36);
        ES.buf[id] = court; ES.noms[id] = "mic";
        var garde = sauverEch(id, court);
        majBibUI();
        signal(!garde ? "SON DISPONIBLE POUR CETTE SESSION · ÉCHEC D'ÉCRITURE"
          : (r.rapport ? ("SON AJOUTÉ · " + (r.rapport.gain >= 0 ? "+" : "") + r.rapport.gain + " dB")
                       : "SON AJOUTÉ À LA BIBLIOTHÈQUE"));
      }).catch(function(){ signal("DÉCODAGE IMPOSSIBLE"); });
    };
    mr.start();
    minuteur = setTimeout(function(){ if(ES_REC.mr === mr) try{ mr.stop(); }catch(e){} }, 8000);
  }).catch(function(){ signal("MICRO REFUSÉ"); });
}
/* ---------- égaliser le kit de la machine courante ----------
   Deux précautions reprises de MOC'TA BASS : on aligne sur le plus faible,
   parce qu'un son déjà au plafond ne peut pas monter ; et on itère, parce
   que la courbe des boutons rend la réponse au gain non linéaire. */
function bibPartiesNiveau(){
  var m = S.modele, l = [];
  if(m === "es1" || m === "es2") for(var i=0;i<9;i++) l.push({son:ES.pat.son[i], nom:ES_PARTS[i].n});
  else if(m === "esx") for(var j=0;j<9;j++) l.push({son:SX.pat.son[j], nom:nomPartieSx(j)});
  else if(m === "mpc3000" || m === "mpc2000")
    for(var k=0;k<64;k++) if(ES.buf[MPC.pads[k].ech]) l.push({son:MPC.pads[k], nom:padNom(k)});
  return l;
}
function bibEgaliser(){
  audioInit(); banqueEs();
  var parties = bibPartiesNiveau();
  if(!parties.length){ signal("PASSEZ SUR UN ÉCHANTILLONNEUR OU UNE MPC"); return; }
  var mesures = [], i, p;
  var champ = S.modele === "mpc3000" || S.modele === "mpc2000" ? "niv" : "lvl";
  for(i=0;i<parties.length;i++){
    p = parties[i];
    var b = ES.buf[p.son.ech];
    if(!b){ mesures.push(null); continue; }
    mesures.push(trLufs(b.getChannelData(0), b.sampleRate));
  }
  var valides = mesures.filter(function(x){ return x !== null; });
  if(valides.length < 2){ signal("PAS ASSEZ DE SONS À ÉGALISER"); return; }
  /* MOC'TA BASS aligne sur le plus faible, parce qu'un fichier déjà au plafond
     ne peut pas monter. Ici le levier est un bouton de niveau, pas le fichier :
     aligner sur le plus faible descendrait tout le kit de quinze décibels dès
     qu'un son est très en dessous. On vise donc la médiane, et on dit combien
     de sons n'ont pas pu l'atteindre. */
  var niv0 = [];
  for(i=0;i<parties.length;i++)
    if(mesures[i] !== null) niv0.push(mesures[i] + linDb(parties[i].son[champ]));
  niv0.sort(function(a, b){ return a - b; });
  var cible = niv0[Math.floor(niv0.length / 2)];
  var ecart = 0;
  for(var passe=0; passe<4; passe++){
    ecart = 0;
    for(i=0;i<parties.length;i++){
      if(mesures[i] === null) continue;
      p = parties[i];
      var actuel = mesures[i] + linDb(p.son[champ]);
      var delta = cible - actuel;
      if(Math.abs(delta) < 0.3) continue;
      ecart = Math.max(ecart, Math.abs(delta));
      /* on cherche le réglage de bouton qui donne le niveau visé */
      var voulu = p.son[champ] * dbLin(delta);
      var lo = 0, hi = 1;
      for(var it=0; it<24; it++){
        var mi = (lo + hi) / 2;
        if(mi < voulu) lo = mi; else hi = mi;
      }
      p.son[champ] = Math.max(0, Math.min(1, (lo + hi) / 2));
    }
  }
  var reste = 0, courts = 0;
  for(i=0;i<parties.length;i++){
    if(mesures[i] === null) continue;
    var e2 = (mesures[i] + linDb(parties[i].son[champ])) - cible;
    if(e2 < -0.5 && parties[i].son[champ] >= 0.999){ courts++; continue; }  /* bouton au maximum */
    reste = Math.max(reste, Math.abs(e2));
  }
  if(S.modele === "es1" || S.modele === "es2"){ majLedsEs(); memEs(); }
  else if(S.modele === "esx"){ majLedsSx(); memSx(); }
  else { majPadsMpc(); majLcdMpc(); memMpc(); }
  signal(valides.length + " SONS ALIGNÉS · ÉCART " + reste.toFixed(2) + " dB" +
         (courts ? (" · " + courts + " TROP FAIBLE" + (courts > 1 ? "S" : "") + " · TRAITEZ-LES") : ""));
  H.inter();
}
function bibOptimiser(){
  audioInit(); banqueEs();
  var l = listeEch().filter(function(id){ return id.charAt(0) !== "b"; });
  if(!l.length){ signal("AUCUN SON À VOUS"); return; }
  var avant = 0, apres = 0, touches = 0, rates = 0;
  l.forEach(function(id){
    var b = ES.buf[id];
    if(!b) return;
    avant += b.length * 2;
    var t = trTauxConseille(b);
    if(t < b.sampleRate){
      var n = reechantillonner(b, t);
      ES.buf[id] = n; delete ES.inv[id];
      if(!sauverEch(id, n)) rates++;
      apres += n.length * 2;
      touches++;
    } else apres += b.length * 2;
  });
  var gain = avant ? Math.round((1 - apres / avant) * 100) : 0;
  majBibUI();
  signal(touches + " SONS ALLÉGÉS · " + gain + " % DE MÉMOIRE GAGNÉE" +
         (rates ? " · " + rates + " SON(S) POUR CETTE SESSION SEULEMENT, ÉCHEC D'ÉCRITURE" : ""));
  H.inter();
}

/* ---------- export vers la carte SmartMedia de l'ES-1 ----------
   Contraintes de la machine, relevées dans KorgManager : WAV 32000 Hz,
   8 ou 16 bits, nommés 00 à 99 à la racine, cent fichiers au plus. */
function bibExportEs1(){
  audioInit(); banqueEs();
  var p = HOST;
  if(!p || !p.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE ICI"); return; }
  var l = listeEch();
  if(!l.length){ signal("AUCUN SON"); return; }
  if(l.length > 100){
    if(!window.confirm("L'ES-1 n'accepte que cent fichiers.\nLes " + (l.length - 100) +
                       " derniers seront laissés de côté. Continuer ?")) return;
    l = l.slice(0, 100);
  }
  var noms = [], ecrits = 0, rates = {};
  l.forEach(function(id, i){
    var b = ES.buf[id];
    if(!b) return;
    if(b.sampleRate !== 32000) b = reechantillonner32(b);   /* la machine n'accepte que ce taux */
    rates[b.sampleRate] = (rates[b.sampleRate] || 0) + 1;
    var nom = ("0" + i).slice(-2) + ".WAV";
    var chemin = "";
    chemin = ecrireDocument(p, nom, wavDe(b));
    if(chemin){ ecrits++; noms.push(("0" + i).slice(-2) + "  " + nomBib(id)); }
  });
  if(ecrits){
    try{ p.fichierSauver("names.txt", btoa(unescape(encodeURIComponent(noms.join("\n") + "\n")))); }catch(e){}
  }
  majBibUI();
  signal(ecrits + " FICHIERS ÉCRITS EN 32 kHz · COPIEZ-LES À LA RACINE DE LA CARTE");
  H.inter();
}
/* rééchantillonnage vers 32 kHz, vers le haut comme vers le bas */
function reechantillonner32(buf){
  var cible = 32000, d = buf.getChannelData(0);
  var n = Math.max(1, Math.round(d.length * cible / buf.sampleRate));
  var out = ctx.createBuffer(1, n, cible), o = out.getChannelData(0);
  var pas = d.length / n;
  for(var i=0;i<n;i++){
    var q = i * pas, i0 = Math.floor(q), f = q - i0;
    o[i] = d[i0] * (1 - f) + (d[Math.min(d.length-1, i0+1)] || d[i0]) * f;
  }
  return out;
}

function ouvrirBib(){
  BIB.ongletAffiche = -1;                     /* une ouverture repart du haut */
  bibLire();
  if(typeof bibPurgerCorbeille === "function") bibPurgerCorbeille();   /* v258 : sons trop vieux effacés en silence */
  arcCharger();
  audioInit(); banqueEs(); chargerEchs();   /* la banque doit exister pour être listée */
  fermerAutresPanneaux("bib");
  document.getElementById("bib").classList.add("show");
  majNoteOuverte();
  majBibUI();
}
function fermerBib(){
  fsonAnnuler();
  if(typeof edArreterEcoute === "function") edArreterEcoute();
  if(typeof annulerEssai === "function" && ESSAI) annulerEssai("ESSAI ANNULÉ · SON D'ORIGINE REMIS");
  document.getElementById("bib").classList.remove("show");
  majNoteOuverte();
  if(S.modele === "kp"){ majKp(); fit(); }     /* noms et sons modifiés dans le panneau */
}
