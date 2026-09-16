package android.webkit;
import android.content.Context;
public class WebView extends android.view.ViewGroup { public WebView(Context c){super(c);}
 public void addJavascriptInterface(Object o,String n){} public void removeJavascriptInterface(String n){}
 public void destroy(){} public void evaluateJavascript(String s, ValueCallback<String> c){}
 public WebSettings getSettings(){return null;} public String getUrl(){return null;} public void loadUrl(String u){}
 public void onPause(){} public void onResume(){} public void stopLoading(){} public void reload(){}
 public void setWebChromeClient(WebChromeClient c){} public void setWebViewClient(WebViewClient c){}
 public boolean canGoBack(){return false;} public void goBack(){}
 public static void setWebContentsDebuggingEnabled(boolean b){} }
