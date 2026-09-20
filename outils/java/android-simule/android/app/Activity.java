package android.app;
import android.content.*; import android.os.*; import android.view.*;
public class Activity extends Context {
 public static final int RESULT_OK = -1, RESULT_CANCELED = 0;
 protected void onCreate(Bundle b){} protected void onResume(){} protected void onPause(){} protected void onDestroy(){}
 protected void onActivityResult(int a,int b,Intent c){}
 public void onRequestPermissionsResult(int r, String[] p, int[] g){}
 public void onBackPressed(){} public void onWindowFocusChanged(boolean h){}
 public void finish(){} public boolean moveTaskToBack(boolean b){return true;}
 public Window getWindow(){return null;}
 public void setContentView(View v){}
 public final void requestPermissions(String[] p,int r){}
 public final void runOnUiThread(Runnable r){}
 public boolean isFinishing(){return false;}
}
