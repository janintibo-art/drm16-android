/* v274 — vue de l'éditeur, sans traitement, sauvegarde ou nœud audio ajouté.
   Les valeurs sont des indices [début, fin[ en échantillons, comme l'éditeur
   natif. Zoom/panoramique ne changent que le cadrage. Les bornes passent par
   les INPUT existants et leurs écouteurs. Aucun rafraîchissement permanent. */
var ED_VUE = (function(){
  "use strict";
  var V = null, prochain = 0, dessins = 0, BLOC = 256;
  var bib = document.getElementById("bib");
  var natifDessiner = edDessiner, natifBrancher = edBrancherOnde;
  var natifRendre = bibRendreEditeur, natifMaj = majEditeur, natifBib = majBibUI;
  function el(tag, classe, texte){
    var e = document.createElement(tag);
    if(classe) e.className = classe;
    if(texte !== undefined) e.textContent = texte;
    return e;
  }
  function temps(n){ return (n / ED.sr).toFixed(6).replace(".", ","); }
  function court(n){ return (n / ED.sr).toFixed(3).replace(".", ",") + " s"; }
  function borner(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function visible(){ return !!(V && ED && V.racine.isConnected && bib.classList.contains("show") && !document.hidden && V.cv.getClientRects().length); }
  function annulerDessin(){ if(prochain){ cancelAnimationFrame(prochain); prochain = 0; } }
  function demander(){
    if(!visible()) return;
    if(!prochain) prochain = requestAnimationFrame(function(){ prochain = 0; dessiner(); });
  }
  function liberer(){
    annulerDessin();
    if(V && V.observateur) V.observateur.disconnect();
    V = null; bib.classList.remove("ev-edition");
  }
  function ajuster(){
    if(!V || !ED) return;
    var n = edLongueur(ED.ch);
    if(V.ed !== ED || V.n !== n){ V.debut = 0; V.longueur = n; }
    if(V.canaux !== ED.ch){ V.cache = null; V.canaux = ED.ch; }
    V.ed = ED; V.n = n;
    V.longueur = borner(Math.round(V.longueur), Math.min(2, n), n);
    V.debut = borner(Math.round(V.debut), 0, n - V.longueur);
  }
  function minimum(){ return Math.min(V.n, Math.max(2, Math.ceil(V.n / 64))); }
  function cadrer(debut, longueur){
    if(!V || !ED) return;
    ajuster();
    V.longueur = borner(Math.round(longueur), minimum(), V.n);
    V.debut = borner(Math.round(debut), 0, V.n - V.longueur);
    actualiser(); demander();
  }
  function zoom(facteur){
    if(!V || !ED) return;
    ajuster();
    var centre = V.debut + V.longueur / 2, sel = (ED.a + ED.b) / 2;
    if(facteur > 1 && sel >= V.debut && sel <= V.debut + V.longueur) centre = sel;
    var longueur = borner(Math.round(V.longueur / facteur), minimum(), V.n);
    cadrer(centre - longueur / 2, longueur);
  }
  function precision(){
    if(!V || !ED) return 1;
    return V.pas.value === "sample" ? 1 : Math.max(1, Math.round(ED.sr * Number(V.pas.value) / 1000));
  }
  function poser(quoi, valeur){
    if(!V || !ED || !Number.isFinite(valeur)) return false;
    var n = edLongueur(ED.ch);
    if(n < 2) return false;
    valeur = borner(Math.round(valeur), quoi === "a" ? 0 : ED.a + 2, quoi === "a" ? ED.b - 2 : n);
    if(valeur === ED[quoi]) return false;
    var r = document.getElementById("ed-" + quoi);
    if(!r) return false;
    r.value = valeur;
    r.dispatchEvent(new Event("input", {bubbles:true}));
    return true;
  }
  /* Résumés min/max exacts par blocs. On conserve même une impulsion d'un seul
     échantillon ; pas de sous-échantillonnage visuel qui rate les attaques.
     Deux canaux d'aperçu au plus, et seulement 2 flottants par bloc de 256. */
  function preparer(){
    if(V.cache) return;
    V.cache = ED.ch.slice(0, 2).map(function(c){
      var nb = Math.ceil(c.length / BLOC), bas = new Float32Array(nb), haut = new Float32Array(nb);
      for(var k=0;k<nb;k++){
        var mn = Infinity, mx = -Infinity, fin = Math.min(c.length, (k+1)*BLOC);
        for(var i=k*BLOC;i<fin;i++){ var v = c[i]; if(!Number.isFinite(v)) v = 0; if(v < mn) mn = v; if(v > mx) mx = v; }
        bas[k] = mn; haut[k] = mx;
      }
      return {bas:bas, haut:haut};
    });
  }
  function cretes(canal, debut, fin){
    if(!V || !ED) return [0, 0];
    ajuster(); preparer();
    var c = ED.ch[canal], b = V.cache[canal];
    if(!c || !b) return [0, 0];
    var i = borner(Math.floor(debut), 0, c.length), stop = borner(Math.ceil(fin), i, c.length), mn = Infinity, mx = -Infinity;
    if(i >= stop) return [0, 0];
    while(i < stop){
      if(i % BLOC === 0 && i + BLOC <= stop){
        var k = i / BLOC; mn = Math.min(mn, b.bas[k]); mx = Math.max(mx, b.haut[k]); i += BLOC;
      }else{
        var v = c[i++]; if(!Number.isFinite(v)) v = 0;
        if(v < mn) mn = v; if(v > mx) mx = v;
      }
    }
    return [mn, mx];
  }
  function dessiner(){
    if(!visible()) return;
    ajuster();
    var cv = V.cv, r = cv.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if(cv.width !== Math.round(w*dpr)) cv.width = Math.round(w*dpr);
    if(cv.height !== Math.round(h*dpr)) cv.height = Math.round(h*dpr);
    V.largeur = w; V.hauteur = h;
    var g = cv.getContext("2d"); if(!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    g.fillStyle = "#0d161e"; g.fillRect(0, 0, w, h);
    if(!V.n) return;
    preparer();
    var xa = (ED.a - V.debut) / V.longueur * w, xb = (ED.b - V.debut) / V.longueur * w;
    g.fillStyle = "#bdd8a51d"; g.fillRect(Math.max(0, xa), 0, Math.max(0, Math.min(w, xb)-Math.max(0, xa)), h);
    var canaux = Math.min(2, ED.ch.length), bande = h / Math.max(1, canaux);
    for(var k=0;k<canaux;k++){
      var centre = (k+.5)*bande, amplitude = Math.max(1, bande/2-18);
      g.fillStyle = "#334b5a"; g.fillRect(0, centre, w, 1);
      if(k){ g.fillStyle = "#3d5260"; g.fillRect(0, k*bande, w, 1); }
      for(var x=0;x<w;x++){
        var i0 = Math.floor(V.debut + x*V.longueur/w), i1 = Math.max(i0+1, Math.floor(V.debut+(x+1)*V.longueur/w));
        var pics = cretes(k, i0, i1);
        g.fillStyle = x >= xa && x < xb ? (k ? "#92bed7" : "#acd5b8") : (k ? "#4e6d80" : "#5a7d69");
        var haut = borner(pics[1], -1, 1), bas = borner(pics[0], -1, 1);
        g.fillRect(x, centre-haut*amplitude, 1, Math.max(1, (haut-bas)*amplitude));
      }
      g.fillStyle = "#d3e5ef"; g.font = "bold 11px Arial";
      g.fillText(ED.ch.length === 1 ? "MONO" : ED.ch.length === 2 ? (k ? "D" : "G") : "CANAL " + (k+1), 7, k*bande+14);
    }
    g.fillStyle = "#f7e8b2"; g.font = "bold 10.5px Arial";
    [[xa, "DÉBUT"], [xb, "FIN"]].forEach(function(v, k){
      if(v[0] < 0 || v[0] > w) return;
      var x = borner(Math.round(v[0]), 0, w-2);
      g.fillRect(x, 18, 2, Math.max(1, h-18));
      var tx = k ? x-g.measureText(v[1]).width-5 : x+5;
      g.fillText(v[1], borner(tx, 44, Math.max(44, w-g.measureText(v[1]).width-5)), k ? h-6 : 14);
    });
    dessins++;
  }
  function actualiser(){
    if(!V || !ED) return;
    ajuster();
    V.zoom.textContent = "×" + (V.n / Math.max(1, V.longueur)).toFixed(1).replace(".", ",");
    V.moins.disabled = V.longueur >= V.n; V.plus.disabled = V.longueur <= minimum();
    V.pan.max = Math.max(0, V.n-V.longueur); V.pan.value = V.debut; V.pan.disabled = V.n <= V.longueur;
    V.pan.setAttribute("aria-valuetext", court(V.debut) + " à " + court(V.debut + V.longueur));
    V.regle.firstChild.textContent = court(V.debut); V.regle.lastChild.textContent = court(V.debut + V.longueur);
    V.aide.textContent = (ED.ch.length > 2 ? "Aperçu des canaux 1 et 2 sur " + ED.ch.length + ". " : "") +
      "Glissez la borne la plus proche. Le zoom ne change pas le son.";
    var info = document.getElementById("ed-info");
    if(info) info.textContent = "Durée " + temps(V.n) + " s · sélection " + temps(ED.a) + " → " + temps(ED.b) +
      " s (" + temps(ED.b-ED.a) + " s) · " + ED.ch.length + (ED.ch.length > 1 ? " canaux" : " canal") + " · " + ED.sr + " Hz";
    V.cv.setAttribute("aria-label", "Onde " + (ED.ch.length === 1 ? "mono" : ED.ch.length === 2 ? "stéréo, gauche et droite" : "des deux premiers canaux") +
      ", vue " + court(V.debut) + " à " + court(V.debut+V.longueur) + ", sélection " + court(ED.a) + " à " + court(ED.b) + ". Réglages précis en dessous.");
    ["a", "b"].forEach(function(q){
      var c = V.bornes[q];
      if(document.activeElement !== c.champ) c.champ.value = temps(ED[q]);
      c.sortie.textContent = ED[q] + " éch." + (q === "b" ? " · fin exclue" : "");
      c.moins.disabled = ED[q] <= (q === "a" ? 0 : ED.a+2);
      c.plus.disabled = ED[q] >= (q === "a" ? ED.b-2 : V.n);
      var r = document.getElementById("ed-"+q);
      r.disabled = V.n < 2;
      r.setAttribute("aria-label", (q === "a" ? "Début" : "Fin") + " de sélection, en échantillons");
      r.setAttribute("aria-valuetext", ED[q] + " échantillons, " + temps(ED[q]) + " secondes");
    });
  }
  function bouton(parent, id, texte, nom, fn){
    var b = el("button", "sec", texte); b.type = "button"; b.id = id;
    b.setAttribute("aria-label", nom); b.addEventListener("click", function(e){ e.stopPropagation(); fn(); }); parent.appendChild(b); return b;
  }
  function borne(q, parent){
    var box = el("div", "ev-borne"), titre = q === "a" ? "DÉBUT" : "FIN";
    var label = el("label", "", titre + " · secondes"); label.htmlFor = "ev-"+q;
    box.appendChild(label); var ligne = el("div", "ev-saisie"); box.appendChild(ligne);
    var moins = bouton(ligne, "ev-"+q+"-moins", "−", "Reculer le " + titre.toLowerCase(), function(){ poser(q, ED[q]-precision()); });
    var champ = el("input"); champ.type = "text"; champ.inputMode = "decimal"; champ.id = "ev-"+q; champ.autocomplete = "off"; champ.spellcheck = false;
    champ.setAttribute("aria-describedby", "ev-"+q+"-ech ev-"+q+"-erreur"); ligne.appendChild(champ);
    var plus = bouton(ligne, "ev-"+q+"-plus", "+", "Avancer le " + titre.toLowerCase(), function(){ poser(q, ED[q]+precision()); });
    function valider(){
      if(!ED || !V) return;
      var texte = champ.value.trim().replace(",", ".");
      if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(texte) || !Number.isFinite(Number(texte))){
        champ.setAttribute("aria-invalid", "true"); erreur.textContent = "Indiquez des secondes positives, par exemple 0,250."; return;
      }
      champ.removeAttribute("aria-invalid"); erreur.textContent = ""; poser(q, Math.min(Number(texte), V.n/ED.sr)*ED.sr); champ.value = temps(ED[q]); actualiser();
    }
    champ.addEventListener("change", valider);
    champ.addEventListener("keydown", function(e){
      if(e.key === "Enter"){ e.preventDefault(); e.stopPropagation(); valider(); champ.blur(); }
      if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); champ.value = temps(ED[q]); champ.removeAttribute("aria-invalid"); erreur.textContent = ""; champ.blur(); }
    });
    var erreur = el("span", "ev-erreur"); erreur.id = "ev-"+q+"-erreur"; erreur.setAttribute("role", "status"); box.appendChild(erreur);
    var sortie = el("output", "ev-echantillons"); sortie.id = "ev-"+q+"-ech"; box.appendChild(sortie);
    box.appendChild(document.getElementById("ed-"+q).parentNode); parent.appendChild(box);
    V.bornes[q] = {champ:champ, sortie:sortie, moins:moins, plus:plus};
  }
  function installer(){
    var racine = document.getElementById("ed"), cv = document.getElementById("ed-onde");
    if(!racine || !ED || !cv) return;
    if(V && V.racine === racine){ actualiser(); demander(); return; }
    var ancien = V && V.ed === ED && V.canaux === ED.ch ? {debut:V.debut, longueur:V.longueur, pas:V.pas.value} : null;
    liberer();
    V = {racine:racine, cv:cv, ed:ED, canaux:ED.ch, n:edLongueur(ED.ch), debut:0, longueur:edLongueur(ED.ch), cache:null, bornes:{}};
    if(ancien){ V.debut = ancien.debut; V.longueur = ancien.longueur; }
    racine.classList.add("ev-atelier"); bib.classList.add("ev-edition");
    var visual = el("section", "ev-visual"), outils = el("section", "ev-outils");
    visual.setAttribute("aria-label", "Onde et sélection"); outils.setAttribute("aria-label", "Traitements et enregistrement du son");
    var titre = document.getElementById("ed-titre"), info = document.getElementById("ed-info"); visual.appendChild(titre);
    var barre = el("div", "ev-zoom");
    V.moins = bouton(barre, "ev-zoom-moins", "−", "Réduire le zoom de l'onde", function(){ zoom(.5); });
    V.zoom = el("output"); V.zoom.id = "ev-zoom"; V.zoom.setAttribute("aria-label", "Zoom de la forme d'onde"); barre.appendChild(V.zoom);
    V.plus = bouton(barre, "ev-zoom-plus", "+", "Agrandir l'onde", function(){ zoom(2); });
    var cadrage = el("div", "ev-cadrage"); cadrage.appendChild(barre); visual.appendChild(cadrage);
    var cadre = el("div", "ev-cadrer");
    bouton(cadre, "ev-tout", "TOUT VOIR", "Afficher tout le son, sans changer la sélection", function(){ cadrer(0, V.n); });
    bouton(cadre, "ev-selection", "VOIR SÉLECTION", "Cadrer la sélection, sans la modifier", function(){
      var longueur = Math.max(minimum(), ED.b-ED.a); cadrer((ED.a+ED.b-longueur)/2, longueur);
    }); cadrage.appendChild(cadre);
    var ecran = el("div", "ev-ecran"); ecran.appendChild(cv);
    V.regle = el("div", "ev-regle"); V.regle.appendChild(el("span")); V.regle.appendChild(el("span")); ecran.appendChild(V.regle); visual.appendChild(ecran);
    var lecture = document.getElementById("ed-ecouter").parentNode; lecture.classList.add("ev-lecture"); visual.appendChild(lecture);
    var pan = el("label", "ev-pan"); pan.appendChild(el("span", "", "DÉPLACER LA VUE"));
    V.pan = el("input"); V.pan.type = "range"; V.pan.min = 0; V.pan.step = 1; V.pan.id = "ev-pan";
    V.pan.addEventListener("input", function(){ cadrer(Number(this.value), V.longueur); }); pan.appendChild(V.pan); visual.appendChild(pan);
    V.aide = el("p", "ev-aide"); visual.appendChild(V.aide);
    var pas = el("label", "ev-precision", "PRÉCISION DES BOUTONS ±"); V.pas = el("select"); V.pas.id = "ev-pas";
    [["sample", "1 ÉCHANTILLON"], ["1", "1 ms"], ["10", "10 ms"]].forEach(function(v){ var o = el("option", "", v[1]); o.value = v[0]; V.pas.appendChild(o); });
    V.pas.value = ancien ? ancien.pas : "1"; pas.appendChild(V.pas); visual.appendChild(pas);
    var bornes = el("div", "ev-bornes"); borne("a", bornes); borne("b", bornes); visual.appendChild(bornes); visual.appendChild(info);
    /* Déplacer les éléments natifs, ne pas les cloner : leurs écouteurs,
       confirmations et protections de l'original restent en place. */
    
    while(racine.firstChild) outils.appendChild(racine.firstChild);
    racine.appendChild(visual); racine.appendChild(outils);
    if(window.ResizeObserver){
      V.observateur = new ResizeObserver(function(){
        if(!V) return;
        var r = V.cv.getBoundingClientRect();
        if(Math.round(r.width) !== V.largeur || Math.round(r.height) !== V.hauteur) demander();
      }); V.observateur.observe(cv);
    }
    actualiser(); demander();
  }
  /* Le geste reste celui du canvas natif (borne la plus proche), avec une
     conversion dans la fenêtre visible. Un seul pointeur détient le geste. */
  edBrancherOnde = function(cv){
    if(!cv || cv.id !== "ed-onde") return natifBrancher.apply(this, arguments);
    var identifiant = null, q = null;
    function position(e){ var r = cv.getBoundingClientRect(); return !V || r.width <= 0 ? 0 : Math.round(V.debut+borner((e.clientX-r.left)/r.width, 0, 1)*V.longueur); }
    cv.addEventListener("pointerdown", function(e){
      if(!ED || !V || V.cv !== cv || identifiant !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
      identifiant = e.pointerId; var p = position(e); q = Math.abs(p-ED.a) <= Math.abs(p-ED.b) ? "a" : "b";
      try{ cv.setPointerCapture(e.pointerId); }catch(x){}
      e.preventDefault(); poser(q, p);
    });
    cv.addEventListener("pointermove", function(e){ if(identifiant === e.pointerId && ED && V && V.cv === cv){ e.preventDefault(); poser(q, position(e)); } });
    function fin(e){ if(identifiant !== e.pointerId) return; identifiant = null; q = null; }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function(n){ cv.addEventListener(n, fin); });
  };
  edDessiner = function(){
    if(!V || V.cv !== document.getElementById("ed-onde")) return natifDessiner.apply(this, arguments);
    demander();
  };
  majEditeur = function(){ var r = natifMaj.apply(this, arguments); if(V && ED && V.racine.isConnected){ actualiser(); demander(); } return r; };
  bibRendreEditeur = function(){ var r = natifRendre.apply(this, arguments); installer(); return r; };
  majBibUI = function(){ var r = natifBib.apply(this, arguments); if(V && (!ED || !V.racine.isConnected)) liberer(); return r; };
  function reveiller(){
    if(!visible()){ annulerDessin(); if(V) V.cache = null; return; }
    actualiser(); demander();
  }
  new MutationObserver(reveiller).observe(bib, {attributes:true, attributeFilter:["class"]});
  document.addEventListener("visibilitychange", reveiller); window.addEventListener("resize", demander);
  return {inspecter:function(){ return {ouverte:!!V, visible:visible(), debut:V ? V.debut : 0, longueur:V ? V.longueur : 0,
    total:V ? V.n : 0, dessins:dessins, attente:!!prochain, canaux:V && V.cache ? V.cache.length : 0,
    octetsCache:V && V.cache ? V.cache.reduce(function(s, c){ return s+c.bas.byteLength+c.haut.byteLength; }, 0) : 0}; }, cretes:cretes};
})();
