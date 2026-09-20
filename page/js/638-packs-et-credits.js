/* ================= packs, kits en fichiers, crédits (v257) =================
   Un PACK (.drmpack) est un seul fichier qui emporte des sons — en WAV, avec
   leur nom, leur catégorie, leurs crédits — et, pour un KIT, les réglages de
   la machine qui s'en servent. On l'écrit dans Documents, on l'envoie, on le
   rouvre sur un autre téléphone ou sur l'ordinateur.

   À l'import, un son déjà présent (mêmes échantillons) n'est pas copié une
   deuxième fois : le kit se branche sur celui qu'on a. Les sons de la banque
   interne ne voyagent pas, ils existent partout.

   CRÉDITS DES SONS écrit un fichier texte qui réunit l'origine des sons
   venus d'ailleurs : Freesound (titre, auteur, licence, adresse), archive.org,
   packs reçus. À joindre à ce que l'on publie. */

/* 16 Mo : le plafond des projets, que le pont applique aussi aux .drmpack,
   à l'écriture comme à la lecture */
var PACK_FORMAT = "drm16-pack", PACK_MAX = 16 * 1024 * 1024;

/* ---------- empreinte d'un son : mêmes échantillons, même son ---------- */
function empreinteSon(buf){
  var d = buf.getChannelData(0), h = 2166136261, n = d.length;
  for(var i=0;i<n;i++){
    var s = Math.round(Math.max(-1, Math.min(1, d[i])) * 32767) & 0xffff;
    h ^= s & 0xff; h = Math.imul(h, 16777619);
    h ^= s >>> 8;  h = Math.imul(h, 16777619);
  }
  return buf.sampleRate + ":" + n + ":" + (h >>> 0).toString(36);
}
function sonIdentique(buf){
  var e = null;
  for(var id in ES.buf){
    var b = ES.buf[id];
    if(!b || id.charAt(0) === "b" || b.length !== buf.length || b.sampleRate !== buf.sampleRate) continue;
    if(e === null) e = empreinteSon(buf);
    if(empreinteSon(b) === e) return id;
  }
  return null;
}

/* ---------- crédit d'un son, en une ligne ---------- */
function creditSon(id){
  var o = bibOrigine(id), nom = nomBib(id), m = BIB.meta && BIB.meta[id];
  if(m && m.cr) return m.cr;
  if(o === "freesound" && BIB.freesound && BIB.freesound[id]){
    var f = BIB.freesound[id];
    return "« " + f.nom + " » par " + f.auteur + " · " + f.licence + " · " + f.url;
  }
  if(o === "archive") return "« " + nom + " » · Internet Archive, collection de boîtes à rythmes (archive.org)";
  return "";
}

/* ---------- écrire un pack ---------- */
function packDonnees(ids, kits, nom){
  var sons = [];
  ids.forEach(function(id){
    if(!id || sons.some(function(s){ return s.id === id; })) return;
    if(id.charAt(0) === "b"){ sons.push({id:id, banque:true}); return; }
    var b = ES.buf[id];
    if(!b) return;
    var s = {id:id, nom:nomBib(id), cat:bibCategorie({id:id, nom:nomBib(id)}), wav:b64De(wavDe(b))};
    var cr = creditSon(id);
    if(cr) s.credit = cr.slice(0, 400);
    if(bibFavori(id)) s.fav = 1;
    sons.push(s);
  });
  return {format:PACK_FORMAT, v:1, nom:String(nom || "PACK").slice(0, 60), date:Date.now(), sons:sons, kits:kits || []};
}
function packEcrire(donnees, fichier){
  var p = HOST;
  if(!p || !p.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE ICI"); return ""; }
  var octets = new TextEncoder().encode(JSON.stringify(donnees));
  if(octets.length > PACK_MAX){ signal("PACK TROP GROS · 16 Mo AU PLUS · FILTREZ LA LISTE"); return ""; }
  var chemin = ecrireDocument(p, fichier, octets);
  var n = donnees.sons.filter(function(s){ return s.wav; }).length;
  signal(chemin ? fichier + " · " + n + " SON" + (n > 1 ? "S" : "") + (donnees.kits.length ? " · " + donnees.kits.length + " KIT" : "") +
                  " · " + octetsTexte(octets.length) : "ÉCRITURE REFUSÉE");
  if(chemin) majBibUI();
  return chemin;
}
function nomFichierSur(t){
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "sons";
}
function horodatage(){
  var d = new Date();
  return d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2) + "-" +
         ("0" + d.getHours()).slice(-2) + ("0" + d.getMinutes()).slice(-2) + ("0" + d.getSeconds()).slice(-2);
}
/* la liste filtrée du rayon SONS, en pack */
function exporterPackListe(){
  var l = bibClasserSons(bibSons()).complet.map(function(s){ return s.id; }).filter(function(id){ return id.charAt(0) !== "b"; });
  if(!l.length){ signal("AUCUN SON À VOUS DANS LA LISTE"); return ""; }
  var f = bibFiltre(), titre = f.q || (f.cat ? bibNomCategorie(f.cat) : f.orig !== "tout" ? f.orig : "sons");
  return packEcrire(packDonnees(l, [], titre), "pack-" + nomFichierSur(titre) + "-" + horodatage() + ".drmpack");
}
/* un kit rangé, avec ses sons */
function exporterKit(m, n){
  var d = kitsDe(kitsLireTout(), m), kit = d.kits[n];
  if(!kit){ signal("KIT INTROUVABLE"); return ""; }
  var ids = [];
  (kit.parties || []).forEach(function(p){ if(p && typeof p.ech === "string") ids.push(p.ech); });
  var k = {machine:m, nom:kit.nom, parties:kit.parties, global:kit.global};
  return packEcrire(packDonnees(ids, [k], kit.nom),
                    "kit-" + nomFichierSur(nomCourtMachine(m)) + "-" + nomFichierSur(kit.nom) + "-" + horodatage() + ".drmpack");
}

/* ---------- lire un pack ---------- */
function packValider(o){
  if(!o || o.format !== PACK_FORMAT || o.v !== 1 || !Array.isArray(o.sons)) return "CE N'EST PAS UN PACK DRM16";
  if(o.sons.length > 2000) return "PACK ILLISIBLE · TROP DE SONS";
  return "";
}
function decoderWavB64(b64){
  var o = b64VersOctets(b64);
  return new Promise(function(res, rej){
    var r = ctx.decodeAudioData(o.buffer, res, rej);
    if(r && r.catch) r.catch(rej);
  });
}
function nouvelIdPack(){
  var id = "u" + Date.now().toString(36) + "pk", k = 1;
  while(ES.buf[id]) id = "u" + Date.now().toString(36) + "pk" + (k++);
  return id;
}
/* rend {sons:nouveaux, repris:déjà là, kits:n, erreurs:n} */
function packImporter(o){
  var err = packValider(o);
  if(err){ signal(err); return Promise.resolve(null); }
  if(typeof PROJET_EN_COURS !== "undefined" && PROJET_EN_COURS) return Promise.resolve(null);
  audioInit(); banqueEs();
  if(!ctx){ signal("AUDIO INDISPONIBLE"); return Promise.resolve(null); }
  var carte = Object.create(null), bilan = {sons:0, repris:0, kits:0, erreurs:0};
  var suite = Promise.resolve();
  o.sons.forEach(function(s){
    if(!s || typeof s.id !== "string") return;
    if(s.banque){ if(/^b\d+$/.test(s.id)) carte[s.id] = s.id; return; }
    if(typeof s.wav !== "string") return;
    suite = suite.then(function(){ return decoderWavB64(s.wav); }).then(function(buf){
      var deja = sonIdentique(buf);
      if(deja){ carte[s.id] = deja; bilan.repris++; return; }
      var id = nouvelIdPack();
      ES.buf[id] = buf; ES.noms[id] = "pack";
      BIB.noms[id] = String(s.nom || "SON").replace(/\s+/g, " ").trim().slice(0, 28) || "SON";
      var m = bibMeta(id);
      if(bibCategorieConnue(s.cat)) m.c = s.cat;
      if(s.fav) m.f = 1;
      if(typeof s.credit === "string" && s.credit) m.cr = s.credit.slice(0, 400);
      if(sauverEch(id, buf)){ carte[s.id] = id; bilan.sons++; }
      else { delete ES.buf[id]; delete BIB.noms[id]; delete BIB.meta[id]; bilan.erreurs++; }
    }, function(){ bilan.erreurs++; });
  });
  return suite.then(function(){
    bibEcrire();
    (Array.isArray(o.kits) ? o.kits : []).forEach(function(k){
      if(!k || !KITS_MACHINES[k.machine] || !Array.isArray(k.parties)) return;
      var parties = k.parties.map(function(p){
        if(!p || typeof p !== "object") return p;
        var q = JSON.parse(JSON.stringify(p));
        if(typeof q.ech === "string") q.ech = carte[q.ech] || (/^b\d+$/.test(q.ech) ? q.ech : null);
        return q;
      });
      var tout = kitsLireTout(), d = kitsDe(tout, k.machine);
      if(d.kits.length >= KITS_MAX){ bilan.erreurs++; return; }
      var kit = {nom:(String(k.nom || "KIT") + " (IMPORTÉ)").slice(0, 28), date:Date.now(), parties:parties};
      if(k.global && typeof k.global === "object") kit.global = k.global;
      d.kits.push(kit);
      if(kitsEcrireTout(tout)) bilan.kits++;
    });
    signal("PACK « " + String(o.nom || "").slice(0, 24) + " » : " + bilan.sons + " SONS NOUVEAUX" +
           (bilan.repris ? " · " + bilan.repris + " DÉJÀ LÀ" : "") + (bilan.kits ? " · " + bilan.kits + " KIT" : "") +
           (bilan.erreurs ? " · " + bilan.erreurs + " ÉCHECS" : ""));
    majBibUI(); H.inter();
    return bilan;
  });
}
function packImporterTexte(texte){
  var o = null;
  try{ o = JSON.parse(texte); }catch(e){ signal("CE N'EST PAS UN PACK DRM16"); return Promise.resolve(null); }
  return packImporter(o);
}
function packOuvrirFichierExterne(){
  var e = document.getElementById("pack-fichier");
  if(!e){
    e = document.createElement("input");
    e.type = "file"; e.id = "pack-fichier"; e.style.display = "none";
    /* aucun filtre : Android ne connaît pas l'extension .drmpack */
    e.addEventListener("change", function(){
      var f = e.files && e.files[0];
      e.value = "";
      if(!f) return;
      if(f.size > PACK_MAX){ signal("PACK TROP GROS"); return; }
      var r = new FileReader();
      r.onload = function(){ packImporterTexte(String(r.result)); };
      r.onerror = function(){ signal("LECTURE IMPOSSIBLE"); };
      r.readAsText(f, "utf-8");
    });
    document.body.appendChild(e);
  }
  e.click();
}
function packOuvrirDocument(nom){
  var p = HOST, b64 = "";
  try{ b64 = p && p.fichierCharger ? p.fichierCharger(nom) || "" : ""; }catch(e){}
  if(!b64){ signal("FICHIER ILLISIBLE"); return Promise.resolve(null); }
  return packImporterTexte(texteDeB64(b64));
}

/* ---------- crédits ---------- */
function texteCredits(){
  var lignes = [];
  listeEch().forEach(function(id){
    if(id.charAt(0) === "b") return;
    var c = creditSon(id);
    if(c) lignes.push("- " + nomBib(id) + " : " + c);
  });
  lignes.sort();
  return "Crédits des sons — DRM16, " + new Date().toLocaleDateString("fr-FR") + "\n\n" +
    (lignes.length ? lignes.join("\n") : "Aucun son venu d'ailleurs : tous sont de la banque interne, enregistrés ou fabriqués ici.") +
    "\n\nLes sons de la banque interne, les enregistrements et les sons figés ou rééchantillonnés dans DRM16 n'appellent pas de crédit.\n";
}
function exporterCredits(){
  var p = HOST;
  if(!p || !p.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE ICI"); return ""; }
  var t = texteCredits(), nom = "credits-sons-drm16-" + horodatage() + ".txt";
  var chemin = ecrireDocument(p, nom, new TextEncoder().encode(t));
  var n = t.split("\n").filter(function(l){ return l.indexOf("- ") === 0; }).length;
  signal(chemin ? nom + " · " + n + " CRÉDIT" + (n > 1 ? "S" : "") : "ÉCRITURE REFUSÉE");
  return chemin;
}

/* ---------- importer plusieurs sons d'un coup ---------- */
function importerSonsFichiers(fichiers){
  var l = Array.prototype.slice.call(fichiers || []), suite = Promise.resolve(), n = 0;
  if(!l.length) return suite;
  if(l.length > 1) signal("IMPORT DE " + l.length + " SONS…");
  l.forEach(function(f){
    suite = suite.then(function(){ return importerSonFichier(f); }).then(function(ok){ if(ok) n++; });
  });
  return suite.then(function(){ if(l.length > 1) signal(n + " SONS IMPORTÉS SUR " + l.length); return n; });
}

/* ---------- la section des packs dans le rayon SAUVEGARDES ---------- */
function packRendre(corps){
  var h = document.createElement("h3"); h.textContent = "Packs et kits"; corps.appendChild(h);
  var p = document.createElement("p");
  p.textContent = "Un pack .drmpack emporte des sons (et un kit avec ses réglages) dans un seul fichier. " +
    "Exportez-les depuis les rayons SONS et MACHINES ; ils sont écrits dans Documents.";
  corps.appendChild(p);
  var acts = document.createElement("div"); acts.className = "bib-actions";
  boutonBib(acts, "IMPORTER UN PACK OU UN KIT…", packOuvrirFichierExterne, false).id = "pack-importer";
  boutonBib(acts, "CRÉDITS DES SONS", exporterCredits).id = "pack-credits";
  corps.appendChild(acts);
  bibFichiers(".drmpack").forEach(function(f){
    var l = ligneBib(f.nom, octetsTexte(f.taille) + (f.date ? " · " + new Date(f.date).toLocaleString("fr-FR") : ""));
    var a = document.createElement("div"); a.className = "bib-actions";
    boutonBib(a, "IMPORTER", function(){ packOuvrirDocument(f.nom); });
    boutonBib(a, "SUPPRIMER", function(){ bibSupprimerFichier(f.nom); });
    l.appendChild(a); corps.appendChild(l);
  });
}
