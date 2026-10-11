package sa.bas.daily;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.TextPaint;
import android.text.TextUtils;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Standalone Android homescreen widget. No Internet or background personal-data upload. */
public class BasWidgetProvider extends AppWidgetProvider {
  public static final String DATA_PREFS = "bas_widget_data";
  public static final String STYLE_PREFS = "bas_widget_style";
  public static final String KEY_SNAPSHOT = "snapshot";

  @Override public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
    for (int id : ids) update(context, mgr, id);
  }
  @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager mgr, int id, Bundle opts) {
    super.onAppWidgetOptionsChanged(context, mgr, id, opts);
    update(context, mgr, id);
  }
  @Override public void onDeleted(Context context, int[] ids) {
    SharedPreferences.Editor editor=context.getSharedPreferences(STYLE_PREFS,Context.MODE_PRIVATE).edit();
    for(int id:ids) for(String name:new String[]{"bg","fg","accent","alpha","font","size","rows","prayer"}) editor.remove(name+"_"+id);
    editor.apply();
  }
  public static void refresh(Context context){
    AppWidgetManager mgr=AppWidgetManager.getInstance(context);
    int[] ids=mgr.getAppWidgetIds(new ComponentName(context,BasWidgetProvider.class));
    for(int id:ids)update(context,mgr,id);
  }
  public static void update(Context context,AppWidgetManager manager,int widgetId){
    Bundle opts=manager.getAppWidgetOptions(widgetId);
    float density=context.getResources().getDisplayMetrics().density;
    int widthDp=opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,286);
    int heightDp=opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,192);
    // AppWidgetManager gives dp; build a real physical-pixel bitmap instead of
    // limiting it to 510 x 360px and stretching it on high-density phones.
    int width=Math.max(1,Math.round(Math.max(200,Math.min(650,widthDp))*density));
    int height=Math.max(1,Math.round(Math.max(120,Math.min(690,heightDp))*density));
    RemoteViews views=new RemoteViews(context.getPackageName(),R.layout.bas_widget);
    views.setImageViewBitmap(R.id.widget_image,render(context,widgetId,width,height));
    Intent launch=new Intent(context,MainActivity.class);
    launch.setAction("sa.bas.daily.OPEN_WIDGET_"+widgetId);
    launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent click=PendingIntent.getActivity(context,widgetId,launch,
        PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    views.setOnClickPendingIntent(R.id.widget_image,click);
    Intent settings=new Intent(context,WidgetConfigActivity.class);
    settings.setAction("sa.bas.daily.WIDGET_SETTINGS_"+widgetId);
    settings.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId);
    PendingIntent gear=PendingIntent.getActivity(context,500000+widgetId,settings,
        PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    views.setOnClickPendingIntent(R.id.widget_settings,gear);
    views.setContentDescription(R.id.widget_image,"BAS منظم يومي: اضغط لعرض الجدول والمهام");
    views.setContentDescription(R.id.widget_settings,"فتح إعدادات هذا الويجت");
    manager.updateAppWidget(widgetId,views);
  }
  private static int parseColor(SharedPreferences prefs,String key,int fallback){
    try {return Color.parseColor(prefs.getString(key,String.format(Locale.US,"#%06X",fallback&0xFFFFFF)));}
    catch(Exception e){return fallback;}
  }
  private static String shortDate(){
    return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());
  }
  private static String trimmed(String value,TextPaint p,float maxPx){
    return TextUtils.ellipsize(value,p,Math.max(30,maxPx),TextUtils.TruncateAt.END).toString();
  }

  /** All positions use dp and all fonts use sp (scaledDensity). */
  public static Bitmap render(Context context,int widgetId,int w,int h){
    final android.util.DisplayMetrics metrics=context.getResources().getDisplayMetrics();
    final float dp=metrics.density, sp=metrics.scaledDensity;
    final SharedPreferences style=context.getSharedPreferences(STYLE_PREFS,Context.MODE_PRIVATE);
    final String suffix="_"+widgetId;
    final int bg=parseColor(style,"bg"+suffix,Color.rgb(11,31,49));
    final int fg=parseColor(style,"fg"+suffix,Color.rgb(248,245,234));
    final int accent=parseColor(style,"accent"+suffix,Color.rgb(228,184,110));
    final int alpha=Math.max(20,Math.min(255,style.getInt("alpha"+suffix,225)));
    final float scale=Math.max(.70f,Math.min(1.80f,style.getInt("size"+suffix,110)/100f));
    final String family=style.getString("font"+suffix,"sans-serif");
    final int preferredRows=Math.max(2,Math.min(8,style.getInt("rows"+suffix,5)));
    final boolean includePrayer=style.getBoolean("prayer"+suffix,false);
    Bitmap bitmap=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
    Canvas canvas=new Canvas(bitmap);
    Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    paint.setColor(Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)));
    canvas.drawRoundRect(new RectF(dp,dp,w-dp,h-dp),20*dp,20*dp,paint);
    paint.setColor(accent);
    paint.setStrokeWidth(1.5f*dp);
    paint.setStyle(Paint.Style.STROKE);
    canvas.drawRoundRect(new RectF(2*dp,2*dp,w-2*dp,h-2*dp),20*dp,20*dp,paint);
    paint.setStyle(Paint.Style.FILL);

    float left=15*dp, right=w-left;
    TextPaint tp=new TextPaint(Paint.ANTI_ALIAS_FLAG|Paint.SUBPIXEL_TEXT_FLAG);
    tp.setTextAlign(Paint.Align.RIGHT);
    Typeface regular=Typeface.create(family,Typeface.NORMAL);
    Typeface bold=Typeface.create(family,Typeface.BOLD);

    tp.setTypeface(bold);tp.setColor(accent);tp.setTextSize(19*scale*sp);
    // Leave the leftmost 52dp free for the real, clickable settings gear.
    canvas.drawText(trimmed("BAS | منظم يومي",tp,w-2*left-54*dp),
       right,32*dp,tp);

    JSONObject day=null;
    try{
      String snapshot=context.getSharedPreferences(DATA_PREFS,Context.MODE_PRIVATE)
          .getString(KEY_SNAPSHOT,"");
      JSONArray arr=new JSONObject(snapshot).optJSONArray("days");
      if(arr!=null)for(int i=0;i<arr.length();i++){
        JSONObject candidate=arr.optJSONObject(i);
        if(candidate!=null&&shortDate().equals(candidate.optString("date"))){
          day=candidate;break;
        }
      }
    }catch(Exception ignored){}
    if(day==null){
      tp.setTypeface(regular);tp.setColor(fg);tp.setTextSize(15.5f*scale*sp);
      canvas.drawText(trimmed("افتح تطبيق BAS لتحديث الأعمال",tp,w-2*left),
          right,Math.max(h/2f,69*dp),tp);
      return bitmap;
    }

    String date=day.optString("label","اليوم");
    int completed=day.optInt("done",0),total=day.optInt("total",0);
    tp.setTypeface(regular);tp.setColor(fg);tp.setTextSize(13.5f*scale*sp);
    canvas.drawText(trimmed(date,tp,w-2*left),right,56*dp,tp);
    tp.setTypeface(bold);tp.setColor(accent);tp.setTextSize(14f*scale*sp);
    canvas.drawText("الإنجاز: "+completed+" / "+total,right,80*dp,tp);

    float trackTop=88*dp,trackHeight=4*dp;
    paint.setColor(Color.argb(85,Color.red(fg),Color.green(fg),Color.blue(fg)));
    canvas.drawRoundRect(new RectF(left,trackTop,w-left,trackTop+trackHeight),
        trackHeight/2,trackHeight/2,paint);
    paint.setColor(accent);
    float fraction=total<=0?0f:Math.max(0f,Math.min(1f,(float)completed/total));
    canvas.drawRoundRect(new RectF(left,trackTop,left+(w-2*left)*fraction,trackTop+trackHeight),
        trackHeight/2,trackHeight/2,paint);

    JSONArray items=day.optJSONArray("items");
    tp.setColor(fg);tp.setTypeface(regular);
    tp.setTextSize(17f*scale*sp);
    float first=119*dp;
    float rowHeight=Math.max(34*dp,tp.getFontSpacing()*1.17f);
    int maxFit=Math.max(0,(int)Math.floor((h-first-9*dp)/rowHeight)+1);
    int allowed=Math.min(preferredRows,maxFit);
    int shown=0;
    int n=items==null?0:items.length();
    for(int i=0;i<n&&shown<allowed;i++){
      JSONObject task=items.optJSONObject(i);
      if(task==null || (!includePrayer&&task.optBoolean("prayer",false)))continue;
      String mark=task.optBoolean("done",false)?"✓":"○";
      String title=task.optString("title","مهمة").replace('\n',' ').replace('\r',' ');
      String time=task.optString("time","");
      String line=mark+"  "+time+"  "+title;
      canvas.drawText(trimmed(line,tp,w-2*left),right,first+shown*rowHeight,tp);
      shown++;
    }
    if(shown==0&&allowed>0){
      tp.setTextSize(14*scale*sp);
      canvas.drawText("لا توجد أعمال مسجلة لهذا اليوم",right,first,tp);
    }
    return bitmap;
  }
}
