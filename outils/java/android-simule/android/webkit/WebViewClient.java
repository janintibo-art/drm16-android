package android.webkit;
public class WebViewClient {
 public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r){return false;}
 public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r){return null;}
 public void onPageFinished(WebView v, String u){} }
