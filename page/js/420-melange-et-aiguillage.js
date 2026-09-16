/* ================= mélange et aiguillage ================= */
mix4: {nom:"MIX 4", hp:72, res:"Quatre entrées, une sortie", fam:"util",
  kns:[["a","A",0,1,0.7],["b","B",0,1,0],["c","C",0,1,0],["d","D",0,1,0]],
  jacks:[["a","A",0],["b","B",0],["c","C",0],["d","D",0],["out","OUT",1]],
  creer:function(m){
    var out = eurGain(1), g = {};
    ["a","b","c","d"].forEach(function(k){ g[k] = eurGain(0); g[k].connect(out); });
    m.maj = function(){ ["a","b","c","d"].forEach(function(k){ g[k].gain.value = m.p[k]; }); };
    m.maj();
    return {e:g, s:{out:out}};
  }},

mult: {nom:"MULT", hp:40, res:"Une entrée, quatre sorties", fam:"util",
  kns:[],
  jacks:[["in","IN",0],["o1","1",1],["o2","2",1],["o3","3",1],["o4","4",1]],
  creer:function(m){
    var e = eurGain(1);
    return {e:{in:e}, s:{o1:e, o2:e, o3:e, o4:e}};
  }},

xfade: {nom:"XFADE", hp:56, res:"Fondu entre deux sources", fam:"util",
  kns:[["x","BLEND",0,1,0.5]],
  jacks:[["a","A",0],["b","B",0],["cv","CV",0],["out","OUT",1]],
  creer:function(m){
    var ga = eurGain(0.5), gb = eurGain(0.5), out = eurGain(1), cv = eurGain(0.5);
    ga.connect(out); gb.connect(out);
    cv.connect(gb.gain);
    m.maj = function(){ ga.gain.value = 1 - m.p.x; gb.gain.value = m.p.x; };
    m.maj();
    return {e:{a:ga, b:gb, cv:cv}, s:{out:out}};
  }},

pan: {nom:"PAN", hp:48, res:"Place dans le champ stéréo", fam:"util",
  kns:[["p","PAN",-1,1,0]],
  jacks:[["in","IN",0],["cv","CV",0],["out","OUT",1]],
  creer:function(m){
    var e = eurGain(1);
    var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var cv = eurGain(1);
    if(p){ e.connect(p); cv.connect(p.pan); }
    m.maj = function(){ if(p) p.pan.value = m.p.p; };
    m.maj();
    return {e:{in:e, cv:cv}, s:{out:p || e}};
  }},

switch4: {nom:"SWITCH", hp:56, sombre:true, res:"Aiguille vers quatre sorties", fam:"util",
  kns:[],
  jacks:[["in","IN",0],["clk","CLK",0],["rst","RST",0],["o1","1",1],["o2","2",1],["o3","3",1],["o4","4",1]],
  creer:function(m){
    var e = eurGain(1), g = [];
    for(var i=0;i<4;i++){ g.push(eurGain(i === 0 ? 1 : 0)); e.connect(g[i]); }
    m.pos = 0;
    m.recevoir = function(t, entree){
      if(entree === "rst"){ m.pos = 0;
        for(var z=0;z<4;z++) g[z].gain.setTargetAtTime(z === 0 ? 1 : 0, t, 0.004);
        return null; }
      if(entree !== "clk") return null;
      m.pos = (m.pos + 1) % 4;
      for(var i=0;i<4;i++) g[i].gain.setTargetAtTime(i === m.pos ? 1 : 0, t, 0.004);
      return null;
    };
    return {e:{in:e, clk:eurGain(1), rst:eurGain(1)}, s:{o1:g[0], o2:g[1], o3:g[2], o4:g[3]}};
  }},

