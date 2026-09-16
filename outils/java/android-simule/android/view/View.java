package android.view;
public class View { public static final int OVER_SCROLL_NEVER=2, SYSTEM_UI_FLAG_HIDE_NAVIGATION=2,
 SYSTEM_UI_FLAG_IMMERSIVE_STICKY=4096, SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION=512, SYSTEM_UI_FLAG_LAYOUT_STABLE=256,
 SYSTEM_UI_FLAG_FULLSCREEN=4, SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN=1024;
 public View(android.content.Context c){} public void setSystemUiVisibility(int v){} public void setOverScrollMode(int m){}
 public void setBackgroundColor(int c){} public void setKeepScreenOn(boolean b){} public boolean post(Runnable r){return true;} }
