/* v287 : édition HARMONIE 8, sans toucher aux CV avant le prochain événement. */
(function interfaceHarmonie(){
  "use strict";
  var H=EUR_HARMONIE8;
  function el(tag,cl,txt){var e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=txt;return e;}
  function bouton(p,txt,fn,cl){var b=el("button",cl,txt);b.type="button";b.addEventListener("click",function(e){e.stopPropagation();fn();});p.appendChild(b);return b;}
  function interfaceModule(parent,m,grand){
    var root=el("div","hr8 "+(grand?"hr8-grand":"hr8-mini")),selection=m._hrEdit||0,cellules=[],champs={};parent.appendChild(root);
    root.dataset.module=m.id;
    function valide(){return EUR.mods.indexOf(m)>=0;}
    function modifier(k,v){if(!valide())return;m.p[k]=v;memEur();H.rafraichir(m);}
    function choix(a,b,fn){var l=[];for(var i=a;i<=b;i++)l.push([i,fn?fn(i):String(i)]);return l;}
    function select(p,k,nom,l,fn){var lab=el("label",""),s=el("select","");lab.appendChild(el("span","",nom));s.dataset.champ=k;s.setAttribute("aria-label",nom);
      l.forEach(function(x){var o=el("option","",x[1]);o.value=x[0];s.appendChild(o);});
      s.addEventListener("change",function(){if(valide())fn(+s.value);});lab.appendChild(s);p.appendChild(lab);champs[k]=s;}
    root.appendChild(el("p","hr8-intro","ACCORDS · NAPPE · TRANSPOSITION"));
    var grille=el("div","hr8-grille");root.appendChild(grille);
    for(var i=0;i<8;i++)(function(i){
      var b=bouton(grille,"",function(){if(!valide())return;selection=i;m._hrEdit=i;
        if(!grand&&typeof EUR_FOCUS!=="undefined")EUR_FOCUS.ouvrir(m.id);else{maj();H.reveiller();}},"hr8-case");
      b.dataset.accord=i;b.appendChild(el("span","hr8-num",String(i+1)));b.appendChild(el("strong","hr8-nom"));b.appendChild(el("small","hr8-bars"));cellules.push(b);
    })(i);
    var etat=el("p","hr8-etat");root.appendChild(etat);
    if(grand){
      root.appendChild(el("h3","hr8-titre"));
      var det=el("div","hr8-detail");root.appendChild(det);
      select(det,"root","FONDAMENTALE ÉCRITE",choix(24,60,H.nomNote),function(n){modifier("root"+(selection+1),n);});
      select(det,"type","TYPE D'ACCORD",H.types.map(function(t,i){return [i,t[0]];}),function(n){modifier("type"+(selection+1),n);});
      select(det,"inv","RENVERSEMENT",[[0,"POSITION DE BASE"],[1,"PREMIER"],[2,"DEUXIÈME"],[3,"TROISIÈME"]],function(n){modifier("inv"+(selection+1),n);});
      select(det,"bars","DURÉE EN MODE MESURES",choix(1,16,function(n){return n+" mesure"+(n>1?"s":"");}),function(n){modifier("bars"+(selection+1),n);});
      root.appendChild(el("output","hr8-notes"));
      var global=el("div","hr8-global");root.appendChild(global);
      select(global,"sync","SUIVI DE L'ENTRÉE",[[0,"MESURES · 16 CLK / MESURE"],[1,"SCÈNES · 1 ACCORD / IMPULSION"]],function(n){modifier("sync",n);});
      select(global,"len","ACCORDS DANS LA BOUCLE",choix(1,8),function(n){modifier("len",n);});
      select(global,"ref","RÉFÉRENCE DES MÉLO 32",choix(24,60,H.nomNote),function(n){modifier("ref",n);});
      select(global,"trans","TRANSPOSITION GLOBALE",choix(-12,12,function(n){return (n>0?"+":"")+n+" demi-tons";}),function(n){modifier("trans",n);});
      select(global,"oct","OCTAVE DES QUATRE VOIX",choix(0,2,function(n){return "+"+n+" octave"+(n>1?"s":"");}),function(n){modifier("oct",n);});
      select(global,"glide","GLISSÉ DES QUATRE VOIX",choix(0,250,function(n){return n+" ms";}),function(n){modifier("glide",n);});
      bouton(root,"",function(){modifier("hold",m.p.hold?0:1);},"hr8-hold");
      bouton(root,"COPIER VERS L'ACCORD SUIVANT",function(){if(!valide())return;var a=selection+1,b=a%8+1;
        if(!window.confirm("Remplacer l'accord "+b+" par l'accord "+a+" ? Les autres accords restent intacts."))return;
        ["root","type","inv","bars"].forEach(function(k){m.p[k+b]=m.p[k+a];});memEur();H.rafraichir(m);},"hr8-copier");
      root.appendChild(el("p","hr8-aide","Choisir une case l'édite : la lecture ne saute pas. MESURES attend 16 CLK par mesure ; SCÈNES attend la sortie SCÈNE de SCÈNES 8 et ignore les durées locales. Dans les exemples, chaque scène avance d'un accord. TENIR garde l'accord pendant les impulsions ; relâcher reprend au prochain changement. Modifier le mode recommence au premier accord à la prochaine impulsion. RST et STOP réarment le début en conservant la dernière hauteur, pour ne pas transposer les queues de son."));
      root.appendChild(el("p","hr8-aide","VOIX 1–4 : CV de quatre notes vers quatre VCO. FOND : fondamentale sans renversement. TRANS : intervalle depuis RÉFÉRENCE ; additionnez-le au CV de MÉLO 32 avec un MIX 4, A et B à 1. Ce n'est PAS une correction des notes à la gamme : une note étrangère à l'accord le reste. Les exemples emploient fondamentales, quintes et octaves. Le glissé et le renversement ne concernent que les quatre voix de nappe ; TRANS change franchement, y compris sur une note encore tenue. Les chiffres supposent un VCO à 55 Hz pour 0 V."));
    }
    function maj(){
      if(!valide())return;
      cellules.forEach(function(b,i){var a=H.accord(m.p,i),nom=H.nomNote(a.fond)+" "+H.types[a.type][1];
        b.querySelector(".hr8-nom").textContent=nom;b.querySelector(".hr8-bars").textContent=m.p.sync?"1 SCÈNE":a.bars+" MES.";
        b.classList.toggle("hors",i>=m.p.len);b.setAttribute("aria-pressed",String(grand&&i===selection));b.setAttribute("aria-label","Accord "+(i+1)+" : "+nom+(i>=m.p.len?", hors boucle":""));
      });
      if(grand){
        var n=selection+1,a=H.accord(m.p,selection);root.querySelector(".hr8-titre").textContent="ÉDITER L'ACCORD "+n+(n>m.p.len?" · HORS BOUCLE":"");
        ["root","type","inv","bars"].forEach(function(k){champs[k].value=m.p[k+n];});
        ["sync","len","ref","trans","oct","glide"].forEach(function(k){champs[k].value=m.p[k];});
        champs.bars.disabled=!!m.p.sync;
        root.querySelector(".hr8-notes").textContent="VOIX 1–4 : "+a.notes.map(H.nomNote).join(" · ")+" | TRANS : "+(a.shift*12)+" demi-tons";
        var hold=root.querySelector(".hr8-hold");hold.textContent=m.p.hold?"TENIR ACTIVÉ · RELÂCHER":"TENIR L'ACCORD";hold.setAttribute("aria-pressed",String(!!m.p.hold));
      }
      temps(null);
    }
    function temps(e){
      cellules.forEach(function(b,i){b.classList.toggle("courant",!!e&&e.pos===i);});
      var texte=(m.p.sync?m.p.len+" ACCORDS · SUIVI SCÈNES":H.longueur(m)+" MESURES · BOUCLE");
      if(e&&e.pos>=0&&e.accord)texte="LECTURE "+(e.pos+1)+" · "+H.nomNote(e.accord.fond)+" "+H.types[e.accord.type][1]+(e.mode?" · SCÈNES":" · MESURE "+(Math.floor(e.pas/16)+1)+"/"+e.accord.bars)+(e.hold?" · TENIR":"");
      else texte+=S.run?" · ATTENTE IMPULSION":" · ARRÊT";
      if(etat.textContent!==texte)etat.textContent=texte;
    }
    var detruire=H.vue({el:root,m:m,grand:grand,maj:maj,temps:temps});maj();return {rafraichir:maj,detruire:detruire};
  }
  EUR_CAT.harmonie8.interface=interfaceModule;
  EUR_CAT.harmonie8.focusLabel="CHOISISSEZ UN ACCORD";
  EUR_CAT.harmonie8.focusValeur="8 ACCORDS";
})();
