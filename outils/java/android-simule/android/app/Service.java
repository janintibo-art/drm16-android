package android.app;
import android.content.*; import android.os.*;
public abstract class Service extends Context {
 public static final int START_NOT_STICKY=2, START_STICKY=1, STOP_FOREGROUND_REMOVE=1;
 public void onCreate(){} public void onDestroy(){}
 public int onStartCommand(Intent i,int f,int s){return 0;}
 public abstract IBinder onBind(Intent i);
 public final void startForeground(int id, Notification n){}
 public final void startForeground(int id, Notification n, int t){}
 public final void stopForeground(boolean b){} public final void stopForeground(int f){}
 public final void stopSelf(){}
}
