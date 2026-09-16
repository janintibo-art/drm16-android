package fr.tibo.drm16;

/**
 * Regles d'envoi MIDI (v130). Aucune dependance Android : se teste avec un JDK.
 *
 * Avant, l'envoi generique acceptait 0xF0 seul. Or F0 ouvre un message exclusif :
 * un appareil qui le recoit attend la suite et peut ignorer tout ce qui vient
 * ensuite, jusqu'a un F7 qui n'arrivera pas. Un message exclusif ne passe donc
 * plus que par envoyerSysex, et seulement s'il est complet.
 */
final class MidiOctets {
    private MidiOctets() {}

    /** Longueur du message commencant par ce statut, ou -1 s'il ne doit pas
        partir par l'envoi generique. */
    static int longueur(int statut) {
        statut &= 0xFF;
        if (statut >= 0x80 && statut <= 0xEF) {
            int type = statut & 0xF0;
            return (type == 0xC0 || type == 0xD0) ? 2 : 3;
        }
        switch (statut) {
            case 0xF1: case 0xF3: return 2;          /* quart de trame, choix de morceau */
            case 0xF2: return 3;                     /* position dans le morceau */
            case 0xF6:                               /* demande d'accord */
            case 0xF8: case 0xFA: case 0xFB: case 0xFC:
            case 0xFE: case 0xFF: return 1;          /* temps reel */
            default: return -1;   /* F0 et F7 (exclusif), F4 F5 F9 FD (non definis), octets de donnees */
        }
    }

    /** Vrai si m est une suite d'un ou plusieurs messages exclusifs complets :
        F0, au moins un octet de donnee, F7 — et rien d'autre entre eux.
        Une sauvegarde de banque en contient souvent plusieurs a la suite. */
    static boolean sysexComplet(byte[] m) {
        if (m == null || m.length < 3) return false;
        int i = 0;
        while (i < m.length) {
            if ((m[i] & 0xFF) != 0xF0) return false;
            int j = i + 1;
            while (j < m.length && (m[j] & 0x80) == 0) j++;
            if (j >= m.length || (m[j] & 0xFF) != 0xF7 || j == i + 1) return false;
            i = j + 1;
        }
        return true;
    }
}
