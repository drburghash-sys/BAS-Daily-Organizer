'use strict';
function migrateLegacy(source){
 if(source?.format==='BAS_Unified_V2'&&source.data?.schema===2)return {...fresh(),...source.data};
 if(source?.schema===2)return {...fresh(),...source};
 if(source?.format!=='BAS_Daily_Organizer_1'||!source.modules||!source.planner)throw Error('هذا الملف ليس نسخة BAS شاملة معروفة');
 let out=fresh(),m=source.modules.memo||{},h=source.modules.home||{},c=source.modules.car||{},docs=source.modules.docs||{},old=source.planner||{};
 out.legacyOriginal=source; // Preserve every field of the original backup, including deleted records.
 out.settings={...out.settings,workStart:old.settings?.workStart||'07:30',workEnd:old.settings?.workEnd||'16:00',
   lastHour:old.settings?.bedtime||'22:30',restMinutes:old.settings?.restMinutes??30,city:old.settings?.city||'Tabuk',country:old.settings?.country||'SA'};
 out.prayers=old.prayers||{};
 out.oncalls=(m.oncalls||[]).map(x=>({...x,id:String(x.id||eid('oc'))}));
 const push=(t)=>out.tasks.push(t);
 for(const x of m.items||[]){
   const mapped={id:'memo-'+x.id,title:x.title||'عمل',details:x.details||'',category:x.type==='idea'||x.type==='topic'?'idea':x.type==='followup'?'followup':x.type==='appointment'?'appointment':'task',
    priority:+x.priority||1,date:x.date||x.autoDate||'',time:x.time||'',duration:Math.max(5,(+x.size||2)*10),done:!!x.done,deleted:!!x.deleted,
    created:x.created||'',source:'memo',legacyId:x.id,legacyMeta:{type:x.type,topicId:x.topicId,autoDate:x.autoDate,size:x.size}};
   if(x.deleted)out.archive.push(mapped);else push(mapped);
 }
 for(const x of m.memories||[])push({id:'memory-'+x.id,title:x.text||'معلومة',details:[x.extra,x.link,(x.tags||[]).join(' ')].filter(Boolean).join('\n'),
   category:'memory',priority:1,date:'',time:'',duration:15,done:false,deleted:false,created:x.created||'',source:'memory',legacyMeta:x});
 for(const x of h.items||[])push({id:'home-'+x.id,title:x.title||'صيانة المنزل',details:[x.note,x.owner?'المسؤول: '+x.owner:''].filter(Boolean).join('\n'),
    category:'home',priority:2,date:x.date||'',time:'',duration:30,done:x.status==='done'||x.status==='completed',deleted:false,created:'',source:'home',legacyMeta:x});
 for(const x of old.custom||[])push({id:'custom-'+x.id,title:x.title||'عمل',details:'',category:'task',priority:+x.priority||2,date:x.date||'',time:'',
    duration:+x.minutes||25,done:!!x.done,deleted:false,created:'',source:'custom',legacyMeta:x});
 out.documents={docs:docs.docs||[],sims:docs.sims||[],subs:docs.subs||[],people:docs.people||[],categories:docs.categories||[]};
 out.vehicles=(docs.vehicles||[]).map(x=>({...x,services:[],odometer:x.odometer||0,model:x.model||'',year:x.year||'',plate:x.plate||'',note:x.note||'',renewalHistory:x.renewalHistory||[]}));
 const aliases=s=>String(s||'').replace(/\s+/g,'').replace(/[-_]/g,'').toLocaleLowerCase('ar');
 let unmatched=[];
 for(const x of c.vehicles||[]){
  const match=out.vehicles.find(v=>aliases(v.name)===aliases(x.name));
  if(match){
   Object.assign(match,{model:match.model||x.model,year:match.year||x.year,odometer:match.odometer||x.odometer,
      plate:match.plate||x.plate});
   match.legacyMaintenance=x.maintenance||{};
  }else unmatched.push({name:x.name,sourceId:x.id,hasMaintenance:Object.keys(x.maintenance||{}).length>0});
 }
 for(const svc of c.services||[]){
  let match=out.vehicles.find(v=>v.id===svc.vehicleId||aliases(v.name)===aliases(svc.vehicleName));
  if(match)match.services.push({...svc,id:String(svc.id||eid('svc'))});
 }
 // Import completion information, but DO NOT apply problematic old manual time overrides.
 for(const [date,done] of Object.entries(old.done||{})){
   out.done[date]={};for(const [id,flag] of Object.entries(done)){
     if(id==='quran')out.done[date]['r-quran']=!!flag;
     else if(id.startsWith('prayer:'))out.done[date]['prayer-'+id.slice(7)]=!!flag;
   }
 }
 out.migration={importedAt:new Date().toISOString(),memoRecords:(m.items||[]).length,activeMemo:(m.items||[]).filter(x=>!x.deleted).length,
  deletedMemo:(m.items||[]).filter(x=>x.deleted).length,memories:(m.memories||[]).length,home:(h.items||[]).length,
  custom:(old.custom||[]).length,oncalls:out.oncalls.length,cars:out.vehicles.length,sims:out.documents.sims.length,
  subscriptions:out.documents.subs.length,docs:out.documents.docs.length,unmatchedCars:unmatched,
  oldManualTimes:old.timeOverrides||{},comment:'حُفظت المواعيد اليدوية القديمة في الأرشيف دون تطبيقها تجنبًا لتثبيت أوقات غير مرغوبة'};
 const q=out.routines.find(r=>r.id==='r-quran');if(q&&old.settings?.quranMinutes)q.duration=+old.settings.quranMinutes;
 for(const r of out.routines.filter(r=>['r-jana','r-jumana','r-hikma'].includes(r.id)))if(old.settings?.girlMinutes)r.duration=+old.settings.girlMinutes;
 return out;
}
async function importFile(e){
 const f=e.target.files?.[0];if(!f)return;
 try{
  const value=JSON.parse(await f.text());
  const converted=migrateLegacy(value);
  if(!confirm('استيراد النسخة سيستبدل بيانات البرنامج الجديد الحالية. هل لديك نسخة محفوظة منها؟'))return;
  db=converted;persist();$('importStatus').textContent='تم نقل '+num(db.tasks.length)+' عمل، و'+num(db.vehicles.length)+' سيارات، والوثائق والمناوبات.';
  refresh();showImportReport();go('home');toast('نجح استيراد النسخة بالكامل');
 }catch(error){toast('تعذّر الاستيراد: '+error.message)}
 finally{e.target.value=''}
}
function showImportReport(){
 let m=db.migration,el=$('importReport');
 if(!m){el.textContent='لم تُستورد نسخة شاملة قديمة بعد.';return}
 el.innerHTML=`<div class="entry">سجلات المفكرة الأصلية: ${num(m.memoRecords)} · منها ${num(m.deletedMemo)} محفوظة في الأرشيف. المنقولة الفعالة: ${num(m.activeMemo)}.
 <p>معلومات وأفكار: ${num(m.memories)} · أعمال البيت: ${num(m.home)} · أعمال مضافة: ${num(m.custom)} · مناوبات: ${num(m.oncalls)}</p>
 <p>ملفات السيارات: ${num(m.cars)} · الشرائح: ${num(m.sims)} · الاشتراكات: ${num(m.subscriptions)} · الوثائق: ${num(m.docs)}</p>
 <p>سجلات صيانة سيارات غير مرتبطة: ${num(m.unmatchedCars?.length||0)} (حُفظت في أرشيف النسخة الأصلية، دون تكرار السيارات).</p>
 <p>مواعيد الجدول التي ثبتتها سابقًا محفوظة للرجوع إليها، لكنها لم تُفرض على الجدول الجديد.</p>
 </div>`;
}
function downloadBackup(){
 const data={format:'BAS_Unified_V2',exportedAt:new Date().toISOString(),data:db};
 const name='BAS_Unified_Backup_'+iso()+'.json';
 if(window.Android&&typeof window.Android.saveText==='function'){window.Android.saveText(name,JSON.stringify(data,null,2));toast('اختر مكان حفظ النسخة');return}
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2500);toast('تم تنزيل النسخة الشاملة');
}
function shareDay(){
 const p=daily(),count=p.events.filter(e=>e.check).length,done=p.events.filter(e=>e.check&&isDone(e)).length;
 const lines=['📅 *جدول '+longDate(selected)+'*','الإنجاز: '+done+' / '+count,'━━━━━━━━━━'];
 for(const ev of p.events)lines.push((isDone(ev)?'✅ ':ev.kind==='fixed'?'⏰ ':'☐ ')+clock(ev.start)+'–'+clock(ev.end)+' | '+ev.title);
 for(const t of p.untimed)lines.push('📌 '+t.title);
 for(const r of p.waiting)lines.push('⏳ '+r.title+' (لم يُجدول)');
 lines.push('— BAS منظمي الموحد');
 const url='https://api.whatsapp.com/send?text='+encodeURIComponent(lines.join('\n'));
 if(window.Android?.openWeb)window.Android.openWeb(url);
 else window.open(url,'_blank','noopener,noreferrer');
}
function syncNativeWidget(){
 if(!window.Android||typeof window.Android.syncWidgetData!=='function')return;
 try{
  const dates=Array.from({length:8},(_,i)=>plusDay(iso(),i)),days=dates.map(date=>{
   const d=daily(date),count=d.events.filter(e=>e.check).length,done=d.events.filter(e=>e.check&&isDone(e,date)).length;
   const items=d.events.map(e=>({title:e.title,time:clock(e.start),done:isDone(e,date),prayer:e.id.startsWith('prayer-'),check:e.check}));
   for(const x of d.untimed)items.push({title:x.title,time:'',done:false,unscheduled:true,check:true});
   for(const x of openTasks().filter(t=>t.date&&t.date<date).slice(0,16))items.push({title:x.title,time:'',done:false,unscheduled:true,check:true});
   for(const x of d.waiting)items.push({title:x.title,time:'',done:false,unscheduled:true,check:false});
   return {date,label:longDate(date),total:count,done,items};
  });
  window.Android.syncWidgetData(JSON.stringify({schema:2,days}));
 }catch(err){console.warn('Widget sync skipped',err)}
}
function startUnified(){
 $('dayPicker').value=selected;$('prayerDate').value=selected;$('addOncallDate').value=selected;
 const p=(location.hash||'#home').slice(1);refresh();go(p);
 if(!db.migration&&!db.tasks.length){$('importStatus').textContent='ابدأ باستيراد نسخة BAS الشاملة عبر الإعدادات، أو استخدم إضافة سريعة.'}
 if(!db.prayers[selected])getPrayerTimes(selected);
}
startUnified();
if(typeof navigator!=='undefined' && 'serviceWorker' in navigator && location.protocol==='https:'){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
