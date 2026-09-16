/* ================= filtres ================= */
acid: {nom:"ACID", hp:68, res:"Le filtre de la 303 : coupure, résonance, accent", fam:"filtre",
  kns:[["cut","CUTOFF",0,1,0.2],["q","RESO",0,1,0.7],["env","ENV MOD",0,1,0.6],["dec","DECAY",0,1,0.3]],
  jacks:[["in","IN",0],["trig","TRIG",0],["acc","ACC",0],["out","OUT",1]],
  creer:function(m){
    /* Sur une 303 le filtre, son enveloppe et l'accent ne sont pas trois
       modules mais un seul circuit : l'accent ouvre le filtre PLUS fort et
       PLUS longtemps, et pousse la résonance au passage. C'est ce couplage qui
       fait le son, et c'est pour ça qu'on ne le retrouve pas en câblant une
       enveloppe ordinaire sur un VCF ordinaire. */
    var e = eurGain(1), f = [], out = eurGain(1), prec = e;
    for(var i=0;i<4;i++){
      var b = ctx.createBiquadFilter();
      b.type = "lowpass";
      b.frequency.value = 400;
      b.Q.value = (i === 3) ? 8 : 0.6;
      prec.connect(b); prec = b; f.push(b);
    }
    prec.connect(out);
    m.accent = false;
    m.recevoir = function(t, entree){
      if(entree === "acc"){ m.accent = true; return null; }
      if(entree !== "trig") return null;
      var a = m.accent; m.accent = false;
      var bas = 60 + m.p.cut * 1400;
      var haut = bas + (m.p.env * (a ? 6500 : 3800)) + 120;
      var d = (0.06 + m.p.dec * 0.7) * (a ? 1.5 : 1);
      f.forEach(function(b, i){
        b.frequency.cancelScheduledValues(t);
        b.frequency.setValueAtTime(Math.min(15000, haut), t);
        b.frequency.exponentialRampToValueAtTime(Math.max(40, bas), t + d);
        if(i === 3){
          b.Q.cancelScheduledValues(t);
          b.Q.setValueAtTime(2 + m.p.q * (a ? 22 : 16), t);
        }
      });
      return null;
    };
    return {e:{in:e, trig:eurGain(1), acc:eurGain(1)}, s:{out:out}};
  }},

vcf: eurFiltre("VCF", "lowpass", "Passe-bas résonant à quatre pôles", true),
hpf: eurFiltre("HPF", "highpass", "Passe-haut résonant", true),
bpf: eurFiltre("BPF", "bandpass", "Passe-bande", false),
notch: eurFiltre("NOTCH", "notch", "Réjecteur de bande", false),
peak: eurFiltre("PEAK", "peaking", "Cloche accentuée", false),

lpg: {nom:"LPG", hp:56, res:"Porte passe-bas : le timbre s'éteint avec le volume", fam:"filtre",
  kns:[["dec","DECAY",0,1,0.35],["ton","TONE",0,1,0.55],["niv","LEVEL",0,1,0.8]],
  jacks:[["in","IN",0],["trig","TRIG",0],["out","OUT",1]],
  creer:function(m){
    /* L'invention de Buchla, restée rare en Eurorack. Un filtre et un ampli
       commandés ensemble par une même chute : le son ne se contente pas de
       baisser, il s'assombrit en même temps — comme tout ce qui résonne dans
       le monde réel. Une impulsion suffit à transformer n'importe quelle
       source continue en note pincée. */
    var e = eurGain(1), lp = ctx.createBiquadFilter(), g = eurGain(0.0001);
    lp.type = "lowpass"; lp.Q.value = 0.8;
    lp.frequency.value = 300;
    e.connect(lp); lp.connect(g);
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var d = 0.05 + m.p.dec * 1.4;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(m.p.niv, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      lp.frequency.cancelScheduledValues(t);
      lp.frequency.setValueAtTime(280 + m.p.ton * 9000, t);
      lp.frequency.exponentialRampToValueAtTime(160, t + d * 0.85);
      return null;
    };
    return {e:{in:e, trig:eurGain(1)}, s:{out:g}};
  }},

reson: {nom:"RESONATE", hp:60, res:"Trois résonateurs accordés, frappés par l'entrée", fam:"filtre",
  kns:[["q","DECAY",0,1,0.6],["str","STRUCT",0,1,0.4],["mix","MIX",0,1,0.7]],
  jacks:[["in","IN",0],["voct","V/OCT",0],["out","OUT",1]],
  creer:function(m){
    /* Frappez-les avec un bruit bref et ils chantent : c'est le principe du
       corps d'un instrument, qui ne produit rien mais résonne de ce qu'on lui
       donne. STRUCT écarte les trois résonances — serrées, c'est une corde ;
       écartées, c'est une cloche.

       L'entrée de hauteur passe par le désaccord des filtres, en cents : on
       retrouve le volt par octave sans le moindre calcul. */
    var e = eurGain(1), som = eurGain(0.34), sec = eurGain(0), cv = eurGain(1200);
    var f = [];
    for(var i=0;i<3;i++){
      var b = ctx.createBiquadFilter();
      b.type = "bandpass";
      e.connect(b); b.connect(som);
      cv.connect(b.detune);
      f.push(b);
    }
    e.connect(sec);
    var out = eurGain(1);
    som.connect(out); sec.connect(out);
    m.maj = function(){
      var base = 110 * Math.pow(2, m.p.str * 0.2);
      var ecart = 1.2 + m.p.str * 2.4;
      [1, ecart, ecart * ecart].forEach(function(r, i){
        f[i].frequency.value = Math.min(12000, base * r);
        f[i].Q.value = 3 + m.p.q * 140;
      });
      som.gain.value = 0.34 * m.p.mix;
      sec.gain.value = 1 - m.p.mix;
    };
    m.maj();
    return {e:{in:e, voct:cv}, s:{out:out}};
  }},

svf: {nom:"SVF", hp:64, res:"Trois sorties simultanées", fam:"filtre",
  kns:[["cut","FREQ",0,1,0.5],["q","Q",0,1,0.4],["mod","CV AMT",0,1,0.5]],
  jacks:[["in","IN",0],["cv","CV",0],["lp","LP",1],["bp","BP",1],["hp","HP",1]],
  creer:function(m){
    var lp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter();
    lp.type = "lowpass"; bp.type = "bandpass"; hp.type = "highpass";
    var e = eurGain(1), cv = eurGain(0);
    [lp,bp,hp].forEach(function(f){ e.connect(f); cv.connect(f.detune); });
    m.maj = function(){
      var f = 60 * Math.pow(260, m.p.cut);
      [lp,bp,hp].forEach(function(x){ x.frequency.value = f; x.Q.value = 0.4 + m.p.q * 12; });
      cv.gain.value = m.p.mod * 2400;
    };
    m.maj();
    return {e:{in:e, cv:cv}, s:{lp:lp, bp:bp, hp:hp}};
  }},

comb: {nom:"COMB", hp:56, sombre:true, res:"Filtre en peigne", fam:"filtre",
  kns:[["f","FREQ",0,1,0.4],["fb","FEED",0,1,0.6]],
  jacks:[["in","IN",0],["out","OUT",1]],
  creer:function(m){
    var e = eurGain(1), d = ctx.createDelay(0.05), fb = eurGain(0), out = eurGain(1);
    e.connect(out); e.connect(d); d.connect(fb); fb.connect(d); d.connect(out);
    m.maj = function(){
      d.delayTime.value = 0.0004 + (1 - m.p.f) * 0.02;
      fb.gain.value = m.p.fb * 0.92;
    };
    m.maj();
    return {e:{in:e}, s:{out:out}};
  }},

formant: {nom:"FORMANT", hp:56, res:"Filtre à voyelles", fam:"filtre",
  kns:[["v","VOWEL",0,1,0],["q","Q",0,1,0.5]],
  jacks:[["in","IN",0],["out","OUT",1]],
  creer:function(m){
    var e = eurGain(1), out = eurGain(0.6);
    var f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter();
    f1.type = "bandpass"; f2.type = "bandpass";
    e.connect(f1); e.connect(f2); f1.connect(out); f2.connect(out);
    var voyelles = [[730,1090],[530,1840],[390,1990],[570,840],[300,870]];
    m.maj = function(){
      var v = voyelles[Math.min(4, Math.round(m.p.v * 4))];
      f1.frequency.value = v[0]; f2.frequency.value = v[1];
      f1.Q.value = 3 + m.p.q * 16; f2.Q.value = 3 + m.p.q * 16;
    };
    m.maj();
    return {e:{in:e}, s:{out:out}};
  }},

