/* Jibli customer v2: delivery persistence, GPS helper, auth/session cleanup and safer client UX. */
(()=>{
 const URL='https://hsgqqugojpeynmxiktrx.supabase.co';
 const KEY='sb_publishable_M5okA1lwG2OEif5cMVYCiA_763LRInd';
 const token=()=>state.user?.access_token||localStorage.getItem('jibli_access_token')||'';
 const uid=()=>state.user?.id||null;
 async function api(path,opt={}){const h={apikey:KEY,Authorization:'Bearer '+(token()||KEY),'Content-Type':'application/json',...(opt.headers||{})};const r=await fetch(URL+path,{...opt,headers:h});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw Error(d?.message||d?.error_description||'فشل الاتصال');return d}
 function addLocationButton(inputId,label){const input=document.getElementById(inputId);if(!input||input.dataset.geo)return;input.dataset.geo='1';const b=document.createElement('button');b.type='button';b.className='btn secondary';b.style.marginTop='7px';b.textContent='📍 '+label;b.onclick=()=>{if(!navigator.geolocation)return toast('المتصفح لا يدعم تحديد الموقع');toast('جاري تحديد موقعك...');navigator.geolocation.getCurrentPosition(pos=>{const lat=pos.coords.latitude.toFixed(6),lng=pos.coords.longitude.toFixed(6);input.value=`موقعي الحالي (${lat}, ${lng})`;input.dispatchEvent(new Event('input',{bubbles:true}));toast('تم تحديد موقعك ✅')},()=>toast('تعذر الوصول إلى موقعك — اسمح بإذن الموقع'))};input.parentElement?.appendChild(b)}
 window.requestDelivery=async function(){
   if(!uid()){toast('سجّل الدخول أولاً لطلب مندوب');go('login');return}
   const f=document.getElementById('dFrom')?.value.trim(),t=document.getElementById('dTo')?.value.trim(),note=document.getElementById('dNote')?.value.trim()||'',size=document.querySelector('#dFrom')?.closest('.form')?.querySelector('select')?.value||'صغيرة';
   if(!f||!t)return toast('أكمل عناوين الاستلام والتسليم');
   try{const rows=await api('/rest/v1/delivery_requests',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({customer_id:uid(),status:'requested',pickup_address:f,delivery_address:t,package_note:note,package_size:size,payment_method:'cash',estimated_fare:0,final_fare:0})});const row=Array.isArray(rows)?rows[0]:rows;state.orders.unshift({dbid:row.id,id:'JB-'+String(row.id).slice(0,8),type:'delivery',status:'requested',from:f,to:t,total:0,created:row.created_at||new Date().toISOString()});save();toast('تم إنشاء طلب الدليفري 📦');go('orders')}catch(e){toast(e.message||'تعذر إنشاء طلب الدليفري')}};
 const oldOrderRefresh=window.jibliCustomerPro?.orderRefresh;
 if(window.jibliCustomerPro){
   window.jibliCustomerPro.orderRefresh=async function(){
     await oldOrderRefresh?.();
     if(!uid())return;
     try{const ds=await api('/rest/v1/delivery_requests?select=*&customer_id=eq.'+encodeURIComponent(uid())+'&order=created_at.desc');const local=state.orders||[];const rows=(ds||[]).map(o=>({dbid:o.id,type:'delivery',status:o.status,total:Number(o.final_fare||o.estimated_fare||0),from:o.pickup_address||'',to:o.delivery_address||'',created:o.created_at||new Date().toISOString(),id:'JB-'+String(o.id).slice(0,8)}));const merged=rows.map(r=>{const old=local.find(x=>x.dbid===r.dbid||x.id===r.id);return old?{...old,...r}:{...r}});const keep=local.filter(x=>x.type!=='delivery'||!x.dbid);state.orders=[...keep,...merged].sort((a,b)=>new Date(b.created)-new Date(a.created));save();if(state.page==='orders'||state.page==='order')render()}catch(e){console.warn('delivery refresh',e)}}}
 const oldRequestTaxi=window.requestTaxi;
 window.requestTaxi=async function(){
   const from=document.getElementById('taxiFrom')?.value?.trim(),to=document.getElementById('taxiTo')?.value?.trim(),vehicle=document.getElementById('taxiType')?.value||'اقتصادي',pay=document.getElementById('taxiPay')?.value||'نقداً';
   if(!uid()){toast('سجّل الدخول أولاً لطلب تكسي');go('login');return}
   if(!from||!to){toast('أدخل نقطة الانطلاق والوجهة');return}
   try{const rows=await api('/rest/v1/rides',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({customer_id:uid(),pickup_address:from,destination_address:to,status:'requested',vehicle_type:vehicle,payment_method:pay.includes('إلكتروني')?'electronic':'cash'})});const row=Array.isArray(rows)?rows[0]:rows;state.orders.unshift({dbid:row.id,id:'JB-'+String(row.id).slice(0,8),type:'ride',status:'requested',from,to,total:Number(row.estimated_fare||0),created:row.created_at||new Date().toISOString()});save();toast('تم إرسال طلب التكسي 🚕');go('orders')}catch(e){toast(e.message||'تعذر إرسال طلب التكسي')}};
 const oldLogout=window.logout;
 window.logout=function(){localStorage.removeItem('jibli_access_token');state.user=null;state.orders=[];state.cart=[];save();if(window.__jibliLiveChannel&&window.supabaseClient){try{window.supabaseClient.removeChannel(window.__jibliLiveChannel)}catch{}window.__jibliLiveChannel=null}oldLogout?.()};
 const observer=new MutationObserver(()=>{addLocationButton('taxiFrom','استخدام موقعي للانطلاق');addLocationButton('taxiTo','استخدام موقعي للوجهة');addLocationButton('dFrom','استخدام موقعي للاستلام');addLocationButton('dTo','استخدام موقعي للتسليم')});
 observer.observe(document.getElementById('app'),{childList:true,subtree:true});
 window.addEventListener('load',()=>{addLocationButton('taxiFrom','استخدام موقعي للانطلاق');addLocationButton('taxiTo','استخدام موقعي للوجهة');addLocationButton('dFrom','استخدام موقعي للاستلام');addLocationButton('dTo','استخدام موقعي للتسليم')});
})();