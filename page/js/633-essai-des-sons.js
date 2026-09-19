/* ================= essayer un son dans le morceau (v253) =================
   Choisir un son à l'oreille, c'est l'entendre à sa place, dans le motif qui
   tourne. ESSAYER pose le son sur la partie visée (« Affecter à ») SANS
   arrêter la lecture ; on en essaie un autre, puis un autre ; GARDER valide,
   ANNULER remet le son d'origine. Une barre en haut de la bibliothèque dit ce
   qui est à l'essai et lance ou arrête la lecture.

   Le son d'origine est relevé sur l'objet même de la partie (le motif, le
   programme de la MPC) : si la lecture change de motif entre-temps, c'est bien
   là qu'il revient. Fermer la bibliothèque, ou rouvrir une machine, annule
   l'essai d'abord. GARDER laisse aussi « REMETTRE LES SONS D'AVANT » du rayon
   MACHINES revenir au son d'origine. */

var ESSAI = null;

/* ce que joue la partie visée, et de quoi le remettre exactement */
function essaiLirePartie(m, k){
  var o = null, champs = ["ech"], id = null;
  if(m === "es1" || m === "es2") o = ES.pat.son[k];
  else if(m === "esx") o = SX.pat.son[k];
  else if(m === "mpc3000" || m === "mpc2000") o = MPC.pads[k];
  else if(m === "emx"){ o = MX.pat.son[k]; champs = ["tim"]; }
  else if(m === "er2"){ o = ER.pat.son[bibIndexReel(m, k)]; champs = ["pcm"]; }
  else if(m === "vlc") o = motifVlcCur().parties[k];
  else if(m === "t1k") o = motifT1kCur().instr[k];
  else if(m === "arcm"){ o = motifArcmCur().pistes[k]; champs = ["ech","nom"]; }
  else if(m === "kp") return {id:KP.banques[k] ? KP.banques[k].ech : null};
  else if(m === "stk") return {id:STK.pistes[k] ? STK.pistes[k].ech : null};
  else if(m === "mc"){
    var P = MC.pistes[k + 1];
    if(!P) return null;
    return {id:P.ech || null, looper:!!P.looper, synth:P.type === "synth"};
  }
  else if(m === "ko") return {id:KO.sons[k] || null};
  if(!o) return null;
  if(champs[0] === "tim") id = typeof o.tim === "number" ? "b" + o.tim : null;
  else if(champs[0] === "pcm") id = typeof o.pcm === "number" ? "b" + o.pcm : null;
  else id = o.ech || null;
  var sauve = {};
  champs.forEach(function(c){ sauve[c] = o[c]; });
  return {id:id, objet:o, sauve:sauve};
}
function essaiNomCible(m, k){
  var nom = m;
  BIB_MACHINES.forEach(function(x){ if(x[0] === m) nom = x[1]; });
  return nom + " · " + bibNomPartie(m, bibIndexReel(m, k));
}
function essayerSon(id){
  if(typeof PROJET_EN_COURS !== "undefined" && PROJET_EN_COURS) return false;
  var m = BIB.cible.machine, k = BIB.cible.partie;
  if(ESSAI && (ESSAI.m !== m || ESSAI.k !== k)) annulerEssai("ESSAI PRÉCÉDENT ANNULÉ");
  if(ESSAI && ESSAI.id === id) return true;
  if(!ESSAI){
    if(S.modele !== m){
      allerMachine(m);
      if(S.modele !== m) return false;
      signal("MACHINE OUVERTE · ▶ LANCE LA LECTURE");
    }
    var p = essaiLirePartie(m, k);
    if(!p){ signal("CETTE PARTIE NE PEUT PAS ESSAYER DE SON"); return false; }
    if(p.looper){ signal("ESSAI IMPOSSIBLE SUR UNE PISTE LOOPER"); return false; }
    if(m === "mc" && !p.synth){ signal("CHOISISSEZ UNE PISTE MÉLODIQUE"); return false; }
    ESSAI = {m:m, k:k, avant:p.id, objet:p.objet || null, sauve:p.sauve || null, id:null,
             instant:(typeof kitsInstantane === "function" && KITS_MACHINES[m]) ? kitsInstantane(m, false) : null};
  }
  var avant = ESSAI.id;
  BIB.cible = {machine:m, partie:k};
  if(bibAffecter(id, true) !== true){
    if(avant === null){ ESSAI = null; }
    majBarreEssai();
    return false;
  }
  ESSAI.id = id;
  majBarreEssai();
  bibMarquerEssai();
  return true;
}
/* remettre le son d'origine, là où il était */
function essaiRemettre(){
  var e = ESSAI, m = e.m;
  if(e.objet && e.sauve){
    for(var c in e.sauve) e.objet[c] = e.sauve[c];
    essaiEnregistrer(m);
    return true;
  }
  if(e.avant === null || e.avant === undefined){
    /* un emplacement vide (MC-101, SmplTrek) le redevient */
    if(m === "mc" && MC.pistes[e.k + 1]){ MC.pistes[e.k + 1].ech = null; essaiEnregistrer(m); return true; }
    if(m === "stk" && STK.pistes[e.k]){ STK.pistes[e.k].ech = null; essaiEnregistrer(m); return true; }
    return false;
  }
  BIB.cible = {machine:m, partie:e.k};
  return bibAffecter(e.avant, true) === true;
}
function essaiEnregistrer(m){
  var f = {es1:"memEs", es2:"memEs", esx:"memSx", emx:"memMx", er2:"memEr", mpc3000:"memMpc", mpc2000:"memMpc",
           vlc:"memVlc", t1k:"memT1k", arcm:"memArcm", mc:"memMc", stk:"memStk"}[m];
  try{ if(f && typeof window[f] === "function") window[f](); }catch(x){}
  var maj = {es1:["majLedsEs"], es2:["majLedsEs"], esx:["majLedsSx"], emx:["majLedsMx"],
             mpc3000:["majPadsMpc","majLcdMpc"], mpc2000:["majPadsMpc","majLcdMpc"],
             vlc:["majVlc"], t1k:["majT1k","majKnobsT1k"], arcm:["majArcm"], mc:["majMc"], stk:["majStk"]}[m] || [];
  if(S.modele === m) maj.forEach(function(n){ try{ if(typeof window[n] === "function") window[n](); }catch(x){} });
}
function annulerEssai(message){
  if(!ESSAI) return false;
  var ok = false;
  try{ ok = essaiRemettre(); }catch(e){ ok = false; }
  var nom = ESSAI.avant ? nomBib(ESSAI.avant) : "vide";
  ESSAI = null;
  majBarreEssai(); bibMarquerEssai();
  signal(message || (ok ? "ESSAI ANNULÉ · " + nom + " REMIS" : "SON D'ORIGINE INTROUVABLE"));
  H.inter();
  return ok;
}
function garderEssai(){
  if(!ESSAI) return false;
  var e = ESSAI;
  ESSAI = null;
  /* le rayon MACHINES pourra revenir au son d'origine */
  if(e.instant && typeof kitsLireTout === "function"){
    var tout = kitsLireTout(), d = kitsDe(tout, e.m);
    d.avant = e.instant; d.avant.date = Date.now();
    kitsEcrireTout(tout);
  }
  try{ writeMem(); }catch(x){}
  majBarreEssai(); bibMarquerEssai();
  signal("GARDÉ : " + nomBib(e.id) + " → " + essaiNomCible(e.m, e.k));
  H.inter();
  return true;
}
/* AFFECTER pendant un essai : sur la même partie, c'est « celui-là » ;
   ailleurs, l'essai est annulé avant */
function affecterDepuisListe(id){
  if(ESSAI){
    if(ESSAI.m === BIB.cible.machine && ESSAI.k === BIB.cible.partie){
      if(essayerSon(id)) garderEssai();
      majBibUI();
      return;
    }
    annulerEssai("ESSAI ANNULÉ");
  }
  bibAffecter(id);
}
/* une réouverture de machine recharge sa mémoire : l'essai est annulé d'abord */
function essaiAvantOuverture(){
  if(ESSAI) annulerEssai("ESSAI ANNULÉ · LA MACHINE A ÉTÉ ROUVERTE");
}

/* ---------- barre d'essai ---------- */
function majBarreEssai(){
  var b = document.getElementById("bib-essai");
  if(!b) return;
  if(!ESSAI || !ESSAI.id){ b.hidden = true; return; }
  b.hidden = false;
  document.getElementById("bib-essai-quoi").textContent = nomBib(ESSAI.id);
  var muet = "";
  /* la TR-1000 mélange l'échantillon au son analogique par MIX : à zéro, on ne l'entend pas */
  try{ if(ESSAI.m === "t1k" && !(motifT1kCur().instr[ESSAI.k].mix > 0.02)) muet = " · MIX à 0 : montez MIX pour l'entendre"; }catch(e){}
  document.getElementById("bib-essai-ou").textContent = essaiNomCible(ESSAI.m, ESSAI.k) +
    " · avant : " + (ESSAI.avant ? nomBib(ESSAI.avant) : "vide") + muet;
  var j = document.getElementById("bib-essai-jouer");
  j.textContent = S.run ? "■ ARRÊT" : "▶ LECTURE";
  j.classList.toggle("on", !!S.run);
  j.setAttribute("aria-pressed", String(!!S.run));
}
function bibMarquerEssai(){
  var l = document.querySelectorAll("#bib-corps .bib-ligne");
  for(var i=0;i<l.length;i++){
    var b = l[i].querySelector("b"), cour = ESSAI && ESSAI.id && b && b.textContent === nomBib(ESSAI.id);
    if(cour) l[i].setAttribute("aria-current", "true"); else l[i].removeAttribute("aria-current");
  }
}
(function(){
  var j = document.getElementById("bib-essai-jouer");
  if(!j) return;
  j.addEventListener("click", function(){
    if(S.run) stop(); else start();
    majBarreEssai(); H.start();
  });
  document.getElementById("bib-essai-garder").addEventListener("click", function(){ garderEssai(); majBibUI(); });
  document.getElementById("bib-essai-annuler").addEventListener("click", function(){ annulerEssai(); majBibUI(); });
})();
