'use strict';
/* Document renewals are saved only inside each vehicle record.
   The log is additive; prior imported vehicle data is kept unchanged. */
const RENEWAL_FIELDS={
  registration:'الاستمارة',
  inspection:'الفحص الدوري',
  insurance:'التأمين'
};
let renewalEditingCar=null;
function renewalHistoryFor(car){
 if(!Array.isArray(car.renewalHistory))car.renewalHistory=[];
 return car.renewalHistory;
}
function openVehicleRenewal(vehicleId,kind='registration'){
 const car=carById(vehicleId);if(!car)return;
 if(!RENEWAL_FIELDS[kind])kind='registration';
 renewalEditingCar=String(car.id);
 $('renewalCarName').textContent='🚘 '+car.name;
 $('renewalType').value=kind;
 $('renewalDate').value=iso();
 $('renewalExpiry').value=''; // Never guess the new expiry date.
 $('renewalAmount').value='';
 $('renewalNotes').value='';
 showPreviousRenewalExpiry();
 $('renewalDialog').showModal();
}
function showPreviousRenewalExpiry(){
 const car=carById(renewalEditingCar),kind=$('renewalType').value;
 $('renewalPrevious').textContent=car?'تاريخ الانتهاء المسجل حاليًا: '+(car[kind]||'غير مسجل'):'';
}
function saveVehicleRenewal(){
 const car=carById(renewalEditingCar);if(!car)return;
 const kind=$('renewalType').value,completed=$('renewalDate').value,expiry=$('renewalExpiry').value;
 const amountRaw=$('renewalAmount').value.trim(),amount=amountRaw===''?null:Number(amountRaw);
 if(!RENEWAL_FIELDS[kind]){toast('اختر نوع التجديد');return}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(completed)||!/^\d{4}-\d{2}-\d{2}$/.test(expiry)){
   toast('أدخل تاريخ التجديد وتاريخ الانتهاء الجديد');return;
 }
 if(expiry<completed){toast('تاريخ الانتهاء الجديد يسبق تاريخ التجديد؛ راجع التاريخين');return}
 if(amount!==null&&(!Number.isFinite(amount)||amount<0)){toast('تكلفة التجديد غير صحيحة');return}
 const log=renewalHistoryFor(car);
 if(log.some(x=>x&&typeof x==='object'&&x.type===kind&&x.date===completed&&x.newExpiry===expiry)){
   toast('عملية التجديد مسجلة مسبقًا بنفس التاريخ والانتهاء');return;
 }
 log.push({id:eid('renew'),type:kind,date:completed,previousExpiry:car[kind]||'',
   newExpiry:expiry,cost:amount,notes:$('renewalNotes').value.trim(),recordedAt:new Date().toISOString()});
 car[kind]=expiry;
 persist();
 closeDialog('renewalDialog');
 refresh();
 toast('حُفظ تجديد '+RENEWAL_FIELDS[kind]+' في سجل '+car.name+' وتحدث تاريخ الانتهاء');
}
function deleteVehicleRenewal(vehicleId,renewalId){
 const car=carById(vehicleId);if(!car)return;
 const log=renewalHistoryFor(car),index=log.findIndex(x=>x&&typeof x==='object'&&x.id===renewalId);
 if(index<0)return;
 const item=log[index];
 if(!confirm('حذف تجديد '+(RENEWAL_FIELDS[item.type]||item.type)+'؟'))return;
 const lastSame=log.findLast(x=>x&&typeof x==='object'&&x.type===item.type);
 // Restore the previous expiry only when this is the most recent renewal of
 // that type and the currently stored expiry still equals its new expiry.
 if(lastSame?.id===item.id&&car[item.type]===item.newExpiry)car[item.type]=item.previousExpiry||'';
 log.splice(index,1);
 persist();refresh();toast('حُذف سجل التجديد');
}
function renewalHistoryMarkup(car){
 const entries=renewalHistoryFor(car).slice().reverse();
 return entries.length?entries.map(r=>{
   if(typeof r==='string')return '<div class="entry"><strong>'+esc(r)+'</strong></div>';
   if(!r||typeof r!=='object')return '';
   const name=RENEWAL_FIELDS[r.type]||r.type||r.name||'تجديد';
   const date=r.date||r.renewalDate||'دون تاريخ';
   const newExpiry=r.newExpiry||r.expiryDate||'غير محدد';
   const cost=r.cost===null||r.cost===undefined?'':(' · '+num(r.cost)+' ر.س');
   return `<div class="entry">
     <strong>${esc(name)}</strong>
     <small class="small">تاريخ التجديد: ${esc(date)} · الانتهاء الجديد: ${esc(newExpiry)}${cost}</small>
     ${r.previousExpiry?`<small class="small">الانتهاء السابق: ${esc(r.previousExpiry)}</small>`:''}
     ${r.notes?`<p class="note">${esc(r.notes)}</p>`:''}
     ${r.id&&r.newExpiry?`<button class="btn tiny danger" onclick="deleteVehicleRenewal('${esc(car.id)}','${esc(r.id)}')">حذف التسجيل</button>`:''}
     </div>`;
 }).join(''):'<p class="note">لا توجد تجديدات مسجلة بعد. استخدم زر «＋ تسجيل تجديد».</p>';
}
