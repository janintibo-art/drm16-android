/* ================= kits par rôle, kit au hasard (v256) =================
   Le RÔLE d'une partie, c'est la catégorie du son qu'elle joue : le pad qui
   joue un kick est « kick ». Poser un kit par rôle, c'est donner à chaque
   partie un son du même rôle, pris dans une source :
   - la liste du rayon SONS telle qu'elle est filtrée (par exemple les sons
     d'une TR-808 figée) — POSER LA LISTE SUR… ;
   - les sons d'une autre machine — COPIER CE KIT VERS… (rayon MACHINES) ;
   - le hasard, dans toute la bibliothèque ou dans les favoris — KIT AU HASARD.

   On prend d'abord un son du même rôle pas encore posé ; sinon le même rôle
   une deuxième fois (une MPC a bien plus de pads que de kicks) ; sinon un
   rôle voisin (une caisse pour un clap). Une partie sans candidat garde son
   son. Tout passe par AFFECTER : la lecture continue, et REMETTRE LES SONS
   D'AVANT du rayon MACHINES revient au kit précédent. */

var ROLES_VOISINS = {kick:["basse","tom"], caisse:["clap","percu"], clap:["caisse","percu"],
  charley:["cymbale","percu"], cymbale:["charley"], tom:["percu","kick"], percu:["tom","clap","charley"],
  basse:["kick","melodique"], melodique:["basse","voix","fx"], voix:["melodique","fx"], boucle:["melodique"],
  fx:["percu","melodique"], autre:[]};

/* le rôle de chaque partie à échantillon de la machine affichée */
function rolesParties(m){
  var D = KITS_MACHINES[m];
  if(!D || S.modele !== m) return [];
  var noms = D.parties(), l = D.lire(D.courant ? D.courant() : null), r = [];
  l.forEach(function(o, i){
    if(!kitsEmplacement(D, i, o) || !D.bib || D.bib(i) < 0) return;
    var id = D.son(i, o), role = null;
    if(id) role = bibCategorie({id:id, nom:nomBib(id)});
    if(!role || role === "autre") role = bibCategorieNom(noms[i]) || role || "autre";
    r.push({i:i, role:role, id:id, banque:!!D.banqueSeule, nom:id ? nomBib(id) : noms[i]});
  });
  return r;
}
/* les mots qui distinguent deux sons d'un même rôle (« OPEN » contre « CLOSED ») */
var MOTS_VIDES = {HAT:1, HH:1, KICK:1, BD:1, BASS:1, DRUM:1, SNARE:1, SD:1, TOM:1, CLAP:1, CYMBAL:1, CYM:1,
  PERC:1, SON:1, PAD:1, PARTIE:1, PISTE:1, BANQUE:1, THE:1, LE:1, LA:1, DE:1};
function motsSon(nom){
  return String(nom || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Z0-9]+/).filter(function(w){ return w.length >= 2 && !MOTS_VIDES[w] && !/^\d+$/.test(w) && !/^(TR|RD|DMX|EM|ER|DRM|MPC|CR)\d*$/.test(w); });
}
function ressemblance(a, b){
  var x = motsSon(a), y = motsSon(b), n = 0;
  x.forEach(function(w){ if(y.indexOf(w) >= 0) n++; });
  return n;
}
/* le choix : pur, vérifiable à part. parties = [{i, role, banque, nom, id}], sources = [{id, role, banque, nom}]
   hasard : pas de préférence par le nom (chaque partie retrouverait son propre
   son), et une partie ne reçoit pas le son qu'elle a déjà s'il y en a un autre */
function choisirParRole(parties, sources, hasard){
  var pris = Object.create(null), res = [];
  function candidats(role, p){
    var c = sources.filter(function(s){ return s.role === role && (!p.banque || s.banque); });
    if(hasard){
      var autres = c.filter(function(s){ return s.id !== p.id; });
      return autres.length ? autres : c;
    }
    /* à rôle égal, le nom le plus proche d'abord ; l'ordre de la source départage */
    return c.map(function(s, k){ return {s:s, k:k, r:ressemblance(p.nom, s.nom)}; })
            .sort(function(a, b){ return (b.r - a.r) || (a.k - b.k); }).map(function(x){ return x.s; });
  }
  var donne = Object.create(null);
  /* d'abord les parties dont le nom ressemble à un son de la source (OPEN sur
     OPEN) : sinon un pad « HAT » passé avant prendrait le charley ouvert */
  if(!hasard) parties.forEach(function(p){
    var c = candidats(p.role, p).filter(function(s){ return ressemblance(p.nom, s.nom) > 0; });
    if(!c.length) return;
    var lib = c.filter(function(s){ return !pris[s.id]; }), s = lib[0] || c[0];
    donne[p.i] = s.id; pris[s.id] = true;
  });
  parties.forEach(function(p){
    if(donne[p.i]) return;
    var id = null, meme = candidats(p.role, p);
    var libres = meme.filter(function(s){ return !pris[s.id]; });
    if(libres.length) id = libres[0].id;
    else if(meme.length) id = meme[0].id;
    else (ROLES_VOISINS[p.role] || []).some(function(v){
      var c = candidats(v, p), lib = c.filter(function(s){ return !pris[s.id]; });
      if(lib.length){ id = lib[0].id; return true; }
      if(c.length){ id = c[0].id; return true; }
      return false;
    });
    if(id){ pris[id] = true; donne[p.i] = id; }
  });
  parties.forEach(function(p){ if(donne[p.i]) res.push({i:p.i, id:donne[p.i], role:p.role}); });
  return res;
}
function melanger(l, hasard){
  hasard = hasard || Math.random;
  for(var i=l.length-1;i>0;i--){ var j = Math.floor(hasard() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; }
  return l;
}
function sourcesDe(ids){
  return ids.filter(function(id, k){ return id && ids.indexOf(id) === k && ES.buf[id]; }).map(function(id){
    return {id:id, role:bibCategorie({id:id, nom:nomBib(id)}), banque:id.charAt(0) === "b", nom:nomBib(id)};
  });
}
/* poser les choix sur la machine affichée, par AFFECTER */
function poserParRole(m, choix, message){
  var D = KITS_MACHINES[m];
  if(!choix.length){ signal("AUCUN SON DU BON RÔLE DANS LA SOURCE"); return 0; }
  if(typeof ESSAI !== "undefined" && ESSAI) annulerEssai();
  kitsGarderAvant(m, false);
  var n = 0;
  choix.forEach(function(c){
    BIB.cible = {machine:m, partie:D.bib(c.i)};
    var avant = D.son(c.i, D.lire(D.courant ? D.courant() : null)[c.i]);
    if(avant === c.id){ n++; return; }
    if(bibAffecter(c.id, true) === true) n++;
  });
  try{ writeMem(); }catch(e){}
  signal(n + " PARTIE" + (n > 1 ? "S" : "") + " " + message + " · REMETTRE POUR REVENIR");
  H.inter();
  return n;
}

/* ---------- les trois gestes ---------- */
function poserListeSurMachine(m, ids){
  if(!kitsModifiable(m)) return 0;
  return poserParRole(m, choisirParRole(rolesParties(m), sourcesDe(ids)), "REÇOIVENT LA LISTE PAR RÔLE");
}
function kitAuHasard(m, favoris){
  if(!kitsModifiable(m)) return 0;
  var ids = listeEch().filter(function(id){ return ES.buf[id] && (!favoris || bibFavori(id)); });
  if(!ids.length){ signal(favoris ? "AUCUN FAVORI CHARGÉ" : "AUCUN SON CHARGÉ"); return 0; }
  return poserParRole(m, choisirParRole(rolesParties(m), melanger(sourcesDe(ids)), true),
                      favoris ? "TIRÉES PARMI LES FAVORIS" : "TIRÉES AU SORT");
}
function copierKitVers(de, vers){
  if(!kitsModifiable(de)) return 0;
  var ids = rolesParties(de).map(function(p){ return p.id; }).filter(Boolean);
  if(!ids.length){ signal("CETTE MACHINE N'A PAS D'ÉCHANTILLONS À COPIER"); return 0; }
  if(!kitsModifiable(vers)) return 0;
  return poserParRole(vers, choisirParRole(rolesParties(vers), sourcesDe(ids)), "REÇOIVENT LE KIT " + nomCourtMachine(de));
}
/* machines qui peuvent recevoir des échantillons par rôle */
function machinesAEchantillons(){
  return KITS_ORDRE.filter(function(m){ return KITS_MACHINES[m] && KITS_MACHINES[m].bib; });
}
