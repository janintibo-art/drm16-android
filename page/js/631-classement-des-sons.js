/* ================= classement des sons (v252) =================
   Avec l'archive et Freesound, la bibliothèque compte vite des centaines de
   sons. Le rayon SONS devient une vraie sonothèque : une catégorie par son,
   une recherche, des filtres, un tri, des favoris et une petite forme d'onde.

   La catégorie est devinée : d'abord par le NOM (« Oberheim BD1 », « Crash
   ride », « 808 Bass »), sûr quand il parle ; sinon par une ANALYSE rapide du
   son (grave ou aigu, bruité ou tonal, court ou tenu). Elle se corrige à la
   main, et le choix manuel l'emporte toujours. Tout est gardé avec les noms,
   dans drm.reglages.bib, donc dans les projets. */

var BIB_CATEGORIES = [["kick","KICK"],["caisse","CAISSE"],["clap","CLAP"],["charley","CHARLEY"],
  ["cymbale","CYMBALE"],["tom","TOM"],["percu","PERCU"],["basse","BASSE"],["melodique","MÉLODIQUE"],
  ["voix","VOIX"],["boucle","BOUCLE"],["fx","FX"],["autre","AUTRE"]];
var BIB_ORIGINES = [["tout","ORIGINES"],["banque","BANQUE"],["vous","TOUS LES VÔTRES"],["mic","MICRO"],
  ["fichier","FICHIERS"],["archive","ARCHIVE"],["freesound","FREESOUND"],["kaoss","KAOSS"],["edition","ÉDITÉS"]];
var BIB_TRIS = [["nom","TRI : NOM"],["recent","TRI : PLUS RÉCENTS"],["duree","TRI : DURÉE"],["cat","TRI : CATÉGORIE"]];
var BIB_PAGE = 40;
var BIB_ONDES = typeof WeakMap === "function" ? new WeakMap() : null;

function bibCategorieConnue(c){
  return typeof c === "string" && BIB_CATEGORIES.some(function(x){ return x[0] === c; });
}
function bibNomCategorie(c){
  for(var i=0;i<BIB_CATEGORIES.length;i++) if(BIB_CATEGORIES[i][0] === c) return BIB_CATEGORIES[i][1];
  return "AUTRE";
}
/* ---------- par le nom ---------- */
var BIB_MOTS = [
  ["boucle", /\b(LOOP|BOUCLE|BREAK|BREAKBEAT|GROOVE)S?\b/],
  ["kick", /\b(KICK|KIK|BD\d*|BASS ?DRUM|BASSDRUM|KD|GROSSE ?CAISSE)\b/],
  ["clap", /\b(CLAP|HANDCLAP|CP\d*|CLAPS)\b/],
  ["caisse", /\b(SNARE|SNR\d*|SD\d*|SN\d*|CAISSE ?CLAIRE|CAISSE)\b/],
  ["charley", /\b(HAT|HATS|HIHAT|HI ?HAT|HH\d*|CH\d*|OH\d*|CHH|OHH|CHARLEY|CHARLESTON)\b/],
  ["cymbale", /\b(CRASH|RIDE|CYM\w*|SPLASH|CHINA)\b/],
  ["tom", /\b(TOMS?|LT\d*|MT\d*|HT\d*|FLOOR ?TOM)\b/],
  ["percu", /\b(PERC\w*|RIM\w*|RS\d*|COW\w*|CB\d*|CONGA\w*|BONGO\w*|SHAK\w*|TAMB\w*|CLAV\w*|WOOD\w*|BLOCK|AGOGO|TIMBAL\w*|CABASA|MARACA\w*|TRIANGLE|GUIRO|SNAP)\b/],
  ["basse", /\b(BASS|BASSE|SUB|808 ?BASS|REESE)\b/],
  ["voix", /\b(VOX|VOICE|VOCAL\w*|VOIX|CHANT|SPEECH|PAROLE|CHOIR|CHOEUR|CHOEURS)\b/],
  ["melodique", /\b(STAB|CHORD|ACCORD|PAD|LEAD|PIANO|KEYS?|SYNTH\w*|ORGAN|ORGUE|BELL|PLUCK|STRING\w*|BRASS|NOTE)\b/],
  ["fx", /\b(FX|SFX|ZAP|BLIP|NOISE|BRUIT|SWEEP|RISER|LASER|SCRATCH|IMPACT|WHOOSH|GLITCH)\b/]
];
function bibCategorieNom(nom){
  var t = String(nom || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[_\-.]+/g, " ");
  for(var i=0;i<BIB_MOTS.length;i++) if(BIB_MOTS[i][1].test(t)) return BIB_MOTS[i][0];
  return null;
}
/* ---------- par l'écoute : quelques mesures simples ---------- */
function bibMesurer(buf){
  var d = buf.getChannelData(0), sr = buf.sampleRate, n = d.length, crete = 0, i;
  for(i=0;i<n;i++){ var a = Math.abs(d[i]); if(a > crete) crete = a; }
  if(crete < 1e-4) return {silence:true, duree:n / sr};
  var fin = n - 1;
  while(fin > 0 && Math.abs(d[fin]) < crete * 0.01) fin--;              /* −40 dB sous la crête */
  var duree = (fin + 1) / sr;
  /* bandes par filtres à un pôle, sur la première seconde au plus */
  var m = Math.min(fin + 1, sr);
  var kb = 1 - Math.exp(-2 * Math.PI * 150 / sr), kh = 1 - Math.exp(-2 * Math.PI * 4000 / sr);
  var lb = 0, lh = 0, eT = 0, eB = 0, eH = 0, zc = 0, prec = 0;
  for(i=0;i<m;i++){
    var x = d[i];
    lb += kb * (x - lb); lh += kh * (x - lh);
    var h = x - lh;
    eT += x * x; eB += lb * lb; eH += h * h;
    if((x >= 0) !== (prec >= 0)) zc++;
    prec = x;
  }
  /* tenue : énergie du dernier tiers contre le premier */
  var t1 = 0, t3 = 0, tiers = Math.floor((fin + 1) / 3);
  for(i=0;i<tiers;i++){ t1 += d[i] * d[i]; t3 += d[fin - i] * d[fin - i]; }
  return {duree:duree, grave:eT ? eB / eT : 0, aigu:eT ? eH / eT : 0,
          passages:zc / (m / sr), tenue:t1 ? t3 / t1 : 0};
}
function bibCategorieSon(buf){
  if(!buf || typeof buf.getChannelData !== "function") return null;
  var s = bibMesurer(buf);
  if(s.silence) return "autre";
  if(s.duree > 1.6 && s.tenue > 0.15) return s.grave > 0.5 ? "basse" : "boucle";
  /* grave et court : la hauteur (passages par zéro ≈ 2 × fréquence) sépare
     la grosse caisse (vers 50 Hz) du tom (vers 100 à 250 Hz) */
  if(s.grave > 0.45 && s.duree < 1.2) return s.passages < 180 ? "kick" : s.passages < 600 ? "tom" : "percu";
  if(s.grave > 0.45) return "basse";
  if(s.aigu > 0.3 && s.grave < 0.1) return s.duree < 0.45 ? "charley" : "cymbale";
  if(s.passages > 2500 && s.grave < 0.25) return s.duree < 0.8 ? "caisse" : "cymbale";
  if(s.grave > 0.15 && s.passages < 1200 && s.duree < 1) return "tom";
  if(s.duree < 0.3) return "percu";
  if(s.passages < 1500 && s.duree >= 0.3) return "melodique";
  return "autre";
}

/* ---------- ce que la bibliothèque retient de chaque son ---------- */
function bibMetaValides(o){
  var r = Object.create(null);
  if(!o || typeof o !== "object") return r;
  Object.keys(o).forEach(function(id){
    var m = o[id];
    if(!/^[A-Za-z0-9_-]{1,64}$/.test(id) || !m || typeof m !== "object") return;
    var x = {};
    if(bibCategorieConnue(m.c)) x.c = m.c;
    if(bibCategorieConnue(m.a)) x.a = m.a;
    if(m.f === 1 || m.f === true) x.f = 1;
    if(Object.keys(x).length) r[id] = x;
  });
  return r;
}
function bibMeta(id){
  if(!BIB.meta) BIB.meta = Object.create(null);
  return BIB.meta[id] || (BIB.meta[id] = {});
}
function bibCategorie(s){
  var m = BIB.meta && BIB.meta[s.id];
  if(m && m.c) return m.c;                         /* choix manuel */
  if(m && m.a) return m.a;                         /* déjà deviné */
  var c = bibCategorieNom(s.nom);
  if(!c && ES.buf[s.id]) c = bibCategorieSon(ES.buf[s.id]);
  if(!c) return "autre";                           /* pas encore chargé : on reviendra */
  bibMeta(s.id).a = c;                             /* deviné une fois, gardé */
  BIB.metaChange = true;
  return c;
}
function bibOrigine(id){
  if(id.charAt(0) === "b") return "banque";
  var n = ES.noms && ES.noms[id];
  if(/^ufs\d+$/.test(id) || n === "freesound") return "freesound";
  if(n === "archive") return "archive";
  if(n === "kaoss") return "kaoss";
  if(n === "edition") return "edition";
  if(n === "fichier") return "fichier";
  return "mic";
}
/* date de création : les identifiants « u » + horodatage en base 36 la portent
   (huit caractères de 2017 à 2059 ; le KAOSS ajoute « kp » derrière) */
function bibDate(id){
  var m = /^u([0-9a-z]{8})/.exec(id);
  if(!m) return 0;
  var t = parseInt(m[1], 36);
  return t > 1.5e12 && t < 4e12 ? t : 0;
}
function bibFavori(id){ return !!(BIB.meta && BIB.meta[id] && BIB.meta[id].f); }
function bibBasculerFavori(id){
  var m = bibMeta(id);
  if(m.f) delete m.f; else m.f = 1;
  if(!Object.keys(m).length) delete BIB.meta[id];
  bibEcrire();
  return !!m.f;
}
function bibChoisirCategorie(id, c){
  var m = bibMeta(id);
  if(c) m.c = c; else delete m.c;
  bibEcrire();
}

/* ---------- filtrer, trier, paginer ---------- */
function bibFiltre(){
  if(!BIB.filtre) BIB.filtre = {q:"", cat:"", orig:"tout", tri:"nom", fav:false, n:BIB_PAGE};
  return BIB.filtre;
}
function bibSansAccents(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function bibClasserSons(liste){
  var f = bibFiltre(), q = bibSansAccents(f.q).trim();
  BIB.metaChange = false;
  liste.forEach(function(s){ s.cat = bibCategorie(s); s.orig = bibOrigine(s.id); s.date = bibDate(s.id); s.fav = bibFavori(s.id); });
  if(BIB.metaChange){ BIB.metaChange = false; bibEcrire(); }
  var l = liste.filter(function(s){
    if(f.fav && !s.fav) return false;
    if(f.cat && s.cat !== f.cat) return false;
    if(f.orig === "banque" && s.orig !== "banque") return false;
    if(f.orig === "vous" && s.orig === "banque") return false;
    if(f.orig !== "tout" && f.orig !== "banque" && f.orig !== "vous" && s.orig !== f.orig) return false;
    if(q && bibSansAccents(s.nom).indexOf(q) < 0 && bibSansAccents(bibNomCategorie(s.cat)).indexOf(q) < 0) return false;
    return true;
  });
  var parNom = function(a, b){ return a.nom.localeCompare(b.nom, "fr", {numeric:true, sensitivity:"base"}); };
  var cles = {nom:parNom,
    recent:function(a, b){ return (b.date - a.date) || parNom(a, b); },
    duree:function(a, b){ return (a.duree - b.duree) || parNom(a, b); },
    cat:function(a, b){ return (bibRangCategorie(a.cat) - bibRangCategorie(b.cat)) || parNom(a, b); }};
  l.sort(cles[f.tri] || parNom);
  /* favoris d'abord, sauf filtre favoris déjà posé */
  if(!f.fav) l.sort(function(a, b){ return (b.fav ? 1 : 0) - (a.fav ? 1 : 0); });
  return {l:l.slice(0, f.n), total:l.length, tous:liste.length};
}
function bibRangCategorie(c){
  for(var i=0;i<BIB_CATEGORIES.length;i++) if(BIB_CATEGORIES[i][0] === c) return i;
  return BIB_CATEGORIES.length;
}

/* ---------- interface ---------- */
function bibRendreFiltres(corps, refaire){
  var f = bibFiltre();
  var z = document.createElement("div"); z.className = "bib-filtres";
  var q = document.createElement("input"); q.type = "search"; q.id = "bib-chercher";
  q.placeholder = "Chercher un son ou une catégorie"; q.value = f.q;
  q.setAttribute("aria-label", "Chercher un son");
  q.addEventListener("input", function(){ f.q = this.value; f.n = BIB_PAGE; refaire(); });
  z.appendChild(q);
  function liste(id, options, val, fn){
    var s = document.createElement("select"); s.id = id;
    options.forEach(function(o){ var e = document.createElement("option"); e.value = o[0]; e.textContent = o[1]; s.appendChild(e); });
    s.value = val;
    s.addEventListener("change", function(){ fn(this.value); f.n = BIB_PAGE; refaire(); });
    z.appendChild(s);
    return s;
  }
  liste("bib-f-cat", [["", "CATÉGORIES"]].concat(BIB_CATEGORIES), f.cat, function(v){ f.cat = v; });
  liste("bib-f-orig", BIB_ORIGINES, f.orig, function(v){ f.orig = v; });
  liste("bib-f-tri", BIB_TRIS, f.tri, function(v){ f.tri = v; });
  var lab = document.createElement("label"); lab.className = "bib-f-fav";
  var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "bib-f-fav"; cb.checked = f.fav;
  cb.addEventListener("change", function(){ f.fav = this.checked; f.n = BIB_PAGE; refaire(); });
  lab.appendChild(cb); lab.appendChild(document.createTextNode(" ★ favoris seulement"));
  z.appendChild(lab);
  var compte = document.createElement("p"); compte.id = "bib-compte"; compte.className = "bib-compte";
  z.appendChild(compte);
  corps.appendChild(z);
}
function bibMajCompte(r){
  var e = document.getElementById("bib-compte");
  if(e) e.textContent = r.total === r.tous ? r.tous + " sons" : r.total + " sons sur " + r.tous;
}
/* sous chaque son : favori, catégorie, forme d'onde */
function bibDecorerLigne(l, s){
  if(!s.cat) return;
  var z = document.createElement("div"); z.className = "bib-meta";
  var etoile = document.createElement("button");
  etoile.className = "sec bib-etoile" + (s.fav ? " on" : "");
  etoile.textContent = s.fav ? "★" : "☆";
  etoile.setAttribute("aria-pressed", String(!!s.fav));
  etoile.setAttribute("aria-label", "Favori : " + s.nom);
  etoile.addEventListener("click", function(){
    var on = bibBasculerFavori(s.id);
    etoile.textContent = on ? "★" : "☆"; etoile.classList.toggle("on", on);
    etoile.setAttribute("aria-pressed", String(on));
  });
  z.appendChild(etoile);
  var sel = document.createElement("select"); sel.className = "bib-cat";
  sel.setAttribute("aria-label", "Catégorie : " + s.nom);
  var manuel = !!(BIB.meta && BIB.meta[s.id] && BIB.meta[s.id].c);
  BIB_CATEGORIES.forEach(function(c){
    var o = document.createElement("option"); o.value = c[0];
    o.textContent = c[1] + (!manuel && c[0] === s.cat ? " (auto)" : ""); sel.appendChild(o);
  });
  sel.value = s.cat;
  sel.addEventListener("change", function(){ bibChoisirCategorie(s.id, this.value); });
  z.appendChild(sel);
  var b = ES.buf[s.id];
  if(b && typeof b.getChannelData === "function"){
    var cv = document.createElement("canvas");
    if(cv && typeof cv.getContext === "function"){
      cv.className = "bib-onde"; cv.width = 160; cv.height = 32;
      cv.setAttribute("aria-hidden", "true");
      bibDessinerOnde(cv, b);
      z.appendChild(cv);
    }
  }
  l.appendChild(z);
}
function bibCretesOnde(buf, cols){
  var c = BIB_ONDES && BIB_ONDES.get(buf);
  if(c && c.length === cols) return c;
  var d = buf.getChannelData(0), n = d.length, r = new Float32Array(cols);
  var pas = Math.max(1, Math.floor(n / cols / 48));    /* 48 points par colonne suffisent */
  for(var k=0;k<cols;k++){
    var a = Math.floor(k * n / cols), z = Math.floor((k + 1) * n / cols), m = 0;
    for(var i=a;i<z;i+=pas){ var v = Math.abs(d[i]); if(v > m) m = v; }
    r[k] = m;
  }
  if(BIB_ONDES) BIB_ONDES.set(buf, r);
  return r;
}
function bibDessinerOnde(cv, buf){
  var g = cv.getContext("2d");
  if(!g) return;
  var w = cv.width, h = cv.height, r = bibCretesOnde(buf, w), max = 0, k;
  for(k=0;k<w;k++) if(r[k] > max) max = r[k];
  var couleur = "";
  try{ couleur = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(); }catch(e){}
  g.clearRect(0, 0, w, h);
  g.fillStyle = couleur || "#13b9a2";
  for(k=0;k<w;k++){
    var y = max ? Math.max(1, r[k] / max * (h / 2 - 1)) : 1;
    g.fillRect(k, h / 2 - y, 1, y * 2);
  }
}
