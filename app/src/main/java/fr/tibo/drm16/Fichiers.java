package fr.tibo.drm16;

import java.io.File;

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

    /** Le fichier a lire ; remet d'abord en place une sauvegarde orpheline. */
    static File lisible(File cible) {
        if (cible == null || cible.exists()) return cible;
        File bak = sauvegarde(cible);
        if (bak.isFile()) bak.renameTo(cible);
        return cible;
    }

    /** Remet en place toutes les sauvegardes orphelines d'un dossier. */
    static void recupererDossier(File dossier) {
        if (dossier == null) return;
        String[] l = dossier.list();
        if (l == null) return;
        for (String n : l) {
            if (!n.endsWith(".bak")) continue;
            File cible = new File(dossier, n.substring(0, n.length() - 4));
            File bak = new File(dossier, n);
            if (!cible.exists()) bak.renameTo(cible);
            else bak.delete();
        }
    }

    /** Un nom de travail, jamais montre a l'utilisateur. */
    static boolean nomTechnique(String n) {
        return n.contains(".part-") || n.endsWith(".bak");
    }
}
