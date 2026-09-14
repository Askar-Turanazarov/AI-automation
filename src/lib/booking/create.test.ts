import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const m = vi.hoisted(() => {
  const tx = { booking: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() } };
  return {
    tx,
    prisma: {
      $transaction: vi.fn(),
      booking: { findUnique: vi.fn(), update: vi.fn() },
      telegramUser: { findUnique: vi.fn() },
    },
    getDaySlots: vi.fn(),
    sendTelegram: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ prisma: m.prisma }));
vi.mock("./availability", () => ({ getDaySlots: m.getDaySlots }));
vi.mock("@/lib/telegram/notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/telegram/notify")>()),
  sendTelegram: m.sendTelegram,
}));

import { cancelBooking, createBooking, rescheduleBooking, type BookingInput } from "./create";
import { BookingError } from "./errors";

const SERVICE = {
  id: "s1",
  name: "Чип-тюнинг",
  nameUz: "",
  nameEn: "Chip tuning",
  category: "",
  description: "",
  price: 3_500_000,
  durationMin: 120,
};
const MASTERS: Record<string, { id: string; name: string; nameLatin: string }> = {
  m1: { id: "m1", name: "Алишер", nameLatin: "Alisher" },
  m2: { id: "m2", name: "Бахтиёр", nameLatin: "Bakhtiyor" },
};

const DATE = "2026-09-15";
const day = () => ({
  service: SERVICE,
  date: DATE,
  slots: [{ time: 600, masterIds: ["m1", "m2"] }],
  masters: [
    { id: "m1", slots: [600] },
    { id: "m2", slots: [600, 720, 840] },
  ],
});

const input = (o: Partial<BookingInput> = {}): BookingInput => ({
  serviceId: "s1",
  date: DATE,
  startMin: 600,
  clientName: "  Азиз  ",
  phone: " +998 90 123-45-67 ",
  ...o,
});

/** код BookingError или сама ошибка */
const failure = (p: Promise<unknown>) =>
  p.then(
    () => "resolved",
    (e: unknown) => (e instanceof BookingError ? e.code : e),
  );

beforeEach(() => {
  vi.stubEnv("ADMIN_CHAT_ID", "100");
  m.prisma.$transaction.mockImplementation(async (cb: (t: typeof m.tx) => unknown) => cb(m.tx));
  m.getDaySlots.mockResolvedValue(day());
  m.tx.booking.findFirst.mockResolvedValue(null);
  m.tx.booking.create.mockImplementation(async ({ data }: { data: { masterId: string } }) => ({
    id: "b1",
    ...data,
    master: MASTERS[data.masterId],
    service: SERVICE,
  }));
  m.prisma.telegramUser.findUnique.mockResolvedValue(null);
  m.sendTelegram.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("createBooking", () => {
  it("rejects invalid input with a ZodError before touching availability", async () => {
    await expect(createBooking(input({ phone: "abc" }))).rejects.toBeInstanceOf(ZodError);
    await expect(createBooking(input({ clientName: " A " }))).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ["clientName"] })],
    });
    await expect(createBooking(input({ date: "15.09.2026" }))).rejects.toBeInstanceOf(ZodError);
    expect(m.getDaySlots).not.toHaveBeenCalled();
  });

  it("throws service_not_found / slot_taken", async () => {
    m.getDaySlots.mockResolvedValueOnce(null);
    expect(await failure(createBooking(input()))).toBe("service_not_found");
    expect(await failure(createBooking(input({ startMin: 630 })))).toBe("slot_taken");
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates a confirmed booking with normalized fields", async () => {
    const b = await createBooking(input({ masterId: "m1" }));
    expect(m.getDaySlots).toHaveBeenCalledWith({ serviceId: "s1", date: DATE, masterId: "m1" });
    expect(m.tx.booking.create).toHaveBeenCalledWith({
      data: {
        masterId: "m1",
        serviceId: "s1",
        date: DATE,
        startMin: 600,
        endMin: 720,
        clientName: "Азиз",
        phone: "+998 90 123-45-67",
        car: "",
        comment: "",
        source: "web",
        tgUserId: null,
        status: "confirmed",
      },
      include: { master: true, service: true },
    });
    expect(b).toMatchObject({ id: "b1", status: "confirmed", masterId: "m1" });
  });

  it("'any master' picks the master with the most free slots that day", async () => {
    await createBooking(input());
    expect(m.getDaySlots).toHaveBeenCalledWith({ serviceId: "s1", date: DATE, masterId: undefined });
    expect(m.tx.booking.create.mock.calls[0][0].data.masterId).toBe("m2");
  });

  it("throws slot_just_taken on a clash inside the transaction", async () => {
    m.tx.booking.findFirst.mockResolvedValue({ id: "other" });
    expect(await failure(createBooking(input()))).toBe("slot_just_taken");
    expect(m.tx.booking.findFirst).toHaveBeenCalledWith({
      where: { masterId: "m2", date: DATE, status: { not: "cancelled" }, startMin: { lt: 720 }, endMin: { gt: 600 } },
    });
    expect(m.tx.booking.create).not.toHaveBeenCalled();
    expect(m.sendTelegram).not.toHaveBeenCalled();
  });

  it("notifies the admin (escaped HTML)", async () => {
    await createBooking(input({ car: "Golf <GTI>", source: "bot" }));
    await vi.waitFor(() => expect(m.sendTelegram).toHaveBeenCalledTimes(1));
    const [chatId, text] = m.sendTelegram.mock.calls[0];
    expect(chatId).toBe("100");
    expect(text).toContain("Новая запись");
    expect(text).toContain("🤖 бот");
    expect(text).toContain("Golf &lt;GTI&gt;");
    expect(text).toContain("Бахтиёр");
  });

  it("also notifies the Telegram client in their locale", async () => {
    m.prisma.telegramUser.findUnique.mockResolvedValue({ id: "555", locale: "en" });
    await createBooking(input({ tgUserId: "555" }));
    await vi.waitFor(() => expect(m.sendTelegram).toHaveBeenCalledTimes(2));
    const [chatId, text] = m.sendTelegram.mock.calls[1];
    expect(chatId).toBe("555");
    expect(text).toContain("You're booked at Octane Forge");
    expect(text).toContain("Chip tuning");
    expect(text).toContain("Bakhtiyor");
  });
});

describe("rescheduleBooking", () => {
  const stored = {
    id: "b1",
    serviceId: "s1",
    masterId: "m1",
    date: DATE,
    startMin: 600,
    endMin: 720,
    tgUserId: "555",
    status: "confirmed",
  };
  const move = { date: DATE, startMin: 600, masterId: "m1" };

  it("rejects another user's or an already finished booking", async () => {
    m.prisma.booking.findUnique.mockResolvedValueOnce(stored).mockResolvedValueOnce({ ...stored, status: "done" });
    expect(await failure(rescheduleBooking("b1", "777", move))).toBe("not_found");
    expect(await failure(rescheduleBooking("b1", "555", move))).toBe("not_found");
    expect(m.getDaySlots).not.toHaveBeenCalled();
  });

  it("ignores the booking itself in the clash check and resets reminder flags", async () => {
    m.prisma.booking.findUnique.mockResolvedValue(stored);
    m.tx.booking.update.mockImplementation(async ({ data }: { data: { masterId: string } }) => ({
      ...stored,
      ...data,
      clientName: "Азиз",
      phone: "+998",
      master: MASTERS[data.masterId],
      service: SERVICE,
    }));

    const b = await rescheduleBooking("b1", "555", move);
    expect(m.tx.booking.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ id: { not: "b1" }, masterId: "m1" }) });
    expect(m.tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { masterId: "m1", date: DATE, startMin: 600, endMin: 720, remindedAt: null, confirmedAt: null } }),
    );
    expect(b).toMatchObject({ id: "b1", masterId: "m1" });
  });

  it("throws slot_just_taken when another booking overlaps", async () => {
    m.prisma.booking.findUnique.mockResolvedValue(stored);
    m.tx.booking.findFirst.mockResolvedValue({ id: "other" });
    expect(await failure(rescheduleBooking("b1", "555", move))).toBe("slot_just_taken");
    expect(m.tx.booking.update).not.toHaveBeenCalled();
  });
});

describe("cancelBooking", () => {
  const stored = {
    id: "b1",
    date: DATE,
    startMin: 600,
    endMin: 720,
    clientName: "Азиз",
    phone: "+998",
    tgUserId: "555",
    status: "confirmed",
    master: MASTERS.m1,
    service: SERVICE,
  };

  it("throws not_found for a missing booking or another user's booking", async () => {
    m.prisma.booking.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(stored);
    expect(await failure(cancelBooking("nope"))).toBe("not_found");
    expect(await failure(cancelBooking("b1", "777"))).toBe("not_found");
    expect(m.prisma.booking.update).not.toHaveBeenCalled();
  });

  it("sets status cancelled (owner or admin without tgUserId) and notifies the admin", async () => {
    m.prisma.booking.findUnique.mockResolvedValue(stored);
    m.prisma.booking.update.mockImplementation(async ({ data }: { data: object }) => ({ ...stored, ...data }));

    expect(await cancelBooking("b1", "555")).toMatchObject({ id: "b1", status: "cancelled" });
    expect(await cancelBooking("b1")).toMatchObject({ status: "cancelled" });
    expect(m.prisma.booking.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "cancelled" },
      include: { master: true, service: true },
    });
    await vi.waitFor(() => expect(m.sendTelegram).toHaveBeenCalledWith("100", expect.stringContaining("Отмена записи")));
  });
});
