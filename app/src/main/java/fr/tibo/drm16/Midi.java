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

import org.json.JSONObject;

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
        /** Branchement, debranchement, ouverture : l'etat complet en JSON (v131). */
        void etat(String json);
    }

    private final Context ctx;
    private final Ecoute ecoute;
    private final Handler ui = new Handler(Looper.getMainLooper());

    private MidiManager mm;
    private MidiDeviceInfo[] infos = new MidiDeviceInfo[0];
    private MidiDevice appareil;
    private MidiInputPort versAppareil;      // ce que nous écrivons
    private MidiOutputPort depuisAppareil;   // ce que nous lisons
    private int generationOuverture;
    /* v131 : suivi des branchements. ouvertId est l'identifiant Android de
       l'appareil REELLEMENT ouvert (-1 sinon) : la page ne le suppose plus. */
    private MidiManager.DeviceCallback surveillant;
    private int ouvertId = -1;

    private Thread horloge;
    private volatile boolean horlogeActive;
    private volatile int generation = 0;
    private volatile double bpm = 120;

    /* état de l'analyse du flux entrant */
    private int statut = 0, attendu = 0, d1 = 0, recus = 0;
    private boolean enSysex = false;
    private boolean sysexTropLong = false;
    private final ByteArrayOutputStream tampon = new ByteArrayOutputStream();
    private static final int SYSEX_MAX = 262144;

    public Midi(Context c, Ecoute e) { ctx = c; ecoute = e; }

    public boolean dispo() {
        return ctx.getPackageManager().hasSystemFeature(PackageManager.FEATURE_MIDI);
    }

    private boolean gestionnaire() {
        if (mm == null && dispo()) mm = (MidiManager) ctx.getSystemService(Context.MIDI_SERVICE);
        return mm != null;
    }

    private MidiDeviceInfo[] relire() {
        MidiDeviceInfo[] l = null;
        try { l = mm.getDevices(); } catch (Exception ignored) {}
        infos = (l == null) ? new MidiDeviceInfo[0] : l;
        return infos;
    }

    private static String nom(MidiDeviceInfo d, int i) {
        String n = null;
        try {
            n = d.getProperties().getString(MidiDeviceInfo.PROPERTY_NAME);
            if (n == null) n = d.getProperties().getString(MidiDeviceInfo.PROPERTY_PRODUCT);
        } catch (Exception ignored) {}
        return n == null ? ("MIDI " + (i + 1)) : n;
    }

    public String liste() {
        if (!gestionnaire()) return "";
        MidiDeviceInfo[] l = relire();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < l.length; i++) {
            if (i > 0) sb.append("\n");
            sb.append(nom(l[i], i));
        }
        return sb.toString();
    }

    /** Suivi des branchements (v131). La liste de la page se met a jour seule,
        et l'appareil ouvert qui disparait est ferme proprement. */
    public void surveiller() {
        if (surveillant != null || !gestionnaire()) return;
        surveillant = new MidiManager.DeviceCallback() {
            @Override public void onDeviceAdded(MidiDeviceInfo d) {
                signaler("ajout", d == null ? "" : nom(d, 0));
            }
            @Override public void onDeviceRemoved(MidiDeviceInfo d) {
                if (d != null && d.getId() == ouvertId) {
                    fermer();
                    signaler("perdu", nom(d, 0));
                } else {
                    signaler("retrait", d == null ? "" : nom(d, 0));
                }
            }
        };
        try { mm.registerDeviceCallback(surveillant, ui); }
        catch (Exception e) { surveillant = null; }
    }

    /** A appeler une seule fois, quand l'activite disparait. */
    public void liberer() {
        fermer();
        if (surveillant != null && mm != null) {
            try { mm.unregisterDeviceCallback(surveillant); } catch (Exception ignored) {}
        }
        surveillant = null;
    }

    /** L'etat complet, envoye a la page : evenement, liste a jour, appareil ouvert. */
    private void signaler(String evt, String quoi) {
        if (!gestionnaire()) return;
        MidiDeviceInfo[] l = relire();
        StringBuilder sb = new StringBuilder();
        sb.append("{\"evt\":").append(JSONObject.quote(evt))
          .append(",\"nom\":").append(JSONObject.quote(quoi == null ? "" : quoi))
          .append(",\"ouvert\":").append(ouvertId)
          .append(",\"appareils\":[");
        for (int i = 0; i < l.length; i++) {
            if (i > 0) sb.append(",");
            sb.append("{\"nom\":").append(JSONObject.quote(nom(l[i], i)))
              .append(",\"id\":").append(l[i].getId()).append("}");
        }
        sb.append("]}");
        ecoute.etat(sb.toString());
    }

    /** Liste avec identifiants, une ligne par appareil : nom TAB id. */
    public String appareils() {
        if (!gestionnaire()) return "";
        MidiDeviceInfo[] l = relire();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < l.length; i++) {
            if (i > 0) sb.append("\n");
            sb.append(nom(l[i], i).replace('\t', ' ').replace('\n', ' ')).append('\t').append(l[i].getId());
        }
        return sb.toString();
    }

    public int ouvertId() { return ouvertId; }

    /** Ouvre par identifiant : insensible a un changement d'ordre de la liste. */
    public void ouvrirId(int id) {
        if (!gestionnaire()) return;
        for (MidiDeviceInfo d : relire()) {
            if (d.getId() == id) { ouvrirInfo(d); return; }
        }
        signaler("echec", "");
    }

    public void ouvrir(final int idx) {
        if (!gestionnaire()) return;
        if (idx < 0 || idx >= infos.length) relire();
        if (idx < 0 || idx >= infos.length) return;
        ouvrirInfo(infos[idx]);
    }

    private void ouvrirInfo(final MidiDeviceInfo info) {
        fermer();
        final int session = ++generationOuverture;
        final String sonNom = nom(info, 0);
        mm.openDevice(info, new MidiManager.OnDeviceOpenedListener() {
            @Override
            public void onDeviceOpened(MidiDevice device) {
                if (session != generationOuverture) {
                    if (device != null) { try { device.close(); } catch (IOException ignored) {} }
                    return;
                }
                if (device == null) { signaler("echec", sonNom); return; }
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
                /* Un appareil peut etre ouvert alors que tous ses ports sont
                   occupes ou indisponibles. Ne pas allumer le temoin dans ce
                   cas : il n'existe encore aucune liaison utilisable. */
                if (versAppareil == null && depuisAppareil == null) {
                    fermer();
                    signaler("echec", sonNom);
                    return;
                }
                ouvertId = info.getId();
                signaler("ouvert", sonNom);
            }
        }, ui);
    }

    public void fermer() {
        generationOuverture++;
        horlogeArret();
        try { if (depuisAppareil != null) { depuisAppareil.disconnect(recepteur); depuisAppareil.close(); } } catch (IOException ignored) {}
        try { if (versAppareil != null) versAppareil.close(); } catch (IOException ignored) {}
        try { if (appareil != null) appareil.close(); } catch (IOException ignored) {}
        depuisAppareil = null; versAppareil = null; appareil = null;
        ouvertId = -1;
        statut = 0; attendu = 0; d1 = 0; recus = 0;
        enSysex = false; sysexTropLong = false; tampon.reset();
    }

    /** Fermeture demandee par la page : la page en est prevenue. */
    public void fermerSignale() {
        boolean etait = appareil != null || ouvertId >= 0;
        fermer();
        if (etait) signaler("ferme", "");
    }

    private final MidiReceiver recepteur = new MidiReceiver() {
        @Override
        public void onSend(byte[] msg, int offset, int count, long timestamp) {
            for (int i = offset; i < offset + count; i++) {
                int o = msg[i] & 0xFF;
                if (enSysex) {                   // un envoi exclusif est en cours
                    if (o == 0xF7) {
                        enSysex = false;
                        if (!sysexTropLong && tampon.size() < SYSEX_MAX) {
                            tampon.write(0xF7);
                            livrerSysex();
                        } else {
                            tampon.reset();
                        }
                        sysexTropLong = false;
                    } else if (o >= 0xF8) {
                        livrer(o, 0, 0);         // les messages temps réel s'intercalent
                    } else if (!sysexTropLong && tampon.size() < SYSEX_MAX - 1) {
                        tampon.write(o);
                    } else {
                        sysexTropLong = true;
                    }
                    continue;
                }
                if (o == 0xF0) {
                    enSysex = true;
                    sysexTropLong = false;
                    tampon.reset();
                    tampon.write(0xF0);
                    statut = 0;
                    continue;
                }
                if (o >= 0xF8) {                 // temps reel : n'annule jamais le running status
                    livrer(o, 0, 0);
                } else if (o >= 0x80) {          // nouveau statut
                    recus = 0;
                    if (o <= 0xEF) {             // messages de canal : running status autorise
                        statut = o;
                        int t = o & 0xF0;
                        attendu = (t == 0xC0 || t == 0xD0) ? 1 : 2;
                    } else if (o == 0xF1 || o == 0xF3) {
                        statut = o; attendu = 1; // System Common : pas de running status ensuite
                    } else if (o == 0xF2) {
                        statut = o; attendu = 2;
                    } else {
                        attendu = 0;
                        livrer(o, 0, 0);
                        statut = 0;
                    }
                } else if (statut != 0) {        // octet de donnees
                    if (attendu == 1) {
                        int courant = statut;
                        livrer(courant, o, 0);
                        recus = 0;
                        if (courant >= 0xF0) statut = 0;
                    } else if (recus == 0) {
                        d1 = o; recus = 1;
                    } else {
                        int courant = statut;
                        livrer(courant, d1, o);
                        recus = 0;
                        if (courant >= 0xF0) statut = 0;
                    }
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
    /** Envoie un ou plusieurs messages exclusifs COMPLETS ; refuse le reste
        (v130) plutot que de laisser l'appareil en attente d'un F7. */
    public boolean envoyerSysex(byte[] m) {
        if (versAppareil == null || !MidiOctets.sysexComplet(m)) return false;
        int pos = 0;
        try {
            while (pos < m.length) {
                int n = Math.min(240, m.length - pos);
                versAppareil.send(m, pos, n);
                pos += n;
            }
        } catch (IOException e) {
            return false;
        }
        return true;
    }

    private void livrer(final int a, final int b, final int c) {
        ui.post(new Runnable() { @Override public void run() { ecoute.message(a, b, c); } });
    }

    public void envoyer(int a, int b, int c) {
        if (versAppareil == null) return;
        int statut = a & 0xFF;
        int n = MidiOctets.longueur(statut);   /* F0, F7 et statuts non definis : refuses */
        if (n < 0) return;
        byte[] m = new byte[n];
        m[0] = (byte) statut;
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
