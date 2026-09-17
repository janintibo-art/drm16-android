package fr.tibo.drm16;

import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;

/** Choix persistant et migration, sur disque ; erreurs d'acces deterministes. */
public class TestDossierDocuments {
    static int essais;
    static void ok(boolean valeur, String nom) {
        essais++;
        if (!valeur) throw new AssertionError(nom);
        System.out.println("  ok   " + nom);
    }
    interface Action { void faire() throws Exception; }
    static void refuse(Action action, String nom) throws Exception {
        boolean erreur = false;
        try { action.faire(); } catch (IOException e) { erreur = true; }
        ok(erreur, nom);
    }
    static File dossier(File parent, String nom) throws IOException {
        File d = new File(parent, nom);
        Files.createDirectories(d.toPath()); return d;
    }
    static void ecrire(File f, String s) throws IOException {
        Files.write(f.toPath(), s.getBytes(StandardCharsets.UTF_8));
    }
    static String lire(File f) throws IOException {
        return new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8);
    }
    public static void main(String[] args) throws Exception {
        File racine = Files.createTempDirectory("drm-dossiers-").toFile();
        try {
            File p = dossier(racine, "prive"), e = dossier(racine, "externe");
            File repere = new File(p, DossierDocuments.REPERE);
            refuse(() -> DossierDocuments.choisir(p, null), "premier choix : externe inconnu refuse");
            ok(!repere.exists() && !new File(p, "documents").exists(), "aucun faux choix ni dossier de repli");
            File suivi = new File(e, "drm16-ouverture.json"); ecrire(suivi, "suivi");
            ok(DossierDocuments.choisir(p, e).equals(e), "ancienne installation externe conservee");
            String choix = lire(repere);
            refuse(() -> DossierDocuments.choisir(p, null), "externe memorise disparu : refus apres redemarrage");
            ok(lire(repere).equals(choix) && lire(suivi).equals("suivi"), "choix et suivi conserves");
            File autre = dossier(racine, "autre");
            refuse(() -> DossierDocuments.choisir(p, autre), "autre stockage externe refuse");
            refuse(() -> DossierDocuments.choisir(p, new TestLectures.Muet(e)), "dossier memorise illisible refuse");
            ok(DossierDocuments.choisir(p, e).equals(e), "retour du stockage : acces retabli");
            TestLectures.Application app = new TestLectures.Application(p, null);
            MainActivity.Pont pont = app.new Pont();
            ok(pont.fichierListe("") == null && pont.fichierCharger(suivi.getName()) == null,
                    "pont apres redemarrage : erreur de liste et lecture, pas une absence");
            ok("".equals(pont.fichierSauver("nouveau.json", "eA==")) &&
                    "".equals(pont.fichierOuvrir("nouveau.wav")), "pont : toutes les ecritures refusent le repli");
            ok(!new File(p, "documents").exists() && lire(suivi).equals("suivi"),
                    "pont : aucun document cree ailleurs ni suivi modifie");
            app.documents = e;
            ok(pont.fichierListe(".json").contains(suivi.getName()), "pont : Reessayer retrouve le suivi externe");
            File bak = Fichiers.sauvegarde(repere); repere.renameTo(bak);
            ok(DossierDocuments.choisir(p, e).equals(e) && !bak.exists(), "repere .bak restaure");
            ecrire(repere, "");
            refuse(() -> DossierDocuments.choisir(p, e), "repere vide : aucun nouveau choix");
            ecrire(repere, "v2\ninconnu\n");
            refuse(() -> DossierDocuments.choisir(p, e), "repere invalide : refus");
            ecrire(repere, "x".repeat(8193));
            refuse(() -> DossierDocuments.choisir(p, e), "lecture du repere bornee");

            File p2 = dossier(racine, "prive2"), e2 = dossier(racine, "externe2");
            File i2 = dossier(p2, "documents"), secours = new File(i2, "drm16-ouverture.json.bak");
            ecrire(secours, "secours");
            refuse(() -> DossierDocuments.choisir(p2, null), "migration interne : attendre de verifier l'externe");
            ok(DossierDocuments.choisir(p2, e2).equals(i2), "ancien dossier interne avec .bak preserve");
            ecrire(new File(e2, "autre.json"), "autre");
            ok(DossierDocuments.choisir(p2, e2).equals(i2) && DossierDocuments.choisir(p2, null).equals(i2),
                    "choix interne persiste quand l'externe revient ou disparait");
            ok(lire(secours).equals("secours"), "migration sans deplacement du secours");
            File deplace = new File(p2, "documents-ancien"); i2.renameTo(deplace);
            refuse(() -> DossierDocuments.choisir(p2, e2), "dossier interne memorise absent : pas de recreation");
            ok(!i2.exists(), "dossier absent non recree");

            File p3 = dossier(racine, "prive3"), e3 = dossier(racine, "externe3");
            File i3 = dossier(p3, "documents");
            ecrire(new File(i3, "projet.drm16"), "interne");
            ecrire(new File(e3, "drm16-ouverture.json"), "externe");
            refuse(() -> DossierDocuments.choisir(p3, e3), "deux dossiers occupes : pas de choix arbitraire");
            ok(!new File(p3, DossierDocuments.REPERE).exists(), "migration ambigue non memorisee");
            ok(lire(new File(i3, "projet.drm16")).equals("interne") && lire(new File(e3, "drm16-ouverture.json")).equals("externe"),
                    "les deux anciens emplacements restent intacts");

            File p4 = dossier(racine, "prive4"), e4 = dossier(racine, "externe4");
            dossier(p4, DossierDocuments.REPERE);
            refuse(() -> DossierDocuments.choisir(p4, e4), "repere non fichier refuse");
            File p5 = dossier(racine, "prive5"), e5 = dossier(racine, "externe5");
            ok(DossierDocuments.choisir(p5, e5).equals(e5), "nouvelle installation avec externe disponible");
            e5.delete();
            refuse(() -> DossierDocuments.choisir(p5, e5), "externe memorise absent non recree");
            refuse(() -> DossierDocuments.choisir(null, e), "stockage interne absent refuse");
        } finally { TestLectures.effacer(racine); }
        System.out.println(essais + " controles du choix de dossier : OK");
    }
}
