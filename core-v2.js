'use strict';
const $=id=>document.getElementById(id), KEY='bas_unified_v2';
const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const SALAH=[['Fajr','الفجر'],['Dhuhr','الظهر'],['Asr','العصر'],['Maghrib','المغرب'],['Isha','العشاء']];
const eid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const iso=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const parseDay=s=>{let a=s.split('-').map(Number);return new Date(a[0],a[1]-1,a[2],12)};
const plusDay=(s,n)=>{let d=parseDay(s);d.setDate(d.getDate()+n);return iso(d)};
const minutes=s=>{let m=/^(\d{1,2}):(\d{2})$/.exec(String(s||''));return m&&+m[1]<24&&+m[2]<60?+m[1]*60+ +m[2]:null};
const clock=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString('ar-SA');
const longDate=s=>new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{weekday:'long',day:'numeric',month:'long'}).format(parseDay(s));
const defaultRoutines=()=>{
 let x=[['quran','حفظ القرآن ومراجعته',[0,1,2,3,4,5,6],30,'05:45','07:25'],['jana','تدريس جنى',[0,1,2,3,4,5,6],15,'16:30','22:30'],['jumana','تدريس جمانة',[0,1,2,3,4,5,6],15,'16:30','22:30'],['hikma','تدريس حكمة',[0,1,2,3,4,5,6],15,'16:30','22:30']];
 const extras=[[0,'تعلم مؤشرات الدراسات',25],[0,'تحديث البرامج',40],[1,'قراءة دراسة حديثة',35],[2,'تعلم مؤشرات الدراسات',25],[3,'قراءة دراسة جراحية',35],[4,'مجلة دار الطيبين: إعداد',45],[5,'مجلة دار الطيبين: إصدار',80],[6,'مراجعة أعمال الأسبوع',30]];
 return x.map(([id,title,days,duration,from,to])=>({id:'r-'+id,title,days,duration,from,to,enabled:true})).concat(extras.map(([day,title,duration],i)=>({id:'r-week-'+i,title,days:[day],duration,from:day===5||day===6?'09:00':'17:30',to:'22:30',enabled:true})));
};
function fresh(){return {schema:2,settings:{workStart:'07:30',workEnd:'16:00',lastHour:'22:30',city:'Tabuk',country:'SA'},tasks:[],routines:defaultRoutines(),prayers:{},oncalls:[],vehicles:[],documents:{docs:[],sims:[],subs:[],people:[],categories:[]},done:{},overrides:{},skipped:{},legacyOriginal:null,archive:[],migration:null}}
function loadDB(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x?.schema===2)return {...fresh(),...x,settings:{...fresh().settings,...x.settings}}}catch(e){}return fresh()}
let db=loadDB(),selected=iso(),page='home',recordSection='vehicles',editingTask=null,editingRoutine=null;
function persist(){localStorage.setItem(KEY,JSON.stringify(db));if(typeof syncNativeWidget==='function')syncNativeWidget()}
function toast(t){let e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.style.display='none',3000)}
function openTasks(){return db.tasks.filter(t=>!t.deleted&&!t.done)}
function liveTasks(){return db.tasks.filter(t=>!t.deleted)}
function go(p){if(!['home','tasks','capture','records','settings'].includes(p))p='home';page=p;
 document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+p));
 document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.page===p));
 history.replaceState(null,'','#'+p);
 if(p==='home')renderHome();if(p==='tasks')renderTasks();if(p==='capture'){renderLatest();setTimeout(()=>$('captureTitle').focus(),50)}
 if(p==='records')renderRecords();if(p==='settings')renderSettings();
 window.scrollTo(0,0);
}
function setDay(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return;selected=v;renderHome();if(!db.prayers[v])getPrayerTimes(v)}
function moveDay(n){setDay(plusDay(selected,n))}
function todayISO(){return iso()}
function closeDialog(id){if($(id).open)$(id).close()}
function refresh(){renderHome();renderTasks();renderLatest();renderRecords();if(page==='settings')renderSettings()}
function blocking(date){let ev=[],day=parseDay(date).getDay(),s=db.settings;
 if(day<=4){let override=db.workOverrides?.[date]||{};
 let a=minutes(override.start||s.workStart),b=minutes(override.end||s.workEnd);if(a!==null&&b!==null&&a<b)ev.push({id:'work',title:'🏥 الدوام',start:a,end:b,kind:'fixed',check:false})}
 let tm=db.prayers[date]?.times||{};
 for(const [k,ar] of SALAH){const a=minutes(tm[k]);if(a!==null)ev.push({id:'prayer-'+k,title:'🕌 صلاة '+(k==='Dhuhr'&&day===5?'الجمعة':ar),start:a,end:Math.min(1440,a+(k==='Dhuhr'&&day===5?40:20)),kind:'fixed',check:true})}
 return ev;
}
const intersect=(ev,a,b)=>ev.find(x=>a<x.end&&x.start<b);
function freeTime(busy,from,to,len){for(let a=from;a+len<=to;a+=5)if(!intersect(busy,a,a+len))return a;return null}
function daily(date=selected){let ev=blocking(date),occupied=ev.slice(),untimed=[],waiting=[];
 const day=parseDay(date).getDay(),oncall=db.oncalls.some(c=>c.date===date),
       prayerReady=SALAH.every(([id])=>minutes(db.prayers[date]?.times?.[id])!==null);
 for(const t of openTasks().filter(t=>t.date===date)){let a=minutes(t.time),len=Math.min(240,Math.max(5,Number(t.duration)||25));
  if(a===null){untimed.push(t);continue}
  let r={id:'task:'+t.id,title:t.title,start:a,end:Math.min(1440,a+len),kind:'task',ref:t.id,check:true};
  r.conflict=!!intersect(occupied,r.start,r.end);ev.push(r);occupied.push(r);
 }
 let routines=db.routines.filter(r=>r.enabled&&r.days.includes(day)&&!db.skipped[date]?.[r.id]);
 for(const r of routines){let forced=db.overrides[date]?.[r.id];if(!forced)continue;
   const a=minutes(forced.start),b=minutes(forced.end);if(a===null||b===null||a>=b)continue;
   let item={id:r.id,title:r.title,start:a,end:b,kind:'routine',ref:r.id,check:true,customTime:true,conflict:!!intersect(occupied,a,b)};
   ev.push(item);occupied.push(item);
 }
 for(const r of routines){if(db.overrides[date]?.[r.id])continue;
   if(!prayerReady){waiting.push(r);continue}
   if(oncall&&r.id!=='r-quran'){waiting.push(r);continue}
   let len=Math.max(5,Math.min(240,+r.duration||25)),start=minutes(r.from)??500,end=minutes(r.to)??1350,last=minutes(db.settings.lastHour)??1350;
   const a=freeTime(occupied,start,Math.min(end,last),len);
   if(a===null){waiting.push(r);continue}
   let item={id:r.id,title:r.title,start:a,end:a+len,kind:'routine',ref:r.id,check:true};
   ev.push(item);occupied.push(item);
 }
 return {events:ev.sort((a,b)=>a.start-b.start),untimed,waiting,oncall};
}
function isDone(e,date=selected){return e.kind==='task'?!!db.tasks.find(t=>t.id===e.ref)?.done:!!db.done[date]?.[e.id]}
function markDone(id){let e=daily().events.find(x=>x.id===id);if(!e)return;
 if(e.kind==='task'){let t=db.tasks.find(x=>x.id===e.ref);if(t)t.done=!t.done}
 else {db.done[selected]??={};db.done[selected][id]=!db.done[selected][id]}
 persist();refresh();
}
function editFixedToday(id){
 if(id==='work'){
  const prev=db.workOverrides?.[selected]||{start:db.settings.workStart,end:db.settings.workEnd};
  const start=prompt('بداية الدوام لهذا التاريخ فقط (HH:mm)',prev.start);if(start===null)return;
  const end=prompt('نهاية الدوام لهذا التاريخ فقط (HH:mm)',prev.end);if(end===null)return;
  if(minutes(start)===null||minutes(end)===null||minutes(start)>=minutes(end)){toast('وقت الدوام غير صالح');return}
  db.workOverrides??={};db.workOverrides[selected]={start,end};
 }else if(id.startsWith('prayer-')){
  const key=id.slice(7),old=db.prayers[selected]?.times?.[key]||'';
  const val=prompt('موعد الصلاة لهذا التاريخ (HH:mm)',old);if(val===null)return;
  if(minutes(val)===null){toast('موعد الصلاة غير صالح');return}
  db.prayers[selected]??={times:{},origin:'manual'};
  db.prayers[selected].times[key]=val;db.prayers[selected].origin='manual';
 }else return;
 persist();renderHome();toast('تم تعديل الموعد لهذا التاريخ');
}
function renderTimelineEvent(e){let locked=e.kind==='fixed',done=isDone(e);
 return `<div class="timelineItem"><div class="tTime">${clock(e.start)}<small>${clock(e.end)}</small></div>
 <div class="activity ${locked?'fixed':e.customTime?'placed':''}"><strong>${esc(e.title)}</strong>
 <small>${locked?'وقت محجوز':'نشاط مرن'} ${e.customTime?'· غيّرت وقته لهذا اليوم':''} ${e.conflict?' · ⚠️ تعارض':''}</small>
 <div class="controls">${locked?`<button class="btn tiny" onclick="editFixedToday('${esc(e.id)}')">✎ تعديل وقت اليوم</button>`:''}${e.kind==='routine'?`<button class="btn tiny" onclick="moveRoutineTime('${esc(e.id)}')">⏱ وقت اليوم</button><button class="btn tiny" onclick="skipRoutine('${esc(e.id)}')">تخطي اليوم</button><button class="btn tiny" onclick="editRoutine('${esc(e.id)}')">التكرار</button>`:''}
 ${e.kind==='task'?`<button class="btn tiny" onclick="editTask('${esc(e.ref)}')">✎ تعديل</button>`:''}
 ${e.id!=='work'?`<button class="btn tiny" onclick="markDone('${esc(e.id)}')">${done?'↶ تراجع':'✓ أنجزت'}</button>`:''}</div></div></div>`;
}
function taskCompact(t){return `<div class="task"><strong>${esc(t.title)}</strong><small class="small">${t.date?'تاريخ '+esc(t.date):'دون تاريخ'} ${t.time?' · '+esc(t.time):''}</small>
 <div class="controls"><button class="btn tiny" onclick="assignToday('${esc(t.id)}')">📅 اليوم</button><button class="btn tiny" onclick="editTask('${esc(t.id)}')">✎ تعديل</button><button class="btn tiny" onclick="toggleTask('${esc(t.id)}')">✓ إنجاز</button></div></div>`}
function renderHome(){
 let result=daily(),list=openTasks(),inbox=list.filter(t=>!t.date),total=result.events.filter(e=>e.check).length,done=result.events.filter(e=>e.check&&isDone(e)).length;
 $('dateHeading').textContent=longDate(selected);$('dayPicker').value=selected;
 $('daySummary').textContent=!SALAH.every(([id])=>minutes(db.prayers[selected]?.times?.[id])!==null)?'⚠️ أكمل مواقيت الصلاة أولًا كي لا تتداخل الأنشطة معها':result.oncall?'🩺 يوم مناوبة؛ تخفف الأنشطة الاختيارية':'الصلاة والدوام محجوزان؛ باقي الأعمال قابلة للتعديل';
 $('countActive').textContent=num(total-done);$('countCompleted').textContent=num(done);$('countInbox').textContent=num(inbox.length);
 $('prayerStrip').innerHTML=SALAH.map(([k,n])=>`<span class="pill">${n}: ${db.prayers[selected]?.times?.[k]||'—'}</span>`).join('');
 $('daySchedule').innerHTML=result.events.map(renderTimelineEvent).join('')||'<p class="note">لا توجد مواعيد لهذا اليوم بعد.</p>';
 let floating=[...result.untimed,...list.filter(t=>t.date&&t.date<selected)];
 $('dayTasks').innerHTML=floating.map(taskCompact).join('')||'<p class="note">لا توجد أعمال مؤرخة بلا وقت.</p>';
 $('inboxPreview').innerHTML=inbox.slice(0,8).map(taskCompact).join('')||'<p class="note">لا توجد مهام في قائمة الانتظار.</p>';
 $('routinePreview').innerHTML=result.waiting.map(r=>`<div class="entry"><strong>${esc(r.title)}</strong><div class="controls"><button class="btn tiny" onclick="moveRoutineTime('${esc(r.id)}')">وقت اليوم</button><button class="btn tiny" onclick="editRoutine('${esc(r.id)}')">تعديل التكرار</button></div></div>`).join('')||'<p class="note">بقية الأنشطة موزعة ضمن الجدول.</p>';
 $('alerts').innerHTML=alertsHTML();
}
