/* ================= travail du MIDI : éditeur en rouleau =================
   Une prise est convertie en notes (début, durée, hauteur), une piste par son.
   On y ajoute, déplace, allonge, transpose, puis on renvoie vers un fichier .mid
   ou directement dans le motif de la machine affichée. */

/* ---------- conversion d'une prise en notes ---------- */
function prExtraire(i){
  var p = ENR.prises[i];
  PR.notes = []; PR.pistes = []; PR.sel = -1; PR.defil = 0; PR.prise = i;
  if(!p) return;
  var ouvertes = {};
  p.evts.forEach(function(e){
    var st = e[1] & 0xF0, canal = e[1] & 0x0F, note = e[2], vel = e[3];
    var cle = canal + ":" + note;
    if(st === 0x90 && vel > 0){
      ouvertes[cle] = {t:e[0], note:note, canal:canal, vel:vel};
    } else if(st === 0x80 || (st === 0x90 && vel === 0)){
      var o = ouvertes[cle];
      if(o){ PR.notes.push({t:o.t, dur:Math.max(30, e[0]-o.t), note:note, canal:canal, vel:o.vel}); delete ouvertes[cle]; }
    }
  });
  for(var k in ouvertes){
    var o2 = ouvertes[k];
    PR.notes.push({t:o2.t, dur:120, note:o2.note, canal:o2.canal, vel:o2.vel});
  }
  PR.notes.sort(function(a,b){ return a.t - b.t; });
  prPistes();
}
function prPistes(){
  var vues = {};
  PR.notes.forEach(function(n){ vues[n.canal + ":" + n.note] = {canal:n.canal, note:n.note}; });
  var l = [];
  for(var k in vues) l.push(vues[k]);
  if(!l.length){                      /* prise vide : on propose les parties de la machine */
    for(var i=0;i<9;i++) l.push({canal:MIDI.canal, note:MIDI.base + i});
  }
  l.sort(function(a,b){ return (a.canal - b.canal) || (b.note - a.note); });
  PR.pistes = l;
}
function prNomPiste(p){
  if(p.canal === MIDI.canal){
    var k = p.note - MIDI.base;
    var m = S.modele;
    if(k >= 0 && k < 9){
      if(m === "es1" || m === "es2") return ES_PARTS[k].n;
      if(m === "esx") return SX_DRUMS[k];
      if(m === "emx") return "D" + MX_DRUMS[k];
      if(m === "er1" || m === "er2") return ER_PARTS[k].n;
      if(m === "em1") return EM_PARTS[k] ? EM_PARTS[k].nom : nomNote(p.note);
    }
  }
  return nomNote(p.note) + " ·" + (p.canal + 1);
}
function prIndexPiste(n){
  for(var i=0;i<PR.pistes.length;i++)
    if(PR.pistes[i].canal === n.canal && PR.pistes[i].note === n.note) return i;
  return -1;
}
function prPas(){                      /* durée d'un carreau de grille, en millisecondes */
  var bpm = (ENR.prises[PR.prise] && ENR.prises[PR.prise].bpm) || S.bpm;
  return PR.grille ? (60000 / bpm) / PR.grille : 1;
}
function prCaler(t){
  if(!PR.grille) return Math.max(0, Math.round(t));
  var p = prPas();
  return Math.max(0, Math.round(t / p) * p);
}
function prDuree(){
  var f = 2000;
  PR.notes.forEach(function(n){ f = Math.max(f, n.t + n.dur); });
  return f + 1000;
}

/* ---------- dessin ---------- */
var PR_GOUTTIERE = 74, PR_REGLE = 20;
function prDessiner(){
  var cv = PR.cv, ct = PR.ct;
  if(!cv || !ct) return;
  var L = cv.clientWidth, H = PR.pistes.length * PR.hauteurPiste + PR_REGLE;
  var d = window.devicePixelRatio || 1;
  if(cv.width !== Math.round(L*d) || cv.height !== Math.round(H*d)){
    cv.width = Math.round(L*d); cv.height = Math.round(H*d);
    cv.style.height = H + "px";
  }
  ct.setTransform(d,0,0,d,0,0);
  ct.clearRect(0,0,L,H);
  var bpm = (ENR.prises[PR.prise] && ENR.prises[PR.prise].bpm) || S.bpm;
  var msNoire = 60000 / bpm, px = PR.zoom;
  var large = L - PR_GOUTTIERE;

  ct.fillStyle = "#141418"; ct.fillRect(PR_GOUTTIERE, 0, large, H);
  /* règle : traits de noire, traits plus clairs de mesure */
  var t = Math.floor(PR.defil / msNoire) * msNoire;
  while(true){
    var x = PR_GOUTTIERE + (t - PR.defil) * px;
    if(x > L) break;
    if(x >= PR_GOUTTIERE){
      var mesure = Math.round(t / (msNoire*4));
      var estMesure = Math.abs(t - mesure*msNoire*4) < 1;
      ct.fillStyle = estMesure ? "#4a4a56" : "#26262e";
      ct.fillRect(x, 0, estMesure ? 2 : 1, H);
      if(estMesure){
        ct.fillStyle = "#8a8a96";
        ct.font = "10px system-ui, sans-serif";
        ct.fillText(String(mesure + 1), x + 4, 13);
      }
    }
    t += msNoire;
  }
  /* pistes */
  PR.pistes.forEach(function(p, i){
    var y = PR_REGLE + i * PR.hauteurPiste;
    ct.fillStyle = (i % 2) ? "#17171c" : "#121216";
    ct.fillRect(PR_GOUTTIERE, y, large, PR.hauteurPiste);
    ct.fillStyle = "#2a2a33";
    ct.fillRect(PR_GOUTTIERE, y + PR.hauteurPiste - 1, large, 1);
    ct.fillStyle = "#0e0e12";
    ct.fillRect(0, y, PR_GOUTTIERE, PR.hauteurPiste);
    ct.fillStyle = "#c8c4bb";
    ct.font = "600 11px system-ui, sans-serif";
    ct.fillText(prNomPiste(p).slice(0, 9), 6, y + PR.hauteurPiste/2 + 4);
  });
  ct.fillStyle = "#0e0e12"; ct.fillRect(0, 0, PR_GOUTTIERE, PR_REGLE);
  ct.fillStyle = "#2a2a33"; ct.fillRect(PR_GOUTTIERE - 1, 0, 1, H);
  /* notes */
  PR.notes.forEach(function(n, idx){
    var i = prIndexPiste(n);
    if(i < 0) return;
    var x = PR_GOUTTIERE + (n.t - PR.defil) * px;
    var w = Math.max(4, n.dur * px);
    if(x + w < PR_GOUTTIERE || x > L) return;
    var y = PR_REGLE + i * PR.hauteurPiste + 3;
    var h = PR.hauteurPiste - 7;
    if(x < PR_GOUTTIERE){ w -= (PR_GOUTTIERE - x); x = PR_GOUTTIERE; }
    ct.fillStyle = (idx === PR.sel) ? "#ff6a3d" : ("rgba(255,150,80," + (0.35 + n.vel/255) + ")");
    ct.fillRect(x, y, w, h);
    if(idx === PR.sel){ ct.strokeStyle = "#fff"; ct.lineWidth = 1.5; ct.strokeRect(x, y, w, h); }
  });
  /* tête de lecture */
  if(PR.lecture){
    var tc = performance.now() - PR.t0;
    var xc = PR_GOUTTIERE + (tc - PR.defil) * px;
    if(xc >= PR_GOUTTIERE && xc <= L){
      ct.fillStyle = "#3dff7a"; ct.fillRect(xc, 0, 2, H);
    }
  }
}

/* ---------- gestes ---------- */
function prInstallerGestes(){
  var cv = PR.cv, etat = null;
  cv.addEventListener("pointerdown", function(e){
    var r = cv.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    cv.setPointerCapture(e.pointerId);
    if(x < PR_GOUTTIERE || y < PR_REGLE){ etat = {mode:"defil", x0:e.clientX, d0:PR.defil}; return; }
    var piste = Math.floor((y - PR_REGLE) / PR.hauteurPiste);
    var t = PR.defil + (x - PR_GOUTTIERE) / PR.zoom;
    var trouve = -1;
    for(var i=PR.notes.length-1;i>=0;i--){
      var n = PR.notes[i];
      if(prIndexPiste(n) !== piste) continue;
      if(t >= n.t - 20/PR.zoom && t <= n.t + n.dur) { trouve = i; break; }
    }
    if(trouve >= 0){
      PR.sel = trouve;
      etat = {mode:"note", x0:e.clientX, t0:PR.notes[trouve].t, i:trouve, bouge:false};
    } else if(piste >= 0 && piste < PR.pistes.length){
      var p = PR.pistes[piste];
      PR.notes.push({t:prCaler(t), dur:Math.max(60, prPas()), note:p.note, canal:p.canal, vel:100});
      PR.notes.sort(function(a,b){ return a.t - b.t; });
      PR.sel = PR.notes.findIndex(function(n2){ return n2.t === prCaler(t) && n2.note === p.note && n2.canal === p.canal; });
      etat = {mode:"rien"};
      prEcho(p.canal, p.note);
      H.cran();
    }
    prDessiner(); majPrUI();
  });
  cv.addEventListener("pointermove", function(e){
    if(!etat) return;
    if(etat.mode === "defil"){
      PR.defil = Math.max(0, etat.d0 - (e.clientX - etat.x0) / PR.zoom);
      prDessiner();
    } else if(etat.mode === "note"){
      var d = (e.clientX - etat.x0) / PR.zoom;
      if(Math.abs(e.clientX - etat.x0) > 6){
        etat.bouge = true;
        PR.notes[etat.i].t = prCaler(etat.t0 + d);
        prDessiner();
      }
    }
  });
  function fin(){ etat = null; }
  cv.addEventListener("pointerup", fin);
  cv.addEventListener("pointercancel", fin);
}
function prEcho(canal, note){
  if(!ctx) audioInit();
  var sauve = ENR.actif; ENR.actif = false;
  var sauveIn = MIDI.in; MIDI.in = true;
  try{ window.__midi(0x90 | canal, note, 100); }catch(e){}
  MIDI.in = sauveIn; ENR.actif = sauve;
}

/* ---------- actions ---------- */
function prAgir(quoi){
  var n = PR.notes[PR.sel];
  if(!n && quoi !== "caler"){ signal("CHOISISSEZ D'ABORD UNE NOTE"); return; }
  var p = prPas();
  if(quoi === "gauche") n.t = Math.max(0, n.t - p);
  else if(quoi === "droite") n.t += p;
  else if(quoi === "court") n.dur = Math.max(30, n.dur - p);
  else if(quoi === "long") n.dur += p;
  else if(quoi === "haut" || quoi === "bas"){
    var i = prIndexPiste(n) + (quoi === "haut" ? -1 : 1);
    if(i < 0 || i >= PR.pistes.length) return;
    n.canal = PR.pistes[i].canal; n.note = PR.pistes[i].note;
    prEcho(n.canal, n.note);
  }
  else if(quoi === "double"){
    PR.notes.push({t:n.t + p, dur:n.dur, note:n.note, canal:n.canal, vel:n.vel});
  }
  else if(quoi === "supprimer"){
    PR.notes.splice(PR.sel, 1); PR.sel = -1;
  }
  else if(quoi === "caler"){
    PR.notes.forEach(function(x){ x.t = prCaler(x.t); });
    signal("TOUT CALÉ SUR LA GRILLE");
  }
  PR.notes.sort(function(a,b){ return a.t - b.t; });
  prDessiner(); majPrUI();
  H.cran();
}

/* ---------- relecture ---------- */
function prJouer(){
  prArreter();
  PR.lecture = true;
  PR.t0 = performance.now() - PR.defil;
  var sauveIn = MIDI.in;
  PR.notes.forEach(function(n){
    if(n.t + n.dur < PR.defil) return;
    PR.tmr.push(setTimeout(function(){
      var s = ENR.actif; ENR.actif = false; MIDI.in = true;
      try{ window.__midi(0x90 | n.canal, n.note, n.vel); }catch(e){}
      MIDI.in = sauveIn; ENR.actif = s;
    }, Math.max(0, n.t - PR.defil)));
  });
  PR.tmr.push(setTimeout(function(){ prArreter(); }, prDuree() - PR.defil));
  (function boucle(){
    if(!PR.lecture) return;
    prDessiner();
    PR.anim = requestAnimationFrame(boucle);
  })();
  majPrUI();
}
function prArreter(){
  PR.tmr.forEach(function(t){ clearTimeout(t); });
  PR.tmr = [];
  if(PR.anim) cancelAnimationFrame(PR.anim);
  PR.anim = null;
  PR.lecture = false;
  midiSilence();
  prDessiner(); majPrUI();
}

/* ---------- enregistrement des modifications ---------- */
function prVersEvenements(){
  var evts = [];
  PR.notes.forEach(function(n){
    evts.push([Math.round(n.t), 0x90 | n.canal, n.note, n.vel]);
    evts.push([Math.round(n.t + n.dur), 0x80 | n.canal, n.note, 0]);
  });
  evts.sort(function(a,b){ return a[0] - b[0]; });
  return evts;
}
function prGarder(){
  var p = ENR.prises[PR.prise];
  if(!p){ signal("AUCUNE PRISE CHOISIE"); return; }
  p.evts = prVersEvenements();
  p.duree = prDuree();
  enrEcrire();
  signal("PRISE MISE À JOUR · " + PR.notes.length + " NOTES");
  H.inter();
}
/* ---------- report dans le motif de la machine ---------- */
function prVersMotif(){
  var m = S.modele, p = ENR.prises[PR.prise];
  if(!p){ signal("AUCUNE PRISE CHOISIE"); return; }
  var bpm = p.bpm || S.bpm;
  var pas = (60000 / bpm) / 4;                 /* un pas de double croche */
  var etats = {"em1":EM, "er1":ER, "er2":ER, "ea1":EA, "ea2":EA,
               "es1":ES, "es2":ES, "emx":MX, "esx":SX}[m];
  if(!etats){ signal("PAS DE MOTIF SUR CETTE MACHINE"); return; }
  var pat = etats.pat, nb = pat.st.length, k, i;
  for(k=0;k<nb;k++) for(i=0;i<16;i++) pat.st[k][i] = 0;
  var places = 0, hors = 0;
  PR.notes.forEach(function(n){
    var pasIdx = Math.round(n.t / pas);
    if(pasIdx < 0 || pasIdx > 15){ hors++; return; }
    var k2 = (n.canal === MIDI.canal) ? (n.note - MIDI.base) : (10 + (n.canal - MIDI.canalSy));
    if(k2 < 0 || k2 >= nb){ hors++; return; }
    pat.st[k2][pasIdx] = 1;
    if(pat.nt && n.canal !== MIDI.canal) pat.nt[k2][pasIdx] = n.note;
    places++;
  });
  if(m === "em1"){ majTouches(); memEm(); }
  else if(m[0]==="e" && m[1]==="r"){ majTouchesEr(); memEr(); }
  else if(m[0]==="e" && m[1]==="a"){ majTouchesEa(); memEa(); }
  else if(m === "esx"){ majTouchesSx(); memSx(); }
  else if(m === "emx"){ majTouchesMx(); memMx(); }
  else { majTouchesEs(); memEs(); }
  signal(places + " NOTES POSÉES DANS LE MOTIF" + (hors ? (" · " + hors + " HORS MESURE") : ""));
  H.inter();
}

/* ---------- interface ---------- */
function majPrUI(){
  var e = document.getElementById("pr-etat");
  if(!e) return;
  var n = PR.notes[PR.sel];
  e.textContent = PR.notes.length + " notes · " + PR.pistes.length + " pistes"
    + (n ? (" · choisie : " + prNomPiste(n) + " à " + (n.t/1000).toFixed(2) + " s") : " · aucune note choisie");
  document.getElementById("pr-grille").textContent =
    "GRILLE : " + (PR.grille === 0 ? "LIBRE" : (PR.grille === 2 ? "CROCHE" : PR.grille === 4 ? "DOUBLE" : "TRIPLE"));
  document.getElementById("pr-jouer").textContent = PR.lecture ? "■ STOP" : "▶ JOUER";
}
function prRemplirListe(){
  var sel = document.getElementById("pr-prise");
  sel.innerHTML = "";
  if(!ENR.prises.length){
    var o = document.createElement("option");
    o.textContent = "Aucune prise — passez par l'enregistreur";
    sel.appendChild(o);
    return;
  }
  ENR.prises.forEach(function(p, i){
    var o = document.createElement("option");
    o.value = i;
    o.textContent = p.nom + " · " + dureeTexte(p.duree) + " · " + p.evts.length + " évén.";
    sel.appendChild(o);
  });
}
function ouvrirPr(){
  enrCharger();
  fermerAutresPanneaux("pr");
  document.getElementById("pr").classList.add("show");
  majNoteOuverte();
  prRemplirListe();
  if(ENR.prises.length) prExtraire(0);
  else { PR.notes = []; PR.prise = -1; prPistes(); }
  if(PR.selMachine) PR.selMachine.value = S.modele;
  if(!PR.cv){
    PR.cv = document.getElementById("pr-canvas");
    PR.ct = PR.cv.getContext("2d");
    prInstallerGestes();
  }
  setTimeout(function(){ prDessiner(); majPrUI(); }, 30);
}
function fermerPr(){
  prArreter();
  document.getElementById("pr").classList.remove("show");
  majNoteOuverte();
}

