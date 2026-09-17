/* ================= la collection archive.org =================
   470 machines, 48 000 échantillons. Le dépôt sert les fichiers un par un
   depuis l'intérieur des archives ZIP : on ne télécharge donc jamais une
   archive entière, seulement le son écouté ou importé. */
var ARC = {base:"https://archive.org/download/drum-machines-collection",
           meta:"https://archive.org/metadata/drum-machines-collection",
           machines:[], filtre:"", machine:null, fichiers:[], occupe:false, jeton:0};
var ARC_ATTENTE = {};

/* ---------- pont vers le téléchargement Java ---------- */
window.__net = function(jeton, erreur, b64){
  var f = ARC_ATTENTE[jeton];
  delete ARC_ATTENTE[jeton];
  if(!f) return;
  if(erreur) f.rej(erreur);
  else f.ok(b64);
};
function netCharger(url, maxOctets){
  return new Promise(function(ok, rej){
    var p = HOST;
    if(!p || !p.netCharger){ rej("pont réseau indisponible"); return; }
    var jeton = "n" + (++ARC.jeton);
    ARC_ATTENTE[jeton] = {ok:ok, rej:rej};
    setTimeout(function(){
      if(ARC_ATTENTE[jeton]){ delete ARC_ATTENTE[jeton]; rej("délai dépassé"); }
    }, 45000);
    try{ p.netCharger(url, jeton, maxOctets || 0); }
    catch(e){ delete ARC_ATTENTE[jeton]; rej("appel refusé"); }
  });
}
function texteDeB64(b64){
  var bin = atob(b64), o = new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) o[i] = bin.charCodeAt(i);
  try{ return new TextDecoder("utf-8").decode(o); }
  catch(e){ return bin; }
}
function octetsTexteCourt(n){
  if(n > 1048576) return (n/1048576).toFixed(1) + " Mo";
  if(n > 1024) return Math.round(n/1024) + " ko";
  return n + " o";
}

/* ---------- liste des machines ---------- */
function arcCharger(){
  try{
    var o = JSON.parse(localStorage.getItem(MEM + ".arc") || "null");
    if(o && o.machines && o.machines.length) ARC.machines = o.machines;
  }catch(e){}
}
function arcGarder(){
  try{ localStorage.setItem(MEM + ".arc", JSON.stringify({machines:ARC.machines, date:Date.now()})); }
  catch(e){}
}
function arcListeMachines(){
  if(ARC.occupe) return;
  ARC.occupe = true;
  majArcUI();
  netCharger(ARC.meta, 3 * 1024 * 1024).then(function(b64){
    var j;
    try{ j = JSON.parse(texteDeB64(b64)); }
    catch(e){ throw "réponse illisible"; }
    var l = [];
    (j.files || []).forEach(function(f){
      if(!/\.zip$/i.test(f.name)) return;
      l.push({nom:f.name.replace(/\.zip$/i, ""), zip:f.name, taille:+f.size || 0});
    });
    l.sort(function(a, b){ return a.nom.localeCompare(b.nom); });
    ARC.machines = l;
    arcGarder();
    ARC.occupe = false;
    majArcUI();
    signal(l.length + " MACHINES DANS LA COLLECTION");
  }).catch(function(e){
    ARC.occupe = false;
    majArcUI();
    signal("LISTE INDISPONIBLE · " + String(e).toUpperCase());
  });
}
/* ---------- contenu d'une machine ---------- */
function arcOuvrirMachine(m){
  if(ARC.occupe) return;
  ARC.machine = m; ARC.fichiers = []; ARC.occupe = true;
  majArcUI();
  var url = ARC.base + "/" + encodeURIComponent(m.zip) + "/";
  netCharger(url, 2 * 1024 * 1024).then(function(b64){
    var html = texteDeB64(b64);
    var prefixe = "/download/drum-machines-collection/" + encodeURIComponent(m.zip) + "/";
    var vus = {}, l = [];
    function ajoute(interne){
      if(!interne || vus[interne]) return;
      vus[interne] = 1;
      l.push({interne:interne, nom:decodeURIComponent(interne).split("/").pop()});
    }
    var re = /href="([^"]+)"/gi, x;
    while((x = re.exec(html))){
      var h = x[1];
      if(!/\.(wav|aif|aiff)$/i.test(h)) continue;
      if(h.indexOf(prefixe) >= 0) ajoute(h.slice(h.indexOf(prefixe) + prefixe.length));
    }
    if(!l.length){
      /* seconde lecture : le dépôt peut écrire des liens relatifs au lieu du chemin complet */
      re = /href="([^"]+)"/gi;
      while((x = re.exec(html))){
        var h2 = x[1];
        if(!/\.(wav|aif|aiff)$/i.test(h2)) continue;
        if(/^https?:/i.test(h2) || h2.charAt(0) === "/") continue;
        ajoute(h2.replace(/^\.\//, ""));
      }
    }
    l.sort(function(a, b){ return a.nom.localeCompare(b.nom); });
    ARC.fichiers = l;
    ARC.occupe = false;
    majArcUI();
    signal(l.length ? (l.length + " SONS DANS " + m.nom.toUpperCase())
                    : "AUCUN SON LISIBLE DANS CETTE ARCHIVE");
  }).catch(function(e){
    ARC.occupe = false;
    majArcUI();
    signal("CONTENU INDISPONIBLE · " + String(e).toUpperCase());
  });
}
/* ---------- écoute et import d'un son ---------- */
function arcSon(f, importer){
  if(ARC.occupe) return;
  ARC.occupe = true;
  majArcUI();
  audioInit(); banqueEs();
  var url = ARC.base + "/" + encodeURIComponent(ARC.machine.zip) + "/" + f.interne;
  netCharger(url, 3 * 1024 * 1024).then(function(b64){
    var o = b64VersOctets(b64);
    return new Promise(function(ok, rej){
      ctx.decodeAudioData(o.buffer.slice(0), ok, function(){ rej("format refusé"); });
    });
  }).then(function(buf){
    ARC.occupe = false;
    if(PROJET_EN_COURS) return;
    if(!importer){
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain(); g.gain.value = 0.85;
      src.connect(g); g.connect(master); src.start();
      majArcUI();
      signal(f.nom + " · " + buf.duration.toFixed(2) + " s · " + Math.round(buf.sampleRate/1000) + " kHz");
      return;
    }
    var court = reduireEch(buf, 32000, 8);
    var r = traiterSon(court, BIB.preset || "aucun", 0);
    court = r.buffer;
    var id = "u" + Date.now().toString(36);
    ES.buf[id] = court;
    ES.noms[id] = "archive";
    BIB.noms[id] = (ARC.machine.nom.split(" ")[0] + " " + f.nom.replace(/\.[^.]+$/, "")).slice(0, 28);
    bibEcrire();
    sauverEch(id, court);
    majArcUI();
    signal("IMPORTÉ : " + BIB.noms[id]);
    H.inter();
  }).catch(function(e){
    ARC.occupe = false;
    majArcUI();
    signal("SON INDISPONIBLE · " + String(e).toUpperCase());
  });
}
/* ---------- interface ---------- */
function bibRendreArchive(corps){
  var p1 = document.createElement("p");
  p1.innerHTML = "La <b>collection de boîtes à rythmes</b> de l'Internet Archive : 470 machines, " +
    "48 000 échantillons, en accès libre. Le dépôt sert les fichiers un par un depuis l'intérieur des " +
    "archives, donc rien n'est téléchargé en entier — seulement le son écouté ou importé.";
  corps.appendChild(p1);

  if(!ARC.machines.length){
    var a0 = document.createElement("div"); a0.className = "bib-actions";
    boutonBib(a0, ARC.occupe ? "CHARGEMENT…" : "CHARGER LA LISTE DES MACHINES",
              function(){ arcListeMachines(); }, false);
    corps.appendChild(a0);
    return;
  }

  if(ARC.machine){
    var h0 = document.createElement("h3");
    h0.textContent = ARC.machine.nom;
    corps.appendChild(h0);
    var a1 = document.createElement("div"); a1.className = "bib-actions";
    boutonBib(a1, "◀ TOUTES LES MACHINES", function(){ ARC.machine = null; ARC.fichiers = []; majArcUI(); });
    boutonBib(a1, "EN FAIRE UNE MACHINE", function(){ arcmCharger(ARC.machine); }, false);
    corps.appendChild(a1);
    if(ARC.occupe && !ARC.fichiers.length){
      var pw = document.createElement("p"); pw.style.opacity = ".7";
      pw.textContent = "Lecture du contenu…";
      corps.appendChild(pw);
      return;
    }
    ARC.fichiers.slice(0, 300).forEach(function(f){
      var l = ligneBib(f.nom, "");
      var a = document.createElement("div"); a.className = "bib-actions";
      boutonBib(a, "ÉCOUTER", function(){ arcSon(f, false); });
      boutonBib(a, "IMPORTER", function(){ arcSon(f, true); });
      l.appendChild(a);
      corps.appendChild(l);
    });
    if(ARC.fichiers.length > 300){
      var pp = document.createElement("p"); pp.style.opacity = ".7";
      pp.textContent = "Trois cents premiers sons affichés sur " + ARC.fichiers.length + ".";
      corps.appendChild(pp);
    }
    return;
  }

  var rech = document.createElement("input");
  rech.type = "search";
  rech.placeholder = "Chercher une machine · 808, Linn, Oberheim…";
  rech.value = ARC.filtre;
  rech.addEventListener("input", function(){
    ARC.filtre = this.value;
    clearTimeout(ARC.tmr);
    ARC.tmr = setTimeout(majArcUI, 250);
  });
  corps.appendChild(rech);

  var f = ARC.filtre.trim().toLowerCase();
  var l = ARC.machines.filter(function(m){ return !f || m.nom.toLowerCase().indexOf(f) >= 0; });
  var h = document.createElement("h3");
  h.textContent = l.length + (f ? " machines trouvées" : " machines");
  corps.appendChild(h);
  l.slice(0, 120).forEach(function(m){
    var li = ligneBib(m.nom, octetsTexteCourt(m.taille));
    var a = document.createElement("div"); a.className = "bib-actions";
    boutonBib(a, "OUVRIR", function(){ arcOuvrirMachine(m); });
    boutonBib(a, "EN FAIRE UNE MACHINE", function(){ arcmCharger(m); });
    li.appendChild(a);
    corps.appendChild(li);
  });
  if(l.length > 120){
    var p2 = document.createElement("p"); p2.style.opacity = ".7";
    p2.textContent = "Cent vingt premières affichées. Affinez la recherche.";
    corps.appendChild(p2);
  }
}
function majArcUI(){ if(BIB.onglet === 3) majBibUI(); }
