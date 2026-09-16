package fr.tibo.drm16;
import java.io.*; import java.nio.file.*;
public class TestFichiers {
  static int fautes = 0;
  static void ok(boolean c, String m){ System.out.println((c?"  ok   ":"  FAUX ")+m); if(!c) fautes++; }
  static void ecrire(File f, String s) throws IOException { Files.write(f.toPath(), s.getBytes()); }
  static String lire(File f) throws IOException { return new String(Files.readAllBytes(f.toPath())); }
  /* un fichier temporaire dont le renommage echoue N fois */
  static class Rebelle extends File { int refus; Rebelle(String p, int r){ super(p); refus=r; }
    @Override public boolean renameTo(File d){ if(refus>0){ refus--; return false; } return super.renameTo(d); } }
  /* une cible qu'on ne peut pas mettre de cote */
  static class Collee extends File { Collee(String p){ super(p); }
    @Override public boolean renameTo(File d){ return false; } }
  public static void main(String[] a) throws Exception {
    File d = Files.createTempDirectory("drm").toFile();
    File c = new File(d, "doc.syx");
    System.out.println("1. cas normal : remplacement direct");
    ecrire(c, "ANCIEN"); File t = new File(d, "doc.syx.part-1"); ecrire(t, "NOUVEAU");
    ok(Fichiers.remplacer(t, c), "remplace"); ok(lire(c).equals("NOUVEAU"), "contenu nouveau");
    ok(!t.exists() && !Fichiers.sauvegarde(c).exists(), "ni temporaire ni .bak");
    System.out.println("2. premier renommage refuse : repli par .bak");
    Rebelle r = new Rebelle(new File(d,"doc.syx.part-2").getPath(), 1); ecrire(r, "TROISIEME");
    ok(Fichiers.remplacer(r, c), "remplace par le repli"); ok(lire(c).equals("TROISIEME"), "contenu");
    ok(!Fichiers.sauvegarde(c).exists(), ".bak efface apres succes");
    System.out.println("3. le nouveau ne passe jamais : l'ancien est conserve");
    Rebelle r2 = new Rebelle(new File(d,"doc.syx.part-3").getPath(), 99); ecrire(r2, "PERDU");
    ok(!Fichiers.remplacer(r2, c), "echec signale"); ok(c.exists() && lire(c).equals("TROISIEME"), "ancien intact");
    ok(!Fichiers.sauvegarde(c).exists(), "pas de .bak qui traine");
    System.out.println("4. l'ancien ne peut pas etre mis de cote : on ne touche a rien");
    Collee cc = new Collee(c.getPath()); Rebelle r3 = new Rebelle(new File(d,"doc.syx.part-4").getPath(), 1); ecrire(r3,"X");
    ok(!Fichiers.remplacer(r3, cc), "echec signale"); ok(lire(c).equals("TROISIEME"), "ancien intact");
    System.out.println("5. arret brutal entre deux etapes : recuperation");
    c.renameTo(Fichiers.sauvegarde(c));   /* l'ancien est en .bak, la cible n'existe plus */
    ok(!c.exists(), "cible absente (simulation)");
    ok(Fichiers.lisible(c).exists() && lire(c).equals("TROISIEME"), "lisible remet l'ancien");
    File e = new File(d, "son.wav"); ecrire(Fichiers.sauvegarde(e), "ECH");
    File v = new File(d, "vieux.wav"); ecrire(v, "V2"); ecrire(Fichiers.sauvegarde(v), "V1");
    Fichiers.recupererDossier(d);
    ok(e.exists() && lire(e).equals("ECH"), "recupererDossier remet un orphelin");
    ok(lire(v).equals("V2") && !Fichiers.sauvegarde(v).exists(), "un .bak perime est efface, le fichier garde");
    System.out.println("6. noms techniques caches");
    ok(Fichiers.nomTechnique("a.wav.part-kz1-3") && Fichiers.nomTechnique("a.syx.bak") && !Fichiers.nomTechnique("a.syx"), "filtre");
    System.out.println("7. temporaire absent");
    ok(!Fichiers.remplacer(new File(d,"rien"), c) && lire(c).equals("TROISIEME"), "refus sans degat");
    System.out.println(fautes == 0 ? "TOUT EST BON" : fautes + " FAUTE(S)");
    System.exit(fautes);
  }
}
