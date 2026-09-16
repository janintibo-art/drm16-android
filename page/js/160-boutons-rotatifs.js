/* ================= boutons rotatifs ================= */
function ticksFor(el,n){
  var box = el.querySelector(".ticks");
  if(!box) return;
  for(var i=0;i<n;i++){
    var s=document.createElement("s");
    s.style.transform = "rotate("+(-140 + i*(280/(n-1)))+"deg)";
    box.appendChild(s);
  }
}
function knob(id, opt){
  var el = document.getElementById(id), pin = el.querySelector("i");
  var st = {v: opt.value, drag:false, moved:0, y0:0, v0:0};
  function angle(){
    if(opt.steps) return opt.angles[st.v];
    return -140 + 280*((st.v-opt.min)/(opt.max-opt.min));
  }
  function render(){ pin.style.transform = "translateY(0) rotate("+angle()+"deg)"; pin.style.transformOrigin="50% 143%"; }
  el.addEventListener("pointerdown", function(e){
    st.drag=true; st.moved=0; st.y0=e.clientY; st.v0=st.v;
    el.setPointerCapture(e.pointerId); e.preventDefault();
  });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    var d = st.y0 - e.clientY;
    st.moved = Math.max(st.moved, Math.abs(d));
    if(opt.steps){
      var nv = Math.round(st.v0 + d/46);
      nv = Math.max(0, Math.min(opt.steps-1, nv));
      if(nv!==st.v){ st.v=nv; render(); opt.on(st.v); H.cran(); }
    }else{
      var r = opt.max-opt.min;
      st.v = Math.max(opt.min, Math.min(opt.max, st.v0 + d/210*r));
      render(); opt.on(st.v);
    }
  });
  el.addEventListener("pointerup", function(e){
    if(!st.drag || PINCE) return;
    st.drag=false;
    if(st.moved < 6){
      if(opt.steps){ st.v = (st.v+1)%opt.steps; render(); opt.on(st.v); H.cran(); }
      else if(opt.tap){ opt.tap(); H.cran(); }
    }
  });
  el.addEventListener("pointercancel", function(){ st.drag=false; });
  /* molette (v146) */
  el.addEventListener("wheel", function(e){
    if(!e.deltaY || PINCE) return;
    e.preventDefault();
    var crans = -e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 100 : 1) / 100;
    if(opt.steps){
      st.acc = (st.acc || 0) + crans;
      var n = st.acc > 0 ? Math.floor(st.acc) : Math.ceil(st.acc);
      st.acc -= n;
      var nv = Math.max(0, Math.min(opt.steps - 1, st.v + n));
      if(nv !== st.v){ st.v = nv; render(); opt.on(st.v); H.cran(); }
    }else{
      var pas = (opt.max - opt.min) / (e.shiftKey ? 400 : 40);
      st.v = Math.max(opt.min, Math.min(opt.max, st.v + crans * pas));
      render(); opt.on(st.v);
    }
  }, {passive:false});
  render();
  return {set:function(v){ st.v=v; render(); }, get:function(){ return st.v; }};
}

