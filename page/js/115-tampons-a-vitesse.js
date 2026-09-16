/* ================= échantillons joués vite (v155, phase B7) =================
   Un échantillon lu r fois plus vite voit toutes ses fréquences multipliées
   par r. Ce qui dépasse alors la moitié de la cadence de sortie se replie en
   sifflements. L'API ne filtre rien avant de lire : il faut lui donner un
   tampon déjà débarrassé de ces aigus.

   poserTampon(src, buf, vitesseMax) choisit la bonne version du tampon :
   - vitesse sans risque : le tampon tel quel ;
   - au-delà : une version passée dans un passe-bas (douze niveaux, quatre par
     octave, jusqu'à trois octaves), calculée une fois et gardée.
   Un niveau pas encore prêt est calculé DANS UNE TÂCHE À PART : la frappe en
   cours part avec le tampon d'origine, les suivantes avec le bon. Aucune pause
   pendant l'ordonnancement.
   Les tampons de plus de 12 s ne sont pas traités (calcul trop long) ; un
   rendu hors ligne attend, lui, le bon niveau (il n'a pas de contrainte de temps). */
var MIPMAPS = new WeakMap();
var MIPMAP_MAX_S = 12;

function niveauPourVitesse(buf, vitesse){
  var sortie = ctx ? ctx.sampleRate : 44100;
  /* seuil : le contenu du tampon monte jusqu'à buf.sampleRate/2 ; lu à la
     vitesse r, il monte à r·buf.sampleRate/2, qui doit rester sous sortie/2 */
  if(!(vitesse * buf.sampleRate > sortie * 1.001)) return 0;
  /* niveau k : coupure à 0,45·buf.sampleRate / 2^(k/4) — quatre niveaux par
     octave, pour ne pas assourdir une vitesse à peine trop haute ; il faut que
     la coupure reste sous sortie / (2·vitesse), la plus haute fréquence qui ne
     se replie pas */
  var k = Math.ceil(4 * Math.log(0.9 * vitesse * buf.sampleRate / sortie) / Math.LN2 - 1e-9);
  return Math.max(1, Math.min(12, k));
}

/* Passe-bas à phase nulle (sinus cardinal fenêtré de Blackman), même longueur,
   même cadence : seule la bande utile reste. Le calcul avance par tranches
   (tranche(n) traite au plus n échantillons) : en tâche de fond, il rend la
   main toutes les ~10 ms pour ne jamais retarder l'ordonnanceur. */
function passeBasEnCours(buf, niveau){
  var fc = 0.45 / Math.pow(2, niveau / 4);             /* fraction de la cadence */
  var taps = Math.min(489, 2 * Math.round(0.5 * 5.5 / (0.2 * fc)) + 1);
  var m = (taps - 1) / 2, h = new Float32Array(taps), s = 0, i;
  for(i=0;i<taps;i++){
    var x = i - m;
    var sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
    var w = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (taps - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (taps - 1));
    h[i] = sinc * w; s += h[i];
  }
  for(i=0;i<taps;i++) h[i] /= s;
  var sortie = new AudioBuffer({length:buf.length, numberOfChannels:buf.numberOfChannels, sampleRate:buf.sampleRate});
  var c = 0, j = 0, n = buf.length;
  return {
    sortie: sortie,
    /* rend vrai quand tout est calculé */
    tranche: function(combien){
      var fin = j + combien;
      while(c < buf.numberOfChannels){
        var e = buf.getChannelData(c), o = sortie.getChannelData(c);
        for(; j < n && j < fin; j++){
          var acc = h[m] * e[j];
          for(var k=1;k<=m;k++){
            var a = j - k, b = j + k;
            acc += h[m + k] * ((a >= 0 ? e[a] : 0) + (b < n ? e[b] : 0));
          }
          o[j] = acc;
        }
        if(j < n) return false;
        c++; j = 0; fin = combien;
      }
      return true;
    }
  };
}
function passeBasTampon(buf, niveau){
  var t = passeBasEnCours(buf, niveau);
  t.tranche(Infinity);
  return t.sortie;
}

function tamponNiveau(buf, niveau, attendre){
  if(!niveau || !buf || buf.duration > MIPMAP_MAX_S) return buf;
  var l = MIPMAPS.get(buf);
  if(!l){ l = []; MIPMAPS.set(buf, l); }
  if(l[niveau] && l[niveau] !== "calcul") return l[niveau];
  if(attendre){ l[niveau] = passeBasTampon(buf, niveau); return l[niveau]; }
  if(!l[niveau]){
    l[niveau] = "calcul";
    var travail;
    try{ travail = passeBasEnCours(buf, niveau); }catch(e){ l[niveau] = null; return buf; }
    var pas = 4096;
    (function suite(){
      var t0 = performance.now();
      try{
        while(performance.now() - t0 < 10){
          if(travail.tranche(pas)){ l[niveau] = travail.sortie; return; }
        }
      }catch(e){ l[niveau] = null; return; }
      setTimeout(suite, 0);
    })();
  }
  return buf;
}

function poserTampon(src, buf, vitesseMax){
  var niveau = niveauPourVitesse(buf, vitesseMax);
  src.buffer = niveau ? tamponNiveau(buf, niveau, !!(ctx && ctx.startRendering)) : buf;
}
