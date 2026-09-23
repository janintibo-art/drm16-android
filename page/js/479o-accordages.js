/* ================= ACCORDAGES ET ORNEMENTS — v298 =================
   Un petit arpège qui monte à travers les degrés d'une gamme — mais pas
   forcément le tempérament égal : ÉGAL 12, JUSTE (intonation juste,
   septième degré à 5/4 et 3/2 exacts), PYTHAGORICIEN (empilement de
   quintes), ou une gamme IMPORTÉE depuis un fichier Scala .scl. Chaque pas
   peut aussi porter un ORNEMENT — appoggiature, mordant ou trille — calculé
   à partir de l'écart réel entre degrés voisins de la gamme en cours, pas
   d'un demi-ton fixe : l'ornement suit l'accordage.

   Comme MÉLO 32/HARMONIE 8/DIALOGUE, tout le calcul se fait en JS "logique"
   au moment de recevoir(t,'clk'), jamais par retouche audio d'un signal déjà
   émis ailleurs : la conversion demi-ton → cents d'un tempérament personnalisé
   n'a donc pas besoin d'un WaveShaper (résolution insuffisante sur une large
   plage de hauteurs) — chaque CV de sortie est calculé exactement, en cents
   flottants, comme un module source, pas un processeur audio-rate.

   Simplification assumée : la période de la gamme est toujours l'octave
   (1200 cents), comme la quasi-totalité des fichiers .scl réels ; une gamme
   à période non-octaviante se chargerait mais boucotterait mal (documenté,
   pas un cas courant). L'import ne fait pas partie de l'état sauvegardé du
   projet (comme les mémoires d'accord de POLY 4) : c'est un geste de séance,
   pas un réglage à conserver. */
var EUR_ACCORDAGES = (function(){
  "use strict";
  var kns = [["racine","RACINE",0,11,0],["octave","OCTAVE",-2,2,0],["gamme","GAMME",0,3,0],
    ["longueur","LONGUEUR",2,16,8],["ornement","ORNEMENT",0,3,0],["vitesse","VITESSE ms",15,120,40],
    ["glisse","GLISSÉ ms",0,60,0]];
  function entier(v,min,max,def){ return Number.isFinite(v) ? Math.max(min,Math.min(max,Math.round(v))) : def; }
  function normaliser(m){ if(!m.p) m.p = {}; kns.forEach(function(k){ m.p[k[0]] = entier(m.p[k[0]], k[2], k[3], k[4]); }); }

  /* ---------- Tempéraments : degrés en cents depuis 1/1, période 1200 ---------- */
  var GAMMES_FIXES = [
    {nom:"ÉGAL 12", degres:[0,100,200,300,400,500,600,700,800,900,1000,1100], periode:1200},
    {nom:"JUSTE", degres:[0,203.91,386.31,498.04,701.96,884.36,1088.27], periode:1200},
    {nom:"PYTHAGORICIEN", degres:[0,203.91,407.82,498.04,701.96,905.87,1109.78], periode:1200}
  ];

  /* ---------- Import Scala .scl ---------- */
  function analyserScala(texte){
    var lignes = String(texte).split(/\r?\n/).map(function(l){ return l.trim(); }).filter(function(l){ return l.length && l[0] !== "!"; });
    if(lignes.length < 2) throw new Error("fichier .scl invalide : pas assez de lignes utiles");
    var n = parseInt(lignes[1], 10);
    if(!Number.isFinite(n) || n < 1) throw new Error("fichier .scl invalide : nombre de degrés illisible");
    var brut = lignes.slice(2, 2 + n);
    if(brut.length < n) throw new Error("fichier .scl invalide : " + n + " degrés annoncés, " + brut.length + " trouvés");
    var degres = brut.map(function(l){
      var v = l.split(/\s+/)[0];
      if(v.indexOf("/") >= 0){
        var parts = v.split("/"); var num = parseFloat(parts[0]), den = parseFloat(parts[1]);
        if(!num || !den) throw new Error("rapport illisible : " + v);
        return 1200 * Math.log2(num / den);
      }
      if(v.indexOf(".") >= 0) return parseFloat(v);
      var entierRatio = parseFloat(v);
      if(!Number.isFinite(entierRatio)) throw new Error("degré illisible : " + v);
      return 1200 * Math.log2(entierRatio);
    });
    var periode = degres[degres.length - 1];
    var sansDernier = degres.slice(0, -1);
    return {nom:"IMPORTÉE", degres:[0].concat(sansDernier.length ? sansDernier : []), periode:periode || 1200};
  }

  function gammeActive(m){
    var idx = entier(m.p.gamme, 0, 3, 0);
    if(idx === 3) return (m._accScala && m._accScala.degres && m._accScala.degres.length) ? m._accScala : GAMMES_FIXES[0];
    return GAMMES_FIXES[idx];
  }

  /* cents(i) : cents du degré d'indice i (peut dépasser la longueur de la
     gamme — l'octave se répète alors autant de fois que nécessaire). */
  function cents(gamme, i){
    var N = gamme.degres.length;
    var octaves = Math.floor(i / N), deg = ((i % N) + N) % N;
    return octaves * gamme.periode + gamme.degres[deg];
  }
  function ecartVoisin(gamme, i, sens){ return cents(gamme, i + sens) - cents(gamme, i); }
  function cv(m, gamme, i){
    var racineCents = (entier(m.p.racine,0,11,0) - 9) * 100, oct = entier(m.p.octave,-2,2,0) * 1200;
    return (racineCents + oct + cents(gamme, i)) / 1200;
  }

  function creer(m){
    normaliser(m);
    var ports = {cv:eurConst(0), gate:eurConst(0)};
    var d = m.accordage = {pos:-1, rampe:null, jouee:false};
    function valeur(r,t){ return !r ? 0 : t>=r.fin ? r.b : t<=r.t ? r.a : r.a+(r.b-r.a)*(t-r.t)/(r.fin-r.t); }
    function fermer(t){ ports.gate.offset.cancelScheduledValues(t); ports.gate.offset.setValueAtTime(0,t); }
    function annuler(t){
      var v = valeur(d.rampe,t);
      ports.cv.offset.cancelScheduledValues(t); ports.cv.offset.setValueAtTime(v,t);
    }
    function reset(t){ fermer(t); annuler(t); d.rampe=null; d.pos=-1; d.jouee=false; }
    m.arreter = function(){ reset(ctx ? maintenantAudio() : 0); };

    /* évènements = [{dt, cv}] relatifs au début du pas ; chacun pose une
       rampe (glissé optionnel sur le tout premier seulement) puis une
       brève porte, comme partout ailleurs dans le rack. */
    function jouerEvenements(t, evenements, glisseS){
      evenements.forEach(function(ev, idx){
        var tEv = t + ev.dt, b = ev.cv, a = valeur(d.rampe, tEv), g = (idx===0 && d.jouee) ? glisseS : 0;
        ports.cv.offset.cancelScheduledValues(tEv);
        ports.cv.offset.setValueAtTime(g?a:b, tEv);
        if(g) ports.cv.offset.linearRampToValueAtTime(b, tEv+g);
        d.rampe = {t:tEv, fin:tEv+g, a:g?a:b, b:b};
        var suivant = idx+1 < evenements.length ? evenements[idx+1].dt : Math.max(stepDur(), ev.dt + 0.02);
        eurPorte(ports.gate, tEv, Math.min(.012, Math.max(.004,(suivant-ev.dt)*.7)));
      });
      d.jouee = true;
    }

    m.recevoir = function(t,e){
      if(!Number.isFinite(t) || t<0) return null;
      if(e==="rst"){ reset(t); return null; }
      if(e!=="clk") return null;
      normaliser(m);
      var L = entier(m.p.longueur,2,16,8);
      d.pos = (d.pos+1) % L;
      var gamme = gammeActive(m), principal = cv(m, gamme, d.pos);
      var vitesseS = entier(m.p.vitesse,15,120,40)/1000, glisseS = Math.min(entier(m.p.glisse,0,60,0)/1000, stepDur()*.8);
      var orn = entier(m.p.ornement,0,3,0), evenements;
      if(orn===1){
        var bas = principal + ecartVoisin(gamme, d.pos, -1)/1200;
        evenements = [{dt:0,cv:bas},{dt:vitesseS,cv:principal}];
      }else if(orn===2){
        var haut = principal + ecartVoisin(gamme, d.pos, 1)/1200;
        evenements = [{dt:0,cv:principal},{dt:vitesseS,cv:haut},{dt:vitesseS*2,cv:principal}];
      }else if(orn===3){
        var haut2 = principal + ecartVoisin(gamme, d.pos, 1)/1200, n = Math.max(2, Math.floor(stepDur()/vitesseS));
        evenements = [];
        for(var k=0;k<n;k++) evenements.push({dt:k*vitesseS, cv:k%2===0?principal:haut2});
      }else{
        evenements = [{dt:0,cv:principal}];
      }
      jouerEvenements(t, evenements, glisseS);
      return null;
    };

    m.accordage.importer = function(texte){
      var g = analyserScala(texte);
      m._accScala = g;
      return {nom:g.nom, degres:g.degres.length, periode:g.periode};
    };
    return {e:{clk:eurGain(1),rst:eurGain(1)}, s:{cv:ports.cv,gate:ports.gate}};
  }

  /* ---------- Façade : sept réglages + import Scala ---------- */
  function el(tag,classe,txt){ var e=document.createElement(tag); if(classe) e.className=classe; if(txt!==undefined) e.textContent=txt; return e; }
  function bouton(p,t,cl){ var b=el("button",cl,t); b.type="button"; p.appendChild(b); return b; }
  function interfaceModule(parent,m,grand){
    var root = el("div","acc "+(grand?"acc-editeur":"acc-mini")); parent.appendChild(root); root.dataset.module = m.id;
    function valide(){ return EUR.mods.indexOf(m)>=0; }
    if(!grand){
      root.appendChild(el("p","acc-intro","ACCORDAGES"));
      var ouvrir = bouton(root,"OUVRIR ACCORDAGES ET ORNEMENTS","acc-ouvrir");
      ouvrir.addEventListener("click",function(e){ e.stopPropagation(); if(valide() && typeof EUR_FOCUS!=="undefined") EUR_FOCUS.ouvrir(m.id); });
      return {rafraichir:function(){}, detruire:function(){}};
    }
    function modifier(k,v){ if(!valide()) return; m.p[k]=v; memEur(); }
    function options(a,b,pas,fn){ var r=[]; for(var i=a;i<=b;i+=pas) r.push([i, fn?fn(i):String(i)]); return r; }
    function select(p,k,t,l){
      var lab=el("label",""), s=el("select","");
      lab.appendChild(el("span","",t)); s.dataset.champ=k; s.setAttribute("aria-label",t);
      l.forEach(function(x){ var o=el("option","",x[1]); o.value=x[0]; s.appendChild(o); });
      s.addEventListener("change",function(){ modifier(k,+s.value); }); lab.appendChild(s); p.appendChild(lab); return s;
    }
    var noms = ["DO","DO♯","RÉ","RÉ♯","MI","FA","FA♯","SOL","SOL♯","LA","LA♯","SI"];
    root.appendChild(el("p","acc-intro","UN ARPÈGE, SA GAMME, SON ORNEMENT"));
    var reglages = el("div","acc-reglages"); root.appendChild(reglages);
    var champs = {};
    champs.racine = select(reglages,"racine","RACINE", noms.map(function(n,i){ return [i,n]; }));
    champs.octave = select(reglages,"octave","OCTAVE", options(-2,2,1,function(n){ return (n>0?"+":"")+n; }));
    champs.gamme = select(reglages,"gamme","GAMME", [[0,"ÉGAL 12"],[1,"JUSTE"],[2,"PYTHAGORICIEN"],[3,"IMPORTÉE"]]);
    champs.longueur = select(reglages,"longueur","LONGUEUR", options(2,16,1,function(n){ return n+" pas"; }));
    champs.ornement = select(reglages,"ornement","ORNEMENT", [[0,"AUCUN"],[1,"APPOGGIATURE"],[2,"MORDANT"],[3,"TRILLE"]]);
    champs.vitesse = select(reglages,"vitesse","VITESSE", options(15,120,5,function(n){ return n+" ms"; }));
    champs.glisse = select(reglages,"glisse","GLISSÉ", options(0,60,5,function(n){ return n+" ms"; }));

    var zoneImport = el("div","acc-import");
    var etat = el("p","acc-etat", m._accScala ? m._accScala.nom+" · "+m._accScala.degres.length+" degrés" : "AUCUN IMPORT · ÉGAL 12 UTILISÉ EN ATTENDANT");
    var importer = bouton(zoneImport,"IMPORTER UN FICHIER .SCL","acc-importer");
    var fichier = el("input",""); fichier.type="file"; fichier.id="acc-fichier-"+m.id; fichier.style.display="none";
    fichier.addEventListener("change", function(){
      var f = fichier.files && fichier.files[0]; fichier.value = "";
      if(!f || !valide()) return;
      var r = new FileReader();
      r.onload = function(){
        try{
          var info = m.accordage.importer(String(r.result));
          etat.textContent = info.nom + " · " + info.degres + " degrés · période " + info.periode.toFixed(1) + " ¢";
          modifier("gamme", 3); champs.gamme.value = 3;
        }catch(err){ etat.textContent = "IMPORT ÉCHOUÉ : " + err.message; }
      };
      r.onerror = function(){ etat.textContent = "LECTURE IMPOSSIBLE"; };
      r.readAsText(f, "utf-8");
    });
    importer.addEventListener("click", function(e){ e.stopPropagation(); fichier.click(); });
    zoneImport.appendChild(fichier); zoneImport.appendChild(etat);
    root.appendChild(zoneImport);

    function rafraichir(){
      if(!valide()) return;
      Object.keys(champs).forEach(function(k){ champs[k].value = m.p[k]; });
    }
    rafraichir();
    return {rafraichir:rafraichir, detruire:function(){}};
  }

  EUR_CAT.accordage = {nom:"ACCORDAGES ET ORNEMENTS", hp:232, sombre:false, fam:"seq",
    res:"Un arpège qui monte à travers les degrés d'une gamme personnalisée (tempéraments fixes ou fichier Scala .scl importé), avec appoggiature, mordant ou trille calculés sur l'accordage réel.",
    kns:kns, jacks:[["clk","CLK",0],["rst","RST",0],["cv","CV",1],["gate","GATE",1]],
    creer:creer, interface:interfaceModule,
    focusLabel:"UNE GAMME SUR MESURE, UN ARPÈGE, UN ORNEMENT", focusValeur:"ACCORDAGES"};
  EUR_ORDRE.push("accordage");

  return {analyserScala:analyserScala, GAMMES_FIXES:GAMMES_FIXES};
})();
