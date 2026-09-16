/* ================= traitement du son =================
   Chaîne reprise de MOC'TA BASS (janintibo-art), transposée en traitement
   hors ligne. Deux règles de son auteur, gardées telles quelles :
   la saturation passe AVANT la mise à niveau, sinon elle déplace le niveau
   qu'on vient de caler ; et le gain supplémentaire DÉPLACE LA CIBLE au lieu
   de s'ajouter après, sinon le limiteur le reprend aussitôt. */
var TRAITE_PRESETS = {
  doux:  {dc:true, hp:40,  trim:true, fade_in:1, fade_out:4, lufs:-18, plafond:-0.3},
  punch: {dc:true, hp:55,  trim:true, porte:{seuil:-45, maintien:40, chute:60},
          transient:{attaque:3, maintien:-1}, compress:{seuil:-20, ratio:3},
          lufs:-13, plafond:-0.3, fade_in:0.5, fade_out:3},
  max:   {dc:true, hp:60,  trim:true, porte:{seuil:-42, maintien:30, chute:50},
          transient:{attaque:4, maintien:0}, compress:{seuil:-24, ratio:4},
          sat:{drive:1.6, mix:0.35}, lufs:-9, plafond:-0.2, fade_in:0.4, fade_out:2},
  loop:  {dc:true, hp:35,  trim:false, xfade:15, lufs:-14, plafond:-0.3},
  sub:   {dc:true, hp:20,  trim:true, compress:{seuil:-18, ratio:2.5},
          lufs:-12, plafond:-0.3, fade_in:2, fade_out:6},
  voix:  {dc:true, hp:90,  trim:true, porte:{seuil:-48, maintien:60, chute:90},
          compress:{seuil:-22, ratio:3.5}, lufs:-16, plafond:-0.5, fade_in:2, fade_out:8}
};
var TRAITE_NOMS = ["aucun","doux","punch","max","loop","sub","voix"];

function dbLin(db){ return Math.pow(10, db / 20); }
function linDb(x){ return 20 * Math.log10(Math.max(1e-9, x)); }

function trDc(d){
  var s = 0, i;
  for(i=0;i<d.length;i++) s += d[i];
  var m = s / Math.max(1, d.length);
  for(i=0;i<d.length;i++) d[i] -= m;
  return m;
}
/* passe-haut à deux pôles, appliqué en place */
function trPasseHaut(d, rate, f){
  var w = 2 * Math.PI * f / rate, q = 0.707;
  var a = Math.sin(w) / (2 * q), c = Math.cos(w);
  var a0 = 1 + a, b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, b2 = b0;
  var a1 = -2 * c / a0, a2 = (1 - a) / a0;
  var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for(var i=0;i<d.length;i++){
    var x = d[i];
    var y = b0*x + b1*x1 + b2*x2 - a1*y1 - a2*y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    d[i] = y;
  }
}
function trCoupeSilence(d, rate, seuilDb, padMs){
  var s = dbLin(seuilDb === undefined ? -55 : seuilDb);
  var deb = 0, fin = d.length - 1;
  while(deb < d.length && Math.abs(d[deb]) < s) deb++;
  while(fin > deb && Math.abs(d[fin]) < s) fin--;
  if(deb >= fin) return d;
  var pad = Math.round((padMs === undefined ? 3 : padMs) * rate / 1000);
  deb = Math.max(0, deb - pad);
  fin = Math.min(d.length - 1, fin + pad);
  return d.subarray(deb, fin + 1);
}
function trPorte(d, rate, o){
  var seuil = dbLin(o.seuil), att = (o.attaque || 2) * rate / 1000;
  var maint = (o.maintien || 40) * rate / 1000, chute = (o.chute || 60) * rate / 1000;
  var g = 0, restant = 0;
  for(var i=0;i<d.length;i++){
    var a = Math.abs(d[i]);
    if(a > seuil){ restant = maint; g = Math.min(1, g + 1/att); }
    else if(restant > 0){ restant--; g = Math.min(1, g + 1/att); }
    else g = Math.max(0, g - 1/chute);
    d[i] *= g;
  }
}
/* accentue l'attaque sans toucher au volume général */
function trTransitoire(d, rate, o){
  var ga = dbLin(o.attaque || 0), gs = dbLin(o.maintien || 0);
  var rapide = 0, lent = 0;
  var ca = Math.exp(-1 / (0.002 * rate)), cl = Math.exp(-1 / (0.08 * rate));
  for(var i=0;i<d.length;i++){
    var a = Math.abs(d[i]);
    rapide = a > rapide ? a : rapide * ca + a * (1 - ca);
    lent = lent * cl + a * (1 - cl);
    var diff = rapide - lent;
    var g = diff > 0 ? (1 + (ga - 1) * Math.min(1, diff * 6)) : gs;
    d[i] *= g;
  }
}
function trCompresser(d, rate, o){
  var seuil = dbLin(o.seuil), ratio = o.ratio || 3;
  var att = Math.exp(-1 / ((o.attaque || 5) / 1000 * rate));
  var rel = Math.exp(-1 / ((o.release || 80) / 1000 * rate));
  var env = 0;
  for(var i=0;i<d.length;i++){
    var a = Math.abs(d[i]);
    env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
    var g = 1;
    if(env > seuil) g = (seuil + (env - seuil) / ratio) / env;
    d[i] *= g;
  }
}
function trSaturer(d, o){
  var drive = o.drive || 1.5, mix = o.mix === undefined ? 0.4 : o.mix;
  for(var i=0;i<d.length;i++){
    var x = d[i];
    d[i] = x * (1 - mix) + Math.tanh(x * drive) / Math.tanh(drive) * mix;
  }
}
function trCrete(d){
  var p = 0;
  for(var i=0;i<d.length;i++){ var a = Math.abs(d[i]); if(a > p) p = a; }
  return p;
}
/* sonie approchée, pondération K : passe-haut puis plateau aigu */
function trLufs(d, rate){
  var c = new Float32Array(d);
  trPasseHaut(c, rate, 38);
  var w = 2 * Math.PI * 1500 / rate, A = Math.pow(10, 4 / 40);
  var al = Math.sin(w) / 2 * Math.sqrt(2);
  var cw = Math.cos(w), sq = 2 * Math.sqrt(A) * al;
  var a0 = (A+1) - (A-1)*cw + sq;
  var b0 = A*((A+1) + (A-1)*cw + sq) / a0;
  var b1 = -2*A*((A-1) + (A+1)*cw) / a0;
  var b2 = A*((A+1) + (A-1)*cw - sq) / a0;
  var a1 = 2*((A-1) - (A+1)*cw) / a0;
  var a2 = ((A+1) - (A-1)*cw - sq) / a0;
  var x1=0,x2=0,y1=0,y2=0, som=0;
  for(var i=0;i<c.length;i++){
    var x = c[i];
    var y = b0*x + b1*x1 + b2*x2 - a1*y1 - a2*y2;
    x2=x1; x1=x; y2=y1; y1=y;
    som += y*y;
  }
  var ms = som / Math.max(1, c.length);
  return -0.691 + 10 * Math.log10(Math.max(1e-12, ms));
}
function trViserLufs(d, rate, cible, maxGain){
  var l = trLufs(d, rate);
  var g = Math.min(maxGain === undefined ? 30 : maxGain, cible - l);
  var lin = dbLin(g);
  for(var i=0;i<d.length;i++) d[i] *= lin;
  return g;
}
function trFondu(d, rate, inMs, outMs){
  var a = Math.round((inMs || 0) * rate / 1000), b = Math.round((outMs || 0) * rate / 1000);
  var i;
  for(i=0;i<a && i<d.length;i++) d[i] *= i / a;
  for(i=0;i<b && i<d.length;i++) d[d.length-1-i] *= i / b;
}
/* limiteur avec anticipation : on regarde devant pour ne jamais dépasser */
function trLimiteur(d, rate, plafondDb, lookMs){
  var plafond = dbLin(plafondDb === undefined ? -0.3 : plafondDb);
  var look = Math.max(1, Math.round((lookMs === undefined ? 1.5 : lookMs) * rate / 1000));
  var rel = Math.exp(-1 / (0.03 * rate));
  var g = 1, n = d.length;
  var sortie = new Float32Array(n);
  for(var i=0;i<n;i++){
    var pic = 0;
    for(var j=i;j<Math.min(n, i+look);j++){ var a = Math.abs(d[j]); if(a > pic) pic = a; }
    var voulu = pic > plafond ? plafond / pic : 1;
    g = voulu < g ? voulu : g * rel + voulu * (1 - rel);
    sortie[i] = d[Math.max(0, i - (look >> 1))] * g;
  }
  return sortie;
}
function trRaccordBoucle(d, rate, ms){
  var n = Math.round(ms * rate / 1000);
  if(n * 2 >= d.length) return d;
  var out = new Float32Array(d.length - n);
  out.set(d.subarray(0, out.length));
  for(var i=0;i<n;i++){
    var f = i / n;
    out[out.length - n + i] = out[out.length - n + i] * (1 - f) + d[d.length - n + i] * f;
  }
  return out;
}
/* chaîne complète : renvoie {buffer, rapport} */
function traiterSon(buf, preset, gainSup){
  if(!preset || preset === "aucun" || !TRAITE_PRESETS[preset]) return {buffer:buf, rapport:null};
  var cfg = TRAITE_PRESETS[preset], rate = buf.sampleRate;
  var d = new Float32Array(buf.getChannelData(0));
  var avant = {lufs:+trLufs(d, rate).toFixed(2), crete:+linDb(trCrete(d)).toFixed(2), duree:buf.duration};

  if(cfg.dc) trDc(d);
  if(cfg.hp) trPasseHaut(d, rate, cfg.hp);
  if(cfg.trim) d = new Float32Array(trCoupeSilence(d, rate));
  if(cfg.porte) trPorte(d, rate, cfg.porte);
  if(cfg.transient) trTransitoire(d, rate, cfg.transient);
  if(cfg.compress) trCompresser(d, rate, cfg.compress);
  if(cfg.sat){
    var p = trCrete(d);
    if(p > 0){ var k = dbLin(-6) / p; for(var i=0;i<d.length;i++) d[i] *= k; }
    trSaturer(d, cfg.sat);
  }
  var gagne = 0;
  if(cfg.lufs !== undefined) gagne = trViserLufs(d, rate, cfg.lufs + (gainSup || 0));
  if(cfg.xfade){ d = trRaccordBoucle(d, rate, cfg.xfade); trFondu(d, rate, 0.3, 0.3); }
  else trFondu(d, rate, cfg.fade_in, cfg.fade_out);
  d = trLimiteur(d, rate, cfg.plafond);

  var out = ctx.createBuffer(1, d.length, rate);
  out.getChannelData(0).set(d);
  var apres = {lufs:+trLufs(d, rate).toFixed(2), crete:+linDb(trCrete(d)).toFixed(2), duree:d.length/rate};
  return {buffer:out, rapport:{preset:preset, avant:avant, apres:apres,
          gain:+(apres.lufs - avant.lufs).toFixed(2)}};
}

/* ---------- taux d'échantillonnage conseillé ---------- */
function trTauxConseille(buf, seuilDb){
  var rate = buf.sampleRate, d = buf.getChannelData(0);
  var seuil = seuilDb === undefined ? -28 : seuilDb;
  var total = 0, i;
  for(i=0;i<d.length;i++) total += d[i]*d[i];
  total = Math.sqrt(total / Math.max(1, d.length));
  if(total < 1e-5) return rate;
  var taux = [rate, 22050, 16000, 11025, 8000].filter(function(t){ return t <= rate; });
  var garde = rate;
  for(var k=1;k<taux.length;k++){
    var c = new Float32Array(d);
    trPasseHaut(c, rate, taux[k] * 0.45);      /* ce qu'on perdrait en descendant */
    var e = 0;
    for(i=0;i<c.length;i++) e += c[i]*c[i];
    e = Math.sqrt(e / Math.max(1, c.length));
    if(linDb(e / total) < seuil) garde = taux[k]; else break;
  }
  return garde;
}
function reechantillonner(buf, taux){
  if(taux >= buf.sampleRate) return buf;
  var d = buf.getChannelData(0), n = Math.max(1, Math.round(d.length * taux / buf.sampleRate));
  var out = ctx.createBuffer(1, n, taux), o = out.getChannelData(0);
  var pas = d.length / n;
  for(var i=0;i<n;i++){
    var p = i * pas, i0 = Math.floor(p), f = p - i0;
    o[i] = d[i0] * (1 - f) + (d[Math.min(d.length-1, i0+1)] || 0) * f;
  }
  return out;
}

