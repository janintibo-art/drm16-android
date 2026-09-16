package fr.tibo.drm16;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.net.Uri;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import android.os.Environment;

import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.json.JSONObject;

/**
 * DRM16 : recreation autonome.
 * L'appareil complet (interface et moteur audio) tient dans assets/drm16.html.
 * La navigation WebView reste strictement locale. Les rares telechargements externes passent
 * uniquement par le pont Java netCharger(), en HTTPS et avec une limite de taille.
 */
public class MainActivity extends Activity implements Midi.Ecoute {

    private static final String PAGE = "file:///android_asset/drm16.html";
    /* Plafonds de taille (v128). Regle : tout document que l'application ECRIT et
       peut RELIRE a le meme plafond dans les deux sens. Seuls les rendus audio
       (.wav), jamais relus par l'application, ont un plafond a part.
       Avant : ecriture 128 Mo, lecture 8 Mo. */
    private static final long MAX_DOCUMENT_BYTES = 8L * 1024L * 1024L;
    private static final long MAX_EXPORT_AUDIO_BYTES = 64L * 1024L * 1024L;   /* 6 min en stereo 44,1 kHz */
    private static final long MAX_SAMPLE_BYTES = 32L * 1024L * 1024L;
    private static final int MAX_NETWORK_BYTES = 16 * 1024 * 1024;
    /* Un morceau d'ecriture par etapes : 786 432 octets, soit 1 048 576 caracteres
       en Base64. Un peu de marge pour les retours a la ligne eventuels. */
    private static final int MAX_MORCEAU_B64 = 1100000;
    private static final int MAX_ECRITURES = 4;

    private WebView web;
    private AudioManager audio;
    private AudioFocusRequest demande;
    private boolean enLecture;
    private boolean permissionDemandee;
    private volatile boolean detruite;
    private Midi midi;
    private final ExecutorService reseau = Executors.newFixedThreadPool(2);
    private ValueCallback<Uri[]> retourFichier;
    /* Ecritures par morceaux en cours, par jeton. Un gros rendu n'est plus
       transmis en une seule chaine Base64 : c'etait plusieurs centaines de Mo en
       memoire au meme moment (chaine JS, chaine Java en UTF-16, octets decodes). */
    private static final class Ecriture {
        File cible; File tmp; FileOutputStream flux; long total; long max;
    }
    private final Map<String, Ecriture> ecritures = new HashMap<>();
    private long compteurEcritures;
    private static final int REQ_FICHIER = 7, REQ_MICRO = 8;

    private final AudioManager.OnAudioFocusChangeListener ecouteFocus =
            new AudioManager.OnAudioFocusChangeListener() {
                @Override
                public void onAudioFocusChange(int changement) {
                    if (changement == AudioManager.AUDIOFOCUS_LOSS
                            || changement == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                        arreterLecture();
                    }
                }
            };

    /** Pont appele depuis la page. */
    public class Pont {
        @JavascriptInterface
        public void playing(final boolean actif) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    majLecture(actif);
                }
            });
        }
        @JavascriptInterface public boolean midiDispo() { return midi != null && midi.dispo(); }
        @JavascriptInterface public String midiListe() { return midi == null ? "" : midi.liste(); }
        @JavascriptInterface public void midiOuvrir(final int i) {
            runOnUiThread(new Runnable() { @Override public void run() { if (midi != null) midi.ouvrir(i); } });
        }
        @JavascriptInterface public void midiFermer() {
            runOnUiThread(new Runnable() { @Override public void run() { if (midi != null) midi.fermer(); } });
        }
        @JavascriptInterface public void midiEnvoyer(int a, int b, int c) {
            if (midi != null) midi.envoyer(a, b, c);
        }
        @JavascriptInterface public void midiHorloge(boolean on, double bpm) {
            if (midi == null) return;
            if (on) midi.horlogeDepart(bpm); else midi.horlogeArret();
        }
        /** Faux si rien n'est parti : pas d'appareil, ou message incomplet. */
        @JavascriptInterface public boolean midiSysex(String base64) {
            if (midi == null || base64 == null) return false;
            try { return midi.envoyerSysex(Base64.decode(base64, Base64.DEFAULT)); }
            catch (Exception e) { return false; }
        }
        @JavascriptInterface public void midiTempo(double bpm) {
            if (midi != null) midi.tempo(bpm);
        }

        /** Autorisation du micro : demande si besoin, renvoie l'etat courant. */
        @JavascriptInterface public boolean micro() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_GRANTED) return true;
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    try { requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MICRO); }
                    catch (Exception ignored) {}
                }
            });
            return false;
        }

        /** Echantillons de l'utilisateur, ecrits dans le dossier prive de l'application. */
        /** Ecrit un fichier dans Documents de l'application, visible par un gestionnaire de fichiers. */
        @JavascriptInterface public String fichierSauver(String nom, String b64) {
            try {
                String p = propre(nom);
                long max = plafondDocument(p);
                if (b64 == null || depasseBase64(b64, max)) return "";
                File cible = new File(dossierDoc(), p);
                byte[] o = Base64.decode(b64, Base64.DEFAULT);
                if (o.length > max || !ecrireAtomique(cible, o)) return "";
                return cible.getAbsolutePath();
            } catch (Exception e) { return ""; }
        }
        /** Ecriture par morceaux : ouvre un fichier temporaire et rend un jeton
            (chaine vide en cas de refus). */
        @JavascriptInterface public String fichierOuvrir(String nom) {
            try {
                String p = propre(nom);
                File cible = new File(dossierDoc(), p);
                Ecriture e = new Ecriture();
                String jeton;
                synchronized (ecritures) {
                    if (ecritures.size() >= MAX_ECRITURES) return "";
                    compteurEcritures++;
                    jeton = Long.toString(System.currentTimeMillis(), 36) + "-" + compteurEcritures;
                    e.cible = cible;
                    e.max = plafondDocument(p);
                    e.tmp = new File(cible.getParentFile(), p + ".part-" + jeton);
                    e.flux = new FileOutputStream(e.tmp);
                    ecritures.put(jeton, e);
                }
                return jeton;
            } catch (Exception ex) { return ""; }
        }
        /** Ajoute un morceau. Au moindre refus, l'ecriture entiere est abandonnee. */
        @JavascriptInterface public boolean fichierAjouter(String jeton, String b64) {
            Ecriture e;
            synchronized (ecritures) { e = ecritures.get(jeton); }
            if (e == null) return false;
            try {
                if (b64 == null || b64.length() > MAX_MORCEAU_B64) throw new IOException("morceau refuse");
                byte[] o = Base64.decode(b64, Base64.DEFAULT);
                if (e.total + o.length > e.max) throw new IOException("fichier trop gros");
                e.flux.write(o);
                e.total += o.length;
                return true;
            } catch (Exception ex) {
                abandonnerEcriture(jeton);
                return false;
            }
        }
        /** Termine : valider remplace le fichier final et rend son chemin ;
            sinon le temporaire est efface. */
        @JavascriptInterface public String fichierFermer(String jeton, boolean valider) {
            Ecriture e;
            synchronized (ecritures) { e = ecritures.remove(jeton); }
            if (e == null) return "";
            boolean ok = false;
            try {
                e.flux.flush();
                e.flux.getFD().sync();
                e.flux.close();
                if (valider) ok = remplacer(e.tmp, e.cible);
            } catch (Exception ex) {
                ok = false;
            } finally {
                try { e.flux.close(); } catch (Exception ignored) {}
                if (e.tmp.exists()) e.tmp.delete();
            }
            return ok ? e.cible.getAbsolutePath() : "";
        }
        /** Telechargement sur un fil separe : la page est prevenue quand c'est fini.
            Deux plafonds : la taille annoncee et la taille reellement lue. */
        @JavascriptInterface public void netCharger(final String url, final String jeton,
                                                    final int maxOctets) {
            if (detruite || reseau.isShutdown()) return;
            reseau.execute(new Runnable() { @Override public void run() {
                String err = "";
                byte[] o = null;
                HttpURLConnection c = null;
                try {
                    URL u = new URL(url);
                    if (!"https".equalsIgnoreCase(u.getProtocol())) throw new IOException("https seulement");
                    c = (HttpURLConnection) u.openConnection();
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(30000);
                    c.setInstanceFollowRedirects(true);
                    c.setRequestProperty("User-Agent", "DRM16-Android");
                    int code = c.getResponseCode();
                    if (code != HttpURLConnection.HTTP_OK) throw new IOException("reponse " + code);
                    if (!"https".equalsIgnoreCase(c.getURL().getProtocol()))
                        throw new IOException("redirection non https refusee");
                    int plafond = maxOctets > 0 ? Math.min(maxOctets, MAX_NETWORK_BYTES)
                                                : 4 * 1024 * 1024;
                    long annonce = c.getContentLengthLong();
                    if (annonce > plafond) throw new IOException("trop gros : " + annonce);
                    try (InputStream in = c.getInputStream();
                         ByteArrayOutputStream b = new ByteArrayOutputStream(
                                 annonce > 0 ? (int) Math.min(annonce, plafond) : 16384)) {
                        byte[] tampon = new byte[16384];
                        int n, total = 0;
                        while ((n = in.read(tampon)) != -1) {
                            if (n == 0) continue;
                            total += n;
                            if (total > plafond) throw new IOException("trop gros");
                            b.write(tampon, 0, n);
                        }
                        o = b.toByteArray();
                    }
                } catch (Exception e) {
                    err = e.getMessage() == null ? e.toString() : e.getMessage();
                } finally {
                    if (c != null) c.disconnect();
                }
                final String charge = (o == null) ? "" : Base64.encodeToString(o, Base64.NO_WRAP);
                final String erreur = err;
                runOnUiThread(new Runnable() { @Override public void run() {
                    if (detruite || web == null) return;
                    String script = "window.__net&&__net("
                            + JSONObject.quote(jeton == null ? "" : jeton) + ","
                            + JSONObject.quote(erreur == null ? "" : erreur) + ","
                            + JSONObject.quote(charge) + ")";
                    web.evaluateJavascript(script, null);
                }});
            }});
        }
        private File dossierDoc() {
            File d = getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
            if (d != null && (d.exists() || d.mkdirs())) return d;
            d = new File(getFilesDir(), "documents");
            if (!d.exists()) d.mkdirs();
            return d;
        }
        /** Liste des fichiers de Documents portant l'extension demandee, avec leur taille. */
        @JavascriptInterface public String fichierListe(String ext) {
            File d = dossierDoc();
            Fichiers.recupererDossier(d);
            String[] l = d.list();
            if (l == null) return "";
            Arrays.sort(l, String.CASE_INSENSITIVE_ORDER);
            StringBuilder sb = new StringBuilder();
            for (String n : l) {
                if (Fichiers.nomTechnique(n)) continue;       /* ecriture en cours ou interrompue */
                if (ext != null && ext.length() > 0 && !n.endsWith(ext)) continue;
                File f = new File(d, n);
                if (sb.length() > 0) sb.append("\n");
                sb.append(n).append("\t").append(f.length()).append("\t").append(f.lastModified());
            }
            return sb.toString();
        }
        @JavascriptInterface public String fichierCharger(String nom) {
            try {
                File f = Fichiers.lisible(new File(dossierDoc(), propre(nom)));
                byte[] o = lireFichierComplet(f, MAX_DOCUMENT_BYTES);
                return Base64.encodeToString(o, Base64.NO_WRAP);
            } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public boolean fichierSupprimer(String nom) {
            try {
                File f = new File(dossierDoc(), propre(nom));
                Fichiers.sauvegarde(f).delete();
                return f.delete();
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface public String fichierDossier() {
            return dossierDoc().getAbsolutePath();
        }
        @JavascriptInterface public String echDossier() {
            return new File(getFilesDir(), "ech").getAbsolutePath();
        }
        @JavascriptInterface public boolean echSauver(String nom, String b64) {
            try {
                if (b64 == null || depasseBase64(b64, MAX_SAMPLE_BYTES)) return false;
                File d = new File(getFilesDir(), "ech");
                if (!d.exists() && !d.mkdirs()) return false;
                byte[] o = Base64.decode(b64, Base64.DEFAULT);
                if (o.length > MAX_SAMPLE_BYTES) return false;
                File cible = new File(d, propre(nom) + ".wav");
                return ecrireAtomique(cible, o);
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface public String echCharger(String nom) {
            try {
                File f = Fichiers.lisible(new File(new File(getFilesDir(), "ech"), propre(nom) + ".wav"));
                byte[] o = lireFichierComplet(f, MAX_SAMPLE_BYTES);
                return Base64.encodeToString(o, Base64.NO_WRAP);
            } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public String echListe() {
            File d = new File(getFilesDir(), "ech");
            Fichiers.recupererDossier(d);
            String[] l = d.list();
            if (l == null) return "";
            Arrays.sort(l, String.CASE_INSENSITIVE_ORDER);
            StringBuilder sb = new StringBuilder();
            for (String n : l) {
                if (!n.endsWith(".wav")) continue;
                if (sb.length() > 0) sb.append("\n");
                sb.append(n.substring(0, n.length() - 4));
            }
            return sb.toString();
        }
        @JavascriptInterface public void echSupprimer(String nom) {
            try {
                File f = new File(new File(getFilesDir(), "ech"), propre(nom) + ".wav");
                Fichiers.sauvegarde(f).delete();
                f.delete();
            } catch (Exception ignored) {}
        }
    }

    private byte[] lireFichierComplet(File f, long maxOctets) throws IOException {
        if (f == null || !f.isFile()) throw new IOException("fichier introuvable");
        long taille = f.length();
        if (taille < 0 || taille > maxOctets || taille > Integer.MAX_VALUE)
            throw new IOException("fichier trop gros");
        byte[] o = new byte[(int) taille];
        try (FileInputStream in = new FileInputStream(f)) {
            int pos = 0;
            while (pos < o.length) {
                int n = in.read(o, pos, o.length - pos);
                if (n < 0) throw new EOFException("fichier tronque pendant la lecture");
                if (n == 0) continue;
                pos += n;
            }
        }
        return o;
    }

    private boolean ecrireAtomique(File cible, byte[] o) throws IOException {
        if (cible == null || o == null) return false;
        File parent = cible.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) return false;
        File tmp = new File(parent, cible.getName() + ".part-" + Thread.currentThread().getId());
        try {
            try (FileOutputStream f = new FileOutputStream(tmp)) {
                f.write(o);
                f.flush();
                f.getFD().sync();
            }
            return remplacer(tmp, cible);
        } finally {
            if (tmp.exists() && !tmp.equals(cible)) tmp.delete();
        }
    }

    /** Met le temporaire a la place du fichier final, sans jamais perdre l'ancien :
        voir Fichiers.remplacer (v129). */
    private boolean remplacer(File tmp, File cible) {
        return Fichiers.remplacer(tmp, cible);
    }

    /** Plafond d'un document selon son type : voir les constantes. */
    private long plafondDocument(String nom) {
        return nom.toLowerCase(java.util.Locale.ROOT).endsWith(".wav")
                ? MAX_EXPORT_AUDIO_BYTES : MAX_DOCUMENT_BYTES;
    }

    private void abandonnerEcriture(String jeton) {
        Ecriture e;
        synchronized (ecritures) { e = ecritures.remove(jeton); }
        if (e == null) return;
        try { e.flux.close(); } catch (Exception ignored) {}
        try { e.tmp.delete(); } catch (Exception ignored) {}
    }

    private boolean depasseBase64(String b64, long maxOctets) {
        long maxChars = ((maxOctets + 2L) / 3L) * 4L + 8L;
        return b64.length() > maxChars;
    }

    private String propre(String n) {
        if (n == null) return "x";
        String p = n.replaceAll("[^A-Za-z0-9_.-]", "_");
        return p.isEmpty() ? "x" : p;
    }

    /** Message recu d'un appareil MIDI : transmis tel quel a la page. */
    @Override
    public void message(int a, int b, int c) {
        if (web == null) return;
        web.evaluateJavascript("window.__midi&&__midi(" + a + "," + b + "," + c + ")", null);
    }

    /** Envoi exclusif recu : transmis en base64, la page le decode. */
    @Override
    public void sysex(String base64) {
        if (web == null || base64 == null) return;
        web.evaluateJavascript("window.__midiSysex&&__midiSysex('" + base64 + "')", null);
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xff0b0b0c);
        getWindow().setNavigationBarColor(0xff0b0b0c);

        web = new WebView(this);
        web.setBackgroundColor(0xff0b0b0c);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        /* Les projets invités chargent leurs échantillons par requête interne
           depuis file:///android_asset/. Sans cette autorisation, la requête
           est refusée et les kits restent muets, sans le moindre message.
           Elle ne concerne QUE l'accès d'une page file:// à d'autres fichiers
           file:// ; setAllowFileAccess reste à false, la page ne peut donc
           toujours pas atteindre le reste du téléphone. */
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowContentAccess(true);   // nécessaire aux URI content:// du sélecteur de fichiers
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        /* SafeBrowsing compare les adresses visitees a un service en ligne. Cette
           page ne navigue JAMAIS ailleurs que dans ses propres ressources —
           shouldOverrideUrlLoading bloque tout le reste — donc il n'a rien a
           verifier ici, et son initialisation ne fait que retarder le demarrage.
           Retablir ce reglage si un jour la WebView charge une page distante. */
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(false);
        s.setBuiltInZoomControls(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                /* Tout est bloqué sauf nos propres pages : sans cette exception,
                   les cadres des projets invités resteraient vides, cette
                   méthode étant aussi appelée pour les sous-cadres sur les
                   versions récentes d'Android. */
                String u = r.getUrl().toString();
                if (u.startsWith("file:///android_asset/")) return false;
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                String u = r.getUrl().toString();
                if (u.startsWith("file:///android_asset/")) return null;
                return new WebResourceResponse("text/plain", "utf-8", null);
            }
        });

        midi = new Midi(this, this);
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest demande) {
                runOnUiThread(new Runnable() {
                    @Override public void run() {
                        Uri origine = demande.getOrigin();
                        String pageCourante = web == null ? null : web.getUrl();
                        boolean locale = origine != null
                                && "file".equalsIgnoreCase(origine.getScheme())
                                && pageCourante != null
                                && pageCourante.startsWith("file:///android_asset/");
                        boolean microAutorise = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                                || checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                                   == PackageManager.PERMISSION_GRANTED;
                        if (!locale || !microAutorise) {
                            demande.deny();
                            return;
                        }
                        List<String> ok = new ArrayList<>();
                        for (String r : demande.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) ok.add(r);
                        }
                        if (ok.isEmpty()) demande.deny();
                        else demande.grant(ok.toArray(new String[0]));
                    }
                });
            }
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (retourFichier != null) retourFichier.onReceiveValue(null);
                retourFichier = cb;
                try {
                    startActivityForResult(params.createIntent(), REQ_FICHIER);
                } catch (Exception e) {
                    retourFichier = null;
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Pont(), "DRM16");

        setContentView(web);
        immersive();
        web.loadUrl(PAGE);
    }

    // ---------- lecture ----------

    private void majLecture(boolean actif) {
        if (actif == enLecture) return;
        enLecture = actif;
        Intent service = new Intent(this, PlaybackService.class);
        if (actif) {
            demanderNotifications();
            if (!prendreFocus()) {          // refus : on ne laisse pas la page jouer par-dessus
                enLecture = false;
                if (web != null) web.evaluateJavascript(
                        "window.__drmStop&&__drmStop();window.__drmSignal&&__drmSignal('AUDIO REFUSÉ PAR LE SYSTÈME');", null);
                return;
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(service);
                else startService(service);
            } catch (Exception ignored) {
            }
        } else {
            try {
                stopService(service);
            } catch (Exception ignored) {
            }
            rendreFocus();
        }
    }

    private void arreterLecture() {
        if (web != null) web.evaluateJavascript("window.__drmStop && window.__drmStop();", null);
        majLecture(false);
    }

    private boolean prendreFocus() {
        if (audio == null) audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audio == null) return true;
        int res;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            demande = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributs)
                    .setOnAudioFocusChangeListener(ecouteFocus)
                    .build();
            res = audio.requestAudioFocus(demande);
        } else {
            res = audio.requestAudioFocus(ecouteFocus, AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN);
        }
        return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void rendreFocus() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (demande != null) {
                audio.abandonAudioFocusRequest(demande);
                demande = null;
            }
        } else {
            audio.abandonAudioFocus(ecouteFocus);
        }
    }

    /** La notification de lecture demande un accord depuis Android 13. */
    private void demanderNotifications() {
        if (permissionDemandee) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) return;
        permissionDemandee = true;
        try {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        } catch (Exception ignored) {
        }
    }

    // ---------- cycle de vie ----------

    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_FICHIER) {
            if (retourFichier != null) {
                retourFichier.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
                retourFichier = null;
            }
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onWindowFocusChanged(boolean has) {
        super.onWindowFocusChanged(has);
        if (has) immersive();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (!enLecture && web != null) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    public void onBackPressed() {
        finish();
    }

    @Override
    protected void onDestroy() {
        detruite = true;
        majLecture(false);
        reseau.shutdownNow();
        if (retourFichier != null) {
            retourFichier.onReceiveValue(null);
            retourFichier = null;
        }
        if (midi != null) midi.fermer();
        String[] ouvertes;
        synchronized (ecritures) { ouvertes = ecritures.keySet().toArray(new String[0]); }
        for (String j : ouvertes) abandonnerEcriture(j);
        if (web != null) {
            web.removeJavascriptInterface("DRM16");
            web.stopLoading();
            web.loadUrl("about:blank");
            web.removeAllViews();
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
