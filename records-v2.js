'use strict';
function daysUntil(date){return Math.round((parseDay(date)-parseDay(selected))/86400000)}
function alertsHTML(){
 const alerts=[];for(const t of openTasks())if(t.date&&t.date<=selected)alerts.push([t.title,t.date<selected?'متأخر':'مستحق']);
 for(const c of db.vehicles){
  for(const [key,name] of [['insurance','التأمين'],['inspection','الفحص'],['registration','الاستمارة']]){
   if(c[key]&&daysUntil(c[key])<=30)alerts.push([c.name+' · '+name,daysUntil(c[key])<0?'منتهي':'قريب الانتهاء'])}
  for(const s of c.services||[])if(s.nextDate&&daysUntil(s.nextDate)<=30)alerts.push([c.name+' · '+s.type,'صيانة قريبة'])
 }
 for(const d of db.documents.docs||[])if(d.hasExpiry&&d.expiryDate&&daysUntil(d.expiryDate)<=30)alerts.push([d.name,'وثيقة قاربت الانتهاء']);
 for(const s of db.documents.subs||[])if(s.nextDueDate&&daysUntil(s.nextDueDate)<=15)alerts.push([s.name,'تجديد اشتراك']);
 return alerts.slice(0,15).map(([a,b])=>`<div class="entry"><strong>${esc(a)}</strong><small class="small">${esc(b)}</small></div>`).join('')||'<p class="note">لا توجد تنبيهات مسجلة.</p>';
}
function switchRecords(section){
 recordSection=section;document.querySelectorAll('[data-record]').forEach(b=>b.classList.toggle('active',b.dataset.record===section));renderRecords()
}
const recordSchemas={
 docs:{title:'وثيقة',fields:[['name','اسم الوثيقة'],['category','التصنيف'],['number','الرقم'],['expiryDate','الانتهاء (YYYY-MM-DD)'],['notes','ملاحظات']]},
 sims:{title:'شريحة',fields:[['name','الاسم'],['provider','الشبكة'],['number','رقم الشريحة'],['simDevice','الجهاز'],['whatsappDevice','جهاز واتساب'],['notes','ملاحظات']]},
 subs:{title:'اشتراك',fields:[['name','اسم الاشتراك'],['amount','المبلغ'],['cycle','الدورية'],['nextDueDate','الاستحقاق (YYYY-MM-DD)'],['notes','ملاحظات']]}
};
function renderRecords(){
 $('newRecordButton').textContent='＋ '+(recordSection==='vehicles'?'إضافة سيارة':'إضافة '+recordSchemas[recordSection].title);
 const rows=$('recordRows');
 if(recordSection==='vehicles'){
  rows.innerHTML=db.vehicles.length?db.vehicles.map(c=>`<article class="panel light"><div class="row between"><div><h3>${esc(c.name)}</h3><small class="small">${esc([c.model,c.year,c.plate].filter(Boolean).join(' · '))}</small></div><button class="btn tiny" onclick="editVehicle('${esc(c.id)}')">✎ تحرير</button></div>
  <div class="tagbar"><span class="pill">التأمين ${esc(c.insurance||'غير مسجل')}</span><span class="pill">الفحص ${esc(c.inspection||'غير مسجل')}</span><span class="pill">الاستمارة ${esc(c.registration||'غير مسجل')}</span></div>
  <div class="small">العداد: ${num(c.odometer||0)} كم ${c.note?' · '+esc(c.note):''}</div>
  <details><summary>ملف السيارة والصيانة (${num((c.services||[]).length)} سجل)</summary>
   <div class="row" style="margin:9px 0"><button class="btn tiny gold" onclick="addVehicleService('${esc(c.id)}')">＋ صيانة</button><button class="btn tiny" onclick="showVehicleHistory('${esc(c.id)}')">سجل التجديدات</button></div>
   ${(c.services||[]).length?(c.services||[]).map(s=>`<div class="entry"><strong>${esc(s.type)}</strong>
    <small class="small">${esc(s.date||'')} · ${num(s.km||0)} كم · ${num(s.cost||0)} ر.س ${s.nextDate?' · القادم '+esc(s.nextDate):''}</small>
    ${s.notes?`<p class="note">${esc(s.notes)}</p>`:''}
    <button class="btn tiny danger" onclick="deleteVehicleService('${esc(c.id)}','${esc(s.id)}')">حذف السجل</button></div>`).join(''):'<p class="note">لا توجد صيانة مسجلة لهذه السيارة.</p>'}
  </details></article>`).join(''):'<p class="note">لا توجد سيارات. أضف السيارة الأولى.</p>';
 }else{
  const set=db.documents[recordSection]||[],schema=recordSchemas[recordSection];
  rows.innerHTML=set.length?set.map(d=>`<div class="task"><div class="row between"><strong>${esc(d.name||'سجل')}</strong><span class="pill">${esc(d.category||d.provider||d.cycle||'')}</span></div>
    <p class="small">${esc(d.expiryDate||d.nextDueDate||d.number||'')} ${esc(d.notes||'')}</p>
    <div class="controls"><button class="btn tiny" onclick="editRecord('${esc(d.id)}')">✎ تعديل</button><button class="btn tiny danger" onclick="deleteRecord('${esc(d.id)}')">حذف</button></div></div>`).join(''):'<p class="note">لا توجد سجلات.</p>';
 }
}
function newRecord(){if(recordSection==='vehicles')editVehicle();else editRecord()}
function editVehicle(id){
 const c=db.vehicles.find(x=>x.id===id)||{id:'',name:'',model:'',year:'',plate:'',odometer:'',insurance:'',inspection:'',registration:'',note:''};
 for(const [el,val] of [['vehicleId',c.id],['vehicleName',c.name],['vehicleModel',c.model],['vehicleYear',c.year],['vehiclePlate',c.plate],['vehicleOdometer',c.odometer],['vehicleInsurance',c.insurance],['vehicleInspection',c.inspection],['vehicleRegistration',c.registration],['vehicleNote',c.note]])$(el).value=val??'';
 $('vehicleDialog').showModal();
}
function saveVehicle(){
 const name=$('vehicleName').value.trim();if(!name){toast('اكتب اسم السيارة');return}
 let id=$('vehicleId').value,c=db.vehicles.find(x=>x.id===id);
 if(!c){c={id:eid('car'),services:[],renewalHistory:[]};db.vehicles.push(c)}
 Object.assign(c,{name,model:$('vehicleModel').value.trim(),year:$('vehicleYear').value,plate:$('vehiclePlate').value.trim(),
 odometer:+$('vehicleOdometer').value||0,insurance:$('vehicleInsurance').value,inspection:$('vehicleInspection').value,
 registration:$('vehicleRegistration').value,note:$('vehicleNote').value.trim()});
 persist();closeDialog('vehicleDialog');renderRecords();toast('حُفظ ملف السيارة');
}
function addVehicleService(id){
 let c=db.vehicles.find(x=>x.id===id);if(!c)return;
 $('serviceVehicleId').value=id;
 for(const f of ['serviceType','serviceKm','serviceCost','serviceNextKm','serviceNextDate','serviceNotes'])$(f).value='';
 $('serviceDate').value=selected;$('serviceDialog').showModal();
}
function saveService(){
 let c=db.vehicles.find(x=>x.id===$('serviceVehicleId').value),type=$('serviceType').value.trim();if(!c||!type){toast('اكتب نوع الصيانة');return}
 c.services??=[];
 c.services.push({id:eid('svc'),type,date:$('serviceDate').value,km:+$('serviceKm').value||0,
 cost:+$('serviceCost').value||0,nextKm:+$('serviceNextKm').value||0,nextDate:$('serviceNextDate').value,
 notes:$('serviceNotes').value.trim()});
 persist();closeDialog('serviceDialog');renderRecords();toast('تم تسجيل الصيانة تحت ملف السيارة');
}
function deleteVehicleService(vehicleId,serviceId){
 if(!confirm('حذف سجل الصيانة؟'))return;let c=db.vehicles.find(x=>x.id===vehicleId);if(!c)return;
 c.services=(c.services||[]).filter(s=>s.id!==serviceId);persist();renderRecords();
}
function showVehicleHistory(id){
 let c=db.vehicles.find(x=>x.id===id);if(!c)return;
 let a=c.renewalHistory||[];
 alert(a.length?'سجل تجديدات '+c.name+'\n'+a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('\n'):'لا توجد تجديدات سابقة مسجلة');
}
function createRecordDialog(){
 if($('genericRecordDialog'))return;
 const el=document.createElement('dialog');el.id='genericRecordDialog';
 el.innerHTML='<h3 id="recordDialogTitle">سجل</h3><div id="recordFields"></div><div class="row"><button class="btn gold" onclick="saveRecord()">حفظ</button><button class="btn" onclick="closeDialog(\'genericRecordDialog\')">إلغاء</button></div>';
 document.body.appendChild(el);
}
let editingRecord=null;
function editRecord(id){
 createRecordDialog();const schema=recordSchemas[recordSection];
 editingRecord={section:recordSection,id:id||null};let old=(db.documents[recordSection]||[]).find(x=>x.id===id)||{};
 $('recordDialogTitle').textContent=(id?'تعديل ':'إضافة ')+schema.title;
 $('recordFields').innerHTML=schema.fields.map(([key,label])=>`<label>${label}</label><input data-field="${key}" value="${esc(old[key]??'')}"/>`).join('');
 $('genericRecordDialog').showModal();
}
function saveRecord(){
 if(!editingRecord)return;const {section,id}=editingRecord,fields=recordSchemas[section].fields;
 const obj={};for(const [key] of fields)obj[key]=$('genericRecordDialog').querySelector('[data-field="'+key+'"]').value.trim();
 if(!obj.name){toast('الاسم مطلوب');return}
 const list=db.documents[section];let existing=list.find(x=>x.id===id);
 if(existing)Object.assign(existing,obj);else list.push({id:eid('doc'),...obj,history:[]});
 persist();closeDialog('genericRecordDialog');renderRecords();toast('حُفظ السجل');
}
function deleteRecord(id){
 if(!confirm('حذف السجل؟'))return;db.documents[recordSection]=(db.documents[recordSection]||[]).filter(x=>x.id!==id);persist();renderRecords();
}
