/* ================= éditeur de son (v254) =================
   ÉDITER, sur un son de la bibliothèque, ouvre un petit éditeur : forme
   d'onde avec une sélection (début et fin, au doigt ou aux curseurs), écoute
   de la sélection, et des gestes simples :
   ROGNER (garder la sélection), RETIRER (couper la sélection), FONDU
   D'ENTRÉE et DE SORTIE (sur la sélection), NORMALISER, −3 dB / +3 dB,
   INVERSER, HAUTEUR (tout le son, en demi-tons), DÉCOUPER en tranches égales
   ou sur les attaques — chaque tranche devient un son.

   Chaque geste s'annule (ANNULER, douze pas). L'original n'est jamais touché
   tant qu'on ne choisit pas REMPLACER L'ORIGINAL ; ENREGISTRER COMME NOUVEAU
   SON en fait une copie. Un son de la banque interne ne se remplace pas.

   Les calculs travaillent sur des tableaux de canaux (Float32Array) :
   rien ne dépend du contexte audio, ce qui les rend vérifiables à part. */

var ED_PILE_MAX = 12;
var ED = null;          /* {id, nom, sr, ch:[Float32Array], a, b, pile:[], modifie} */

/* ---------- calculs ---------- */
function edCopie(ch){ return ch.map(function(c){ return new Float32Array(c); }); }
function edLongueur(ch){ return ch.length ? ch[0].length : 0; }
function edRogner(ch, a, b){ return ch.map(function(c){ return new Float32Array(c.subarray(a, b)); }); }
function edRetirer(ch, a, b){
  return ch.map(function(c){
    var r = new Float32Array(c.length - (b - a));
    r.set(c.subarray(0, a), 0); r.set(c.subarray(b), a);
    return r;
  });
}
/* fondus en courbe de puissance constante : plus naturel à l'oreille qu'une droite */
function edFondu(ch, a, b, sortie){
  var n = b - a;
  if(n < 2) return edCopie(ch);
  return ch.map(function(c){
    var r = new Float32Array(c);
    for(var i=0;i<n;i++){
      var x = i / (n - 1), g = Math.sin((sortie ? 1 - x : x) * Math.PI / 2);
      r[a + i] *= g;
    }
    return r;
  });
}
function edCrete(ch, a, b){
  var m = 0;
  ch.forEach(function(c){ for(var i=a;i<b;i++){ var v = Math.abs(c[i]); if(v > m) m = v; } });
  return m;
}
function edGain(ch, a, b, g){
  return ch.map(function(c){
    var r = new Float32Array(c);
    for(var i=a;i<b;i++) r[i] = Math.max(-1, Math.min(1, r[i] * g));
    return r;
  });
}
/* normaliser la sélection à −0,3 dB de crête */
function edNormaliser(ch, a, b){
  var m = edCrete(ch, a, b);
  if(m < 1e-6) return null;
  return edGain(ch, a, b, Math.pow(10, -0.3 / 20) / m);
}
function edInverser(ch, a, b){
  return ch.map(function(c){
    var r = new Float32Array(c);
    for(var i=0;i<(b - a);i++) r[a + i] = c[b - 1 - i];
    return r;
  });
}
/* hauteur par rééchantillonnage (comme un échantillonneur) : plus haut = plus court */
function edHauteur(ch, demitons){
  var f = Math.pow(2, demitons / 12), n = edLongueur(ch), m = Math.max(1, Math.round(n / f));
  return ch.map(function(c){
    var r = new Float32Array(m);
    for(var i=0;i<m;i++){
      var q = i * f, i0 = Math.floor(q), t = q - i0;
      var x0 = c[Math.min(n - 1, i0)], x1 = c[Math.min(n - 1, i0 + 1)];
      r[i] = x0 + (x1 - x0) * t;
    }
    return r;
  });
}
/* tranches égales : bornes [début, fin[ */
function edTranchesEgales(n, k){
  var l = [];
  for(var i=0;i<k;i++) l.push([Math.round(i * n / k), Math.round((i + 1) * n / k)]);
  return l;
}
/* attaques : l'énergie par fenêtres de 10 ms saute nettement au-dessus de ce
   qui précède ; au moins 60 ms entre deux attaques, seize au plus */
function edAttaques(ch, sr){
  var c = ch[0], n = c.length, w = Math.max(1, Math.round(sr * 0.01)), e = [], i, k;
  for(i=0;i+w<=n;i+=w){ var s = 0; for(k=0;k<w;k++) s += c[i + k] * c[i + k]; e.push(s / w); }
  var max = 0; e.forEach(function(v){ if(v > max) max = v; });
  if(!max) return [];
  var seuil = max * 0.001, ecart = Math.ceil(0.06 / 0.01), l = [], dernier = -ecart, fond = e[0];
  for(i=0;i<e.length;i++){
    if(e[i] > seuil && e[i] > fond * 4 && i - dernier >= ecart){ l.push(i * w); dernier = i; }
    fond = fond * 0.7 + e[i] * 0.3;
  }
  if(!l.length || l[0] > sr * 0.02) l.unshift(0);
  return l.slice(0, 16);
}
function edTranchesAttaques(ch, sr){
  var a = edAttaques(ch, sr), n = edLongueur(ch), l = [];
  for(var i=0;i<a.length;i++) l.push([a[i], i + 1 < a.length ? a[i + 1] : n]);
  return l;
}
/* une tranche devient un son : de courts fondus évitent les clics aux coupures */
function edExtraire(ch, a, b, sr){
  var t = edRogner(ch, a, b), n = edLongueur(t), f = Math.min(Math.round(sr * 0.002), Math.floor(n / 4));
  if(f >= 2){ t = edFondu(t, 0, f, false); t = edFondu(t, n - f, n, true); }
  return t;
}

/* ---------- tampons ---------- */
function edLireTampon(buf){
  var ch = [];
  for(var k=0;k<buf.numberOfChannels;k++) ch.push(new Float32Array(buf.getChannelData(k)));
  return ch;
}
function edFaireTampon(ch, sr){
  var b = ctx.createBuffer(ch.length, Math.max(1, edLongueur(ch)), sr);
  ch.forEach(function(c, k){ b.getChannelData(k).set(c); });
  return b;
}
/* remplacer le tampon d'un son partout où il sert : machines, caches, KAOSS */
function edPoserTampon(id, buf){
  ES.buf[id] = buf; delete ES.inv[id];
  if(typeof KP !== "undefined" && KP && KP.banques) KP.banques.forEach(function(b, k){
    if(b && b.ech === id && KP.tranches){ try{ arreterBanqueKp(k); }catch(e){} KP.tranches[k] = null; }
  });
  if(typeof STK !== "undefined" && STK) STK.ondePour = "";
  return sauverEch(id, buf);
}

/* ---------- ouvrir, gestes, enregistrer ---------- */
function edOuvrir(id){
  audioInit(); banqueEs();
  var buf = ES.buf[id];
  if(!buf || !ctx){ signal("SON NON CHARGÉ · RÉESSAYEZ DANS UN INSTANT"); return false; }
  if(typeof ESSAI !== "undefined" && ESSAI) annulerEssai();
  ED = {id:id, nom:nomBib(id), sr:buf.sampleRate, ch:edLireTampon(buf), pile:[], modifie:false};
  ED.a = 0; ED.b = edLongueur(ED.ch);
  BIB.onglet = 0;
  majBibUI();
  return true;
}
function edFermer(forcer){
  if(!ED) return true;
  if(ED.modifie && !forcer && !window.confirm("Quitter l'éditeur sans enregistrer ?")) return false;
  edArreterEcoute();
  ED = null;
  majBibUI();
  return true;
}
function edGeste(nom, fn, garderSelection){
  if(!ED) return false;
  var n = edLongueur(ED.ch);
  var a = Math.max(0, Math.min(ED.a, n)), b = Math.max(a, Math.min(ED.b, n));
  if(b - a < 2){ signal("SÉLECTION TROP COURTE"); return false; }
  var r = fn(ED.ch, a, b);
  if(!r){ signal(nom + " : RIEN À FAIRE"); return false; }
  if(!edLongueur(r) || edLongueur(r) < 2){ signal("IL NE RESTERAIT RIEN DU SON"); return false; }
  ED.pile.push({ch:ED.ch, a:ED.a, b:ED.b});
  if(ED.pile.length > ED_PILE_MAX) ED.pile.shift();
  ED.ch = r; ED.modifie = true;
  if(!garderSelection || edLongueur(r) !== n){ ED.a = 0; ED.b = edLongueur(r); }
  edArreterEcoute();
  signal(nom);
  majEditeur();
  return true;
}
function edAnnuler(){
  if(!ED || !ED.pile.length){ signal("RIEN À ANNULER"); return false; }
  var p = ED.pile.pop();
  ED.ch = p.ch; ED.a = p.a; ED.b = p.b;
  ED.modifie = ED.pile.length > 0;
  edArreterEcoute();
  majEditeur();
  signal("ANNULÉ");
  return true;
}
function edNouvelId(){
  var id = "u" + Date.now().toString(36), k = 1;
  while(ES.buf[id]) id = "u" + Date.now().toString(36) + "e" + (k++);
  return id;
}
function edEnregistrerNouveau(ch, nom){
  var id = edNouvelId(), buf = edFaireTampon(ch, ED.sr);
  ES.buf[id] = buf; ES.noms[id] = "edition";
  BIB.noms[id] = nom.slice(0, 28);
  bibEcrire();
  var ok = sauverEch(id, buf);
  return ok ? id : null;
}
function edEnregistrerCopie(){
  if(!ED) return null;
  var base = ED.nom.replace(/ \(ÉDITÉ( \d+)?\)$/, "");
  var id = edEnregistrerNouveau(ED.ch, base + " (ÉDITÉ)");
  if(!id){ signal("ÉCRITURE REFUSÉE · COPIE GARDÉE POUR CETTE SESSION"); return null; }
  ED.id = id; ED.nom = nomBib(id); ED.pile = []; ED.modifie = false;
  signal("NOUVEAU SON : " + ED.nom);
  majEditeur();
  return id;
}
function edRemplacer(){
  if(!ED) return false;
  if(ED.id.charAt(0) === "b"){ signal("UN SON DE LA BANQUE NE SE REMPLACE PAS · ENREGISTREZ UNE COPIE"); return false; }
  var n = typeof usagesEch === "function" ? usagesEch(ED.id) : 0;
  if(!window.confirm("Remplacer l'original de « " + ED.nom + " » ?" +
     (n ? "\n\nIl sert " + n + " fois : toutes ces parties entendront la version éditée." : "") +
     "\n\nL'original sera perdu.")) return false;
  var ok = edPoserTampon(ED.id, edFaireTampon(ED.ch, ED.sr));
  ED.pile = []; ED.modifie = false;
  signal(ok ? "ORIGINAL REMPLACÉ : " + ED.nom : "REMPLACÉ POUR CETTE SESSION · ÉCHEC D'ÉCRITURE");
  majEditeur();
  return ok;
}
function edDecouper(mode, k){
  if(!ED) return [];
  var bornes = mode === "attaques" ? edTranchesAttaques(ED.ch, ED.sr) : edTranchesEgales(edLongueur(ED.ch), k);
  bornes = bornes.filter(function(x){ return x[1] - x[0] >= ED.sr * 0.01; });
  if(bornes.length < 2){ signal("PAS D'ATTAQUES NETTES · ESSAYEZ LES TRANCHES ÉGALES"); return []; }
  if(!window.confirm("Créer " + bornes.length + " sons à partir de « " + ED.nom + " » ?")) return [];
  var base = ED.nom.slice(0, 22), ids = [];
  bornes.forEach(function(x, i){
    var id = edEnregistrerNouveau(edExtraire(ED.ch, x[0], x[1], ED.sr), base + " T" + (i + 1));
    if(id) ids.push(id);
  });
  signal(ids.length + " SONS CRÉÉS · " + base + " T1 À T" + ids.length);
  majBibUI();
  return ids;
}

/* ---------- écoute de la sélection ---------- */
function edEcouter(){
  if(!ED) return;
  audioInit();
  edArreterEcoute();
  var b = edFaireTampon(ED.ch, ED.sr), src = ctx.createBufferSource();
  src.buffer = b;
  var g = ctx.createGain(); g.gain.value = 0.8;
  src.connect(g); g.connect(master);
  src.start(0, ED.a / ED.sr, Math.max(0.005, (ED.b - ED.a) / ED.sr));
  ED.ecoute = src;
}
function edArreterEcoute(){
  if(ED && ED.ecoute){ try{ ED.ecoute.stop(); }catch(e){} ED.ecoute = null; }
}

/* ---------- interface ---------- */
function edTexteTemps(n){ return (n / ED.sr).toFixed(3) + " s"; }
function bibRendreEditeur(corps){
  var z = document.createElement("div"); z.className = "ed"; z.id = "ed";
  var h = document.createElement("h3"); h.id = "ed-titre"; z.appendChild(h);
  var cv = document.createElement("canvas"); cv.id = "ed-onde"; cv.width = 600; cv.height = 140;
  cv.setAttribute("aria-label", "Forme d'onde : touchez pour placer le début ou la fin de la sélection");
  z.appendChild(cv);
  var info = document.createElement("p"); info.id = "ed-info"; info.className = "ed-info"; z.appendChild(info);
  function curseur(id, texte, fn){
    var l = document.createElement("label"); l.className = "ed-curseur";
    var s = document.createElement("span"); s.textContent = texte; l.appendChild(s);
    var r = document.createElement("input"); r.type = "range"; r.id = id; r.min = 0; r.step = 1;
    r.addEventListener("input", function(){ fn(+this.value); majEditeur(); });
    l.appendChild(r); z.appendChild(l);
  }
  curseur("ed-a", "DÉBUT", function(v){ ED.a = Math.min(v, ED.b - 2); });
  curseur("ed-b", "FIN", function(v){ ED.b = Math.max(v, ED.a + 2); });
  function rang(boutons){
    var d = document.createElement("div"); d.className = "bib-actions";
    boutons.forEach(function(x){ var b = boutonBib(d, x[0], x[1], x[2]); if(x[3]) b.id = x[3]; });
    z.appendChild(d);
  }
  rang([["▶ ÉCOUTER LA SÉLECTION", edEcouter, false, "ed-ecouter"], ["TOUT SÉLECTIONNER", function(){ ED.a = 0; ED.b = edLongueur(ED.ch); majEditeur(); }],
        ["ANNULER", edAnnuler, true, "ed-annuler"]]);
  var hg = document.createElement("h3"); hg.textContent = "Gestes sur la sélection"; z.appendChild(hg);
  rang([["ROGNER", function(){ edGeste("ROGNÉ", edRogner); }, true, "ed-rogner"],
        ["RETIRER", function(){ edGeste("SÉLECTION RETIRÉE", edRetirer); }, true, "ed-retirer"],
        ["FONDU D'ENTRÉE", function(){ edGeste("FONDU D'ENTRÉE", function(c, a, b){ return edFondu(c, a, b, false); }, true); }, true, "ed-fondu-e"],
        ["FONDU DE SORTIE", function(){ edGeste("FONDU DE SORTIE", function(c, a, b){ return edFondu(c, a, b, true); }, true); }, true, "ed-fondu-s"],
        ["NORMALISER", function(){ edGeste("NORMALISÉ À −0,3 dB", edNormaliser, true); }, true, "ed-normaliser"],
        ["−3 dB", function(){ edGeste("−3 dB", function(c, a, b){ return edGain(c, a, b, Math.pow(10, -3 / 20)); }, true); }, true],
        ["+3 dB", function(){ edGeste("+3 dB", function(c, a, b){ return edGain(c, a, b, Math.pow(10, 3 / 20)); }, true); }, true],
        ["INVERSER", function(){ edGeste("INVERSÉ", edInverser, true); }, true, "ed-inverser"]]);
  var hh = document.createElement("h3"); hh.textContent = "Hauteur (tout le son)"; z.appendChild(hh);
  rang([["−12", function(){ edGeste("UNE OCTAVE PLUS BAS", function(c){ return edHauteur(c, -12); }); }, true],
        ["−1", function(){ edGeste("UN DEMI-TON PLUS BAS", function(c){ return edHauteur(c, -1); }); }, true, "ed-moins1"],
        ["+1", function(){ edGeste("UN DEMI-TON PLUS HAUT", function(c){ return edHauteur(c, 1); }); }, true, "ed-plus1"],
        ["+12", function(){ edGeste("UNE OCTAVE PLUS HAUT", function(c){ return edHauteur(c, 12); }); }, true]]);
  var hd = document.createElement("h3"); hd.textContent = "Découper en sons"; z.appendChild(hd);
  var dd = document.createElement("div"); dd.className = "bib-actions";
  var sel = document.createElement("select"); sel.id = "ed-nb";
  [2, 4, 8, 16].forEach(function(n){ var o = document.createElement("option"); o.value = n; o.textContent = n + " TRANCHES ÉGALES"; sel.appendChild(o); });
  sel.value = 4; dd.appendChild(sel);
  boutonBib(dd, "DÉCOUPER", function(){ edDecouper("egales", +sel.value); }).id = "ed-egales";
  boutonBib(dd, "SUR LES ATTAQUES", function(){ edDecouper("attaques"); }).id = "ed-attaques";
  z.appendChild(dd);
  var he = document.createElement("h3"); he.textContent = "Enregistrer"; z.appendChild(he);
  rang([["ENREGISTRER COMME NOUVEAU SON", edEnregistrerCopie, false, "ed-copie"],
        ["REMPLACER L'ORIGINAL", edRemplacer, true, "ed-remplacer"],
        ["FERMER L'ÉDITEUR", function(){ edFermer(false); }, true, "ed-fermer"]]);
  corps.appendChild(z);
  edBrancherOnde(cv);
  majEditeur();
}
function majEditeur(){
  if(!ED) return;
  var n = edLongueur(ED.ch);
  var t = document.getElementById("ed-titre");
  if(!t) return;
  t.textContent = "Éditer : " + ED.nom + (ED.modifie ? " · modifié" : "");
  document.getElementById("ed-info").textContent = "Durée " + edTexteTemps(n) + " · sélection " +
    edTexteTemps(ED.a) + " → " + edTexteTemps(ED.b) + " (" + edTexteTemps(ED.b - ED.a) + ") · " +
    ED.ch.length + (ED.ch.length > 1 ? " canaux" : " canal") + " · " + Math.round(ED.sr / 1000) + " kHz";
  ["ed-a", "ed-b"].forEach(function(id){ var r = document.getElementById(id); r.max = n; r.value = id === "ed-a" ? ED.a : ED.b; });
  var an = document.getElementById("ed-annuler");
  if(an){ an.disabled = !ED.pile.length; an.textContent = "ANNULER" + (ED.pile.length ? " (" + ED.pile.length + ")" : ""); }
  var rp = document.getElementById("ed-remplacer");
  if(rp) rp.disabled = ED.id.charAt(0) === "b" || !ED.modifie;
  edDessiner();
}
function edDessiner(){
  var cv = document.getElementById("ed-onde");
  if(!cv || !cv.getContext) return;
  var g = cv.getContext("2d"), w = cv.width, h = cv.height, c = ED.ch[0], n = c.length;
  g.clearRect(0, 0, w, h);
  var xa = ED.a / n * w, xb = ED.b / n * w;
  g.fillStyle = "rgba(140,227,160,.16)"; g.fillRect(xa, 0, xb - xa, h);
  g.fillStyle = "#8ce3a0";
  for(var x=0;x<w;x++){
    var i0 = Math.floor(x * n / w), i1 = Math.max(i0 + 1, Math.floor((x + 1) * n / w)), mn = 0, mx = 0;
    for(var i=i0;i<i1;i+=Math.max(1, Math.floor((i1 - i0) / 64))){ var v = c[i]; if(v < mn) mn = v; if(v > mx) mx = v; }
    g.globalAlpha = x >= xa && x <= xb ? 1 : 0.35;
    g.fillRect(x, h / 2 - mx * (h / 2 - 2), 1, Math.max(1, (mx - mn) * (h / 2 - 2)));
  }
  g.globalAlpha = 1;
  g.fillStyle = "#f2f2f2"; g.fillRect(Math.round(xa), 0, 2, h); g.fillRect(Math.round(xb) - 2, 0, 2, h);
}
/* au doigt : on déplace la borne la plus proche */
function edBrancherOnde(cv){
  var borne = null;
  function pos(e){
    var r = cv.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * edLongueur(ED.ch));
  }
  cv.addEventListener("pointerdown", function(e){
    if(!ED) return;
    var p = pos(e);
    borne = Math.abs(p - ED.a) <= Math.abs(p - ED.b) ? "a" : "b";
    try{ cv.setPointerCapture(e.pointerId); }catch(x){}
    deplacer(p);
  });
  cv.addEventListener("pointermove", function(e){ if(borne && ED) deplacer(pos(e)); });
  function fin(){ borne = null; }
  cv.addEventListener("pointerup", fin); cv.addEventListener("pointercancel", fin);
  function deplacer(p){
    if(borne === "a") ED.a = Math.min(p, ED.b - 2); else ED.b = Math.max(p, ED.a + 2);
    majEditeur();
  }
}
