package fr.tibo.drm16;

import java.io.File;
import java.io.IOException;

/**
 * Remplacement sur d'un fichier (v129). Aucune dependance Android : cette classe
 * se compile et se teste avec un simple JDK.
 *
 * Avant : l'ancien fichier etait SUPPRIME, puis le nouveau renomme a sa place.
 * Si le renommage echouait, les deux versions etaient perdues.
 *
 * Maintenant :
 * 1. renameTo seul. Sous Linux (donc Android), c'est rename(2), qui remplace la
 *    cible de facon atomique : a tout instant il existe soit l'ancien fichier,
 *    soit le nouveau, jamais aucun.
 * 2. S'il echoue (systeme de fichiers exotique), repli : l'ancien est mis de
 *    cote en .bak — jamais supprime —, le nouveau prend sa place, et seulement
 *    alors le .bak est efface. Si le nouveau ne passe pas, l'ancien est remis.
 * 3. Si l'application meurt entre deux etapes, le .bak orphelin est remis en
 *    place a la prochaine lecture ou liste (lisible, recupererDossier).
 */
final class Fichiers {
    private Fichiers() {}

    static File sauvegarde(File cible) {
        return new File(cible.getPath() + ".bak");
    }

    static boolean remplacer(File tmp, File cible) {
        if (tmp == null || cible == null || !tmp.isFile()) return false;
        File bak = sauvegarde(cible);
        if (tmp.renameTo(cible)) {
            if (bak.exists()) bak.delete();
            return true;
        }
        if (cible.exists()) {
            if (bak.exists() && !bak.delete()) return false;
            if (!cible.renameTo(bak)) return false;
        }
        if (tmp.renameTo(cible)) {
            bak.delete();
            return true;
        }
        if (bak.exists() && !cible.exists()) bak.renameTo(cible);
        return false;
    }

    /** v300 : une suppression ne doit jamais laisser un .bak capable de
        ressusciter le fichier. Le secours est donc efface AVANT la cible ; si
        cette premiere suppression echoue, la cible reste intacte. */
    static boolean supprimer(File cible) {
        if (cible == null) return false;
        try {
            File bak = sauvegarde(cible);
            if (!absent(bak)) {
                if (!bak.isFile() || !bak.delete()) return false;
            }
            if (absent(cible) || !cible.isFile()) return false;
            return cible.delete();
        } catch (IOException e) {
            return false;
        }
    }

    /** L'absence n'est certaine qu'apres lecture du dossier parent.
        File.exists() renvoie aussi false si l'acces au stockage est refuse. */
    static boolean absent(File fichier) throws IOException {
        if (fichier == null) throw new IOException("chemin indisponible");
        if (fichier.exists()) return false;
        File parent = fichier.getParentFile();
        if (parent == null) throw new IOException("parent indisponible : " + fichier);
        String[] noms = parent.list();
        if (noms == null) {
            if (absent(parent)) return true;
            throw new IOException("dossier illisible : " + parent);
        }
        for (String nom : noms) if (nom.equals(fichier.getName())) return false;
        return true;
    }

    /** Liste vide seulement pour un dossier vide ou dont l'absence est certaine. */
    static String[] listeVerifiee(File dossier) throws IOException {
        if (dossier == null) throw new IOException("dossier indisponible");
        String[] noms = dossier.list();
        if (noms != null) return noms;
        if (absent(dossier)) return new String[0];
        throw new IOException("dossier illisible : " + dossier);
    }

    /** Le fichier a lire, null si reellement absent ; restaure d'abord son .bak. */
    static File lisible(File cible) throws IOException {
        if (cible == null) throw new IOException("chemin indisponible");
        return lisible(cible, sauvegarde(cible));
    }

    static File lisible(File cible, File bak) throws IOException {
        if (!absent(cible)) {
            if (!cible.isFile()) throw new IOException("pas un fichier : " + cible);
            return cible;
        }
        if (absent(bak)) return null;
        if (!bak.isFile() || !bak.renameTo(cible) || !cible.isFile())
            throw new IOException("sauvegarde non restauree : " + bak);
        return cible;
    }

    /** Un .bak orphelin refuse ne doit jamais disparaitre d'une liste reussie. */
    static void recupererDossier(File dossier) throws IOException {
        String[] noms = listeVerifiee(dossier);
        for (String n : noms) {
            if (!n.endsWith(".bak")) continue;
            File cible = new File(dossier, n.substring(0, n.length() - 4));
            File bak = new File(dossier, n);
            lisible(cible, bak);
            if (bak.exists()) bak.delete();
        }
    }

    /** Un nom de travail, jamais montre a l'utilisateur. */
    static boolean nomTechnique(String n) {
        return n.contains(".part-") || n.endsWith(".bak");
    }
}
