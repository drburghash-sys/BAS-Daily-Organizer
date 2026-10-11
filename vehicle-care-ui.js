'use strict';
/** Maintenance controls live exclusively in each vehicle's file. */
function carActionId(id){return esc(id)}
function carStatusBadge(status){
 const color=status.state==='due'?'#ffb0ad':status.state==='soon'?'#f0d19a':status.state==='future'?'#8be3c2':'#a9bdca';
 return '<span class="pill" style="color:'+color+'">'+esc(status.label)+'</span>';
}
function careRow(car,item){
 const status=serviceStatus(car,item),next=formatServiceNext(item);
 const last=item.lastDate||item.lastKm!==null&&item.lastKm!==''&&item.lastKm!==undefined?
   [item.lastDate||'',item.lastKm!==null&&item.lastKm!==undefined?num(item.lastKm)+' كم':''].filter(Boolean).join(' · '):'';
 return `<div class="entry" style="padding:12px 0">
  <div class="row between"><strong>${esc(item.name)}</strong>${carStatusBadge(status)}</div>
  <small class="small">القادم: ${next}</small>
  ${last?`<small class="small">آخر تنفيذ: ${esc(last)}</small>`:''}
  ${item.notes?`<small class="small">${esc(item.notes)}</small>`:''}
  <div class="controls">
   <button class="btn tiny gold" onclick="openCareCompletion('${carActionId(car.id)}','${carActionId(item.id)}')">✓ تم التنفيذ</button>
   <button class="btn tiny" onclick="editCarePlan('${carActionId(car.id)}','${carActionId(item.id)}')">⚙ المواعيد</button>
   <button class="btn tiny ${item.manualRequired?'danger':''}" onclick="toggleCareRequired('${carActionId(car.id)}','${carActionId(item.id)}')">${item.manualRequired?'إلغاء مطلوب':'مطلوب الآن'}</button>
  </div>
 </div>`;
}
function carCareView(car){
 const stats=maintenanceStats(car),history=(car.services||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const active=carPlan(car).filter(it=>!it.disabled);
 const categories=[...new Set(active.map(it=>it.category||'أخرى'))];
 return `<article class="panel light"><div class="row between">
    <div><h3>${esc(car.name||'سيارة')}</h3><small class="small">${esc([car.model,car.year,car.plate].filter(Boolean).join(' · '))}</small></div>
    <button class="btn tiny" onclick="editVehicle('${carActionId(car.id)}')">✎ تعديل السيارة</button></div>
    <div class="tagbar"><span class="pill">التأمين ${esc(car.insurance||'غير مسجل')}</span>
     <span class="pill">الفحص ${esc(car.inspection||'غير مسجل')}</span>
     <span class="pill">الاستمارة ${esc(car.registration||'غير مسجل')}</span></div>
    <div class="small">العداد: ${num(car.odometer||0)} كم</div>
    <div class="tagbar">
      <span class="pill" style="color:#ffb0ad">مطلوب: ${num(stats.due)}</span>
      <span class="pill" style="color:#f0d19a">قادم قريبًا: ${num(stats.soon)}</span>
      <span class="pill">سجل التنفيذ: ${num(history.length)}</span>
    </div>
    <details class="careDetails"><summary>🔧 صيانة السيارة والتحضير للفحص</summary>
      <p class="note" style="margin-top:10px">تظهر المواعيد تلقائيًا حسب العداد أو التاريخ عند توفر آخر صيانة أو موعد قادم. الفترات المبدئية من تطبيق الصيانة القديم، ويجب ضبطها حسب دليل سيارتك.</p>
      <div class="controls"><button class="btn gold tiny" onclick="editCarePlan('${carActionId(car.id)}','')">＋ بند صيانة مخصص</button>
      <button class="btn tiny" onclick="addVehicleService('${carActionId(car.id)}')">＋ تسجيل صيانة حرة</button></div>
      ${categories.map(cat=>{
        const rows=active.filter(x=>x.category===cat),due=rows.filter(x=>serviceStatus(car,x).state==='due').length;
        return `<details class="careCategory"><summary>${esc(cat)} · ${num(rows.length)} بند ${due?'· مطلوب '+num(due):''}</summary>
          ${rows.map(it=>careRow(car,it)).join('')}</details>`;
      }).join('')}
      ${carPlan(car).some(it=>it.disabled)?'<button class="btn tiny" onclick="showDisabledCare(\''+carActionId(car.id)+'\')">إظهار البنود المعطلة</button>':''}
    </details>
    <details class="careHistory"><summary>📋 سجل الصيانة المنفذة (${num(history.length)})</summary>
      ${history.length?history.map(s=>`<div class="entry">
        <strong>${esc(s.type||'صيانة')}</strong>
        <small class="small">${esc(s.date||'دون تاريخ')} · ${s.km===null||s.km===undefined?'عداد غير محدد':num(s.km)+' كم'} · ${num(s.cost||0)} ر.س</small>
        ${s.notes?`<div class="note">${esc(s.notes)}</div>`:''}
        <button class="btn tiny danger" onclick="deleteVehicleService('${carActionId(car.id)}','${carActionId(s.id)}')">حذف السجل</button>
      </div>`).join(''):'<p class="note">لم تُسجل صيانة لهذه السيارة بعد.</p>'}
    </details>
    <div class="controls"><button class="btn tiny" onclick="showVehicleHistory('${carActionId(car.id)}')">سجل تجديد الوثائق</button></div>
  </article>`;
}
const previousRenderRecords=renderRecords;
renderRecords=function(){
 if(recordSection!=='vehicles')return previousRenderRecords();
 $('newRecordButton').textContent='＋ إضافة سيارة';
 $('recordRows').innerHTML=db.vehicles.length?db.vehicles.map(carCareView).join(''):'<p class="note">لا توجد سيارات، أضف أول سيارة.</p>';
};
function renderCareHome(){
 const node=$('maintenanceHome');if(!node)return;
 const items=dueCare(selected);
 node.innerHTML=items.length?items.map(({car,item,status})=>`<div class="task">
   <div class="row between"><strong>${esc(car.name)} · ${esc(item.name)}</strong>${carStatusBadge(status)}</div>
   <small class="small">${formatServiceNext(item)} · العداد الحالي ${num(car.odometer||0)} كم</small>
   <div class="controls">
    <button class="btn tiny gold" onclick="openCareCompletion('${carActionId(car.id)}','${carActionId(item.id)}')">✓ تم التنفيذ وسجّل الصيانة</button>
    <button class="btn tiny" onclick="editCarePlan('${carActionId(car.id)}','${carActionId(item.id)}')">تعديل الموعد</button>
    <button class="btn tiny" onclick="showCareVehicle('${carActionId(car.id)}')">ملف السيارة</button>
   </div></div>`).join(''):
   '<p class="note">لا توجد صيانة مستحقة حسب البيانات المسجلة حاليًا. أكمل مواعيد الصيانة والعداد في ملفات السيارات لتفعيل التنبيهات.</p>';
}
const previousRenderHome=renderHome;
renderHome=function(){previousRenderHome();renderCareHome()};
function showCareVehicle(id){
 if(recordSection!=='vehicles')switchRecords('vehicles');
 go('records');let car=carById(id);if(!car)return;
 const node=[...document.querySelectorAll('.careDetails')][db.vehicles.indexOf(car)];
 if(node){node.open=true;node.scrollIntoView({behavior:'smooth',block:'start'})}
}
function toggleCareRequired(carId,itemId){
 const car=carById(carId);if(!car)return;
 const it=carItem(car,itemId);if(!it)return;
 it.manualRequired=!it.manualRequired;persist();refresh();toast(it.manualRequired?'الصيانة مطلوبة وستظهر في الرئيسية':'أُزيل طلب الصيانة اليدوي');
}
