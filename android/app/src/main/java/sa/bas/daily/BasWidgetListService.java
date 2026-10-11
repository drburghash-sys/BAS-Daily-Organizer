package sa.bas.daily;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.text.style.TypefaceSpan;
import android.util.TypedValue;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;

/** Scrollable, unlimited task collection for each Android homescreen widget. */
public class BasWidgetListService extends RemoteViewsService {
  @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
    int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
        AppWidgetManager.INVALID_APPWIDGET_ID);
    return new DayFactory(getApplicationContext(),id);
  }

  private static class DayFactory implements RemoteViewsFactory {
    private final Context context;
    private final int widgetId;
    private final ArrayList<JSONObject> tasks=new ArrayList<>();
    private int textColor=Color.rgb(248,245,234);
    private int accentColor=Color.rgb(228,184,110);
    private int percent=110;
    private String family="sans-serif";

    DayFactory(Context c,int id){context=c;widgetId=id;}
    @Override public void onCreate(){onDataSetChanged();}
    @Override public void onDataSetChanged(){
      tasks.clear();
      SharedPreferences style=context.getSharedPreferences(BasWidgetProvider.STYLE_PREFS,Context.MODE_PRIVATE);
      String suffix="_"+widgetId;
      textColor=BasWidgetProvider.parseColor(style,"fg"+suffix,Color.rgb(248,245,234));
      accentColor=BasWidgetProvider.parseColor(style,"accent"+suffix,Color.rgb(228,184,110));
      percent=Math.max(70,Math.min(180,style.getInt("size"+suffix,110)));
      family=style.getString("font"+suffix,"sans-serif");
      boolean showPrayers=style.getBoolean("prayer"+suffix,true);
      try{
        String saved=context.getSharedPreferences(BasWidgetProvider.DATA_PREFS,Context.MODE_PRIVATE)
            .getString(BasWidgetProvider.KEY_SNAPSHOT,"");
        JSONObject root=new JSONObject(saved);
        JSONArray days=root.optJSONArray("days");
        String today=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());
        if(days==null)return;
        for(int i=0;i<days.length();i++){
          JSONObject day=days.optJSONObject(i);
          if(day==null||!today.equals(day.optString("date")))continue;
          JSONArray entries=day.optJSONArray("items");
          if(entries==null)return;
          for(int j=0;j<entries.length();j++){
            JSONObject task=entries.optJSONObject(j);
            if(task==null)continue;
            if(!showPrayers&&task.optBoolean("prayer",false))continue;
            tasks.add(task);
          }
          break;
        }
      }catch(Exception ignored){}
    }
    @Override public void onDestroy(){tasks.clear();}
    @Override public int getCount(){return tasks.size();}
    @Override public int getViewTypeCount(){return 1;}
    @Override public long getItemId(int position){return position;}
    @Override public boolean hasStableIds(){return false;}
    @Override public RemoteViews getLoadingView(){return null;}

    @Override public RemoteViews getViewAt(int position){
      if(position<0||position>=tasks.size())return null;
      JSONObject item=tasks.get(position);
      boolean completed=item.optBoolean("done",false);
      boolean fixed=!item.optBoolean("check",true);
      boolean unscheduled=item.optBoolean("unscheduled",false);
      String mark=unscheduled?"⚠":fixed?"◷":completed?"✓":"○";
      String time=item.optString("time","");
      String title=item.optString("title","عمل");
      String line=mark+"  "+(time.isEmpty()?"":time+"  ")+title;
      SpannableString styled=new SpannableString(line);
      styled.setSpan(new TypefaceSpan(family),0,styled.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
      if(!time.isEmpty()){
        int start=mark.length()+2;
        int end=Math.min(styled.length(),start+time.length());
        styled.setSpan(new StyleSpan(android.graphics.Typeface.BOLD),start,end,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
      }
      RemoteViews row=new RemoteViews(context.getPackageName(),R.layout.bas_widget_row);
      row.setTextViewText(R.id.widget_row_text,styled);
      row.setTextViewTextSize(R.id.widget_row_text,TypedValue.COMPLEX_UNIT_SP,
          16f*(percent/100f));
      row.setTextColor(R.id.widget_row_text,unscheduled?accentColor:textColor);
      Intent open=new Intent();
      open.putExtra("date",new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date()));
      row.setOnClickFillInIntent(R.id.widget_row_text,open);
      return row;
    }
  }
}
