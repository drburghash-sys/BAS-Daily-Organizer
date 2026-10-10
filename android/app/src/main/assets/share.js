// مشاركة جدول التاريخ المختار فقط؛ لا تُرسل أي بيانات إلا عند ضغط المستخدم زر المشاركة.
function buildDayShareText(date=selected){
 const plan=dailyPlan(date);
 const readable=new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(fromISO(date));
 const checks=plan.events.filter(e=>e.check);
 const completed=checks.filter(e=>isDone(date,e)).length;
 const lines=[`📅 *جدول ${readable}*`,`التاريخ الميلادي: ${date}`,plan.oncall?'🩺 يوم مناوبة':null,`الإنجاز: ${fmtNum(completed)} من ${fmtNum(checks.length)}`,'━━━━━━━━━━━━'];
 if(!plan.events.length)lines.push('لا توجد أعمال مجدولة لهذا التاريخ.');
 for(const e of plan.events){
  const mark=!e.check?'🕒':(isDone(date,e)?'✅':'☐');
  const title=String(e.title||'نشاط').replace(/[\r\n]+/g,' ').trim();
  lines.push(`${mark} ${clock(e.start)} - ${clock(e.end)} | ${title}`);
  if(e.desc&& !['prayer','work','rest'].includes(e.kind))lines.push(`   ${String(e.desc).replace(/[\r\n]+/g,' ').trim()}`);
 }
 const finishedCustom=state.custom.filter(t=>t.date===date&&t.done);
 if(finishedCustom.length){lines.push('','✅ *مهام إضافية مكتملة:*');for(const t of finishedCustom)lines.push(`• ${String(t.title||'مهمة').replace(/[\r\n]+/g,' ').trim()}`)}
 if(plan.unscheduled.length){lines.push('','📌 *أعمال لم تتسع لها الخطة:*');for(const item of plan.unscheduled)lines.push('• '+String(item).replace(/[\r\n]+/g,' ').trim())}
 if(PRAYERS.some(([p])=>!state.prayers[date]?.times?.[p]))lines.push('','⚠️ مواقيت الصلاة غير مكتملة لهذا التاريخ.');
 lines.push('','— BAS | منظم يومي');
 return lines.filter(v=>v!==null).join('\n');
}
function shareSelectedDayWhatsApp(){
 const url='https://api.whatsapp.com/send?text='+encodeURIComponent(buildDayShareText(selected));
 if(window.Android&&typeof window.Android.openWeb==='function'){window.Android.openWeb(url);return;}
 const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();a.remove();
}
async function copySelectedDay(){
 const value=buildDayShareText(selected);
 try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(value);showToast('نُسخ جدول التاريخ المختار');}
 catch(error){const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const ok=document.execCommand('copy');field.remove();showToast(ok?'نُسخ جدول التاريخ المختار':'تعذّر النسخ؛ استخدم مشاركة واتساب');}
}
