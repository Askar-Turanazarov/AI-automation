import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { computeFreeStarts } from "../src/lib/booking/slots";
import { addDays, isoWeekday, todayISO } from "../src/lib/time";

const prisma = new PrismaClient();

const SERVICES = [
  { key: "stage1", name: "Чип-тюнинг Stage 1", category: "Двигатель", durationMin: 180, price: 250000, description: "Калибровка ЭБУ, +15–30% мощности, замер на диностенде до и после." },
  { key: "stage2", name: "Stage 2 + даунпайп", category: "Двигатель", durationMin: 360, price: 520000, description: "Прошивка, даунпайп, интеркулер. Для тех, кому мало." },
  { key: "dyno", name: "Диагностика и дино-замер", category: "Двигатель", durationMin: 60, price: 25000, description: "Компьютерная диагностика и график мощности/момента." },
  { key: "exhaust", name: "Спортивный выхлоп", category: "Выхлоп", durationMin: 240, price: 320000, description: "Cat-back система с активными заслонками и настройкой звука." },
  { key: "coilovers", name: "Койловеры", category: "Подвеска", durationMin: 240, price: 180000, description: "Установка винтовой подвески, настройка клиренса и развал-схождение." },
  { key: "air", name: "Пневмоподвеска", category: "Подвеска", durationMin: 480, price: 750000, description: "Пневмостойки, компрессор, управление со смартфона." },
  { key: "ppf", name: "Оклейка PPF", category: "Кузов", durationMin: 480, price: 900000, description: "Полиуретановая плёнка на кузов: глянец, мат или цвет." },
  { key: "ceramic", name: "Керамика кузова", category: "Кузов", durationMin: 240, price: 200000, description: "Полировка и многослойное керамическое покрытие." },
  { key: "tint", name: "Тонировка", category: "Кузов", durationMin: 120, price: 60000, description: "Атермальная или классическая тонировка по ГОСТ." },
  { key: "interior", name: "Перетяжка салона", category: "Интерьер", durationMin: 480, price: 650000, description: "Кожа, алькантара, контрастная строчка — под ваш эскиз." },
  { key: "sound", name: "Шумоизоляция", category: "Интерьер", durationMin: 360, price: 280000, description: "Полная шумовиброизоляция салона премиальными материалами." },
];

const h = (x: number) => x * 60;

const MASTERS = [
  { name: "Арман Сейткали", specialty: "Двигатель и чип-тюнинг", color: "#FF5A1F", bio: "12 лет в моторах. Сертифицированный калибровщик, 900+ прошивок.", services: ["stage1", "stage2", "dyno"], days: [1, 2, 3, 4, 5], start: h(10), end: h(19) },
  { name: "Дмитрий Волков", specialty: "Подвеска и выхлоп", color: "#FFB020", bio: "Строил проекты для дрифта и тайм-аттака. Любит низкие машины.", services: ["exhaust", "coilovers", "air", "dyno"], days: [2, 3, 4, 5, 6], start: h(10), end: h(20) },
  { name: "Алия Нурлановна", specialty: "Детейлинг и PPF", color: "#22D3EE", bio: "Перфекционист плёнки. 300+ полностью оклеенных авто.", services: ["ppf", "ceramic", "tint"], days: [1, 2, 3, 4, 5, 6], start: h(9), end: h(18) },
  { name: "Тимур Ахметов", specialty: "Интерьер и шумоизоляция", color: "#A78BFA", bio: "Бывший мебельщик. Салоны, в которые хочется садиться.", services: ["interior", "sound", "tint"], days: [1, 3, 4, 5, 6], start: h(11), end: h(20) },
];

const NAMES = ["Ерлан", "Максим", "Айдар", "Сергей", "Нурсултан", "Алексей", "Данияр", "Руслан", "Азамат", "Игорь", "Мадина", "Олжас"];
const CARS = ["BMW M3 G80", "Toyota Supra A90", "Nissan GT-R R35", "Audi RS6 C8", "Mercedes-AMG C63", "VW Golf R", "Lexus IS 350", "Subaru WRX STI", "Kia Stinger GT", "Porsche 911 992"];

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

async function main() {
  await prisma.$transaction([
    prisma.aiLog.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.timeOff.deleteMany(),
    prisma.workSchedule.deleteMany(),
    prisma.masterService.deleteMany(),
    prisma.master.deleteMany(),
    prisma.service.deleteMany(),
  ]);

  const svc: Record<string, { id: string; durationMin: number }> = {};
  for (const { key, ...s } of SERVICES) svc[key] = await prisma.service.create({ data: s });

  const today = todayISO();
  const masters = [];
  for (const m of MASTERS) {
    const created = await prisma.master.create({
      data: {
        name: m.name,
        specialty: m.specialty,
        color: m.color,
        bio: m.bio,
        services: { create: m.services.map((k) => ({ serviceId: svc[k].id })) },
        schedules: { create: m.days.map((weekday) => ({ weekday, startMin: m.start, endMin: m.end })) },
      },
    });
    masters.push({ ...m, id: created.id });
  }
  await prisma.timeOff.create({ data: { masterId: masters[1].id, date: addDays(today, 4), reason: "Выставка" } });

  let count = 0;
  for (let d = -24; d <= 12; d++) {
    const date = addDays(today, d);
    for (const m of masters) {
      if (!m.days.includes(isoWeekday(date)) || (d === 4 && m === masters[1])) continue;
      const busy: { start: number; end: number }[] = [];
      const target = d < 0 ? 3 : d < 5 ? 2 : 1;
      for (let i = 0; i < target; i++) {
        if (rnd() < 0.25) continue;
        const s = svc[pick(m.services)];
        const starts = computeFreeStarts({ work: { start: m.start, end: m.end }, busy, duration: s.durationMin, step: 60 });
        if (!starts.length) continue;
        const start = pick(starts);
        busy.push({ start, end: start + s.durationMin });
        const status = d < 0 ? (rnd() < 0.08 ? "cancelled" : "done") : "confirmed";
        await prisma.booking.create({
          data: {
            masterId: m.id,
            serviceId: s.id,
            date,
            startMin: start,
            endMin: start + s.durationMin,
            clientName: pick(NAMES),
            phone: `+7 7${Math.floor(rnd() * 90 + 10)} ${Math.floor(rnd() * 900 + 100)} ${Math.floor(rnd() * 90 + 10)} ${Math.floor(rnd() * 90 + 10)}`,
            car: pick(CARS),
            status,
            source: pick(["web", "web", "bot", "bot", "ai"]),
          },
        });
        count++;
      }
    }
  }
  console.log(`Seeded: ${SERVICES.length} services, ${MASTERS.length} masters, ${count} bookings`);
}

main().finally(() => prisma.$disconnect());
