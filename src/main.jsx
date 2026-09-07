import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import { ArrowRight, Bell, CarFront, ChevronLeft, CircleUserRound, Clock3, Home, MapPin, Menu, Minus, Navigation, Package, Phone, Plus, Search, Settings, ShoppingBag, Star, Utensils, X, LogOut } from 'lucide-react'
import './styles.css'

const services = [
  { id:'taxi', title:'تكسي', sub:'اطلب سيارة الآن', icon:CarFront },
  { id:'delivery', title:'دليفري', sub:'نوصلها لبابك', icon:Package },
  { id:'restaurants', title:'مطاعم', sub:'أطيب الأكلات', icon:Utensils },
]

function App(){
  const [session,setSession]=useState(null)
  const [profile,setProfile]=useState(null)
  const [page,setPage]=useState('home')
  const [auth,setAuth]=useState(false)
  const [loading,setLoading]=useState(true)
  const [toast,setToast]=useState('')
  const [cart,setCart]=useState([])
  const [selectedRestaurant,setSelectedRestaurant]=useState(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s); if(!s) setProfile(null)})
    return ()=>subscription.unsubscribe()
  },[])
  useEffect(()=>{ if(session?.user) loadProfile() },[session])
  useEffect(()=>{ if(toast){const t=setTimeout(()=>setToast(''),2500);return()=>clearTimeout(t)} },[toast])
  async function loadProfile(){const {data}=await supabase.from('profiles').select('*').eq('id',session.user.id).maybeSingle();setProfile(data)}
  async function logout(){await supabase.auth.signOut();setPage('home');setToast('تم تسجيل الخروج')}
  function go(p){setPage(p);window.scrollTo({top:0,behavior:'smooth'})}
  function addToCart(item,restaurant){setCart(c=>[...c,{...item,restaurant_id:restaurant.id,restaurant_name:restaurant.name,qty:1}]);setToast('تمت الإضافة إلى السلة')}
  function removeCart(id){setCart(c=>c.filter(x=>x.id!==id))}
  const cartTotal=useMemo(()=>cart.reduce((s,x)=>s+x.price*x.qty,0),[cart])

  if(loading) return <Shell><div className="center loading">جاري تشغيل جيبلي…</div></Shell>
  return <Shell>
    <div className="phone">
      <div className="statusbar"><span>جيبلي</span><span>● ● ●</span></div>
      {page==='home' && <HomePage session={session} profile={profile} go={go} />}
      {page==='taxi' && <TaxiPage session={session} go={go} notify={setToast} />}
      {page==='restaurants' && <RestaurantsPage go={go} selected={selectedRestaurant} setSelected={setSelectedRestaurant} addToCart={addToCart} />}
      {page==='cart' && <CartPage cart={cart} total={cartTotal} remove={removeCart} session={session} go={go} notify={setToast}/>} 
      {page==='orders' && <OrdersPage session={session} />}
      {page==='profile' && <ProfilePage session={session} profile={profile} auth={()=>setAuth(true)} logout={logout} />}
      {page!=='profile' && <Nav page={page} go={go} cartCount={cart.length}/>} 
      {auth && <AuthModal close={()=>setAuth(false)} onDone={()=>setAuth(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  </Shell>
}

function Shell({children}){return <main className="app-bg"><div className="brand-strip"><div className="brand-mark">ج</div><div><b>جيبلي</b><small>كل احتياجاتك .. بمكان واحد</small></div></div>{children}</main>}
function Nav({page,go,cartCount}){return <nav className="bottom-nav"><button className={page==='home'?'active':''} onClick={()=>go('home')}><Home/><span>الرئيسية</span></button><button className={page==='orders'?'active':''} onClick={()=>go('orders')}><Clock3/><span>طلباتي</span></button><button className="cart-nav" onClick={()=>go('cart')}><ShoppingBag/><span>السلة</span>{cartCount>0&&<em>{cartCount}</em>}</button><button className={page==='profile'?'active':''} onClick={()=>go('profile')}><CircleUserRound/><span>حسابي</span></button></nav>}

function HomePage({session,profile,go}){return <section className="screen home-screen">
  <header className="top"><div><span className="muted">أهلاً وسهلاً 👋</span><h1>{profile?.full_name || 'بك في جيبلي'}</h1></div><button className="icon-btn"><Bell/></button></header>
  <div className="hero"><div><span>🚕 دليفري 🍔 تكاسي</span><h2>كل اللي تحتاجه<br/>بضغطة وحدة</h2><button onClick={()=>go('taxi')} className="gold-btn">اطلب مشوارك <ArrowRight size={17}/></button></div><div className="hero-pin"><Navigation/></div></div>
  <div className="location"><MapPin/><div><small>موقع التوصيل</small><b>حدد موقعك لاستلام الطلب</b></div><ChevronLeft/></div>
  <div className="section-head"><h3>خدمات جيبلي</h3><span>الكل</span></div>
  <div className="services">{services.map(s=>{const I=s.icon;return <button key={s.id} onClick={()=>go(s.id)} className="service"><div className="service-icon"><I/></div><b>{s.title}</b><small>{s.sub}</small></button>})}</div>
  <div className="promo"><div><small>عرض اليوم</small><h3>توصيل أسرع<br/>وسعر أحلى ✨</h3><span>اطلب من مطاعمك المفضلة</span></div><div className="promo-badge">خصم<br/><strong>20%</strong></div></div>
  {!session && <div className="login-card"><CircleUserRound/><div><b>سجّل دخولك</b><small>حتى تحفظ طلباتك وعناوينك</small></div><button onClick={()=>go('profile')}>دخول</button></div>}
</section>}

function TaxiPage({session,go,notify}){const [pickup,setPickup]=useState('موقعي الحالي');const [dest,setDest]=useState('');const [busy,setBusy]=useState(false);async function request(){if(!session){notify('سجّل دخولك أولاً');go('profile');return}if(!dest){notify('اكتب وجهتك');return}setBusy(true);const {error}=await supabase.from('rides').insert({customer_id:session.user.id,pickup_address:pickup,destination_address:dest,estimated_fare:0});setBusy(false);if(error) notify(error.message);else {notify('تم إرسال طلب التكسي 🚕');setDest('')}}return <section className="screen"><header className="page-title"><button onClick={()=>go('home')}><ArrowRight/></button><div><small>جيبلي تكسي</small><h2>اطلب مشوار</h2></div></header><div className="map-card"><div className="map-grid"></div><div className="map-pin pickup"><MapPin/></div><div className="map-pin drop"><Navigation/></div><div className="map-label">خريطة الرحلة</div></div><div className="form-card"><label><MapPin/> من</label><input value={pickup} onChange={e=>setPickup(e.target.value)} placeholder="نقطة الانطلاق"/><label><Navigation/> إلى</label><input value={dest} onChange={e=>setDest(e.target.value)} placeholder="إلى أين تريد الذهاب؟"/><div className="fare-row"><span>الأجرة التقديرية</span><b>تُحدد بعد اختيار المسار</b></div><button disabled={busy} onClick={request} className="gold-btn full">{busy?'جاري الطلب…':'ابحث عن سائق 🚕'}</button></div></section>}

function RestaurantsPage({go,selected,setSelected,addToCart}){const [restaurants,setRestaurants]=useState([]);const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);useEffect(()=>{supabase.from('restaurants').select('*').order('rating',{ascending:false}).then(({data})=>{setRestaurants(data||[]);setLoading(false)})},[]);async function open(r){setSelected(r);const {data}=await supabase.from('menu_items').select('*').eq('restaurant_id',r.id).eq('is_available',true).order('created_at');setItems(data||[])}return <section className="screen"><header className="page-title"><button onClick={()=>selected?setSelected(null):go('home')}><ArrowRight/></button><div><small>الأكل يوصل لبابك</small><h2>{selected?.name||'المطاعم'}</h2></div></header>{selected?<div className="menu-list"><div className="restaurant-banner"><div className="food-photo">🍽️</div><div><h3>{selected.name}</h3><span>⭐ {selected.rating?.toFixed?.(1)||'5.0'} · {selected.is_open?'مفتوح الآن':'مغلق'}</span><small>{selected.description||'أشهى الأكلات مع توصيل جيبلي'}</small></div></div>{items.length===0?<Empty text="لا توجد أصناف متاحة حالياً"/>:items.map(i=><div className="menu-item" key={i.id}><div className="food-thumb">🍔</div><div className="item-info"><b>{i.name}</b><small>{i.description||'وجبة لذيذة ومحضرة بعناية'}</small><strong>{Number(i.price).toLocaleString('ar-IQ')} د.ع</strong></div><button onClick={()=>addToCart(i,selected)} className="plus"><Plus/></button></div>)}</div>:loading?<div className="center">جاري تحميل المطاعم…</div>:restaurants.length===0?<Empty text="لا توجد مطاعم مضافة بعد"/>:<div className="restaurant-list">{restaurants.map(r=><button className="restaurant" key={r.id} onClick={()=>open(r)}><div className="restaurant-img">🍔</div><div><h3>{r.name}</h3><span>⭐ {r.rating?.toFixed?.(1)||'5.0'} · {r.is_open?'مفتوح':'مغلق'}</span><small>{r.description||'مطعم مميز على جيبلي'}</small></div><ChevronLeft/></button>)}</div>}</section>}

function CartPage({cart,total,remove,session,go,notify}){async function checkout(){if(!session){notify('سجّل دخولك أولاً');go('profile');return}if(!cart.length)return;const groups=Object.values(cart.reduce((a,x)=>{(a[x.restaurant_id]??=[]).push(x);return a},{}));for(const group of groups){const sub=group.reduce((s,x)=>s+x.price*x.qty,0);const {data,error}=await supabase.from('food_orders').insert({customer_id:session.user.id,restaurant_id:group[0].restaurant_id,delivery_address:'يحدد من موقع المستخدم',subtotal:sub,total:sub,delivery_fee:0}).select().single();if(error){notify(error.message);return}await supabase.from('food_order_items').insert(group.map(x=>({order_id:data.id,menu_item_id:x.id,item_name:x.name,quantity:x.qty,unit_price:x.price})))}notify('تم إرسال طلبك بنجاح 🎉');go('orders')}return <section className="screen"><header className="page-title"><button onClick={()=>go('restaurants')}><ArrowRight/></button><div><small>مراجعة الطلب</small><h2>السلة</h2></div></header>{!cart.length?<Empty text="السلة فارغة"/>:<><div className="cart-list">{cart.map(x=><div className="cart-item" key={x.id}><div className="food-thumb">🍔</div><div><b>{x.name}</b><small>{x.restaurant_name}</small><strong>{Number(x.price).toLocaleString('ar-IQ')} د.ع</strong></div><button onClick={()=>remove(x.id)}><X/></button></div>)}</div><div className="checkout"><div><span>المجموع</span><b>{Number(total).toLocaleString('ar-IQ')} د.ع</b></div><button className="gold-btn full" onClick={checkout}>تأكيد الطلب</button></div></>}</section>}

function OrdersPage({session}){const [orders,setOrders]=useState([]);useEffect(()=>{if(session)supabase.from('food_orders').select('*, restaurants(name)').eq('customer_id',session.user.id).order('created_at',{ascending:false}).then(({data})=>setOrders(data||[]))},[session]);return <section className="screen"><header className="page-title"><div><small>تاريخك مع جيبلي</small><h2>طلباتي</h2></div></header>{!session?<Empty text="سجّل دخولك لعرض طلباتك"/>:orders.length===0?<Empty text="لا توجد طلبات حتى الآن"/>:<div className="orders">{orders.map(o=><div className="order-card" key={o.id}><div className="order-icon"><Package/></div><div><b>{o.restaurants?.name||'طلب مطعم'}</b><small>{new Date(o.created_at).toLocaleString('ar-IQ')}</small><span className={'status '+o.status}>{statusText(o.status)}</span></div><strong>{Number(o.total).toLocaleString('ar-IQ')} د.ع</strong></div>)}</div>}</section>}
function statusText(s){return ({pending:'قيد الانتظار',accepted:'تم القبول',preparing:'قيد التحضير',ready:'جاهز',picked_up:'تم الاستلام',on_the_way:'في الطريق',delivered:'تم التوصيل',cancelled:'ملغي'})[s]||s}
function ProfilePage({session,profile,auth,logout}){return <section className="screen"><header className="page-title"><div><small>ملفك الشخصي</small><h2>حسابي</h2></div></header>{session?<><div className="profile-head"><div className="avatar">{(profile?.full_name||session.user.email||'ج').slice(0,1).toUpperCase()}</div><div><h3>{profile?.full_name||'مستخدم جيبلي'}</h3><span>{profile?.phone||session.user.email}</span></div></div><div className="settings"><button><MapPin/><span>عناويني</span><ChevronLeft/></button><button><Bell/><span>الإشعارات</span><ChevronLeft/></button><button><Settings/><span>الإعدادات</span><ChevronLeft/></button><button className="danger" onClick={logout}><LogOut/><span>تسجيل الخروج</span><ChevronLeft/></button></div></>:<div className="auth-promo"><div className="big-user"><CircleUserRound/></div><h3>مرحباً بك في جيبلي</h3><p>سجّل دخولك حتى تتمكن من طلب التكاسي وحفظ طلباتك والمزيد.</p><button className="gold-btn full" onClick={auth}>تسجيل الدخول / إنشاء حساب</button></div>}</section>}

function AuthModal({close,onDone}){const [mode,setMode]=useState('login');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');async function submit(){setBusy(true);setError('');let result;if(mode==='login')result=await supabase.auth.signInWithPassword({email,password});else result=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});setBusy(false);if(result.error)setError(result.error.message);else onDone()}return <div className="modal"><div className="modal-card"><button className="close" onClick={close}><X/></button><div className="brand-mini">ج</div><h2>{mode==='login'?'تسجيل الدخول':'إنشاء حساب'}</h2>{mode==='signup'&&<input placeholder="الاسم الكامل" value={name} onChange={e=>setName(e.target.value)}/>}<input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="error">{error}</p>}<button className="gold-btn full" onClick={submit} disabled={busy}>{busy?'جاري المعالجة…':mode==='login'?'دخول':'إنشاء الحساب'}</button><button className="switch" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'ليس لديك حساب؟ أنشئ حساباً':'لديك حساب؟ سجل دخولك'}</button></div></div>}
function Empty({text}){return <div className="empty"><div>📦</div><h3>{text}</h3><p>ستظهر المعلومات هنا عند توفرها.</p></div>}

createRoot(document.getElementById('root')).render(<App/>)
