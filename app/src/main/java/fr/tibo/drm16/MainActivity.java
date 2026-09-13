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

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * DRM16 : recreation autonome.
 * L'appareil complet (interface et moteur audio) tient dans assets/drm16.html.
 * Aucune requete reseau n'est autorisee : tout ce qui n'est pas file:///android_asset/ est bloque.
 */
public class MainActivity extends Activity implements Midi.Ecoute {

    private static final String PAGE = "file:///android_asset/drm16.html";

    private WebView web;
    private AudioManager audio;
    private AudioFocusRequest demande;
    private boolean enLecture;
    private boolean permissionDemandee;
    private Midi midi;
    private ValueCallback<Uri[]> retourFichier;
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
        @JavascriptInterface public void midiSysex(String base64) {
            if (midi == null || base64 == null) return;
            try { midi.envoyerSysex(Base64.decode(base64, Base64.DEFAULT)); }
            catch (Exception ignored) {}
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
                File d = dossierDoc();
                File cible = new File(d, propre(nom));
                byte[] o = Base64.decode(b64, Base64.DEFAULT);
                FileOutputStream f = new FileOutputStream(cible);
                f.write(o); f.flush(); f.getFD().sync(); f.close();
                return cible.getAbsolutePath();
            } catch (Exception e) { return ""; }
        }
        private File dossierDoc() {
            File d = getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
            if (d == null) d = new File(getFilesDir(), "documents");
            if (!d.exists()) d.mkdirs();
            return d;
        }
        /** Liste des fichiers de Documents portant l'extension demandee, avec leur taille. */
        @JavascriptInterface public String fichierListe(String ext) {
            File d = dossierDoc();
            String[] l = d.list();
            if (l == null) return "";
            StringBuilder sb = new StringBuilder();
            for (String n : l) {
                if (ext != null && ext.length() > 0 && !n.endsWith(ext)) continue;
                File f = new File(d, n);
                if (sb.length() > 0) sb.append("\n");
                sb.append(n).append("\t").append(f.length()).append("\t").append(f.lastModified());
            }
            return sb.toString();
        }
        @JavascriptInterface public String fichierCharger(String nom) {
            try {
                File f = new File(dossierDoc(), propre(nom));
                if (!f.exists() || f.length() > 8 * 1024 * 1024) return "";
                byte[] o = new byte[(int) f.length()];
                FileInputStream in = new FileInputStream(f);
                int lu = in.read(o); in.close();
                if (lu <= 0) return "";
                return Base64.encodeToString(o, Base64.NO_WRAP);
            } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public boolean fichierSupprimer(String nom) {
            try { return new File(dossierDoc(), propre(nom)).delete(); }
            catch (Exception e) { return false; }
        }
        @JavascriptInterface public String fichierDossier() {
            return dossierDoc().getAbsolutePath();
        }
        @JavascriptInterface public String echDossier() {
            return new File(getFilesDir(), "ech").getAbsolutePath();
        }
        @JavascriptInterface public boolean echSauver(String nom, String b64) {
            try {
                File d = new File(getFilesDir(), "ech");
                if (!d.exists() && !d.mkdirs()) return false;
                byte[] o = Base64.decode(b64, Base64.DEFAULT);
                File cible = new File(d, propre(nom) + ".wav");
                File tmp = new File(d, propre(nom) + ".part");
                FileOutputStream f = new FileOutputStream(tmp);
                f.write(o); f.flush(); f.getFD().sync(); f.close();
                if (cible.exists() && !cible.delete()) { tmp.delete(); return false; }
                if (!tmp.renameTo(cible)) { tmp.delete(); return false; }
                return true;
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface public String echCharger(String nom) {
            try {
                File f = new File(new File(getFilesDir(), "ech"), propre(nom) + ".wav");
                if (!f.exists()) return "";
                byte[] o = new byte[(int) f.length()];
                FileInputStream in = new FileInputStream(f);
                int lu = in.read(o); in.close();
                if (lu <= 0) return "";
                return Base64.encodeToString(o, Base64.NO_WRAP);
            } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public String echListe() {
            File d = new File(getFilesDir(), "ech");
            String[] l = d.list();
            if (l == null) return "";
            StringBuilder sb = new StringBuilder();
            for (String n : l) {
                if (!n.endsWith(".wav")) continue;
                if (sb.length() > 0) sb.append("\n");
                sb.append(n.substring(0, n.length() - 4));
            }
            return sb.toString();
        }
        @JavascriptInterface public void echSupprimer(String nom) {
            try { new File(new File(getFilesDir(), "ech"), propre(nom) + ".wav").delete(); } catch (Exception ignored) {}
        }
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
        s.setAllowContentAccess(true);   // nécessaire aux URI content:// du sélecteur de fichiers
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
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
                startService(service);
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
        if (!enLecture) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    public void onBackPressed() {
        finish();
    }

    @Override
    protected void onDestroy() {
        majLecture(false);
        if (midi != null) midi.fermer();
        web.destroy();
        super.onDestroy();
    }
}
