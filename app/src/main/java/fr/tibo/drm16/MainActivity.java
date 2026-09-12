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
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * DRM16 : recreation autonome.
 * L'appareil complet (interface et moteur audio) tient dans assets/drm16.html.
 * Aucune requete reseau n'est autorisee : tout ce qui n'est pas file:///android_asset/ est bloque.
 */
public class MainActivity extends Activity {

    private static final String PAGE = "file:///android_asset/drm16.html";

    private WebView web;
    private AudioManager audio;
    private AudioFocusRequest demande;
    private boolean enLecture;
    private boolean permissionDemandee;

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

    /** Appele par la page quand la lecture demarre ou s'arrete. */
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
        s.setAllowContentAccess(false);
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
            prendreFocus();
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

    private void prendreFocus() {
        if (audio == null) audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            demande = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributs)
                    .setOnAudioFocusChangeListener(ecouteFocus)
                    .build();
            audio.requestAudioFocus(demande);
        } else {
            audio.requestAudioFocus(ecouteFocus, AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN);
        }
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
        web.destroy();
        super.onDestroy();
    }
}
