/* Unified BAS work center. Edits the existing Mofakkirati data in place
   and displays legacy daily custom tasks until the user removes them.
   No silent migration or destruction of stored data. */
'use strict';
let unifiedRows=[];
let editingUnified=null;
function unifiedMemoData(){
  const m=readSource('memo');
  return m&&typeof m==='object'&&!Array.isArray(m)?
    {...m,items:Array.isArray(m.items)?m.items:[],memories:Array.isArray(m.memories)?m.memories:[],oncalls:Array.isArray(m.oncalls)?m.oncalls:[]}:
    {items:[],memories:[],oncalls:[]};
}
function writeUnifiedMemo(m){
  localStorage.setItem(DATA_KEYS.memo,JSON.stringify(m));
}
function unifiedListData(){
  const m=unifiedMemoData();
  const old=m.items.filter(t=>t&&!t.deleted).map(t=>({
     source:'memo',id:String(t.id),type:t.type||'task',title:t.title||'مهمة',
     details:t.details||'',date:t.date||t.autoDate||'',time:t.time||'',
     priority:Number(t.priority)||1,done:!!t.done,obj:t
  }));
  const custom=state.custom.map(t=>({
    source:'custom',id:String(t.id),type:'task',title:t.title||'مهمة',
    details:'',date:t.date||'',time:'',priority:Number(t.priority)||2,
    done:!!t.done,obj:t
  }));
  const notes=m.memories.map(n=>({
    source:'memory',id:String(n.id),type:'memory',title:n.text||'معلومة',
    details:n.extra||'',date:'',time:'',priority:1,done:false,obj:n
  }));
  return [...old,...custom,...notes];
}
function unifiedRef(row){
 if(!row)return null;
 if(row.source==='custom')return state.custom.find(x=>String(x.id)===row.id)||null;
 const m=unifiedMemoData();
 return (row.source==='memory'?m.memories:m.items).find(x=>String(x.id)===row.id)||null;
}
function unifiedPage(){
 const el=$('unifiedList');
 if(!el)return;
 const query=String($('unifiedSearch')?.value||'').toLocaleLowerCase('ar').trim();
 const filter=$('unifiedFilter')?.value||'active';
 const all=unifiedListData();
 const filtered=all.filter(row=>{
   if(filter==='active'&&(row.done||row.type==='memory'||row.type==='idea'||row.type==='topic'))return false;
   if(filter==='done'&&!row.done)return false;
   if(filter==='notes'&&!['memory','idea','topic'].includes(row.type))return false;
   if(filter==='appointments'&&!['appointment','followup'].includes(row.type))return false;
   if(filter==='all'){} // intentional: show all types
   if(query&&!([row.title,row.details,row.date,row.type].join(' ')).toLocaleLowerCase('ar').includes(query))return false;
   return true;
 }).sort((a,b)=>{
   if(a.done!==b.done)return a.done?1:-1;
   let aDue=a.date||'9999-12-31',bDue=b.date||'9999-12-31';
   return aDue.localeCompare(bDue)||(b.priority-a.priority)||a.title.localeCompare(b.title,'ar');
 });
 unifiedRows=filtered;
 const names={task:'مهمة',appointment:'موعد',followup:'متابعة',idea:'فكرة',topic:'موضوع',memory:'معلومة'};
 el.innerHTML=filtered.length?filtered.map((r,i)=>`<article class="unifiedTask ${r.done?'unifiedDone':''}">
   <div class="grow">
    <div><strong>${ehtml(r.title)}</strong>
    <span class="pill">${names[r.type]||'عمل'}</span></div>
    <small>${r.date?ehtml(r.date):'بلا تاريخ'}${r.time?' · '+ehtml(r.time):''}${r.source==='custom'?' · من الجدول السابق':''}${r.done?' · منجزة':''}</small>
    ${r.details?`<p class="unifiedDetails">${ehtml(r.details)}</p>`:''}
   </div>
   <div class="unifiedActions">
    ${['task','appointment','followup'].includes(r.type)?`<button class="btn tiny" onclick="setUnifiedDone(${i})">${r.done?'↶ إعادة':'✓ إنجاز'}</button>`:''}
    <button class="btn tiny" onclick="openUnifiedEditor(${i})">✎ تعديل</button>
    <button class="btn tiny warn" onclick="deleteUnifiedItem(${i})">🗑 حذف</button>
   </div>
  </article>`).join(''):'<div class="note">لا توجد عناصر مطابقة. يمكنك إضافة أول عمل من الزر أعلاه.</div>';
 const pending=all.filter(r=>!r.done&&['task','appointment','followup'].includes(r.type)).length;
 const notes=all.filter(r=>['idea','topic','memory'].includes(r.type)).length;
 const oncall=unifiedMemoData().oncalls.length;
 $('unifiedCounts').textContent=`أعمال غير منجزة: ${fmtNum(pending)} · أفكار ومعلومات: ${fmtNum(notes)} · مناوبات: ${fmtNum(oncall)}`;
 unifiedOncalls();
}
function openUnifiedEditor(index=-1){
  const r=index<0?null:unifiedRows[index];
  if(index>=0&&!r)return;
  editingUnified=r?{source:r.source,id:r.id}:null;
  const target=r?.obj||null;
  $('unifiedDialogTitle').textContent=r?'تعديل العمل':'إضافة عمل جديد';
  $('unifiedType').value=r?.type||'task';
  $('unifiedTitle').value=r?.title||'';
  $('unifiedDetail').value=r?.details||'';
  $('unifiedDate').value=r?.date||selected;
  $('unifiedTime').value=r?.time||'';
  $('unifiedPriority').value=String(r?.priority||2);
  $('unifiedDuration').value=String(target?.minutes||(target?.size?(Number(target.size)*10):25));
  if(!['task','appointment','followup','idea','topic','memory'].includes($('unifiedType').value))$('unifiedType').value='task';
  $('unifiedError').textContent='';
  const dlg=$('unifiedDialog');if(!dlg.open)dlg.showModal();
}
function closeUnifiedEditor(){if($('unifiedDialog').open)$('unifiedDialog').close();editingUnified=null}
function cleanTimeOverrides(id){
 for(const day of Object.keys(state.timeOverrides||{})){
   if(!state.timeOverrides[day])continue;
   delete state.timeOverrides[day][id];
   if(!Object.keys(state.timeOverrides[day]).length)delete state.timeOverrides[day];
 }
}
function saveUnifiedItem(){
 const title=$('unifiedTitle').value.trim(),type=$('unifiedType').value;
 const date=$('unifiedDate').value, time=$('unifiedTime').value;
 const priority=Number($('unifiedPriority').value)||2,minutes=Number($('unifiedDuration').value)||25;
 if(!title){$('unifiedError').textContent='اكتب عنوان العمل.';return}
 if(['appointment','followup'].includes(type)&&!date){$('unifiedError').textContent='حدد تاريخ الموعد أو المتابعة.';return}
 if(time&&minute(time)===null){$('unifiedError').textContent='الوقت غير صالح.';return}
 if(minutes<5||minutes>240){$('unifiedError').textContent='مدة المهمة بين ٥ و٢٤٠ دقيقة.';return}
 const desc=$('unifiedDetail').value.trim();
 const old=editingUnified;
 if(old?.source==='custom'){
   const c=state.custom.find(t=>String(t.id)===old.id);
   if(!c)return;
   if(['idea','topic','appointment','followup','memory'].includes(type)){
     // Explicit edit transfers the old custom item into the unified Mofakkirati store.
     const idx=state.custom.indexOf(c);
     if(idx>=0)state.custom.splice(idx,1);
     cleanTimeOverrides('custom:'+c.id);
     editingUnified=null;
   }else{
     Object.assign(c,{title,date,minutes,priority});
     saveState();closeUnifiedEditor();renderAll();showToast('تم تحديث العمل');return;
   }
 }
 const m=unifiedMemoData();
 if(type==='memory'){
   if(old?.source==='memory'){
     const n=m.memories.find(x=>String(x.id)===old.id);
     if(!n)return;
     n.text=title;n.extra=desc;
   }else{
     m.memories.push({id:'bmemory'+Date.now().toString(36)+Math.random().toString(36).slice(2),text:title,extra:desc,created:new Date().toISOString(),category:'بدون تصنيف',tags:[],link:'',fav:false});
     if(old?.source==='memo'){
       const item=m.items.find(x=>String(x.id)===old.id);if(item)item.deleted=true;
     }
   }
 }else{
   let t=old?.source==='memo'?m.items.find(x=>String(x.id)===old.id):null;
   if(!t){
     t={id:'bas'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),created:new Date().toISOString(),done:false,deleted:false,topicId:'',autoDate:''};
     m.items.push(t);
   }
   const formerDate=t.date||t.autoDate||'';
   const prevType=t.type;
   Object.assign(t,{title,type,details:desc,priority,minutes,size:Math.max(1,Math.round(minutes/10)),
      date:['idea','topic'].includes(type)?'':date,time:time||'',deleted:false});
   if(!old||old.source!=='memo')t.autoDate='';
   else if(formerDate&&date&&formerDate!==date)t.autoDate='';
   if(prevType==='topic'&&type!=='topic')t.topicId='';
   if(old?.source==='memory'){
     m.memories=m.memories.filter(n=>String(n.id)!==old.id);
   }
 }
 writeUnifiedMemo(m);
 if(old?.source==='custom')saveState();
 closeUnifiedEditor();renderAll();unifiedPage();showToast('حُفظ العمل في مركز الأعمال الموحد');
}
function setUnifiedDone(index){
 const r=unifiedRows[index];if(!r)return;
 if(r.source==='custom'){
   const c=state.custom.find(x=>String(x.id)===r.id);if(!c)return;
   c.done=!c.done;saveState();
 }else if(r.source==='memo'){
   const m=unifiedMemoData(),item=m.items.find(x=>String(x.id)===r.id);if(!item)return;
   item.done=!item.done;writeUnifiedMemo(m);
 }
 renderAll();unifiedPage();
}
function deleteUnifiedItem(index){
 const r=unifiedRows[index];if(!r)return;
 if(!window.confirm('حذف «'+r.title+'» من مركز الأعمال؟\nسيُزال من الجدول ولن يظهر في الأيام القادمة.'))return;
 if(r.source==='custom'){
   state.custom=state.custom.filter(x=>String(x.id)!==r.id);
   cleanTimeOverrides('custom:'+r.id);saveState();
 }else{
   const m=unifiedMemoData();
   if(r.source==='memory')m.memories=m.memories.filter(x=>String(x.id)!==r.id);
   else {
     const item=m.items.find(x=>String(x.id)===r.id);if(item)item.deleted=true;
     cleanTimeOverrides('memo:'+r.id);saveState();
   }
   writeUnifiedMemo(m);
 }
 renderAll();unifiedPage();showToast('حُذف العمل');
}
function addQuickMemoTask(){
 const title=$('quickTitle').value.trim();if(!title){showToast('اكتب اسم المهمة أولًا');return}
 const m=unifiedMemoData(),minutes=Number($('quickMinutes').value)||25;
 m.items.push({id:'bas'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
   type:'task',title,details:'',topicId:'',priority:Number($('quickPriority').value)||2,
   size:Math.max(1,Math.round(minutes/10)),minutes,date:selected,time:'',autoDate:'',
   done:false,deleted:false,created:new Date().toISOString()});
 writeUnifiedMemo(m);$('quickTitle').value='';renderAll();showToast('أُضيفت المهمة إلى مركز الأعمال والجدول');
}
function unifiedOncalls(){
 const out=$('unifiedOncallList');if(!out)return;
 const m=unifiedMemoData();
 out.innerHTML=m.oncalls.length?m.oncalls.map((c,i)=>
  `<div class="addedTaskRow"><div class="grow"><strong>${ehtml(c.date||'بدون تاريخ')}</strong>
   <small>${ehtml(c.note||'مناوبة')}</small></div>
   <button class="btn warn tiny" onclick="removeUnifiedOncall(${i})">حذف</button></div>`).join(''):
  '<div class="note">لا توجد مناوبات مسجلة.</div>';
}
function addUnifiedOncall(){
 const date=$('unifiedOncallDate').value;if(!date){showToast('اختر تاريخ المناوبة');return}
 const m=unifiedMemoData();
 if(m.oncalls.some(x=>x.date===date)){showToast('المناوبة مسجلة بالفعل');return}
 m.oncalls.push({id:'basoc'+Date.now().toString(36),date,note:$('unifiedOncallNote').value.trim()});
 writeUnifiedMemo(m);$('unifiedOncallNote').value='';renderAll();unifiedPage();
}
function removeUnifiedOncall(index){
 const m=unifiedMemoData(),row=m.oncalls[index];if(!row)return;
 if(!confirm('حذف مناوبة '+row.date+'؟'))return;
 m.oncalls.splice(index,1);writeUnifiedMemo(m);renderAll();unifiedPage();
}
function unifiedUpdated(){unifiedPage();}
function unifiedBootstrap(){
  const date=$('unifiedOncallDate');if(date)date.value=selected;
  unifiedPage();renderAll();
}
unifiedBootstrap();
