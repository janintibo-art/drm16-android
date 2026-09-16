package android.webkit;
import android.net.Uri;
public class WebChromeClient {
 public static abstract class FileChooserParams { public static Uri[] parseResult(int r, android.content.Intent d){return null;}
  public abstract android.content.Intent createIntent(); public abstract String[] getAcceptTypes(); public abstract int getMode(); }
 public void onPermissionRequest(PermissionRequest r){}
 public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> c, FileChooserParams p){return false;}
 public boolean onConsoleMessage(ConsoleMessage m){return false;} }
