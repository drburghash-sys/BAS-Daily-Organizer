package sa.bas.daily;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

/** Native settings per widget instance. No risky file or data permissions. */
public class WidgetConfigActivity extends Activity {
  int widgetId;
  EditText bg,fg,accent;
  Spinner font,rows;
  SeekBar opacity,size;
  CheckBox prayers;
  ImageView preview;
  final String[] families={"sans-serif","sans-serif-condensed","serif","monospace"};
  final String[] rowValues={"3","4","5","6","7","8"};

  @Override public void onCreate(Bundle state){
    super.onCreate(state);
    setResult(RESULT_CANCELED);
    widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
    if(widgetId==AppWidgetManager.INVALID_APPWIDGET_ID){finish();return;}
    SharedPreferences p=getSharedPreferences(BasWidgetProvider.STYLE_PREFS,MODE_PRIVATE);
    String suffix="_"+widgetId;
    ScrollView scroll=new ScrollView(this);
    scroll.setFillViewport(true);
    LinearLayout col=new LinearLayout(this);col.setOrientation(LinearLayout.VERTICAL);
    col.setPadding(24,24,24,35);col.setBackgroundColor(Color.rgb(7,20,34));
    scroll.addView(col);
    TextView header=label("تخصيص ويجت BAS | منظم يومي",21);header.setTextColor(Color.rgb(231,196,137));col.addView(header);
    TextView hint=label("الويجت يعرض مهام اليوم، ويُحدَّث من تطبيق BAS المثبت على الجهاز.",14);col.addView(hint);

    bg=field(col,"لون الخلفية (HEX)",p.getString("bg"+suffix,"#0B1F31"));
    fg=field(col,"لون الكتابة (HEX)",p.getString("fg"+suffix,"#F8F5EA"));
    accent=field(col,"لون عنوان BAS والشريط (HEX)",p.getString("accent"+suffix,"#E4B86E"));

    labelInto(col,"نوع الخط");
    font=new Spinner(this);
    String[] fontTitles={"افتراضي","كوفي مبسط","نسخ (Serif)","أحادي العرض"};
    ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_item,fontTitles);
    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
    font.setAdapter(adapter);col.addView(font);
    String savedFont=p.getString("font"+suffix,"sans-serif");
    for(int i=0;i<families.length;i++)if(savedFont.equals(families[i]))font.setSelection(i);

    labelInto(col,"حجم الخط (من ٧٠٪ إلى ١٨٠٪)");
    size=new SeekBar(this);size.setMax(110);size.setProgress(Math.max(0,Math.min(110,p.getInt("size"+suffix,110)-70)));
    col.addView(size);
    TextView sizeLabel=label("حجم الخط الحالي: "+(size.getProgress()+70)+"٪",14);
    col.addView(sizeLabel);
    size.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
      @Override public void onProgressChanged(SeekBar bar,int progress,boolean fromUser){sizeLabel.setText("حجم الخط الحالي: "+(progress+70)+"٪");}
      @Override public void onStartTrackingTouch(SeekBar bar){}
      @Override public void onStopTrackingTouch(SeekBar bar){}
    });
    labelInto(col,"شفافية الخلفية");
    opacity=new SeekBar(this);opacity.setMax(235);opacity.setProgress(Math.max(0,Math.min(235,p.getInt("alpha"+suffix,225)-20)));
    col.addView(opacity);

    labelInto(col,"عدد المهام المعروضة (حسب حجم الويجت)");
    rows=new Spinner(this);
    ArrayAdapter<String> nums=new ArrayAdapter<>(this,android.R.layout.simple_spinner_item,rowValues);
    nums.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
    rows.setAdapter(nums);rows.setSelection(Math.max(0,Math.min(5,p.getInt("rows"+suffix,5)-3)));col.addView(rows);

    prayers=new CheckBox(this);prayers.setText("إظهار الصلوات ضمن الأعمال");
    prayers.setTextColor(Color.WHITE);prayers.setChecked(p.getBoolean("prayer"+suffix,false));
    col.addView(prayers);

    preview=new ImageView(this);
    preview.setAdjustViewBounds(true);
    float density=getResources().getDisplayMetrics().density;
    preview.setImageBitmap(BasWidgetProvider.render(this,widgetId,Math.round(345*density),Math.round(215*density)));
    LinearLayout.LayoutParams imgParam=new LinearLayout.LayoutParams(-1,270);imgParam.topMargin=16;
    col.addView(preview,imgParam);

    Button save=new Button(this);save.setText("حفظ إعدادات الويجت");
    save.setAllCaps(false);
    save.setOnClickListener(v->save());
    col.addView(save);
    Button open=new Button(this);open.setText("فتح منظم BAS لإظهار المهام");
    open.setAllCaps(false);open.setOnClickListener(v->startActivity(new Intent(this,MainActivity.class)));
    col.addView(open);
    setContentView(scroll);
  }

  private TextView label(String s,int sp){
    TextView t=new TextView(this);t.setText(s);t.setTextSize(sp);
    t.setTextColor(Color.WHITE);t.setGravity(Gravity.RIGHT);t.setPadding(0,9,0,8);
    return t;
  }
  private void labelInto(LinearLayout p,String title){p.addView(label(title,15));}
  private EditText field(LinearLayout p,String name,String value){
    labelInto(p,name);
    EditText e=new EditText(this);e.setSingleLine(true);e.setText(value);
    e.setTextColor(Color.WHITE);e.setHintTextColor(Color.LTGRAY);
    e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);
    e.setGravity(Gravity.RIGHT);
    p.addView(e);return e;
  }
  private static String validHex(EditText input){
    String str=input.getText().toString().trim();
    if(!str.startsWith("#"))str="#"+str;
    if(!str.matches("#[0-9a-fA-F]{6}"))throw new IllegalArgumentException("اللون يجب أن يكون مثل #112233");
    return str.toUpperCase(java.util.Locale.US);
  }
  private void save(){
    String bgColor,fgColor,accentColor;
    try{bgColor=validHex(bg);fgColor=validHex(fg);accentColor=validHex(accent);}
    catch(Exception e){Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();return;}
    String suffix="_"+widgetId;
    getSharedPreferences(BasWidgetProvider.STYLE_PREFS,MODE_PRIVATE).edit()
      .putString("bg"+suffix,bgColor)
      .putString("fg"+suffix,fgColor)
      .putString("accent"+suffix,accentColor)
      .putString("font"+suffix,families[font.getSelectedItemPosition()])
      .putInt("size"+suffix,size.getProgress()+70)
      .putInt("alpha"+suffix,opacity.getProgress()+20)
      .putInt("rows"+suffix,Integer.parseInt(rowValues[rows.getSelectedItemPosition()]))
      .putBoolean("prayer"+suffix,prayers.isChecked())
      .apply();
    AppWidgetManager manager=AppWidgetManager.getInstance(this);
    BasWidgetProvider.update(this,manager,widgetId);
    Intent result=new Intent();
    result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId);
    setResult(RESULT_OK,result);
    finish();
  }
}
