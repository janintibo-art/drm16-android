package fr.tibo.drm16;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

/**
 * Service de premier plan : tant qu'il tourne, le systeme laisse le processus vivant
 * et la WebView continue de jouer le rythme, application quittee.
 * Il ne produit aucun son lui-meme, tout reste dans la page.
 */
public class PlaybackService extends Service {

    private static final String CANAL = "drm16.lecture";
    private static final int ID = 1;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null && nm.getNotificationChannel(CANAL) == null) {
                NotificationChannel canal = new NotificationChannel(
                        CANAL, "Lecture", NotificationManager.IMPORTANCE_LOW);
                canal.setShowBadge(false);
                canal.enableVibration(false);
                nm.createNotificationChannel(canal);
            }
        }

        /* minSdk 24 : FLAG_IMMUTABLE (API 23) existe sur tous les appareils pris en charge. */
        int drapeaux = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        Intent retour = new Intent(this, MainActivity.class);
        retour.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, retour, drapeaux);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            b = new Notification.Builder(this, CANAL);
        } else {
            b = new Notification.Builder(this);
        }
        Notification n = b
                .setContentTitle("DRM16")
                .setContentText("Rythme en cours")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(pi)
                .setOngoing(true)
                .build();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(ID, n);
            }
        } catch (Exception e) {
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        try {
            stopForeground(true);
        } catch (Exception ignored) {
        }
        super.onDestroy();
    }
}
