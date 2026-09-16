package android.content;
public abstract class Context {
 public static final String AUDIO_SERVICE="audio", MIDI_SERVICE="midi";
 public Object getSystemService(String n){return null;}
 public <T> T getSystemService(Class<T> c){return null;}
 public android.content.pm.PackageManager getPackageManager(){return null;}
 public java.io.File getFilesDir(){return null;}
 public java.io.File getExternalFilesDir(String t){return null;}
 public int checkSelfPermission(String p){return 0;}
 public android.content.ComponentName startService(Intent i){return null;}
 public android.content.ComponentName startForegroundService(Intent i){return null;}
 public boolean stopService(Intent i){return true;}
 public void startActivityForResult(Intent i,int r){}
 public android.content.Context getApplicationContext(){return this;}
 public String getPackageName(){return "";}
}
