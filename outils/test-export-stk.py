#!/usr/bin/env python3
"""v192 : rendre de vrais WAV de chaîne, vérifier le PCM et restaurer le jeu."""
import asyncio
from pathlib import Path
import runpy
from playwright.async_api import async_playwright

BASE = runpy.run_path(str(Path(__file__).with_name('test-export-midi.py')))

async def main():
    async with async_playwright() as p:
        nav = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        co = await nav.new_context(viewport={'width':360,'height':640})
        await co.add_init_script(BASE['PONT'])
        await BASE['servir'](co, Path(__file__).resolve().parents[1])
        pg = await co.new_page(); erreurs=[]
        pg.on('pageerror',lambda e:erreurs.append(str(e)))
        try:
            await pg.goto('http://drm16.localhost/drm16.html')
            await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=stk]').click()
            await pg.evaluate('''() => {
              audioInit();S.bpm=120;S.vol=.3;master.gain.value=.3;MIDI.in=true;MIDI.out=true;MIDI.ouvert=9;
              STK.chaine=[0,0,2];STK.cur=7;STK.chaineSel=2;STK.song=false;
              STK.motifs.forEach(m=>{m.last=4;m.pas.fill(0)});
              STK.motifs[0].pas[0]=1;STK.motifs[2].pas[1]=1;STK.motifs[2].notes[1][0]=12;
              for(let k=0;k<2;k++){
                let b=ctx.createBuffer(1,5292,44100),d=b.getChannelData(0);
                for(let i=0;i<d.length;i++)d[i]=.5*Math.sin(2*Math.PI*(k?880:220)*i/44100);
                let id='u-mix'+k;ES.buf[id]=b;__ech[id]=b64De(wavDe(b));
                Object.assign(STK.pistes[k],{type:'instrument',ech:id,niv:.5,tune:.5,dec:1,filt:1,pan:k?1:-1,muet:false,slice:false});
              }
              memStk();writeMem();majStk();
              window.__vrai={ctx:ctx,master:master,bus:SET.bus};
              window.__etat=()=>JSON.stringify({chaine:STK.chaine,cur:STK.cur,sel:STK.chaineSel,song:STK.song,pistes:STK.pistes,motifs:STK.motifs});
              window.__avant=__etat();
              window.__restaure=()=>ctx===__vrai.ctx&&master===__vrai.master&&SET.bus===__vrai.bus&&!WAVX.occupe&&!document.body.inert&&__avant===__etat();
            }''')
            # La sortie du premier WAV est testée à partir du vrai bouton.
            await pg.locator('#stk-export-chaine').click()
            await pg.wait_for_function('__exports.length===1 && !WAVX.occupe')
            resultat=await pg.evaluate('''() => {
              const bytes=__exports[0].octets,v=new DataView(bytes.buffer),sr=v.getUint32(24,true);
              let a=[[],[]];for(let i=44;i<bytes.length;i+=4){a[0].push(v.getInt16(i,true)/32768);a[1].push(v.getInt16(i+2,true)/32768);}
              const mesure=(t,ch)=>{let n=0,e=0;for(let i=Math.floor((t+.065)*sr);i<Math.floor((t+.10)*sr);i++){if(a[ch][i-1]<=0&&a[ch][i]>0)n++;e+=a[ch][i]**2;}return {hz:n/.035,rms:Math.sqrt(e/(.035*sr))};};
              return {duree:a[0].length/sr,sr:sr,canaux:v.getUint16(22,true),bits:v.getUint16(34,true),
                notes:[mesure(0,0),mesure(.5,0),mesure(1,1)],opposes:[mesure(0,1),mesure(.5,1),mesure(1,0)],
                restaure:__restaure(),midi:__sortiesMidi.filter(e=>(e[0]&240)===144).length};
            }''')
            assert resultat['sr']==44100 and resultat['canaux']==2 and resultat['bits']==16,resultat
            assert abs(resultat['duree']-1.8)<.001,resultat
            assert all(abs(x['hz']-hz)<45 and x['rms']>.001 for x,hz in zip(resultat['notes'],[220,220,1760])),resultat
            assert all(x['rms']<.0001 for x in resultat['opposes']),resultat
            assert resultat['restaure'] and resultat['midi']==0,resultat
            print('OK : WAV stéréo 44,1 kHz, répétitions, hauteur Instrument, panoramique et restauration',flush=True)
            await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/'stk-v192-360x640.png'))
            # Chargement à froid : un rendu doit attendre les vrais décodeurs.
            await pg.evaluate("delete ES.buf['u-mix0'];delete ES.buf['u-mix1']")
            await pg.evaluate('''async () => {
              let n=__exports.length,appel=exporterChaineStk();
              if(!WAVX.occupe||!document.body.inert)throw Error('interface non verrouillée');
              __midi(0xFA,0,0);__midi(0x90,36,127);
              if(S.run)throw Error('MIDI a relancé PLAY');
              await appel;if(__exports.length!==n+1||!__restaure())throw Error('chargement à froid');
            }''')
            print('OK : chargement à froid et entrée MIDI bloquée pendant le rendu',flush=True)
            # Erreur sample, rendu rejeté et écriture refusée doivent permettre un nouvel essai.
            await pg.evaluate('''async () => {
              let n=__exports.length,b=ES.buf['u-mix1'];delete ES.buf['u-mix1'];__ech['u-mix1']='';
              await exporterChaineStk();
              if(__exports.length!==n||!document.getElementById('signal').textContent.includes('u-mix1')||!__restaure())throw Error('sample manquant');
              ES.buf['u-mix1']=b;
              let rendre=OfflineAudioContext.prototype.startRendering;
              OfflineAudioContext.prototype.startRendering=function(){return Promise.reject(Error('panne simulée'));};
              try{await exporterChaineStk();}finally{OfflineAudioContext.prototype.startRendering=rendre;}
              if(__exports.length!==n||!__restaure())throw Error('rendu rejeté');
              let ecrire=DRM16.fichierSauver;DRM16.fichierSauver=function(){return '';};
              try{await exporterChaineStk();}finally{DRM16.fichierSauver=ecrire;}
              if(__exports.length!==n||!__restaure())throw Error('écriture refusée');
              await exporterChaineStk();if(__exports.length!==n+1||!__restaure())throw Error('relance');
            }''')
            print('OK : sample manquant, panne de rendu, écriture refusée et nouvel export réussi',flush=True)
            # Une longue voix basse sur le dernier pas ne doit pas être tronquée.
            await pg.evaluate('''async () => {
              STK.chaine=[2];STK.motifs[2].pas[1]=8;STK.motifs[2].notes[1][3]=-12;
              let b=ctx.createBuffer(1,88200,44100),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=.3*Math.sin(2*Math.PI*440*i/44100);
              ES.buf['u-mix1']=b;memStk();writeMem();window.__avant=__etat();
              await exporterChaineStk();let a=__exports[__exports.length-1].octets,v=new DataView(a.buffer);
              let sec=(a.length-44)/4/44100;
              if(Math.abs(sec-4.725)>.001||!__restaure())throw Error('queue tronquée '+sec);
              let pic=0;for(let i=Math.floor(3*44100);i<Math.floor(3.1*44100);i++)pic=Math.max(pic,Math.abs(v.getInt16(46+4*i,true)));
              if(pic<20)throw Error('queue silencieuse');
            }''')
            print('OK : longue queue transposée conservée et audible',flush=True)
            await pg.evaluate('''async () => {
              STK.pistes[1].slice=true;STK.motifs[2].tranches[1][3]=7;STK.motifs[2].notes[1][3]=12;
              memStk();writeMem();window.__avant=__etat();await exporterChaineStk();
              let a=__exports[__exports.length-1].octets,v=new DataView(a.buffer),n=0;
              for(let i=Math.floor(.46*44100);i<Math.floor(.51*44100);i++)if(v.getInt16(46+4*(i-1),true)<=0&&v.getInt16(46+4*i,true)>0)n++;
              if(Math.abs(n/.05-880)>30||!__restaure())throw Error('tranche Instrument');
              await ctx.resume();let an=ctx.createAnalyser();an.fftSize=2048;master.connect(an);
              voixStk(maintenantAudio()+.02,1,true,7,0);
              let d=new Float32Array(2048),pic=0;
              try{for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,20));an.getFloatTimeDomainData(d);for(let x of d)pic=Math.max(pic,Math.abs(x));}}
              finally{master.disconnect(an);an.disconnect();}
              if(pic<.001)throw Error('jeu live silencieux');
            }''')
            print('OK : tranche Instrument exportée à la bonne hauteur ; jeu live audible après les exports',flush=True)
            await pg.evaluate('''async () => {
              let n=__exports.length;STK.chaine=[];await exporterChaineStk();
              STK.chaine=[0,2];STK.motifs[2].last=8;await exporterChaineStk();STK.motifs[2].last=4;
              STK.chaine=Array(256).fill(0);STK.motifs[0].last=16;S.bpm=40;await exporterChaineStk();
              if(__exports.length!==n||WAVX.occupe||document.body.inert||!document.getElementById('signal').textContent.includes('TROP LONG'))throw Error('refus invalides');
            }''')
            assert not erreurs,erreurs
            print('OK : chaînes vides, invalides ou trop longues refusées ; aucune erreur JS',flush=True)
        finally:
            await co.close();await nav.close()

if __name__=='__main__': asyncio.run(main())
