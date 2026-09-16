/* ================= câblage ================= */
ticksFor(document.getElementById("k-volume"),11);
ticksFor(document.getElementById("k-tempo"),11);

var kVol = knob("k-volume",{value:S.vol,min:0,max:1,on:function(v){
  S.vol=v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
  say("VOLUME "+Math.round(v*100)); saveSoon();
}});
var taps = [];
var kTempo = knob("k-tempo",{value:S.bpm,min:40,max:220,
  on:function(v){ S.bpm=Math.round(v); say(S.bpm+" BPM"); saveSoon(); },
  tap:function(){
    var now = Date.now();
    if(taps.length && now - taps[taps.length-1] > 2200) taps = [];
    taps.push(now);
    if(taps.length > 5) taps.shift();
    if(taps.length < 2){ say("TAP"); return; }
    var sum = 0;
    for(var i=1;i<taps.length;i++) sum += taps[i] - taps[i-1];
    var bpm = Math.round(60000 / (sum/(taps.length-1)));
    if(bpm < 40 || bpm > 220){ say("TAP"); return; }
    S.bpm = bpm; kTempo.set(bpm); say(bpm + " BPM"); save();
  }
});
var ANG_L = [-135,-105,-75,-45];
var ANG_R = [45,75,105,135];
var ANG_T = [-45,-15,15,45];
var kDel = knob("k-delete",{value:0,steps:4,angles:ANG_L,on:function(v){ S.del=v; paint(); save(); }});
var kCol = knob("k-column",{value:0,steps:4,angles:ANG_T,on:function(v){ S.col=v; paint(); save(); }});
var kSty = knob("k-style",{value:0,steps:4,angles:ANG_R,on:function(v){ S.style=v; paint(); save(); }});

function marks(boxId, idx){
  var sp = document.getElementById(boxId).children;
  for(var i=0;i<sp.length;i++) sp[i].classList.toggle("on", i===idx);
}
var cells = document.querySelectorAll("td.cell");
function paint(){
  marks("opt-delete", S.del); marks("opt-style", S.style); marks("opt-column", S.col);
  for(var i=0;i<cells.length;i++){
    var c=cells[i];
    c.classList.toggle("on", +c.dataset.s===S.style && +c.dataset.c===S.col);
  }
}
for(var i=0;i<cells.length;i++){
  cells[i].addEventListener("click", function(){
    S.style = +this.dataset.s; S.col = +this.dataset.c;
    kSty.set(S.style); kCol.set(S.col); paint(); save(); H.cran();
  });
}

var unit = document.getElementById("unit");
var unitEm = document.getElementById("unit-em1");
var unitEr = document.getElementById("unit-er1");
var unitEa = document.getElementById("unit-ea1");
var unitEs = document.getElementById("unit-es1");
var unitMx = document.getElementById("unit-emx");
var unitSx = document.getElementById("unit-esx");
var actif = unit;
var swPower = document.getElementById("sw-power");
swPower.addEventListener("click", function(){
  S.power = !S.power;
  swPower.classList.toggle("on", S.power);
  led.classList.toggle("on", S.power);
  unit.classList.toggle("off", !S.power);
  H.inter();
  if(S.power) audioInit(); else stop();
});

/* interrupteur de droite : SPACE DRUM sur la 16, SELECTION sur la 32 */
var swRight = document.getElementById("sw-right");
swRight.addEventListener("click", function(){
  if(MODELE.modeDroite === "bank"){
    S.bank = S.bank ? 0 : 1;
    document.body.classList.toggle("bank-b", S.bank === 1);
    swRight.classList.toggle("on", S.bank === 1);
    say(S.bank ? "SELECTION B" : "SELECTION A");
  } else {
    S.space = !S.space;
    swRight.classList.toggle("on", S.space);
  }
  save(); H.inter();
});

var slotBass = document.getElementById("bass-out");
slotBass.addEventListener("click", function(){
  S.bass = !S.bass;
  slotBass.classList.toggle("on", S.bass);
  applyBass(); save(); H.inter();
  say(S.bass ? "BASS OUT" : "SORTIE MIXTE");
});

var odel = document.getElementById("opt-delete").children;
for(var t=0;t<odel.length;t++){
  (function(i){
    odel[i].addEventListener("click", function(){
      var voix = MODELE.frappe[i];
      if(!voix) return;
      if(!S.power){ say("POWER OFF"); return; }
      audioInit();
      V[voix](maintenantAudio() + 0.02, 1);
      H.cran();
      odel[i].classList.add("hit");
      setTimeout(function(){ odel[i].classList.remove("hit"); }, 150);
    });
  })(t);
}

var fsw = document.getElementById("fsw");
fsw.addEventListener("click", function(){
  if(!S.power){ say("POWER OFF"); return; }
  if(S.run){ stop(); H.stop(); } else { start(); H.start(); }
});

