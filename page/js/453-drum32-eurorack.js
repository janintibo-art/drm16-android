/* ================= DRUM 32 — v279 =================
   Quatre pistes de 32 pas. Les paramètres restent numériques dans m.p :
   rackCourant/poserRack, les huit emplacements et les projets les conservent
   sans nouveau format. Les 103 modules précédents ne changent pas de recette.
   Un pas vaut 0 (silence) ou 1 à 4 frappes, aux dates de l'horloge audio.
   Les répétitions utilisent l'intervalle CLK précédent (stepDur au premier
   CLK) ; un changement brusque d'horloge ne peut pas être prédit à l'avance. */
var EUR_DRUM32 = (function(){
  var lettres = ["a","b","c","d"], noms = ["A","B","C","D"];
  var exemples = ["10001000100010001000100010001000",
                  "00001000000010000000100000001234",
                  "01010101010101010101010101010101",
                  "00000010000000000000001000000020"];
  var kns = [];
  lettres.forEach(function(c, voie){
    kns.push([c+"len", noms[voie]+" LEN", 1,32,32],
             [c+"shift", noms[voie]+" ROT", 0,31,0],
             [c+"chance", noms[voie]+" CHANCE", 0,100,100],
             [c+"mute", noms[voie]+" MUTE", 0,1,0]);
    for(var i=1;i<=32;i++) kns.push([c+i,noms[voie]+" "+i,0,4,+exemples[voie].charAt(i-1)]);
  });
  function entier(v, min, max, def){
    return Number.isFinite(v) ? Math.max(min,Math.min(max,Math.round(v))) : def;
  }
  function normaliser(m){
    if(!m.p) m.p={};
    kns.forEach(function(k){ m.p[k[0]]=entier(m.p[k[0]],k[2],k[3],k[4]); });
  }
  function creer(m){
    normaliser(m);
    if(typeof EUR_VARIATIONS!=="undefined")EUR_VARIATIONS.initialiser(m);
    var ports={ta:eurConst(0),tb:eurConst(0),tc:eurConst(0),td:eurConst(0)};
    var etat=m.drum32={pos:[-1,-1,-1,-1], dernier:null, dates:[], entendu:null};
    function eteindre(t){
      Object.keys(ports).forEach(function(k){
        ports[k].offset.cancelScheduledValues(t); ports[k].offset.setValueAtTime(0,t);
      });
    }
    m.arreter=function(){
      var t=ctx ? maintenantAudio() : 0;
      eteindre(t); etat.pos=[-1,-1,-1,-1]; etat.dernier=null;
      if(typeof EUR_VARIATIONS!=="undefined")EUR_VARIATIONS.reset(m,t,true);
      etat.dates=[]; etat.entendu=null; reveiller();
    };
    m.recevoir=function(t, entree){
      if(!Number.isFinite(t) || t<0) return null;
      if(entree==="rst"){
        if(typeof EUR_VARIATIONS!=="undefined")EUR_VARIATIONS.reset(m,t,false);
        eteindre(t); etat.pos=[-1,-1,-1,-1]; etat.dernier=null;
        etat.dates=etat.dates.filter(function(e){return e.t<t;});
        if(!ctx || typeof ctx.startRendering!=="function") etat.dates.push({t:t,pos:[-1,-1,-1,-1],coups:[0,0,0,0]});
        reveiller(); return null;
      }
      if(entree!=="clk") return null;
      /* Une boucle de câblage ne doit pas faire avancer 900 pas au même instant. */
      if(etat.dernier!==null && t<=etat.dernier+0.0000001) return null;
      var intervalle=etat.dernier===null ? stepDur() : t-etat.dernier;
      intervalle=Math.max(.001,Math.min(60,intervalle)); etat.dernier=t;
      var phrase=typeof EUR_VARIATIONS!=="undefined"?EUR_VARIATIONS.debut(m,t):m.p;
      var sorties=[], positions=[], coups=[];
      lettres.forEach(function(c, v){
        var L=entier(m.p[c+"len"],1,32,32), decal=entier(m.p[c+"shift"],0,31,0)%L;
        etat.pos[v]=(etat.pos[v]+1)%L;
        var pas=(etat.pos[v]+decal)%L, n=entier(phrase[c+(pas+1)],0,4,0);
        var chance=entier(m.p[c+"chance"],0,100,100);
        if(m.p[c+"mute"]>=.5 || chance===0 || (n>0 && chance<100 && Math.random()*100>=chance)) n=0;
        positions.push(pas); coups.push(n);
        for(var j=0;j<n;j++){
          var date=t+j*intervalle/n;
          eurPorte(ports["t"+c],date,Math.min(.012,intervalle/n*.45));
          sorties.push(["t"+c,date]);
        }
      });
      /* Hors ligne : aucun historique graphique ne grossit avec le morceau. */
      if(!ctx || typeof ctx.startRendering!=="function"){
        etat.dates.push({t:t,pos:positions,coups:coups});
        if(etat.dates.length>128) etat.dates.splice(0,etat.dates.length-128);
        reveiller();
      }
      sorties.sort(function(a,b){return a[1]-b[1];});
      return sorties;
    };
    return {e:{clk:eurGain(1),rst:eurGain(1)},s:ports};
  }

  /* Un seul ordonnanceur graphique, uniquement lorsqu'une vue est visible.
     Les dates sont consommées à l'heure audio, jamais au moment du look-ahead. */
  var vues=[], raf=0;
  function visible(v){
    if(typeof document==="undefined" || document.hidden || !v.el.isConnected || EUR.mods.indexOf(v.m)<0) return false;
    if(document.body.classList.contains("menu-ouvert")) return false;
    if(v.grand) return v.el.closest("#eur-focus").classList.contains("show");
    return !panneauVisible() && v.el.getClientRects().length>0 &&
      (S.modele==="eur" || (typeof ENS!=="undefined" && ENS.actif));
  }
  function dessinerTemps(){
    raf=0;
    vues=vues.filter(function(v){return v.el.isConnected && EUR.mods.indexOf(v.m)>=0;});
    var maintenant=ctx ? maintenantAudio() : 0;
    var actifs=vues.filter(visible);
    actifs.forEach(function(v){
      var d=v.m.drum32;
      if(d) while(d.dates.length && d.dates[0].t<=maintenant) d.entendu=d.dates.shift();
      v.temps(S.run && ctx && ctx.state==="running" && d ? d.entendu : null);
    });
    if(actifs.length && S.run && ctx && ctx.state==="running") raf=requestAnimationFrame(dessinerTemps);
  }
  function reveiller(){
    if(typeof document==="undefined" || typeof requestAnimationFrame!=="function" || raf) return;
    /* Le contrôle visible inclut les overlays : aucun rAF au repos sous MENU. */
    if(vues.some(visible)) raf=requestAnimationFrame(dessinerTemps);
  }
  function rafraichir(m){
    vues=vues.filter(function(v){return v.el.isConnected && EUR.mods.indexOf(v.m)>=0;});
    vues.forEach(function(v){if(v.m===m) v.maj();}); reveiller();
  }
  function element(nom,classe,texte){
    var e=document.createElement(nom); if(classe) e.className=classe;
    if(texte!==undefined) e.textContent=texte; return e;
  }
  function bouton(parent,texte,fn,classe){
    var e=element("button",classe||"",texte);e.type="button";
    e.addEventListener("click",function(ev){ev.stopPropagation();fn();});parent.appendChild(e);return e;
  }
  function interfaceModule(parent,m,grand){
    var el=element("div","dr32"+(grand?" dr32-editeur":" dr32-mini"));
    el.dataset.module=m.id; parent.appendChild(el);
    var voie=entier(m.drum32Voie,0,3,0), page=0, outil=1;
    var lignes=[], cellules=[], selection={}, etatTexte;
    var variationUI=typeof EUR_VAR_UI!=="undefined"?EUR_VAR_UI.interface(el,m,grand):null;
    function lire(k){return typeof EUR_VARIATIONS!=="undefined"?EUR_VARIATIONS.lire(m,k):m.p[k];}
    function ecrire(k,v){if(typeof EUR_VARIATIONS!=="undefined")EUR_VARIATIONS.ecrire(m,k,v);else m.p[k]=v;}
    function valide(){return EUR.mods.indexOf(m)>=0;}
    function modifier(cle,val){
      if(!valide()) return;
      ecrire(cle,val); memEur(); rafraichir(m);
    }
    function choisir(v){voie=v;m.drum32Voie=v;maj();reveiller();}
    if(!grand){
      el.appendChild(element("p","dr32-intro","4 PISTES · 32 PAS · ROULEMENTS"));
      lettres.forEach(function(c,v){
        var b=bouton(el,"",function(){
          if(!valide()) return;m.drum32Voie=v;
          if(typeof EUR_FOCUS!=="undefined") EUR_FOCUS.ouvrir(m.id);
        },"dr32-resume");
        b.dataset.voie=v;
        var nom=element("span","dr32-nom",noms[v]), points=element("span","dr32-points");
        for(var i=0;i<32;i++) points.appendChild(element("i",""));
        b.appendChild(nom);b.appendChild(points);lignes.push(b);
      });
      etatTexte=element("p","dr32-etat","TOUCHEZ UNE PISTE POUR L'ÉDITER");el.appendChild(etatTexte);
    }else{
      var pistes=element("div","dr32-pistes");el.appendChild(pistes);
      lettres.forEach(function(c,v){
        var b=bouton(pistes,"PISTE "+noms[v],function(){choisir(v);},"dr32-piste");
        b.dataset.voie=v;lignes.push(b);
      });
      var navigation=element("div","dr32-pages");el.appendChild(navigation);
      [0,1].forEach(function(n){
        var b=bouton(navigation,n?"PAS 17–32":"PAS 1–16",function(){page=n;maj();reveiller();});
        b.dataset.page=n;
      });
      var cadre=element("div","dr32-reglages");el.appendChild(cadre);
      function select(cle,titre,valeurs,fn){
        var label=element("label",""),nom=element("span","",titre),s=element("select","");
        s.setAttribute("aria-label",titre);s.dataset.champ=cle;
        valeurs.forEach(function(x){var o=element("option","",x[1]);o.value=x[0];s.appendChild(o);});
        s.addEventListener("change",function(){if(valide()) fn(+s.value);});
        label.appendChild(nom);label.appendChild(s);cadre.appendChild(label);selection[cle]=s;
      }
      function plage(a,b,suffixe){var r=[];for(var i=a;i<=b;i++) r.push([i,i+(suffixe||"")]);return r;}
      select("len","LONGUEUR",plage(1,32," pas"),function(n){modifier(lettres[voie]+"len",n);});
      select("shift","DÉCALAGE",plage(0,31),function(n){modifier(lettres[voie]+"shift",n);});
      select("chance","PROBABILITÉ",plage(0,100," %"),function(n){modifier(lettres[voie]+"chance",n);});
      select("outil","FRAPPES PAR PAS",[[1,"1 coup"],[2,"×2"],[3,"×3"],[4,"×4"]],function(n){outil=n;maj();});
      var mute=bouton(el,"",function(){modifier(lettres[voie]+"mute",m.p[lettres[voie]+"mute"]?0:1);},"dr32-mute");
      var grille=element("div","dr32-grille");grille.setAttribute("aria-label","Seize pas de la page sélectionnée");el.insertBefore(grille,cadre);
      for(var n=0;n<16;n++) (function(i){
        var b=bouton(grille,"",function(){
          var cle=lettres[voie]+(page*16+i+1);
          modifier(cle,lire(cle)===outil?0:outil);H.cran();
        },"dr32-pas");
        b.appendChild(element("span","dr32-num"));b.appendChild(element("strong","dr32-coups"));cellules.push(b);
      })(n);
      etatTexte=element("p","dr32-etat");el.appendChild(etatTexte);
      var actions=element("div","dr32-actions");el.appendChild(actions);
      bouton(actions,"COPIER CETTE PAGE",function(){
        if(!valide()) return;
        var c=lettres[voie],de=page*16,vers=(1-page)*16;
        if(!window.confirm("Copier les pas "+(de+1)+"–"+(de+16)+" sur "+(vers+1)+"–"+(vers+16)+" de la piste "+noms[voie]+" ? Cette page sera remplacée.")) return;
        for(var i=1;i<=16;i++) ecrire(c+(vers+i),lire(c+(de+i)));memEur();rafraichir(m);
      },"dr32-copier");
      bouton(actions,"VIDER LA PISTE",function(){
        if(!valide() || !window.confirm("Effacer les 32 pas de la piste "+noms[voie]+" ? Les trois autres pistes sont conservées.")) return;
        for(var i=1;i<=32;i++) ecrire(lettres[voie]+i,0);memEur();rafraichir(m);
      },"dr32-vider");
      el.appendChild(element("p","dr32-aide","Choisissez 1 coup, ×2, ×3 ou ×4 puis touchez un pas. Un second appui identique l'efface. Les pas au-delà de LONGUEUR sont conservés mais ne jouent pas. CLK avance les quatre pistes ; RST les réaligne. La probabilité s'applique au pas entier, pas à chaque répétition."));
      el.addEventListener("click",function(e){e.stopPropagation();});
    }
    function maj(){
      if(!valide()) return;
      if(variationUI)variationUI.maj();
      if(!grand){
        lignes.forEach(function(b,v){
          var c=lettres[v], L=m.p[c+"len"];
          b.setAttribute("aria-label","Éditer la piste "+noms[v]+", "+L+" pas, probabilité "+m.p[c+"chance"]+" pour cent"+(m.p[c+"mute"]?", muette":""));
          b.classList.toggle("muette",!!m.p[c+"mute"]);
          b.querySelectorAll("i").forEach(function(p,i){
            p.classList.toggle("on",lire(c+(i+1))>0);p.classList.toggle("rafale",lire(c+(i+1))>1);p.classList.toggle("hors",i>=L);
          });
        });return;
      }
      lignes.forEach(function(b,v){b.setAttribute("aria-pressed",String(v===voie));b.classList.toggle("muette",!!m.p[lettres[v]+"mute"]);});
      el.querySelectorAll("[data-page]").forEach(function(b){b.setAttribute("aria-pressed",String(+b.dataset.page===page));});
      var c=lettres[voie];["len","shift","chance"].forEach(function(k){selection[k].value=m.p[c+k];});selection.outil.value=outil;
      var muet=!!m.p[c+"mute"], bMute=el.querySelector(".dr32-mute");
      bMute.textContent="PISTE "+noms[voie]+" : "+(muet?"MUETTE":"ACTIVE");bMute.setAttribute("aria-pressed",String(muet));
      cellules.forEach(function(b,i){
        var n=page*16+i+1, valeur=lire(c+n); b.dataset.pas=n;
        b.querySelector(".dr32-num").textContent=String(n).padStart(2,"0");
        b.querySelector(".dr32-coups").textContent=valeur?(valeur===1?"●":"×"+valeur):"—";
        b.setAttribute("aria-pressed",String(valeur>0));
        b.setAttribute("aria-label","Piste "+noms[voie]+", pas "+n+", "+(valeur?valeur+" frappe"+(valeur>1?"s":""):"silence")+(n>m.p[c+"len"]?", hors longueur":""));
        b.classList.toggle("hors",n>m.p[c+"len"]);b.classList.toggle("rafale",valeur>1);
      });
      temps(null);
    }
    function temps(d){
      if(!grand){
        lignes.forEach(function(b,v){b.querySelectorAll("i").forEach(function(p,i){p.classList.toggle("courant",!!d && d.pos[v]===i);});});
        return;
      }
      cellules.forEach(function(b){b.classList.toggle("courant",!!d && +b.dataset.pas===d.pos[voie]+1);});
      var texte="PISTE "+noms[voie]+" · "+m.p[lettres[voie]+"len"]+" PAS";
      if(m.p[lettres[voie]+"mute"]) texte+=" · MUETTE";
      else if(m.p[lettres[voie]+"chance"]===0) texte+=" · PROBABILITÉ 0 %";
      else if(d && d.pos[voie]>=0) texte+=" · PAS "+(d.pos[voie]+1)+(d.coups[voie]?" · "+d.coups[voie]+" COUP"+(d.coups[voie]>1?"S":""):" · SILENCE");
      else texte+=S.run?" · EN ATTENTE DE CLK":" · ÉDITION / ARRÊT";
      if(etatTexte.textContent!==texte) etatTexte.textContent=texte;
    }
    var vue={el:el,m:m,grand:grand,maj:maj,temps:temps};vues.push(vue);maj();reveiller();
    return {rafraichir:maj,detruire:function(){if(variationUI)variationUI.detruire();vues=vues.filter(function(v){return v!==vue;});}};
  }
  EUR_CAT.drum32={nom:"DRUM 32",hp:248,sombre:true,fam:"seq",
    res:"Quatre pistes programmables de 32 pas, cycles indépendants, probabilité et roulements ×2 à ×4",
    kns:kns,jacks:[["clk","CLK",0],["rst","RST",0],["ta","A",1],["tb","B",1],["tc","C",1],["td","D",1]],
    creer:creer,interface:interfaceModule};
  EUR_ORDRE.push("drum32");
  if(typeof document!=="undefined"){
    new MutationObserver(reveiller).observe(document.body,{attributes:true,attributeFilter:["class"]});
    new MutationObserver(reveiller).observe(document.getElementById("eur-play"),{attributes:true,attributeFilter:["class"]});
    document.addEventListener("visibilitychange",reveiller);
  }
  return {normaliser:normaliser,rafraichir:rafraichir,reveiller:reveiller};
})();
