import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import { Home as HomeIcon, CarFront, Utensils, Package, ShoppingBag, UserRound, MapPin, ArrowRight, Plus, Minus, X, LogOut, Bell, Star, Navigation } from 'lucide-react'
import './styles.css'

const demoRestaurants = [
  { id: 'demo-1', name: 'مطعم جيبلي', description: 'وجبات عراقية وعالمية', rating: 4.9, is_open: true, demo: true },
  { id: 'demo-2', name: 'بيت البرگر', description: 'برگر ووجبات سريعة', rating: 4.7, is_open: true, demo: true },
]
const demoItems = [
  { id: 'food-1', name: 'برگر لحم', description: 'برگر طازج مع بطاطا', price: 6500 },
  { id: 'food-2', name: 'دجاج مشوي', description: 'دجاج مع رز وسلطة', price: 8000 },
  { id: 'food-3', name: 'صحن كباب', description: 'كباب عراقي مع مقبلات', price: 9000 },
]
const money = n => `${Number(n || 0).toLocaleString('ar-IQ')} د.ع`

function App() {
  const [page, setPage] = useState('home')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [restaurants, setRestaurants] = useState(demoRestaurants)
  const [selected, setSelected] = useState(null)
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  const [toast, setToast] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data?.session || null); setReady(true) }
    }).catch(() => alive && setReady(true))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next || null)
      if (!next) setProfile(null)
    })
    return () => { alive = false; data?.subscription?.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data || null)).catch(() => {})
  }, [session])

  useEffect(() => {
    supabase.from('restaurants').select('*').order('rating', { ascending: false })
      .then(({ data, error }) => { if (!error && data?.length) setRestaurants(data) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const go = p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0), [cart])
  const count = cart.reduce((sum, item) => sum + item.qty, 0)

  async function openRestaurant(r) {
    setSelected(r)
    if (r.demo) { setMenu(demoItems); return }
    const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', r.id).eq('is_available', true).order('created_at')
    setMenu(data || [])
  }

  function addToCart(item, restaurant) {
    setCart(current => {
      const found = current.find(x => x.id === item.id && x.restaurant_id === restaurant.id)
      if (found) return current.map(x => x === found ? { ...x, qty: x.qty + 1 } : x)
      return [...current, { ...item, restaurant_id: restaurant.id, restaurant_name: restaurant.name, qty: 1 }]
    })
    setToast('تمت الإضافة إلى السلة')
  }

  function changeQty(id, delta) {
    setCart(current => current.flatMap(x => x.id === id ? (x.qty + delta > 0 ? [{ ...x, qty: x.qty + delta }] : []) : [x]))
  }

  async function logout() {
    await supabase.auth.signOut()
    setToast('تم تسجيل الخروج')
    go('home')
  }

  if (!ready) return <AppShell><div className="loading">جاري تشغيل جيبلي…</div></AppShell>

  return <AppShell>
    <div className="phone">
      <header className="brand"><div className="logo">ج</div><div><b>جيبلي</b><small>كل احتياجاتك .. بمكان واحد</small></div><Bell size={20} /></header>
      {page === 'home' && <HomePage session={session} profile={profile} go={go} />}
      {page === 'taxi' && <TaxiPage session={session} go={go} toast={setToast} />}
      {page === 'restaurants' && <RestaurantsPage restaurants={restaurants} selected={selected} menu={menu} go={go} open={openRestaurant} add={addToCart} back={() => setSelected(null)} />}
      {page === 'delivery' && <DeliveryPage go={go} />}
      {page === 'cart' && <CartPage cart={cart} total={total} change={changeQty} session={session} go={go} toast={setToast} clear={() => setCart([])} />}
      {page === 'orders' && <OrdersPage session={session} orders={orders} setOrders={setOrders} />}
      {page === 'profile' && <ProfilePage session={session} profile={profile} login={() => setAuthOpen(true)} logout={logout} />}
      <Nav page={page} go={go} count={count} />
      {authOpen && <AuthModal close={() => setAuthOpen(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  </AppShell>
}

function AppShell({ children }) { return <main className="app-bg">{children}</main> }
function Nav({ page, go, count }) { return <nav><button className={page === 'home' ? 'active' : ''} onClick={() => go('home')}><HomeIcon /><span>الرئيسية</span></button><button className={page === 'orders' ? 'active' : ''} onClick={() => go('orders')}><Package /><span>طلباتي</span></button><button className="cart" onClick={() => go('cart')}><ShoppingBag /><span>السلة</span>{count > 0 && <em>{count}</em>}</button><button className={page === 'profile' ? 'active' : ''} onClick={() => go('profile')}><UserRound /><span>حسابي</span></button></nav> }
function Title({ title, sub, go }) { return <div className="title"><button onClick={() => go?.('home')}><ArrowRight /></button><div><h2>{title}</h2><small>{sub}</small></div></div> }
function Empty({ text }) { return <div className="empty"><div className="empty-icon"><Package /></div><h3>{text}</h3></div> }

function HomePage({ session, profile, go }) {
  const services = [['taxi','تكسي','اطلب سيارة الآن',CarFront],['delivery','دليفري','نوصلها لبابك',Package],['restaurants','مطاعم','أطيب الأكلات',Utensils]]
  return <section className="screen"><div className="welcome"><div><small>أهلاً وسهلاً 👋</small><h1>{profile?.full_name || 'بك في جيبلي'}</h1></div><div className="avatar"><UserRound /></div></div><div className="hero"><div><small>🚕 تكاسي · 🍔 دليفري</small><h2>كل اللي تحتاجه<br />بضغطة وحدة</h2><button className="gold" onClick={() => go('taxi')}>اطلب مشوارك <ArrowRight size={17} /></button></div><Navigation size={72} /></div><div className="location"><MapPin /><div><small>موقع التوصيل</small><b>حدد موقعك لاستلام الطلب</b></div><ArrowRight /></div><div className="section-title"><h3>خدمات جيبلي</h3><span>الأكثر استخداماً</span></div><div className="services">{services.map(([id,title,text,Icon]) => <button key={id} onClick={() => go(id)}><div><Icon /></div><b>{title}</b><small>{text}</small></button>)}</div><div className="promo"><div><small>عرض اليوم</small><h3>خصم 20% على التوصيل ✨</h3><span>اطلب من مطاعمك المفضلة</span></div><strong>20%</strong></div>{!session && <button className="login-banner" onClick={() => go('profile')}><UserRound /><span><b>سجّل دخولك</b><small>حتى تحفظ طلباتك وتتابع مشاويرك</small></span><ArrowRight /></button>}</section>
}

function TaxiPage({ session, go, toast }) {
  const [from,setFrom] = useState('موقعي الحالي'), [to,setTo] = useState(''), [busy,setBusy] = useState(false)
  async function request() { if (!session) { toast('سجّل دخولك أولاً'); go('profile'); return } if (!to.trim()) { toast('اكتب وجهتك أولاً'); return } setBusy(true); try { const { error } = await supabase.from('rides').insert({ customer_id: session.user.id, pickup_address: from, destination_address: to, estimated_fare: 0 }); if (error) throw error; toast('تم إرسال طلب التكسي 🚕'); setTo('') } catch (e) { toast(e?.message || 'تعذر إرسال الطلب') } finally { setBusy(false) } }
  return <section className="screen"><Title title="اطلب مشوار" sub="جيبلي تكسي" go={go} /><div className="map"><MapPin className="pin p1" /><Navigation className="pin p2" /><span>خريطة الرحلة</span></div><div className="card form"><label><MapPin /> من</label><input value={from} onChange={e => setFrom(e.target.value)} /><label><Navigation /> إلى</label><input value={to} onChange={e => setTo(e.target.value)} placeholder="إلى أين تريد الذهاب؟" /><div className="fare"><span>الأجرة</span><b>تُحسب حسب المسار</b></div><button className="gold full" onClick={request} disabled={busy}>{busy ? 'جاري البحث…' : 'ابحث عن سائق 🚕'}</button></div></section>
}

function RestaurantsPage({ restaurants, selected, menu, go, open, add, back }) {
  return <section className="screen"><Title title={selected?.name || 'المطاعم'} sub="الأكل يوصل لبابك" go={selected ? () => back() : go} />{selected ? <div><div className="restaurant-head"><div className="food-big">🍽️</div><div><h3>{selected.name}</h3><span><Star size={14} /> {selected.rating || 5} · {selected.is_open ? 'مفتوح الآن' : 'مغلق'}</span><small>{selected.description || 'أشهى الأكلات مع جيبلي'}</small></div></div>{menu.length ? menu.map(item => <div className="food" key={item.id}><div className="food-img">🍔</div><div className="food-info"><b>{item.name}</b><small>{item.description || 'وجبة لذيذة ومحضرة بعناية'}</small><strong>{money(item.price)}</strong></div><button onClick={() => add(item, selected)}><Plus /></button></div>) : <Empty text="لا توجد أصناف متاحة حالياً" />}</div> : <div className="restaurants">{restaurants.map(r => <button key={r.id} onClick={() => open(r)}><div className="food-big">🍔</div><div><h3>{r.name}</h3><span><Star size={14} /> {r.rating || 5} · {r.is_open ? 'مفتوح' : 'مغلق'}</span><small>{r.description || 'مطعم مميز على جيبلي'}</small></div><ArrowRight /></button>)}</div>}</section>
}
function DeliveryPage({ go }) { return <section className="screen"><Title title="الدليفري" sub="نوصلها لبابك" go={go} /><div className="empty large"><div className="empty-icon"><Package /></div><h3>الدليفري جاهز إلك</h3><p>أرسل طلبك من أي مكان، وسنضيف لك تتبع السائق وتكلفة التوصيل في المرحلة القادمة.</p><button className="gold" onClick={() => go('restaurants')}>تصفح المطاعم</button></div></section> }

function CartPage({ cart, total, change, session, go, toast, clear }) {
  async function checkout() { if (!session) { toast('سجّل دخولك أولاً'); go('profile'); return } if (!cart.length) return; const groups = Object.values(cart.reduce((a,x) => { (a[x.restaurant_id] ||= []).push(x); return a }, {})); try { for (const group of groups) { const subtotal = group.reduce((s,x) => s + Number(x.price) * x.qty, 0); const { data, error } = await supabase.from('food_orders').insert({ customer_id: session.user.id, restaurant_id: group[0].restaurant_id, delivery_address: 'يحدد من موقع المستخدم', subtotal, total: subtotal, delivery_fee: 0 }).select().single(); if (error) throw error; const { error: itemError } = await supabase.from('food_order_items').insert(group.map(x => ({ order_id: data.id, menu_item_id: x.id, item_name: x.name, quantity: x.qty, unit_price: x.price }))); if (itemError) throw itemError } clear(); toast('تم إرسال الطلب بنجاح 🎉'); go('orders') } catch (e) { toast(e?.message || 'تعذر إرسال الطلب') } }
  return <section className="screen"><Title title="السلة" sub="مراجعة طلبك" go={go} />{!cart.length ? <Empty text="السلة فارغة" /> : <><div className="cart-list">{cart.map(x => <div className="cart-row" key={`${x.restaurant_id}-${x.id}`}><div className="food-img">🍔</div><div><b>{x.name}</b><small>{x.restaurant_name}</small><strong>{money(x.price)}</strong></div><div className="qty"><button onClick={() => change(x.id,-1)}><Minus /></button><b>{x.qty}</b><button onClick={() => change(x.id,1)}><Plus /></button></div></div>)}</div><div className="checkout"><span>المجموع</span><strong>{money(total)}</strong><button className="gold full" onClick={checkout}>تأكيد الطلب</button></div></>}</section>
}

function OrdersPage({ session, orders, setOrders }) { useEffect(() => { if (!session) { setOrders([]); return } supabase.from('food_orders').select('*, restaurants(name)').eq('customer_id', session.user.id).order('created_at', { ascending: false }).then(({data}) => setOrders(data || [])).catch(() => {}) }, [session, setOrders]); return <section className="screen"><Title title="طلباتي" sub="تاريخك مع جيبلي" />{!session ? <Empty text="سجّل دخولك لعرض طلباتك" /> : !orders.length ? <Empty text="لا توجد طلبات حتى الآن" /> : <div className="orders">{orders.map(o => <div className="order" key={o.id}><Package /><div><b>{o.restaurants?.name || 'طلب مطعم'}</b><small>{new Date(o.created_at).toLocaleString('ar-IQ')}</small><span>{statusText(o.status)}</span></div><strong>{money(o.total)}</strong></div>)}</div>}</section> }
function statusText(s) { return ({ pending:'قيد الانتظار', accepted:'تم القبول', preparing:'قيد التحضير', ready:'جاهز', picked_up:'تم الاستلام', on_the_way:'بالطريق', delivered:'تم التوصيل', cancelled:'ملغي' })[s] || s }
function ProfilePage({ session, profile, login, logout }) { return <section className="screen"><Title title="حسابي" sub="إدارة حسابك" />{session ? <div className="profile-card"><div className="avatar big"><UserRound /></div><h2>{profile?.full_name || 'مستخدم جيبلي'}</h2><p>{session.user.email}</p><button className="danger full" onClick={logout}><LogOut /> تسجيل الخروج</button></div> : <div className="empty large"><div className="empty-icon"><UserRound /></div><h3>سجّل دخولك إلى جيبلي</h3><p>احفظ طلباتك ومشاويرك وتابع حالتها بسهولة.</p><button className="gold" onClick={login}>تسجيل الدخول</button></div>}</section> }

function AuthModal({ close }) {
  const [mode,setMode] = useState('login'), [email,setEmail] = useState(''), [password,setPassword] = useState(''), [name,setName] = useState(''), [busy,setBusy] = useState(false), [message,setMessage] = useState('')
  async function submit(e) { e.preventDefault(); setBusy(true); setMessage(''); try { const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }); if (result.error) throw result.error; setMessage(mode === 'login' ? 'تم تسجيل الدخول' : 'تم إنشاء الحساب، تحقق من بريدك إذا طُلب ذلك'); if (mode === 'login') close() } catch (e) { setMessage(e?.message || 'حدث خطأ') } finally { setBusy(false) } }
  return <div className="modal-backdrop" onClick={close}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={close}><X /></button><h2>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2><form onSubmit={submit}>{mode === 'signup' && <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل" required />}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني" required /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" minLength={6} required /><button className="gold full" disabled={busy}>{busy ? 'جاري التنفيذ…' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</button></form>{message && <p className="modal-message">{message}</p>}<button className="link-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب؟ سجّل الدخول'}</button></div></div>
}

createRoot(document.getElementById('root')).render(<App />)
