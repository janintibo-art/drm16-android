package fr.tibo.drm16;

import java.io.*;
import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;

/** v181 : erreurs de stockage distinctes d'une absence, avec de vrais fichiers.
    Les refus simules utilisent File, pas chmod (inefficace pour un test root). */
public class TestLectures {
    static int fautes;
    static void ok(boolean valeur, String texte) {
        System.out.println((valeur ? "  ok   " : "  FAUX ") + texte);
        if (!valeur) fautes++;
    }
    interface Action { void executer() throws Exception; }
    static void refuse(Action action, String texte) {
        boolean refus = false;
        try { action.executer(); }
        catch (IOException e) { refus = true; }
        catch (Exception e) { throw new RuntimeException(e); }
        ok(refus, texte);
    }
    static class Muet extends File {
        Muet(File f) { super(f.getPath()); }
        @Override public String[] list() { return null; }
    }
    static class ParentImpose extends File {
        final File parent;
        ParentImpose(File parent, String nom) { super(parent, nom); this.parent = parent; }
        @Override public File getParentFile() { return parent; }
    }
    static class Collee extends File {
        Collee(File f) { super(f.getPath()); }
        @Override public boolean renameTo(File cible) { return false; }
    }
    static class TailleAnnoncee extends File {
        final long taille;
        TailleAnnoncee(File f, long taille) { super(f.getPath()); this.taille = taille; }
        @Override public long length() { return taille; }
    }
    static class Application extends MainActivity {
        File prive, documents;
        Application(File prive, File documents) { this.prive = prive; this.documents = documents; }
        @Override public File getFilesDir() { return prive; }
        @Override public File getExternalFilesDir(String type) { return documents; }
    }
    static void ecrire(File fichier, byte[] contenu) throws IOException {
        Files.write(fichier.toPath(), contenu);
    }
    static byte[] lire(MainActivity app, File fichier, long max) throws Exception {
        Method methode = MainActivity.class.getDeclaredMethod("lireFichierComplet", File.class, long.class);
        methode.setAccessible(true);
        try { return (byte[]) methode.invoke(app, fichier, max); }
        catch (InvocationTargetException e) {
            if (e.getCause() instanceof IOException) throw (IOException) e.getCause();
            throw e;
        }
    }
    static void effacer(File fichier) {
        File[] enfants = fichier.listFiles();
        if (enfants != null) for (File enfant : enfants) effacer(enfant);
        fichier.delete();
    }
    public static void main(String[] args) throws Exception {
        File racine = Files.createTempDirectory("drm-lectures-").toFile();
        try {
            File prive = new File(racine, "prive"), documents = new File(racine, "documents");
            prive.mkdir(); documents.mkdir();
            Application app = new Application(prive, documents);
            MainActivity.Pont pont = app.new Pont();
            System.out.println("1. Absence constatee, dossiers vides et formats conserves");
            ok("".equals(pont.fichierCharger("absent.json")), "document absent : chaine vide");
            ok("".equals(pont.fichierListe("")), "documents vides : liste vide");
            ok("".equals(pont.echCharger("absent")) && "".equals(pont.echListe()),
                    "dossier echantillons pas encore cree : absence constatee");
            ok("".equals(pont.fichierCharger("..")) && "".equals(pont.echCharger("..")),
                    "nom legacy '..' normalise vers x absent");
            byte[] contenu = new byte[]{0, 1, 2, -1, 10, 13};
            String b64 = Base64.getEncoder().encodeToString(contenu);
            File journal = new File(documents, "drm16-ouverture.json");
            ecrire(journal, contenu);
            ok(b64.equals(pont.fichierCharger(journal.getName())), "octets lus sans transformation");
            ok(pont.fichierListe(".json").equals(journal.getName() + "\t" + contenu.length + "\t" + journal.lastModified()),
                    "format nom TAB taille TAB date conserve");
            ecrire(journal, new byte[0]);
            ok("".equals(pont.fichierCharger(journal.getName())) && pont.fichierListe("").startsWith(journal.getName() + "\t0\t"),
                    "fichier vide toujours distingue de l'absence par sa presence dans la liste");
            File sons = new File(prive, "ech"); sons.mkdir();
            File son = new File(sons, "timbre.wav"); ecrire(son, contenu);
            ok(b64.equals(pont.echCharger("timbre")) && "timbre".equals(pont.echListe()),
                    "lecture et liste echantillons conservent leur format");

            System.out.println("2. Refus d'acces et non-fichiers ne sont jamais une absence");
            app.documents = new Muet(documents);
            ok(pont.fichierCharger(journal.getName()) == null && pont.fichierListe("") == null,
                    "stockage connu mais illisible : lectures et liste null");
            ok(pont.fichierDossier() == null && !new File(prive, "documents").exists(),
                    "refus d'acces signale sans ouvrir un autre dossier");
            app.documents = documents;
            File nonFichier = new File(documents, "repertoire.json"); nonFichier.mkdir();
            ok(pont.fichierCharger(nonFichier.getName()) == null, "repertoire a la place d'un document : null");
            File nonSon = new File(sons, "repertoire.wav"); nonSon.mkdir();
            ok(pont.echCharger("repertoire") == null, "repertoire a la place d'un son : null");
            File muet = new Muet(documents);
            refuse(() -> Fichiers.lisible(new ParentImpose(muet, "absent.json")),
                    "exists false ne prouve rien si le parent ne peut pas etre liste");
            refuse(() -> Fichiers.listeVerifiee(muet), "liste impossible : IOException");
            File absent = new File(racine, "dossier-absent");
            ok(Fichiers.listeVerifiee(absent).length == 0 && Fichiers.lisible(new File(absent, "rien.json")) == null,
                    "absence du dossier confirmee par son parent lisible");
            app.prive = null;
            ok(pont.echCharger("timbre") == null && pont.echListe() == null && pont.echDossier() == null,
                    "stockage prive indisponible : null sans chemin relatif");
            app.prive = prive;
            app.documents = nonFichier;
            File bloque = new File(racine, "documents-bloques"); ecrire(bloque, contenu);
            app.documents = bloque;
            ok(pont.fichierCharger("absent.json") == null && pont.fichierListe("") == null,
                    "chemin Documents devenu fichier : null sans repli");
            app.documents = null;
            ok(pont.fichierListe("") == null && !new File(prive, "documents").exists(),
                    "absence de chemin externe : aucun repli masquant le suivi");
            app.documents = documents;

            System.out.println("3. Sauvegardes orphelines : restaurer ou signaler un refus");
            journal.delete();
            File bak = Fichiers.sauvegarde(journal); ecrire(bak, contenu);
            refuse(() -> Fichiers.lisible(journal, new Collee(bak)), "renommage .bak refuse : erreur explicite");
            ok(!journal.exists() && Arrays.equals(Files.readAllBytes(bak.toPath()), contenu),
                    "journal .bak conserve intact apres le refus");
            ok(b64.equals(pont.fichierCharger(journal.getName())) && !bak.exists(),
                    "lecture suivante restaure le journal des que le renommage reussit");
            journal.renameTo(bak);
            ok(pont.fichierListe(".json").contains(journal.getName() + "\t") && journal.isFile() && !bak.exists(),
                    "liste restaure le journal avant de masquer les noms techniques");
            journal.delete(); bak.mkdir();
            ok(pont.fichierCharger(journal.getName()) == null && pont.fichierListe(".wav") == null && bak.exists(),
                    "sauvegarde inexploitable : aucun faux succes, meme avec une autre extension");
            bak.delete();
            son.delete(); File sonBak = Fichiers.sauvegarde(son); sonBak.mkdir();
            ok(pont.echCharger("timbre") == null && pont.echListe() == null && sonBak.exists(),
                    "refus de restauration d'un son conserve son .bak et signale null");
            sonBak.delete(); ecrire(sonBak, contenu);
            ok("repertoire\ntimbre".equals(pont.echListe()) && b64.equals(pont.echCharger("timbre")),
                    "liste sons retablie apres recuperation du .bak");

            System.out.println("4. Limites et lectures interrompues");
            ecrire(journal, contenu);
            ok(Arrays.equals(lire(app, journal, contenu.length), contenu), "fichier a la limite autorisee lu entierement");
            refuse(() -> lire(app, journal, contenu.length - 1), "plafond depasse : lecture refusee");
            refuse(() -> lire(app, new TailleAnnoncee(journal, contenu.length + 1), 100),
                    "troncature pendant la lecture : aucune reussite partielle");
            refuse(() -> lire(app, new TailleAnnoncee(journal, contenu.length - 1), 100),
                    "croissance pendant la lecture : aucune reussite tronquee");
            File gros = new File(documents, "gros.json");
            try (RandomAccessFile f = new RandomAccessFile(gros, "rw")) { f.setLength(8L * 1024L * 1024L + 1); }
            ok(pont.fichierCharger(gros.getName()) == null, "document trop gros : null au pont");
            File projet = new File(documents, "gros.drm16");
            try (RandomAccessFile f = new RandomAccessFile(projet, "rw")) { f.setLength(16L * 1024L * 1024L + 1); }
            ok(pont.fichierCharger(projet.getName()) == null, "projet trop gros : null au pont");
            try (RandomAccessFile f = new RandomAccessFile(son, "rw")) { f.setLength(32L * 1024L * 1024L + 1); }
            ok(pont.echCharger("timbre") == null, "echantillon trop gros : null au pont");
        } finally { effacer(racine); }
        System.out.println(fautes == 0 ? "TOUT EST BON" : fautes + " FAUTE(S)");
        System.exit(fautes);
    }
}
