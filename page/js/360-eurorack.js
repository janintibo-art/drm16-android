/* ===================== EURORACK =====================
   Un modèle tout différent des vingt-quatre machines : ici rien n'est câblé
   d'avance. On pose des modules dans un rack et on les relie.

   Convention de tension : une unité vaut un volt vaut une octave. Les entrées
   de hauteur sont branchées sur le désaccord de l'oscillateur, en cents, ce
   qui donne la réponse exponentielle du 1 V/octave sans calcul.
   Tout circule en signal audio, y compris les commandes.

   Les portes se propagent de proche en proche : un module qui reçoit une porte
   peut en émettre à son tour, ce qui permet d'enchaîner horloge, diviseur,
   générateur euclidien et séquenceur. */
var EUR = {mods:[], cables:[], sel:-1, attente:null, prochain:1, famille:"", noeuds:[],
           bus:null, sources:null, cur:0, nom:"", montFam:""};
var EUR_RACKS = 8;

function eurGain(v){ var g = ctx.createGain(); g.gain.value = v; return g; }
function eurConst(v){
  var c = ctx.createConstantSource();
  c.offset.value = v;
  c.start();
  return c;
}
function eurPorte(p, t, duree){
  p.offset.cancelScheduledValues(t);
  p.offset.setValueAtTime(1, t);
  p.offset.setValueAtTime(0, t + (duree || 0.012));
}
function eurBruit(){
  var b = ctx.createBufferSource();
  b.buffer = noiseBuf; b.loop = true; b.start();
  return b;
}
function eurCourbe(f){
  var n = 1024, c = new Float32Array(n);
  for(var i=0;i<n;i++) c[i] = f(i * 2 / n - 1);
  return c;
}
/* ---------- fabriques communes ----------
   Beaucoup de modules ne diffèrent que par trois valeurs. Les écrire un par un
   serait quarante fois la même chose avec une faute de frappe quelque part. */
function eurFiltre(nom, type, res, deuxPoles){
  return {nom:nom, hp:64, sombre:false, res:res, fam:"filtre",
    kns:[["cut","FREQ",0,1,0.5],["q","Q",0,1,0.3],["mod","CV AMT",0,1,0.5]],
    jacks:[["in","IN",0],["cv","CV",0],["out","OUT",1]],
    creer:function(m){
      var f1 = ctx.createBiquadFilter(); f1.type = type;
      var f2 = deuxPoles ? ctx.createBiquadFilter() : null;
      if(f2) f2.type = type;
      var cv = eurGain(0);
      cv.connect(f1.detune);
      if(f2){ cv.connect(f2.detune); f1.connect(f2); }
      m.maj = function(){
        var f = 60 * Math.pow(260, m.p.cut);
        f1.frequency.value = f;
        f1.Q.value = 0.4 + m.p.q * 14;
        if(f2){ f2.frequency.value = f; f2.Q.value = 0.5; }
        cv.gain.value = m.p.mod * 2400;
      };
      m.maj();
      return {e:{in:f1, cv:cv}, s:{out:f2 || f1}};
    }};
}
function eurPerc(nom, res, recette){
  return {nom:nom, hp:60, sombre:true, res:res, fam:"perc",
    kns:[["tune","TUNE",0,1,0.4],["dec","DECAY",0,1,0.4],["niv","LEVEL",0,1,0.7]],
    jacks:[["trig","TRIG",0],["out","OUT",1]],
    creer:function(m){
      var out = eurGain(1);
      var entree = eurGain(1);
      m.recevoir = function(t){ recette(m, out, t); return null; };
      return {e:{trig:entree}, s:{out:out}};
    }};
}
function eurEffet(nom, hp, res, kns, bati){
  return {nom:nom, hp:hp, sombre:true, res:res, fam:"effet", kns:kns,
    jacks:[["in","IN",0],["out","OUT",1]],
    creer:function(m){
      var e = eurGain(1), out = eurGain(1);
      bati(m, e, out);
      return {e:{in:e}, s:{out:out}};
    }};
}
/* Un cycle de synchronisation dure, rendu une fois pour toutes.
   La synchronisation dure n'existe pas en Web Audio : aucun oscillateur ne
   permet de remettre sa phase à zéro sur commande. Mais une onde synchronisée
   est PÉRIODIQUE — elle se répète à la fréquence du maître —, donc on peut
   dessiner un seul de ses cycles dans un tampon et le lire en boucle. C'est
   exact, pas une approximation, et ça ne coûte qu'un lecteur de tampon. */
var SYNC_BUFS = {};
function bufSyncEur(rapport){
  var cle = Math.round(rapport * 20) / 20;      /* par crans de 0,05 */
  if(SYNC_BUFS[cle] && SYNC_BUFS[cle].sr === ctx.sampleRate) return SYNC_BUFS[cle].b;
  var n = Math.max(64, Math.round(ctx.sampleRate / 55));   /* un cycle à 55 Hz */
  var b = ctx.createBuffer(1, n, ctx.sampleRate);
  var d = b.getChannelData(0);
  /* Une dent de scie dessinée bêtement replie tout son spectre : ses
     harmoniques montent à l'infini et reviennent en bas sous forme de
     sifflements inharmoniques, d'autant plus que le tampon est lu vite.
     La correction ci-dessous arrondit les deux échantillons qui entourent
     chaque rupture — c'est le minimum pour que la synchronisation reste
     mordante sans devenir sale. */
  var dt = cle / n;
  function lisser(t){
    if(t < dt){ t /= dt; return t + t - t * t - 1; }
    if(t > 1 - dt){ t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
  }
  for(var i=0;i<n;i++){
    /* la dent de scie de l'esclave, remise à zéro à chaque tour du maître */
    var ph = (i / n) * cle, fr = ph - Math.floor(ph);
    d[i] = 2 * fr - 1 - lisser(fr);
  }
  SYNC_BUFS[cle] = {b:b, sr:ctx.sampleRate};
  return b;
}

var EUR_CAT = {

