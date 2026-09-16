import javax.tools.*;
import java.nio.file.*;
import java.util.*;

/**
 * Compilation de controle du Java d'Android, sans SDK Android.
 *
 * Le compilateur du JDK compile les sources de l'application avec des classes
 * Android SIMULEES (outils/java/android-simule : signatures seulement, aucun
 * comportement). Il attrape ce qu'un simple controle de texte ne voit pas :
 * methode inexistante, mauvais type, champ oublie, surcharge manquante.
 *
 * Si l'application se met a utiliser une classe ou une methode Android absente
 * des simulations, la compilation echoue ici : il suffit alors d'ajouter sa
 * signature dans android-simule, sans rien d'autre.
 *
 *   java outils/java/Verif.java <dossier de sortie> <dossiers de sources...>
 */
public class Verif {
    public static void main(String[] a) throws Exception {
        if (a.length < 2) { System.err.println("usage : Verif <sortie> <sources...>"); System.exit(2); }
        JavaCompiler c = ToolProvider.getSystemJavaCompiler();
        if (c == null) { System.err.println("Pas de compilateur : il faut un JDK, pas un simple JRE."); System.exit(2); }
        List<String> fichiers = new ArrayList<>();
        for (int i = 1; i < a.length; i++) {
            try (var flux = Files.walk(Paths.get(a[i]))) {
                flux.filter(p -> p.toString().endsWith(".java")).forEach(p -> fichiers.add(p.toString()));
            }
        }
        Files.createDirectories(Paths.get(a[0]));
        List<String> opt = new ArrayList<>(List.of("-d", a[0], "-Xmaxerrs", "400", "-proc:none", "-nowarn",
                                                   "-encoding", "UTF-8"));
        opt.addAll(fichiers);
        int r = c.run(null, null, null, opt.toArray(new String[0]));
        System.out.println(r == 0 ? "compilation Java : ok (" + fichiers.size() + " fichiers)" : "compilation Java : ECHEC");
        System.exit(r);
    }
}
