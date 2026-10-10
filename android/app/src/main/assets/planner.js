/* BAS Daily Organizer 1.0 — no external JS libraries, no embedded personal data */
'use strict';
const $=id=>document.getElementById(id);
const KEY='bas_daily_planner_v1';
const DATA_KEYS={memo:'workbook_daily_manager_v1',home:'home_board_v1',car:'burghash_car_care_v1',docs:'bms_documents_hub_v2'};
const DAYNAMES=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const PRAYERS=[['Fajr','الفجر'],['Dhuhr','الظهر'],['Asr','العصر'],['Maghrib','المغرب'],['Isha','العشاء']];
const DEFAULT={settings:{workStart:'07:30',workEnd:'16:00',quranMinutes:30,girlMinutes:15,restMinutes:30,bedtime:'22:30',city:'Tabuk',country:'SA'},done:{},custom:[],oncall:[],oncallOverride:{},prayers:{}};
let state=readState(),selected=localISO(),activeView='today', deferredInstall=null;
const DAILY_EXTRAS={
 0:[['مؤشرات الدراسات: نوع الدراسة ومقاييس الأثر',25,'science'],['تحديث البرامج: إصلاحات مهمة فقط',40,'programs']],
 1:[['قراءة دراسة حديثة وتلخيصها',35,'research'],['تحديث البرامج: تعديل واحد محدد',35,'programs']],
 2:[['مؤشرات الدراسات: الحساسية والنوعية',25,'science'],['أعمال مفكرتي والمتابعة',25,'management']],
 3:[['قراءة دراسة جراحية جديدة',35,'research'],['تحديث البرامج: اختبار النسخة',35,'programs']],
 4:[['مجلة دار الطيبين: موضوع الأسبوع',45,'magazine'],['تحديث البرامج عند الحاجة',30,'programs']],
 5:[['مجلة دار الطيبين: تحرير وإصدار العدد',80,'magazine'],['متابعة صيانة المنزل',30,'home']],
 6:[['صيانة السيارات والمنزل',45,'maintenance'],['مراجعة أسبوعية للمفكرة',30,'management'],['تدريب مؤشرات الدراسات',20,'science']]
};
function readState(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(!s)return structuredClone(DEFAULT);return {...structuredClone(DEFAULT),...s,settings:{...DEFAULT.settings,...s.settings},done:s.done||{},custom:Array.isArray(s.custom)?s.custom:[],oncall:Array.isArray(s.oncall)?s.oncall:[],oncallOverride:s.oncallOverride||{},prayers:s.prayers||{}}}catch(e){return JSON.parse(JSON.stringify(DEFAULT))}}
function saveState(){localStorage.setItem(KEY,JSON.stringify(state));}
function readSource(k){try{return JSON.parse(localStorage.getItem(DATA_KEYS[k])||'null')}catch(e){return null}}
function localISO(d=new Date()){let x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
function fromISO(s){const a=s.split('-').map(Number);return new Date(a[0],a[1]-1,a[2],12,0)}
function addDays(s,n){let d=fromISO(s);d.setDate(d.getDate()+n);return localISO(d)}
function weekday(s){return fromISO(s).getDay()}
function ehtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtNum(n){return Number(n||0).toLocaleString('ar-SA')}
function minute(t){let m=/^(\d{1,2}):(\d{2})/.exec(String(t||''));if(!m)return null;let h=+m[1],min=+m[2];return h<24&&min<60?h*60+min:null}
function clock(n){let x=((n%1440)+1440)%1440;return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0')}
function dateText(s){return new Intl.DateTimeFormat('ar-SA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(fromISO(s))}
function showToast(text){const el=$('toast');el.textContent=text;el.style.display='block';clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.style.display='none',3100)}
function isWeekday(s){return weekday(s)<5}
function isOncall(date){if(Object.prototype.hasOwnProperty.call(state.oncallOverride,date))return !!state.oncallOverride[date]; const m=readSource('memo');return state.oncall.includes(date)||!!m?.oncalls?.some(x=>x.date===date)}
function scheduleBlock(items,start,end,id,title,desc,kind,check=true,sourceRef=null){if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)return;items.push({id,title,desc,kind,start,end,check,sourceRef});}
function prayerMap(){return state.prayers[selected]?.times||{}}
function occupancyAt(occupied,start,end){return occupied.some(b=>start<b.end&&b.start<end)}
function freeSlot(occupied,from,to,duration){if(!Number.isFinite(from)||!Number.isFinite(to)||to-from<duration)return null;for(let t=Math.max(0,from);t+duration<=to;t+=5){if(!occupancyAt(occupied,t,t+duration))return t}return null}
function memoTasks(date){const m=readSource('memo');if(!m||!Array.isArray(m.items))return [];return m.items.filter(i=>i&&!i.deleted&&!i.done&&['task','followup','appointment'].includes(i.type)&&((i.date||i.autoDate||'')&&(i.date||i.autoDate||'')<=date)).sort((a,b)=> {let ax=a.date||a.autoDate||'9999',bx=b.date||b.autoDate||'9999';return ax.localeCompare(bx)||(Number(b.priority)||0)-(Number(a.priority)||0)}).slice(0,14)}
function sourceAlerts(date){let alerts=[];
 const due=memoTasks(date);
 due.forEach(t=>alerts.push({title:t.title||'مهمة في المفكرة',detail:(t.date||t.autoDate||'')<date?'متأخرة · مفكرتي':'مستحقة · مفكرتي',source:'memo',type:(t.date||t.autoDate||'')<date?'danger':'warning'}));
 const h=readSource('home');if(h&&Array.isArray(h.items))h.items.filter(x=>x&&x.status!=='done').forEach(it=>{if(it.date&&it.date<=date)alerts.push({title:it.title||'صيانة منزل',detail:'صيانة البيت · '+(it.date<date?'متأخرة':'مستحقة'),source:'home',type:it.date<date?'danger':'warning'});});
 const d=readSource('docs');if(d){for(const doc of (d.docs||[])){if(!doc.hasExpiry||!doc.expiryDate)continue;let gap=daysDiff(date,doc.expiryDate);if(gap<=Math.max(0,+(doc.warnDays??30)))alerts.push({title:doc.name||'وثيقة',detail:gap<0?'وثيقة منتهية':`تنتهي خلال ${fmtNum(gap)} يوم`,source:'docs',type:gap<0?'danger':'warning'});}
 for(const v of (d.vehicles||[])){for(const fld of [['insurance','التأمين'],['inspection','الفحص'],['registration','الاستمارة']]){let dd=v[fld[0]];let gap=dd?daysDiff(date,dd):null;if(gap!==null&&gap<=30)alerts.push({title:(v.name||'سيارة')+' · '+fld[1],detail:gap<0?'منتهٍ · الوثائق':`متبقٍ ${fmtNum(gap)} يوم · الوثائق`,source:'docs',type:gap<0?'danger':'warning'})}}}
 const c=readSource('car');if(c&&Array.isArray(c.vehicles)){
 const ref=[['engineOil',10000,12,'زيت المحرك'],['oilFilter',10000,12,'فلتر الزيت'],['airFilter',20000,12,'فلتر الهواء'],['cabinFilter',20000,12,'فلتر المكيف'],['tireRotate',10000,6,'تدوير الإطارات'],['tireCheck',0,1,'فحص الإطارات'],['brakes',10000,6,'الفرامل'],['brakeFluid',40000,24,'زيت الفرامل'],['coolant',50000,24,'سائل التبريد'],['transmission',60000,36,'زيت القير'],['diff',50000,24,'زيت الدفرنس'],['transfer',50000,24,'علبة التحويل'],['spark',60000,48,'البواجي'],['battery',0,12,'البطارية'],['wipers',0,12,'المساحات']];
 const items=ref.concat((c.customItems||[]).filter(x=>x.id).map(x=>[x.id,x.km,x.months,x.name]));
 for(const v of c.vehicles){for(const [id,defaultKm,defaultMonths,defaultName] of items){let own=(v.maintenance||{})[id]||{}; if(own.disabled)continue;let km=Number(own.km===undefined?defaultKm:own.km)||0, months=Number(own.months===undefined?defaultMonths:own.months)||0;
 let remainingKm=(own.lastKm!==undefined&&own.lastKm!==''&&km>0)?(+own.lastKm+km-Number(v.odometer||0)):null;
 let dueDate=null;if(own.lastDate&&months){let x=fromISO(own.lastDate);x.setMonth(x.getMonth()+months);dueDate=localISO(x)}
 let remainingDays=dueDate?daysDiff(date,dueDate):null;
 let late=(remainingKm!==null&&remainingKm<=0)||(remainingDays!==null&&remainingDays<=0);
 let soon=(remainingKm!==null&&remainingKm<=Number(c.settings?.soonKm??1000))||(remainingDays!==null&&remainingDays<=Number(c.settings?.soonDays??30));
 if(late||soon)alerts.push({title:(v.name||'سيارة')+' · '+(own.name||defaultName),detail:late?'صيانة مستحقة':'صيانة قريبة',source:'car',type:late?'danger':'warning'});
 }} }
 return alerts.slice(0,24)}
function daysDiff(a,b){return Math.round((fromISO(b)-fromISO(a))/86400000)}
function dailyPlan(date=selected){const day=weekday(date),week=isWeekday(date),oncall=isOncall(date),settings=state.settings,prayers=state.prayers[date]?.times||{};
 let events=[],occupied=[],queued=[],unscheduled=[];
 const addHard=(start,end,id,title,detail,kind,check=false)=>{scheduleBlock(events,start,end,id,title,detail,kind,check);occupied.push({start,end})};
 if(week){let from=minute(settings.workStart),to=minute(settings.workEnd);if(from!==null&&to!==null&&from<to)addHard(from,to,'work','دوام المستشفى','فترة عمل محجوزة · حتى '+settings.workEnd,'work',false)}
 for(const [p,label] of PRAYERS){let start=minute(prayers[p]);if(start!==null)addHard(start,start+(p==='Dhuhr'&&day===5?40:20),'prayer:'+p,(p==='Dhuhr'&&day===5?'صلاة الجمعة':'صلاة '+label),'وقت الصلاة محجوز · تحقق من تقويم المسجد','prayer',true)}
 if(week){let to=minute(settings.workEnd);if(to!==null&&settings.restMinutes>0)addHard(to,to+ +settings.restMinutes,'rest','استراحة بعد الدوام','راحة وأسرة قبل المهام المسائية','rest',false)}
 const assign=(id,title,duration,from,to,desc,kind='task',sourceRef=null)=>{duration=Math.max(5,+duration||15);queued.push({id,title,duration,from,to,desc,kind,sourceRef})};
 let fajr=minute(prayers.Fajr),workStart=minute(settings.workStart)||450;
 if(week){let qstart=fajr===null?315:fajr+25;let qend=Math.max(qstart+5,workStart-5);assign('quran','حفظ القرآن ومراجعته',+settings.quranMinutes,qstart,qend,'هدف ثابت يومي · اختر الصفحات المناسبة','quran')}
 else assign('quran','حفظ القرآن ومراجعته',+settings.quranMinutes,500,720,'حفظ ومراجعة بلا مقاطعة','quran');
 const eveStart=week?(minute(settings.workEnd)||960)+(+settings.restMinutes||0):930;
 const bed=minute(settings.bedtime)||1350;
 if(!oncall){for(const girl of ['جنى','جمانة','حكمة']){const subj={ 'جنى':'قدرات وSTEP','جمانة':'مقررات ثالث متوسط','حكمة':'رياضيات وإنجليزي' }[girl];assign('study:'+girl,'تدريس '+girl,+settings.girlMinutes,eveStart,bed,subj+' · مراجعة مركزة واختبار صغير','family')};
 assign('memo','مراجعة مفكرتي وتحديد الأولوية',15,eveStart,bed,'إغلاق مهمة واحدة أو تحديد موعد لها','management');
 let extras=DAILY_EXTRAS[day];for(let i=0;i<extras.length;i++){let [name,duration,kind]=extras[i];assign('rotation:'+day+':'+i,name,duration,eveStart,bed,'النشاط الأسبوعي المقترح',kind)};
 for(const t of memoTasks(date).slice(0,2)){assign('memo:'+t.id,t.title,Math.min(45,Math.max(15,(Number(t.size)||2)*10)),eveStart,bed,'مستحق من مفكرتي · '+(t.date||t.autoDate),'memo',{type:'memo',id:t.id})}
 for(const c of state.custom.filter(t=>t.date<=date&&!t.done)){assign('custom:'+c.id,c.title,Number(c.minutes)||25,eveStart,bed,'مهمة مضافة · '+(c.date<date?'مرحلة من '+c.date:'مقررة اليوم'),'custom',{type:'custom',id:c.id})}}
 else {unscheduled.push('يوم مناوبة: الأنشطة المسائية الاختيارية مؤجلة، بما فيها تدريس البنات عند عدم توفر الوقت.');}
 for(const it of queued){let pos=freeSlot(occupied,it.from,it.to,it.duration);if(pos===null){unscheduled.push(it.title+' ('+fmtNum(it.duration)+' د)');continue}scheduleBlock(events,pos,pos+it.duration,it.id,it.title,it.desc,it.kind,true,it.sourceRef);occupied.push({start:pos,end:pos+it.duration});}
 return {events:events.sort((a,b)=>a.start-b.start||a.end-b.end),unscheduled,queuelen:queued.length,oncall};}
function completion(date,id){return !!(state.done[date]||{})[id]}
function isDone(date,ev){if(ev.sourceRef?.type==='memo'){let src=readSource('memo');return !!src?.items?.find(x=>x.id===ev.sourceRef.id)?.done}if(ev.sourceRef?.type==='custom')return !!state.custom.find(c=>c.id===ev.sourceRef.id)?.done;return completion(date,ev.id)}
function toggleDone(date,id,checked){const plan=dailyPlan(date),it=plan.events.find(e=>e.id===id);if(!it)return;
 if(it.sourceRef?.type==='memo'){let d=readSource('memo');let found=d?.items?.find(x=>x.id===it.sourceRef.id);if(found){found.done=checked;localStorage.setItem(DATA_KEYS.memo,JSON.stringify(d));reloadModule('memo')}}
 else if(it.sourceRef?.type==='custom'){let c=state.custom.find(x=>x.id===it.sourceRef.id);if(c){c.done=checked;saveState()}}
 else {state.done[date]??={};state.done[date][id]=checked;saveState()};renderAll()}
function eventHtml(e,date){const done=isDone(date,e),start=clock(e.start),end=clock(e.end);
 return `<div class="event kind-${ehtml(e.kind)} ${done?'done':''}"><div class="when"><b>${start}</b><small>${end}</small></div><div class="rail"><i></i></div><div class="eventBox"><strong>${ehtml(e.title)}</strong><small>${ehtml(e.desc||'')} · ${fmtNum(e.end-e.start)} دقيقة</small></div>${e.check?`<input type="checkbox" class="tick" aria-label="إنجاز ${ehtml(e.title)}" ${done?'checked':''} onchange="toggleDone('${date}','${ehtml(e.id)}',this.checked)">`:'<span></span>'}</div>`}
function renderToday(){let plan=dailyPlan(),day=weekday(selected),p=state.prayers[selected]?.times||{},checkable=plan.events.filter(e=>e.check),done=checkable.filter(e=>isDone(selected,e)).length,pct=checkable.length?Math.round(done*100/checkable.length):0;
 $('heroDate').textContent=dateText(selected);$('selectedDate').value=selected;
 $('heroMessage').textContent=plan.oncall?'يوم المناوبة: التزامات أقل، وترك مساحة للمستشفى.': 'الصلاة والقرآن وتدريس البنات محفوظة أولًا، والمشروعات موزعة أسبوعيًا.';
 $('heroTags').innerHTML=`<span class="pill">${isWeekday(selected)?'🏥 دوام حتى '+ehtml(state.settings.workEnd):'🌤️ نهاية الأسبوع'}</span><span class="pill">${plan.oncall?'🩺 مناوبة':'✨ جدول متوازن'}</span><span class="pill">${fmtNum(plan.events.length)} موعدًا / نشاطًا</span>`;
 $('progressText').textContent=fmtNum(done)+' من '+fmtNum(checkable.length);$('progressPct').textContent=fmtNum(pct)+'٪';$('progressRing').style.setProperty('--progress',pct+'%');
 $('callToggle').textContent='🩺 يوم مناوبة: '+(plan.oncall?'نعم':'لا');
 $('timeline').innerHTML=plan.events.map(e=>eventHtml(e,selected)).join('')||'<p class="empty">لا توجد أنشطة لهذا التاريخ.</p>';
 const missingPrayers=PRAYERS.filter(([x])=>!p[x]);if(missingPrayers.length) $('timeline').insertAdjacentHTML('afterbegin','<p class="status">⚠️ مواقيت الصلاة لم تكتمل. حدّثها من الإعدادات قبل الاعتماد على الجدول؛ الأنشطة قد تتداخل مع الصلاة.</p>');
 $('unscheduled').classList.toggle('hidden',!plan.unscheduled.length);$('unscheduled').innerHTML=plan.unscheduled.length?'<b>لم تتسع لها الفترة المحددة:</b><div>'+plan.unscheduled.map(e=>'<div>• '+ehtml(e)+'</div>').join('')+'</div>':'';
 const alerts=sourceAlerts(selected);$('alertList').innerHTML=alerts.length?alerts.slice(0,10).map(a=>`<div class="alert ${a.type}"><span class="ico">${a.source==='memo'?'📝':a.source==='home'?'🏠':a.source==='car'?'🚘':'📁'}</span><div class="grow"><strong>${ehtml(a.title)}</strong><small>${ehtml(a.detail)}</small></div><button class="btn tiny" onclick="navigate('${a.source}')">فتح</button></div>`).join(''):'<div class="note">لا توجد مواعيد قريبة مسجلة. استعد نسخ بيانات تطبيقاتك لتظهر هنا.</div>';
 $('prayerCity').textContent=state.settings.city==='Tabuk'?'تبوك':state.settings.city;
 $('prayerBar').innerHTML=PRAYERS.map(([id,label])=>`<div class="prayer ${p[id]?'':'missing'}"><b>${selected&&weekday(selected)===5&&id==='Dhuhr'?'الجمعة':label}</b><span>${p[id]||'—'}</span></div>`).join('');
 let origin=state.prayers[selected]?.origin; $('prayerNote').textContent=origin==='api'?'أوقات محسوبة بطريقة أم القرى؛ طابقها مع تقويم المسجد المحلي.':origin==='manual'?'أوقات أدخلتها يدويًا؛ طابقها مع تقويم المسجد.':'لم تُحمّل الأوقات بعد. استخدم زر التحديث في الإعدادات.';}
function renderWeek(){let anchor=fromISO(selected),first=addDays(selected,-((anchor.getDay()+7)%7));$('weeklyCards').innerHTML=Array.from({length:7},(_,i)=>{let dt=addDays(first,i),extras=DAILY_EXTRAS[weekday(dt)],plan=dailyPlan(dt);let valid=plan.events.filter(x=>x.check);let done=valid.filter(e=>isDone(dt,e)).length;return `<button class="daycard ${dt===selected?'active':''}" onclick="setSelectedDate('${dt}');navigate('today')"><b>${DAYNAMES[weekday(dt)]}</b><small>${new Intl.DateTimeFormat('ar-SA',{day:'numeric',month:'short'}).format(fromISO(dt))}</small><div class="activity">${ehtml(extras[0][0])}</div><small>${isOncall(dt)?'🩺 مناوبة · ':' '}${fmtNum(done)} / ${fmtNum(valid.length)} منجز</small></button>`}).join('')}
function fillSettings(){const s=state.settings;for(const id of ['workStart','workEnd','bedtime'])$(id).value=s[id];for(const [id,key] of [['quranMinutes','quranMinutes'],['girlMinutes','girlMinutes'],['restMinutes','restMinutes']])$(id).value=s[key];$('cityName').value=s.city;$('countryCode').value=s.country;renderPrayerEditor()}
function renderPrayerEditor(){const p=state.prayers[selected]?.times||{};$('prayerEditor').innerHTML=PRAYERS.map(([key,label])=>`<div><label>${label}</label><input type="time" id="pr-${key}" value="${ehtml(p[key]||'')}" class="wide"></div>`).join('');$('prayerStatus').textContent='الموعد الجاري تعديله: '+dateText(selected)}
/** Send the real, current agenda to Android widget storage. PWA remains standalone. */
function syncNativeWidget(){
 const bridge=window.Android;
 if(!bridge||typeof bridge.syncWidgetData!=='function')return;
 try{
  const dates=Array.from({length:8},(_,i)=>addDays(localISO(),i));
  const days=dates.map(date=>{
   const plan=dailyPlan(date);
   const checkable=plan.events.filter(e=>e.check);
   return {
    date,
    label:new Intl.DateTimeFormat('ar-SA',{weekday:'long',day:'numeric',month:'short'}).format(fromISO(date)),
    done:checkable.filter(e=>isDone(date,e)).length,
    total:checkable.length,
    items:checkable.map(e=>({
      time:clock(e.start),
      title:String(e.title||'نشاط'),
      done:isDone(date,e),
      prayer:e.kind==='prayer'
    }))
   };
  });
  bridge.syncWidgetData(JSON.stringify({schema:1,days}));
 }catch(err){console.warn('Widget sync unavailable',err)}
}
function renderAll(){renderToday();renderWeek();if(activeView==='settings')renderPrayerEditor();syncNativeWidget()}
function navigate(page,push=true){if(push&&location.hash.slice(1)!==page)history.pushState({page},'', '#'+page);activeView=page;const isModule=['memo','home','car','docs'].includes(page);document.querySelectorAll('.view').forEach(el=>el.classList.toggle('visible',el.id==='view-'+(isModule?'module':page)));document.querySelectorAll('.tab').forEach(el=>{el.classList.toggle('active',el.dataset.nav===page)});for(const v of ['memo','home','car','docs'])$('module-'+v).classList.toggle('visible',page===v);
 if(isModule)$('moduleTitle').textContent={memo:'مفكرتي',home:'صيانة المنزل',car:'صيانة السيارات',docs:'مستنداتي ووثائقي'}[page];if(page==='settings')fillSettings();if(page==='week')renderWeek();if(page==='today')renderToday();window.scrollTo(0,0)}
function setSelectedDate(v){if(!/^\d{4}-\d\d-\d\d$/.test(v))return;selected=v;renderAll();if(!state.prayers[selected])fetchPrayers(false)}
function shiftDay(n){setSelectedDate(addDays(selected,n))}
function toggleOncall(){state.oncallOverride[selected]=!isOncall(selected);saveState();renderAll()}
function rebuildPlan(){renderAll();showToast('أعيد حساب الخطة وفق الالتزامات والأولويات')}
function addQuickTask(){const name=$('quickTitle').value.trim();if(!name){showToast('اكتب اسم المهمة أولًا');return}state.custom.push({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:name,date:selected,minutes:+$('quickMinutes').value,priority:+$('quickPriority').value,done:false});saveState();$('quickTitle').value='';renderAll();showToast('أضيفت المهمة. ستظل ظاهرة حتى إنجازها.')}
function saveSettings(){let s=state.settings,ws=$('workStart').value,we=$('workEnd').value,bed=$('bedtime').value;
 if(minute(ws)===null||minute(we)===null||minute(ws)>=minute(we)||minute(bed)===null){showToast('تحقق من وقت بداية ونهاية الدوام والنوم');return}
 const q=+$('quranMinutes').value,g=+$('girlMinutes').value,r=+$('restMinutes').value;if(q<10||q>90||g<5||g>60||r<0||r>120){showToast('تأكد من مدد الأنشطة');return}
 Object.assign(s,{workStart:ws,workEnd:we,bedtime:bed,quranMinutes:q,girlMinutes:g,restMinutes:r});saveState();renderAll();showToast('حُفظت الإعدادات')}
async function fetchPrayers(force=false){const existing=state.prayers[selected];if(existing&&!force)return;const city=$('cityName')?.value.trim()||state.settings.city,country=($('countryCode')?.value.trim()||state.settings.country).toUpperCase();state.settings.city=city;state.settings.country=country;saveState();
 const [year,month,day]=selected.split('-');let url=`https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=4&timezonestring=Asia%2FRiyadh`;
 if($('prayerStatus'))$('prayerStatus').textContent='جارٍ طلب مواقيت الصلاة...';
 try{const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(9000)});if(!res.ok)throw Error('HTTP '+res.status);let j=await res.json(),p=j?.data?.timings;if(j.code!==200||!p)throw Error('invalid');let times={};for(const [id] of PRAYERS){let v=String(p[id]||'').match(/\d\d:\d\d/);if(!v)throw Error('invalid time');times[id]=v[0]}
 state.prayers[selected]={times,origin:'api'};saveState();renderAll();if(force&&$('prayerStatus'))$('prayerStatus').textContent='تم تحديث أوقات '+dateText(selected)+' (طريقة أم القرى).';}
 catch(e){if($('prayerStatus'))$('prayerStatus').textContent='تعذر جلب مواقيت الصلاة. أدخلها يدويًا ثم اضغط حفظ، ولا تعتمد على جدول لا يحتوي أوقاتها.'}}
function saveManualPrayers(){let times={};for(const [id] of PRAYERS){let val=$('pr-'+id)?.value||'';if(minute(val)===null){showToast('أدخل الأوقات الخمسة بشكل صحيح');return}times[id]=val}state.settings.city=$('cityName').value.trim()||'Tabuk';state.settings.country=$('countryCode').value.trim().toUpperCase()||'SA';state.prayers[selected]={times,origin:'manual'};saveState();renderAll();showToast('حُفظت مواقيت الصلاة لهذا التاريخ')}
function reloadModule(id){let f=$('module-'+id);if(f)f.contentWindow?.location.reload()}
function downloadJSON(name,db){if(window.Android&&typeof window.Android.saveText==='function'){window.Android.saveText(name,JSON.stringify(db,null,2));return;}const b=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
function backupAll(){let all={format:'BAS_Daily_Organizer_1',exportedAt:new Date().toISOString(),planner:state,modules:{}};for(const k of Object.keys(DATA_KEYS))all.modules[k]=readSource(k);downloadJSON('BAS_All_Backup_'+localISO()+'.json',all);showToast('تم إنشاء النسخة الاحتياطية الشاملة')}
async function restoreFile(event){const f=event.target.files?.[0];if(!f)return;try{const x=JSON.parse(await f.text());let entries={};
 if(x?.format==='BAS_Daily_Organizer_1'&&x?.modules&&x?.planner){for(const [k,val] of Object.entries(x.modules))if(k in DATA_KEYS&&val)entries[k]=val;entries.planner=x.planner}
 else if(x?.format==='CarMaintenanceManagerV1'||x?.data?.vehicles&&x?.data?.services)entries.car=x.data;
 else if(Array.isArray(x?.vehicles)&&Array.isArray(x?.services))entries.car=x;
 else if(Array.isArray(x?.docs)&&Array.isArray(x?.vehicles))entries.docs=x;
 else if(Array.isArray(x?.items)&&('oncalls' in x||'memories' in x||x.items.some(i=>['task','appointment','idea','followup','topic'].includes(i?.type))))entries.memo=x;
 else if(Array.isArray(x?.items)&&('people' in x||x.items.some(i=>i&&'status' in i)))entries.home=x;
 else if(Array.isArray(x?.items)&&/Mofakkirati/i.test(f.name))entries.memo=x;
 else if(Array.isArray(x?.items)&&/Home_Maintenance/i.test(f.name))entries.home=x;
 else throw Error('صيغة غير معروفة');
 const names=Object.keys(entries);if(!confirm('ستُستبدل بيانات: '+names.map(a=>({memo:'المفكرة',home:'البيت',car:'السيارات',docs:'الوثائق',planner:'الجدول'}[a]||a)).join('، ')+'\nهل حفظت نسخة من البيانات الحالية؟'))return;
 for(const [k,v] of Object.entries(entries)){if(k==='planner'){if(!Array.isArray(v.custom)||!v.settings)throw Error('خطة غير صالحة');localStorage.setItem(KEY,JSON.stringify(v));continue}if(!v||typeof v!=='object')continue;localStorage.setItem(DATA_KEYS[k],JSON.stringify(v));if(k==='home')localStorage.setItem('homeorg_v2_master_maintenance_20260916','1')}
 window.location.reload();}
 catch(e){showToast('لم تُستعد البيانات: '+(e.message||'ملف غير صالح'))}finally{event.target.value=''}}
function installApp(){if(deferredInstall){deferredInstall.prompt();deferredInstall=null}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('installBtn').classList.remove('hidden')});
window.addEventListener('storage',e=>{if([KEY,...Object.values(DATA_KEYS)].includes(e.key)){if(e.key===KEY)state=readState();if(activeView==='today'||activeView==='week')renderAll();else syncNativeWidget()}});
window.addEventListener('popstate',()=>navigate((location.hash||'#today').slice(1),false));
for(const k of ['memo','home','car','docs'])$('module-'+k).addEventListener('load',()=>{if(activeView==='today')renderAll()});
$('quickTitle').addEventListener('keydown',e=>{if(e.key==='Enter')addQuickTask()});
renderAll();if(['today','week','memo','home','car','docs','settings'].includes(location.hash.slice(1)))navigate(location.hash.slice(1),false);fetchPrayers(false);if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('service-worker.js').catch(()=>{});