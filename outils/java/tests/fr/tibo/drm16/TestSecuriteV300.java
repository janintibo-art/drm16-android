package fr.tibo.drm16;

import java.io.*;
import java.nio.file.*;
import java.util.Base64;

/** v300 : les noms dangereux ne doivent jamais retomber sur un vrai fichier « x ». */
public class TestSecuriteV300 {
    static int fautes;
    static void ok(boolean valeur, String texte) {
        System.out.println((valeur ? "  ok   " : "  FAUX ") + texte);
        if (!valeur) fautes++;
    }
    static class Application extends MainActivity {
        final File prive, documents;
        Application(File prive, File documents) { this.prive = prive; this.documents = documents; }
        @Override public File getFilesDir() { return prive; }
        @Override public File getExternalFilesDir(String type) { return documents; }
    }
    static void effacer(File f) {
        File[] e = f.listFiles();
        if (e != null) for (File x : e) effacer(x);
        f.delete();
    }
    public static void main(String[] args) throws Exception {
        File racine = Files.createTempDirectory("drm-v300-").toFile();
        try {
            File prive = new File(racine, "prive"), documents = new File(racine, "documents");
            prive.mkdir(); documents.mkdir();
            File x = new File(documents, "x");
            Files.write(x.toPath(), "DOCUMENT X".getBytes());
            File ech = new File(prive, "ech"); ech.mkdir();
            File xwav = new File(ech, "x.wav");
            Files.write(xwav.toPath(), "SON X".getBytes());

            Application app = new Application(prive, documents);
            MainActivity.Pont pont = app.new Pont();
            String b64 = Base64.getEncoder().encodeToString("NOUVEAU".getBytes());

            ok("".equals(pont.fichierCharger("..")) && "".equals(pont.fichierCharger("."))
                    && "".equals(pont.fichierCharger("")) && "".equals(pont.fichierCharger(null)),
                    "documents : noms vides, . et .. refuses comme absents");
            ok(!pont.fichierSupprimer("..") && "".equals(pont.fichierSauver("..", b64))
                    && "".equals(pont.fichierOuvrir("..")),
                    "documents : aucune ecriture ni suppression avec un nom dangereux");
            ok("DOCUMENT X".equals(new String(Files.readAllBytes(x.toPath()))),
                    "le vrai fichier x n'est jamais vise");

            ok("".equals(pont.echCharger("..")) && "".equals(pont.echCharger("."))
                    && "".equals(pont.echCharger("")) && "".equals(pont.echCharger(null)),
                    "echantillons : noms dangereux refuses");
            ok(!pont.echSauver("..", b64), "echantillons : ecriture dangereuse refusee");
            pont.echSupprimer("..");
            ok("SON X".equals(new String(Files.readAllBytes(xwav.toPath()))),
                    "le vrai echantillon x.wav n'est jamais supprime");
        } finally {
            effacer(racine);
        }
        System.out.println(fautes == 0 ? "TOUT EST BON" : fautes + " FAUTE(S)");
        System.exit(fautes);
    }
}
