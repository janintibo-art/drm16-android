/* ================= pincement à deux doigts ================= */
var PINCE = false;
var ZOOM = {base:1, z:1, tx:0, ty:0, d0:0, z0:1, c0:null, t0:null,
            engage:false, dit:false, vus:{}};
function bornerZoom(){
  var u = actif, s = ZOOM.base * ZOOM.z;
  var deX = Math.max(0, (u.offsetWidth*s - window.innerWidth)/2 + 26);
  var deY = Math.max(0, (u.offsetHeight*s - window.innerHeight)/2 + 26);
  ZOOM.tx = Math.max(-deX, Math.min(deX, ZOOM.tx));
  ZOOM.ty = Math.max(-deY, Math.min(deY, ZOOM.ty));
}
function appliquerZoom(){
  var u = actif;
  if(!u) return;
  var s = ZOOM.base * ZOOM.z;
  u.style.transformOrigin = "center center";
  u.style.transform = "translate("+Math.round(ZOOM.tx)+"px,"+Math.round(ZOOM.ty)+"px) scale("+s.toFixed(4)+")";
}
function zoomRaz(){ ZOOM.z = 1; ZOOM.tx = 0; ZOOM.ty = 0; appliquerZoom(); }
/* une commande, ou du fond de façade ? le fond sert à déplacer */
function estCommande(t){
  if(!t || !t.closest) return false;
  /* .eur-kn et .eur-bkn : depuis que la poignée du potard est le bloc entier,
     l'étiquette sous le bouton doit compter comme une commande. Sans elle, la
     toucher déplacerait la façade au lieu de tourner le potard. */
  return !!t.closest("button,input,.knob,.bt,.em-dial,.toggle,.jack,.slot,.fsw,td,.mx-ruban,u,.pick," +
                     ".kn,.mx-kn,.sx-kn,.mpc-kn,.arcm-kn,.t1k-kn,.dbi-kn,.tr8-kn,.td3-kn,.cr-kn,.vlc-kn,.stk-kn,.mc-kn," +
                     ".eur-kn,.eur-bkn");
}
(function pincement(){
  var pts = {}, glisse = null, dernierTap = 0, tapX = 0, tapY = 0;
  function paire(){
    var ids = Object.keys(pts);
    if(ids.length < 2) return null;
    return [pts[ids[0]], pts[ids[1]]];
  }
  document.addEventListener("pointerdown", function(e){
    pts[e.pointerId] = {x:e.clientX, y:e.clientY};
    /* un doigt sur le fond, façade agrandie : on déplace */
    if(Object.keys(pts).length === 1 && ZOOM.z > 1.02 && !estCommande(e.target)){
      glisse = {id:e.pointerId, x0:e.clientX, y0:e.clientY, tx0:ZOOM.tx, ty0:ZOOM.ty, bouge:false};
    }
    /* deux appuis brefs sur le fond : retour à plat */
    if(!estCommande(e.target)){
      var t = Date.now();
      if(t - dernierTap < 320 && Math.abs(e.clientX-tapX) < 34 && Math.abs(e.clientY-tapY) < 34){
        dernierTap = 0; glisse = null;
        if(ZOOM.z > 1.02){ zoomRaz(); signal("ZOOM REMIS À PLAT"); }
      } else { dernierTap = t; tapX = e.clientX; tapY = e.clientY; }
    }
    var p = paire();
    if(p){
      glisse = null;
      PINCE = true;
      ZOOM.d0 = Math.max(1, Math.hypot(p[1].x-p[0].x, p[1].y-p[0].y));
      ZOOM.z0 = ZOOM.z;
      ZOOM.engage = false;          /* chaque nouveau geste repart en déplacement */
      ZOOM.vus = {};
      ZOOM.c0 = {x:(p[0].x+p[1].x)/2, y:(p[0].y+p[1].y)/2};
      ZOOM.t0 = {x:ZOOM.tx, y:ZOOM.ty};
    }
  }, true);
  document.addEventListener("pointermove", function(e){
    if(!pts[e.pointerId]) return;
    pts[e.pointerId] = {x:e.clientX, y:e.clientY};
    if(glisse && e.pointerId === glisse.id && !paire()){
      ZOOM.tx = glisse.tx0 + (e.clientX - glisse.x0);
      ZOOM.ty = glisse.ty0 + (e.clientY - glisse.y0);
      glisse.bouge = true;
      bornerZoom(); appliquerZoom();
      e.preventDefault();
      return;
    }
    var p = paire();
    if(!p || !ZOOM.d0) return;
    var d = Math.max(1, Math.hypot(p[1].x-p[0].x, p[1].y-p[0].y));
    var c = {x:(p[0].x+p[1].x)/2, y:(p[0].y+p[1].y)/2};
    /* Zone morte sur l'écartement. Deux doigts déplaçaient déjà la façade,
       mais le moindre écart involontaire changeait aussi le zoom : impossible
       de faire glisser de droite à gauche sans tout redimensionner.

       Piège : les deux doigts ne bougent JAMAIS dans le même événement. À
       chaque message, un seul point est à jour et l'autre est resté en
       arrière, si bien que l'écartement mesuré oscille au rythme du geste —
       vingt pixels de glissement suffisaient à simuler dix pour cent de
       pincement. On n'évalue donc le zoom QUE lorsque les deux doigts ont
       bougé depuis la dernière évaluation ; entre-temps, on se contente de
       déplacer. */
    ZOOM.vus[e.pointerId] = 1;
    var deuxVus = Object.keys(ZOOM.vus).length >= 2;
    var rapport = d / ZOOM.d0;
    if(!ZOOM.engage && deuxVus && Math.abs(rapport - 1) > 0.09){
      ZOOM.engage = true;
      ZOOM.d0 = d; ZOOM.z0 = ZOOM.z; rapport = 1;
    }
    if(deuxVus) ZOOM.vus = {};
    if(ZOOM.engage && deuxVus){
      /* On peut descendre sous 1 : certains modules de l'Eurorack sont trop
         hauts pour l'écran. Le plancher à 0,45 garde les étiquettes lisibles. */
      ZOOM.z = Math.max(0.45, Math.min(4, ZOOM.z0 * rapport));
    }
    ZOOM.tx = ZOOM.t0.x + (c.x - ZOOM.c0.x);
    ZOOM.ty = ZOOM.t0.y + (c.y - ZOOM.c0.y);
    /* on ne se recale sur 1 qu'en passant tout près, sinon rétrécir serait
       impossible : le geste retomberait aussitôt à 1. Et pas pendant un simple
       déplacement, qui remettrait la façade au centre en plein geste. */
    if(ZOOM.engage && ZOOM.z > 0.97 && ZOOM.z < 1.04){ ZOOM.z = 1; ZOOM.tx = 0; ZOOM.ty = 0; }
    else if(!ZOOM.dit){ ZOOM.dit = true; signal("DEUX DOIGTS POUR DÉPLACER · DEUX APPUIS POUR REVENIR"); }
    bornerZoom(); appliquerZoom();
    e.preventDefault();
  }, true);
  function fin(e){
    delete pts[e.pointerId];
    if(glisse && e.pointerId === glisse.id) glisse = null;
    if(Object.keys(pts).length < 2){
      ZOOM.d0 = 0;
      setTimeout(function(){ PINCE = false; }, 90);
    }
  }
  document.addEventListener("pointerup", fin, true);
  document.addEventListener("pointercancel", fin, true);
})();
window.addEventListener("resize", fit);
window.addEventListener("orientationchange", function(){ setTimeout(fit,350); });

