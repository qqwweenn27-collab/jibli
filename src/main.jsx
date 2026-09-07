import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import { Home, CarFront, Utensils, Package, ShoppingBag, UserRound, MapPin, ArrowRight, Plus, Minus, X, LogOut, Bell, Search, Star, Navigation } from 'lucide-react'
import './styles.css'

const services = [
  {id:'taxi', title:'تكسي', text:'اطلب سيارة الآن', icon:CarFront},
  {id:'delivery', title:'دليفري', text:'نوصلها لبابك', icon:Package},
  {id:'restaurants', title:'مطاعم', text:'أطيب الأكلات', icon:Utensils},
]
const demoRestaurants = [
  {id:'demo-1',name:'مطعم جيبلي',description:'وجبات عراقية وعالمية',rating:4.9,is_open:true,demo:true},
  {id:'demo-2',name:'بيت البرگر',description:'برگر ووجبات سريعة',rating:4.7,is_open:true,demo:true},
]
const demoItems = [
  {id:'food-1',name:'برگر لحم',description:'برگر طازج مع بطاطا',price:6500},
  {id:'food-2',name:'دجاج مشوي',description:'دجاج مع رز وسلطة',price:8000},
  {id:'food-3',name:'صحن كباب',description:'كباب عراقي مع مقبلات',price:9000},
]

function App(){
  const [page,setPage]=useState('home'), [session,setSession]=useState(null), [profile,setProfile]=useState(null)
  const [authOpen,setAuthOpen]=useState(false), [restaurants,setRestaurants]=useState(demoRestaurants)
  const [selected,setSelected]=useState(null), [menu,setMenu]=useState([]), [cart,setCart]=useState([]), [orders,setOrders]=useState([])
  const [toast,setToast]=useState(''), [ready,setReady]=useState(false)

  useEffect(()=>{
    let alive=true
    supabase.auth.getSession().then(({data})=>{if(alive){setSession(data?.session||null);setReady(true)}}).catch(()=>alive&&setReady(true))
    const {data}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s||null); if(!s)setProfile(null)})
    return ()=>{alive=false;data?.subscription?.unsubscribe()}
  },[])
  useEffect(()=>{if(session?.user?.id) loadProfile()},[session])
  useEffect(()=>{loadRestaurants()},[])
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)}},[toast])

  async function loadProfile(){try{const {data}=await supabase.from('profiles').select('*').eq('id',session.user.id).maybeSingle();setProfile(data||null)}catch{}}
  async function loadRestaurants(){try{const {data,error}=await supabase.from('restaurants').select('*').order('rating',{ascending:false});if(!error&&data?.length)setRestaurants(data)}catch{}}
  async function openRestaurant(r){setSelected(r);setMenu([]);if(r.demo){setMenu(demoItems);return}try{const {data}=await supabase.from('menu_items').select('*').eq('restaurant_id',r.id).eq('is_available',true).order('created_at');setMenu(data||[])}catch{setMenu([])}}
  function go(p){setPage(p);window.scrollTo({top:0,behavior:'smooth'})}
  function add(item,r){setCart(c=>{const old=c.find(x=>x.id===item.id&&x.restaurant_id===r.id);if(old)return c.map(x=>x===old?{...x,qty:x.qty+1}:x);return [...c,{...item,restaurant_id:r.id,restaurant_name:r.name,qty:1}]});setToast('تمت الإضافة إلى السلة')}
  function change(itemId,delta){setCart(c=>c.flatMap(x=>x.id===itemId?((x.qty+delta)>0?[{...x,qty:x.qty+delta}]:[]):[x]))}
  const total=useMemo(()=>cart.reduce((s,x)=>s+Number(x.price)*x.qty,0),[cart])
  async function logout(){await supabase.auth.signOut();setToast('تم تسجيل الخروج');go('home')}

  if(!ready)return <AppShell><div className="loading">جاري تشغيل جيبلي…</div></AppShell>
  return <AppShell>
    <div className="phone">
      <header className="brand"><div className="logo">ج</div><div><b>جيبلي</b><small>كل احتياجاتك .. بمكان واحد</small></div><Bell size={20}/></header>
      {page==='home'&&<Home session={session} profile={profile} go={go}/>} 
      {page==='taxi'&&<Taxi session={session} go={go} toast={setToast}/>} 
      {page==='restaurants'&&<Restaurants restaurants={restaurants} selected={selected} menu={menu} go={go} open={openRestaurant} add={add} back={()=>setSelected(null)}/>} 
      {page==='delivery'&&<Delivery go={go}/>} 
      {page==='cart'&&<Cart cart={cart} total={total} change={change} session={session} go={go} toast={setToast} clear={()=>setCart([])}/>} 
      {page==='orders'&&<Orders session={session} orders={orders} setOrders={setOrders}/>} 
      {page==='profile'&&<Profile session={session} profile={profile} login={()=>setAuthOpen(true)} logout={logout}/>} 
      <Nav page={page} go={go} count={cart.reduce((s,x)=>s+x.qty,0)}/>
      {authOpen&&<Auth close={()=>setAuthOpen(false)}/>} {toast&&<div className="toast">{toast}</div>}
    </div>
  </AppShell>
}
function AppShell({children}){return <main className="app-bg">{children}</main>}
function Nav({page,go,count}){return <nav><button className={page==='home'?'active':''} onClick={()=>go('home')}><Home/><span>الرئيسية</span></button><button className={page==='orders'?'active':''} onClick={()=>go('orders')}><Package/><span>طلباتي</span></button><button className="cart" onClick={()=>go('cart')}><ShoppingBag/><span>السلة</span>{count>0&&<em>{count}</em>}</button><button className={page==='profile'?'active':''} onClick={()=>go('profile')}><UserRound/><span>حسابي</span></button></nav>}
function Home({session,profile,go}){return <section className="screen"><div className="welcome"><div><small>أهلاً وسهلاً 👋</small><h1>{profile?.full_name||'بك في جيبلي'}</h1></div><div className="avatar"><UserRound/></div></div><div className="hero"><div><small>🚕 تكاسي · 🍔 دليفري</small><h2>كل اللي تحتاجه<br/>بضغطة وحدة</h2><button className="gold" onClick={()=>go('taxi')}>اطلب مشوارك <ArrowRight size={17}/></button></div><Navigation size={72}/></div><div className="location"><MapPin/><div><small>موقع التوصيل</small><b>حدد موقعك لاستلام الطلب</b></div><ArrowRight/></div><div className="section-title"><h3>خدمات جيبلي</h3><span>الأكثر استخداماً</span></div><div className="services">{services.map(s=>{const I=s.icon;return <button key={s.id} onClick={()=>go(s.id)}><div><I/></div><b>{s.title}</b><small>{s.text}</small></button>})}</div><div className="promo"><div><small>عرض اليوم</small><h3>خصم 20% على التوصيل ✨</h3><span>اطلب من مطاعمك المفضلة</span></div><strong>20%</strong></div>{!session&&<button className="login-banner" onClick={()=>go('profile')}><UserRound/><span><b>سجّل دخولك</b><small>حتى تحفظ طلباتك وتتابع مشاويرك</small></span><ArrowRight/></button>}</section>}
function Taxi({session,go,toast}){const [from,setFrom]=useState('موقعي الحالي'),[to,setTo]=useState(''),[busy,setBusy]=useState(false);async function request(){if(!session){toast('سجّل دخولك أولاً');go('profile');return}if(!to.trim()){toast('اكتب وجهتك أولاً');return}setBusy(true);try{const {error}=await supabase.from('rides').insert({customer_id:session.user.id,pickup_address:from,destination_address:to,estimated_fare:0});if(error)throw error;toast('تم إرسال طلب التكسي 🚕');setTo('')}catch(e){toast(e?.message||'تعذر إرسال الطلب')}finally{setBusy(false)}}return <section className="screen"><Title title="اطلب مشوار" sub="جيبلي تكسي" go={go}/><div className="map"><MapPin className="pin p1"/><Navigation className="pin p2"/><span>خريطة الرحلة</span></div><div className="card form"><label><MapPin/> من</label><input value={from} onChange={e=>setFrom(e.target.value)} /><label><Navigation/> إلى</label><input value={to} onChange={e=>setTo(e.target.value)} placeholder="إلى أين تريد الذهاب؟"/><div className="fare"><span>الأجرة</span><b>تُحسب حسب المسار</b></div><button className="gold full" onClick={request} disabled={busy}>{busy?'جاري البحث…':'ابحث عن سائق 🚕'}</button></div></section>}
function Restaurants({restaurants,selected,menu,go,open,add,back}){return <section className="screen"><Title title={selected?.name||'المطاعم'} sub="الأكل يوصل لبابك" go={selected?back:go}/>{selected?<div>{<div className="restaurant-head"><div className="food-big">🍽️</div><div><h3>{selected.name}</h3><span><Star size={14}/> {selected.rating||5} · {selected.is_open?'مفتوح الآن':'مغلق'}</span><small>{selected.description||'أشهى الأكلات مع جيبلي'}</small></div></div>}{menu.length===0?<Empty text="لا توجد أصناف متاحة حالياً"/>:menu.map(i=><div className="food" key={i.id}><div className="food-img">🍔</div><div className="food-info"><b>{i.name}</b><small>{i.description||'وجبة لذيذة ومحضرة بعناية'}</small><strong>{Number(i.price).toLocaleString('ar-IQ')} د.ع</strong></div><button onClick={()=>add(i,selected)}><Plus/></button></div>)}</div>:<div className="restaurants">{restaurants.map(r=><button key={r.id} onClick={()=>open(r)}><div className="food-big">🍔</div><div><h3>{r.name}</h3><span><Star size={14}/> {r.rating||5} · {r.is_open?'مفتوح':'مغلق'}</span><small>{r.description||'مطعم مميز على جيبلي'}</small></div><ArrowRight/></button>)}</div>}</section>}
function Delivery({go}){return <section className="screen"><Title title="الدليفري" sub="نوصلها لبابك" go={go}/><div className="empty large"><div className="empty-icon"><Package/></div><h3>الدليفري جاهز إلك</h3><p>أرسل طلبك من أي مكان، وسنضيف لك تتبع السائق وتكلفة التوصيل في المرحلة القادمة.</p><button className="gold" onClick={()=>go('restaurants')}>تصفح المطاعم</button></div></section>}
function Cart({cart,total,change,session,go,toast,clear}){async function checkout(){if(!session){toast('سجّل دخولك أولاً');go('profile');return}if(!cart.length)return;const groups=Object.values(cart.reduce((a,x)=>{(a[x.restaurant_id]??=[]).push(x);return a},{}));try{for(const g of groups){const sub=g.reduce((s,x)=>s+Number(x.price)*x.qty,0);const {data,error}=await supabase.from('food_orders').insert({customer_id:session.user.id,restaurant_id:g[0].restaurant_id,delivery_address:'يحدد من موقع المستخدم',subtotal:sub,total:sub,delivery_fee:0}).select().single();if(error)throw error;const {error:e2}=await supabase.from('food_order_items').insert(g.map(x=>({order_id:data.id,menu_item_id:x.id,item_name:x.name,quantity:x.qty,unit_price:x.price})));if(e2)throw e2}clear();toast('تم إرسال الطلب بنجاح 🎉');go('orders')}catch(e){toast(e?.message||'تعذر إرسال الطلب')}}return <section className="screen"><Title title="السلة" sub="مراجعة طلبك" go={()=>go('restaurants')}/>{!cart.length?<Empty text="السلة فارغة"/>:<><div className="cart-list">{cart.map(x=><div className="cart-row" key={x.restaurant_id+x.id}><div className="food-img">🍔</div><div><b>{x.name}</b><small>{x.restaurant_name}</small><strong>{Number(x.price).toLocaleString('ar-IQ')} د.ع</strong></div><div className="qty"><button onClick={()=>change(x.id,-1)}><Minus/></button><b>{x.qty}</b><button onClick={()=>change(x.id,1)}><Plus/></button></div></div>)}</div><div className="checkout"><span>المجموع</span><strong>{Number(total).toLocaleString('ar-IQ')} د.ع</strong><button className="gold full" onClick={checkout}>تأكيد الطلب</button></div></>}</section>}
function Orders({session,orders,setOrders}){useEffect(()=>{if(!session){setOrders([]);return}supabase.from('food_orders').select('*, restaurants(name)').eq('customer_id',session.user.id).order('created_at',{ascending:false}).then(({data})=>setOrders(data||[])).catch(()=>{})},[session]);return <section className="screen"><Title title="طلباتي" sub="تاريخك مع جيبلي"/>{!session?<Empty text="سجّل دخولك لعرض طلباتك"/>:orders.length===0?<Empty text="لا توجد طلبات حتى الآن"/>:<div className="orders">{orders.map(o=><div className="order" key={o.id}><Package/><div><b>{o.restaurants?.name||'طلب مطعم'}</b><small>{new Date(o.created_at).toLocaleString('ar-IQ')}</small><span>{status(o.status)}</span></div><strong>{Number(o.total).toLocaleString('ar-IQ')} د.ع</strong></div>)}</div>}</section>}
function status(s){return {pending:'قيد الانتظار',accepted:'تم القبول',preparing:'قيد التحضير',ready:'جاهز',picked_up:'تم الاستلام',on_the_way:'في الطريق',delivered:'تم التوصيل',cancelled:'ملغي'}[s]||s}
function Profile({session,profile,login,logout}){return <section className="screen"><Title title="حسابي" sub="ملفك الشخصي"/>{session?<><div className="profile"><div className="avatar big"><UserRound/></div><div><h3>{profile?.full_name||'مستخدم جيبلي'}</h3><span>{profile?.phone||session.user.email}</span></div></div><div className="settings"><button><MapPin/><span>عناويني</span><ArrowRight/></button><button><Bell/><span>الإشعارات</span><ArrowRight/></button><button onClick={logout} className="danger"><LogOut/><span>تسجيل الخروج</span><ArrowRight/></button></div></>:<div className="auth-card"><div className="avatar big"><UserRound/></div><h3>مرحباً بك في جيبلي</h3><p>سجّل الدخول حتى تطلب تكسي وتتابع طلباتك.</p><button className="gold full" onClick={login}>تسجيل الدخول / إنشاء حساب</button></div>}</section>}
function Auth({close}){const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');async function submit(){if(!email||!password){setError('أدخل البريد وكلمة المرور');return}setBusy(true);setError('');try{const r=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});if(r.error)throw r.error;close()}catch(e){setError(e?.message||'تعذر إكمال العملية')}finally{setBusy(false)}}return <div className="modal"><div className="modal-card"><button className="close" onClick={close}><X/></button><div className="logo">ج</div><h2>{mode==='login'?'تسجيل الدخول':'إنشاء حساب'}</h2>{mode==='signup'&&<input placeholder="الاسم الكامل" value={name} onChange={e=>setName(e.target.value)}/>}<input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="error">{error}</p>}<button className="gold full" disabled={busy} onClick={submit}>{busy?'جاري المعالجة…':mode==='login'?'دخول':'إنشاء الحساب'}</button><button className="switch" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'ليس لديك حساب؟ أنشئ حساباً':'لديك حساب؟ سجّل دخولك'}</button></div></div>}
function Title({title,sub,go}){return <header className="title">{go&&<button onClick={go}><ArrowRight/></button>}<div><small>{sub}</small><h2>{title}</h2></div></header>}
function Empty({text}){return <div className="empty"><div className="empty-icon"><Package/></div><h3>{text}</h3><p>ستظهر المعلومات هنا عند توفرها.</p></div>}
function ErrorBoundary({children}){const [error,setError]=useState(null);return error?<AppShell><div className="fatal"><h2>تعذر تشغيل الصفحة</h2><p>تم إيقاف الخطأ حتى لا تبقى الشاشة بيضاء.</p><button className="gold" onClick={()=>location.reload()}>إعادة المحاولة</button></div></AppShell>:<Boundary setError={setError}>{children}</Boundary>}
class Boundary extends React.Component{constructor(p){super(p);this.state={e:null}}static getDerivedStateFromError(e){return {e}}componentDidCatch(e){this.props.setError(e)}render(){return this.state.e?null:this.props.children}}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>)
