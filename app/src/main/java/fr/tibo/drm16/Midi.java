package fr.tibo.drm16;

import android.content.Context;
import android.content.pm.PackageManager;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Handler;
import android.os.Looper;

import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.concurrent.locks.LockSupport;

/**
 * Pont MIDI : passe par l'API MIDI d'Android (API 23), donc par la carte USB-C vers MIDI.
 * Rien n'est bloquant : si aucun appareil n'est branché, tout reste silencieux.
 */
public class Midi {

    public interface Ecoute {
        void message(int a, int b, int c);
        void sysex(String base64);
    }

    private final Context ctx;
    private final Ecoute ecoute;
    private final Handler ui = new Handler(Looper.getMainLooper());

    private MidiManager mm;
    private MidiDeviceInfo[] infos = new MidiDeviceInfo[0];
    private MidiDevice appareil;
    private MidiInputPort versAppareil;      // ce que nous écrivons
    private MidiOutputPort depuisAppareil;   // ce que nous lisons

    private Thread horloge;
    private volatile boolean horlogeActive;
    private volatile int generation = 0;
    private volatile double bpm = 120;

    /* état de l'analyse du flux entrant */
    private int statut = 0, attendu = 0, d1 = 0, recus = 0;
    private boolean enSysex = false;
    private final ByteArrayOutputStream tampon = new ByteArrayOutputStream();
    private static final int SYSEX_MAX = 262144;

    public Midi(Context c, Ecoute e) { ctx = c; ecoute = e; }

    public boolean dispo() {
        return ctx.getPackageManager().hasSystemFeature(PackageManager.FEATURE_MIDI);
    }

    public String liste() {
        if (!dispo()) return "";
        if (mm == null) mm = (MidiManager) ctx.getSystemService(Context.MIDI_SERVICE);
        if (mm == null) return "";
        infos = mm.getDevices();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < infos.length; i++) {
            if (i > 0) sb.append("\n");
            String n = infos[i].getProperties().getString(MidiDeviceInfo.PROPERTY_NAME);
            if (n == null) n = infos[i].getProperties().getString(MidiDeviceInfo.PROPERTY_PRODUCT);
            sb.append(n == null ? ("MIDI " + (i + 1)) : n);
        }
        return sb.toString();
    }

    public void ouvrir(final int idx) {
        if (mm == null || idx < 0 || idx >= infos.length) return;
        fermer();
        mm.openDevice(infos[idx], new MidiManager.OnDeviceOpenedListener() {
            @Override
            public void onDeviceOpened(MidiDevice device) {
                if (device == null) return;
                appareil = device;
                MidiDeviceInfo.PortInfo[] ports = device.getInfo().getPorts();
                for (MidiDeviceInfo.PortInfo p : ports) {
                    if (p.getType() == MidiDeviceInfo.PortInfo.TYPE_INPUT && versAppareil == null) {
                        versAppareil = device.openInputPort(p.getPortNumber());
                    } else if (p.getType() == MidiDeviceInfo.PortInfo.TYPE_OUTPUT && depuisAppareil == null) {
                        depuisAppareil = device.openOutputPort(p.getPortNumber());
                        if (depuisAppareil != null) depuisAppareil.connect(recepteur);
                    }
                }
            }
        }, ui);
    }

    public void fermer() {
        horlogeArret();
        try { if (depuisAppareil != null) { depuisAppareil.disconnect(recepteur); depuisAppareil.close(); } } catch (IOException ignored) {}
        try { if (versAppareil != null) versAppareil.close(); } catch (IOException ignored) {}
        try { if (appareil != null) appareil.close(); } catch (IOException ignored) {}
        depuisAppareil = null; versAppareil = null; appareil = null;
    }

    private final MidiReceiver recepteur = new MidiReceiver() {
        @Override
        public void onSend(byte[] msg, int offset, int count, long timestamp) {
            for (int i = offset; i < offset + count; i++) {
                int o = msg[i] & 0xFF;
                if (enSysex) {                   // un envoi exclusif est en cours
                    if (o == 0xF7) {
                        enSysex = false;
                        tampon.write(0xF7);
                        livrerSysex();
                    } else if (o >= 0xF8) {
                        livrer(o, 0, 0);         // les messages temps réel s'intercalent
                    } else if (tampon.size() < SYSEX_MAX) {
                        tampon.write(o);
                    }
                    continue;
                }
                if (o == 0xF0) {
                    enSysex = true;
                    tampon.reset();
                    tampon.write(0xF0);
                    statut = 0;
                    continue;
                }
                if (o >= 0xF8) {                 // temps réel : passe devant tout
                    livrer(o, 0, 0);
                } else if (o >= 0x80) {          // nouveau statut
                    statut = o; recus = 0;
                    int t = o & 0xF0;
                    attendu = (t == 0xC0 || t == 0xD0) ? 1 : 2;
                    if (o == 0xF1 || o == 0xF3) attendu = 1;
                    if (o == 0xF2) attendu = 2;
                    if (o >= 0xF4 && o <= 0xF7) { attendu = 0; livrer(o, 0, 0); statut = 0; }
                } else if (statut != 0) {        // octet de données
                    if (attendu == 1) { livrer(statut, o, 0); recus = 0; }
                    else if (recus == 0) { d1 = o; recus = 1; }
                    else { livrer(statut, d1, o); recus = 0; }
                }
            }
        }
    };

    private void livrerSysex() {
        final String b64 = Base64.encodeToString(tampon.toByteArray(), Base64.NO_WRAP);
        tampon.reset();
        ui.post(new Runnable() { @Override public void run() { ecoute.sysex(b64); } });
    }

    /** Envoi d'un message exclusif, découpé pour ne pas saturer le tampon du port. */
    public void envoyerSysex(byte[] m) {
        if (versAppareil == null || m == null) return;
        int pos = 0;
        try {
            while (pos < m.length) {
                int n = Math.min(240, m.length - pos);
                versAppareil.send(m, pos, n);
                pos += n;
            }
        } catch (IOException ignored) {}
    }

    private void livrer(final int a, final int b, final int c) {
        ui.post(new Runnable() { @Override public void run() { ecoute.message(a, b, c); } });
    }

    public void envoyer(int a, int b, int c) {
        if (versAppareil == null) return;
        int n = (a >= 0xF8) ? 1 : ((a & 0xF0) == 0xC0 || (a & 0xF0) == 0xD0 ? 2 : 3);
        byte[] m = new byte[n];
        m[0] = (byte) a;
        if (n > 1) m[1] = (byte) (b & 0x7F);
        if (n > 2) m[2] = (byte) (c & 0x7F);
        try { versAppareil.send(m, 0, n); } catch (IOException ignored) {}
    }

    public void tempo(double b) { if (b > 20 && b < 400) bpm = b; }

    /** Un seul fil peut vivre a la fois : chaque session porte son numero. */
    public void horlogeDepart(double b) {
        tempo(b);
        arreterFil();                       // s'il en restait un, on l'attend
        horlogeActive = true;
        final int mien = ++generation;
        envoyer(0xFA, 0, 0);
        horloge = new Thread(new Runnable() {
            @Override public void run() {
                long t = System.nanoTime();
                while (horlogeActive && mien == generation) {
                    envoyer(0xF8, 0, 0);
                    t += (long) (60000000000.0 / (bpm * 24));
                    long d = t - System.nanoTime();
                    if (d > 0) LockSupport.parkNanos(d);
                    else t = System.nanoTime();
                }
            }
        }, "midi-clock");
        horloge.setPriority(Thread.MAX_PRIORITY);
        horloge.start();
    }

    private void arreterFil() {
        horlogeActive = false;
        generation++;
        Thread t = horloge;
        horloge = null;
        if (t != null && t.isAlive()) {
            LockSupport.unpark(t);          // on le reveille au lieu d'attendre sa periode
            try { t.join(60); } catch (InterruptedException ignored) {}
        }
    }

    public void horlogeArret() {
        boolean tournait = horlogeActive;
        arreterFil();
        if (tournait) envoyer(0xFC, 0, 0);
    }
}
