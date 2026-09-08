/* Customer realtime bootstrap. Uses Supabase Realtime only after a valid authenticated user is available. */
(function(){
  const URL='https://hsgqqugojpeynmxiktrx.supabase.co';
  const KEY='sb_publishable_M5okA1lwG2OEif5cMVYCiA_763LRInd';
  window.addEventListener('jibli-auth-ready', async function(e){
    const uid=e.detail&&e.detail.userId;
    if(!uid||!window.supabaseClient||window.__jibliLiveChannel)return;
    window.__jibliLiveChannel=window.supabaseClient.channel('customer-'+uid)
      .on('postgres_changes',{event:'*',schema:'public',table:'food_orders',filter:'user_id=eq.'+uid},()=>window.dispatchEvent(new CustomEvent('jibli-orders-changed')))
      .on('postgres_changes',{event:'*',schema:'public',table:'rides',filter:'user_id=eq.'+uid},()=>window.dispatchEvent(new CustomEvent('jibli-orders-changed')))
      .subscribe();
  });
  window.jibliCustomerConfig={URL,KEY};
})();