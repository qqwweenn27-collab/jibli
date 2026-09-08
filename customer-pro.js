/* Jibli Customer Pro: real auth persistence, safe customer writes, saved addresses and live order refresh. */
(()=>{
 const URL='https://hsgqqugojpeynmxiktrx.supabase.co';
 const KEY='sb_publishable_M5okA1lwG2OEif5cMVYCiA_763LRInd';
 const headers=(token)=>({apikey:KEY,Authorization:'Bearer '+(token||KEY),'Content-Type':'application/json'});
 const token=()=>state.user?.access_token||localStorage.getItem('jibli_access_token')||'';
 const uid=()=>state.user?.id||null;
 async function api(path,opt={}){const r=await fetch(URL+path,{...opt,headers:{...headers(token()),...(opt.headers||{})}});const txt=await r.text();let d=null;try{d=txt?JSON.parse(txt):null}catch{d=txt}if(!r.ok)throw Error(d?.message||d?.error_description||'فشل الاتصال');return d}
 async function ensureClient(){
   if(window.supabaseClient)return window.supabaseClient;
   try{const m=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');window.supabaseClient=m.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});return window.supabaseClient}catch{return null}
 }
 function normalizeUser(data,name,email,phone){state.user={id:data?.user?.id||data?.id||state.user?.id||null,name:name||data?.user?.user_metadata?.full_name||data?.user?.user_metadata?.name||email.split('@')[0],email:data?.user?.email||email,phone:phone||data?.user?.phone||'',access_token:data?.access_token||state.user?.access_token||null};localStorage.setItem('jibli_user',JSON.stringify(state.user));if(state.user.access_token)localStorage.setItem('jibli_access_token',state.user.access_token);window.dispatchEvent(new CustomEvent('jibli-auth-ready',{detail:{userId:state.user.id}}))}
 window.jibliCustomerPro={
   async addresses(){if(!uid())return [];return await api('/rest/v1/addresses?select=*&user_id=eq.'+encodeURIComponent(uid())+'&order=is_default.desc,created_at.desc')},
   async saveAddress(a){if(!uid())throw Error('سجّل الدخول أولاً');return await api('/rest/v1/addresses',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...a,user_id:uid(),is_default:!!a.is_default})})},
   async deleteAddress(id){if(!uid())throw Error('سجّل الدخول أولاً');return await api('/rest/v1/addresses?id=eq.'+encodeURIComponent(id),{method:'DELETE'})},
   async orderRefresh(){
     if(!uid())return;
     try{
       const [foods,rides]=await Promise.all([
         api('/rest/v1/food_orders?select=*&customer_id=eq.'+encodeURIComponent(uid())+'&order=created_at.desc'),
         api('/rest/v1/rides?select=*&customer_id=eq.'+encodeURIComponent(uid())+'&order=created_at.desc')
       ]);
       const local=state.orders||[];
       const rows=[...(foods||[]).map(o=>({dbid:o.id,type:'food',status:o.status,total:Number(o.total||0),address:o.delivery_address||'',created:o.created_at||new Date().toISOString(),id:'JB-'+String(o.id).slice(0,8)})),...(rides||[]).map(o=>({dbid:o.id,type:'ride',status:o.status,total:Number(o.final_fare||o.estimated_fare||0),from:o.pickup_address||'',to:o.destination_address||'',created:o.created_at||new Date().toISOString(),id:'JB-'+String(o.id).slice(0,8)}))];
       const merged=rows.map(r=>{const old=local.find(x=>x.dbid===r.dbid||x.id===r.id);return old?{...old,...r}:{...r}});
       const localsOnly=local.filter(x=>!x.dbid);
       state.orders=[...localsOnly,...merged].sort((a,b)=>new Date(b.created)-new Date(a.created));save();if(state.page==='orders'||state.page==='order')render();
     }catch(e){console.warn('customer refresh',e)}
   }
 };
 window.placeFoodOrder=async function(){
   if(!uid()){toast('سجّل الدخول أولاً لإكمال الطلب');go('login');return}
   if(!state.cart.length)return go('cart');
   const name=document.getElementById('coName')?.value.trim()||state.user.name||'';
   const phone=document.getElementById('coPhone')?.value.trim()||state.user.phone||'';
   const addr=document.getElementById('coAddr')?.value.trim()||'';
   if(!name||!phone||!addr)return toast('أكمل بيانات الطلب أولاً');
   const subtotal=state.cart.reduce((a,x)=>a+Number(x.price)*x.qty,0),delivery=1500,total=subtotal+delivery,restaurantId=state.cart[0]?.rid||null;
   if(!restaurantId)return toast('تعذر تحديد المطعم');
   try{
     const rows=await api('/rest/v1/food_orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({customer_id:uid(),restaurant_id:restaurantId,status:'pending',delivery_address:addr,subtotal,delivery_fee:delivery,total,notes:'طلب من جيبلي'})});
     const row=Array.isArray(rows)?rows[0]:rows;
     if(!row?.id)throw Error('تعذر إنشاء الطلب');
     await api('/rest/v1/food_order_items',{method:'POST',headers:{Prefer:'return=minimal'},body:state.cart.map(x=>({order_id:row.id,menu_item_id:null,item_name:x.name,quantity:x.qty,unit_price:x.price,total:Number(x.price)*x.qty}))}).catch(()=>{});
     state.orders.unshift({dbid:row.id,id:'JB-'+String(row.id).slice(0,8),type:'food',status:'pending',name,phone,address:addr,total,items:[...state.cart],created:row.created_at||new Date().toISOString()});state.cart=[];save();toast('تم إرسال طلبك بنجاح ✅');go('orders');
   }catch(e){toast(e.message||'تعذر إنشاء الطلب')}
 };
 window.requestTaxi=async function(){
   if(!uid()){toast('سجّل الدخول أولاً لطلب تكسي');go('login');return}
   const f=document.getElementById('taxiFrom')?.value.trim(),t=document.getElementById('taxiTo')?.value.trim();if(!f||!t)return toast('أدخل نقطة الانطلاق والوجهة');
   try{const rows=await api('/rest/v1/rides',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({customer_id:uid(),pickup_address:f,destination_address:t,status:'requested'})});const row=Array.isArray(rows)?rows[0]:rows;state.orders.unshift({dbid:row.id,id:'JB-'+String(row.id).slice(0,8),type:'ride',status:'requested',from:f,to:t,total:0,created:row.created_at||new Date().toISOString()});save();toast('تم إرسال طلب التكسي 🚕');go('orders')}catch(e){toast(e.message||'تعذر إرسال طلب التكسي')}};
 window.profile=async function(){
   if(!state.user)return layout(`${pageHead('حسابي')}<div class="empty"><div class="ico">♙</div><h3>سجّل دخولك</h3><p>لإدارة الطلبات والعناوين والحساب.</p><button class="btn primary" onclick="go('login')">تسجيل الدخول</button></div>`);
   let ads=[];try{ads=await window.jibliCustomerPro.addresses()}catch{}
   const adHtml=ads.length?ads.map(a=>`<div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><b>${esc(a.label||'عنوان')}</b><div class="meta">${esc(a.address_text||'')}</div></div><button class="btn danger" onclick="jibliDeleteAddress('${a.id}')">حذف</button></div>`).join(''):'<div class="notice">لا توجد عناوين محفوظة بعد.</div>';
   return layout(`${pageHead('حسابي')}<div class="card"><div class="restaurant"><div class="logo">${esc((state.user.name||'ج')[0])}</div><div><h3 style="margin:0">${esc(state.user.name)}</h3><div class="meta">${esc(state.user.email||'')} ${state.user.phone?'<br>'+esc(state.user.phone):''}</div></div></div></div><div class="section"><div class="sectionhead"><h2>عناويني</h2><button class="link" onclick="jibliAddAddress()">+ إضافة</button></div><div class="cards">${adHtml}</div></div><div class="section cards"><button class="card" style="text-align:right" onclick="go('orders')">📦 سجل طلباتي <span style="float:left">‹</span></button><button class="card" style="text-align:right" onclick="openNotifications()">🔔 الإشعارات <span style="float:left">‹</span></button><button class="btn danger full" onclick="logout()">تسجيل الخروج</button></div>`)
 };
 window.jibliAddAddress=async function(){
   document.getElementById('modalbox').innerHTML=`<h2>إضافة عنوان 📍</h2><div class="form"><div class="field"><label>اسم العنوان</label><input id="adLabel" placeholder="المنزل / العمل"></div><div class="field"><label>العنوان بالتفصيل</label><textarea id="adText" class="textarea" placeholder="المحافظة، المنطقة، الشارع، أقرب نقطة دالة"></textarea></div><div class="row"><div class="field"><label>خط العرض</label><input id="adLat" type="number" step="any"></div><div class="field"><label>خط الطول</label><input id="adLng" type="number" step="any"></div></div><label class="switch"><span>جعله العنوان الافتراضي</span><input id="adDefault" type="checkbox"></label><button class="btn primary full" onclick="jibliSaveAddress()">حفظ العنوان</button></div>`;document.getElementById('modal').classList.add('open')
 };
 window.jibliSaveAddress=async function(){try{const rows=await window.jibliCustomerPro.saveAddress({label:document.getElementById('adLabel').value.trim()||'عنوان',address_text:document.getElementById('adText').value.trim(),latitude:Number(document.getElementById('adLat').value)||null,longitude:Number(document.getElementById('adLng').value)||null,is_default:document.getElementById('adDefault').checked});closeModal();toast('تم حفظ العنوان ✅');state.page='profile';render()}catch(e){toast(e.message)}};
 window.jibliDeleteAddress=async function(id){try{await window.jibliCustomerPro.deleteAddress(id);toast('تم حذف العنوان');state.page='profile';render()}catch(e){toast(e.message)}};
 async function startLive(){const c=await ensureClient();if(!c||!uid()||window.__jibliLiveChannel)return;window.__jibliLiveChannel=c.channel('customer-live-'+uid()).on('postgres_changes',{event:'*',schema:'public',table:'food_orders',filter:'customer_id=eq.'+uid()},()=>window.jibliCustomerPro.orderRefresh()).on('postgres_changes',{event:'*',schema:'public',table:'rides',filter:'customer_id=eq.'+uid()},()=>window.jibliCustomerPro.orderRefresh()).subscribe();window.jibliCustomerPro.orderRefresh();clearInterval(window.__jibliPoll);window.__jibliPoll=setInterval(()=>window.jibliCustomerPro.orderRefresh(),10000)}
 window.addEventListener('jibli-auth-ready',()=>startLive());
 window.addEventListener('load',()=>{if(uid())startLive()});
})();