# خطة تحسين تكامل الذكاء الاصطناعي الموجود

## السياق
التكامل موجود (مسار `POST /api/ai/product-search` + openaiClient/aiService/aiErrors). المهمة **تحسين** وليست إنشاء جديد. اعتمدتُ على قراءة كل ملفات التكامل الحالية. لا مكتبات جديدة، لا تغيير DB/Models/Migrations، استخدام env الموجودة فقط.

## المشاكل المكتشفة (التي ستُصلَح)
1. **429 Rate Limit يُحوَّل خطأً إلى 502 عامة** بدل تمرير 429 + Retry-After — يخفي طبيعة الخطأ عن العميل.
2. **لا Retry Logic** للأخطاء المؤقتة (429/5xx/الشبكة/timeout) — كل خطأ عابر يفشل الطلب كاملًا.
3. **لا تنظيف للمدخلات** (whitespace، أحرف تحكم زائدة) قبل الإرسال للنموذج — هدر tokens واحتمال سلوك غريب.
4. **لا حدّ على حجم الطلب الكلي** (payload) — نقطة إساءة محتملة.
5. **`intent` كامل يُعاد للعميل** — يكشف تفاصيل داخلية (debug leak)؛ يجب تقليصه أو إخفاؤه.
6. **رموز LIKE wildcards (`%`/`_`) في الكلمات المفتاحية** تسبب تطابقًا دلاليًا غامضًا في DB.
7. **رسائل الخطأ غير مفصّلة** بين "empty response" و"incomplete/truncated" — كلاهما يُعامَل بنفس الرسالة.
8. **عدم وجود تصنيف واضح للأخطاء العابرة vs. الدائمة** — يمنع اتخاذ قرار retry ذكي.

---

## التعديلات (كلها داخل وحدة الـ AI الحالية + app.js + env)

### 1) `src/modules/ai/utils/aiErrors.js` — تصنيف أدق للأخطاء + 429
- إضافة `aiRateLimited(retryAfterMs)`: status **429** (تمرير كما هو، لا 502)، مع `details.retry_after_ms` و `headers.retry-after` يضيفها الـ route handler.
- تعديل `aiProviderError` لتمييز الأخطاء العابرة (transient): يُمرَّر `transient: true/false` ضمن details حسب status (429/408/5xx/0=network = transient؛ 4xx الأخرى = غير عابر).
- إضافة `aiEmptyResponse()` و `aiTruncatedResponse()` كرسالتين منفصلتين بدل إعادة استخدام رسالة عامة (لكل منهما code مميّز: `empty_response` / `truncated_response`).
- إضافة helper `isTransientError(err)` للعميل ليقرر إعادة المحاولة.

### 2) `src/modules/ai/services/openaiClient.js` — Retry + Timeout لكل محاولة + معالجة 429
- **Retry**: دالة داخلية `callWithRetry` تُغلّف استدعاء `fetch`. تعيد المحاولة **فقط للأخطاء المؤقتة**: timeout، network failure، HTTP 429، 408، 5xx. لا تُعيد على 4xx الأخرى (401/403/400 = أخطاء دائمة).
- **احترام Retry-After**: عند 429/503، يقرأ `Retry-After` من headers (ثوانٍ أو تاريخ HTTP)، وينتظره قبل المحاولة التالية (محدود بحد أقصى معقول). عند غيابه يطبّق backoff أسّي (قاعدة: 0.5s, 1s, 2s) مع jitter.
- **عدد المحاولات**: قابل للتهيئة عبر `env.aiMaxRetries` (افتراضي 2 = 3 محاولات إجمالية)، مشدود بين 0–4.
- **Timeout لكل محاولة**: AbortController يُعاد ضبطه لكل محاولة (لا يتسرب timeout من محاولة لأخرى).
- **معالجة استجابة غير مكتملة**: فحص `finish_reason` من OpenAI (`length`/`content_filter`/`null`) وتمييزها (`truncated_response` بدل اعتبارها نجاحًا ناقصًا).
- **رسائل سجل أدق**: تمييز كل محاولة (attempt N/total) في الـ logger.
- **كتم التفاصيل الحساسة**: لا يُسجَّل المفتاح ولا الـ raw body كامل.

### 3) `src/modules/ai/services/aiService.js` — تنظيف المدخلات + escape wildcards
- **تنظيف الـ query** قبل تمريره للنموذج: trim، تطبيع whitespace مزدوج/أسطر زائدة، إزالة أحرف تحكم (control chars)، تطبيع Unicode (NFC). دالة `normalizeQuery()`.
- **escape رموز LIKE** في `searchProducts`: تحويل `%` و`_` في الكلمات المفتاحية إلى نسخ حرفية (مثلًا `\%`) قبل وضعها في `Op.iLike`، حتى لا تعمل كـ wildcard. (Sequelize يدعم escape عبر `Op.iLike` مع رمز escape افتراضي.)
- إبقاء `extractJson`/`sanitizeIntent` كما هما (متينان بالفعل، مغطّيان بـ 12 اختبار).

### 4) `src/modules/ai/routes/aiRoutes.js` — Validation أقوى + توحيد الاستجابة + Retry-After header
- **Validation**: إضافة `body('query').trim()` و `body('query').escape` غير مناسب هنا (يخرب النص العربي) — عوضًا عن ذلك تنظيف يدوي عبر service (normalizeQuery). إبقاء قيود الطول 1–500. إضافة فحص أن `page`/`limit` لا تتجاوز حدود parsePagination.
- **حدّ حجم الطلب**: لا يُضاف هنا؛ الأفضل مركزيًا في app.js (انظر #6).
- **استجابة موحَّدة ومأمونة**: إزالة `intent` الكامل من استجابة العميل، أو إرجاع نسخة مقلّصة (`{ keywords_count, has_price_filter, category }`) دون كشف محتوى الـ intent الخام. قرار: إرجاع ملخص آمن فقط.
- **Retry-After header**: عند `aiRateLimited`، ضبط `res.set('Retry-After', secs)` قبل الإرسال.
- **عدم تغيير شكل النجاح**: يبقى `{ ok, data:{ products, pagination } }` + ملخص intent آمن.

### 5) `src/app.js` — توسيع error handler لـ 429 + Retry-After
- تعديل فرع `AiProviderError`: لو `err.code === 'rate_limited'`، استخدم **status 429** من err.status، ومرّر `retry_after_ms` في details، واضبط `Retry-After` header على res.
- ملاحظة ترتيب الفحوصات: يبقى فرع `AiProviderError` **قبل** `ApiError` (كما هو صحيح الآن).

### 6) `src/app.js` — حدّ حجم الطلب الكلي (body size limit)
- إضافة `limit` إلى `express.json({ limit: '256kb' })`. يحمي كل الـ API من الطلبات الكبيرة جدًا (بما فيها product-search). 256kb كافية للـ JSON العادي وتمنع إساءة الاستخدام. التأثير على webhook rawBody: مُدار في الـ `verify` الحالي. (قرار: استخدام حد معتدل 256kb؛ إن احتاج أي endpoint حجمًا أكبر يُعدّل لاحقًا.) — **سأتحقق أنه لا يكسر endpoints قبل التطبيق.**

### 7) `src/config/env.js` — إعداد Retry قابل للتهيئة
- إضافة `aiMaxRetries: Math.min(Math.max(optionalInt('AI_MAX_RETRIES', 2), 0), 4)`.
- إضافة `aiBaseRetryDelayMs` (افتراضي 500، مشدود 100–5000) لضبط backoff الأساس.
- (تحديث `.env.example` فقط بالتوثيق؛ `.env` المحلي يبقى يعمل بالقيم الافتراضية.)

---

## ما لا يُغيَّر (ضمان عدم الكسر)
- لا models/migrations/schema/DB.
- لا endpoints أخرى (Customer/Merchant/Admin CRUD، payments، OTP) — إلا حدّ الحجم المركزي الذي سأتحقق من تأثيره.
- لا مكتبات جديدة.
- استخدم env الموجودة (AI_API_KEY, AI_PROVIDER, AI_MODEL, AI_TIMEOUT_MS, AI_MAX_TOKENS) + المتغيرات الجديدة الاختيارية فقط (AI_MAX_RETRIES, AI_BASE_RETRY_DELAY_MS) — موثّقة كاختيارية في .env.example.

## الاختبارات المطلوبة (سيناريوهات المهمة #13)
سأنفّذها على سيرفر حيّ + اختبار وحدة للمنطق النقي:
1. **Success** — يتطلب مفتاح OpenAI حقيقي؛ سأجربه، وإن لم يتوفر سأوثّق ذلك بدل استخدام Mock.
2. **Invalid Input** — query فارغ/فاقد/طويل جدًا → 422.
3. **Timeout** — `AI_TIMEOUT_MS=1000` + محاكاة مزود بطيء (خادم محلي لا يستجيب) → 504 + تحقق أن retry لا يطبَّق بشكل مفرط.
4. **AI Provider Failure** — مفتاح تجريبي → 401→502 `provider_error` (لا retry لـ 4xx).
5. **Empty Response** — محاكاة عبر اختبار وحدة لـ `extractJson` على content فارغ.
6. **Large Prompt** — query > 500 حرف → 422 + body > 256kb → 413.
7. **Network Failure** — `AI_PROVIDER`/endpoint غير قابل للوصول (محاكاة عبر خادم محلي يُغلق الاتصال) → 502 + تحقق retry.
8. **Rate Limit (جديد)** — محاكاة رد 429 + Retry-After عبر خادم محلي → 429 + header Retry-After + سلوك retry.
9. **اختبارات وحدة**: إضافة حالات لـ `normalizeQuery`, `escapeLike`, `isTransientError`, تصنيف 429.

## التحسينات المستقبلية (في التقرير فقط)
- caching لنتائج analyzeSearchIntent (LRU حسب hash الـ query).
- circuit breaker إذا تكررت إخفاقات المزود.
- metrics/observability (عدد المحاولات، زمن الاستجابة، معدل 429).