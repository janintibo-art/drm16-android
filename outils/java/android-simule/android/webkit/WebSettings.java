package android.webkit;
public abstract class WebSettings { public static final int LOAD_NO_CACHE=2, LOAD_DEFAULT=-1, MIXED_CONTENT_NEVER_ALLOW=1;
 public void setAllowContentAccess(boolean b){} public void setAllowFileAccess(boolean b){} public void setAllowFileAccessFromFileURLs(boolean b){}
 public void setAllowUniversalAccessFromFileURLs(boolean b){}
 public void setBuiltInZoomControls(boolean b){} public void setDisplayZoomControls(boolean b){} public void setDomStorageEnabled(boolean b){}
 public void setJavaScriptEnabled(boolean b){} public void setLoadWithOverviewMode(boolean b){} public void setMediaPlaybackRequiresUserGesture(boolean b){}
 public void setSafeBrowsingEnabled(boolean b){} public void setSupportZoom(boolean b){} public void setUseWideViewPort(boolean b){}
 public void setCacheMode(int m){} public void setMixedContentMode(int m){} public void setTextZoom(int t){} public void setDatabaseEnabled(boolean b){} }
