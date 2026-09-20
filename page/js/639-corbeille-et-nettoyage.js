/* ================= corbeille, place occupée, sons sans emploi, doublons (v258) =================
   Septième et dernier chantier annoncé de la bibliothèque : ranger ce qui
   traîne, sans jamais perdre un son par erreur.

   CORBEILLE : METTRE À LA CORBEILLE (rayon SONS) ne l'efface plus tout de
   suite. Le son disparaît de partout où l'on choisit un son — listes,
   cycles de la machine, exports, crédits, tirage au hasard — mais reste
   jouable là où il sert déjà. Après TRENTE JOURS, il s'efface tout seul à
   l'ouverture de la bibliothèque ; RESTAURER le remet avant.

   PLACE OCCUPÉE : la mémoire prise par vos sons, affichée avec leur compte
   dans le rayon SONS et détaillée dans le rayon SAUVEGARDES.

   SONS SANS EMPLOI : ceux qui ne servent dans aucun motif, programme, kit
   rangé ni prise. Un geste les met tous à la corbeille.

   DOUBLONS : deux sons aux mêmes échantillons (même empreinte que celle qui
   sert à ne pas copier un son déjà là en important un pack). On garde celui
   qui sert le plus (à date égale, le plus ancien) et on met les autres à la
   corbeille en un geste. */

var CORBEILLE_JOURS = 30;

/* ---------- mémoire ---------- */
function bibCorbeilleValide(o){
  var r = Object.create(null);
  if(!o || typeof o !== "object") return r;
  Object.keys(o).forEach(function(id){
    var t = o[id];
    if(/^[A-Za-z0-9_-]{1,64}$/.test(id) && typeof t === "number" && isFinite(t) && t > 0) r[id] = t;
  });
  return r;
}
function bibEnCorbeille(id){ return !!(BIB.corbeille && BIB.corbeille[id]); }
/* sansEcrire (v258, comme les mises en lot) : un seul enregistrement pour plusieurs sons */
function bibMettreCorbeille(id, sansEcrire){
  if(!id || id.charAt(0) === "b" || bibEnCorbeille(id)) return false;
  if(!BIB.corbeille) BIB.corbeille = Object.create(null);
  BIB.corbeille[id] = Date.now();
  if(!sansEcrire) bibEcrire();
  return true;
}
function bibRestaurer(id){
  if(!BIB.corbeille || !BIB.corbeille[id]) return false;
  delete BIB.corbeille[id];
  bibEcrire(); majBibUI();
  return true;
}
/* efface pour de bon, sans confirmation ni signal : utilisé par les trois gestes ci-dessous */
function bibEffacer(id){
  supprimerEch(id); delete BIB.noms[id];
  if(BIB.freesound) delete BIB.freesound[id];
  if(BIB.meta) delete BIB.meta[id];
  if(BIB.corbeille) delete BIB.corbeille[id];
}
function bibSupprimerDefinitif(id){
  var n = usagesEch(id);
  var texte = "Effacer « " + nomBib(id) + " » pour de bon ?" +
    (n > 0 ? "\n\nIl sert encore " + n + " fois." : "") + "\n\nImpossible de revenir en arrière.";
  if(!window.confirm(texte)) return;
  bibEffacer(id);
  bibEcrire(); majBibUI(); H.inter();
}
function bibViderCorbeille(){
  var l = Object.keys(BIB.corbeille || {});
  if(!l.length){ signal("LA CORBEILLE EST VIDE"); return; }
  if(!window.confirm("Effacer pour de bon les " + l.length + " son" + (l.length > 1 ? "s" : "") + " de la corbeille ?\n\nImpossible de revenir en arrière.")) return;
  l.forEach(function(id){ bibEffacer(id); });
  bibEcrire(); majBibUI(); H.inter();
  signal(l.length + " SON" + (l.length > 1 ? "S EFFACÉS" : " EFFACÉ") + " POUR DE BON");
}
/* purge silencieuse des sons trop vieux, à l'ouverture de la bibliothèque */
function bibPurgerCorbeille(){
  if(!BIB.corbeille) return;
  var seuil = Date.now() - CORBEILLE_JOURS * 86400000, n = 0;
  Object.keys(BIB.corbeille).forEach(function(id){
    if(BIB.corbeille[id] > seuil) return;
    bibEffacer(id); n++;
  });
  if(n) bibEcrire();
}

/* ---------- place occupée ---------- */
/* la taille réelle sur disque, après wavDe : toujours mono, 16 bits */
function bibOctetsSon(buf){ return buf ? buf.length * 2 : 0; }
function bibPlaceOccupee(){
  var r = {octets:0, sons:0, corbeilleOctets:0, corbeilleSons:0};
  for(var id in ES.buf){
    if(id.charAt(0) === "b") continue;
    var t = bibOctetsSon(ES.buf[id]);
    if(bibEnCorbeille(id)){ r.corbeilleOctets += t; r.corbeilleSons++; }
    else { r.octets += t; r.sons++; }
  }
  return r;
}
/* ---------- sons sans emploi ---------- */
function bibSansEmploi(id){ return usagesEch(id) === 0; }
/* toute la liste filtrée du rayon SONS (favoris, sansemploi, etc.) à la corbeille d'un coup */
function bibMettreListeCorbeille(){
  var ids = bibClasserSons(bibSons()).complet.map(function(s){ return s.id; }).filter(function(id){ return id.charAt(0) !== "b"; });
  if(!ids.length){ signal("AUCUN SON À VOUS DANS LA LISTE"); return; }
  if(!window.confirm("Mettre " + ids.length + " son" + (ids.length > 1 ? "s" : "") + " à la corbeille ?\n\nRestaurable depuis SAUVEGARDES tant qu'elle n'est pas vidée.")) return;
  var n = 0;
  ids.forEach(function(id){ if(bibMettreCorbeille(id, true)) n++; });
  bibEcrire(); majBibUI(); H.inter();
  signal(n + " SON" + (n > 1 ? "S" : "") + " À LA CORBEILLE");
}

/* ---------- doublons ---------- */
/* pur : sons = [{id, empreinte, usages, date}]. On garde celui qui sert le
   plus ; à égalité, le plus ancien ; à égalité, l'ordre d'arrivée. */
function bibDoublonsDe(sons){
  var groupes = Object.create(null), r = [];
  sons.forEach(function(s){ (groupes[s.empreinte] = groupes[s.empreinte] || []).push(s); });
  Object.keys(groupes).forEach(function(e){
    var g = groupes[e];
    if(g.length < 2) return;
    g = g.slice().sort(function(a, b){ return (b.usages - a.usages) || (a.date - b.date) || 0; });
    r.push({garder:g[0].id, autres:g.slice(1).map(function(x){ return x.id; })});
  });
  return r;
}
function bibDoublonsActuels(){
  var sons = bibSons().filter(function(s){ return s.propre && ES.buf[s.id]; }).map(function(s){
    return {id:s.id, empreinte:empreinteSon(ES.buf[s.id]), usages:usagesEch(s.id), date:bibDate(s.id)};
  });
  return bibDoublonsDe(sons);
}
function bibMettreGroupeCorbeille(autres){
  if(!autres || !autres.length) return;
  var usages = 0;
  autres.forEach(function(id){ usages += usagesEch(id); });
  if(usages > 0 && !window.confirm("Ces doublons servent encore " + usages + " fois au total. Les mettre à la corbeille quand même ?")) return;
  var n = 0;
  autres.forEach(function(id){ if(bibMettreCorbeille(id, true)) n++; });
  bibEcrire(); majBibUI(); H.inter();
  signal(n + " DOUBLON" + (n > 1 ? "S" : "") + " À LA CORBEILLE");
}

/* ---------- le panneau, dans le rayon SAUVEGARDES ---------- */
function nettoyageRendre(corps){
  var h = document.createElement("h3"); h.textContent = "Nettoyage"; corps.appendChild(h);

  var place = bibPlaceOccupee();
  var p1 = document.createElement("p"); p1.style.opacity = ".8"; p1.style.fontSize = "13px";
  p1.textContent = "Place occupée : " + octetsTexte(place.octets) + " pour " + place.sons +
    " son" + (place.sons > 1 ? "s" : "") + " à vous" +
    (place.corbeilleSons ? " · " + octetsTexte(place.corbeilleOctets) + " en corbeille (" + place.corbeilleSons + ")" : "") + ".";
  corps.appendChild(p1);

  var inutiles = bibSons().filter(function(s){ return s.propre && bibSansEmploi(s.id); });
  var p2 = document.createElement("p"); p2.style.opacity = ".8"; p2.style.fontSize = "13px";
  p2.textContent = inutiles.length
    ? inutiles.length + " son" + (inutiles.length > 1 ? "s ne servent" : " ne sert") + " dans aucun motif, programme, kit rangé ni prise."
    : "Tous vos sons servent quelque part.";
  corps.appendChild(p2);
  if(inutiles.length){
    var acts0 = document.createElement("div"); acts0.className = "bib-actions";
    boutonBib(acts0, "VOIR LES SONS SANS EMPLOI", function(){
      var f = bibFiltre();
      f.q = ""; f.cat = ""; f.orig = "tout"; f.fav = false; f.sansemploi = true; f.n = BIB_PAGE;
      BIB.onglet = 0; majBibUI();
    });
    corps.appendChild(acts0);
  }

  var hd = document.createElement("h3"); hd.textContent = "Doublons"; corps.appendChild(hd);
  var groupes = bibDoublonsActuels();
  if(!groupes.length){
    var pd = document.createElement("p"); pd.style.opacity = ".7";
    pd.textContent = "Aucun doublon parmi vos sons.";
    corps.appendChild(pd);
  } else groupes.forEach(function(g){
    var l = ligneBib(nomBib(g.garder), "gardé · doublon de " + g.autres.map(function(id){ return nomBib(id); }).join(", "));
    var a = document.createElement("div"); a.className = "bib-actions";
    boutonBib(a, "METTRE " + (g.autres.length > 1 ? "LES AUTRES" : "L'AUTRE") + " À LA CORBEILLE", function(){
      bibMettreGroupeCorbeille(g.autres);
    });
    l.appendChild(a); corps.appendChild(l);
  });

  var lc = Object.keys(BIB.corbeille || {}).filter(function(id){ return ES.buf[id]; });
  var hc = document.createElement("h3"); hc.textContent = "Corbeille (" + lc.length + ")"; corps.appendChild(hc);
  if(!lc.length){
    var pc = document.createElement("p"); pc.style.opacity = ".7";
    pc.textContent = "Vide. METTRE À LA CORBEILLE, dans le rayon SONS, y dépose un son sans l'effacer tout de suite.";
    corps.appendChild(pc);
  } else {
    var actv = document.createElement("div"); actv.className = "bib-actions";
    boutonBib(actv, "VIDER LA CORBEILLE", bibViderCorbeille, false);
    corps.appendChild(actv);
    lc.sort(function(a, b){ return BIB.corbeille[a] - BIB.corbeille[b]; }).forEach(function(id){
      var jours = Math.max(0, CORBEILLE_JOURS - Math.floor((Date.now() - BIB.corbeille[id]) / 86400000));
      var n = usagesEch(id);
      var l = ligneBib(nomBib(id), "effacé dans " + jours + " jour" + (jours > 1 ? "s" : "") + (n ? " · sert encore " + n + " fois" : ""));
      var a = document.createElement("div"); a.className = "bib-actions";
      boutonBib(a, "RESTAURER", function(){ bibRestaurer(id); });
      boutonBib(a, "SUPPRIMER DÉFINITIVEMENT", function(){ bibSupprimerDefinitif(id); });
      l.appendChild(a); corps.appendChild(l);
    });
  }
}
