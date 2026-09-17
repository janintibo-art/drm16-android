package fr.tibo.drm16;

import android.content.Context;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Handler;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;

/** Le vrai Midi.java face aux reponses d'ouverture Android, sans materiel USB. */
public class TestMidiOuverture {
    private static int controles;

    private static void ok(boolean condition, String nom) {
        if (!condition) throw new AssertionError(nom);
        controles++;
        System.out.println("  ok   " + nom);
    }

    private static void champ(Object cible, String nom, Object valeur) throws Exception {
        Field f = cible.getClass().getDeclaredField(nom);
        f.setAccessible(true);
        f.set(cible, valeur);
    }

    private static MidiDeviceInfo.PortInfo port(int type, int numero) throws Exception {
        MidiDeviceInfo.PortInfo p = new MidiDeviceInfo.PortInfo();
        champ(p, "typeSimule", type);
        champ(p, "numeroSimule", numero);
        return p;
    }

    private static class Info extends MidiDeviceInfo {
        final int id;
        final PortInfo[] ports;
        Info(int id, PortInfo... ports) { this.id = id; this.ports = ports; }
        @Override public int getId() { return id; }
        @Override public PortInfo[] getPorts() { return ports; }
    }

    private static class Appareil extends MidiDevice {
        final Info info;
        final boolean accepteEntree, accepteSortie;
        boolean ferme, entreeFermee, sortieFermee, connecte;
        int entreesTentees, sortiesTentees;
        Appareil(Info info, boolean entree, boolean sortie) {
            this.info = info;
            accepteEntree = entree;
            accepteSortie = sortie;
        }
        @Override public MidiDeviceInfo getInfo() { return info; }
        @Override public MidiInputPort openInputPort(int n) {
            entreesTentees++;
            return !accepteEntree ? null : new MidiInputPort() {
                @Override public void close() { entreeFermee = true; }
            };
        }
        @Override public MidiOutputPort openOutputPort(int n) {
            sortiesTentees++;
            return !accepteSortie ? null : new MidiOutputPort() {
                @Override public void connect(MidiReceiver r) { connecte = true; }
                @Override public void close() { sortieFermee = true; }
            };
        }
        @Override public void close() { ferme = true; }
    }

    private static class Gestionnaire extends MidiManager {
        final List<OnDeviceOpenedListener> rappels = new ArrayList<>();
        MidiDeviceInfo[] infos;
        @Override public MidiDeviceInfo[] getDevices() { return infos; }
        @Override public void openDevice(MidiDeviceInfo i, OnDeviceOpenedListener cb, Handler h) {
            rappels.add(cb);
        }
    }

    private static class Ecoute implements Midi.Ecoute {
        final List<String> etats = new ArrayList<>();
        @Override public void message(int a, int b, int c) {}
        @Override public void sysex(String s) {}
        @Override public void etat(String s) { etats.add(s); }
        boolean dernier(String evenement) {
            // JSONObject.quote est une signature simulee : pas de parseur JSON dans ce test.
            return !etats.isEmpty() && etats.get(etats.size() - 1).contains("\"evt\":" + evenement + ",");
        }
    }

    public static void main(String[] args) throws Exception {
        Info entree = new Info(42, port(MidiDeviceInfo.PortInfo.TYPE_INPUT, 0));
        Info sortie = new Info(43, port(MidiDeviceInfo.PortInfo.TYPE_OUTPUT, 0));
        Gestionnaire g = new Gestionnaire();
        g.infos = new MidiDeviceInfo[] { entree, sortie };
        Ecoute e = new Ecoute();
        Midi m = new Midi(new Context() {}, e);
        champ(m, "mm", g);

        Appareil occupe = new Appareil(entree, false, false);
        m.ouvrirId(42);
        g.rappels.remove(0).onDeviceOpened(occupe);
        ok(occupe.entreesTentees == 1 && m.ouvertId() == -1 && e.dernier("echec"),
                "port occupe : echec signale, aucun faux temoin ouvert");
        ok(occupe.ferme, "appareil inutilisable libere");

        Appareil emetteur = new Appareil(entree, true, false);
        m.ouvrirId(42);
        g.rappels.remove(0).onDeviceOpened(emetteur);
        ok(m.ouvertId() == 42 && e.dernier("ouvert"), "un seul port d'envoi suffit");
        m.fermerSignale();
        ok(m.ouvertId() == -1 && emetteur.ferme && emetteur.entreeFermee && e.dernier("ferme"),
                "fermeture du port et de l'appareil apres une vraie ouverture");

        Appareil recepteur = new Appareil(sortie, false, true);
        m.ouvrirId(43);
        g.rappels.remove(0).onDeviceOpened(recepteur);
        ok(m.ouvertId() == 43 && recepteur.connecte && e.dernier("ouvert"),
                "un seul port de reception suffit et recoit son analyseur");

        m.ouvrirId(42);
        MidiManager.OnDeviceOpenedListener obsolete = g.rappels.remove(0);
        m.ouvrirId(43);
        Appareil ancien = new Appareil(entree, true, false);
        int avant = e.etats.size();
        obsolete.onDeviceOpened(ancien);
        ok(ancien.ferme && ancien.entreesTentees == 0 && e.etats.size() == avant,
                "un ancien rappel ne remplace pas la nouvelle demande");
        Appareil nouveau = new Appareil(sortie, false, true);
        g.rappels.remove(0).onDeviceOpened(nouveau);
        ok(m.ouvertId() == 43 && nouveau.connecte, "la demande la plus recente reste valide");

        m.ouvrirId(42);
        m.fermerSignale();
        Appareil annule = new Appareil(entree, true, false);
        g.rappels.remove(0).onDeviceOpened(annule);
        ok(m.ouvertId() == -1 && annule.ferme && annule.entreesTentees == 0,
                "fermer pendant l'ouverture empeche le rappel tardif de rouvrir");

        m.ouvrirId(42);
        g.rappels.remove(0).onDeviceOpened(null);
        ok(m.ouvertId() == -1 && e.dernier("echec"), "appareil refuse par Android : echec propre");
        System.out.println(controles + " controles ouverture MIDI : ok");
    }
}
