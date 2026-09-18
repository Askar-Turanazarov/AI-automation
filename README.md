# Octane Forge

**[English](#english) · [O'zbekcha](#ozbekcha) · [Русский](#русский)**

---

## English

A complete automation kit for **Octane Forge**, a car tuning atelier in Tashkent: a landing page, online booking with a calendar, a Telegram bot with a Mini App, an owner dashboard, and AI assistants that switch between models automatically.

### What's inside

- **Landing page** — services, team, dyno results, process, reviews. Includes a live tachometer you can "rev" with a tap.
- **Online booking** — service → day → time → specialist → contact details. The calendar shows only real free slots.
- **Telegram bot** — the same booking flow with inline buttons, "My bookings" with cancellation, instant notifications for the owner, and a Mini App with the full calendar.
- **Admin panel** — KPIs, daily revenue, team utilization, peak hours; manage specialists, their working hours and days off, services and prices.
- **AI advisor** on the website and in the bot: answers questions, quotes prices and books clients. **AI analyst** in the admin panel: answers questions about revenue and utilization using live data.
- **Three languages** — Russian, Uzbek (Latin script) and English: website, bot, admin panel and AI replies.
- **Prices in Uzbek sum**, with an approximate USD amount under each price (default rate: $1 = 11,900 UZS).

**Stack:** Next.js 15 · Tailwind CSS v4 · Prisma + PostgreSQL (Neon) · grammY · Gemini / OpenAI / Claude.

### Quick start

```bash
npm install
cp .env.example .env     # then fill in the keys, see below
npm run db:push          # create tables in Postgres (DATABASE_URL from Neon)
npm run db:seed          # demo data: 5 specialists, 11 services, bookings
npm run dev:all          # website (http://localhost:3000) + bot
```

- Website: `/` (the language is picked from the browser), `/ru`, `/uz`, `/en`. Booking: `/{lang}/book`. Admin: `/admin` (password is `ADMIN_PASSWORD`).
- Website only: `npm run dev`. Bot only: `npm run bot`. Tests: `npm test`. Typecheck + lint + tests: `npm run check`.

> `npm run dev` uses Turbopack; `npm run build` uses webpack, because `next build --turbopack` fails on Windows in Next.js 15.5. Webpack doesn't accept `!` in the project path, so keep the folder path free of it.

### Setup

1. **Gemini key.** Open [Google AI Studio](https://aistudio.google.com/apikey) → *Create API key* → paste it into `.env` as `GEMINI_API_KEY="..."`. You can add `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` the same way; providers without a key are skipped.
2. **Telegram bot.** Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
3. **Owner notifications.** Run `npm run dev:all`, open your bot and send `/id`. Put the number it returns into `ADMIN_CHAT_ID` and restart. New bookings will now arrive in that chat, and `/stats` and `/today` will work there.
4. **Mini App (optional).** Telegram requires HTTPS. For local testing run `npx cloudflared tunnel --url http://localhost:3000`, put the `https://…` address into `MINIAPP_URL` and restart the bot.

After any change to `.env`, restart `npm run dev:all`.

### Deploy (Vercel + Neon, free tiers)

The site, API, Telegram Mini App (`/{lang}/app`), bot (webhook `/api/telegram`) and daily reminders (Vercel Cron, see `vercel.json`) all run on Vercel; the database is Neon Postgres.

1. **Database.** In the Vercel project: *Storage → Create Database → Neon (Free)*, region Frankfurt → connect it to the project (keep the default prefix, so `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are created). Copy both into your local `.env`, then `npm run db:push && npm run db:seed`.
2. **Project.** *Add New → Project → Import* this repo, branch `main`. *Settings → Functions → Region*: Frankfurt (next to the database).
3. **Environment variables:** `ADMIN_PASSWORD`, `AUTH_SECRET`, `PUBLIC_SITE_URL` (`https://<project>.vercel.app`), `BUSINESS_TZ`, `NEXT_PUBLIC_UZS_PER_USD`, `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `GEMINI_API_KEY` (optionally `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Generate secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Redeploy after changing variables.
4. **Bot.** `npx vercel login` → `npx vercel link` → `npx vercel env pull .env.production.local` → `npm run bot:setup` (registers the webhook, commands and the Mini App menu button).
5. **Production database changes:** `npm run db:push:prod` / `npm run db:seed:prod` (read `.env.production.local`).

> `npm run bot` (long polling) removes the production webhook — use a separate test bot locally, or run `npm run bot:setup` again afterwards.

### AI failover

The model order is set in `AI_CHAIN` (`provider:model`, comma-separated). By default it uses fast models without heavy reasoning.

- **429, 5xx, timeout, network error:** the model is paused (15 s, growing up to 10 min) and the request goes straight to the next model.
- **400/404 (model not found):** the model is paused for 10 minutes.
- **401/403 (invalid key):** all of that provider's models are disabled until restart.
- If a model fails halfway through, the next one receives the actions already taken, so a booking is never created twice.
- The chain status and call log are under **Admin → AI analyst**.

### Project structure

```
prisma/                     schema and demo data
src/i18n/                   dictionaries (ru, uz, en), dates, language detection
src/lib/booking/            free-slot engine, creating and cancelling bookings, statuses, notifications
src/lib/ai/                 router, provider adapters, tools, prompts
src/lib/telegram/           Telegram messages, Mini App check, Telegram users
src/lib/api.ts, http.ts     helpers for API routes and for client requests
src/lib/money.ts, time.ts   UZS and USD formatting, dates and time
src/components/ui.tsx       shared UI elements
src/components/booking/     booking wizard and its steps
src/components/landing/     landing sections, hero, chat widget
src/components/admin/       admin panel components
src/app/[locale]/           landing page and booking
src/app/admin/              admin panel
src/app/api/                API routes
bot/                        Telegram bot: index.ts starts it, one file per feature
```

Tests sit next to the code (`*.test.ts`).

Atelier contacts (fictional) are in `src/lib/business.ts`. The time zone is `BUSINESS_TZ`, and the dollar rate is `NEXT_PUBLIC_UZS_PER_USD`.

---

## O'zbekcha

**Octane Forge** — Toshkentdagi tyuning atelyesi uchun to'liq avtomatlashtirish tizimi: landing sahifa, kalendar orqali onlayn yozilish, Mini App'li Telegram-bot, egasi uchun boshqaruv paneli hamda modellar o'rtasida avtomatik almashadigan AI-yordamchilar.

### Imkoniyatlar

- **Landing sahifa** — xizmatlar, jamoa, dinostend natijalari, ish jarayoni, mijozlar fikri. Bosganda «gaz beradigan» jonli taxometr ham bor.
- **Onlayn yozilish** — xizmat → kun → vaqt → usta → aloqa ma'lumotlari. Kalendar faqat haqiqatan bo'sh vaqtlarni ko'rsatadi.
- **Telegram-bot** — tugmalar orqali xuddi shunday yozilish, bekor qilish imkoniyati bilan «Yozilishlarim», egasiga darhol bildirishnoma va to'liq kalendarli Mini App.
- **Boshqaruv paneli** — asosiy ko'rsatkichlar, kunlik tushum, ustalar bandligi, eng band soatlar; ustalar, ularning ish jadvali va dam olish kunlari, xizmatlar va narxlarni boshqarish.
- Saytda va botda **AI-maslahatchi**: savollarga javob beradi, narxlarni aytadi va mijozni yozib qo'yadi. Panelda **AI-tahlilchi**: tushum va bandlik haqidagi savollarga jonli ma'lumotlar asosida javob beradi.
- **Uch til** — rus, o'zbek (lotin yozuvi) va ingliz tillari: sayt, bot, panel va AI javoblari.
- **Narxlar so'mda**, har bir narx ostida taxminiy dollar qiymati bilan (standart kurs: $1 = 11 900 so'm).

**Texnologiyalar:** Next.js 15 · Tailwind CSS v4 · Prisma + PostgreSQL (Neon) · grammY · Gemini / OpenAI / Claude.

### Tez ishga tushirish

```bash
npm install
cp .env.example .env     # so'ng kalitlarni kiriting, pastga qarang
npm run db:push          # Postgres'da jadvallarni yaratish (Neon'dan DATABASE_URL)
npm run db:seed          # demo ma'lumotlar: 5 usta, 11 xizmat, yozilishlar
npm run dev:all          # sayt (http://localhost:3000) + bot
```

- Sayt: `/` (til brauzer tiliga qarab tanlanadi), `/ru`, `/uz`, `/en`. Yozilish: `/{til}/book`. Panel: `/admin` (parol — `ADMIN_PASSWORD`).
- Faqat sayt: `npm run dev`. Faqat bot: `npm run bot`. Testlar: `npm test`. Tiplar + lint + testlar: `npm run check`.

> `npm run dev` Turbopack'da ishlaydi, `npm run build` esa webpack'da, chunki Next.js 15.5 da `next build --turbopack` Windows'da xato beradi. Webpack loyiha yo'lidagi `!` belgisini qabul qilmaydi, shuning uchun papka yo'lida bu belgi bo'lmasin.

### Sozlash

1. **Gemini kaliti.** [Google AI Studio](https://aistudio.google.com/apikey) sahifasini oching → *Create API key* → kalitni `.env` fayliga `GEMINI_API_KEY="..."` ko'rinishida qo'ying. `OPENAI_API_KEY` va `ANTHROPIC_API_KEY` ham xuddi shunday qo'shiladi; kaliti yo'q provayderlar o'tkazib yuboriladi.
2. **Telegram-bot.** [@BotFather](https://t.me/BotFather)'ga yozing → `/newbot` → tokenni `TELEGRAM_BOT_TOKEN`ga nusxalang.
3. **Egasiga bildirishnomalar.** `npm run dev:all`ni ishga tushiring, botingizni ochib `/id` yuboring. Bot qaytargan raqamni `ADMIN_CHAT_ID`ga yozing va qayta ishga tushiring. Shundan so'ng yangi yozilishlar shu chatga keladi, `/stats` va `/today` buyruqlari ham ishlaydi.
4. **Mini App (ixtiyoriy).** Telegram HTTPS talab qiladi. Lokal sinov uchun `npx cloudflared tunnel --url http://localhost:3000` buyrug'ini bajaring, `https://…` manzilni `MINIAPP_URL`ga yozing va botni qayta ishga tushiring.

`.env` faylini har safar o'zgartirgandan keyin `npm run dev:all`ni qayta ishga tushiring.

### Deploy (Vercel + Neon, bepul tariflar)

Sayt, API, Telegram Mini App (`/{til}/app`), bot (webhook `/api/telegram`) va kundalik eslatmalar (Vercel Cron, `vercel.json`) Vercel'da ishlaydi; ma'lumotlar bazasi — Neon Postgres.

1. **Baza.** Vercel loyihasida: *Storage → Create Database → Neon (Free)*, Frankfurt mintaqasi → loyihaga ulang (prefiks standart qolsin — `DATABASE_URL` va `DATABASE_URL_UNPOOLED` yaratiladi). Ikkalasini lokal `.env`ga ko'chiring, so'ng `npm run db:push && npm run db:seed`.
2. **Loyiha.** *Add New → Project → Import* shu repozitoriy, `main` branch. *Settings → Functions → Region*: Frankfurt (baza yonida).
3. **O'zgaruvchilar:** `ADMIN_PASSWORD`, `AUTH_SECRET`, `PUBLIC_SITE_URL` (`https://<loyiha>.vercel.app`), `BUSINESS_TZ`, `NEXT_PUBLIC_UZS_PER_USD`, `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `GEMINI_API_KEY` (ixtiyoriy: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Maxfiy kalitlar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. O'zgartirgandan keyin — Redeploy.
4. **Bot.** `npx vercel login` → `npx vercel link` → `npx vercel env pull .env.production.local` → `npm run bot:setup` (webhook, buyruqlar va Mini App menyu tugmasi).
5. **Prod bazasidagi o'zgarishlar:** `npm run db:push:prod` / `npm run db:seed:prod` (`.env.production.local`dan o'qiydi).

> `npm run bot` (long polling) prod webhook'ni o'chiradi — lokal uchun alohida test bot ishlating yoki keyin yana `npm run bot:setup` bajaring.

### AI modellarini avtomatik almashtirish

Modellar tartibi `AI_CHAIN`da beriladi (`provayder:model`, vergul bilan). Standart holatda og'ir reasoning'siz tezkor modellar ishlatiladi.

- **429, 5xx, taym-aut, tarmoq xatosi:** model pauzaga qo'yiladi (15 soniyadan 10 daqiqagacha oshib boradi) va so'rov darhol keyingi modelga o'tadi.
- **400/404 (model topilmadi):** model 10 daqiqaga pauzaga qo'yiladi.
- **401/403 (kalit noto'g'ri):** shu provayderning barcha modellari qayta ishga tushirilgunga qadar o'chiriladi.
- Agar model ish o'rtasida to'xtab qolsa, keyingi modelga bajarilgan amallar uzatiladi — yozilish hech qachon ikki marta yaratilmaydi.
- Zanjir holati va chaqiruvlar jurnali — **Panel → AI-tahlilchi** bo'limida.

### Loyiha tuzilmasi

```
prisma/                     sxema va demo ma'lumotlar
src/i18n/                   lug'atlar (ru, uz, en), sanalar, tilni aniqlash
src/lib/booking/            bo'sh vaqt hisoblash, yozilish yaratish va bekor qilish, statuslar, bildirishnomalar
src/lib/ai/                 router, provayder adapterlari, vositalar, promptlar
src/lib/telegram/           Telegram xabarlari, Mini App tekshiruvi, Telegram foydalanuvchilari
src/lib/api.ts, http.ts     API marshrutlari va brauzer so'rovlari uchun yordamchilar
src/lib/money.ts, time.ts   so'm va dollarni formatlash, sana va vaqt
src/components/ui.tsx       umumiy UI elementlari
src/components/booking/     yozilish formasi va uning qadamlari
src/components/landing/     landing bo'limlari, hero, chat vidjeti
src/components/admin/       boshqaruv paneli komponentlari
src/app/[locale]/           landing sahifa va yozilish
src/app/admin/              boshqaruv paneli
src/app/api/                API marshrutlari
bot/                        Telegram-bot: index.ts uni ishga tushiradi, har bir imkoniyat — alohida fayl
```

Testlar kod yonida joylashgan (`*.test.ts`).

Atelye kontaktlari (o'ylab topilgan) — `src/lib/business.ts` faylida. Vaqt mintaqasi — `BUSINESS_TZ`, dollar kursi — `NEXT_PUBLIC_UZS_PER_USD`.

---

## Русский

**Octane Forge** — готовая система автоматизации тюнинг-ателье в Ташкенте: лендинг, онлайн-запись через календарь, Telegram-бот с Mini App, панель владельца и ИИ-ассистенты, которые сами переключаются между моделями.

### Что внутри

- **Лендинг** — услуги, команда, результаты с диностенда, процесс работы, отзывы. Есть живой тахометр, который «газует» по нажатию.
- **Онлайн-запись** — услуга → день → время → мастер → контакты. Календарь показывает только реально свободное время.
- **Telegram-бот** — та же запись кнопками, «Мои записи» с отменой, мгновенные уведомления владельцу и Mini App с полным календарём.
- **Админ-панель** — ключевые показатели, выручка по дням, загрузка мастеров, пиковые часы; управление мастерами, их графиком и выходными, услугами и ценами.
- **ИИ-консультант** на сайте и в боте: отвечает на вопросы, называет цены и записывает клиента. **ИИ-аналитик** в панели: отвечает на вопросы о выручке и загрузке по живым данным.
- **Три языка** — русский, узбекский (латиница) и английский: сайт, бот, панель и ответы ИИ.
- **Цены в сумах**, под каждой — примерная сумма в долларах (курс по умолчанию: $1 = 11 900 сум).

**Стек:** Next.js 15 · Tailwind CSS v4 · Prisma + PostgreSQL (Neon) · grammY · Gemini / OpenAI / Claude.

### Быстрый старт

```bash
npm install
cp .env.example .env     # затем впишите ключи, см. ниже
npm run db:push          # создать таблицы в Postgres (DATABASE_URL из Neon)
npm run db:seed          # демо-данные: 5 мастеров, 11 услуг, записи
npm run dev:all          # сайт (http://localhost:3000) + бот
```

- Сайт: `/` (язык подбирается по браузеру), `/ru`, `/uz`, `/en`. Запись: `/{язык}/book`. Админка: `/admin` (пароль — `ADMIN_PASSWORD`).
- Только сайт: `npm run dev`. Только бот: `npm run bot`. Тесты: `npm test`. Типы + линтер + тесты: `npm run check`.

> `npm run dev` работает на Turbopack, а `npm run build` — на webpack, потому что `next build --turbopack` падает на Windows в Next.js 15.5. Webpack не принимает `!` в пути к проекту, поэтому держите папку по пути без этого символа.

### Настройка

1. **Ключ Gemini.** Откройте [Google AI Studio](https://aistudio.google.com/apikey) → *Create API key* → вставьте ключ в `.env`: `GEMINI_API_KEY="..."`. Так же добавляются `OPENAI_API_KEY` и `ANTHROPIC_API_KEY`; провайдеры без ключа пропускаются.
2. **Telegram-бот.** Напишите [@BotFather](https://t.me/BotFather) → `/newbot` → скопируйте токен в `TELEGRAM_BOT_TOKEN`.
3. **Уведомления владельцу.** Запустите `npm run dev:all`, откройте своего бота и отправьте `/id`. Число из ответа впишите в `ADMIN_CHAT_ID` и перезапустите. После этого новые записи будут приходить в этот чат, а также заработают команды `/stats` и `/today`.
4. **Mini App (по желанию).** Telegram требует HTTPS. Для локальной проверки выполните `npx cloudflared tunnel --url http://localhost:3000`, впишите адрес `https://…` в `MINIAPP_URL` и перезапустите бота.

После любого изменения `.env` перезапускайте `npm run dev:all`.

### Деплой (Vercel + Neon, бесплатные тарифы)

Сайт, API, Telegram Mini App (`/{язык}/app`), бот (webhook `/api/telegram`) и ежедневные напоминания (Vercel Cron, `vercel.json`) работают на Vercel; база данных — Neon Postgres.

1. **База.** В проекте Vercel: *Storage → Create Database → Neon (Free)*, регион Frankfurt → подключить к проекту (префикс стандартный — появятся `DATABASE_URL` и `DATABASE_URL_UNPOOLED`). Скопировать обе строки в локальный `.env`, затем `npm run db:push && npm run db:seed`.
2. **Проект.** *Add New → Project → Import* этот репозиторий, ветка `main`. *Settings → Functions → Region*: Frankfurt (рядом с базой).
3. **Переменные:** `ADMIN_PASSWORD`, `AUTH_SECRET`, `PUBLIC_SITE_URL` (`https://<проект>.vercel.app`), `BUSINESS_TZ`, `NEXT_PUBLIC_UZS_PER_USD`, `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `GEMINI_API_KEY` (по желанию `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Секреты: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. После изменения переменных — Redeploy.
4. **Бот.** `npx vercel login` → `npx vercel link` → `npx vercel env pull .env.production.local` → `npm run bot:setup` (webhook, команды и кнопка меню Mini App).
5. **Изменения прод-базы:** `npm run db:push:prod` / `npm run db:seed:prod` (читают `.env.production.local`).

> `npm run bot` (long polling) снимает прод-webhook — локально используйте отдельного тестового бота или потом снова выполните `npm run bot:setup`.

### Автопереключение ИИ-моделей

Порядок моделей задаётся в `AI_CHAIN` (`провайдер:модель` через запятую). По умолчанию используются быстрые модели без тяжёлого reasoning.

- **429, 5xx, таймаут, сетевая ошибка:** модель уходит на паузу (от 15 секунд с ростом до 10 минут), а запрос сразу идёт в следующую.
- **400/404 (модель не найдена):** пауза на 10 минут.
- **401/403 (неверный ключ):** все модели этого провайдера отключаются до перезапуска.
- Если модель упала посреди работы, следующая получает уже выполненные действия — запись никогда не создаётся дважды.
- Статус цепочки и журнал вызовов — в разделе **Админка → ИИ-аналитик**.

### Структура проекта

```
prisma/                     схема и демо-данные
src/i18n/                   словари (ru, uz, en), даты, определение языка
src/lib/booking/            расчёт свободного времени, создание и отмена записей, статусы, уведомления
src/lib/ai/                 роутер, адаптеры провайдеров, инструменты, промпты
src/lib/telegram/           сообщения в Telegram, проверка Mini App, пользователи Telegram
src/lib/api.ts, http.ts     помощники для API-маршрутов и запросов из браузера
src/lib/money.ts, time.ts   форматирование сумов и долларов, даты и время
src/components/ui.tsx       общие элементы интерфейса
src/components/booking/     форма записи и её шаги
src/components/landing/     секции лендинга, первый экран, чат-виджет
src/components/admin/       компоненты админ-панели
src/app/[locale]/           лендинг и запись
src/app/admin/              админ-панель
src/app/api/                API-маршруты
bot/                        Telegram-бот: index.ts запускает его, каждая функция — отдельный файл
```

Тесты лежат рядом с кодом (`*.test.ts`).

Контакты ателье (вымышленные) — в `src/lib/business.ts`. Часовой пояс — `BUSINESS_TZ`, курс доллара — `NEXT_PUBLIC_UZS_PER_USD`.
