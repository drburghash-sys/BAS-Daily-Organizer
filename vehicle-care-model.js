'use strict';
/** Vehicle care is a property of each vehicle record, never a parallel task store. */
const CAR_CATALOG=[
['engineOil','زيت المحرك','المحرك',10000,12],
['oilFilter','فلتر الزيت','المحرك',10000,12],
['airFilter','فلتر هواء المحرك','الفلاتر',20000,12],
['cabinFilter','فلتر المكيف','الفلاتر',20000,12],
['tireRotate','تدوير الإطارات','الإطارات',10000,6],
['tireCheck','فحص ضغط وحالة الإطارات','الإطارات',0,1],
['tiresReplace','تغيير الإطارات (الكفرات)','الإطارات',0,0],
['brakes','فحص الفرامل والفحمات','الفرامل',10000,6],
['brakePads','تغيير فحمات الفرامل','الفرامل',0,0],
['brakeDiscs','فحص أو خرط/تغيير الهوبات','الفرامل',0,0],
['brakeFluid','سائل (زيت) الفرامل','السوائل',40000,24],
['coolant','سائل التبريد','السوائل',50000,24],
['transmission','زيت القير (ناقل الحركة)','نقل الحركة',60000,36],
['diff','زيت الدفرنس','الدفع الرباعي',50000,24],
['transfer','زيت الدبل (علبة التحويل)','الدفع الرباعي',50000,24],
['spark','البواجي','المحرك',60000,48],
['battery','فحص البطارية','الكهرباء',0,12],
['wipers','مساحات الزجاج','السلامة',0,12],
['washer','ماء ورشاش المساحات','السلامة',0,0],
['ac','فحص المكيف','المكيف',0,0],
['belt','فحص السيور والخراطيم','المحرك',0,0],
['inspectionTires','الفحص: حالة الإطارات','التحضير للفحص الدوري',0,0],
['inspectionBrakes','الفحص: الفرامل وكفاءة التوقف','التحضير للفحص الدوري',0,0],
['inspectionLights','الفحص: الأنوار والإشارات','التحضير للفحص الدوري',0,0],
['inspectionExhaust','الفحص: العادم والانبعاثات','التحضير للفحص الدوري',0,0],
['inspectionGlass','الفحص: الزجاج الأمامي والمرايا','التحضير للفحص الدوري',0,0],
['inspectionWipers','الفحص: المساحات والرشاشات','التحضير للفحص الدوري',0,0],
['inspectionSeatbelts','الفحص: أحزمة الأمان والبوق','التحضير للفحص الدوري',0,0],
['inspectionSteering','الفحص: المقود والتعليق','التحضير للفحص الدوري',0,0],
['inspectionLeaks','الفحص: تسرب الزيوت والسوائل','التحضير للفحص الدوري',0,0],
['inspectionBody','الفحص: الهيكل والشاصي واللوحات','التحضير للفحص الدوري',0,0]
];
function carPlan(car){
 if(!Array.isArray(car.maintenancePlan))car.maintenancePlan=[];
 for(const [id,name,category,intervalKm,intervalMonths] of CAR_CATALOG){
   if(!car.maintenancePlan.some(x=>x.id===id))car.maintenancePlan.push({
     id,name,category,intervalKm,intervalMonths,lastKm:null,lastDate:'',
     nextKm:null,nextDate:'',manualRequired:false,disabled:false,notes:''
   });
 }
 return car.maintenancePlan;
}
function carById(id){return db.vehicles.find(v=>String(v.id)===String(id))}
function carItem(car,id){return carPlan(car).find(x=>String(x.id)===String(id))}
function addMonthISO(s,months){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s||'')||!(+months>0))return '';
 let [year,month,day]=s.split('-').map(Number);
 let total=year*12+month-1+Number(months),y=Math.floor(total/12),m=total%12;
 const last=new Date(y,m+1,0).getDate();
 return [y,String(m+1).padStart(2,'0'),String(Math.min(day,last)).padStart(2,'0')].join('-');
}
function carNext(item){
 const k=Number(item.intervalKm)||0,m=Number(item.intervalMonths)||0;
 const lk=item.lastKm!==''&&item.lastKm!==null&&item.lastKm!==undefined?Number(item.lastKm):null;
 return {km:(item.nextKm!==null&&item.nextKm!==''&&item.nextKm!==undefined)?Number(item.nextKm):lk!==null&&k>0?lk+k:null,
 date:item.nextDate||((item.lastDate&&m>0)?addMonthISO(item.lastDate,m):'')};
}
function serviceStatus(car,item,date=selected){
 if(item.disabled)return {state:'disabled',label:'موقوف'};
 if(item.manualRequired)return {state:'due',label:'مطلوب الآن'};
 const next=carNext(item),odo=Number(car.odometer)||0;
 const km=next.km!==null?next.km-odo:null,days=next.date?Math.round((parseDay(next.date)-parseDay(date))/86400000):null;
 if((km!==null&&km<=0)||(days!==null&&days<=0))return {state:'due',label:'مطلوب',km,days};
 if((km!==null&&km<=1000)||(days!==null&&days<=30))return {state:'soon',label:'قادم قريبًا',km,days};
 if(km!==null||days!==null)return {state:'future',label:'قادم',km,days};
 return {state:'unconfigured',label:'لم تُحدد آخر صيانة'};
}
function dueCare(date=selected){
 const rows=[];
 for(const car of db.vehicles)for(const item of carPlan(car)){
   const status=serviceStatus(car,item,date);
   if(status.state==='due'||status.state==='soon')rows.push({car,item,status});
 }
 return rows;
}
function maintenanceStats(car){
 const counts={due:0,soon:0,future:0,unconfigured:0,disabled:0};
 for(const item of carPlan(car)){const status=serviceStatus(car,item);counts[status.state]++;}
 return counts;
}
function formatServiceNext(item){
 const n=carNext(item),parts=[];
 if(n.km!==null)parts.push('عند '+num(n.km)+' كم');
 if(n.date)parts.push('بتاريخ '+esc(n.date));
 return parts.join(' · ')||'سجّل آخر تنفيذ أو موعد الصيانة القادمة';
}
