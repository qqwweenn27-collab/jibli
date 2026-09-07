# جيبلي — نسخة المستخدم

تطبيق ويب عربي RTL بتصميم Mobile-first داخل إطار هاتف، مربوط مباشرة بمشروع Supabase `jibli`.

## التشغيل
1. انسخ `.env.example` إلى `.env.local`.
2. `npm install`
3. `npm run dev`

## الربط
- Supabase URL: `https://hsgqqugojpeynmxiktrx.supabase.co`
- استخدم publishable key في `.env.local` فقط؛ لا تستخدم service role key في المتصفح.
- قاعدة البيانات تحتوي على: profiles, addresses, drivers, restaurants, menu_categories, menu_items, food_orders, food_order_items, rides, reviews.

## الوظائف الموجودة
- تسجيل/دخول Supabase Auth بالبريد وكلمة المرور.
- الصفحة الرئيسية والتنقل السفلي.
- طلب تكسي وحفظ الرحلة في `rides`.
- قائمة المطاعم والأصناف من قاعدة البيانات.
- سلة متعددة المطاعم، وإنشاء `food_orders` و`food_order_items`.
- صفحة الطلبات والحساب.
- تصميم عربي RTL ومتجاوب مع شاشة الهاتف.

> الخرائط الحقيقية (Google Maps/Mapbox) والدفع الإلكتروني والإشعارات Push تحتاج مزود خدمة ومفاتيح API منفصلة؛ الواجهة الحالية تضع مكانها وتجهيزها للتكامل.
