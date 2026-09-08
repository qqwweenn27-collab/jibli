/* Minimal bootloader: attaches the customer enhancement layer without changing the existing app markup. */
(function(){
  function ready(){
    var s=document.createElement('link');s.rel='stylesheet';s.href='customer.css';document.head.appendChild(s);
    var j=document.createElement('script');j.src='customer-app.js';j.defer=true;document.body.appendChild(j);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();