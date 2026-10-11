'use strict';
function captureTask(){
 const title=$('captureTitle').value.trim();if(!title){toast('اكتب عنوان العمل');return}
 db.tasks.push({id:eid('t'),title,details:$('captureDetails').value.trim(),category:$('captureType').value,
 priority:+$('capturePriority').value||2,date:'',time:'',duration:25,done:false,deleted:false,created:new Date().toISOString(),source:'new'});
 $('captureTitle').value='';$('captureDetails').value='';
 persist();renderLatest();toast('حُفظ العمل دون تاريخ أو ساعة');
}
function renderLatest(){
 $('latestCapture').innerHTML=liveTasks().slice(-8).reverse().map(t=>`<div class="entry"><strong>${esc(t.title)}</strong><small class="small">${esc(t.category||'مهمة')}</small></div>`).join('')||'<p class="note">لا توجد أعمال بعد.</p>';
}
function toggleTask(id){const t=db.tasks.find(t=>t.id===id);if(!t)return;t.done=!t.done;persist();refresh()}
function assignToday(id){const t=db.tasks.find(t=>t.id===id);if(!t)return;t.date=selected;t.time='';persist();refresh();toast('أُضيفت المهمة لليوم بلا ساعة')}
function renderTasks(){
 const filter=$('taskFilter').value,q=$('searchTasks').value.trim().toLocaleLowerCase('ar'),sort=$('taskSort').value;
 let items=(filter==='archive'?db.archive:liveTasks()).filter(t=>{
  if(filter==='open'&&t.done)return false;
  if(filter==='done'&&!t.done)return false;
  if(filter==='inbox'&&(t.date||t.done))return false;
  if(filter==='ideas'&&!['idea','memory'].includes(t.category))return false;
  if(filter==='home'&&t.category!=='home')return false;
  return !q||[t.title,t.details,t.category,t.date].join(' ').toLocaleLowerCase('ar').includes(q);
 });
 items.sort((a,b)=>sort==='priority'?(b.priority||1)-(a.priority||1):
   sort==='new'?String(b.created).localeCompare(String(a.created)):
   String(a.date||'9999').localeCompare(String(b.date||'9999'))||(+b.priority||1)-(+a.priority||1));
 $('taskCount').textContent=num(items.length)+' عمل';
 $('taskRows').innerHTML=items.length?items.map(t=>`<div class="task ${t.done?'done':''}"><div class="row between"><strong>${esc(t.title)}</strong><span class="pill">${esc(t.category||'task')}</span></div>
 <div class="small">${t.date?esc(t.date):'دون موعد'} ${t.time?' · '+esc(t.time):''} · ${t.done?'منجز':'غير منجز'}</div>
 ${t.details?`<p class="note break">${esc(t.details)}</p>`:''}
 ${filter!=='archive'?`<div class="controls"><button class="btn tiny" onclick="toggleTask('${esc(t.id)}')">${t.done?'↶ إعادة':'✓ إنجاز'}</button><button class="btn tiny" onclick="editTask('${esc(t.id)}')">✎ تعديل</button><button class="btn tiny danger" onclick="deleteTask('${esc(t.id)}')">🗑 حذف</button></div>`:''}</div>`).join(''):'<p class="note">لا توجد أعمال مطابقة.</p>';
 $('oncallRows').innerHTML=db.oncalls.map(c=>`<div class="entry row between"><strong>${esc(c.date)}</strong><button class="btn tiny danger" onclick="removeOncall('${esc(c.id)}')">حذف</button></div>`).join('')||'<p class="note">لا توجد مناوبات.</p>';
}
function editTask(id){const t=db.tasks.find(t=>t.id===id);if(!t)return;editingTask=id;
 $('taskDialogTitle').textContent='تعديل العمل';
 for(const [input,value] of [['editTitle',t.title],['editDetails',t.details],['editType',t.category],['editPriority',t.priority||2],['editDate',t.date],['editTime',t.time],['editDuration',t.duration||25]])$(input).value=value||'';
 if(!Array.from($('editType').options).some(x=>x.value===t.category))$('editType').value='task';
 $('taskDialog').showModal();
}
function saveTaskEdit(){
 const t=db.tasks.find(t=>t.id===editingTask);if(!t)return;
 const title=$('editTitle').value.trim(),duration=+$('editDuration').value||25,date=$('editDate').value,time=$('editTime').value;
 if(!title||duration<5||duration>240){toast('راجع الاسم والمدة');return}
 if(time&&!date){toast('حدد التاريخ أولًا إذا اخترت ساعة');return}
 if(time&&minutes(time)===null){toast('الوقت غير صالح');return}
 Object.assign(t,{title,details:$('editDetails').value.trim(),category:$('editType').value,priority:+$('editPriority').value||2,date,time,duration});
 persist();closeDialog('taskDialog');refresh();toast('حُفظ التعديل');
}
function deleteEditingTask(){if(editingTask)deleteTask(editingTask)}
function deleteTask(id){const t=db.tasks.find(t=>t.id===id);if(!t||!confirm('حذف «'+t.title+'» من أعمالك؟'))return;t.deleted=true;persist();closeDialog('taskDialog');refresh()}
function addOncall(){const date=$('addOncallDate').value;if(!date){toast('اختر تاريخ المناوبة');return}
 if(db.oncalls.some(x=>x.date===date)){toast('المناوبة موجودة');return}
 db.oncalls.push({id:eid('oc'),date,note:''});persist();refresh()
}
function removeOncall(id){if(!confirm('حذف المناوبة؟'))return;db.oncalls=db.oncalls.filter(x=>x.id!==id);persist();refresh()}
function skipRoutine(id){db.skipped[selected]??={};db.skipped[selected][id]=true;persist();renderHome()}
function moveRoutineTime(id){
 const r=db.routines.find(x=>x.id===id);if(!r)return;
 const current=db.overrides[selected]?.[id]?.start||r.from;
 const val=prompt('وقت بداية '+r.title+' لهذا اليوم (HH:mm)',current);if(val===null)return;
 const start=minutes(val),len=Math.max(5,Math.min(240,+r.duration||25));
 if(start===null||start+len>1440){toast('وقت غير صالح');return}
 if(intersect(blocking(selected),start,start+len)){toast('يتداخل الوقت مع الدوام أو الصلاة');return}
 const others=daily().events.filter(e=>e.kind==='task'||e.kind==='routine'&&e.id!==id&&e.customTime);
 if(intersect(others,start,start+len)){toast('يتعارض مع وقت حددته سابقًا');return}
 db.overrides[selected]??={};db.overrides[selected][id]={start:clock(start),end:clock(start+len)};
 if(db.skipped[selected])delete db.skipped[selected][id];
 persist();renderHome();toast('حُفظ الوقت لهذا اليوم فقط، لا تثبيت دائم')
}
function editRoutine(id){
 editingRoutine=id||null;const r=db.routines.find(x=>x.id===id)||{title:'',duration:30,from:'17:00',to:'22:00',days:[0,1,2,3,4]};
 $('routineTitle').value=r.title;$('routineMinutes').value=r.duration;$('routineFrom').value=r.from;$('routineTo').value=r.to;
 $('routineDayBoxes').innerHTML=DAYS.map((day,i)=>`<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" value="${i}" ${r.days.includes(i)?'checked':''}/>${day}</label>`).join('');
 $('deleteRoutineBtn').classList.toggle('hidden',!editingRoutine);$('routineDialog').showModal();
}
function saveRoutine(){
 const title=$('routineTitle').value.trim(),len=+$('routineMinutes').value,from=$('routineFrom').value,to=$('routineTo').value;
 const days=[...$('routineDayBoxes').querySelectorAll('input:checked')].map(x=>+x.value);
 if(!title||len<5||len>240||days.length===0||minutes(from)===null||minutes(to)===null||minutes(from)>=minutes(to)){toast('راجع العنوان والأيام والمدة');return}
 let r=db.routines.find(x=>x.id===editingRoutine);
 if(!r){r={id:eid('r'),enabled:true};db.routines.push(r)}
 Object.assign(r,{title,duration:len,from,to,days,enabled:true});
 persist();closeDialog('routineDialog');refresh();toast('حُفظ التكرار');
}
function toggleRoutine(id){let r=db.routines.find(x=>x.id===id);if(r){r.enabled=!r.enabled;persist();refresh()}}
function deleteRoutine(){if(!editingRoutine||!confirm('حذف النشاط المتكرر؟'))return;db.routines=db.routines.filter(x=>x.id!==editingRoutine);closeDialog('routineDialog');persist();refresh()}
function saveSettings(){
 const a=minutes($('workStart').value),b=minutes($('workEnd').value),last=minutes($('lastHour').value);
 if(a===null||b===null||a>=b||last===null){toast('راجع أوقات الدوام');return}
 Object.assign(db.settings,{workStart:clock(a),workEnd:clock(b),lastHour:clock(last)});
 persist();renderHome();toast('حُفظت الأوقات');
}
async function getPrayerTimes(date,force=false){
 if(db.prayers[date]&&!force)return;
 const [year,month,day]=date.split('-');
 try{
  let url='https://api.aladhan.com/v1/timingsByCity/'+day+'-'+month+'-'+year+'?city='+encodeURIComponent(db.settings.city)+'&country='+db.settings.country+'&method=4&timezonestring=Asia%2FRiyadh';
  const resp=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!resp.ok)throw Error('HTTP');
  const d=await resp.json(),times={};for(const [id] of SALAH){const m=String(d?.data?.timings?.[id]||'').match(/\d\d:\d\d/);if(!m)throw Error('missing');times[id]=m[0]}
  db.prayers[date]={times,origin:'api'};persist();if(selected===date)renderHome();if($('prayerDate').value===date)renderSettings();
 }catch(e){if(force)toast('تعذر جلب الأوقات، أدخلها يدويًا')}
}
function loadPrayers(){getPrayerTimes($('prayerDate').value||selected,true)}
function savePrayers(){const date=$('prayerDate').value||selected,times={};
 for(const [id] of SALAH){let t=$('pray-'+id).value;if(minutes(t)===null){toast('أدخل الصلوات الخمس');return}times[id]=t}
 db.prayers[date]={times,origin:'manual'};persist();renderHome();toast('حُفظت الصلوات');
}
function renderSettings(){
 $('workStart').value=db.settings.workStart;$('workEnd').value=db.settings.workEnd;$('lastHour').value=db.settings.lastHour;
 let d=$('prayerDate').value||selected;$('prayerDate').value=d;
 $('prayerInputs').innerHTML=SALAH.map(([id,ar])=>`<div><label>${ar}</label><input type="time" id="pray-${id}" value="${db.prayers[d]?.times?.[id]||''}"/></div>`).join('');
 $('routineRows').innerHTML=db.routines.map(r=>`<div class="entry"><div class="row between"><strong>${esc(r.title)}</strong><span class="pill">${r.enabled?'مفعّل':'متوقف'}</span></div><small class="small">${r.days.map(d=>DAYS[d]).join('، ')} · ${num(r.duration)} دقيقة · ${r.from}–${r.to}</small><div class="controls"><button class="btn tiny" onclick="editRoutine('${esc(r.id)}')">✎ تعديل</button><button class="btn tiny" onclick="toggleRoutine('${esc(r.id)}')">${r.enabled?'تعطيل':'تفعيل'}</button></div></div>`).join('');
}
