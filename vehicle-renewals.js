'use strict';
/** Renewal history belongs to an individual vehicle, not to general task lists. */
const RENEWAL_TYPES={
  registration:{label:'الاستمارة',field:'registration'},
  inspection:{label:'الفحص الدوري',field:'inspection'},
  insurance:{label:'التأمين',field:'insurance'}
};
let editingRenewalVehicle=null;
function ensureRenewalDialog(){
 if($('renewalDialog'))return;
 const dialog=document.createElement('dialog');dialog.id='renewalDialog';
 dialog.innerHTML=`<h3>📄 تسجيل تجديد وثيقة سيارة</h3>
 <p class="note" id="renewalCarName"></p>
 <div class="fields">
  <div><label for="renewalKind">نوع التجديد</label><select id="renewalKind" onchange="updateRenewalLabels()">
   <option value="registration">الاستمارة</option><option value="inspection">الفحص الدوري</option><option value="insurance">التأمين</option></select></div>
  <div><label for="renewalPerformed">تاريخ التجديد الفعلي</label><input id="renewalPerformed" type="date"/></div>
  <div><label for="renewalPrevious">تاريخ الانتهاء السابق</label><input id="renewalPrevious" type="date" readonly/></div>
  <div><label for="renewalExpiry">تاريخ الانتهاء الجديد</label><input id="renewalExpiry" type="date" required/></div>
  <div><label for="renewalCost">التكلفة بالريال (اختياري)</label><input id="renewalCost" type="number" min="0" step="0.01"/></div>
 </div>
 <label for="renewalNote">ملاحظة أو رقم الوثيقة (اختياري)</label><textarea id="renewalNote"></textarea>
 <p class="note">عند الحفظ سيتغير تاريخ انتهاء هذا النوع فقط، ويُضاف سجل تجديد داخل نفس السيارة.</p>
 <p id="renewalError" role="alert" class="error"></p>
 <div class="controls"><button class="btn gold" onclick="saveVehicleRenewal()">✓ حفظ التجديد</button>
 <button class="btn" onclick="closeDialog('renewalDialog')">إلغاء</button></div>`;
 document.body.appendChild(dialog);
}
function startVehicleRenewalFromEdit(){
 const id=$('vehicleId')?.value;
 if(!id){toast('احفظ السيارة أولًا قبل تسجيل تجديد');return}
 closeDialog('vehicleDialog');openVehicleRenewal(id);
}
function openVehicleRenewal(id,kind='registration'){
 const car=db.vehicles.find(x=>String(x.id)===String(id));if(!car)return;
 ensureRenewalDialog();editingRenewalVehicle=String(car.id);
 $('renewalCarName').textContent='السيارة: '+(car.name||'غير محددة');
 $('renewalKind').value=Object.hasOwn(RENEWAL_TYPES,kind)?kind:'registration';
 $('renewalPerformed').value=iso();
 $('renewalExpiry').value='';
 $('renewalCost').value='';
 $('renewalNote').value='';
 $('renewalError').textContent='';
 updateRenewalLabels();
 $('renewalDialog').showModal();
}
function updateRenewalLabels(){
 const car=db.vehicles.find(x=>String(x.id)===editingRenewalVehicle);
 const kind=$('renewalKind').value;
 const field=RENEWAL_TYPES[kind]?.field;
 $('renewalPrevious').value=(car&&field&&/^\d{4}-\d{2}-\d{2}$/.test(String(car[field]||'')))?car[field]:'';
}
function validRenewalDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
 const date=parseDay(value);
 return !!date&&Number.isFinite(date.getTime())&&iso(date)===value;
}
function saveVehicleRenewal(){
 const car=db.vehicles.find(x=>String(x.id)===editingRenewalVehicle);
 const kind=$('renewalKind').value,type=RENEWAL_TYPES[kind];
 if(!car||!type)return;
 const performed=$('renewalPerformed').value,expiry=$('renewalExpiry').value;
 if(!validRenewalDate(performed)||!validRenewalDate(expiry)||expiry<performed){
   $('renewalError').textContent='أدخل تاريخ التجديد وتاريخ انتهاء جديدًا صالحين؛ يجب ألا يسبق الانتهاء تاريخ التجديد.';return;
 }
 const previous=car[type.field]||'';
 const rawCost=$('renewalCost').value.trim(),cost=rawCost===''?null:Number(rawCost);
 if(cost!==null&&(!Number.isFinite(cost)||cost<0)){
   $('renewalError').textContent='التكلفة غير صالحة.';return;
 }
 if(previous&&validRenewalDate(previous)&&expiry<=previous &&
    !confirm('الانتهاء الجديد ليس بعد الانتهاء السابق ('+previous+'). هل تريد حفظه رغم ذلك؟'))return;
 car.renewalHistory??=[];
 if(car.renewalHistory.some(x=>x&&typeof x==='object'&&x.kind===kind&&x.performed===performed&&x.newExpiry===expiry)){
   $('renewalError').textContent='سُجل هذا التجديد مسبقًا بنفس التاريخ والانتهاء.';return;
 }
 car.renewalHistory.push({id:eid('renewal'),kind,label:type.label,performed,
   oldExpiry:previous,newExpiry:expiry,cost,notes:$('renewalNote').value.trim(),
   recordedAt:new Date().toISOString()});
 car[type.field]=expiry;
 persist();closeDialog('renewalDialog');refresh();
 toast('تم تسجيل تجديد '+type.label+' وتحديث انتهاء '+car.name);
}
function renewalHistoryHTML(car){
 const records=Array.isArray(car.renewalHistory)?car.renewalHistory:[];
 const sorted=records.slice().sort((a,b)=>String(b?.performed||'').localeCompare(String(a?.performed||'')));
 return sorted.length?sorted.map(entry=>{
   if(!entry||typeof entry!=='object')return '<div class="entry small">'+esc(String(entry??''))+'</div>';
   const label=RENEWAL_TYPES[entry.kind]?.label||entry.label||entry.type||'تجديد';
   const time=entry.performed||entry.date||'تاريخ غير محدد';
   return `<div class="entry"><strong>${esc(label)}</strong>
    <div class="small">تاريخ التجديد: ${esc(time)}</div>
    <div class="small">الانتهاء السابق: ${esc(entry.oldExpiry||'غير مسجل')} ← الجديد: ${esc(entry.newExpiry||'غير مسجل')}</div>
    ${entry.cost!==null&&entry.cost!==undefined?`<div class="small">التكلفة: ${num(entry.cost)} ريال</div>`:''}
    ${entry.notes?`<div class="note">${esc(entry.notes)}</div>`:''}</div>`;
 }).join(''):'<p class="note">لم تُسجّل تجديدات لهذه السيارة بعد.</p>';
}
const initialCarCareView=carCareView;
carCareView=function(car){
 let content=initialCarCareView(car);
 const old='<div class="small">العداد: '+num(car.odometer||0)+' كم</div>';
 if(!content.includes(old))return content;
 const newBlock=`<div class="controls"><button class="btn gold tiny" onclick="openVehicleRenewal('${esc(car.id)}')">✓ تسجيل تجديد</button>
   <button class="btn tiny" onclick="openVehicleRenewal('${esc(car.id)}','inspection')">تجديد الفحص</button>
   <button class="btn tiny" onclick="openVehicleRenewal('${esc(car.id)}','insurance')">تجديد التأمين</button></div>
  <details class="careRenewal" data-care-key="${esc(car.id)}:renewals">
   <summary>📄 سجل تجديدات الوثائق (${num((car.renewalHistory||[]).length)})</summary>
   ${renewalHistoryHTML(car)}
  </details>`;
 content=content.replace(old,old+newBlock);
 return content;
};
const beforeHistory=showVehicleHistory;
showVehicleHistory=function(id){
 const car=db.vehicles.find(x=>String(x.id)===String(id));if(!car)return;
 if(recordSection!=='vehicles')switchRecords('vehicles');
 go('records');
 const idx=db.vehicles.indexOf(car);
 const visible=document.querySelectorAll('#recordRows .careRenewal')[idx];
 if(visible){visible.open=true;visible.scrollIntoView({block:'start',behavior:'smooth'});}
 else beforeHistory(id);
};
