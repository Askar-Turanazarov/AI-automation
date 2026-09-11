# Octane Forge — автоматизация тюнинг-ателье

Лендинг · онлайн-запись с календарём · Telegram-бот (+ Mini App) · админка с дашбордом · ИИ-консультант и ИИ-аналитик с автопереключением моделей.

**Стек:** Next.js 15, Tailwind v4, framer-motion, Recharts, Prisma + SQLite, grammY, Gemini / OpenAI / Claude.

## Запуск

```bash
npm install
cp .env.example .env        # заполните ключи
npm run db:push             # создать БД
npm run db:seed             # демо-данные: 4 мастера, 11 услуг, записи
npm run dev:all             # сайт (http://localhost:3000) + бот
```

- Сайт: `/` — лендинг, `/book` — запись, `/admin` — админка (пароль `ADMIN_PASSWORD`).
- Только сайт: `npm run dev`; только бот: `npm run bot`. Тесты: `npm test`.

## Telegram

1. Создайте бота у [@BotFather](https://t.me/BotFather) → `TELEGRAM_BOT_TOKEN`.
2. Запустите бота, отправьте ему `/id` → вставьте число в `ADMIN_CHAT_ID` (сюда приходят уведомления о записях, доступны `/stats` и `/today`).
3. Mini App (большой календарь внутри Telegram) требует HTTPS. Для разработки:
   `npx cloudflared tunnel --url http://localhost:3000` → адрес в `MINIAPP_URL`, перезапустите бота.

## ИИ

- Ключи: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. Провайдер без ключа пропускается.
- `AI_CHAIN` — порядок моделей `provider:model`. Используются быстрые модели без тяжёлого reasoning.
- Роутер (`src/lib/ai/router.ts`): при 429/5xx/таймауте/сетевой ошибке модель уходит на паузу (15с → до 10 мин) и запрос мгновенно идёт в следующую; 400/404 (модель не найдена) — пауза 10 мин; 401/403 — провайдер отключается до перезапуска. Если модель упала посреди работы, следующей передаются уже выполненные действия (запись не дублируется).
- Статус цепочки и журнал вызовов — `/admin/ai`.

## Структура

```
prisma/            схема и сид
src/lib/booking    движок слотов, создание/отмена записей
src/lib/ai         роутер, адаптеры провайдеров, инструменты, промпты
src/lib/stats.ts   загрузка мастеров и KPI
src/app            лендинг, /book, /admin, API
bot/               Telegram-бот
```

Контакты ателье — `src/lib/business.ts`. Часовой пояс — `BUSINESS_TZ`.
