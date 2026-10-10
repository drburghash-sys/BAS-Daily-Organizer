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
    int width=Math.min(510,Math.max(285,Math.round(widthDp*density)));
    int height=Math.min(360,Math.max(160,Math.round(heightDp*density)));
    RemoteViews views=new RemoteViews(context.getPackageName(),R.layout.bas_widget);
    views.setImageViewBitmap(R.id.widget_image,render(context,widgetId,width,height));
    Intent launch=new Intent(context,MainActivity.class);
    launch.setAction("sa.bas.daily.OPEN_WIDGET_"+widgetId);
    launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent click=PendingIntent.getActivity(context,widgetId,launch,
        PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    views.setOnClickPendingIntent(R.id.widget_image,click);
    views.setContentDescription(R.id.widget_image,"BAS منظم يومي: اضغط لعرض الجدول والمهام");
    manager.updateAppWidget(widgetId,views);
  }
  private static int parseColor(SharedPreferences prefs,String key,int fallback){
    try {return Color.parseColor(prefs.getString(key,String.format(Locale.US,"#%06X",fallback&0xFFFFFF)));}
    catch(Exception e){return fallback;}
  }
  private static String shortDate(){
    return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());
  }
  public static Bitmap render(Context context,int widgetId,int w,int h){
    final SharedPreferences style=context.getSharedPreferences(STYLE_PREFS,Context.MODE_PRIVATE);
    final String suffix="_"+widgetId;
    final int bg=parseColor(style,"bg"+suffix,Color.rgb(11,31,49));
    final int fg=parseColor(style,"fg"+suffix,Color.rgb(248,245,234));
    final int accent=parseColor(style,"accent"+suffix,Color.rgb(228,184,110));
    final int alpha=Math.max(20,Math.min(255,style.getInt("alpha"+suffix,225)));
    final float scale=Math.max(.78f,Math.min(1.35f,style.getInt("size"+suffix,100)/100f));
    final String font=style.getString("font"+suffix,"sans-serif");
    final int preferredRows=Math.max(2,Math.min(8,style.getInt("rows"+suffix,5)));
    final boolean includePrayer=style.getBoolean("prayer"+suffix,false);

    Bitmap bitmap=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
    Canvas canvas=new Canvas(bitmap);
    Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
    p.setColor(Color.argb(alpha,Color.red(bg),Color.green(bg),Color.blue(bg)));
    canvas.drawRoundRect(new RectF(1,1,w-1,h-1),22,22,p);
    p.setColor(accent);p.setStrokeWidth(2);p.setStyle(Paint.Style.STROKE);
    canvas.drawRoundRect(new RectF(2,2,w-2,h-2),22,22,p);
    p.setStyle(Paint.Style.FILL);
    float inset=17f, right=w-inset;
    Typeface regular=Typeface.create(font,Typeface.NORMAL);
    Typeface bold=Typeface.create(font,Typeface.BOLD);
    TextPaint tp=new TextPaint(Paint.ANTI_ALIAS_FLAG|Paint.SUBPIXEL_TEXT_FLAG);
    tp.setTextAlign(Paint.Align.RIGHT);tp.setTypeface(bold);tp.setColor(accent);
    tp.setTextSize(Math.max(17f,22f*scale));
    canvas.drawText("BAS | منظم يومي",right,31f*scale,tp);

    JSONObject day=null;
    try{
      String str=context.getSharedPreferences(DATA_PREFS,Context.MODE_PRIVATE).getString(KEY_SNAPSHOT,"");
      JSONArray arr=new JSONObject(str).optJSONArray("days");
      if(arr!=null)for(int i=0;i<arr.length();i++){
        JSONObject candidate=arr.optJSONObject(i);
        if(candidate!=null&&shortDate().equals(candidate.optString("date"))){day=candidate;break;}
      }
    }catch(Exception ignored){}
    tp.setTypeface(regular);tp.setColor(fg);tp.setTextSize(Math.max(13f,15f*scale));
    if(day==null){
      canvas.drawText("افتح التطبيق لتحديث مهام اليوم",right,h/2f,tp);
      tp.setTextSize(Math.max(11f,12f*scale));
      canvas.drawText("المهام تظهر هنا بعد فتح تطبيق BAS",right,h/2f+25,tp);
      return bitmap;
    }
    String date=day.optString("label","اليوم");
    int completed=day.optInt("done",0),total=day.optInt("total",0);
    tp.setTextSize(Math.max(12f,13f*scale));tp.setColor(fg);
    canvas.drawText(date,right,51f*scale,tp);
    tp.setColor(accent);tp.setTypeface(bold);
    canvas.drawText("الإنجاز: "+completed+" / "+total,right,70f*scale,tp);
    p.setColor(accent);p.setAlpha(130);
    float progressWidth=(w-inset*2)*(total<=0?0f:Math.min(1f,(float)completed/total));
    canvas.drawRoundRect(new RectF(inset,79f*scale,inset+progressWidth,82f*scale),2,2,p);
    JSONArray items=day.optJSONArray("items");
    int n=items==null?0:items.length();
    float start=99f*scale, rowH=Math.max(20f,24f*scale);
    int fit=Math.max(1,(int)((h-start-12f)/rowH));
    int rows=Math.min(Math.min(preferredRows,fit),n);
    tp.setColor(fg);tp.setTypeface(regular);tp.setTextSize(Math.max(12f,15f*scale));
    int shown=0;
    for(int i=0;i<n&&shown<rows;i++){
      JSONObject task=items.optJSONObject(i);if(task==null)continue;
      if(!includePrayer&&task.optBoolean("prayer",false))continue;
      String status=task.optBoolean("done",false)?"✓":"○";
      String title=task.optString("title","مهمة");
      String time=task.optString("time","");
      String line=status+"  "+time+"  "+title;
      String clipped=TextUtils.ellipsize(line,tp,w-2*inset,TextUtils.TruncateAt.END).toString();
      canvas.drawText(clipped,right,start+shown*rowH,tp);
      shown++;
    }
    if(shown==0){canvas.drawText("لا توجد أعمال مسجلة لهذا اليوم",right,start,tp);}
    return bitmap;
  }
}
