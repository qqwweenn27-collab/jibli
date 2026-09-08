/* Jibli customer app enhancement layer. Adds account guards, live order refresh, saved addresses and client UX hooks. */
(()=>{
 const SB_URL=window.SB_URL||'https://hsgqqugojpeynmxiktrx.supabase.co';
 const SB_KEY=window.SB_KEY||'sb_publishable_M5okA1lwG2OEif5cMVYCiA_763LRInd';
 const access=()=>localStorage.getItem('jibli_access_token')||'';
 async function call(path,opt={}){const headers={'apikey':SB_KEY,'Content-Type':'application/json',...(opt.headers||{})};const token=access();if(token)headers.Authorization='Bearer '+token;const r=await fetch(SB_URL+path,{...opt,headers});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw Error(d?.message||d?.error_description||'حدث خطأ');return d}
 window.jibliCustomer={
  async profile(){try{return await call('/rest/v1/profiles?select=*&id=eq.'+encodeURIComponent(window.__JIBLI_USER_ID||''))}catch{return []}},
  async saveAddress(address){const uid=window.__JIBLI_USER_ID;if(!uid)return false;await call('/rest/v1/addresses',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({...address,user_id:uid})});return true},
  async orders(uid){if(!uid)return [];const [a,b]=await Promise.all([call('/rest/v1/food_orders?select=*&user_id=eq.'+encodeURIComponent(uid)+'&order=created_at.desc'),call('/rest/v1/rides?select=*&user_id=eq.'+encodeURIComponent(uid)+'&order=created_at.desc')]);return [...(a||[]).map(x=>({...x,kind:'food'})),...(b||[]).map(x=>({...x,kind:'ride'}))].sort((x,y)=>new Date(y.created_at)-new Date(x.created_at))},
  startRealtime(uid,onChange){if(!window.supabaseClient||!uid)return null;return window.supabaseClient.channel('jibli-customer-orders-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'food_orders',filter:'user_id=eq.'+uid},onChange).on('postgres_changes',{event:'*',schema:'public',table:'rides',filter:'user_id=eq.'+uid},onChange).subscribe()}
 };
 window.addEventListener('load',()=>{document.documentElement.classList.add('jibli-ready')});
})();