package sa.bas.daily;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.content.Context;
import android.graphics.Color;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.Toast;
import java.nio.charset.StandardCharsets;
import java.io.OutputStream;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
  private static final int REQ_OPEN_FILE=501, REQ_SAVE_FILE=502;
  private static final String ORIGIN="appassets.androidplatform.net";
  private WebView web;
  private ValueCallback<Uri[]> fileChooserCallback;
  private String pendingJSON;
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getWindow().setStatusBarColor(Color.rgb(6,19,33));
    getWindow().setNavigationBarColor(Color.rgb(6,19,33));
    web=new WebView(this);
    setContentView(web);
    final WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
        .setDomain(ORIGIN)
        .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this))
        .build();
    WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDefaultTextEncodingName("UTF-8");
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(true);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    s.setSupportMultipleWindows(false);
    web.addJavascriptInterface(new Bridge(this),"Android");
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
        return loader.shouldInterceptRequest(request.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
        Uri u=request.getUrl();
        if("https".equalsIgnoreCase(u.getScheme())&&ORIGIN.equals(u.getHost()))return false;
        return openExternal(u);
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
        if(fileChooserCallback!=null)fileChooserCallback.onReceiveValue(null);
        fileChooserCallback=callback;
        Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pick.setType("*/*");
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        try{startActivityForResult(pick,REQ_OPEN_FILE);}
        catch(Exception ex){fileChooserCallback=null;return false;}
        return true;
      }
    });
    web.loadUrl("https://"+ORIGIN+"/assets/index.html");
  }
  private boolean openExternal(Uri uri){
    String scheme=uri.getScheme();
    if(!("https".equalsIgnoreCase(scheme)||"http".equalsIgnoreCase(scheme)||"mailto".equalsIgnoreCase(scheme)||"tel".equalsIgnoreCase(scheme)))return true;
    try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ex){Toast.makeText(this,"تعذر فتح الرابط",Toast.LENGTH_SHORT).show();}
    return true;
  }
  public final class Bridge {
    final Context ctx;
    Bridge(Context c){ctx=c;}
    @JavascriptInterface public void saveText(String name,String body){
      runOnUiThread(()->{
        pendingJSON=body;
        Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("application/json");
        i.putExtra(Intent.EXTRA_TITLE,name.replace('/','_'));
        try{startActivityForResult(i,REQ_SAVE_FILE);}catch(Exception e){Toast.makeText(ctx,"تعذر حفظ الملف",Toast.LENGTH_SHORT).show();}
      });
    }
    @JavascriptInterface public void openWeb(String url){
      runOnUiThread(()->{try{openExternal(Uri.parse(url));}catch(Exception ignored){}});
    }
  }
  @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
    super.onActivityResult(requestCode,resultCode,data);
    if(requestCode==REQ_OPEN_FILE){
      if(fileChooserCallback!=null){Uri uri=(resultCode==RESULT_OK&&data!=null)?data.getData():null;
        fileChooserCallback.onReceiveValue(uri==null?null:new Uri[]{uri});fileChooserCallback=null;}
    }else if(requestCode==REQ_SAVE_FILE){
      if(resultCode==RESULT_OK&&data!=null&&data.getData()!=null&&pendingJSON!=null){
        try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
          if(out!=null)out.write(pendingJSON.getBytes(StandardCharsets.UTF_8));
          Toast.makeText(this,"تم حفظ النسخة",Toast.LENGTH_SHORT).show();
        }catch(Exception e){Toast.makeText(this,"تعذر إكمال الحفظ",Toast.LENGTH_LONG).show();}
      }pendingJSON=null;
    }
  }
  @Override public void onBackPressed(){
    if(web!=null&&web.canGoBack())web.goBack();
    else super.onBackPressed();
  }
  @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("Android");web.destroy();web=null;}super.onDestroy();}
}
