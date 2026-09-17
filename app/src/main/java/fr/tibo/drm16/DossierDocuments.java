package fr.tibo.drm16;

import java.io.*;
import java.nio.charset.StandardCharsets;

/** v182 : conserver le choix de stockage, sans migration implicite de documents. */
final class DossierDocuments {
    private DossierDocuments() {}
    static final String REPERE = "drm16-dossier-documents.txt";

    static synchronized File choisir(File prive, File externe) throws IOException {
        verifier(prive);
        File repere = new File(prive, REPERE);
        File lisible = Fichiers.lisible(repere);
        File interne = new File(prive, "documents");
        if (lisible != null) {
            String choix = lire(lisible);
            File cible;
            if (choix.equals("v1\ninterne\n")) cible = interne;
            else if (choix.startsWith("v1\nexterne\n")) {
                if (externe == null || !choix.equals("v1\nexterne\n" + externe.getCanonicalPath() + "\n"))
                    throw new IOException("dossier externe memorise indisponible ou different");
                cible = externe;
            } else throw new IOException("choix du dossier invalide");
            // Un dossier memorise disparu peut contenir le suivi d'une reprise :
            // ne jamais le recreer vide ni adopter un autre emplacement.
            verifier(cible);
            return cible;
        }

        // Migration v181 : null ne prouve pas qu'aucun ancien document externe
        // n'existe. Attendre son retour, meme si le dossier interne est present.
        verifier(externe);
        String[] anciens = Fichiers.listeVerifiee(interne);
        String[] publics = Fichiers.listeVerifiee(externe);
        if (anciens.length > 0 && publics.length > 0)
            throw new IOException("documents presents dans deux dossiers : choix ambigu");
        boolean utiliserInterne = anciens.length > 0;
        File cible = utiliserInterne ? interne : externe;
        verifier(cible);
        String choix = utiliserInterne ? "v1\ninterne\n" : "v1\nexterne\n" + externe.getCanonicalPath() + "\n";
        // Fichier prive hors Documents, donc absent des exports et listes utilisateur.
        File tmp = File.createTempFile(REPERE + ".part-", "", prive);
        try {
            try (FileOutputStream flux = new FileOutputStream(tmp)) {
                flux.write(choix.getBytes(StandardCharsets.UTF_8));
                flux.flush(); flux.getFD().sync();
            }
            if (!Fichiers.remplacer(tmp, repere) || !choix.equals(lire(repere)))
                throw new IOException("choix du dossier non enregistre");
        } finally { tmp.delete(); }
        return cible;
    }

    private static void verifier(File dossier) throws IOException {
        if (dossier == null || !dossier.isDirectory() || dossier.list() == null)
            throw new IOException("dossier documents indisponible");
    }

    private static String lire(File fichier) throws IOException {
        try (InputStream flux = new FileInputStream(fichier);
             ByteArrayOutputStream contenu = new ByteArrayOutputStream()) {
            byte[] bloc = new byte[1024]; int n;
            while ((n = flux.read(bloc)) != -1) {
                if (contenu.size() + n > 8192) throw new IOException("choix du dossier trop long");
                contenu.write(bloc, 0, n);
            }
            return new String(contenu.toByteArray(), StandardCharsets.UTF_8);
        }
    }
}
