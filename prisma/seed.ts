import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { computeFreeStarts } from "../src/lib/booking/slots";
import { addDays, isoWeekday, todayISO } from "../src/lib/time";

const prisma = new PrismaClient();

// Цены — в сумах (UZS)
const SERVICES = [
  {
    key: "stage1",
    durationMin: 180,
    price: 3_500_000,
    name: "Чип-тюнинг Stage 1",
    nameUz: "Chip-tyuning Stage 1",
    nameEn: "ECU Tuning Stage 1",
    category: "Двигатель",
    categoryUz: "Dvigatel",
    categoryEn: "Engine",
    description: "Калибровка ЭБУ, +15–30% мощности, замер на диностенде до и после.",
    descriptionUz: "Dvigatel boshqaruv blokini kalibrlash, quvvat +15–30%, dinostendda oldin va keyin o'lchov.",
    descriptionEn: "ECU calibration for +15–30% power, with dyno runs before and after.",
  },
  {
    key: "stage2",
    durationMin: 360,
    price: 9_900_000,
    name: "Stage 2 + даунпайп",
    nameUz: "Stage 2 + daunpayp",
    nameEn: "Stage 2 + Downpipe",
    category: "Двигатель",
    categoryUz: "Dvigatel",
    categoryEn: "Engine",
    description: "Прошивка, даунпайп и интеркулер. Для тех, кому мало.",
    descriptionUz: "Proshivka, daunpayp va interkuler. Stage 1 kamlik qilayotganlar uchun.",
    descriptionEn: "Remap, downpipe and intercooler. For when Stage 1 isn't enough.",
  },
  {
    key: "dyno",
    durationMin: 60,
    price: 350_000,
    name: "Диагностика и дино-замер",
    nameUz: "Diagnostika va dinostendda o'lchov",
    nameEn: "Diagnostics & Dyno Run",
    category: "Двигатель",
    categoryUz: "Dvigatel",
    categoryEn: "Engine",
    description: "Компьютерная диагностика и график мощности и крутящего момента.",
    descriptionUz: "Kompyuter diagnostikasi hamda quvvat va aylantiruvchi moment grafigi.",
    descriptionEn: "Computer diagnostics plus a power and torque chart.",
  },
  {
    key: "exhaust",
    durationMin: 240,
    price: 5_500_000,
    name: "Спортивный выхлоп",
    nameUz: "Sport chiqarish tizimi",
    nameEn: "Sports Exhaust",
    category: "Выхлоп",
    categoryUz: "Chiqarish tizimi",
    categoryEn: "Exhaust",
    description: "Cat-back система с активными заслонками и настройкой звука.",
    descriptionUz: "Faol klapanli va ovozi sozlanadigan cat-back tizimi.",
    descriptionEn: "Cat-back system with active valves and a tuned sound.",
  },
  {
    key: "coilovers",
    durationMin: 240,
    price: 2_900_000,
    name: "Установка койловеров",
    nameUz: "Koyloverlarni o'rnatish",
    nameEn: "Coilover Installation",
    category: "Подвеска",
    categoryUz: "Osma",
    categoryEn: "Suspension",
    description: "Установка винтовой подвески, настройка клиренса и развал-схождение.",
    descriptionUz: "Vintli osmani o'rnatish, klirensni sozlash va g'ildiraklarni rostlash (razval-sxojdeniye).",
    descriptionEn: "Coilover install, ride height setup and wheel alignment.",
  },
  {
    key: "air",
    durationMin: 480,
    price: 18_500_000,
    name: "Пневмоподвеска",
    nameUz: "Pnevmoosma",
    nameEn: "Air Suspension",
    category: "Подвеска",
    categoryUz: "Osma",
    categoryEn: "Suspension",
    description: "Пневмостойки, компрессор и управление со смартфона.",
    descriptionUz: "Pnevmostoykalar, kompressor va smartfondan boshqaruv.",
    descriptionEn: "Air struts, a compressor and smartphone control.",
  },
  {
    key: "ppf",
    durationMin: 480,
    price: 16_900_000,
    name: "Оклейка PPF",
    nameUz: "PPF plyonka bilan qoplash",
    nameEn: "Full PPF Wrap",
    category: "Кузов",
    categoryUz: "Kuzov",
    categoryEn: "Body",
    description: "Полиуретановая плёнка на весь кузов: глянец, мат или цвет.",
    descriptionUz: "Butun kuzovga poliuretan plyonka: yaltiroq, mat yoki rangli.",
    descriptionEn: "Full-body polyurethane film: gloss, matte or color.",
  },
  {
    key: "ceramic",
    durationMin: 240,
    price: 3_200_000,
    name: "Керамика кузова",
    nameUz: "Kuzovga keramik qoplama",
    nameEn: "Ceramic Coating",
    category: "Кузов",
    categoryUz: "Kuzov",
    categoryEn: "Body",
    description: "Полировка и многослойное керамическое покрытие.",
    descriptionUz: "Polirovka va ko'p qatlamli keramik qoplama.",
    descriptionEn: "Paint correction and a multi-layer ceramic coating.",
  },
  {
    key: "tint",
    durationMin: 120,
    price: 900_000,
    name: "Тонировка",
    nameUz: "Tonirovka",
    nameEn: "Window Tint",
    category: "Кузов",
    categoryUz: "Kuzov",
    categoryEn: "Body",
    description: "Атермальная или классическая тонировка в рамках разрешённых норм.",
    descriptionUz: "Ruxsat etilgan me'yorlar doirasida atermal yoki klassik tonirovka.",
    descriptionEn: "Heat-rejecting or classic tint within legal limits.",
  },
  {
    key: "interior",
    durationMin: 480,
    price: 12_500_000,
    name: "Перетяжка салона",
    nameUz: "Salonni qayta qoplash",
    nameEn: "Interior Retrim",
    category: "Салон",
    categoryUz: "Salon",
    categoryEn: "Interior",
    description: "Кожа, алькантара, контрастная строчка — по вашему эскизу.",
    descriptionUz: "Charm, alkantara, kontrast chok — sizning eskizingiz bo'yicha.",
    descriptionEn: "Leather, Alcantara and contrast stitching — built to your design.",
  },
  {
    key: "sound",
    durationMin: 360,
    price: 4_800_000,
    name: "Шумоизоляция",
    nameUz: "Shovqin izolyatsiyasi",
    nameEn: "Sound Deadening",
    category: "Салон",
    categoryUz: "Salon",
    categoryEn: "Interior",
    description: "Полная шумо- и виброизоляция салона премиальными материалами.",
    descriptionUz: "Salonni premium materiallar bilan shovqin va tebranishdan to'liq izolyatsiya qilish.",
    descriptionEn: "Full cabin sound and vibration treatment with premium materials.",
  },
];

const h = (x: number) => x * 60;

// Ташкент — многонациональная команда
const MASTERS = [
  {
    name: "Шерзод Каримов",
    nameLatin: "Sherzod Karimov",
    color: "#FF5A1F",
    specialty: "Двигатель и чип-тюнинг",
    specialtyUz: "Dvigatel va chip-tyuning",
    specialtyEn: "Engines & ECU tuning",
    bio: "12 лет в моторах. Сертифицированный калибровщик, больше 900 прошивок.",
    bioUz: "12 yildan beri motorlar bilan ishlaydi. Sertifikatlangan kalibrovkachi, 900 dan ortiq proshivka.",
    bioEn: "12 years working on engines. A certified calibrator with 900+ ECU remaps.",
    services: ["stage1", "stage2", "dyno"],
    days: [1, 2, 3, 4, 5],
    start: h(10),
    end: h(19),
  },
  {
    name: "Дмитрий Волков",
    nameLatin: "Dmitriy Volkov",
    color: "#FFB020",
    specialty: "Подвеска и выхлоп",
    specialtyUz: "Osma va chiqarish tizimi",
    specialtyEn: "Suspension & exhaust",
    bio: "Строил машины для дрифта и тайм-аттака. Любит, когда машина стоит низко.",
    bioUz: "Drift va taym-attak uchun mashinalar yig'gan. Past o'tirgan mashinalarni yaxshi ko'radi.",
    bioEn: "Has built drift and time-attack cars. Likes them sitting low.",
    services: ["exhaust", "coilovers", "air", "dyno"],
    days: [2, 3, 4, 5, 6],
    start: h(10),
    end: h(20),
  },
  {
    name: "Виктор Ким",
    nameLatin: "Viktor Kim",
    color: "#22D3EE",
    specialty: "Детейлинг и PPF",
    specialtyUz: "Deteyling va PPF",
    specialtyEn: "Detailing & PPF",
    bio: "Перфекционист в работе с плёнкой. Больше 300 полностью оклеенных машин.",
    bioUz: "Plyonka bilan ishlashda perfeksionist. 300 dan ortiq to'liq qoplangan mashina.",
    bioEn: "A perfectionist with film and 300+ full-body wraps behind him.",
    services: ["ppf", "ceramic", "tint"],
    days: [1, 2, 3, 4, 5, 6],
    start: h(9),
    end: h(18),
  },
  {
    name: "Ренат Хайруллин",
    nameLatin: "Renat Khayrullin",
    color: "#A78BFA",
    specialty: "Салон и шумоизоляция",
    specialtyUz: "Salon va shovqin izolyatsiyasi",
    specialtyEn: "Interiors & sound deadening",
    bio: "В прошлом мебельщик. Делает салоны, из которых не хочется выходить.",
    bioUz: "Avval mebel ustasi bo'lgan. Undan tushgingiz kelmaydigan salonlar yaratadi.",
    bioEn: "A former furniture maker who builds interiors you never want to leave.",
    services: ["interior", "sound", "tint"],
    days: [1, 3, 4, 5, 6],
    start: h(11),
    end: h(20),
  },
  {
    name: "Айгерим Сейтжанова",
    nameLatin: "Aigerim Seytjanova",
    color: "#34D399",
    specialty: "Керамика и тонировка",
    specialtyUz: "Keramika va tonirovka",
    specialtyEn: "Ceramic coating & tint",
    bio: "Мастер полировки и защитных покрытий. Доводит кузов до зеркального блеска.",
    bioUz: "Polirovka va himoya qoplamalari ustasi. Kuzovni ko'zgudek yaltiratadi.",
    bioEn: "A polishing and coatings specialist who takes paint to a mirror finish.",
    services: ["ceramic", "tint"],
    days: [2, 3, 4, 5, 6],
    start: h(10),
    end: h(19),
  },
];

const CLIENTS = [
  "Жасур",
  "Нодира",
  "Отабек",
  "Ольга",
  "Сергей Пак",
  "Дильноза",
  "Тимур Ахмедов",
  "Камила",
  "Азиз",
  "Артём",
  "Бахтиёр",
  "Эльвира",
];
const CARS = [
  "Chevrolet Malibu 2",
  "Chevrolet Tracker",
  "BYD Song Plus",
  "Toyota Camry 75",
  "Lexus LX 600",
  "BMW 530i G30",
  "Mercedes-Benz E 300",
  "Kia K5",
  "Hyundai Sonata",
  "Toyota Land Cruiser 300",
  "Li Auto L7",
  "Chevrolet Tahoe",
];
const OPERATORS = ["90", "91", "93", "94", "97", "99", "33", "88"];

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");

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
  for (const { services, days, start, end, ...m } of MASTERS) {
    const created = await prisma.master.create({
      data: {
        ...m,
        services: { create: services.map((k) => ({ serviceId: svc[k].id })) },
        schedules: { create: days.map((weekday) => ({ weekday, startMin: start, endMin: end })) },
      },
    });
    masters.push({ id: created.id, services, days, start, end });
  }
  await prisma.timeOff.create({ data: { masterId: masters[1].id, date: addDays(today, 4), reason: "Автовыставка" } });

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
        await prisma.booking.create({
          data: {
            masterId: m.id,
            serviceId: s.id,
            date,
            startMin: start,
            endMin: start + s.durationMin,
            clientName: pick(CLIENTS),
            phone: `+998 ${pick(OPERATORS)} ${digits(3)} ${digits(2)} ${digits(2)}`,
            car: pick(CARS),
            status: d < 0 ? (rnd() < 0.08 ? "cancelled" : "done") : "confirmed",
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
