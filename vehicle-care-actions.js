'use strict';
let editingCare=null;
function createCareDialog(){
 if($('careDialog'))return;
 const el=document.createElement('dialog');el.id='careDialog';
 el.innerHTML=`<h3 id="careHeading">ضبط صيانة السيارة</h3>
 <p class="note">الفترات مبدئية من البرنامج السابق، وقد تختلف بحسب الطراز والاستخدام ودليل الصيانة. يمكن وضع موعد قادم مباشر، أو تسجيل آخر تنفيذ وترك التطبيق يحسب القادم.</p>
 <div class="fields">
  <div><label>البند</label><input id="careTitle" maxlength="100"></div>
  <div><label>الفئة</label><input id="careCategory" maxlength="70"></div>
  <div><label>كل كم كيلومتر (صفر = بدون)</label><input id="careIntervalKm" type="number" min="0"></div>
  <div><label>كل كم شهر (صفر = بدون)</label><input id="careIntervalMonths" type="number" min="0"></div>
  <div><label>آخر تنفيذ عند عداد (كم)</label><input id="careLastKm" type="number" min="0"></div>
  <div><label>تاريخ آخر تنفيذ</label><input id="careLastDate" type="date"></div>
  <div><label>العداد القادم (كم)</label><input id="careNextKm" type="number" min="0"></div>
  <div><label>موعد قادم محدد</label><input id="careNextDate" type="date"></div>
 </div>
 <label>ملاحظات</label><textarea id="careNotes"></textarea>
 <label class="row"><input type="checkbox" id="careRequired" style="width:20px;min-height:auto"/> مطلوب الآن (يظهر في الرئيسية)</label>
 <label class="row"><input type="checkbox" id="careDisabled" style="width:20px;min-height:auto"/> تعطيل هذا البند لهذه السيارة</label>
 <div class="controls"><button class="btn gold" onclick="saveCarePlan()">حفظ المواعيد</button>
 <button class="btn" onclick="closeDialog('careDialog')">إلغاء</button></div>`;
 document.body.appendChild(el);
}
function editCarePlan(carId,itemId=''){
 const car=carById(carId);if(!car)return;
 createCareDialog();
 const existing=itemId?carItem(car,itemId):null;
 editingCare={carId,itemId:itemId||null};
 $('careHeading').textContent=existing?'تعديل: '+existing.name:'إضافة بند صيانة خاص بـ '+car.name;
 for(const [id,value] of [
  ['careTitle',existing?.name||''],['careCategory',existing?.category||'أخرى'],
  ['careIntervalKm',existing?.intervalKm??0],['careIntervalMonths',existing?.intervalMonths??0],
  ['careLastKm',existing?.lastKm??''],['careLastDate',existing?.lastDate||''],
  ['careNextKm',existing?.nextKm??''],['careNextDate',existing?.nextDate||''],
  ['careNotes',existing?.notes||'']])$(id).value=value;
 $('careRequired').checked=!!existing?.manualRequired;
 $('careDisabled').checked=!!existing?.disabled;
 $('careDialog').showModal();
}
function numberOrNull(id){const text=String($(id).value).trim();return text===''?null:Number(text)}
function saveCarePlan(){
 if(!editingCare)return;const car=carById(editingCare.carId);if(!car)return;
 const name=$('careTitle').value.trim(),cat=$('careCategory').value.trim()||'أخرى';
 if(!name){toast('أدخل اسم بند الصيانة');return}
 const km=Number($('careIntervalKm').value)||0,months=Number($('careIntervalMonths').value)||0,
  lastKm=numberOrNull('careLastKm'),nextKm=numberOrNull('careNextKm');
 if([km,months,lastKm,nextKm].some(v=>v!==null&&(!Number.isFinite(v)||v<0))){toast('راجع قيم الكيلومترات والأشهر');return}
 let item=editingCare.itemId?carItem(car,editingCare.itemId):null;
 if(!item){item={id:eid('custom-care'),lastKm:null,lastDate:'',nextKm:null,nextDate:'',disabled:false};carPlan(car).push(item)}
 Object.assign(item,{name,category:cat,intervalKm:Math.round(km),intervalMonths:Math.round(months),
  lastKm,lastDate:$('careLastDate').value,nextKm,nextDate:$('careNextDate').value,
  manualRequired:$('careRequired').checked,disabled:$('careDisabled').checked,notes:$('careNotes').value.trim()});
 persist();closeDialog('careDialog');refresh();toast('حُفظ بند الصيانة ضمن السيارة');
}
function showDisabledCare(carId){
 const car=carById(carId);if(!car)return;
 const off=carPlan(car).filter(x=>x.disabled);
 if(!off.length){toast('لا توجد بنود معطلة');return}
 const response=prompt('اختر رقم البند لإعادة تفعيله:\n'+off.map((x,i)=>(i+1)+'. '+x.name).join('\n'),'1');
 if(response===null)return;
 const n=Number(response);if(!Number.isInteger(n)||n<1||n>off.length){toast('رقم غير صحيح');return}
 off[n-1].disabled=false;persist();refresh();toast('أُعيد تفعيل البند');
}
const previousAddVehicleService=addVehicleService;
addVehicleService=function(carId){
 previousAddVehicleService(carId);
 if($('servicePlanId'))$('servicePlanId').value='';
 $('serviceType').readOnly=false;
 $('serviceDialog').querySelector('h3').textContent='تسجيل صيانة غير مدرجة';
};
function openCareCompletion(carId,itemId){
 const car=carById(carId),item=car&&carItem(car,itemId);if(!item)return;
 addVehicleService(carId);
 $('servicePlanId').value=itemId;
 $('serviceType').value=item.name;$('serviceType').readOnly=true;
 $('serviceKm').value=Number(car.odometer)||'';
 $('serviceDialog').querySelector('h3').textContent='✓ تسجيل إنجاز: '+item.name;
 const next=carNext(item);
 // Entering service completion initializes next date/km from the new completion, not the old due date.
 $('serviceNextKm').value='';
 $('serviceNextDate').value='';
}
const previousSaveService=saveService;
saveService=function(){
 const car=carById($('serviceVehicleId').value),itemId=$('servicePlanId')?.value||'';
 if(!car)return;
 if(!itemId){
   const before=(car.services||[]).length;
   previousSaveService();
   if((car.services||[]).length>before){
     const log=car.services[car.services.length-1];
     const idx=carPlan(car).find(x=>x.name===log.type);
     if(idx){log.itemId=idx.id;log.before=careStateSnapshot(idx);completeCareState(car,idx,log)}
     persist();refresh();
   }
   return;
 }
 const item=carItem(car,itemId),type=item?.name;if(!item)return;
 const date=$('serviceDate').value||selected,km=numberOrNull('serviceKm'),
  cost=numberOrNull('serviceCost'),nextKm=numberOrNull('serviceNextKm');
 if(km!==null&&(!Number.isFinite(km)||km<0)||cost!==null&&(!Number.isFinite(cost)||cost<0)||
    nextKm!==null&&(!Number.isFinite(nextKm)||nextKm<0)){toast('راجع العداد والتكلفة');return}
 if(km!==null&&nextKm!==null&&nextKm<=km){toast('العداد القادم يجب أن يكون أكبر من عداد التنفيذ');return}
 car.services??=[];
 if(car.services.some(s=>s.itemId===itemId&&s.date===date&&s.km===km)){
   toast('هذا التنفيذ مسجل مسبقًا لنفس التاريخ والعداد');return;
 }
 const log={id:eid('svc'),itemId,type,date,km,cost:cost||0,nextKm,nextDate:$('serviceNextDate').value,
   notes:$('serviceNotes').value.trim(),before:careStateSnapshot(item)};
 car.services.push(log);
 completeCareState(car,item,log);
 persist();closeDialog('serviceDialog');refresh();
 toast('تم التنفيذ وحُفظ سجل الصيانة، وأُزيل التنبيه المستحق عند تحديد الموعد القادم');
};
function careStateSnapshot(item){
 const keys=['lastKm','lastDate','nextKm','nextDate','manualRequired'];
 return Object.fromEntries(keys.map(k=>[k,item[k]??(k==='manualRequired'?false:null)]));
}
function completeCareState(car,item,log){
 if(log.km!==null&&log.km!==undefined&&Number.isFinite(Number(log.km))){
   item.lastKm=Number(log.km);car.odometer=Math.max(Number(car.odometer)||0,Number(log.km));
 }
 item.lastDate=log.date||'';
 item.manualRequired=false;
 item.nextKm=log.nextKm!==null&&log.nextKm!==undefined&&log.nextKm!==''?Number(log.nextKm):null;
 item.nextDate=log.nextDate||'';
}
const previousDeleteVehicleService=deleteVehicleService;
deleteVehicleService=function(carId,serviceId){
 const car=carById(carId),log=car?.services?.find(x=>String(x.id)===String(serviceId));
 if(!car||!log||!confirm('حذف تسجيل الصيانة؟ سيتم استعادة حالة البند السابقة إن كانت متاحة.'))return;
 const item=log.itemId?carItem(car,log.itemId):null;
 const isLast=item&&car.services.filter(s=>s.itemId===log.itemId).at(-1)?.id===log.id;
 if(isLast&&log.before)Object.assign(item,log.before);
 car.services=car.services.filter(x=>String(x.id)!==String(serviceId));
 persist();refresh();toast('حُذف سجل الصيانة');
};
