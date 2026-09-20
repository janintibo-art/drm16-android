/* ================= catalogue des machines — v263 =================
   Présentation seulement. Les boutons sont DEPLACES, jamais clonés : leurs
   écouteurs d'origine restent l'unique aiguillage vers les machines/outils.
   Recherche et filtres vivent dans cette fermeture, sans stockage ni audio.
   Pas de capture de façade, pas d'image distante, pas de boucle d'animation. */
(function(){
  var racine = document.getElementById("menu");
  if(!racine || racine.classList.contains("menu-studio")) return;
  var machines = Array.prototype.slice.call(racine.querySelectorAll(".pick[data-m]"));
  var outils = Array.prototype.slice.call(racine.querySelectorAll(".pick:not([data-m])"));
  if(!machines.length) return;
  var donnees = {
    "16":["ELECTRO-HARMONIX",["DRUM"],"drm","#e87c4b"],
    "32":["ELECTRO-HARMONIX",["DRUM"],"drm","#65baaa"],
    em1:["KORG",["GROOVEBOX"],"sequenceur","#8daac3"],
    er1:["KORG",["DRUM"],"sequenceur","#b68397"],
    ea1:["KORG",["SYNTH"],"sequenceur","#b8a281"],
    es1:["KORG",["SAMPLER"],"sequenceur","#80ae95"],
    ea2:["KORG",["SYNTH"],"sequenceur","#b8a281"],
    er2:["KORG",["DRUM"],"sequenceur","#b68397"],
    es2:["KORG",["SAMPLER"],"sequenceur","#80ae95"],
    emx:["KORG",["GROOVEBOX","SYNTH"],"sequenceur","#71a3c7"],
    esx:["KORG",["SAMPLER","GROOVEBOX"],"sequenceur","#c07980"],
    arcm:["COLLECTION DRM16",["DRUM"],"pads","#afa58b"],
    t1k:["ROLAND",["DRUM","SAMPLER"],"sequenceur","#d49657"],
    dbi:["ARTURIA",["DRUM"],"sequenceur","#d1a170"],
    cr5:["ROLAND",["DRUM"],"drm","#d49657"],
    vlc:["KORG",["SAMPLER"],"sequenceur","#98b9b1"],
    dmx:["OBERHEIM",["DRUM"],"pads","#a2b9c9"],
    eur:["MODULAIRE",["SYNTH"],"rack","#b6b4a7"],
    td3:["BEHRINGER",["SYNTH"],"clavier","#bbab7d"],
    rd6:["BEHRINGER",["DRUM"],"sequenceur","#bbab7d"],
    tr808:["ROLAND",["DRUM"],"sequenceur","#d49657"],
    tr909:["ROLAND",["DRUM"],"sequenceur","#d49657"],
    tr707:["ROLAND",["DRUM"],"sequenceur","#d49657"],
    mpc3000:["AKAI",["SAMPLER"],"pads","#c1807b"],
    mpc2000:["AKAI",["SAMPLER"],"pads","#c1807b"],
    kp:["KORG",["FX"],"kaoss","#c38088"],
    mc:["ROLAND",["GROOVEBOX"],"sequenceur","#d49657"],
    stk:["SONICWARE",["SAMPLER","GROOVEBOX"],"pads","#98b6ba"],
    ko:["TEENAGE ENGINEERING",["SAMPLER"],"poche","#b5b17b"]
  };
  var services = {
    "menu-bib":["SONS & PROJETS","bibliotheque"],
    "menu-pr":["ÉDITION MIDI","clavier"],
    "menu-enr":["PRISES MIDI","enregistreur"],
    "menu-notices":["DOCUMENTATION","notice"],
    "menu-syro":["TRANSFERT SYRO","transfert"],
    "menu-table":["MIXAGE","mixeur"],
    "menu-studio":["SÉQUENCEUR","sequenceur"],
    "menu-nexus":["PADS & SAMPLES","pads"],
    "menu-audio":["DIAGNOSTIC","signal"]
  };
  function el(n, classe, texte){
    var e = document.createElement(n);
    if(classe) e.className = classe;
    if(texte !== undefined) e.textContent = texte;
    return e;
  }
  function bouton(id, texte){
    var e = el("button", "", texte); e.type = "button"; e.id = id; return e;
  }
  function normaliser(t){
    t = String(t || "").toLowerCase();
    if(t.normalize) t = t.normalize("NFD");
    return t.replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/[^a-z0-9]+/g, "");
  }
  /* Silhouettes vectorielles volontairement simples : elles indiquent une
     famille de façade, sans promettre une photographie du matériel. */
  function vignette(type){
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 120 66"); svg.setAttribute("class", "catalogue-mini");
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    function forme(n, a, c){
      var f = document.createElementNS(svg.namespaceURI, n);
      Object.keys(a).forEach(function(k){ f.setAttribute(k, a[k]); });
      f.setAttribute("class", c); svg.appendChild(f); return f;
    }
    function rect(x,y,w,h,c,r){ return forme("rect",{x:x,y:y,width:w,height:h,rx:r||1},c); }
    function rond(x,y,r,c){ return forme("circle",{cx:x,cy:y,r:r},c); }
    function chemin(d,c){ return forme("path",{d:d},c||"ligne"); }
    if(type === "poche"){
      rect(37,2,46,62,"coque",3); rect(42,7,35,14,"ecran",2);
      for(var py=0;py<4;py++) for(var px=0;px<4;px++) rond(44+px*10,29+py*9,3,py===3?"accent":"touche");
      return svg;
    }
    rect(3,6,114,54,"coque",4); rect(7,9,106,3,"accent",1);
    if(type === "kaoss"){
      rect(46,17,46,36,"accent",2); rect(49,20,40,30,"sombre",1);
      chemin("M49 35H89 M69 20V50"); rond(75,30,3,"touche");
      rond(20,24,6,"touche"); rond(20,45,5,"touche");
    } else if(type === "pads"){
      rect(13,18,32,12,"ecran",1);
      for(var p=0;p<3;p++) rond(18+p*10,43,3,"touche");
      for(var y=0;y<4;y++) for(var x=0;x<4;x++) rect(57+x*12,17+y*9,8,6,y===3?"accent":"touche",1);
    } else if(type === "rack"){
      for(var mod=0;mod<5;mod++){
        rect(9+mod*21,16,18,38,"touche",1); rond(18+mod*21,24,4,"sombre");
        rond(14+mod*21,43,2,"sombre"); rond(23+mod*21,43,2,"sombre");
      }
      chemin("M14 43Q42 19 56 43 M56 43Q70 62 98 43");
    } else if(type === "clavier"){
      rect(12,18,25,10,"ecran",1); for(var k=0;k<4;k++) rond(53+k*15,23,4,"touche");
      for(var cle=0;cle<12;cle++) rect(12+cle*8,36,7,17,"touche",1);
      for(var noire=0;noire<11;noire++) if(noire%7!==2&&noire%7!==6) rect(17+noire*8,36,4,9,"sombre",1);
    } else if(type === "drm"){
      rect(12,18,46,32,"accent",2);
      for(var dy=0;dy<3;dy++) for(var dx=0;dx<5;dx++) rect(16+dx*8,23+dy*8,5,4,"touche",1);
      rond(78,28,9,"touche"); rond(101,28,7,"touche"); rond(89,48,5,"touche");
    } else if(type === "bibliotheque"){
      chemin("M29 46V23H51L57 29H91V46Z"); chemin("M65 27V41 M65 30L77 27V38");
      rond(61,43,4,"accent"); rond(73,40,4,"accent");
    } else if(type === "notice"){
      chemin("M23 19Q42 15 60 22Q78 15 97 19V48Q78 44 60 51Q42 44 23 48Z M60 22V51 M32 27H49 M32 33H49 M70 27H87 M70 33H87");
    } else if(type === "mixeur"){
      for(var ch=0;ch<5;ch++){
        chemin("M22 18V51".replace(/22/g,String(22+ch*19)));
        rect(17+ch*19,24+(ch%3)*7,10,7,"accent",1);
      }
    } else if(type === "enregistreur"){
      rond(40,32,10,"accent"); rect(65,22,20,20,"touche",2);
    } else if(type === "transfert"){
      chemin("M26 25H85L76 17 M85 25L76 33 M94 43H35L44 35 M35 43L44 51");
    } else if(type === "signal"){
      chemin("M12 35H30L36 23L46 46L55 18L65 43L72 29L80 35H107");
    } else {
      rect(12,17,28,12,"ecran",1);
      for(var n=0;n<5;n++) rond(51+n*12,23,3,"touche");
      for(var z=0;z<4;z++) rond(18+z*27,39,4,"touche");
      for(var pas=0;pas<12;pas++) rect(11+pas*8,50,6,5,pas<4?"accent":"touche",1);
    }
    return svg;
  }
  function habiller(b, data, outil){
    var titre = b.querySelector("b"), description = b.querySelector("span");
    if(!titre || !description) return;
    var identite = el("span", "catalogue-identite");
    identite.appendChild(el("span", "catalogue-constructeur", data[0]));
    identite.appendChild(titre);
    if(!outil){
      var marque = data[0];
      if(titre.textContent.toUpperCase().indexOf(marque + " ") === 0)
        titre.textContent = titre.textContent.slice(marque.length + 1);
    }
    description.classList.add("catalogue-description");
    /* L'ancien libellé disait quatorze modules, même après les ajouts. */
    if(b.dataset.m === "eur" && typeof EUR_CAT === "object")
      description.textContent = Object.keys(EUR_CAT).length + " MODULES · CÂBLAGE LIBRE · MODE FOCUS";
    var apercu = el("span", "catalogue-apercu");
    apercu.appendChild(el("span", "catalogue-categorie", outil ? "OUTIL" : data[1][0]));
    apercu.appendChild(vignette(data[2]));
    b.appendChild(identite); b.appendChild(apercu); b.appendChild(description);
    b.style.setProperty("--carte-accent", data[3]);
    b.type = "button";
    b.dataset.catalogueCategories = data[1].join(" ");
    b.dataset.catalogueRecherche = normaliser(data[0] + " " + titre.textContent + " " + data[1].join(" ") + " " + description.textContent);
    if(!outil){
      var actuelle = el("span", "catalogue-actuelle", "ACTUELLE");
      actuelle.hidden = true; identite.appendChild(actuelle);
    }
  }
  var entete = el("header", "catalogue-entete");
  var marque = el("div", "catalogue-marque"), nom = el("div");
  nom.appendChild(el("small", "", "DRM16 · STUDIO DE MACHINES"));
  var titre = racine.querySelector("h1") || el("h1", "", "CHOISIR UNE MACHINE");
  titre.id = "catalogue-titre"; titre.textContent = "Choisir une machine"; nom.appendChild(titre); marque.appendChild(nom);
  marque.appendChild(el("span", "catalogue-total", machines.length + " machines\n" + outils.length + " outils"));
  entete.appendChild(marque);
  var onglets = el("nav", "catalogue-onglets"); onglets.setAttribute("aria-label", "Afficher les machines ou les outils");
  var bm = bouton("catalogue-machines", "MACHINES · " + machines.length);
  var bo = bouton("catalogue-outils", "OUTILS · " + outils.length);
  onglets.appendChild(bm); onglets.appendChild(bo); entete.appendChild(onglets);
  var recherche = el("div", "catalogue-recherche");
  var etiquette = el("label", "", "Rechercher une machine par nom ou constructeur"); etiquette.htmlFor = "catalogue-recherche";
  var saisie = el("input"); saisie.id = "catalogue-recherche"; saisie.type = "search"; saisie.maxLength = 100;
  saisie.autocomplete = "off"; saisie.spellcheck = false; saisie.setAttribute("autocapitalize", "none");
  var effacer = bouton("catalogue-effacer", "×"); effacer.className = "catalogue-effacer";
  effacer.setAttribute("aria-label", "Effacer la recherche");
  recherche.appendChild(etiquette); recherche.appendChild(saisie); recherche.appendChild(effacer); entete.appendChild(recherche);
  var filtres = el("nav", "catalogue-filtres"); filtres.setAttribute("aria-label", "Familles de machines");
  var familles = ["TOUT", "DRUM", "SAMPLER", "SYNTH", "GROOVEBOX", "FX"];
  familles.forEach(function(f){
    var b = bouton("catalogue-filtre-" + f.toLowerCase(), f); b.dataset.famille = f;
    b.addEventListener("click", function(){ etat.famille = f; rafraichir(true); }); filtres.appendChild(b);
  });
  entete.appendChild(filtres);
  var corps = el("section", "catalogue-corps"); corps.setAttribute("aria-labelledby", "catalogue-titre");
  var resultat = el("p", "catalogue-resultat"); resultat.id = "catalogue-resultat";
  resultat.setAttribute("role", "status"); resultat.setAttribute("aria-live", "polite"); resultat.setAttribute("aria-atomic", "true");
  saisie.setAttribute("aria-describedby", resultat.id);
  corps.appendChild(resultat);
  var grille = el("div", "catalogue-grille"); grille.id = "catalogue-grille";
  bm.setAttribute("aria-controls", grille.id); bo.setAttribute("aria-controls", grille.id);
  machines.forEach(function(b){ habiller(b, donnees[b.dataset.m] || ["DRM16",["AUTRE"],"sequenceur","#b7a06c"], false); grille.appendChild(b); });
  outils.forEach(function(b){ var d = services[b.id] || ["OUTIL DRM16","sequenceur"];
    habiller(b,[d[0],["OUTIL"],d[1],"#a6adac"],true); grille.appendChild(b); });
  corps.appendChild(grille);
  var vide = el("div", "catalogue-vide"), aucun = el("p");
  aucun.appendChild(el("strong", "", "Aucun résultat"));
  aucun.appendChild(document.createTextNode("Essayez un autre nom ou retirez les filtres.")); vide.appendChild(aucun);
  var retablir = bouton("catalogue-retablir", "TOUT AFFICHER"); vide.appendChild(retablir); corps.appendChild(vide);
  racine.insertBefore(entete, racine.firstChild); racine.appendChild(corps); racine.classList.add("menu-studio");
  var etat = {vue:"machines", famille:"TOUT", machines:"", outils:""};
  function selection(){
    var courante = typeof S === "object" ? String(S.modele) : "";
    machines.forEach(function(b){
      var active = b.dataset.m === courante;
      if(active) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
      var badge = b.querySelector(".catalogue-actuelle"); if(badge) badge.hidden = !active;
    });
  }
  function rafraichir(remonter){
    var instruments = etat.vue === "machines", compte = 0;
    var mots = etat[etat.vue].trim().split(/\s+/).map(normaliser).filter(Boolean);
    machines.concat(outils).forEach(function(b){
      var bonGroupe = instruments === !!b.dataset.m;
      var categorie = !instruments || etat.famille === "TOUT" || b.dataset.catalogueCategories.split(" ").indexOf(etat.famille) >= 0;
      var correspond = mots.every(function(m){ return b.dataset.catalogueRecherche.indexOf(m) >= 0; });
      b.hidden = !(bonGroupe && categorie && correspond); if(!b.hidden) compte++;
    });
    bm.setAttribute("aria-pressed", String(instruments)); bo.setAttribute("aria-pressed", String(!instruments));
    filtres.hidden = !instruments;
    Array.prototype.forEach.call(filtres.children,function(b){ b.setAttribute("aria-pressed", String(b.dataset.famille === etat.famille)); });
    titre.textContent = instruments ? "Choisir une machine" : "Les outils du studio";
    etiquette.textContent = instruments ? "Rechercher une machine par nom ou constructeur" : "Rechercher un outil";
    saisie.placeholder = instruments ? "Nom, constructeur, famille…" : "Bibliothèque, MIDI, mixage…";
    effacer.disabled = !saisie.value;
    var total = instruments ? machines.length : outils.length;
    resultat.textContent = compte + " / " + total + (instruments ? " machines" : " outils") +
      (instruments && etat.famille !== "TOUT" ? " · " + etat.famille : "") +
      (mots.length ? " · recherche active" : "");
    vide.hidden = compte > 0;
    if(remonter) racine.scrollTop = 0;
    if(typeof majVoileMenu === "function") majVoileMenu();
  }
  function vue(v){ etat.vue = v; saisie.value = etat[v]; rafraichir(true); }
  bm.addEventListener("click", function(){ vue("machines"); });
  bo.addEventListener("click", function(){ vue("outils"); });
  saisie.addEventListener("input", function(){ etat[etat.vue] = saisie.value; rafraichir(true); });
  effacer.addEventListener("click", function(){ saisie.value = etat[etat.vue] = ""; rafraichir(true); saisie.focus(); });
  retablir.addEventListener("click", function(){
    saisie.value = etat[etat.vue] = ""; if(etat.vue === "machines") etat.famille = "TOUT";
    rafraichir(true); (etat.vue === "machines" ? bm : bo).focus();
  });
  /* Un tap sur une carte replie le clavier logiciel, sans réactiver la machine
     ici : son écouteur d'origine traite le clic exactement une fois. */
  racine.addEventListener("click", function(e){
    var cible = e.target && e.target.closest && e.target.closest(".pick");
    if(cible && document.activeElement === saisie) saisie.blur();
  }, true);
  new MutationObserver(function(){
    if(!racine.classList.contains("hide")){ selection(); rafraichir(false); }
  }).observe(racine, {attributes:true, attributeFilter:["class"]});
  selection(); rafraichir(false);
})();
