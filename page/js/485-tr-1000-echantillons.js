/* ================= TR-1000 : échantillonnage, découpe, étirement (v259) =================
   La couche B de chaque instrument n'était qu'un son de la bibliothèque, joué
   en entier. Comme sur la machine, on peut maintenant :
   - ÉCHANTILLONNER au micro directement dans l'instrument choisi ;
   - DÉCOUPER : ne jouer qu'une portion (DÉBUT, FIN), à l'envers si l'on veut,
     ou partager le son sur les instruments, une tranche par attaque (un break
     haché sur les pads) ;
   - ÉTIRER la portion sur 1 à 32 pas, au tempo, sans changer sa hauteur : une
     boucle prise ailleurs tombe juste, quel que soit le BPM.

   Tout se règle par instrument, dans le motif (comme les autres réglages de
   son de la TR-1000), et l'échantillon d'origine n'est jamais modifié : la
   portion, l'inversion et l'étirement sont calculés à part et gardés en cache. */

var T1K_ECH = {cache:Object.create(null), ordre:[], prise:null};
var T1K_ECH_CACHE_MAX = 40;

/* ---------- étirement sans changer la hauteur (WSOLA) ----------
   Des fenêtres de 1 024 échantillons, reposées tous les 512 en sortie ; chaque
   fenêtre est prise dans l'original autour de sa place idéale, là où elle
   prolonge le mieux la précédente (ressemblance sur 256 points), ce qui évite
   les battements. Pur : Float32Array → Float32Array. */
function etirerSonT1k(d, facteur){
  var n = d.length;
  var sortie = Math.max(1, Math.round(n * facteur));
  if(n < 2048 || Math.abs(facteur - 1) < 0.002){
    /* trop court pour des fenêtres : rééchantillonnage simple (la hauteur bouge
       un peu, mais un son si court n'a guère de hauteur) */
    var r = new Float32Array(sortie);
    for(var i=0;i<sortie;i++){
      var x = i * (n - 1) / Math.max(1, sortie - 1), a = Math.floor(x), f = x - a;
      r[i] = d[a] * (1 - f) + (d[Math.min(n - 1, a + 1)] || 0) * f;
    }
    return r;
  }
  var N = 1024, Hs = 512, tol = 256, cmp = 256;
  var w = new Float32Array(N);
  for(var k=0;k<N;k++) w[k] = 0.5 - 0.5 * Math.cos(2 * Math.PI * k / N);
  var out = new Float32Array(sortie + N), poids = new Float32Array(sortie + N);
  var prec = 0;
  for(var j=0; j * Hs < sortie; j++){
    var ideal = Math.round(j * Hs / facteur), pos = Math.min(ideal, n - N);
    if(j > 0){
      var nat = prec + Hs, meilleur = -Infinity;
      var a0 = Math.max(0, ideal - tol), a1 = Math.min(n - N, ideal + tol);
      for(var c=a0; c<=a1; c+=2){
        var s = 0;
        for(var q=0; q<cmp; q+=2){
          var u = nat + q < n ? d[nat + q] : 0;
          s += u * d[c + q];
        }
        if(s > meilleur){ meilleur = s; pos = c; }
      }
    }
    pos = Math.max(0, Math.min(n - N, pos));
    var o = j * Hs;
    for(var m=0;m<N;m++){ out[o + m] += d[pos + m] * w[m]; poids[o + m] += w[m]; }
    prec = pos;
  }
  var r2 = new Float32Array(sortie);
  for(var z=0;z<sortie;z++) r2[z] = poids[z] > 1e-3 ? out[z] / poids[z] : 0;
  return r2;
}

/* ---------- la portion jouée ---------- */
function portionT1k(buf, I){
  var deb = typeof I.deb === "number" ? I.deb : 0, fin = typeof I.fin === "number" ? I.fin : 1;
  if(fin - deb < 0.005){ deb = 0; fin = 1; }
  var a = Math.floor(deb * buf.length), b = Math.max(a + 1, Math.min(buf.length, Math.round(fin * buf.length)));
  return {a:a, b:b};
}
/* rend {buf, debut, duree} : sans inversion ni étirement, le son d'origine et
   un départ décalé (rien à calculer) ; sinon un tampon calculé une fois */
function partieEchT1k(I){
  var b = ES.buf[I.ech];
  if(!b) return null;
  var p = portionT1k(b, I), sr = b.sampleRate;
  if(!I.rev && !I.etir) return {buf:b, debut:p.a / sr, duree:(p.b - p.a) / sr};
  var cible = I.etir ? I.etir * stepDur() : 0;
  var cle = I.ech + "|" + p.a + "|" + p.b + "|" + (I.rev ? 1 : 0) + "|" + (I.etir ? cible.toFixed(4) : 0);
  var c = T1K_ECH.cache[cle];
  if(c && c.source === b) return {buf:c.buf, debut:0, duree:c.buf.duration};
  var d = new Float32Array(p.b - p.a), g = b.getChannelData(0), dr = b.numberOfChannels > 1 ? b.getChannelData(1) : null;
  for(var i=0;i<d.length;i++) d[i] = dr ? (g[p.a + i] + dr[p.a + i]) / 2 : g[p.a + i];
  if(I.rev) d.reverse();
  if(I.etir){
    /* au plus quatre fois plus long ou plus court : au-delà, le son se défait */
    var facteur = Math.max(0.25, Math.min(4, cible * sr / d.length));
    d = etirerSonT1k(d, facteur);
  }
  var out = ctx.createBuffer(1, Math.max(1, d.length), sr);
  out.getChannelData(0).set(d);
  T1K_ECH.cache[cle] = {source:b, buf:out};
  T1K_ECH.ordre.push(cle);
  while(T1K_ECH.ordre.length > T1K_ECH_CACHE_MAX) delete T1K_ECH.cache[T1K_ECH.ordre.shift()];
  return {buf:out, debut:0, duree:out.duration};
}

/* ---------- réglages ---------- */
function reglerSampleT1k(champ, v){
  var I = instrT1kSel();
  if(champ === "deb") I.deb = Math.max(0, Math.min(I.fin - 0.005, v));
  else if(champ === "fin") I.fin = Math.min(1, Math.max(I.deb + 0.005, v));
  else if(champ === "rev") I.rev = !!v;
  else if(champ === "etir") I.etir = etirT1k(v);
  if(I.mix < 0.1) I.mix = 0.5;                  /* sinon on n'entendrait rien du réglage */
  memT1k(); majSampleT1k(); majKnobsT1k();
}
function ecouterSampleT1k(){
  audioInit(); banqueEs();
  voixT1k(maintenantAudio() + 0.01, T1K.sel, true);
}

/* ---------- échantillonner au micro, dans l'instrument choisi ---------- */
function samplingT1k(){
  if(T1K_ECH.prise){ try{ T1K_ECH.prise.stop(); }catch(e){} return; }
  audioInit(); banqueEs();
  var p = HOST;
  if(p && p.micro){
    var permis = false;
    try{ permis = !!p.micro(); }catch(e){}
    if(!permis){ signal("AUTORISEZ LE MICRO PUIS RECOMMENCEZ"); return; }
  }
  if(!navigator.mediaDevices || !window.MediaRecorder){ signal("MICRO INDISPONIBLE"); return; }
  var k = T1K.sel, motif = motifT1kCur();          /* la destination est figée au départ */
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(flux){
    var morceaux = [], mr = new MediaRecorder(flux), minuteur = null;
    T1K_ECH.prise = mr; majSampleT1k();
    signal("SAMPLING " + T1K_INSTR[k].nom + " · RETOUCHEZ POUR ARRÊTER · 8 S AU PLUS");
    mr.ondataavailable = function(e){ if(e.data && e.data.size) morceaux.push(e.data); };
    mr.onstop = function(){
      clearTimeout(minuteur);
      flux.getTracks().forEach(function(t){ t.stop(); });
      if(T1K_ECH.prise === mr) T1K_ECH.prise = null;
      majSampleT1k();
      new Blob(morceaux).arrayBuffer().then(function(ab){
        return new Promise(function(res, rej){
          var r = ctx.decodeAudioData(ab, res, rej);
          if(r && r.catch) r.catch(rej);
        });
      }).then(function(buf){
        if(typeof PROJET_EN_COURS !== "undefined" && PROJET_EN_COURS) return;
        var court = reduireEch(buf, 32000, 8);
        var id = "u" + Date.now().toString(36), n = 1;
        while(ES.buf[id]) id = "u" + Date.now().toString(36) + (n++);
        ES.buf[id] = court; ES.noms[id] = "mic";
        BIB.noms[id] = ("TR-1000 " + T1K_INSTR[k].nom).slice(0, 28); bibEcrire();
        var garde = sauverEch(id, court);
        var I = motif.instr[k];
        I.ech = id; I.deb = 0; I.fin = 1; I.rev = false;
        if(I.mix < 0.5) I.mix = 1;
        memT1k();
        if(S.modele === "t1k"){ majT1k(); majKnobsT1k(); }
        signal(garde ? "ÉCHANTILLON POSÉ SUR " + T1K_INSTR[k].nom + " · COUCHE B"
                     : "ÉCHANTILLON POUR CETTE SESSION · ÉCHEC D'ÉCRITURE");
      }).catch(function(){ signal("DÉCODAGE IMPOSSIBLE"); });
    };
    mr.start();
    minuteur = setTimeout(function(){ if(T1K_ECH.prise === mr) try{ mr.stop(); }catch(e){} }, 8000);
  }).catch(function(){ signal("MICRO REFUSÉ"); });
}
function annulerSamplingT1k(){
  var mr = T1K_ECH.prise;
  if(!mr) return;
  T1K_ECH.prise = null;
  mr.ondataavailable = null;
  mr.onstop = function(){ try{ mr.stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} };
  try{ mr.stop(); }catch(e){}
}

/* ---------- découper sur les instruments ----------
   La portion de l'instrument choisi est partagée à chaque attaque (au plus une
   tranche par instrument restant, à partir de celui-ci) ; sans attaques nettes,
   en parts égales. Chaque tranche devient un son de la bibliothèque, posé en
   couche B seule (A/B à fond). L'original reste tel quel. */
function tranchesT1k(ch, sr, max){
  var l = edTranchesAttaques(ch, sr).filter(function(t){ return t[1] - t[0] > sr * 0.02; });
  if(l.length < 2) l = edTranchesEgales(edLongueur(ch), Math.min(max, 4));
  return l.slice(0, max);
}
function decouperT1k(){
  if(S.run){ signal("ARRÊTEZ LA LECTURE POUR DÉCOUPER"); return 0; }
  audioInit(); banqueEs();
  var I = instrT1kSel(), b = ES.buf[I.ech];
  if(!b){ signal("AUCUN ÉCHANTILLON SUR CET INSTRUMENT"); return 0; }
  var p = portionT1k(b, I), sr = b.sampleRate, max = 10 - T1K.sel;
  var ch = [];
  for(var c=0;c<b.numberOfChannels;c++) ch.push(b.getChannelData(c).slice(p.a, p.b));
  var l = tranchesT1k(ch, sr, max);
  if(l.length < 2){ signal("SON TROP COURT POUR ÊTRE DÉCOUPÉ"); return 0; }
  var derniere = T1K.sel + l.length - 1;
  if(!window.confirm("Découper « " + nomBib(I.ech) + " » en " + l.length + " tranches, posées en couche B de " +
                     T1K_INSTR[T1K.sel].nom + " à " + T1K_INSTR[derniere].nom + " ?\n\nL'échantillon d'origine reste dans la bibliothèque.")) return 0;
  var base = nomBib(I.ech).slice(0, 22), motif = motifT1kCur(), t0 = Date.now(), echecs = 0;
  l.forEach(function(t, i){
    var tr = edExtraire(ch, t[0], t[1], sr), buf = edFaireTampon(tr, sr);
    var id = "u" + (t0 + i).toString(36) + "tk";
    while(ES.buf[id]) id += "x";
    ES.buf[id] = buf; ES.noms[id] = "edition";
    BIB.noms[id] = (base + " T" + (i + 1)).slice(0, 28);
    if(!sauverEch(id, buf)) echecs++;
    var J = motif.instr[T1K.sel + i];
    J.ech = id; J.deb = 0; J.fin = 1; J.rev = false; J.etir = 0; J.mix = 1; J.pech = 0.5;
  });
  bibEcrire(); memT1k(); majT1k(); majKnobsT1k(); H.inter();
  signal(l.length + " TRANCHES SUR " + T1K_INSTR[T1K.sel].nom + " À " + T1K_INSTR[derniere].nom +
         (echecs ? " · " + echecs + " POUR CETTE SESSION SEULEMENT" : ""));
  return l.length;
}

/* ---------- le panneau ---------- */
function majSampleT1k(){
  var det = document.getElementById("t1k-sample");
  if(!det) return;
  var I = instrT1kSel(), b = ES.buf[I.ech];
  document.getElementById("t1k-sample-resume").textContent = T1K_INSTR[T1K.sel].nom + " · " + (b ? nomBib(I.ech) : "AUCUN SON");
  var deb = document.getElementById("t1k-sample-deb"), fin = document.getElementById("t1k-sample-fin");
  if(document.activeElement !== deb) deb.value = String(Math.round(I.deb * 1000));
  if(document.activeElement !== fin) fin.value = String(Math.round(I.fin * 1000));
  var rev = document.getElementById("t1k-sample-rev");
  rev.classList.toggle("on", !!I.rev); rev.setAttribute("aria-pressed", String(!!I.rev));
  document.getElementById("t1k-sample-etir").value = String(I.etir || 0);
  var sp = document.getElementById("t1k-sampling");
  sp.classList.toggle("on", !!T1K_ECH.prise); sp.setAttribute("aria-pressed", String(!!T1K_ECH.prise));
  sp.textContent = T1K_ECH.prise ? "■ ARRÊTER" : "● SAMPLING";
  document.getElementById("t1k-sample-decouper").disabled = S.run || !b;
  var info = document.getElementById("t1k-sample-info");
  if(b){
    var p = portionT1k(b, I), dur = (p.b - p.a) / b.sampleRate;
    info.textContent = "Portion " + dur.toFixed(2) + " s sur " + b.duration.toFixed(2) + " s" + (I.rev ? " · à l'envers" : "") +
      (I.etir ? " · étirée sur " + I.etir + " pas = " + (I.etir * stepDur()).toFixed(2) + " s à " + S.bpm + " BPM" : "") +
      (I.mix < 0.02 ? " · A/B à 0 : couche B muette" : "");
  } else info.textContent = "Aucun son : SAMPLING ou BIBLIO.";
  var cv = document.getElementById("t1k-sample-onde");
  if(cv && cv.getContext){
    var g = cv.getContext("2d");
    if(g){
      var w = cv.width, h = cv.height;
      g.clearRect(0, 0, w, h);
      if(b && typeof bibCretesOnde === "function"){
        var r = bibCretesOnde(b, w), max = 0, k;
        for(k=0;k<w;k++) if(r[k] > max) max = r[k];
        var x0 = Math.round(I.deb * w), x1 = Math.round(I.fin * w);
        for(k=0;k<w;k++){
          var y = max ? Math.max(1, r[k] / max * (h / 2 - 1)) : 1;
          g.fillStyle = k >= x0 && k < x1 ? "#17628f" : "#8f99a5";
          g.fillRect(k, h / 2 - y, 1, y * 2);
        }
        g.fillStyle = "#e0542e"; g.fillRect(x0, 0, 2, h); g.fillRect(Math.max(0, x1 - 2), 0, 2, h);
      }
    }
  }
}
(function(){
  var det = document.getElementById("t1k-sample");
  if(!det) return;
  document.getElementById("t1k-sampling").addEventListener("click", function(){ samplingT1k(); H.inter(); });
  document.getElementById("t1k-sample-biblio").addEventListener("click", function(){
    BIB.cible = {machine:"t1k", partie:T1K.sel};
    ouvrirBib(); BIB.onglet = 0; majBibUI();
  });
  document.getElementById("t1k-sample-rev").addEventListener("click", function(){
    reglerSampleT1k("rev", !instrT1kSel().rev); ecouterSampleT1k(); H.cran();
  });
  document.getElementById("t1k-sample-ecouter").addEventListener("click", function(){ ecouterSampleT1k(); });
  document.getElementById("t1k-sample-decouper").addEventListener("click", function(){ decouperT1k(); });
  ["deb", "fin"].forEach(function(c){
    var e = document.getElementById("t1k-sample-" + c);
    e.addEventListener("input", function(){ reglerSampleT1k(c, +this.value / 1000); });
    e.addEventListener("change", function(){ ecouterSampleT1k(); });
  });
  document.getElementById("t1k-sample-etir").addEventListener("change", function(){
    reglerSampleT1k("etir", +this.value); ecouterSampleT1k(); H.cran();
  });
})();
